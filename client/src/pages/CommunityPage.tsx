/**
 * CommunityPage — TeamPulse Community & Messenger
 * Design: Soft Teal Clarity
 * Features:
 * - 공지사항 (필독 설정, 미열람자 확인)
 * - 업무 게시판 (프로젝트별 카테고리)
 * - 조직도 메신저 (1:1 및 그룹 채팅)
 */

import { useState } from "react";
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
  ChevronRight,
  FileText,
  Star,
  MoreHorizontal,
  Plus,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Mock Data ───────────────────────────────────────────────────────────────

const notices = [
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

const boardCategories = ["전체", "개발", "마케팅", "디자인", "영업", "인사"];

const boardPosts = [
  {
    id: 1,
    category: "개발",
    title: "React 19 마이그레이션 가이드 공유",
    author: "이준혁",
    dept: "개발팀",
    date: "2025.05.15",
    comments: 8,
    views: 124,
    hasFile: true,
    hasImage: false,
    pinned: false,
  },
  {
    id: 2,
    category: "마케팅",
    title: "Q2 브랜드 캠페인 결과 보고서",
    author: "박소연",
    dept: "마케팅",
    date: "2025.05.14",
    comments: 5,
    views: 89,
    hasFile: true,
    hasImage: true,
    pinned: true,
  },
  {
    id: 3,
    category: "디자인",
    title: "2025 UI 가이드라인 v2.0 배포",
    author: "정하은",
    dept: "디자인",
    date: "2025.05.13",
    comments: 12,
    views: 203,
    hasFile: true,
    hasImage: true,
    pinned: false,
  },
  {
    id: 4,
    category: "인사",
    title: "신입사원 온보딩 프로그램 개선안",
    author: "김인사",
    dept: "인사팀",
    date: "2025.05.12",
    comments: 3,
    views: 67,
    hasFile: false,
    hasImage: false,
    pinned: false,
  },
  {
    id: 5,
    category: "영업",
    title: "5월 영업 목표 달성 현황 공유",
    author: "홍길동",
    dept: "영업팀",
    date: "2025.05.11",
    comments: 7,
    views: 156,
    hasFile: true,
    hasImage: false,
    pinned: false,
  },
];

// Org chart / contact data
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

interface Message {
  id: number;
  sender: string;
  content: string;
  time: string;
  isMine: boolean;
}

const initialMessages: Message[] = [
  { id: 1, sender: "이준혁", content: "안녕하세요! React 19 마이그레이션 관련해서 공유드린 문서 확인해보셨나요?", time: "오전 10:12", isMine: false },
  { id: 2, sender: "나", content: "네, 방금 확인했습니다. 내용이 정말 잘 정리되어 있네요!", time: "오전 10:15", isMine: true },
  { id: 3, sender: "이준혁", content: "감사합니다 😊 혹시 질문 있으시면 언제든지 말씀해주세요.", time: "오전 10:16", isMine: false },
  { id: 4, sender: "나", content: "네, 한 가지 궁금한 게 있는데요. Server Components 관련 부분을 좀 더 자세히 설명해주실 수 있을까요?", time: "오전 10:20", isMine: true },
  { id: 5, sender: "이준혁", content: "물론이죠! 오후에 잠깐 미팅 가능하신가요?", time: "오전 10:22", isMine: false },
];

// ─── Notice Panel ─────────────────────────────────────────────────────────────

function NoticePanel() {
  const [selected, setSelected] = useState<typeof notices[0] | null>(null);
  const [readStatus, setReadStatus] = useState<Set<number>>(new Set([3, 4]));

  const handleRead = (notice: typeof notices[0]) => {
    setSelected(notice);
    setReadStatus((prev) => { const next = new Set(prev); next.add(notice.id); return next; });
  };

  const handleUnreadCheck = (notice: typeof notices[0]) => {
    toast.info(`미열람자 ${notice.unread}명`, {
      description: `전체 ${notice.total}명 중 ${notice.views}명 열람 완료`,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground">공지사항</h3>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 rounded-xl text-xs"
            onClick={() => toast.info("새 공지사항 작성")}
          >
            <Plus size={13} />
            작성
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
                      <span
                        className={cn(
                          "text-sm font-medium truncate",
                          isRead ? "text-muted-foreground" : "text-foreground"
                        )}
                      >
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
                            onClick={(e) => { e.stopPropagation(); handleUnreadCheck(notice); }}
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
            <p className="text-sm text-foreground leading-relaxed">{selected.content}</p>

            {selected.unread > 0 && (
              <div className="mt-5 p-3 bg-amber-50 rounded-xl flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-500 shrink-0" />
                <div className="text-xs text-amber-700">
                  <strong>{selected.unread}명</strong>이 아직 이 공지를 읽지 않았습니다.
                  <button
                    className="ml-2 underline"
                    onClick={() => handleUnreadCheck(selected)}
                  >
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
              <Button size="sm" variant="outline" className="rounded-xl text-xs">
                댓글 달기
              </Button>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-10 text-center">
            <Bell size={36} className="text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">공지사항을 선택하면 내용이 표시됩니다</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Board Panel ──────────────────────────────────────────────────────────────

function BoardPanel() {
  const [activeCategory, setActiveCategory] = useState("전체");

  const filtered = activeCategory === "전체"
    ? boardPosts
    : boardPosts.filter((p) => p.category === activeCategory);

  const categoryColors: Record<string, string> = {
    개발: "bg-blue-50 text-blue-600",
    마케팅: "bg-purple-50 text-purple-600",
    디자인: "bg-pink-50 text-pink-600",
    영업: "bg-orange-50 text-orange-600",
    인사: "bg-[var(--teal-light)] text-[var(--teal-dark)]",
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          {boardCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                activeCategory === cat
                  ? "bg-[var(--teal)] text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 rounded-xl text-xs shrink-0 ml-3"
          onClick={() => toast.info("새 게시글 작성")}
        >
          <Plus size={13} />
          작성
        </Button>
      </div>

      <div className="divide-y divide-border">
        {filtered.map((post) => (
          <div
            key={post.id}
            className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
            onClick={() => toast.info(post.title)}
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
        ))}
      </div>
    </div>
  );
}

// ─── Messenger Panel ──────────────────────────────────────────────────────────

function MessengerPanel() {
  const [activeChat, setActiveChat] = useState<string | null>("이준혁");
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set(["개발팀", "마케팅"]));

  const toggleDept = (dept: string) => {
    setExpandedDepts((prev) => {
      const next = new Set<string>(prev);
      if (next.has(dept)) next.delete(dept);
      else next.add(dept);
      return next;
    });
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const newMsg: Message = {
      id: messages.length + 1,
      sender: "나",
      content: input,
      time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
      isMine: true,
    };
    setMessages([...messages, newMsg]);
    setInput("");
  };

  const allMembers = orgContacts.flatMap((d) => d.members);
  const filtered = searchQuery
    ? allMembers.filter(
        (m) =>
          m.name.includes(searchQuery) ||
          orgContacts.find((d) => d.members.includes(m))?.dept.includes(searchQuery)
      )
    : null;

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
            {filtered ? (
              filtered.map((member) => (
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
                      className={cn(
                        "text-muted-foreground transition-transform",
                        !expandedDepts.has(dept.dept) && "-rotate-90"
                      )}
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
            onClick={() => toast.info("그룹 채팅 생성")}
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
                  {allMembers.find((m) => m.name === activeChat)?.avatar ?? activeChat.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold text-sm text-foreground">{activeChat}</div>
                <div className="text-xs text-emerald-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  온라인
                </div>
              </div>
              <Button variant="ghost" size="icon" className="ml-auto rounded-xl">
                <MoreHorizontal size={16} />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-5 py-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn("flex gap-3", msg.isMine && "flex-row-reverse")}
                  >
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
                ))}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="px-4 py-3 border-t border-border">
              <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 rounded-lg shrink-0"
                  onClick={() => toast.info("파일 첨부")}
                >
                  <Paperclip size={15} className="text-muted-foreground" />
                </Button>
                <input
                  type="text"
                  placeholder="메시지를 입력하세요..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                />
                <Button
                  size="icon"
                  className="w-8 h-8 rounded-xl shrink-0 text-white"
                  style={{ background: input.trim() ? "var(--teal)" : undefined }}
                  disabled={!input.trim()}
                  onClick={handleSend}
                >
                  <Send size={14} />
                </Button>
              </div>
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
