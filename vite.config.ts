import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

// =============================================================================
// Manus Debug Collector - Vite Plugin
// Writes browser logs directly to files, trimmed when exceeding size limit
// =============================================================================

const PROJECT_ROOT = import.meta.dirname;
const LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
const MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024; // 1MB per log file
const TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6); // Trim to 60% to avoid constant re-trimming

type LogSource = "browserConsole" | "networkRequests" | "sessionReplay";

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function trimLogFile(logPath: string, maxSize: number) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }

    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines: string[] = [];
    let keptBytes = 0;

    // Keep newest lines (from end) that fit within 60% of maxSize
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}\n`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }

    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
    /* ignore trim errors */
  }
}

function writeToLogFile(source: LogSource, entries: unknown[]) {
  if (entries.length === 0) return;

  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);

  // Format entries with timestamps
  const lines = entries.map((entry) => {
    const ts = new Date().toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });

  // Append to log file
  fs.appendFileSync(logPath, `${lines.join("\n")}\n`, "utf-8");

  // Trim if exceeds max size
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}

/**
 * Vite plugin to collect browser debug logs
 * - POST /__manus__/logs: Browser sends logs, written directly to files
 * - Files: browserConsole.log, networkRequests.log, sessionReplay.log
 * - Auto-trimmed when exceeding 1MB (keeps newest entries)
 */
function vitePluginManusDebugCollector(): Plugin {
  return {
    name: "manus-debug-collector",

    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true,
            },
            injectTo: "head",
          },
        ],
      };
    },

    configureServer(server: ViteDevServer) {
      // POST /__manus__/logs: Browser sends logs (written directly to files)
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }

        const handlePayload = (payload: any) => {
          // Write logs directly to files
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };

        const reqBody = (req as { body?: unknown }).body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }

        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });

        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    },
  };
}

function vitePluginStorageProxy(): Plugin {
  return {
    name: "manus-storage-proxy",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/manus-storage", async (req, res) => {
        const key = req.url?.replace(/^\//, "");
        if (!key) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Missing storage key");
          return;
        }

        const forgeBaseUrl = (process.env.BUILT_IN_FORGE_API_URL || "").replace(/\/+$/, "");
        const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;

        if (!forgeBaseUrl || !forgeKey) {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Storage proxy not configured");
          return;
        }

        try {
          const forgeUrl = new URL("v1/storage/presign/get", forgeBaseUrl + "/");
          forgeUrl.searchParams.set("path", key);

          const forgeResp = await fetch(forgeUrl, {
            headers: { Authorization: `Bearer ${forgeKey}` },
          });

          if (!forgeResp.ok) {
            res.writeHead(502, { "Content-Type": "text/plain" });
            res.end("Storage backend error");
            return;
          }

          const { url } = (await forgeResp.json()) as { url: string };
          if (!url) {
            res.writeHead(502, { "Content-Type": "text/plain" });
            res.end("Empty signed URL");
            return;
          }

          res.writeHead(307, { Location: url, "Cache-Control": "no-store" });
          res.end();
        } catch {
          res.writeHead(502, { "Content-Type": "text/plain" });
          res.end("Storage proxy error");
        }
      });
    },
  };
}

// =============================================================================
// Auth API Plugin - /api/auth/* 처리 (DB 기반 JWT 인증)
// =============================================================================
function vitePluginAuthApi(): Plugin {
  const COOKIE_NAME = "tp_auth";
  const JWT_SECRET = process.env.JWT_SECRET || "teampulse-secret-key";
  const DATABASE_URL = process.env.DATABASE_URL;

  // DB 풀 lazy 초기화
  let _pool: any = null;
  async function getPool() {
    if (_pool) return _pool;
    if (!DATABASE_URL) return null;
    const mysql = await import("mysql2/promise");
    _pool = mysql.createPool(DATABASE_URL);
    return _pool;
  }

  // 쿠키 파싱
  function parseCookies(cookieHeader: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    if (!cookieHeader) return cookies;
    cookieHeader.split(";").forEach((part) => {
      const [k, ...v] = part.trim().split("=");
      if (k) cookies[k.trim()] = decodeURIComponent(v.join("="));
    });
    return cookies;
  }

  // 요청 body 읽기
  function readBody(req: any): Promise<any> {
    return new Promise((resolve) => {
      const existing = (req as any).body;
      if (existing && typeof existing === "object") {
        resolve(existing);
        return;
      }
      let raw = "";
      req.on("data", (chunk: Buffer) => { raw += chunk.toString(); });
      req.on("end", () => {
        try { resolve(JSON.parse(raw)); } catch { resolve({}); }
      });
    });
  }

  function sendJson(res: any, status: number, data: unknown) {
    const body = JSON.stringify(data);
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    });
    res.end(body);
  }

  function setCookieHeader(res: any, token: string) {
    res.setHeader("Set-Cookie", `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`);
  }

  function clearCookieHeader(res: any) {
    res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  }

  return {
    name: "manus-auth-api",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/api/auth", async (req: any, res: any, next: any) => {
        const url = req.url as string;
        const method = req.method as string;

        // POST /api/auth/login
        if (url === "/login" && method === "POST") {
          try {
            const body = await readBody(req);
            const { email, password } = body as { email: string; password: string };
            if (!email || !password) {
              return sendJson(res, 400, { error: "이메일과 비밀번호를 입력해 주세요." });
            }
            const db = await getPool();
            if (!db) return sendJson(res, 500, { error: "데이터베이스 연결 실패" });

            const [rows] = await db.execute(
              "SELECT * FROM tp_users WHERE email = ? LIMIT 1",
              [email]
            );
            if ((rows as any[]).length === 0) {
              return sendJson(res, 401, { error: "이메일 또는 비밀번호가 올바르지 않습니다." });
            }
            const user = (rows as any[])[0];
            const bcrypt = await import("bcryptjs");
            const valid = await bcrypt.compare(password, user.password);
            if (!valid) {
              return sendJson(res, 401, { error: "이메일 또는 비밀번호가 올바르지 않습니다." });
            }
            const jwtMod = await import("jsonwebtoken");
            const jwt = (jwtMod.default ?? jwtMod) as any;
            const payload = {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              department: user.department ?? null,
              position: user.position ?? null,
            };
            const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
            setCookieHeader(res, token);
            return sendJson(res, 200, { user: payload });
          } catch (e) {
            console.error("[auth-api] login error:", e);
            return sendJson(res, 500, { error: "서버 오류가 발생했습니다." });
          }
        }

        // GET /api/auth/me
        if (url === "/me" && method === "GET") {
          try {
            const cookies = parseCookies(req.headers.cookie || "");
            const token = cookies[COOKIE_NAME];
            if (!token) return sendJson(res, 401, { error: "인증이 필요합니다." });
            const jwtMod2 = await import("jsonwebtoken");
            const jwt = (jwtMod2.default ?? jwtMod2) as any;
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            return sendJson(res, 200, {
              user: {
                id: decoded.id,
                email: decoded.email,
                name: decoded.name,
                role: decoded.role,
                department: decoded.department ?? null,
                position: decoded.position ?? null,
              },
            });
          } catch {
            return sendJson(res, 401, { error: "유효하지 않은 토큰입니다." });
          }
        }

        // POST /api/auth/logout
        if (url === "/logout" && method === "POST") {
          clearCookieHeader(res);
          return sendJson(res, 200, { success: true });
        }

        // POST /api/auth/change-password
        if (url === "/change-password" && method === "POST") {
          try {
            const cookies = parseCookies(req.headers.cookie || "");
            const token = cookies[COOKIE_NAME];
            if (!token) return sendJson(res, 401, { error: "인증이 필요합니다." });
            const jwtMod3 = await import("jsonwebtoken");
            const jwt = (jwtMod3.default ?? jwtMod3) as any;
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            const body = await readBody(req);
            const { currentPassword, newPassword } = body as { currentPassword: string; newPassword: string };
            const db = await getPool();
            if (!db) return sendJson(res, 500, { error: "DB 연결 실패" });
            const [rows] = await db.execute("SELECT * FROM tp_users WHERE id = ? LIMIT 1", [decoded.id]);
            if ((rows as any[]).length === 0) return sendJson(res, 404, { error: "사용자를 찾을 수 없습니다." });
            const bcrypt = await import("bcryptjs");
            const valid = await bcrypt.compare(currentPassword, (rows as any[])[0].password);
            if (!valid) return sendJson(res, 400, { error: "현재 비밀번호가 올바르지 않습니다." });
            const hashed = await bcrypt.hash(newPassword, 10);
            await db.execute("UPDATE tp_users SET password = ? WHERE id = ?", [hashed, decoded.id]);
            return sendJson(res, 200, { success: true });
          } catch {
            return sendJson(res, 401, { error: "인증 오류" });
          }
        }

        next();
      });
    },
  };
}

const plugins = [
  react(),
  tailwindcss(),
  jsxLocPlugin(),
  vitePluginManusRuntime(),
  vitePluginManusDebugCollector(),
  vitePluginStorageProxy(),
  vitePluginAuthApi(),
];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    strictPort: false, // Will find next available port if 3000 is busy
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
