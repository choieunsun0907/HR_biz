/**
 * CommunityPage — TeamPulse Community & Messenger
 * Design: Soft Teal Clarity
 * Features:
 * - 공지사항 (DB 저장, 작성 모달, 필독 설정, 댓글/답글/좋아요/수정/삭제)
 * - 업무 게시판 (DB 저장, 카테고리 필터, 게시글 작성/삭제)
 * - 조직도 메신저 (DB 저장, 1:1 채팅, Enter 전송, 자동 스크롤)
 */

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Bell,
  Pin,
  Eye,
  EyeOff,
  MessageCircle,
  Send,
  Search,
  Paperclip,
  Users,
  Hash,
  ChevronDown,
  Plus,
  Check,
  X,
  MoreHorizontal,
  ThumbsUp,
  Trash2,
  Reply,
  Pencil,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Notice {
  id: number;
  title: string;
  author: string;
  author_id: number;
  created_at: string;
  must_read: number;
  views: number;
  pinned: number;
  content: string;
  comment_count?: number;
}

interface BoardPost {
  id: number;
  category: string;
  title: string;
  author: string;
  author_id: number;
  dept: string;
  created_at: string;
  comment_count?: number;
  views: number;
  pinned: number;
  content?: string;
}

interface Comment {
  id: number;
  target_type: "notice" | "board";
  target_id: number;
  parent_id: number | null;
  author: string;
  author_id: number;
  dept: string;
  content: string;
  likes: number;
  created_at: string;
}

interface ChatMessage {
  id: number;
  channel_id: number;
  sender: string;
  sender_id: number;
  content: string;
  created_at: string;
}

// ─── 조직도 연락처 (DB 계정 기반으로 추후 확장 가능) ─────────────────────────

const orgContacts = [
  {
    dept: "개발팀",
    members: [
      { name: "이준혁", role: "Frontend Engineer", avatar: "이준", online: true },
      { name: "김태호", role: "Backend Engineer", avatar: "김태", online: true },
      { name: "박민준", role: "DevOps", avatar: "박민", online: false },
    ],
  },
  {
    dept: "마케팅",
    members: [
      { name: "박소연", role: "Brand Manager", avatar: "박소", online: true },
      { name: "이수진", role: "Content Writer", avatar: "이수", online: false },
    ],
  },
  {
    dept: "디자인",
    members: [
      { name: "정하은", role: "UX Designer", avatar: "정하", online: true },
      { name: "최지원", role: "Visual Designer", avatar: "최지", online: true },
    ],
  },
  {
    dept: "인사팀",
    members: [
      { name: "김인사", role: "HR Manager", avatar: "김HR", online: true },
    ],
  },
];

// 날짜 포맷 헬퍼
function fmtDate(dt: string) {
  const d = new Date(dt);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}
function fmtDateTime(dt: string) {
  const d = new Date(dt);
  return `${fmtDate(dt)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function fmtTime(dt: string) {
  const d = new Date(dt);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ─── API 헬퍼 ─────────────────────────────────────────────────────────────────

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, { credentials: "include", ...options });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "요청 실패" }));
    throw new Error(err.error || "요청 실패");
  }
  return res.json();
}

// ─── Notice Panel ─────────────────────────────────────────────────────────────

function NoticePanel() {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Notice | null>(null);
  const [readStatus, setReadStatus] = useState<Set<number>>(new Set());
  const [writeOpen, setWriteOpen] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", mustRead: false, pinned: false });
  const [formError, setFormError] = useState({ title: false, content: false });
  const [submitting, setSubmitting] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyInput, setReplyInput] = useState("");
  const [likedComments, setLikedComments] = useState<Set<number>>(new Set());
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // 공지사항 목록 로드
  const loadNotices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/community/notices");
      setNotices(data.notices || []);
    } catch {
      toast.error("공지사항을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadNotices(); }, [loadNotices]);

  // 댓글 로드
  const loadComments = useCallback(async (noticeId: number) => {
    try {
      const data = await apiFetch(`/api/community/comments?type=notice&id=${noticeId}`);
      setComments(data.comments || []);
    } catch { /* silent */ }
  }, []);

  const handleRead = (notice: Notice) => {
    setSelected(notice);
    setReadStatus((prev) => { const next = new Set(prev); next.add(notice.id); return next; });
    loadComments(notice.id);
  };

  const handleSubmit = async () => {
    const errors = { title: !form.title.trim(), content: !form.content.trim() };
    setFormError(errors);
    if (errors.title || errors.content) return;
    setSubmitting(true);
    try {
      const data = await apiFetch("/api/community/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title.trim(), content: form.content.trim(), must_read: form.mustRead, pinned: form.pinned }),
      });
      setNotices((prev) => [data.notice, ...prev]);
      setWriteOpen(false);
      setForm({ title: "", content: "", mustRead: false, pinned: false });
      toast.success("공지사항이 등록되었습니다", {
        description: form.mustRead ? "필독 공지로 전체 직원에게 알림이 발송됩니다." : "공지사항 목록에 추가되었습니다.",
      });
    } catch (e: any) {
      toast.error(e.message || "등록 실패");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (noticeId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm("이 공지사항을 삭제하시겠습니까?")) return;
    try {
      await apiFetch(`/api/community/notices/${noticeId}`, { method: "DELETE" });
      setNotices((prev) => prev.filter((n) => n.id !== noticeId));
      if (selected?.id === noticeId) setSelected(null);
      toast.success("공지사항이 삭제되었습니다.");
    } catch (e: any) {
      toast.error(e.message || "삭제 실패");
    }
  };

  const handleClose = () => {
    setWriteOpen(false);
    setForm({ title: "", content: "", mustRead: false, pinned: false });
    setFormError({ title: false, content: false });
  };

  const handleAddComment = async () => {
    if (!commentInput.trim() || !selected) return;
    try {
      const data = await apiFetch("/api/community/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_type: "notice", target_id: selected.id, content: commentInput.trim() }),
      });
      setComments((prev) => [...prev, data.comment]);
      setCommentInput("");
      toast.success("댓글이 등록되었습니다");
    } catch (e: any) {
      toast.error(e.message || "댓글 등록 실패");
    }
  };

  const handleAddReply = async (parentId: number) => {
    if (!replyInput.trim() || !selected) return;
    try {
      const data = await apiFetch("/api/community/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_type: "notice", target_id: selected.id, content: replyInput.trim(), parent_id: parentId }),
      });
      setComments((prev) => [...prev, data.comment]);
      setReplyInput("");
      setReplyTo(null);
      toast.success("답글이 등록되었습니다");
    } catch (e: any) {
      toast.error(e.message || "답글 등록 실패");
    }
  };

  const handleLike = async (commentId: number) => {
    try {
      const data = await apiFetch(`/api/community/comments/${commentId}/like`, { method: "PATCH" });
      setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, likes: data.likes } : c));
      setLikedComments((prev) => { const next = new Set(prev); next.add(commentId); return next; });
    } catch { /* silent */ }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await apiFetch(`/api/community/comments/${commentId}`, { method: "DELETE" });
      setComments((prev) => prev.filter((c) => c.id !== commentId && c.parent_id !== commentId));
      toast.success("댓글이 삭제되었습니다");
    } catch (e: any) {
      toast.error(e.message || "삭제 실패");
    }
  };

  const handleSaveEdit = async (commentId: number) => {
    if (!editingContent.trim()) return;
    try {
      const data = await apiFetch(`/api/community/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editingContent.trim() }),
      });
      setComments((prev) => prev.map((c) => c.id === commentId ? data.comment : c));
      setEditingCommentId(null);
      setEditingContent("");
      toast.success("댓글이 수정되었습니다");
    } catch (e: any) {
      toast.error(e.message || "수정 실패");
    }
  };

  const topComments = useMemo(() => comments.filter((c) => c.parent_id === null), [comments]);
  const getReplies = (parentId: number) => comments.filter((c) => c.parent_id === parentId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground">공지사항</h3>
          <div className="flex items-center gap-2">
            <button onClick={loadNotices} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="새로고침">
              <RefreshCw size={13} className="text-muted-foreground" />
            </button>
            {user?.role === "admin" && (
              <Button size="sm" className="gap-1.5 rounded-xl text-xs text-white" style={{ background: "var(--teal)" }} onClick={() => setWriteOpen(true)}>
                <Plus size={13} /> 새 공지 작성
              </Button>
            )}
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : notices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Bell size={28} className="mb-2 opacity-30" />
            <p className="text-sm">등록된 공지사항이 없습니다.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notices.map((notice) => {
              const isRead = readStatus.has(notice.id);
              return (
                <div
                  key={notice.id}
                  className={cn(
                    "px-4 py-3.5 cursor-pointer hover:bg-muted/30 transition-colors",
                    selected?.id === notice.id && "bg-[var(--teal-light)]"
                  )}
                  onClick={() => handleRead(notice)}
                >
                  <div className="flex items-start gap-2.5">
                    {!!notice.pinned && <Pin size={13} className="text-[var(--coral)] shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {!!notice.must_read && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--coral-light)] text-[var(--coral)] shrink-0">필독</span>
                        )}
                        <span className={cn("text-sm font-medium truncate", isRead ? "text-muted-foreground" : "text-foreground")}>
                          {notice.title}
                        </span>
                        {!isRead && <span className="w-1.5 h-1.5 rounded-full bg-[var(--coral)] shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{notice.author}</span>
                        <span>·</span>
                        <span>{fmtDate(notice.created_at)}</span>
                        <span>·</span>
                        <span className="flex items-center gap-0.5"><Eye size={10} /> {notice.views}</span>
                        {notice.comment_count ? (
                          <><span>·</span><span>댓글 {notice.comment_count}</span></>
                        ) : null}
                      </div>
                    </div>
                    {user?.role === "admin" && (
                      <button
                        className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                        onClick={(e) => handleDelete(notice.id, e)}
                        title="삭제"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail */}
      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden flex flex-col">
        {selected ? (
          <div className="flex flex-col h-full">
            <div className="p-5 border-b border-border">
              <div className="flex items-start gap-2 mb-2">
                {!!selected.must_read && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--coral-light)] text-[var(--coral)] shrink-0 mt-0.5">필독</span>
                )}
                <h3 className="font-bold text-foreground leading-snug">{selected.title}</h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{selected.author}</span>
                <span>·</span>
                <span>{fmtDate(selected.created_at)}</span>
                <span>·</span>
                <span className="flex items-center gap-0.5"><Eye size={11} /> {selected.views}</span>
              </div>
            </div>
            <ScrollArea className="flex-1 p-5">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{selected.content}</p>

              {/* 댓글 */}
              <div className="mt-6 space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground">댓글 {topComments.length}개</h4>
                {topComments.map((comment) => (
                  <div key={comment.id} className="space-y-2">
                    <div className="flex gap-2.5">
                      <Avatar className="w-7 h-7 shrink-0">
                        <AvatarFallback className="text-[10px] font-bold text-white" style={{ background: "var(--teal)" }}>
                          {comment.author.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-semibold text-foreground">{comment.author}</span>
                          {comment.dept && <span className="text-[10px] text-muted-foreground">{comment.dept}</span>}
                          <span className="text-[10px] text-muted-foreground ml-auto">{fmtDateTime(comment.created_at)}</span>
                        </div>
                        {editingCommentId === comment.id ? (
                          <div className="space-y-1.5">
                            <textarea
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              rows={2}
                              className="w-full text-xs px-2 py-1.5 border border-border rounded-lg outline-none focus:ring-2 focus:ring-[var(--teal)]/30 resize-none"
                            />
                            <div className="flex gap-1.5">
                              <button onClick={() => handleSaveEdit(comment.id)} className="text-[11px] px-2 py-1 rounded-lg bg-[var(--teal)] text-white">저장</button>
                              <button onClick={() => { setEditingCommentId(null); setEditingContent(""); }} className="text-[11px] px-2 py-1 rounded-lg bg-muted text-muted-foreground">취소</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-foreground leading-relaxed">{comment.content}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            onClick={() => handleLike(comment.id)}
                            disabled={likedComments.has(comment.id)}
                            className={cn("flex items-center gap-0.5 text-[11px] transition-colors", likedComments.has(comment.id) ? "text-[var(--teal)]" : "text-muted-foreground hover:text-[var(--teal)]")}
                          >
                            <ThumbsUp size={11} /> {comment.likes}
                          </button>
                          <button onClick={() => { setReplyTo(replyTo === comment.id ? null : comment.id); }} className="flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                            <Reply size={11} /> 답글
                          </button>
                          {comment.author_id === user?.id && (
                            <>
                              <button onClick={() => { setEditingCommentId(comment.id); setEditingContent(comment.content); setReplyTo(null); }} className="flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                                <Pencil size={11} /> 수정
                              </button>
                              <button onClick={() => handleDeleteComment(comment.id)} className="flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-red-500 transition-colors">
                                <Trash2 size={11} /> 삭제
                              </button>
                            </>
                          )}
                          {user?.role === "admin" && comment.author_id !== user?.id && (
                            <button onClick={() => handleDeleteComment(comment.id)} className="flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-red-500 transition-colors">
                              <Trash2 size={11} /> 삭제
                            </button>
                          )}
                        </div>
                        {/* 답글 입력 */}
                        {replyTo === comment.id && (
                          <div className="mt-2 flex items-start gap-2 bg-muted/40 rounded-xl p-2">
                            <textarea
                              value={replyInput}
                              onChange={(e) => setReplyInput(e.target.value)}
                              placeholder="답글을 입력하세요..."
                              rows={1}
                              className="flex-1 bg-transparent text-xs outline-none resize-none placeholder:text-muted-foreground/60"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); handleAddReply(comment.id); }
                              }}
                            />
                            <button onClick={() => handleAddReply(comment.id)} disabled={!replyInput.trim()} className={cn("w-6 h-6 rounded-lg flex items-center justify-center transition-all", replyInput.trim() ? "bg-[var(--teal)] text-white" : "bg-muted text-muted-foreground/40")}>
                              <Send size={11} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* 대댓글 */}
                    {getReplies(comment.id).map((reply) => (
                      <div key={reply.id} className="ml-9 flex gap-2.5">
                        <Avatar className="w-6 h-6 shrink-0">
                          <AvatarFallback className="text-[9px] font-bold text-white" style={{ background: "var(--teal-dark)" }}>
                            {reply.author.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-xs font-semibold text-foreground">{reply.author}</span>
                            <span className="text-[10px] text-muted-foreground ml-auto">{fmtDateTime(reply.created_at)}</span>
                          </div>
                          <p className="text-xs text-foreground leading-relaxed">{reply.content}</p>
                          {(reply.author_id === user?.id || user?.role === "admin") && (
                            <button onClick={() => handleDeleteComment(reply.id)} className="flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-red-500 transition-colors mt-1">
                              <Trash2 size={10} /> 삭제
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* 댓글 입력 */}
            <div className="p-4 border-t border-border">
              <div className="flex items-start gap-2 bg-muted/40 rounded-xl p-2.5">
                <textarea
                  ref={commentInputRef}
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="댓글을 입력하세요..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); handleAddComment(); }
                  }}
                  rows={commentInput.split("\n").length > 1 ? 3 : 1}
                  className="flex-1 bg-transparent text-xs outline-none resize-none placeholder:text-muted-foreground/60 leading-relaxed"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!commentInput.trim()}
                  className={cn("shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all mb-0.5", commentInput.trim() ? "bg-[var(--teal)] text-white hover:opacity-90" : "bg-muted text-muted-foreground/40")}
                >
                  <Send size={13} />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground/60 mt-1 ml-1">Enter로 등록 · Shift+Enter로 줄바꿈</p>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-10 text-center">
            <Bell size={36} className="text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">공지사항을 선택하면 내용이 표시됩니다</p>
          </div>
        )}
      </div>

      {/* Write Modal */}
      <Dialog open={writeOpen} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">새 공지사항 작성</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-1">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">제목 <span className="text-[var(--coral)]">*</span></label>
              <input
                type="text"
                placeholder="공지사항 제목을 입력하세요"
                value={form.title}
                onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); setFormError((f) => ({ ...f, title: false })); }}
                className={cn("w-full px-3 py-2.5 text-sm rounded-xl border outline-none transition-all focus:ring-2 focus:ring-[var(--teal)]/30 focus:border-[var(--teal)]", formError.title ? "border-[var(--coral)] bg-[var(--coral-light)]" : "border-border bg-background")}
              />
              {formError.title && <p className="text-[11px] text-[var(--coral)] mt-1">제목을 입력해주세요.</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">내용 <span className="text-[var(--coral)]">*</span></label>
              <textarea
                placeholder="공지사항 내용을 입력하세요"
                value={form.content}
                onChange={(e) => { setForm((f) => ({ ...f, content: e.target.value })); setFormError((f) => ({ ...f, content: false })); }}
                rows={5}
                className={cn("w-full px-3 py-2.5 text-sm rounded-xl border outline-none transition-all resize-none focus:ring-2 focus:ring-[var(--teal)]/30 focus:border-[var(--teal)]", formError.content ? "border-[var(--coral)] bg-[var(--coral-light)]" : "border-border bg-background")}
              />
              {formError.content && <p className="text-[11px] text-[var(--coral)] mt-1">내용을 입력해주세요.</p>}
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div className={cn("w-4 h-4 rounded border-2 flex items-center justify-center transition-all", form.mustRead ? "bg-[var(--coral)] border-[var(--coral)]" : "border-border")} onClick={() => setForm((f) => ({ ...f, mustRead: !f.mustRead }))}>
                  {form.mustRead && <Check size={10} className="text-white" strokeWidth={3} />}
                </div>
                <span className="text-xs font-medium text-foreground">필독 설정</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div className={cn("w-4 h-4 rounded border-2 flex items-center justify-center transition-all", form.pinned ? "bg-[var(--teal)] border-[var(--teal)]" : "border-border")} onClick={() => setForm((f) => ({ ...f, pinned: !f.pinned }))}>
                  {form.pinned && <Check size={10} className="text-white" strokeWidth={3} />}
                </div>
                <span className="text-xs font-medium text-foreground">상단 고정</span>
              </label>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 rounded-xl text-sm" onClick={handleClose} disabled={submitting}>취소</Button>
              <Button className="flex-1 rounded-xl text-sm text-white" style={{ background: "var(--teal)" }} onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Loader2 size={14} className="animate-spin" /> : "등록하기"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Board Panel ──────────────────────────────────────────────────────────────

const boardCategories = ["전체", "개발", "마케팅", "디자인", "영업", "인사"];

function BoardPanel() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("전체");
  const [writeOpen, setWriteOpen] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", category: "개발" });
  const [formError, setFormError] = useState({ title: false, content: false });
  const [submitting, setSubmitting] = useState(false);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/community/board");
      setPosts(data.posts || []);
    } catch {
      toast.error("게시판을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const filtered = activeCategory === "전체" ? posts : posts.filter((p) => p.category === activeCategory);

  const categoryColors: Record<string, string> = {
    개발: "bg-blue-50 text-blue-600",
    마케팅: "bg-purple-50 text-purple-600",
    디자인: "bg-pink-50 text-pink-600",
    영업: "bg-orange-50 text-orange-600",
    인사: "bg-[var(--teal-light)] text-[var(--teal-dark)]",
  };

  const handleSubmit = async () => {
    const errors = { title: !form.title.trim(), content: !form.content.trim() };
    setFormError(errors);
    if (errors.title || errors.content) return;
    setSubmitting(true);
    try {
      const data = await apiFetch("/api/community/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title.trim(), content: form.content.trim(), category: form.category }),
      });
      setPosts((prev) => [data.post, ...prev]);
      setWriteOpen(false);
      setForm({ title: "", content: "", category: "개발" });
      toast.success("게시글이 등록되었습니다");
    } catch (e: any) {
      toast.error(e.message || "등록 실패");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (postId: number, authorId: number) => {
    if (!confirm("이 게시글을 삭제하시겠습니까?")) return;
    try {
      await apiFetch(`/api/community/board/${postId}`, { method: "DELETE" });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success("게시글이 삭제되었습니다.");
    } catch (e: any) {
      toast.error(e.message || "삭제 실패");
    }
  };

  const handleClose = () => {
    setWriteOpen(false);
    setForm({ title: "", content: "", category: "개발" });
    setFormError({ title: false, content: false });
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
            {boardCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all", activeCategory === cat ? "bg-[var(--teal)] text-white" : "bg-muted text-muted-foreground hover:bg-muted/80")}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-2 shrink-0">
            <button onClick={loadPosts} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="새로고침">
              <RefreshCw size={13} className="text-muted-foreground" />
            </button>
            <Button size="sm" className="gap-1.5 rounded-xl text-xs text-white" style={{ background: "var(--teal)" }} onClick={() => setWriteOpen(true)}>
              <Plus size={13} /> 글쓰기
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Hash size={28} className="mb-2 opacity-30" />
            <p className="text-sm">등록된 게시글이 없습니다.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((post) => (
              <div key={post.id} className="px-5 py-3.5 hover:bg-muted/20 transition-colors">
                <div className="flex items-start gap-3">
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5", categoryColors[post.category] ?? "bg-muted text-muted-foreground")}>
                    {post.category}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {!!post.pinned && <Pin size={11} className="text-[var(--coral)] shrink-0" />}
                      <span className="text-sm font-medium text-foreground truncate">{post.title}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                      <span>{post.author}</span>
                      {post.dept && <><span>·</span><span>{post.dept}</span></>}
                      <span>·</span>
                      <span>{fmtDate(post.created_at)}</span>
                      {(post.comment_count ?? 0) > 0 && <><span>·</span><span>댓글 {post.comment_count}</span></>}
                      <span>·</span>
                      <span className="flex items-center gap-0.5"><Eye size={10} /> {post.views}</span>
                    </div>
                  </div>
                  {(post.author_id === user?.id || user?.role === "admin") && (
                    <button
                      onClick={() => handleDelete(post.id, post.author_id)}
                      className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                      title="삭제"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Write Modal */}
      <Dialog open={writeOpen} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">새 게시글 작성</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-1">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">카테고리</label>
              <div className="flex flex-wrap gap-1.5">
                {boardCategories.filter((c) => c !== "전체").map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setForm((f) => ({ ...f, category: cat }))}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all border", form.category === cat ? "bg-[var(--teal)] text-white border-[var(--teal)]" : "bg-muted text-muted-foreground border-transparent hover:border-[var(--teal)]/30")}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">제목 <span className="text-[var(--coral)]">*</span></label>
              <input
                type="text"
                placeholder="게시글 제목을 입력하세요"
                value={form.title}
                onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); setFormError((f) => ({ ...f, title: false })); }}
                className={cn("w-full px-3 py-2.5 text-sm rounded-xl border outline-none transition-all focus:ring-2 focus:ring-[var(--teal)]/30 focus:border-[var(--teal)]", formError.title ? "border-[var(--coral)] bg-[var(--coral-light)]" : "border-border bg-background")}
              />
              {formError.title && <p className="text-[11px] text-[var(--coral)] mt-1">제목을 입력해주세요.</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">내용 <span className="text-[var(--coral)]">*</span></label>
              <textarea
                placeholder="게시글 내용을 입력하세요"
                value={form.content}
                onChange={(e) => { setForm((f) => ({ ...f, content: e.target.value })); setFormError((f) => ({ ...f, content: false })); }}
                rows={5}
                className={cn("w-full px-3 py-2.5 text-sm rounded-xl border outline-none transition-all resize-none focus:ring-2 focus:ring-[var(--teal)]/30 focus:border-[var(--teal)]", formError.content ? "border-[var(--coral)] bg-[var(--coral-light)]" : "border-border bg-background")}
              />
              {formError.content && <p className="text-[11px] text-[var(--coral)] mt-1">내용을 입력해주세요.</p>}
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 rounded-xl text-sm" onClick={handleClose} disabled={submitting}>취소</Button>
              <Button className="flex-1 rounded-xl text-sm text-white" style={{ background: "var(--teal)" }} onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Loader2 size={14} className="animate-spin" /> : "등록하기"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Messenger Panel ──────────────────────────────────────────────────────────

function MessengerPanel() {
  const { user } = useAuth();
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set(["개발팀", "마케팅"]));
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const allMembers = orgContacts.flatMap((d) => d.members);
  const activeMember = allMembers.find((m) => m.name === activeChat);

  // 메시지 로드
  const loadMessages = useCallback(async (target: string) => {
    setLoadingMsgs(true);
    try {
      const data = await apiFetch(`/api/messenger/messages?with=${encodeURIComponent(target)}`);
      setMessages(data.messages || []);
    } catch { /* silent */ } finally {
      setLoadingMsgs(false);
    }
  }, []);

  // 채팅 상대 변경
  const handleSelectChat = useCallback((name: string) => {
    setActiveChat(name);
    setInput("");
    loadMessages(name);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [loadMessages]);

  // 폴링 (5초마다 새 메시지 확인)
  useEffect(() => {
    if (!activeChat) return;
    pollRef.current = setInterval(() => {
      apiFetch(`/api/messenger/messages?with=${encodeURIComponent(activeChat)}`)
        .then((data) => setMessages(data.messages || []))
        .catch(() => {});
    }, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeChat]);

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleDept = (dept: string) => {
    setExpandedDepts((prev) => {
      const next = new Set<string>(prev);
      if (next.has(dept)) next.delete(dept);
      else next.add(dept);
      return next;
    });
  };

  const handleSend = async () => {
    if (!input.trim() || !activeChat || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    try {
      const data = await apiFetch("/api/messenger/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: activeChat, content }),
      });
      setMessages((prev) => [...prev, data.message]);
    } catch (e: any) {
      toast.error(e.message || "전송 실패");
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); handleSend(); }
  };

  const filteredMembers = searchQuery
    ? allMembers.filter((m) => m.name.includes(searchQuery) || orgContacts.find((d) => d.members.includes(m))?.dept.includes(searchQuery))
    : null;

  const myName = user?.name ?? "나";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 h-[600px]">
      {/* Contact List */}
      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden flex flex-col">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="이름, 부서 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs bg-muted rounded-xl border-0 outline-none focus:ring-2 focus:ring-[var(--teal)]/30"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2">
            {filteredMembers ? (
              filteredMembers.map((member) => (
                <button
                  key={member.name}
                  className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors", activeChat === member.name ? "bg-[var(--teal-light)]" : "hover:bg-muted")}
                  onClick={() => handleSelectChat(member.name)}
                >
                  <div className="relative">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-[10px] font-bold text-white" style={{ background: "var(--teal)" }}>
                        {member.avatar}
                      </AvatarFallback>
                    </Avatar>
                    {member.online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-foreground">{member.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{member.role}</div>
                  </div>
                </button>
              ))
            ) : (
              orgContacts.map((dept) => (
                <div key={dept.dept} className="mb-1">
                  <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors" onClick={() => toggleDept(dept.dept)}>
                    <ChevronDown size={13} className={cn("text-muted-foreground transition-transform", !expandedDepts.has(dept.dept) && "-rotate-90")} />
                    <span className="text-xs font-semibold text-muted-foreground">{dept.dept}</span>
                    <span className="text-[10px] text-muted-foreground/60 ml-auto">{dept.members.length}</span>
                  </button>
                  {expandedDepts.has(dept.dept) && (
                    <div className="ml-2">
                      {dept.members.map((member) => (
                        <button
                          key={member.name}
                          className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors", activeChat === member.name ? "bg-[var(--teal-light)]" : "hover:bg-muted")}
                          onClick={() => handleSelectChat(member.name)}
                        >
                          <div className="relative">
                            <Avatar className="w-7 h-7">
                              <AvatarFallback className="text-[10px] font-bold text-white" style={{ background: "var(--teal)" }}>
                                {member.avatar}
                              </AvatarFallback>
                            </Avatar>
                            {member.online && <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 rounded-full border-2 border-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-foreground">{member.name}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{member.role}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        <div className="p-3 border-t border-border">
          <Button size="sm" variant="outline" className="w-full rounded-xl text-xs gap-1.5" onClick={() => toast.info("그룹 채팅 생성 기능은 준비 중입니다")}>
            <Users size={13} /> 그룹 채팅 만들기
          </Button>
        </div>
      </div>

      {/* Chat Window */}
      <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-border overflow-hidden flex flex-col">
        {activeChat ? (
          <>
            <div className="px-5 py-3.5 border-b border-border flex items-center gap-3">
              <Avatar className="w-9 h-9">
                <AvatarFallback className="text-xs font-bold text-white" style={{ background: "var(--teal)" }}>
                  {activeMember?.avatar ?? activeChat.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold text-sm text-foreground">{activeChat}</div>
                <div className={cn("text-xs flex items-center gap-1", activeMember?.online ? "text-emerald-500" : "text-muted-foreground")}>
                  <span className={cn("w-1.5 h-1.5 rounded-full inline-block", activeMember?.online ? "bg-emerald-400" : "bg-muted-foreground/40")} />
                  {activeMember?.online ? "온라인" : "오프라인"}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <span className="text-xs text-muted-foreground">{activeMember?.role}</span>
                <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => toast.info("채팅 옵션")}>
                  <MoreHorizontal size={16} />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 px-5 py-4">
              <div className="space-y-4">
                {loadingMsgs ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 size={20} className="animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <MessageCircle size={32} className="text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">첫 메시지를 보내보세요!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.sender === myName;
                    return (
                      <div key={msg.id} className={cn("flex gap-3", isMine && "flex-row-reverse")}>
                        {!isMine && (
                          <Avatar className="w-7 h-7 shrink-0 mt-1">
                            <AvatarFallback className="text-[10px] font-bold text-white" style={{ background: "var(--teal)" }}>
                              {msg.sender.slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className={cn("flex flex-col gap-1", isMine && "items-end")}>
                          {!isMine && <span className="text-[11px] text-muted-foreground ml-1">{msg.sender}</span>}
                          <div className={isMine ? "chat-bubble-sent" : "chat-bubble-recv"}>{msg.content}</div>
                          <span className="text-[10px] text-muted-foreground px-1">{fmtTime(msg.created_at)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="px-4 py-3 border-t border-border">
              <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
                <Button variant="ghost" size="icon" className="w-7 h-7 rounded-lg shrink-0" onClick={() => toast.info("파일 첨부 기능은 준비 중입니다")}>
                  <Paperclip size={15} className="text-muted-foreground" />
                </Button>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="메시지를 입력하세요... (Enter로 전송)"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                />
                {input && (
                  <button onClick={() => setInput("")} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X size={14} />
                  </button>
                )}
                <Button
                  size="icon"
                  className="w-8 h-8 rounded-xl shrink-0 text-white transition-all"
                  style={{ background: input.trim() ? "var(--teal)" : undefined }}
                  disabled={!input.trim() || sending}
                  onClick={handleSend}
                >
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground/60 mt-1.5 ml-1">Enter로 전송 · DB에 영구 저장됩니다</p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
            <MessageCircle size={40} className="text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">대화 상대를 선택하세요</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CommunityPage() {
  return (
    <div className="p-5 lg:p-7 page-enter">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">소통 · 협업</h1>
        <p className="text-sm text-muted-foreground mt-0.5">공지사항 · 업무 게시판 · 조직도 메신저</p>
      </div>

      <Tabs defaultValue="notice" className="space-y-5">
        <TabsList className="bg-muted rounded-xl p-1">
          <TabsTrigger value="notice" className="rounded-lg text-sm gap-2">
            <Bell size={14} /> 공지사항
          </TabsTrigger>
          <TabsTrigger value="board" className="rounded-lg text-sm gap-2">
            <Hash size={14} /> 업무 게시판
          </TabsTrigger>
          <TabsTrigger value="messenger" className="rounded-lg text-sm gap-2">
            <MessageCircle size={14} /> 메신저
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notice">
          <NoticePanel />
        </TabsContent>
        <TabsContent value="board">
          <BoardPanel />
        </TabsContent>
        <TabsContent value="messenger">
          <MessengerPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
