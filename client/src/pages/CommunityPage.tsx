/**
 * CommunityPage — TeamPulse Community & Messenger
 * Design: Soft Teal Clarity
 * Features:
 * - 공지사항 (작성 모달, 필독 설정, 미열람자 확인, 실시간 목록 반영)
 * - 업무 게시판 (프로젝트별 카테고리, 게시글 작성 모달)
 * - 조직도 메신저 (1:1 채팅, Enter 전송, 자동 스크롤)
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bell,
  Pin,
  Eye,
  EyeOff,
  MessageCircle,
  Send,
  Search,
  Paperclip,
  Image as ImageIcon,
  Users,
  Hash,
  ChevronDown,
  FileText,
  Plus,
  Check,
  AlertTriangle,
  X,
  MoreHorizontal,
  ThumbsUp,
  Trash2,
  Reply,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Notice {
  id: number;
  title: string;
  author: string;
  date: string;
  mustRead: boolean;
  unread: number;
  total: number;
  views: number;
  pinned: boolean;
  content: string;
}

interface BoardPost {
  id: number;
  category: string;
  title: string;
  author: string;
  dept: string;
  date: string;
  comments: number;
  views: number;
  hasFile: boolean;
  hasImage: boolean;
  pinned: boolean;
  content?: string;
}

interface NoticeComment {
  id: number;
  noticeId: number;
  author: string;
  avatar: string;
  dept: string;
  content: string;
  date: string;
  likes: number;
  likedByMe: boolean;
  replies?: NoticeComment[];
}

interface Message {
  id: number;
  sender: string;
  content: string;
  time: string;
  isMine: boolean;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const INITIAL_NOTICES: Notice[] = [
  {
    id: 1,
    title: "2025년 하반기 성과 평가 일정 안내",
    author: "인사팀",
    date: "2025.05.14",
    mustRead: true,
    unread: 12,
    total: 247,
    views: 235,
    pinned: true,
    content: "2025년 하반기 성과 평가가 6월 1일부터 시작됩니다. 모든 팀장은 평가 기준을 사전에 숙지해주시기 바랍니다.",
  },
  {
    id: 2,
    title: "사내 복지 포인트 사용 기한 안내 (5월 31일까지)",
    author: "복지팀",
    date: "2025.05.12",
    mustRead: true,
    unread: 45,
    total: 247,
    views: 202,
    pinned: true,
    content: "5월 31일까지 미사용 복지 포인트는 소멸됩니다. 복지몰에서 사용하시기 바랍니다.",
  },
  {
    id: 3,
    title: "6월 워크샵 참가 신청 안내",
    author: "인사팀",
    date: "2025.05.10",
    mustRead: false,
    unread: 0,
    total: 247,
    views: 247,
    pinned: false,
    content: "6월 20~21일 강원도 팀 워크샵 참가 신청을 받습니다. 5월 20일까지 신청해주세요.",
  },
  {
    id: 4,
    title: "사무실 에어컨 점검 안내 (5월 16일)",
    author: "총무팀",
    date: "2025.05.09",
    mustRead: false,
    unread: 0,
    total: 247,
    views: 247,
    pinned: false,
    content: "5월 16일 오전 10시~12시 에어컨 정기 점검이 있습니다.",
  },
];

const INITIAL_BOARD_POSTS: BoardPost[] = [
  { id: 1, category: "개발", title: "React 19 마이그레이션 가이드 공유", author: "이준혁", dept: "개발팀", date: "2025.05.15", comments: 8, views: 124, hasFile: true, hasImage: false, pinned: false },
  { id: 2, category: "마케팅", title: "Q2 브랜드 캠페인 결과 보고서", author: "박소연", dept: "마케팅", date: "2025.05.14", comments: 5, views: 89, hasFile: true, hasImage: true, pinned: true },
  { id: 3, category: "디자인", title: "2025 UI 가이드라인 v2.0 배포", author: "정하은", dept: "디자인", date: "2025.05.13", comments: 12, views: 203, hasFile: true, hasImage: true, pinned: false },
  { id: 4, category: "인사", title: "신입사원 온보딩 프로그램 개선안", author: "김인사", dept: "인사팀", date: "2025.05.12", comments: 3, views: 67, hasFile: false, hasImage: false, pinned: false },
  { id: 5, category: "영업", title: "5월 영업 목표 달성 현황 공유", author: "홍길동", dept: "영업팀", date: "2025.05.11", comments: 7, views: 156, hasFile: true, hasImage: false, pinned: false },
];

const boardCategories = ["전체", "개발", "마케팅", "디자인", "영업", "인사"];

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

// 채팅방별 메시지 저장소
const INITIAL_CHAT_MESSAGES: Record<string, Message[]> = {
  "이준혁": [
    { id: 1, sender: "이준혁", content: "안녕하세요! React 19 마이그레이션 관련해서 공유드린 문서 확인해보셨나요?", time: "오전 10:12", isMine: false },
    { id: 2, sender: "나", content: "네, 방금 확인했습니다. 내용이 정말 잘 정리되어 있네요!", time: "오전 10:15", isMine: true },
    { id: 3, sender: "이준혁", content: "감사합니다 😊 혹시 질문 있으시면 언제든지 말씀해주세요.", time: "오전 10:16", isMine: false },
    { id: 4, sender: "나", content: "네, 한 가지 궁금한 게 있는데요. Server Components 관련 부분을 좀 더 자세히 설명해주실 수 있을까요?", time: "오전 10:20", isMine: true },
    { id: 5, sender: "이준혁", content: "물론이죠! 오후에 잠깐 미팅 가능하신가요?", time: "오전 10:22", isMine: false },
  ],
  "박소연": [
    { id: 1, sender: "박소연", content: "Q2 캠페인 보고서 검토 부탁드립니다!", time: "오전 09:30", isMine: false },
  ],
  "정하은": [
    { id: 1, sender: "정하은", content: "UI 가이드라인 v2.0 배포했습니다. 확인해주세요!", time: "어제 오후 03:15", isMine: false },
    { id: 2, sender: "나", content: "감사합니다! 잘 보겠습니다.", time: "어제 오후 03:20", isMine: true },
  ],
};

// 공지사항별 초기 댓글 데이터
const INITIAL_COMMENTS: NoticeComment[] = [
  {
    id: 1, noticeId: 1, author: "이준혁", avatar: "이준", dept: "개발팀",
    content: "성과 평가 기준 문서는 어디서 확인할 수 있나요?",
    date: "2025.05.14 10:32", likes: 3, likedByMe: false,
  },
  {
    id: 2, noticeId: 1, author: "박소연", avatar: "박소", dept: "마케팅",
    content: "마케팅팀도 동일한 기준으로 평가되나요? 별도 안내가 있을지 궁금합니다.",
    date: "2025.05.14 11:05", likes: 1, likedByMe: false,
  },
  {
    id: 3, noticeId: 2, author: "정하은", avatar: "정하", dept: "디자인",
    content: "복지몰 링크 공유 부탁드립니다!",
    date: "2025.05.12 14:20", likes: 5, likedByMe: false,
  },
];

// ─── Notice Panel ─────────────────────────────────────────────────────────────

function NoticePanel() {
  const [notices, setNotices] = useState<Notice[]>(INITIAL_NOTICES);
  const [selected, setSelected] = useState<Notice | null>(null);
  const [readStatus, setReadStatus] = useState<Set<number>>(new Set([3, 4]));
  const [writeOpen, setWriteOpen] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", mustRead: false, pinned: false });
  const [formError, setFormError] = useState({ title: false, content: false });
  const [comments, setComments] = useState<NoticeComment[]>(INITIAL_COMMENTS);
  const [commentInput, setCommentInput] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyInput, setReplyInput] = useState("");
  const [likedComments, setLikedComments] = useState<Set<number>>(new Set());
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const handleRead = (notice: Notice) => {
    setSelected(notice);
    setReadStatus((prev) => { const next = new Set(prev); next.add(notice.id); return next; });
  };

  const handleUnreadCheck = (notice: Notice, e?: React.MouseEvent) => {
    e?.stopPropagation();
    toast.info(`미열람자 ${notice.unread}명`, {
      description: `전체 ${notice.total}명 중 ${notice.views}명 열람 완료`,
    });
  };

  const handleSubmit = () => {
    const errors = { title: !form.title.trim(), content: !form.content.trim() };
    setFormError(errors);
    if (errors.title || errors.content) return;

    const today = new Date();
    const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;

    const newNotice: Notice = {
      id: Date.now(),
      title: form.title.trim(),
      content: form.content.trim(),
      author: "김인사",
      date: dateStr,
      mustRead: form.mustRead,
      pinned: form.pinned,
      unread: 247,
      total: 247,
      views: 0,
    };

    setNotices((prev) => [newNotice, ...prev]);
    setWriteOpen(false);
    setForm({ title: "", content: "", mustRead: false, pinned: false });
    setFormError({ title: false, content: false });
    toast.success("공지사항이 등록되었습니다", { description: form.mustRead ? "필독 공지로 전체 직원에게 알림이 발송됩니다." : "공지사항 목록에 추가되었습니다." });
  };

  const handleClose = () => {
    setWriteOpen(false);
    setForm({ title: "", content: "", mustRead: false, pinned: false });
    setFormError({ title: false, content: false });
  };

  const handleAddComment = () => {
    if (!commentInput.trim() || !selected) return;
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,"0")}.${String(now.getDate()).padStart(2,"0")} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    const newComment: NoticeComment = {
      id: Date.now(),
      noticeId: selected.id,
      author: "김인사",
      avatar: "김HR",
      dept: "인사팀",
      content: commentInput.trim(),
      date: dateStr,
      likes: 0,
      likedByMe: false,
    };
    setComments((prev) => [...prev, newComment]);
    setCommentInput("");
    toast.success("댓글이 등록되었습니다");
  };

  const handleAddReply = (parentId: number) => {
    if (!replyInput.trim() || !selected) return;
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,"0")}.${String(now.getDate()).padStart(2,"0")} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    const reply: NoticeComment = {
      id: Date.now(),
      noticeId: selected.id,
      author: "김인사",
      avatar: "김HR",
      dept: "인사팀",
      content: replyInput.trim(),
      date: dateStr,
      likes: 0,
      likedByMe: false,
    };
    setComments((prev) => prev.map((c) =>
      c.id === parentId ? { ...c, replies: [...(c.replies ?? []), reply] } : c
    ));
    setReplyInput("");
    setReplyTo(null);
    toast.success("답글이 등록되었습니다");
  };

  const handleLike = (commentId: number) => {
    setLikedComments((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
        setComments((c) => c.map((cm) => cm.id === commentId ? { ...cm, likes: cm.likes - 1 } : cm));
      } else {
        next.add(commentId);
        setComments((c) => c.map((cm) => cm.id === commentId ? { ...cm, likes: cm.likes + 1 } : cm));
      }
      return next;
    });
  };

  const handleDeleteComment = (commentId: number) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    toast.success("댓글이 삭제되었습니다");
  };

  const selectedComments = selected ? comments.filter((c) => c.noticeId === selected.id) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground">공지사항</h3>
          <Button
            size="sm"
            className="gap-1.5 rounded-xl text-xs text-white"
            style={{ background: "var(--teal)" }}
            onClick={() => setWriteOpen(true)}
          >
            <Plus size={13} />
            새 공지 작성
          </Button>
        </div>
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
                  {notice.pinned && (
                    <Pin size={13} className="text-[var(--coral)] shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {notice.mustRead && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--coral-light)] text-[var(--coral)] shrink-0">
                          필독
                        </span>
                      )}
                      <span className={cn("text-sm font-medium truncate", isRead ? "text-muted-foreground" : "text-foreground")}>
                        {notice.title}
                      </span>
                      {!isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--coral)] shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{notice.author}</span>
                      <span>·</span>
                      <span>{notice.date}</span>
                      {notice.unread > 0 && (
                        <>
                          <span>·</span>
                          <button
                            className="flex items-center gap-0.5 text-amber-500 hover:underline"
                            onClick={(e) => handleUnreadCheck(notice, e)}
                          >
                            <EyeOff size={11} />
                            미열람 {notice.unread}명
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail */}
      <div className="bg-white rounded-2xl shadow-sm border border-border">
        {selected ? (
          <div className="p-5">
            <div className="flex items-start gap-2 mb-3">
              {selected.mustRead && (
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-[var(--coral-light)] text-[var(--coral)] shrink-0">
                  필독
                </span>
              )}
              <h3 className="font-bold text-foreground text-base leading-snug">{selected.title}</h3>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4 pb-4 border-b border-border">
              <span>{selected.author}</span>
              <span>·</span>
              <span>{selected.date}</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Eye size={12} /> {selected.views}명 열람</span>
            </div>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{selected.content}</p>

            {selected.unread > 0 && (
              <div className="mt-5 p-3 bg-amber-50 rounded-xl flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-500 shrink-0" />
                <div className="text-xs text-amber-700">
                  <strong>{selected.unread}명</strong>이 아직 이 공지를 읽지 않았습니다.
                  <button className="ml-2 underline" onClick={() => handleUnreadCheck(selected)}>
                    미열람자 확인
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                className="rounded-xl text-white text-xs gap-1.5"
                style={{ background: "var(--teal)" }}
                onClick={() => toast.success("열람 확인 완료")}
              >
                <Check size={13} />
                열람 확인
              </Button>
              <Button size="sm" variant="outline" className="rounded-xl text-xs gap-1.5"
                onClick={() => commentInputRef.current?.focus()}>
                <MessageCircle size={12} />
                댓글 {selectedComments.length > 0 && `(${selectedComments.length})`}
              </Button>
            </div>

            {/* ─── Comments Section ─── */}
            <div className="mt-6 pt-5 border-t border-border">
              <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <MessageCircle size={15} className="text-[var(--teal)]" />
                댓글
                {selectedComments.length > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: "var(--teal)" }}>
                    {selectedComments.length}
                  </span>
                )}
              </h4>

              {/* Comment List */}
              {selectedComments.length === 0 ? (
                <div className="py-6 text-center">
                  <MessageCircle size={28} className="mx-auto text-muted-foreground/25 mb-2" />
                  <p className="text-xs text-muted-foreground">첫 댓글을 남겨보세요</p>
                </div>
              ) : (
                <div className="space-y-3 mb-4">
                  {selectedComments.map((comment) => (
                    <div key={comment.id}>
                      {/* Comment Item */}
                      <div className="flex gap-2.5">
                        <Avatar className="w-7 h-7 shrink-0 mt-0.5">
                          <AvatarFallback className="text-[10px] font-bold text-white" style={{ background: "var(--teal)" }}>
                            {comment.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="bg-muted/50 rounded-xl px-3 py-2.5">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-foreground">{comment.author}</span>
                              <span className="text-[10px] text-muted-foreground/70 px-1.5 py-0.5 bg-background rounded-full">{comment.dept}</span>
                            </div>
                            <p className="text-xs text-foreground leading-relaxed">{comment.content}</p>
                          </div>
                          <div className="flex items-center gap-3 mt-1 ml-1">
                            <span className="text-[10px] text-muted-foreground">{comment.date}</span>
                            <button
                              className={cn(
                                "flex items-center gap-1 text-[10px] transition-colors",
                                likedComments.has(comment.id) ? "text-[var(--coral)] font-semibold" : "text-muted-foreground hover:text-[var(--coral)]"
                              )}
                              onClick={() => handleLike(comment.id)}
                            >
                              <ThumbsUp size={11} />
                              {comment.likes > 0 && comment.likes}
                            </button>
                            <button
                              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-[var(--teal)] transition-colors"
                              onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                            >
                              <Reply size={11} />
                              답글
                            </button>
                            {comment.author === "김인사" && (
                              <button
                                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                                onClick={() => handleDeleteComment(comment.id)}
                              >
                                <Trash2 size={11} />
                                삭제
                              </button>
                            )}
                          </div>

                          {/* Reply Input */}
                          {replyTo === comment.id && (
                            <div className="mt-2 flex gap-2">
                              <div className="flex-1 flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
                                <input
                                  type="text"
                                  placeholder="답글을 입력하세요..."
                                  value={replyInput}
                                  onChange={(e) => setReplyInput(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleAddReply(comment.id); }}
                                  autoFocus
                                  className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
                                />
                                <button
                                  onClick={() => handleAddReply(comment.id)}
                                  disabled={!replyInput.trim()}
                                  className="text-[var(--teal)] disabled:opacity-30 transition-opacity"
                                >
                                  <Send size={13} />
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Replies */}
                          {(comment.replies ?? []).length > 0 && (
                            <div className="mt-2 ml-3 space-y-2 border-l-2 border-[var(--teal-light)] pl-3">
                              {(comment.replies ?? []).map((reply) => (
                                <div key={reply.id} className="flex gap-2">
                                  <Avatar className="w-6 h-6 shrink-0 mt-0.5">
                                    <AvatarFallback className="text-[9px] font-bold text-white" style={{ background: "var(--teal-dark)" }}>
                                      {reply.avatar}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <div className="bg-muted/40 rounded-lg px-2.5 py-2">
                                      <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className="text-[11px] font-semibold text-foreground">{reply.author}</span>
                                        <span className="text-[9px] text-muted-foreground/70 px-1 py-0.5 bg-background rounded-full">{reply.dept}</span>
                                      </div>
                                      <p className="text-[11px] text-foreground">{reply.content}</p>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground ml-1">{reply.date}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Comment Input */}
              <div className="flex gap-2.5 mt-3">
                <Avatar className="w-7 h-7 shrink-0 mt-1">
                  <AvatarFallback className="text-[10px] font-bold text-white" style={{ background: "var(--teal)" }}>
                    김HR
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className={cn(
                    "flex items-end gap-2 rounded-xl border transition-all px-3 py-2",
                    commentInput ? "border-[var(--teal)] ring-2 ring-[var(--teal)]/20" : "border-border bg-muted/30"
                  )}>
                    <textarea
                      ref={commentInputRef}
                      placeholder="질문이나 의견을 남겨보세요... (Enter로 등록)"
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                          e.preventDefault();
                          handleAddComment();
                        }
                      }}
                      rows={commentInput.split("\n").length > 1 ? 3 : 1}
                      className="flex-1 bg-transparent text-xs outline-none resize-none placeholder:text-muted-foreground/60 leading-relaxed"
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!commentInput.trim()}
                      className={cn(
                        "shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all mb-0.5",
                        commentInput.trim()
                          ? "bg-[var(--teal)] text-white hover:opacity-90"
                          : "bg-muted text-muted-foreground/40"
                      )}
                    >
                      <Send size={13} />
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 mt-1 ml-1">Enter로 등록 · Shift+Enter로 줄바꿈</p>
                </div>
              </div>
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
            {/* 제목 */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">
                제목 <span className="text-[var(--coral)]">*</span>
              </label>
              <input
                type="text"
                placeholder="공지사항 제목을 입력하세요"
                value={form.title}
                onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); setFormError((f) => ({ ...f, title: false })); }}
                className={cn(
                  "w-full px-3 py-2.5 text-sm rounded-xl border outline-none transition-all",
                  "focus:ring-2 focus:ring-[var(--teal)]/30 focus:border-[var(--teal)]",
                  formError.title ? "border-[var(--coral)] bg-[var(--coral-light)]" : "border-border bg-background"
                )}
              />
              {formError.title && <p className="text-[11px] text-[var(--coral)] mt-1">제목을 입력해주세요.</p>}
            </div>

            {/* 내용 */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">
                내용 <span className="text-[var(--coral)]">*</span>
              </label>
              <textarea
                placeholder="공지사항 내용을 입력하세요"
                value={form.content}
                onChange={(e) => { setForm((f) => ({ ...f, content: e.target.value })); setFormError((f) => ({ ...f, content: false })); }}
                rows={5}
                className={cn(
                  "w-full px-3 py-2.5 text-sm rounded-xl border outline-none transition-all resize-none",
                  "focus:ring-2 focus:ring-[var(--teal)]/30 focus:border-[var(--teal)]",
                  formError.content ? "border-[var(--coral)] bg-[var(--coral-light)]" : "border-border bg-background"
                )}
              />
              {formError.content && <p className="text-[11px] text-[var(--coral)] mt-1">내용을 입력해주세요.</p>}
            </div>

            {/* 옵션 */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  className={cn(
                    "w-4 h-4 rounded border-2 flex items-center justify-center transition-all",
                    form.mustRead ? "bg-[var(--coral)] border-[var(--coral)]" : "border-border"
                  )}
                  onClick={() => setForm((f) => ({ ...f, mustRead: !f.mustRead }))}
                >
                  {form.mustRead && <Check size={10} className="text-white" strokeWidth={3} />}
                </div>
                <span className="text-xs font-medium text-foreground">필독 설정</span>
                <span className="text-[10px] text-muted-foreground">(전체 직원 알림 발송)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  className={cn(
                    "w-4 h-4 rounded border-2 flex items-center justify-center transition-all",
                    form.pinned ? "bg-[var(--teal)] border-[var(--teal)]" : "border-border"
                  )}
                  onClick={() => setForm((f) => ({ ...f, pinned: !f.pinned }))}
                >
                  {form.pinned && <Check size={10} className="text-white" strokeWidth={3} />}
                </div>
                <span className="text-xs font-medium text-foreground">상단 고정</span>
              </label>
            </div>

            {/* 버튼 */}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 rounded-xl text-sm" onClick={handleClose}>
                취소
              </Button>
              <Button
                className="flex-1 rounded-xl text-sm text-white"
                style={{ background: "var(--teal)" }}
                onClick={handleSubmit}
              >
                등록하기
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Board Panel ──────────────────────────────────────────────────────────────

function BoardPanel() {
  const [posts, setPosts] = useState<BoardPost[]>(INITIAL_BOARD_POSTS);
  const [activeCategory, setActiveCategory] = useState("전체");
  const [writeOpen, setWriteOpen] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", category: "개발" });
  const [formError, setFormError] = useState({ title: false, content: false });

  const filtered = activeCategory === "전체" ? posts : posts.filter((p) => p.category === activeCategory);

  const categoryColors: Record<string, string> = {
    개발: "bg-blue-50 text-blue-600",
    마케팅: "bg-purple-50 text-purple-600",
    디자인: "bg-pink-50 text-pink-600",
    영업: "bg-orange-50 text-orange-600",
    인사: "bg-[var(--teal-light)] text-[var(--teal-dark)]",
  };

  const handleSubmit = () => {
    const errors = { title: !form.title.trim(), content: !form.content.trim() };
    setFormError(errors);
    if (errors.title || errors.content) return;

    const today = new Date();
    const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;

    const newPost: BoardPost = {
      id: Date.now(),
      category: form.category,
      title: form.title.trim(),
      content: form.content.trim(),
      author: "김인사",
      dept: "인사팀",
      date: dateStr,
      comments: 0,
      views: 0,
      hasFile: false,
      hasImage: false,
      pinned: false,
    };

    setPosts((prev) => [newPost, ...prev]);
    setWriteOpen(false);
    setForm({ title: "", content: "", category: "개발" });
    setFormError({ title: false, content: false });
    toast.success("게시글이 등록되었습니다");
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
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                  activeCategory === cat ? "bg-[var(--teal)] text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            className="gap-1.5 rounded-xl text-xs shrink-0 ml-3 text-white"
            style={{ background: "var(--teal)" }}
            onClick={() => setWriteOpen(true)}
          >
            <Plus size={13} />
            작성
          </Button>
        </div>

        <div className="divide-y divide-border">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <FileText size={32} className="mx-auto mb-2 opacity-30" />
              게시글이 없습니다.
            </div>
          ) : (
            filtered.map((post) => (
              <div
                key={post.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => toast.info(post.title, { description: post.content ?? "게시글 상세 보기" })}
              >
                {post.pinned && <Pin size={13} className="text-[var(--coral)] shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", categoryColors[post.category] || "bg-muted text-muted-foreground")}>
                      {post.category}
                    </span>
                    <span className="text-sm font-medium text-foreground truncate">{post.title}</span>
                    {post.hasFile && <Paperclip size={12} className="text-muted-foreground shrink-0" />}
                    {post.hasImage && <ImageIcon size={12} className="text-muted-foreground shrink-0" />}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {post.author} · {post.dept} · {post.date}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                  <span className="flex items-center gap-1"><MessageCircle size={12} /> {post.comments}</span>
                  <span className="flex items-center gap-1"><Eye size={12} /> {post.views}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Write Modal */}
      <Dialog open={writeOpen} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">새 게시글 작성</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-1">
            {/* 카테고리 */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">카테고리</label>
              <div className="flex flex-wrap gap-2">
                {boardCategories.filter((c) => c !== "전체").map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setForm((f) => ({ ...f, category: cat }))}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                      form.category === cat
                        ? "bg-[var(--teal)] text-white border-[var(--teal)]"
                        : "bg-muted text-muted-foreground border-transparent hover:border-border"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* 제목 */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">
                제목 <span className="text-[var(--coral)]">*</span>
              </label>
              <input
                type="text"
                placeholder="게시글 제목을 입력하세요"
                value={form.title}
                onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); setFormError((f) => ({ ...f, title: false })); }}
                className={cn(
                  "w-full px-3 py-2.5 text-sm rounded-xl border outline-none transition-all",
                  "focus:ring-2 focus:ring-[var(--teal)]/30 focus:border-[var(--teal)]",
                  formError.title ? "border-[var(--coral)] bg-[var(--coral-light)]" : "border-border bg-background"
                )}
              />
              {formError.title && <p className="text-[11px] text-[var(--coral)] mt-1">제목을 입력해주세요.</p>}
            </div>

            {/* 내용 */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">
                내용 <span className="text-[var(--coral)]">*</span>
              </label>
              <textarea
                placeholder="게시글 내용을 입력하세요"
                value={form.content}
                onChange={(e) => { setForm((f) => ({ ...f, content: e.target.value })); setFormError((f) => ({ ...f, content: false })); }}
                rows={5}
                className={cn(
                  "w-full px-3 py-2.5 text-sm rounded-xl border outline-none transition-all resize-none",
                  "focus:ring-2 focus:ring-[var(--teal)]/30 focus:border-[var(--teal)]",
                  formError.content ? "border-[var(--coral)] bg-[var(--coral-light)]" : "border-border bg-background"
                )}
              />
              {formError.content && <p className="text-[11px] text-[var(--coral)] mt-1">내용을 입력해주세요.</p>}
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 rounded-xl text-sm" onClick={handleClose}>취소</Button>
              <Button className="flex-1 rounded-xl text-sm text-white" style={{ background: "var(--teal)" }} onClick={handleSubmit}>
                등록하기
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
  const [activeChat, setActiveChat] = useState<string | null>("이준혁");
  const [chatMessages, setChatMessages] = useState<Record<string, Message[]>>(INITIAL_CHAT_MESSAGES);
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set(["개발팀", "마케팅"]));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const messages = activeChat ? (chatMessages[activeChat] ?? []) : [];

  // 메시지 추가 시 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 채팅 상대 변경 시 입력창 포커스
  useEffect(() => {
    if (activeChat) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeChat]);

  const toggleDept = (dept: string) => {
    setExpandedDepts((prev) => {
      const next = new Set<string>(prev);
      if (next.has(dept)) next.delete(dept);
      else next.add(dept);
      return next;
    });
  };

  const handleSend = () => {
    if (!input.trim() || !activeChat) return;
    const newMsg: Message = {
      id: Date.now(),
      sender: "나",
      content: input.trim(),
      time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
      isMine: true,
    };
    setChatMessages((prev) => ({
      ...prev,
      [activeChat]: [...(prev[activeChat] ?? []), newMsg],
    }));
    setInput("");

    // 상대방 자동 응답 (시뮬레이션)
    const member = allMembers.find((m) => m.name === activeChat);
    if (member?.online) {
      setTimeout(() => {
        const replies = [
          "네, 확인했습니다!",
          "알겠습니다 😊",
          "감사합니다!",
          "잠시 후에 답변 드릴게요.",
          "좋습니다, 진행해볼게요!",
        ];
        const reply: Message = {
          id: Date.now() + 1,
          sender: activeChat,
          content: replies[Math.floor(Math.random() * replies.length)],
          time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
          isMine: false,
        };
        setChatMessages((prev) => ({
          ...prev,
          [activeChat]: [...(prev[activeChat] ?? []), reply],
        }));
      }, 1200 + Math.random() * 800);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const allMembers = orgContacts.flatMap((d) => d.members);
  const filteredMembers = searchQuery
    ? allMembers.filter(
        (m) =>
          m.name.includes(searchQuery) ||
          orgContacts.find((d) => d.members.includes(m))?.dept.includes(searchQuery)
      )
    : null;

  const activeMember = allMembers.find((m) => m.name === activeChat);

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
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors",
                    activeChat === member.name ? "bg-[var(--teal-light)]" : "hover:bg-muted"
                  )}
                  onClick={() => setActiveChat(member.name)}
                >
                  <div className="relative">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-[10px] font-bold text-white" style={{ background: "var(--teal)" }}>
                        {member.avatar}
                      </AvatarFallback>
                    </Avatar>
                    {member.online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-foreground">{member.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{member.role}</div>
                  </div>
                  {/* 미읽음 뱃지 */}
                  {(chatMessages[member.name]?.filter((m) => !m.isMine).length ?? 0) > 0 && activeChat !== member.name && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0" style={{ background: "var(--coral)" }}>
                      {chatMessages[member.name]?.filter((m) => !m.isMine).length}
                    </span>
                  )}
                </button>
              ))
            ) : (
              orgContacts.map((dept) => (
                <div key={dept.dept} className="mb-1">
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                    onClick={() => toggleDept(dept.dept)}
                  >
                    <ChevronDown
                      size={13}
                      className={cn("text-muted-foreground transition-transform", !expandedDepts.has(dept.dept) && "-rotate-90")}
                    />
                    <span className="text-xs font-semibold text-muted-foreground">{dept.dept}</span>
                    <span className="text-[10px] text-muted-foreground/60 ml-auto">{dept.members.length}</span>
                  </button>
                  {expandedDepts.has(dept.dept) && (
                    <div className="ml-2">
                      {dept.members.map((member) => (
                        <button
                          key={member.name}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors",
                            activeChat === member.name ? "bg-[var(--teal-light)]" : "hover:bg-muted"
                          )}
                          onClick={() => setActiveChat(member.name)}
                        >
                          <div className="relative">
                            <Avatar className="w-7 h-7">
                              <AvatarFallback className="text-[10px] font-bold text-white" style={{ background: "var(--teal)" }}>
                                {member.avatar}
                              </AvatarFallback>
                            </Avatar>
                            {member.online && (
                              <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 rounded-full border-2 border-white" />
                            )}
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
          <Button
            size="sm"
            variant="outline"
            className="w-full rounded-xl text-xs gap-1.5"
            onClick={() => toast.info("그룹 채팅 생성 기능은 준비 중입니다")}
          >
            <Users size={13} />
            그룹 채팅 만들기
          </Button>
        </div>
      </div>

      {/* Chat Window */}
      <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-border overflow-hidden flex flex-col">
        {activeChat ? (
          <>
            {/* Chat Header */}
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

            {/* Messages */}
            <ScrollArea className="flex-1 px-5 py-4">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <MessageCircle size={32} className="text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">첫 메시지를 보내보세요!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={cn("flex gap-3", msg.isMine && "flex-row-reverse")}>
                      {!msg.isMine && (
                        <Avatar className="w-7 h-7 shrink-0 mt-1">
                          <AvatarFallback className="text-[10px] font-bold text-white" style={{ background: "var(--teal)" }}>
                            {msg.sender.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className={cn("flex flex-col gap-1", msg.isMine && "items-end")}>
                        {!msg.isMine && (
                          <span className="text-[11px] text-muted-foreground ml-1">{msg.sender}</span>
                        )}
                        <div className={msg.isMine ? "chat-bubble-sent" : "chat-bubble-recv"}>
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-muted-foreground px-1">{msg.time}</span>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="px-4 py-3 border-t border-border">
              <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 rounded-lg shrink-0"
                  onClick={() => toast.info("파일 첨부 기능은 준비 중입니다")}
                >
                  <Paperclip size={15} className="text-muted-foreground" />
                </Button>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={activeMember?.online ? "메시지를 입력하세요... (Enter로 전송)" : "상대방이 오프라인 상태입니다"}
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
                  disabled={!input.trim()}
                  onClick={handleSend}
                >
                  <Send size={14} />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground/60 mt-1.5 ml-1">Enter로 전송 · Shift+Enter로 줄바꿈</p>
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
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">소통 · 협업</h1>
        <p className="text-sm text-muted-foreground mt-0.5">공지사항 · 업무 게시판 · 조직도 메신저</p>
      </div>

      <Tabs defaultValue="notice" className="space-y-5">
        <TabsList className="bg-muted rounded-xl p-1">
          <TabsTrigger value="notice" className="rounded-lg text-sm gap-2">
            <Bell size={14} />
            공지사항
          </TabsTrigger>
          <TabsTrigger value="board" className="rounded-lg text-sm gap-2">
            <Hash size={14} />
            업무 게시판
          </TabsTrigger>
          <TabsTrigger value="messenger" className="rounded-lg text-sm gap-2">
            <MessageCircle size={14} />
            메신저
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
              style={{ background: "var(--coral)" }}
            >
              3
            </span>
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
