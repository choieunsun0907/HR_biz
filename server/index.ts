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

  // ─── 직원 관리 API ─────────────────────────────────────────
  // 직원 목록 조회
  app.get("/api/employees", async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "인증이 필요합니다" });
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    const { dept, status, search } = req.query as Record<string, string>;
    let sql = "SELECT * FROM tp_employees WHERE 1=1";
    const params: any[] = [];
    if (dept && dept !== "전체") { sql += " AND dept = ?"; params.push(dept); }
    if (status && status !== "전체") { sql += " AND status = ?"; params.push(status); }
    if (search) { sql += " AND (name LIKE ? OR role LIKE ? OR email LIKE ?)"; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    sql += " ORDER BY id ASC";
    const [rows] = await db.execute<mysql.RowDataPacket[]>(sql, params);
    const employees = rows.map((e) => ({
      ...e,
      skills: e.skills ? e.skills.split(",").map((s: string) => s.trim()) : [],
      recentActivity: e.recent_activity ? JSON.parse(e.recent_activity) : [],
    }));
    return res.json({ employees });
  });

  // 직원 단건 조회
  app.get("/api/employees/:id", async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "인증이 필요합니다" });
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    const [rows] = await db.execute<mysql.RowDataPacket[]>("SELECT * FROM tp_employees WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "직원을 찾을 수 없습니다" });
    const e = rows[0];
    return res.json({ employee: { ...e, skills: e.skills ? e.skills.split(",").map((s: string) => s.trim()) : [], recentActivity: e.recent_activity ? JSON.parse(e.recent_activity) : [] } });
  });

  // 직원 추가
  app.post("/api/employees", async (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== "admin") return res.status(403).json({ error: "관리자만 직원을 추가할 수 있습니다" });
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    const { name, avatar, dept, role, grade, status, email, phone, location, join_date, birth_date, manager, engagement_score, leave_balance, leave_used, attendance_rate, skills, color, memo } = req.body;
    if (!name) return res.status(400).json({ error: "이름은 필수입니다" });
    const now = Date.now();
    const skillsStr = Array.isArray(skills) ? skills.join(",") : (skills || "");
    const [result] = await db.execute<mysql.ResultSetHeader>(
      "INSERT INTO tp_employees (name,avatar,dept,role,grade,status,email,phone,location,join_date,birth_date,manager,engagement_score,leave_balance,leave_used,attendance_rate,skills,recent_activity,color,memo,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [name,avatar||name.slice(0,2),dept||'',role||'',grade||'사원',status||'재직',email||'',phone||'',location||'',join_date||'',birth_date||'',manager||'',engagement_score||80,leave_balance||15,leave_used||0,attendance_rate||100,skillsStr,'[]',color||'oklch(0.65 0.14 185)',memo||'',now,now]
    );
    const [rows] = await db.execute<mysql.RowDataPacket[]>("SELECT * FROM tp_employees WHERE id = ?", [result.insertId]);
    const e = rows[0];
    return res.status(201).json({ employee: { ...e, skills: e.skills ? e.skills.split(",").map((s: string) => s.trim()) : [], recentActivity: [] } });
  });

  // 직원 수정
  app.put("/api/employees/:id", async (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== "admin") return res.status(403).json({ error: "관리자만 직원 정보를 수정할 수 있습니다" });
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    const { name, avatar, dept, role, grade, status, email, phone, location, join_date, birth_date, manager, engagement_score, leave_balance, leave_used, attendance_rate, skills, color, memo } = req.body;
    const now = Date.now();
    const skillsStr = Array.isArray(skills) ? skills.join(",") : (skills || "");
    await db.execute(
      "UPDATE tp_employees SET name=?,avatar=?,dept=?,role=?,grade=?,status=?,email=?,phone=?,location=?,join_date=?,birth_date=?,manager=?,engagement_score=?,leave_balance=?,leave_used=?,attendance_rate=?,skills=?,color=?,memo=?,updated_at=? WHERE id=?",
      [name,avatar,dept,role,grade,status,email,phone,location,join_date,birth_date,manager,engagement_score,leave_balance,leave_used,attendance_rate,skillsStr,color,memo,now,req.params.id]
    );
    const [rows] = await db.execute<mysql.RowDataPacket[]>("SELECT * FROM tp_employees WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "직원을 찾을 수 없습니다" });
    const e = rows[0];
    return res.json({ employee: { ...e, skills: e.skills ? e.skills.split(",").map((s: string) => s.trim()) : [], recentActivity: e.recent_activity ? JSON.parse(e.recent_activity) : [] } });
  });

  // 직원 삭제
  app.delete("/api/employees/:id", async (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== "admin") return res.status(403).json({ error: "관리자만 직원을 삭제할 수 있습니다" });
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    await db.execute("DELETE FROM tp_employees WHERE id = ?", [req.params.id]);
    return res.json({ success: true });
  });

  // 직원 일괄 등록 (엑셀 업로드용)
  app.post("/api/employees/bulk", async (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== "admin") return res.status(403).json({ error: "관리자만 일괄 등록할 수 있습니다" });
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    const { employees } = req.body;
    if (!Array.isArray(employees) || employees.length === 0) return res.status(400).json({ error: "직원 데이터가 없습니다" });
    const now = Date.now();
    let inserted = 0;
    for (const e of employees) {
      if (!e.name) continue;
      const skillsStr = Array.isArray(e.skills) ? e.skills.join(",") : (e.skills || "");
      await db.execute(
        "INSERT INTO tp_employees (name,avatar,dept,role,grade,status,email,phone,location,join_date,birth_date,manager,engagement_score,leave_balance,leave_used,attendance_rate,skills,recent_activity,color,memo,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [e.name,e.avatar||e.name.slice(0,2),e.dept||'',e.role||'',e.grade||'사원',e.status||'재직',e.email||'',e.phone||'',e.location||'',e.join_date||'',e.birth_date||'',e.manager||'',e.engagement_score||80,e.leave_balance||15,e.leave_used||0,e.attendance_rate||100,skillsStr,'[]',e.color||'oklch(0.65 0.14 185)',e.memo||'',now,now]
      );
      inserted++;
    }
    return res.status(201).json({ inserted });
  });

  // ─── 경조사 지원 API ─────────────────────────────────────────

  // GET /api/special-leave - 본인 경조사 신청 목록
  app.get("/api/special-leave", async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: "인증 필요" });
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    try {
      const [rows] = await db.execute(
        user.role === 'admin'
          ? "SELECT * FROM tp_special_leave ORDER BY created_at DESC"
          : "SELECT * FROM tp_special_leave WHERE user_id = ? ORDER BY created_at DESC",
        user.role === 'admin' ? [] : [user.id]
      ) as [mysql.RowDataPacket[], mysql.FieldPacket[]];
      return res.json(rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "조회 실패" });
    }
  });

  // POST /api/special-leave - 경조사 신청 (파일 포함)
  app.post("/api/special-leave", async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: "인증 필요" });
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    try {
      const { leave_type, leave_days, reason, event_date, file_key, file_name, file_url } = req.body;
      if (!leave_type) return res.status(400).json({ error: "경조사 유형 필요" });
      const now = Date.now();
      const [result] = await db.execute(
        "INSERT INTO tp_special_leave (user_id, user_name, user_dept, leave_type, leave_days, reason, event_date, status, file_key, file_name, file_url, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [user.id, user.name, user.dept || '', leave_type, leave_days || 1, reason || '', event_date || null, '대기', file_key || null, file_name || null, file_url || null, now, now]
      ) as [mysql.ResultSetHeader, mysql.FieldPacket[]];
      return res.status(201).json({ id: result.insertId });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "신청 실패" });
    }
  });

  // POST /api/special-leave/upload - 증빙서류 파일 업로드
  app.post("/api/special-leave/upload", async (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: "인증 필요" });
    try {
      const { file_data, file_name, mime_type } = req.body;
      if (!file_data || !file_name) return res.status(400).json({ error: "파일 데이터 필요" });
      // 파일 크기 체크 (10MB)
      const buffer = Buffer.from(file_data, 'base64');
      if (buffer.length > 10 * 1024 * 1024) return res.status(400).json({ error: "파일 크기는 10MB 이하여야 합니다" });
      // 파일을 data URL로 변환하여 키로 사용 (스토리지 없이 DB에 메타데이터만 저장)
      const fileKey = `special-leave/${user.id}/${Date.now()}-${file_name}`;
      const dataUrl = `data:${mime_type || 'application/octet-stream'};base64,${file_data}`;
      return res.json({ key: fileKey, url: dataUrl, file_name });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "파일 업로드 실패" });
    }
  });

  // PATCH /api/special-leave/:id/status - 관리자 상태 변경
  app.patch("/api/special-leave/:id/status", async (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== 'admin') return res.status(403).json({ error: "관리자 권한 필요" });
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    try {
      const { status } = req.body;
      if (!['승인', '거절', '대기'].includes(status)) return res.status(400).json({ error: "유효하지 않은 상태" });
      await db.execute("UPDATE tp_special_leave SET status = ?, updated_at = ? WHERE id = ?", [status, Date.now(), req.params.id]);
      return res.json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "상태 변경 실패" });
    }
  });

  // ─── 마스터 데이터 API (부서·직급·직책·근무지) ──────────────────────
  const MASTER_TABLES: Record<string, string> = {
    departments: "tp_departments",
    grades: "tp_grades",
    positions: "tp_positions",
    locations: "tp_locations",
  };

  // 마스터 목록 조회
  app.get("/api/master/:type", async (req, res) => {
    const table = MASTER_TABLES[req.params.type];
    if (!table) return res.status(400).json({ error: "잘못된 타입" });
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    const [rows] = await db.execute(`SELECT * FROM ${table} ORDER BY sort_order ASC, id ASC`);
    return res.json({ items: rows });
  });

  // 마스터 항목 추가
  app.post("/api/master/:type", async (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== "admin") return res.status(403).json({ error: "관리자만 가능합니다" });
    const table = MASTER_TABLES[req.params.type];
    if (!table) return res.status(400).json({ error: "잘못된 타입" });
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    const { name, description, address } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "이름은 필수입니다" });
    const now = Date.now();
    const [rows2] = await db.execute<mysql.RowDataPacket[]>(`SELECT MAX(sort_order) as max_order FROM ${table}`);
    const nextOrder = ((rows2[0] as any)?.max_order ?? 0) + 1;
    const extraField = req.params.type === "locations" ? ", address" : (req.params.type === "departments" || req.params.type === "positions" ? ", description" : ", description");
    const extraVal = req.params.type === "locations" ? address || "" : description || "";
    const [result] = await db.execute<mysql.ResultSetHeader>(
      `INSERT INTO ${table} (name${extraField}, sort_order, created_at) VALUES (?, ?, ?, ?)`,
      [name.trim(), extraVal, nextOrder, now]
    );
    const [newRows] = await db.execute<mysql.RowDataPacket[]>(`SELECT * FROM ${table} WHERE id = ?`, [result.insertId]);
    return res.status(201).json({ item: newRows[0] });
  });

  // 마스터 항목 수정
  app.put("/api/master/:type/:id", async (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== "admin") return res.status(403).json({ error: "관리자만 가능합니다" });
    const table = MASTER_TABLES[req.params.type];
    if (!table) return res.status(400).json({ error: "잘못된 타입" });
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    const { name, description, address } = req.body;
    const extraField = req.params.type === "locations" ? ", address=?" : ", description=?";
    const extraVal = req.params.type === "locations" ? address || "" : description || "";
    await db.execute(`UPDATE ${table} SET name=?${extraField} WHERE id=?`, [name, extraVal, req.params.id]);
    const [rows3] = await db.execute<mysql.RowDataPacket[]>(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]);
    return res.json({ item: rows3[0] });
  });

  // 마스터 항목 삭제
    app.delete("/api/master/:type/:id", async (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== "admin") return res.status(403).json({ error: "관리자만 가능합니다" });
    const table = MASTER_TABLES[req.params.type];
    if (!table) return res.status(400).json({ error: "잘못된 타입" });
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    await db.execute(`DELETE FROM ${table} WHERE id = ?`, [req.params.id]);
    return res.json({ success: true });
  });
  // 마스터 순서 변경
  app.patch("/api/master/:type/reorder", async (req, res) => {
    const user = getUser(req);
    if (!user || user.role !== "admin") return res.status(403).json({ error: "관리자만 가능합니다" });
    const table = MASTER_TABLES[req.params.type];
    if (!table) return res.status(400).json({ error: "잘못된 타입" });
    const db = getPool();
    if (!db) return res.status(500).json({ error: "DB 연결 실패" });
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: "ids 배열 필요" });
    for (let i = 0; i < ids.length; i++) {
      await db.execute(`UPDATE ${table} SET sort_order = ? WHERE id = ?`, [i + 1, ids[i]]);
    }
    const [rows] = await db.execute(`SELECT * FROM ${table} ORDER BY sort_order ASC, id ASC`);
    return res.json({ items: rows });
  });
  // ─── 문서 관리 API ─────────────────────────────────────────────────────────

  // 문서 목록 조회
  app.get("/api/documents", async (req, res) => {
    const db = getPool()!;
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const category = (req.query.category as string) || "";
    let query = "SELECT id, title, category, description, file_name, file_size, file_type, uploaded_by, uploader_name, created_at FROM tp_documents";
    if (category) {
      const [rows] = await (db as any).execute(query + " WHERE category = ? ORDER BY created_at DESC", [category]) as [Record<string, unknown>[], unknown];
      return res.json({ documents: rows });
    }
    const [rows] = await (db as any).execute(query + " ORDER BY created_at DESC") as [Record<string, unknown>[], unknown];
    return res.json({ documents: rows });
  });

  // 문서 업로드
  app.post("/api/documents", async (req, res) => {
    const db = getPool()!;
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { title, category, description, file_name, file_size, file_type, file_data } = req.body;
    if (!title || !file_name || !file_data) return res.status(400).json({ error: "Missing required fields" });
    const now = Date.now();
    const [result] = await (db as any).execute(
      "INSERT INTO tp_documents (title, category, description, file_name, file_size, file_type, file_data, uploaded_by, uploader_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [title, category || "일반", description || "", file_name, file_size || 0, file_type || "application/octet-stream", file_data, user.id, user.name, now, now]
    ) as [{ insertId: number }, unknown];
    return res.status(201).json({ id: result.insertId, message: "업로드 완료" });
  });

  // 문서 다운로드
  app.get("/api/documents/:id/download", async (req, res) => {
    const db = getPool()!;
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const [rows] = await (db as any).execute("SELECT * FROM tp_documents WHERE id = ?", [req.params.id]) as [Record<string, unknown>[], unknown];
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    const doc = rows[0];
    const fileData = doc.file_data as string;
    const base64 = fileData.includes(",") ? fileData.split(",")[1] : fileData;
    const buffer = Buffer.from(base64, "base64");
    res.setHeader("Content-Type", (doc.file_type as string) || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(doc.file_name as string)}"`);
    return res.send(buffer);
  });

  // 문서 삭제
  app.delete("/api/documents/:id", async (req, res) => {
    const db = getPool()!;
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const [rows] = await (db as any).execute("SELECT uploaded_by FROM tp_documents WHERE id = ?", [req.params.id]) as [Record<string, unknown>[], unknown];
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    if (user.role !== "admin" && rows[0].uploaded_by !== user.id) return res.status(403).json({ error: "Forbidden" });
    await (db as any).execute("DELETE FROM tp_documents WHERE id = ?", [req.params.id]);
    return res.json({ success: true });
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
