import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import cors from "cors";
import mysql from "mysql2/promise";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "teampulse-secret-key";
const DATABASE_URL = process.env.DATABASE_URL;
const COOKIE_NAME = "tp_auth";

// DB 연결 풀
let pool: mysql.Pool | null = null;
function getPool() {
  if (!pool && DATABASE_URL) {
    pool = mysql.createPool(DATABASE_URL);
  }
  return pool;
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json());
  app.use(cookieParser());
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  // ─── 인증 API ───────────────────────────────────────────────

  // POST /api/auth/login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body as { email: string; password: string };
      if (!email || !password) {
        return res.status(400).json({ error: "이메일과 비밀번호를 입력해 주세요." });
      }

      const db = getPool();
      if (!db) {
        return res.status(500).json({ error: "데이터베이스 연결 실패" });
      }

      const [rows] = await db.execute<mysql.RowDataPacket[]>(
        "SELECT * FROM tp_users WHERE email = ? LIMIT 1",
        [email]
      );

      if (rows.length === 0) {
        return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
      }

      const user = rows[0];
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name, role: user.role, department: user.department, position: user.position },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department,
          position: user.position,
        },
      });
    } catch (err) {
      console.error("[login error]", err);
      return res.status(500).json({ error: "서버 오류가 발생했습니다." });
    }
  });

  // GET /api/auth/me
  app.get("/api/auth/me", (req, res) => {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return res.status(401).json({ error: "인증이 필요합니다." });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
      return res.json({
        user: {
          id: decoded.id,
          email: decoded.email,
          name: decoded.name,
          role: decoded.role,
          department: decoded.department,
          position: decoded.position,
        },
      });
    } catch {
      return res.status(401).json({ error: "유효하지 않은 토큰입니다." });
    }
  });

  // POST /api/auth/logout
  app.post("/api/auth/logout", (_req, res) => {
    res.clearCookie(COOKIE_NAME, { path: "/" });
    return res.json({ success: true });
  });

  // POST /api/auth/change-password
  app.post("/api/auth/change-password", async (req, res) => {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return res.status(401).json({ error: "인증이 필요합니다." });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
      const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };

      const db = getPool();
      if (!db) return res.status(500).json({ error: "DB 연결 실패" });

      const [rows] = await db.execute<mysql.RowDataPacket[]>(
        "SELECT * FROM tp_users WHERE id = ? LIMIT 1",
        [decoded.id]
      );
      if (rows.length === 0) return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });

      const valid = await bcrypt.compare(currentPassword, rows[0].password);
      if (!valid) return res.status(400).json({ error: "현재 비밀번호가 올바르지 않습니다." });

      const hashed = await bcrypt.hash(newPassword, 10);
      await db.execute("UPDATE tp_users SET password = ? WHERE id = ?", [hashed, decoded.id]);

      return res.json({ success: true });
    } catch {
      return res.status(401).json({ error: "인증 오류" });
    }
  });

  // ─── 정적 파일 서빙 ─────────────────────────────────────────

  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
