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

// 인증 미들웨어 헬퍼
function getUser(req: express.Request): jwt.JwtPayload | null {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return null;
    return jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
  } catch {
    return null;
  }
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

      // 비활성 계정 차단
      if (user.is_active === 0) {
        return res.status(403).json({ error: "비활성화된 계정입니다. 관리자에게 문의하세요." });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
      }

      // 마지막 로그인 시간 업데이트
      await db.execute("UPDATE tp_users SET last_login_at = NOW() WHERE id = ?", [user.id]);

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

  // ─── 관리자 계정 관리 API ────────────────────────────────────

  // GET /api/admin/users
  app.get("/api/admin/users", async (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== "admin") return res.status(403).json({ error: "관리자 권한 필요" });
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    const [rows] = await db.execute<mysql.RowDataPacket[]>(
      "SELECT id, email, name, role, department, position, is_active, created_at, last_login_at FROM tp_users ORDER BY created_at DESC"
    );
    return res.json({ users: rows });
  });

  // POST /api/admin/users
  app.post("/api/admin/users", async (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== "admin") return res.status(403).json({ error: "관리자 권한 필요" });
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    const { email, name, password, role, department, position } = req.body as any;
    if (!email || !name || !password) return res.status(400).json({ error: "이메일, 이름, 비밀번호는 필수입니다." });
    const [existing] = await db.execute<mysql.RowDataPacket[]>("SELECT id FROM tp_users WHERE email = ?", [email]);
    if ((existing as any[]).length > 0) return res.status(409).json({ error: "이미 사용 중인 이메일입니다." });
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      "INSERT INTO tp_users (email, name, password, role, department, position, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)",
      [email, name, hashed, role || "employee", department || "", position || ""]
    ) as any;
    const [rows] = await db.execute<mysql.RowDataPacket[]>(
      "SELECT id, email, name, role, department, position, is_active, created_at, last_login_at FROM tp_users WHERE id = ?",
      [result.insertId]
    );
    return res.status(201).json({ user: rows[0] });
  });

  // PUT /api/admin/users/:id
  app.put("/api/admin/users/:id", async (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== "admin") return res.status(403).json({ error: "관리자 권한 필요" });
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    const id = parseInt(req.params.id);
    const { name, role, department, position } = req.body as any;
    await db.execute(
      "UPDATE tp_users SET name = ?, role = ?, department = ?, position = ? WHERE id = ?",
      [name, role, department, position, id]
    );
    const [rows] = await db.execute<mysql.RowDataPacket[]>(
      "SELECT id, email, name, role, department, position, is_active, created_at, last_login_at FROM tp_users WHERE id = ?",
      [id]
    );
    return res.json({ user: rows[0] });
  });

  // PATCH /api/admin/users/:id/active
  app.patch("/api/admin/users/:id/active", async (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== "admin") return res.status(403).json({ error: "관리자 권한 필요" });
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    const id = parseInt(req.params.id);
    if (id === user.id) return res.status(400).json({ error: "자신의 계정은 변경할 수 없습니다." });
    const { is_active } = req.body as any;
    await db.execute("UPDATE tp_users SET is_active = ? WHERE id = ?", [is_active ? 1 : 0, id]);
    return res.json({ success: true });
  });

  // POST /api/admin/users/:id/reset-password
  app.post("/api/admin/users/:id/reset-password", async (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== "admin") return res.status(403).json({ error: "관리자 권한 필요" });
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    const id = parseInt(req.params.id);
    const { newPassword } = req.body as any;
    if (!newPassword || newPassword.length < 4) return res.status(400).json({ error: "비밀번호는 4자 이상이어야 합니다." });
    const hashed = await bcrypt.hash(newPassword, 10);
    await db.execute("UPDATE tp_users SET password = ? WHERE id = ?", [hashed, id]);
    return res.json({ success: true });
  });

  // ─── 공지사항 API ────────────────────────────────────────────

  // GET /api/community/notices
  app.get("/api/community/notices", async (_req, res) => {
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    const [rows] = await db.execute<mysql.RowDataPacket[]>(
      "SELECT n.*, (SELECT COUNT(*) FROM tp_comments c WHERE c.target_type='notice' AND c.target_id=n.id) AS comment_count FROM tp_notices n ORDER BY pinned DESC, created_at DESC"
    );
    return res.json({ notices: rows });
  });

  // POST /api/community/notices
  app.post("/api/community/notices", async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: "인증 필요" });
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    const { title, content, must_read, pinned } = req.body as any;
    if (!title?.trim() || !content?.trim()) return res.status(400).json({ error: "제목과 내용은 필수입니다." });
    const [result] = await db.execute(
      "INSERT INTO tp_notices (title, content, author, author_id, must_read, pinned) VALUES (?, ?, ?, ?, ?, ?)",
      [title.trim(), content.trim(), user.name, user.id, must_read ? 1 : 0, pinned ? 1 : 0]
    ) as any;
    const [rows] = await db.execute<mysql.RowDataPacket[]>("SELECT * FROM tp_notices WHERE id = ?", [result.insertId]);
    return res.status(201).json({ notice: rows[0] });
  });

  // GET /api/community/notices/:id
  app.get("/api/community/notices/:id", async (req, res) => {
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    const id = parseInt(req.params.id);
    await db.execute("UPDATE tp_notices SET views = views + 1 WHERE id = ?", [id]);
    const [rows] = await db.execute<mysql.RowDataPacket[]>("SELECT * FROM tp_notices WHERE id = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ error: "없음" });
    return res.json({ notice: rows[0] });
  });

  // PUT /api/community/notices/:id
  app.put("/api/community/notices/:id", async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: "인증 필요" });
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    const id = parseInt(req.params.id);
    const { title, content, must_read, pinned } = req.body as any;
    await db.execute(
      "UPDATE tp_notices SET title=?, content=?, must_read=?, pinned=? WHERE id=?",
      [title, content, must_read ? 1 : 0, pinned ? 1 : 0, id]
    );
    const [rows] = await db.execute<mysql.RowDataPacket[]>("SELECT * FROM tp_notices WHERE id = ?", [id]);
    return res.json({ notice: rows[0] });
  });

  // DELETE /api/community/notices/:id
  app.delete("/api/community/notices/:id", async (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== "admin") return res.status(403).json({ error: "관리자만 삭제 가능" });
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    const id = parseInt(req.params.id);
    await db.execute("DELETE FROM tp_comments WHERE target_type='notice' AND target_id = ?", [id]);
    await db.execute("DELETE FROM tp_notices WHERE id = ?", [id]);
    return res.json({ success: true });
  });

  // ─── 게시판 API ──────────────────────────────────────────────

  // GET /api/community/board
  app.get("/api/community/board", async (_req, res) => {
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    const [rows] = await db.execute<mysql.RowDataPacket[]>(
      "SELECT p.*, (SELECT COUNT(*) FROM tp_comments c WHERE c.target_type='board' AND c.target_id=p.id) AS comment_count FROM tp_board_posts p ORDER BY pinned DESC, created_at DESC"
    );
    return res.json({ posts: rows });
  });

  // POST /api/community/board
  app.post("/api/community/board", async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: "인증 필요" });
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    const { title, content, category } = req.body as any;
    if (!title?.trim() || !content?.trim()) return res.status(400).json({ error: "제목과 내용은 필수입니다." });
    const [result] = await db.execute(
      "INSERT INTO tp_board_posts (title, content, category, author, author_id, dept) VALUES (?, ?, ?, ?, ?, ?)",
      [title.trim(), content.trim(), category || "일반", user.name, user.id, user.department || ""]
    ) as any;
    const [rows] = await db.execute<mysql.RowDataPacket[]>("SELECT * FROM tp_board_posts WHERE id = ?", [result.insertId]);
    return res.status(201).json({ post: rows[0] });
  });

  // GET /api/community/board/:id
  app.get("/api/community/board/:id", async (req, res) => {
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    const id = parseInt(req.params.id);
    await db.execute("UPDATE tp_board_posts SET views = views + 1 WHERE id = ?", [id]);
    const [rows] = await db.execute<mysql.RowDataPacket[]>("SELECT * FROM tp_board_posts WHERE id = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ error: "없음" });
    return res.json({ post: rows[0] });
  });

  // DELETE /api/community/board/:id
  app.delete("/api/community/board/:id", async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: "인증 필요" });
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    const id = parseInt(req.params.id);
    const [rows] = await db.execute<mysql.RowDataPacket[]>("SELECT author_id FROM tp_board_posts WHERE id = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ error: "없음" });
    if (rows[0].author_id !== user.id && user.role !== "admin") return res.status(403).json({ error: "삭제 권한 없음" });
    await db.execute("DELETE FROM tp_comments WHERE target_type='board' AND target_id = ?", [id]);
    await db.execute("DELETE FROM tp_board_posts WHERE id = ?", [id]);
    return res.json({ success: true });
  });

  // ─── 댓글 API ────────────────────────────────────────────────

  // GET /api/community/comments?type=notice|board&id=:id
  app.get("/api/community/comments", async (req, res) => {
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    const { type, id } = req.query as { type: string; id: string };
    if (!type || !id) return res.status(400).json({ error: "type과 id 필요" });
    const [rows] = await db.execute<mysql.RowDataPacket[]>(
      "SELECT * FROM tp_comments WHERE target_type = ? AND target_id = ? ORDER BY created_at ASC",
      [type, parseInt(id)]
    );
    return res.json({ comments: rows });
  });

  // POST /api/community/comments
  app.post("/api/community/comments", async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: "인증 필요" });
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    const { target_type, target_id, parent_id, content } = req.body as any;
    if (!content?.trim()) return res.status(400).json({ error: "내용 필수" });
    const [result] = await db.execute(
      "INSERT INTO tp_comments (target_type, target_id, parent_id, author, author_id, dept, content) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [target_type, target_id, parent_id || null, user.name, user.id, user.department || "", content.trim()]
    ) as any;
    const [rows] = await db.execute<mysql.RowDataPacket[]>("SELECT * FROM tp_comments WHERE id = ?", [result.insertId]);
    return res.status(201).json({ comment: rows[0] });
  });

  // PUT /api/community/comments/:id
  app.put("/api/community/comments/:id", async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: "인증 필요" });
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    const id = parseInt(req.params.id);
    const { content } = req.body as any;
    const [rows] = await db.execute<mysql.RowDataPacket[]>("SELECT author_id FROM tp_comments WHERE id = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ error: "없음" });
    if (rows[0].author_id !== user.id) return res.status(403).json({ error: "수정 권한 없음" });
    await db.execute("UPDATE tp_comments SET content = ? WHERE id = ?", [content.trim(), id]);
    const [updated] = await db.execute<mysql.RowDataPacket[]>("SELECT * FROM tp_comments WHERE id = ?", [id]);
    return res.json({ comment: updated[0] });
  });

  // DELETE /api/community/comments/:id
  app.delete("/api/community/comments/:id", async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: "인증 필요" });
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    const id = parseInt(req.params.id);
    const [rows] = await db.execute<mysql.RowDataPacket[]>("SELECT author_id FROM tp_comments WHERE id = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ error: "없음" });
    if (rows[0].author_id !== user.id && user.role !== "admin") return res.status(403).json({ error: "삭제 권한 없음" });
    await db.execute("DELETE FROM tp_comments WHERE id = ?", [id]);
    return res.json({ success: true });
  });

  // PATCH /api/community/comments/:id/like
  app.patch("/api/community/comments/:id/like", async (req, res) => {
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    const id = parseInt(req.params.id);
    await db.execute("UPDATE tp_comments SET likes = likes + 1 WHERE id = ?", [id]);
    const [rows] = await db.execute<mysql.RowDataPacket[]>("SELECT likes FROM tp_comments WHERE id = ?", [id]);
    return res.json({ likes: rows[0]?.likes ?? 0 });
  });

  // ─── 메신저 API ──────────────────────────────────────────────

  // GET /api/messenger/contacts
  app.get("/api/messenger/contacts", async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: "인증 필요" });
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    const [rows] = await db.execute<mysql.RowDataPacket[]>(
      "SELECT id, name, department, position FROM tp_users WHERE id != ? AND is_active = 1 ORDER BY name",
      [user.id]
    );
    return res.json({ contacts: rows });
  });

  // GET /api/messenger/messages?with=:name
  app.get("/api/messenger/messages", async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: "인증 필요" });
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    const withName = req.query.with as string;
    if (!withName) return res.status(400).json({ error: "with 파라미터 필요" });

    // 채널 찾기 또는 생성
    const participants = [user.name, withName].sort().join(",");
    let [channels] = await db.execute<mysql.RowDataPacket[]>(
      "SELECT * FROM tp_chat_channels WHERE participants = ?",
      [participants]
    );
    let channelId: number;
    if ((channels as any[]).length === 0) {
      const [result] = await db.execute(
        "INSERT INTO tp_chat_channels (participants) VALUES (?)",
        [participants]
      ) as any;
      channelId = result.insertId;
    } else {
      channelId = (channels as any[])[0].id;
    }

    const [messages] = await db.execute<mysql.RowDataPacket[]>(
      "SELECT * FROM tp_chat_messages WHERE channel_id = ? ORDER BY created_at ASC",
      [channelId]
    );
    return res.json({ messages, channelId });
  });

  // POST /api/messenger/messages
  app.post("/api/messenger/messages", async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: "인증 필요" });
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    const { to, content } = req.body as any;
    if (!to || !content?.trim()) return res.status(400).json({ error: "수신자와 내용 필수" });

    const participants = [user.name, to].sort().join(",");
    let [channels] = await db.execute<mysql.RowDataPacket[]>(
      "SELECT * FROM tp_chat_channels WHERE participants = ?",
      [participants]
    );
    let channelId: number;
    if ((channels as any[]).length === 0) {
      const [result] = await db.execute(
        "INSERT INTO tp_chat_channels (participants) VALUES (?)",
        [participants]
      ) as any;
      channelId = result.insertId;
    } else {
      channelId = (channels as any[])[0].id;
    }

    const [result] = await db.execute(
      "INSERT INTO tp_chat_messages (channel_id, sender, sender_id, content) VALUES (?, ?, ?, ?)",
      [channelId, user.name, user.id, content.trim()]
    ) as any;
    const [rows] = await db.execute<mysql.RowDataPacket[]>(
      "SELECT * FROM tp_chat_messages WHERE id = ?",
      [result.insertId]
    );
    return res.status(201).json({ message: rows[0] });
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
