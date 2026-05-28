/**
 * AttendancePage — TeamPulse Attendance & Leave Management
 * Design: Soft Teal Clarity
 * Features:
 * - 역할 기반 뷰: 직원(본인 데이터만) / 관리자(전체 데이터)
 * [직원 뷰]
 *   - 본인 연차 현황 (잔여/사용/총 연차)
 *   - 연차 신청 폼 (다이얼로그)
 *   - 경조사 지원 탭
 *   - 이번 달 근태 캘린더
 * [관리자 뷰]
 *   - 연차 신청 승인/거절 큐
 *   - 전체 직원 연차 현황 테이블
 *   - 부서별 근태 요약 카드
 *   - 연차 일괄 부여 기능
 */

import { useState, useCallback, useRef } from "react";
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Upload,
  ChevronLeft,
  ChevronRight,
  Plus,
  Heart,
  Coffee,
  Briefcase,
  Users,
  User,
  ShieldCheck,
  Check,
  X,
  TrendingUp,
  BarChart3,
  Gift,
  Search,
  Filter,
  Bell,
  BellRing,
  Send,
  Settings2,
  ChevronDown,
  ChevronUp,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { setBadgeCount, globalBadgeCount } from "@/hooks/useLeaveNotification";

// ─── Notification Context (shared between AdminView & Header Bell) ─────────────

interface NotificationLog {
  id: number;
  empName: string;
  empDept: string;
  empColor: string;
  remaining: number;
  threshold: number;
  sentAt: string;
  channel: string;
  read: boolean;
}

// Global notification log state (lifted to module level for cross-component sharing)
let _notificationLogs: NotificationLog[] = [
  { id: 1, empName: "홍길동", empDept: "영업팀", empColor: "oklch(0.65 0.18 60)", remaining: 0, threshold: 3, sentAt: "2025.05.10 09:15", channel: "이메일+앱", read: true },
  { id: 2, empName: "이준혁", empDept: "개발팀", empColor: "oklch(0.65 0.14 185)", remaining: 6, threshold: 7, sentAt: "2025.05.12 14:30", channel: "앱 알림", read: false },
];
let _notificationListeners: Array<() => void> = [];

function subscribeNotifications(fn: () => void) {
  _notificationListeners.push(fn);
  return () => { _notificationListeners = _notificationListeners.filter((f) => f !== fn); };
}
function getNotificationLogs() { return _notificationLogs; }
function addNotificationLog(log: NotificationLog) {
  _notificationLogs = [log, ..._notificationLogs];
  _notificationListeners.forEach((fn) => fn());
}
function markNotificationRead(id: number) {
  _notificationLogs = _notificationLogs.map((n) => n.id === id ? { ...n, read: true } : n);
  _notificationListeners.forEach((fn) => fn());
}
function markAllRead() {
  _notificationLogs = _notificationLogs.map((n) => ({ ...n, read: true }));
  _notificationListeners.forEach((fn) => fn());
}

// ─── Types ────────────────────────────────────────────────────────────────────

type LeaveStatus = "승인" | "대기" | "거절";

interface LeaveRequest {
  id: number;
  empName: string;
  empDept: string;
  empAvatar: string;
  empColor: string;
  type: string;
  start: string;
  end: string;
  days: number;
  status: LeaveStatus;
  reason: string;
  appliedAt: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

// 직원별 연차 데이터 (이름 기반 매핑)
const employeeLeaveData: Record<string, {
  total: number; used: number; pending: number; remaining: number;
  history: LeaveRequest[];
  calendarData: Record<number, { type: string; label: string }>;
}> = {
  "김직원": {
    total: 15, used: 4, pending: 1, remaining: 10,
    history: [
      { id: 1, empName: "김직원", empDept: "개발팀", empAvatar: "김직", empColor: "var(--teal)", type: "연차", start: "2025.03.10", end: "2025.03.11", days: 2, status: "승인", reason: "개인 사유", appliedAt: "2025.03.07" },
      { id: 2, empName: "김직원", empDept: "개발팀", empAvatar: "김직", empColor: "var(--teal)", type: "반차", start: "2025.04.05", end: "2025.04.05", days: 0.5, status: "승인", reason: "병원 방문", appliedAt: "2025.04.03" },
      { id: 3, empName: "김직원", empDept: "개발팀", empAvatar: "김직", empColor: "var(--teal)", type: "연차", start: "2025.04.28", end: "2025.04.28", days: 1, status: "승인", reason: "개인 사유", appliedAt: "2025.04.25" },
      { id: 4, empName: "김직원", empDept: "개발팀", empAvatar: "김직", empColor: "var(--teal)", type: "반차", start: "2025.05.19", end: "2025.05.19", days: 0.5, status: "승인", reason: "가족 행사", appliedAt: "2025.05.15" },
      { id: 5, empName: "김직원", empDept: "개발팀", empAvatar: "김직", empColor: "var(--teal)", type: "연차", start: "2025.05.26", end: "2025.05.26", days: 1, status: "대기", reason: "개인 사유", appliedAt: "2025.05.18" },
    ],
    calendarData: {
      19: { type: "leave", label: "반차" },
      26: { type: "pending", label: "연차(대기)" },
    },
  },
  "이준혁": {
    total: 15, used: 6, pending: 3, remaining: 6,
    history: [
      { id: 1, empName: "이준혁", empDept: "개발팀", empAvatar: "이준", empColor: "oklch(0.65 0.14 185)", type: "연차", start: "2025.04.14", end: "2025.04.15", days: 2, status: "승인", reason: "개인 사유", appliedAt: "2025.04.10" },
      { id: 2, empName: "이준혁", empDept: "개발팀", empAvatar: "이준", empColor: "oklch(0.65 0.14 185)", type: "반차", start: "2025.04.22", end: "2025.04.22", days: 0.5, status: "승인", reason: "병원 방문", appliedAt: "2025.04.20" },
      { id: 3, empName: "이준혁", empDept: "개발팀", empAvatar: "이준", empColor: "oklch(0.65 0.14 185)", type: "연차", start: "2025.05.02", end: "2025.05.02", days: 1, status: "승인", reason: "개인 사유", appliedAt: "2025.04.29" },
      { id: 4, empName: "이준혁", empDept: "개발팀", empAvatar: "이준", empColor: "oklch(0.65 0.14 185)", type: "연차", start: "2025.05.19", end: "2025.05.21", days: 3, status: "대기", reason: "가족 여행", appliedAt: "2025.05.10" },
    ],
    calendarData: {
      2: { type: "leave", label: "연차" },
      19: { type: "pending", label: "연차(대기)" },
      20: { type: "pending", label: "연차(대기)" },
      21: { type: "pending", label: "연차(대기)" },
    },
  },
};

// 기본 데이터 (이름 매핑이 없는 경우 fallback)
const defaultLeaveData = {
  total: 15, used: 0, pending: 0, remaining: 15,
  history: [] as LeaveRequest[],
  calendarData: {} as Record<number, { type: string; label: string }>,
};

const allLeaveRequests: LeaveRequest[] = [
  { id: 101, empName: "이준혁", empDept: "개발팀", empAvatar: "이준", empColor: "oklch(0.65 0.14 185)", type: "연차", start: "2025.05.19", end: "2025.05.21", days: 3, status: "대기", reason: "가족 여행", appliedAt: "2025.05.10" },
  { id: 102, empName: "박소연", empDept: "마케팅", empAvatar: "박소", empColor: "oklch(0.65 0.20 300)", type: "반차", start: "2025.05.16", end: "2025.05.16", days: 0.5, status: "대기", reason: "병원 방문", appliedAt: "2025.05.14" },
  { id: 103, empName: "정하은", empDept: "디자인", empAvatar: "정하", empColor: "oklch(0.65 0.18 340)", type: "연차", start: "2025.05.22", end: "2025.05.23", days: 2, status: "대기", reason: "개인 사유", appliedAt: "2025.05.13" },
  { id: 104, empName: "홍길동", empDept: "영업팀", empAvatar: "홍길", empColor: "oklch(0.65 0.18 60)", type: "연차", start: "2025.05.26", end: "2025.05.30", days: 5, status: "대기", reason: "해외 출장 후 휴가", appliedAt: "2025.05.12" },
  { id: 105, empName: "이수진", empDept: "마케팅", empAvatar: "이수", empColor: "oklch(0.60 0.15 160)", type: "반차", start: "2025.05.15", end: "2025.05.15", days: 0.5, status: "승인", reason: "개인 사유", appliedAt: "2025.05.14" },
  { id: 106, empName: "최지원", empDept: "디자인", empAvatar: "최지", empColor: "oklch(0.65 0.20 25)", type: "연차", start: "2025.05.28", end: "2025.05.29", days: 2, status: "승인", reason: "개인 사유", appliedAt: "2025.05.11" },
  { id: 107, empName: "윤재원", empDept: "재무팀", empAvatar: "윤재", empColor: "oklch(0.60 0.12 80)", type: "연차", start: "2025.05.20", end: "2025.05.20", days: 1, status: "거절", reason: "개인 사유", appliedAt: "2025.05.09" },
  { id: 108, empName: "강다은", empDept: "인사팀", empAvatar: "강다", empColor: "oklch(0.65 0.14 185)", type: "반차", start: "2025.05.21", end: "2025.05.21", days: 0.5, status: "대기", reason: "병원 방문", appliedAt: "2025.05.15" },
  { id: 109, empName: "김직원", empDept: "개발팀", empAvatar: "김직", empColor: "var(--teal)", type: "연차", start: "2025.05.26", end: "2025.05.26", days: 1, status: "대기", reason: "개인 사유", appliedAt: "2025.05.18" },
];

const deptAttendanceSummary = [
  { dept: "개발팀", total: 12, present: 11, leave: 1, rate: 97 },
  { dept: "마케팅", total: 8, present: 7, leave: 1, rate: 95 },
  { dept: "디자인", total: 6, present: 6, leave: 0, rate: 99 },
  { dept: "영업팀", total: 10, present: 8, leave: 1, rate: 94 },
  { dept: "인사팀", total: 4, present: 4, leave: 0, rate: 100 },
  { dept: "재무팀", total: 5, present: 5, leave: 0, rate: 96 },
];

const allEmployeeLeave = [
  { name: "이준혁", dept: "개발팀", total: 15, used: 6, pending: 3, remaining: 6, color: "oklch(0.65 0.14 185)" },
  { name: "박소연", dept: "마케팅", total: 15, used: 8, pending: 0.5, remaining: 6.5, color: "oklch(0.65 0.20 300)" },
  { name: "정하은", dept: "디자인", total: 15, used: 4, pending: 2, remaining: 9, color: "oklch(0.65 0.18 340)" },
  { name: "김태호", dept: "개발팀", total: 15, used: 9, pending: 0, remaining: 6, color: "oklch(0.55 0.15 240)" },
  { name: "홍길동", dept: "영업팀", total: 15, used: 10, pending: 5, remaining: 0, color: "oklch(0.65 0.18 60)" },
  { name: "최지원", dept: "디자인", total: 15, used: 5, pending: 2, remaining: 8, color: "oklch(0.65 0.20 25)" },
  { name: "이수진", dept: "마케팅", total: 15, used: 3, pending: 0.5, remaining: 11.5, color: "oklch(0.60 0.15 160)" },
  { name: "윤재원", dept: "재무팀", total: 15, used: 7, pending: 0, remaining: 8, color: "oklch(0.60 0.12 80)" },
  { name: "강다은", dept: "인사팀", total: 15, used: 0, pending: 0.5, remaining: 14.5, color: "oklch(0.65 0.14 185)" },
  { name: "김직원", dept: "개발팀", total: 15, used: 4, pending: 1, remaining: 10, color: "var(--teal)" },
];

const specialLeaveTypes = [
  { icon: Heart, label: "결혼", days: 5, color: "var(--coral)" },
  { icon: Heart, label: "배우자 출산", days: 10, color: "oklch(0.65 0.20 25)" },
  { icon: Coffee, label: "부모 사망", days: 5, color: "oklch(0.50 0.10 240)" },
  { icon: Briefcase, label: "본인 사망(조의)", days: 3, color: "oklch(0.55 0.01 220)" },
];

// ─── Notification Bell (Header) ──────────────────────────────────────────────

export function NotificationBell() {
  const [logs, setLogs] = useState<NotificationLog[]>(() => getNotificationLogs());
  const [open, setOpen] = useState(false);

  // Subscribe to changes
  useState(() => {
    const unsub = subscribeNotifications(() => setLogs([...getNotificationLogs()]));
    return unsub;
  });

  const unreadCount = logs.filter((n) => !n.read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted transition-colors">
          <Bell size={18} className="text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[var(--coral)] text-white text-[9px] font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 rounded-2xl shadow-lg border border-border" align="end">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellRing size={15} className="text-[var(--teal)]" />
            <span className="font-semibold text-sm text-foreground">연차 알림</span>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--coral-light)] text-[var(--coral)]">
                {unreadCount}건 미확인
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button className="text-[11px] text-[var(--teal)] font-medium hover:underline" onClick={() => { markAllRead(); setLogs([...getNotificationLogs()]); }}>
              모두 읽음
            </button>
          )}
        </div>
        <div className="max-h-72 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">발송된 알림이 없습니다</div>
          ) : logs.map((log) => (
            <div key={log.id}
              className={cn("flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 cursor-pointer hover:bg-muted/30 transition-colors", !log.read && "bg-[var(--teal-light)]/40")}
              onClick={() => { markNotificationRead(log.id); setLogs([...getNotificationLogs()]); }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
                style={{ background: log.empColor }}>
                {log.empName.slice(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-foreground">{log.empName}</span>
                  <span className="text-[10px] text-muted-foreground">{log.empDept}</span>
                  {!log.read && <span className="w-1.5 h-1.5 rounded-full bg-[var(--coral)] shrink-0" />}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  잔여 <span className="mono-num font-semibold text-[var(--coral)]">{log.remaining}일</span> · 임계값 {log.threshold}일 이하
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{log.sentAt} · {log.channel}</div>
              </div>
            </div>
          ))}
        </div>
        {logs.length > 0 && (
          <div className="p-3 border-t border-border">
            <button className="w-full text-xs text-center text-[var(--teal)] font-medium hover:underline"
              onClick={() => setOpen(false)}>
              관리자 뷰에서 설정 관리
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ─── Shared Helpers ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: LeaveStatus }) {
  const map: Record<LeaveStatus, string> = {
    승인: "bg-[var(--teal-light)] text-[var(--teal-dark)]",
    대기: "bg-amber-50 text-amber-600",
    거절: "bg-red-50 text-red-500",
  };
  return (
    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", map[status])}>
      {status}
    </span>
  );
}

function LeaveRing({ used, total }: { used: number; total: number }) {
  const pct = (used / total) * 100;
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r={r} fill="none" stroke="oklch(0.94 0.03 185)" strokeWidth="8" />
      <circle cx="48" cy="48" r={r} fill="none" stroke="oklch(0.65 0.14 185)" strokeWidth="8"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        transform="rotate(-90 48 48)"
        style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.23,1,0.32,1)" }}
      />
      <text x="48" y="44" textAnchor="middle" fontSize="14" fontWeight="700" fill="oklch(0.20 0.01 240)" fontFamily="JetBrains Mono">
        {total - used}
      </text>
      <text x="48" y="58" textAnchor="middle" fontSize="10" fill="oklch(0.55 0.01 220)">잔여</text>
    </svg>
  );
}

function FullCalendar({ calendarData }: { calendarData: Record<number, { type: string; label: string }> }) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-indexed
  const todayDate = now.getDate();
  const todayMonth = now.getMonth();
  const todayYear = now.getFullYear();

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dayLabels = ["월", "화", "수", "목", "금", "토", "일"];
  const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

  const goPrev = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const goNext = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };
  const goToday = () => { setViewYear(now.getFullYear()); setViewMonth(now.getMonth()); };

  return (
    <div>
      {/* 헤더: 연월 + 이동 버튼 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-foreground">{viewYear}년 {monthNames[viewMonth]}</span>
          {(viewYear !== todayYear || viewMonth !== todayMonth) && (
            <button onClick={goToday} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--teal-light)] text-[var(--teal-dark)] font-medium hover:bg-[var(--teal)]/20 transition-colors">
              오늘
            </button>
          )}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="w-7 h-7 rounded-lg" onClick={goPrev}><ChevronLeft size={14} /></Button>
          <Button variant="ghost" size="icon" className="w-7 h-7 rounded-lg" onClick={goNext}><ChevronRight size={14} /></Button>
        </div>
      </div>
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayLabels.map((d, i) => (
          <div key={d} className={cn("text-center text-[11px] font-semibold py-1", i >= 5 ? "text-rose-400" : "text-muted-foreground")}>{d}</div>
        ))}
      </div>
      {/* 날짜 셀 */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={`empty-${i}`} />;
          const info = calendarData[d];
          const isToday = d === todayDate && viewMonth === todayMonth && viewYear === todayYear;
          const isWeekend = (i % 7) >= 5;
          return (
            <div key={d} className={cn(
              "h-9 flex flex-col items-center justify-center rounded-lg text-xs font-medium transition-all hover:scale-105 cursor-default",
              isToday && "ring-2 ring-[var(--teal)] ring-offset-1 font-bold",
              info?.type === "leave" && "bg-[var(--teal)] text-white",
              info?.type === "pending" && "bg-amber-100 text-amber-700",
              !info && isWeekend && "text-rose-400/60",
              !info && !isWeekend && "text-foreground hover:bg-muted"
            )} title={info?.label}>
              {d}
              {info && <div className="w-1 h-1 rounded-full mt-0.5 bg-current opacity-70" />}
            </div>
          );
        })}
      </div>
      {/* 범례 */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[var(--teal)] inline-block" />연차 승인</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 inline-block" />승인 대기</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded ring-2 ring-[var(--teal)] inline-block" />오늘</span>
      </div>
    </div>
  );
}

const LEAVE_TYPES = [
  "개인 사유로 인한 휴가",
  "병가(질병 또는 부상)",
  "경조사 휴가(유급휴가)",
  "배심원 참여, 예비군 훈련 등 법적 사유로 인한 휴가(유급휴가)",
  "무급 휴가",
  "기타",
];

function LeaveRequestDialog({ remaining, onSuccess }: { remaining: number; onSuccess?: () => void }) {
  const [form, setForm] = useState({
    leave_type: "개인 사유로 인한 휴가",
    start_date: "",
    end_date: "",
    half_day: "" as "" | "오전" | "오후",
    manager_approved: false,
    note: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSubmit = async () => {
    if (!form.start_date || !form.end_date || !form.leave_type) {
      toast.error("필수 항목을 입력해주세요");
      return;
    }
    if (!form.manager_approved) {
      toast.error("부서장 사전 승인 확인이 필요합니다");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          start_date: form.start_date,
          end_date: form.end_date,
          half_day: form.half_day || null,
          leave_type: form.leave_type,
          manager_approved: form.manager_approved,
          note: form.note || null,
        }),
      });
      if (res.ok) {
        toast.success("연차 신청이 완료되었습니다", { description: "관리자 승인 후 잔여 연차에서 자동 차감됩니다." });
        setForm({ leave_type: "개인 사유로 인한 휴가", start_date: "", end_date: "", half_day: "", manager_approved: false, note: "" });
        setOpen(false);
        onSuccess?.();
      } else {
        const err = await res.json();
        toast.error("신청 실패", { description: err.error });
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 rounded-xl text-white text-sm" style={{ background: "var(--teal)" }}>
          <Plus size={16} />연차 신청
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader><DialogTitle className="text-lg font-bold">연차 신청</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">휴가 유형 <span className="text-red-500">*</span></label>
            <select value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-border rounded-xl outline-none focus:ring-2 focus:ring-[var(--teal)]/30 bg-white">
              {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">시작일 <span className="text-red-500">*</span></label>
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded-xl outline-none focus:ring-2 focus:ring-[var(--teal)]/30" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">종료일 <span className="text-red-500">*</span></label>
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded-xl outline-none focus:ring-2 focus:ring-[var(--teal)]/30" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">반차 선택 (해당 시만)</label>
            <div className="flex gap-2">
              {(["", "오전", "오후"] as const).map((v) => (
                <button key={v} onClick={() => setForm({ ...form, half_day: v })}
                  className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    form.half_day === v ? "bg-[var(--teal)] text-white" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
                  {v === "" ? "종일" : v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">메모 (선택)</label>
            <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="추가 메모를 입력해주세요" rows={2}
              className="w-full px-3 py-2 text-sm border border-border rounded-xl outline-none focus:ring-2 focus:ring-[var(--teal)]/30 resize-none" />
          </div>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" checked={form.manager_approved}
              onChange={(e) => setForm({ ...form, manager_approved: e.target.checked })}
              className="mt-0.5 accent-[var(--teal)]" />
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">부서장 사전 승인 확인 *</span><br />
              부서장 승인 후 휴가 제출하셔야 합니다. 미 보고 휴가 시 불이익이 발생할 수 있습니다.
            </span>
          </label>
          <div className="p-3 bg-[var(--teal-light)] rounded-xl text-xs text-[var(--teal-dark)]">
            <strong>잔여 연차 {remaining}일</strong> · 승인 후 잔여 연차에서 자동 차감됩니다
          </div>
          <Button className="w-full rounded-xl text-white" style={{ background: "var(--teal)" }}
            onClick={handleSubmit} disabled={submitting}>
            {submitting ? "신청 중..." : "신청하기"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SpecialLeavePanel() {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<typeof specialLeaveTypes[0] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ reason: "", event_date: "" });
  const [uploadedFile, setUploadedFile] = useState<{ key: string; url: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState<Array<{ id: number; leave_type: string; leave_days: number; status: string; reason: string; event_date: string; file_name: string | null; created_at: number }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 신청 내역 로드
  const loadRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/special-leave", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMyRequests(data);
      }
    } catch { /* silent */ }
  }, []);

  useState(() => { loadRequests(); });

  const handleTypeClick = (item: typeof specialLeaveTypes[0]) => {
    setSelectedType(item);
    setForm({ reason: "", event_date: "" });
    setUploadedFile(null);
    setDialogOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("파일 크기는 10MB 이하여야 합니다"); return; }
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(file.type)) { toast.error("PDF, JPG, PNG 파일만 업로드 가능합니다"); return; }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string).split(",")[1];
        const res = await fetch("/api/special-leave/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ file_data: base64, file_name: file.name, mime_type: file.type }),
        });
        if (res.ok) {
          const data = await res.json();
          setUploadedFile({ key: data.key, url: data.url, name: file.name });
          toast.success("파일 업로드 완료", { description: file.name });
        } else {
          const err = await res.json();
          toast.error("업로드 실패", { description: err.error });
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("업로드 중 오류가 발생했습니다");
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedType) return;
    if (!form.event_date) { toast.error("행사일을 입력해주세요"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/special-leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          leave_type: selectedType.label,
          leave_days: selectedType.days,
          reason: form.reason,
          event_date: form.event_date,
          file_key: uploadedFile?.key || null,
          file_name: uploadedFile?.name || null,
          file_url: uploadedFile?.url || null,
        }),
      });
      if (res.ok) {
        toast.success(`${selectedType.label} 휴가 신청 완료`, { description: "승인 대기 중입니다" });
        setDialogOpen(false);
        loadRequests();
      } else {
        const err = await res.json();
        toast.error("신청 실패", { description: err.error });
      }
    } catch {
      toast.error("신청 중 오류가 발생했습니다");
    }
    setSubmitting(false);
  };

  const statusColor: Record<string, string> = {
    "승인": "bg-[var(--teal-light)] text-[var(--teal-dark)]",
    "대기": "bg-amber-50 text-amber-600",
    "거절": "bg-red-50 text-red-500",
  };

  return (
    <div className="space-y-4">
      {/* 유형 선택 카드 */}
      <div className="grid grid-cols-2 gap-3">
        {specialLeaveTypes.map((item) => (
          <div key={item.label}
            className="p-4 bg-white rounded-2xl border border-border hover:shadow-md hover:border-[var(--teal)]/40 transition-all cursor-pointer group"
            onClick={() => handleTypeClick(item)}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform" style={{ background: item.color + "20" }}>
              <item.icon size={20} style={{ color: item.color }} />
            </div>
            <div className="font-semibold text-sm text-foreground">{item.label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">유급 {item.days}일</div>
            <div className="text-[10px] text-[var(--teal)] mt-1.5 font-medium opacity-0 group-hover:opacity-100 transition-opacity">신청하기 →</div>
          </div>
        ))}
      </div>

      {/* 신청 내역 */}
      {myRequests.length > 0 && (
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">나의 경조사 신청 내역</span>
            <span className="text-xs text-muted-foreground">{myRequests.length}건</span>
          </div>
          <div className="divide-y divide-border">
            {myRequests.slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{r.leave_type}</span>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", statusColor[r.status] || "bg-muted text-muted-foreground")}>{r.status}</span>
                    {r.file_name && <span className="text-[10px] text-[var(--teal)] bg-[var(--teal-light)] px-1.5 py-0.5 rounded-full">파일체줄</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">행사일: {r.event_date || "-"} · {r.leave_days}일</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 신청 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {selectedType && (
                <span className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: selectedType.color + "20" }}>
                    {selectedType && <selectedType.icon size={16} style={{ color: selectedType.color }} />}
                  </span>
                  {selectedType.label} 휴가 신청
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-3 bg-[var(--teal-light)] rounded-xl text-xs text-[var(--teal-dark)]">
              유급 <strong>{selectedType?.days}일</strong> 적용 · 증빙서류 제출 시 승인 처리됩니다
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">행사일 <span className="text-red-400">*</span></label>
              <input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded-xl outline-none focus:ring-2 focus:ring-[var(--teal)]/30" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">사유 (선택)</label>
              <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="추가 사유를 입력해주세요" rows={2}
                className="w-full px-3 py-2 text-sm border border-border rounded-xl outline-none focus:ring-2 focus:ring-[var(--teal)]/30 resize-none" />
            </div>
            {/* 파일 업로드 */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">증빙서류 업로드</label>
              <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileChange} />
              {uploadedFile ? (
                <div className="flex items-center gap-2 p-3 bg-[var(--teal-light)] rounded-xl border border-[var(--teal)]/30">
                  <div className="w-8 h-8 rounded-lg bg-[var(--teal)] flex items-center justify-center">
                    <Upload size={14} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground truncate">{uploadedFile.name}</div>
                    <div className="text-[10px] text-[var(--teal-dark)]">업로드 완료</div>
                  </div>
                  <button onClick={() => setUploadedFile(null)} className="text-muted-foreground hover:text-foreground">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div
                  className={cn("border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-[var(--teal)] hover:bg-[var(--teal-light)] transition-all", uploading && "opacity-60 pointer-events-none")}
                  onClick={() => fileInputRef.current?.click()}>
                  {uploading ? (
                    <div className="text-sm text-muted-foreground">업로드 중...</div>
                  ) : (
                    <>
                      <Upload size={20} className="mx-auto text-muted-foreground mb-1.5" />
                      <div className="text-sm font-medium text-foreground">클릭하여 파일 선택</div>
                      <div className="text-xs text-muted-foreground mt-0.5">PDF, JPG, PNG · 최대 10MB</div>
                    </>
                  )}
                </div>
              )}
            </div>
            <Button
              className="w-full rounded-xl text-white"
              style={{ background: "var(--teal)" }}
              onClick={handleSubmit}
              disabled={submitting}>
              {submitting ? "신청 중..." : "휴가 신청"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Employee View ────────────────────────────────────────────────────────────
interface DbLeaveRequest {
  id: number;
  employee_id: number;
  employee_name: string;
  start_date: string;
  end_date: string;
  half_day: string | null;
  leave_type: string;
  manager_approved: number;
  status: "대기" | "승인" | "반려";
  note: string | null;
  source: "app" | "google_form";
  created_at: number;
}

function EmployeeView({ userName, userDept }: { userName: string; userDept: string }) {
  const [myLeaveHistory, setMyLeaveHistory] = useState<DbLeaveRequest[]>([]);
  const [leaveLoading, setLeaveLoading] = useState(true);
  const [empLeave, setEmpLeave] = useState<{ total_leave: number; used_leave: number } | null>(null);

  const loadMyLeave = useCallback(async () => {
    setLeaveLoading(true);
    try {
      const leaveRes = await fetch("/api/leave-requests", { credentials: "include" });
      if (leaveRes.ok) setMyLeaveHistory(await leaveRes.json());
      const empRes = await fetch("/api/employees/me", { credentials: "include" });
      if (empRes.ok) {
        const emp = await empRes.json();
        setEmpLeave({ total_leave: emp.total_leave ?? 15, used_leave: emp.used_leave ?? 0 });
      }
    } catch { /* silent */ } finally {
      setLeaveLoading(false);
    }
  }, []);

  useState(() => { loadMyLeave(); });

  const pendingDays = myLeaveHistory.filter(r => r.status === "대기").length;
  const approvedDays = myLeaveHistory.filter(r => r.status === "승인").reduce((acc, r) => {
    const start = new Date(r.start_date);
    const end = new Date(r.end_date);
    const diff = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
    return acc + (r.half_day ? 0.5 : diff);
  }, 0);
  const totalLeave = empLeave?.total_leave ?? 15;
  const usedLeave = empLeave?.used_leave ?? approvedDays;
  const leaveBalance = {
    total: totalLeave,
    used: usedLeave,
    pending: pendingDays,
    remaining: Math.max(0, totalLeave - usedLeave),
  };
  const calendarData: Record<number, { type: string; label: string }> = {};
  myLeaveHistory.forEach(r => {
    if (r.status === "승인" || r.status === "대기") {
      const start = new Date(r.start_date);
      const end = new Date(r.end_date);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        calendarData[d.getDate()] = { type: r.status === "승인" ? "leave" : "pending", label: r.leave_type.slice(0, 4) };
      }
    }
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-muted-foreground">2025년 5월 · 입사일 기준 자동 생성</p>
        </div>
        <LeaveRequestDialog remaining={leaveBalance.remaining} onSuccess={loadMyLeave} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Left: Balance + Calendar */}
        <div className="xl:col-span-1 space-y-5">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-border">
            <h2 className="section-title mb-4">내 연차 현황</h2>
            <div className="flex items-center gap-5">
              <LeaveRing used={leaveBalance.used + leaveBalance.pending} total={leaveBalance.total} />
              <div className="space-y-2 flex-1">
                {[
                  { label: "총 연차", value: leaveBalance.total + "일", color: "text-foreground" },
                  { label: "사용", value: leaveBalance.used + "일", color: "text-[var(--teal-dark)]" },
                  { label: "승인 대기", value: leaveBalance.pending + "일", color: "text-amber-500" },
                  { label: "잔여", value: leaveBalance.remaining + "일", color: "text-[var(--teal)]", bold: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <span className={`text-sm mono-num font-semibold ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 부서 정보 카드 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-border">
            <h2 className="section-title mb-3">소속 정보</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">이름</span>
                <span className="text-sm font-semibold text-foreground">{userName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">부서</span>
                <span className="text-sm font-medium text-foreground">{userDept || "미지정"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">기준 연도</span>
                <span className="text-sm font-medium text-foreground">2025년</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-border">
            <h2 className="section-title mb-4">근태 캘린더</h2>
            <FullCalendar calendarData={calendarData} />
          </div>
        </div>

        {/* Right: Tabs */}
        <div className="xl:col-span-2">
          <Tabs defaultValue="history">
            <TabsList className="bg-muted rounded-xl p-1 mb-5">
              <TabsTrigger value="history" className="rounded-lg text-sm">내 연차 내역</TabsTrigger>
              <TabsTrigger value="special" className="rounded-lg text-sm">경조사 지원</TabsTrigger>
            </TabsList>

            <TabsContent value="history">
              <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
                <div className="p-5 border-b border-border flex items-center justify-between">
                  <h2 className="section-title">연차 사용 내역</h2>
                  <span className="text-xs text-muted-foreground">총 {myLeaveHistory.length}건</span>
                </div>
                {myLeaveHistory.length === 0 ? (
                  <div className="py-12 text-center">
                    <CalendarDays size={32} className="mx-auto text-muted-foreground/40 mb-3" />
                    <div className="text-sm text-muted-foreground">아직 연차 사용 내역이 없습니다</div>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {myLeaveHistory.map((item) => {
                      const startDate = item.start_date ? item.start_date.slice(0, 10) : "";
                      const endDate = item.end_date ? item.end_date.slice(0, 10) : "";
                      const start = new Date(item.start_date);
                      const end = new Date(item.end_date);
                      const diff = item.half_day ? 0.5 : Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
                      return (
                      <div key={item.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-bold shrink-0 text-center leading-tight",
                          item.status === "승인" ? "bg-[var(--teal-light)] text-[var(--teal-dark)]" : item.status === "반려" ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-600")}>
                          {item.half_day ? item.half_day + "반차" : "연차"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">{item.leave_type}</span>
                            <StatusBadge status={item.status === "반려" ? "거절" : item.status} />
                            {item.source === "google_form" && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-500 font-medium">구글폼</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">{startDate} ~ {endDate}{item.note ? ` · ${item.note}` : ""}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="mono-num text-sm font-bold text-foreground">{diff}일</div>
                          <div className="text-xs text-muted-foreground">차감</div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {item.status === "승인" ? <CheckCircle2 size={18} className="text-[var(--teal)]" /> : item.status === "반려" ? <XCircle size={18} className="text-red-400" /> : <AlertCircle size={18} className="text-amber-400" />}
                          {item.status === "대기" && (
                            <button onClick={async () => {
                              const res = await fetch(`/api/leave-requests/${item.id}`, { method: "DELETE", credentials: "include" });
                              if (res.ok) { loadMyLeave(); } else { const e = await res.json(); alert(e.error); }
                            }} className="text-[10px] text-red-400 hover:text-red-600 ml-1">취소</button>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="special">
              <div className="bg-[oklch(0.975_0.005_220)] rounded-2xl p-5">
                <h2 className="section-title mb-1">경조사 지원</h2>
                <p className="text-sm text-muted-foreground mb-4">유형별 유급 휴가 설정 · 증빙 서류 업로드</p>
                <SpecialLeavePanel />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

// ─── Admin View ───────────────────────────────────────────────────────────────

interface DbAdminLeaveRequest {
  id: number;
  employee_id: number | null;
  employee_name: string;
  start_date: string;
  end_date: string;
  half_day: string | null;
  leave_type: string;
  manager_approved: number;
  status: "대기" | "승인" | "반려";
  note: string | null;
  source: "app" | "google_form";
  created_at: number;
  dept?: string;
  position?: string;
}

function AdminView() {
  const [requests, setRequests] = useState<DbAdminLeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"전체" | "대기" | "승인" | "반려">("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [bulkGrantOpen, setBulkGrantOpen] = useState(false);
  const [bulkDays, setBulkDays] = useState("15");
  const [bulkDept, setBulkDept] = useState("전체");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leave-requests", { credentials: "include" });
      if (res.ok) setRequests(await res.json());
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useState(() => { loadRequests(); });

  const pendingCount = requests.filter((r) => r.status === "대기").length;
  const filteredRequests = requests.filter((r) => {
    const matchStatus = filterStatus === "전체" || r.status === filterStatus;
    const matchSearch = !searchQuery || r.employee_name.includes(searchQuery) || (r.dept ?? "").includes(searchQuery);
    return matchStatus && matchSearch;
  });

  const handleApprove = async (id: number) => {
    // 처리 전 해당 신청이 '대기' 상태인지 확인 (뱃지 감소 여부 결정)
    const wasPending = requests.find((r) => r.id === id)?.status === "대기";
    const res = await fetch(`/api/leave-requests/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: "승인" }),
    });
    if (res.ok) {
      toast.success("연차 신청을 승인했습니다");
      if (wasPending) setBadgeCount(Math.max(0, globalBadgeCount - 1));
      loadRequests();
    } else { const e = await res.json(); toast.error("승인 실패", { description: e.error }); }
  };
  const handleReject = async (id: number, name: string) => {
    const wasPending = requests.find((r) => r.id === id)?.status === "대기";
    const res = await fetch(`/api/leave-requests/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: "반려" }),
    });
    if (res.ok) {
      toast.error(`${name}의 연차 신청을 반려했습니다`);
      if (wasPending) setBadgeCount(Math.max(0, globalBadgeCount - 1));
      loadRequests();
    } else { const e = await res.json(); toast.error("반려 실패", { description: e.error }); }
  };
  const handleApproveAll = async () => {
    const pendingIds = requests.filter((r) => r.status === "대기").map((r) => r.id);
    await Promise.all(pendingIds.map(id => fetch(`/api/leave-requests/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: "승인" }),
    })));
    toast.success(`${pendingIds.length}건의 연차 신청을 일괄 승인했습니다`);
    // 일괄 승인 시 대기 건수만큼 뱃지 감소
    setBadgeCount(Math.max(0, globalBadgeCount - pendingIds.length));
    loadRequests();
  };
  const handleBulkGrant = () => {
    const days = parseFloat(bulkDays);
    if (isNaN(days) || days <= 0) { toast.error("올바른 연차 일수를 입력해주세요"); return; }
    const target = bulkDept === "전체" ? "전체 직원" : `${bulkDept} 직원`;
    toast.success(`${target}에게 연차 ${days}일이 일괄 부여되었습니다`);
    setBulkGrantOpen(false);
  };

  return (
    <div>
      {/* Admin Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "승인 대기", value: pendingCount, icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-50" },
          { label: "오늘 연차자", value: 3, icon: CalendarDays, color: "text-[var(--teal-dark)]", bg: "bg-[var(--teal-light)]" },
          { label: "이번 달 승인", value: requests.filter((r) => r.status === "승인").length, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl p-4 shadow-sm border border-border">
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", card.bg)}>
                <card.icon size={18} className={card.color} />
              </div>
              <div>
                <div className={cn("mono-num text-2xl font-bold", card.color)}>{card.value}</div>
                <div className="text-xs text-muted-foreground">{card.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Left: Dept Summary */}
        <div className="xl:col-span-1 space-y-5">
          {/* Dept Attendance */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">부서별 근태 현황</h2>
              <span className="text-xs text-muted-foreground">오늘 기준</span>
            </div>
            <div className="space-y-3">
              {deptAttendanceSummary.map((dept) => (
                <div key={dept.dept}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground">{dept.dept}</span>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>재직 {dept.present}/{dept.total}</span>
                      <span className="mono-num font-semibold text-[var(--teal-dark)]">{dept.rate}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${dept.rate}%`, background: dept.rate >= 97 ? "var(--teal)" : dept.rate >= 94 ? "oklch(0.65 0.18 60)" : "var(--coral)" }} />
                  </div>
                  <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                    {dept.leave > 0 && <span className="text-[var(--teal-dark)]">연차 {dept.leave}명</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Leave Alert Settings */}
          <LeaveAlertPanel />

          {/* Bulk Grant */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">연차 일괄 부여</h2>
              <Gift size={16} className="text-[var(--teal)]" />
            </div>
            {!bulkGrantOpen ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">특정 부서 또는 전체 직원에게 연차를 일괄 부여합니다.</p>
                <Button className="w-full rounded-xl text-white text-sm gap-2" style={{ background: "var(--teal)" }}
                  onClick={() => setBulkGrantOpen(true)}>
                  <Plus size={14} />일괄 부여 설정
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">대상 부서</label>
                  <select value={bulkDept} onChange={(e) => setBulkDept(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-border rounded-xl outline-none focus:ring-2 focus:ring-[var(--teal)]/30 bg-white">
                    {["전체", "개발팀", "마케팅", "디자인", "영업팀", "인사팀", "재무팀"].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">부여 일수</label>
                  <input type="number" value={bulkDays} onChange={(e) => setBulkDays(e.target.value)}
                    min="0.5" step="0.5" placeholder="15"
                    className="w-full px-3 py-2 text-sm border border-border rounded-xl outline-none focus:ring-2 focus:ring-[var(--teal)]/30" />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 rounded-xl text-xs" onClick={() => setBulkGrantOpen(false)}>취소</Button>
                  <Button size="sm" className="flex-1 rounded-xl text-white text-xs" style={{ background: "var(--teal)" }} onClick={handleBulkGrant}>부여하기</Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Approval Queue + Employee Leave Table */}
        <div className="xl:col-span-2 space-y-5">
          {/* Approval Queue */}
          <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
            <div className="p-5 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="section-title">연차 신청 승인 관리</h2>
                  {pendingCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                      대기 {pendingCount}건
                    </span>
                  )}
                </div>
                {pendingCount > 0 && (
                  <Button size="sm" className="rounded-xl text-white text-xs gap-1.5" style={{ background: "var(--teal)" }}
                    onClick={handleApproveAll}>
                    <CheckCircle2 size={13} />일괄 승인
                  </Button>
                )}
              </div>
              {/* Filter + Search */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-48">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type="text" placeholder="이름, 부서 검색..." value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted rounded-xl border-0 outline-none focus:ring-2 focus:ring-[var(--teal)]/30" />
                </div>
                <div className="flex gap-1">
                  {(["전체", "대기", "승인", "반려"] as const).map((s) => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                      className={cn("px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all",
                        filterStatus === s ? "bg-[var(--teal)] text-white" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <ScrollArea className="max-h-72">
              <div className="divide-y divide-border">
                {loading ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">불러오는 중...</div>
                ) : filteredRequests.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">해당 조건의 신청이 없습니다</div>
                ) : filteredRequests.map((req) => {
                  const startDate = req.start_date ? req.start_date.slice(0, 10) : "";
                  const endDate = req.end_date ? req.end_date.slice(0, 10) : "";
                  const start = new Date(req.start_date);
                  const end = new Date(req.end_date);
                  const diff = req.half_day ? 0.5 : Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
                  const initials = req.employee_name.slice(0, 2);
                  return (
                  <div key={req.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 bg-[var(--teal)]">
                      {initials}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">{req.employee_name}</span>
                        <span className="text-[11px] text-muted-foreground">{req.dept ?? ""}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">{req.half_day ? req.half_day + "반차" : "연차"}</span>
                        <StatusBadge status={req.status === "반려" ? "거절" : req.status} />
                        {req.source === "google_form" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-500 font-medium">구글폼</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {startDate} ~ {endDate} · <span className="mono-num font-semibold text-foreground">{diff}일</span>{req.leave_type ? ` · ${req.leave_type}` : ""}{req.note ? ` · ${req.note}` : ""}
                      </div>
                    </div>
                    {/* Actions */}
                    {req.status === "대기" && (
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--teal-light)] text-[var(--teal-dark)] hover:bg-[var(--teal)] hover:text-white transition-all"
                          onClick={() => handleApprove(req.id)}
                        >
                          <Check size={12} />승인
                        </button>
                        <button
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                          onClick={() => handleReject(req.id, req.employee_name)}
                        >
                          <X size={12} />반려
                        </button>
                      </div>
                    )}
                    {req.status !== "대기" && (
                      <div className="shrink-0">
                        {req.status === "승인"
                          ? <CheckCircle2 size={18} className="text-[var(--teal)]" />
                          : <XCircle size={18} className="text-red-400" />}
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Employee Leave Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="section-title">전체 직원 연차 현황</h2>
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">2025년 기준</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["직원", "부서", "총 연차", "사용", "대기", "잔여", "사용률"].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 first:pl-5 last:pr-5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allEmployeeLeave.map((emp) => {
                    const usageRate = Math.round(((emp.used + emp.pending) / emp.total) * 100);
                    return (
                      <tr key={emp.name} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 pl-5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white"
                              style={{ background: emp.color }}>
                              {emp.name.slice(0, 1)}
                            </div>
                            <span className="text-sm font-medium text-foreground">{emp.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{emp.dept}</td>
                        <td className="px-4 py-3 mono-num text-sm text-foreground">{emp.total}</td>
                        <td className="px-4 py-3 mono-num text-sm text-[var(--teal-dark)]">{emp.used}</td>
                        <td className="px-4 py-3 mono-num text-sm text-amber-500">{emp.pending}</td>
                        <td className="px-4 py-3 mono-num text-sm font-bold text-[var(--teal)]">{emp.remaining}</td>
                        <td className="px-4 py-3 pr-5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden min-w-[40px]">
                              <div className="h-full rounded-full" style={{ width: `${usageRate}%`, background: usageRate >= 80 ? "var(--coral)" : "var(--teal)" }} />
                            </div>
                            <span className="mono-num text-xs text-muted-foreground w-8 text-right">{usageRate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Leave Alert Panel ────────────────────────────────────────────────────────

function LeaveAlertPanel() {
  const [threshold, setThreshold] = useState(7);
  const [channels, setChannels] = useState({ email: true, app: true, sms: false });
  const [autoAlert, setAutoAlert] = useState(false);
  const [autoFreq, setAutoFreq] = useState<"매일" | "매주" | "매월">("매주");
  const [isSending, setIsSending] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [logs, setLogs] = useState<NotificationLog[]>(() => getNotificationLogs());

  const targets = allEmployeeLeave.filter((e) => e.remaining <= threshold);

  const channelLabel = [
    channels.email && "이메일",
    channels.app && "앱 알림",
    channels.sms && "SMS",
  ].filter(Boolean).join("+") || "없음";

  const handleSend = () => {
    if (targets.length === 0) { toast.error("알림 대상 직원이 없습니다"); return; }
    if (!channels.email && !channels.app && !channels.sms) { toast.error("발송 채널을 선택해주세요"); return; }
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      targets.forEach((emp, i) => {
        const newLog: NotificationLog = {
          id: Date.now() + i,
          empName: emp.name,
          empDept: emp.dept,
          empColor: emp.color,
          remaining: emp.remaining,
          threshold,
          sentAt: new Date().toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(/\. /g, ".").replace(/\.$/, ""),
          channel: channelLabel,
          read: false,
        };
        addNotificationLog(newLog);
      });
      setLogs([...getNotificationLogs()]);
      toast.success(`${targets.length}명에게 연차 소진 알림을 발송했습니다`, {
        description: `채널: ${channelLabel} · 잔여 ${threshold}일 이하 대상`,
      });
    }, 1200);
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="section-title">연차 소진 알림</h2>
          {autoAlert && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--teal-light)] text-[var(--teal-dark)]">자동 ON</span>
          )}
        </div>
        <BellRing size={16} className="text-[var(--teal)]" />
      </div>

      {/* Threshold Slider */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-foreground">알림 임계값</label>
          <span className="mono-num text-sm font-bold text-[var(--teal)]">잔여 {threshold}일 이하</span>
        </div>
        <input type="range" min={1} max={15} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{ accentColor: "var(--teal)" }}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>1일</span><span>5일</span><span>10일</span><span>15일</span>
        </div>
      </div>

      {/* Target Preview */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-foreground">알림 대상</span>
          <span className={cn("mono-num text-xs font-bold", targets.length > 0 ? "text-[var(--coral)]" : "text-muted-foreground")}>
            {targets.length}명
          </span>
        </div>
        {targets.length === 0 ? (
          <div className="py-3 text-center text-xs text-muted-foreground bg-muted rounded-xl">
            해당 조건의 직원이 없습니다
          </div>
        ) : (
          <div className="space-y-1.5 max-h-28 overflow-y-auto">
            {targets.map((emp) => (
              <div key={emp.name} className="flex items-center gap-2 p-2 bg-[var(--coral-light)] rounded-xl">
                <div className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                  style={{ background: emp.color }}>
                  {emp.name.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-foreground">{emp.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-1">{emp.dept}</span>
                </div>
                <span className="mono-num text-xs font-bold text-[var(--coral)] shrink-0">{emp.remaining}일</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Channel Selection */}
      <div className="mb-4">
        <label className="text-xs font-medium text-foreground mb-2 block">발송 채널</label>
        <div className="flex gap-2">
          {(["email", "app", "sms"] as const).map((ch) => {
            const labels = { email: "이메일", app: "앱 알림", sms: "SMS" };
            return (
              <button key={ch} onClick={() => setChannels((prev) => ({ ...prev, [ch]: !prev[ch] }))}
                className={cn("flex-1 py-1.5 rounded-lg text-xs font-medium transition-all border",
                  channels[ch]
                    ? "bg-[var(--teal)] text-white border-[var(--teal)]"
                    : "bg-white text-muted-foreground border-border hover:border-[var(--teal)]")}>
                {labels[ch]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Auto Alert Toggle */}
      <div className="flex items-center justify-between mb-4 p-3 bg-muted rounded-xl">
        <div>
          <div className="text-xs font-medium text-foreground">자동 알림</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">주기적으로 자동 발송</div>
        </div>
        <div className="flex items-center gap-2">
          {autoAlert && (
            <select value={autoFreq} onChange={(e) => setAutoFreq(e.target.value as typeof autoFreq)}
              className="text-xs border border-border rounded-lg px-2 py-1 outline-none bg-white">
              <option value="매일">매일</option>
              <option value="매주">매주</option>
              <option value="매월">매월</option>
            </select>
          )}
          <button onClick={() => { setAutoAlert((v) => !v); if (!autoAlert) toast.success(`자동 알림이 활성화되었습니다`, { description: `${autoFreq} 발송 · 잔여 ${threshold}일 이하 대상` }); }}
            className={cn("w-10 h-5 rounded-full transition-all relative", autoAlert ? "bg-[var(--teal)]" : "bg-muted-foreground/30")}>
            <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all", autoAlert ? "left-5" : "left-0.5")} />
          </button>
        </div>
      </div>

      {/* Send Button */}
      <Button className="w-full rounded-xl text-white gap-2 text-sm" style={{ background: isSending ? "var(--teal-dark)" : "var(--teal)" }}
        onClick={handleSend} disabled={isSending}>
        {isSending ? (
          <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />발송 중...</>
        ) : (
          <><Send size={14} />지금 발송 ({targets.length}명)</>
        )}
      </Button>

      {/* Log Toggle */}
      <button className="w-full mt-3 flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setShowLog((v) => !v)}>
        <span>발송 내역 ({logs.length}건)</span>
        {showLog ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {showLog && (
        <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="py-3 text-center text-xs text-muted-foreground">발송 내역이 없습니다</div>
          ) : logs.map((log) => (
            <div key={log.id} className={cn("flex items-center gap-2 p-2 rounded-xl text-[11px]", log.read ? "bg-muted" : "bg-[var(--teal-light)]")}>
              <div className="w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                style={{ background: log.empColor }}>
                {log.empName.slice(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-foreground">{log.empName}</span>
                <span className="text-muted-foreground ml-1">{log.empDept} · 잔여 {log.remaining}일</span>
              </div>
              <span className="text-muted-foreground shrink-0">{log.sentAt.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const { user, isAdmin } = useAuth();
  const [adminViewMode, setAdminViewMode] = useState<"employee" | "admin">("admin");

  // 직원 로그인 시: 역할 전환 탭 없이 본인 뷰만 표시
  // 관리자 로그인 시: 역할 전환 탭 표시 (기본값 관리자 뷰)

  const userName = user?.name ?? "사용자";
  const userDept = user?.department ?? "";

  return (
    <div className="p-5 lg:p-7 page-enter">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">근태 · 연차 관리</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            2025년 5월 · 싸카스포츠
            {!isAdmin && (
              <span className="ml-2 inline-flex items-center gap-1 text-[var(--teal-dark)] font-medium">
                <Lock size={11} />
                본인 데이터만 표시
              </span>
            )}
          </p>
        </div>

        {/* 관리자만 역할 전환 탭 표시 */}
        {isAdmin && (
          <div className="flex items-center gap-1 bg-muted rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setAdminViewMode("employee")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                adminViewMode === "employee"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <User size={15} />
              직원 뷰
            </button>
            <button
              onClick={() => setAdminViewMode("admin")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                adminViewMode === "admin"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ShieldCheck size={15} />
              관리자 뷰
            </button>
          </div>
        )}
      </div>

      {/* Role Badge */}
      <div className="flex items-center gap-2 mb-5">
        {isAdmin ? (
          <>
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold",
              adminViewMode === "employee"
                ? "bg-[var(--teal-light)] text-[var(--teal-dark)]"
                : "bg-[oklch(0.93_0.05_280)] text-[oklch(0.40_0.15_280)]"
            )}>
              {adminViewMode === "employee" ? <User size={12} /> : <ShieldCheck size={12} />}
              {adminViewMode === "employee" ? `직원 뷰 — ${userName}` : "관리자 뷰 — HR 담당자"}
            </div>
            <span className="text-xs text-muted-foreground">
              {adminViewMode === "employee" ? "직원 뷰를 미리보고 있습니다" : "전체 직원의 연차 신청을 승인·관리합니다"}
            </span>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--teal-light)] text-[var(--teal-dark)]">
              <User size={12} />
              {userName} · {userDept}
            </div>
            <span className="text-xs text-muted-foreground">본인의 근태·연차 현황을 확인하고 신청합니다</span>
          </>
        )}
      </div>

      {/* View Content */}
      <div style={{ animation: "fadeIn 0.2s ease-out" }}>
        {!isAdmin ? (
          // 직원: 본인 데이터만 표시
          <EmployeeView userName={userName} userDept={userDept} />
        ) : adminViewMode === "admin" ? (
          // 관리자 뷰
          <AdminView />
        ) : (
          // 관리자가 직원 뷰 미리보기
          <EmployeeView userName={userName} userDept={userDept} />
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
