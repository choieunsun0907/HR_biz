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

import { useState, useCallback } from "react";
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

function MiniCalendar({ calendarData }: { calendarData: Record<number, { type: string; label: string }> }) {
  const [month] = useState(4);
  const year = 2025;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = 18;
  const cells: (number | null)[] = [];
  for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const dayLabels = ["월", "화", "수", "목", "금", "토", "일"];
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayLabels.map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={`empty-${i}`} />;
          const info = calendarData[d];
          const isToday = d === today;
          const isWeekend = (i % 7) >= 5;
          return (
            <div key={d} className={cn(
              "h-9 flex flex-col items-center justify-center rounded-lg text-xs font-medium cursor-pointer transition-all hover:scale-105",
              isToday && "ring-2 ring-[var(--teal)] ring-offset-1",
              info?.type === "leave" && "bg-[var(--teal)] text-white",
              info?.type === "pending" && "bg-amber-50 text-amber-600",
              !info && isWeekend && "text-muted-foreground/50",
              !info && !isWeekend && "text-foreground hover:bg-muted"
            )} title={info?.label}>
              {d}
              {info && <div className="w-1 h-1 rounded-full mt-0.5 bg-current opacity-60" />}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[var(--teal)] inline-block" />연차</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-50 border border-amber-200 inline-block" />대기</span>
      </div>
    </div>
  );
}

function LeaveRequestDialog({ remaining }: { remaining: number }) {
  const [form, setForm] = useState({ type: "연차", start: "", end: "", reason: "" });
  const handleSubmit = () => {
    if (!form.start || !form.end || !form.reason) { toast.error("모든 항목을 입력해주세요"); return; }
    toast.success("연차 신청이 완료되었습니다", { description: "승인 후 잔여 연차에서 자동 차감됩니다." });
  };
  return (
    <DialogContent className="max-w-md rounded-2xl">
      <DialogHeader><DialogTitle className="text-lg font-bold">연차 신청</DialogTitle></DialogHeader>
      <div className="space-y-4 pt-2">
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">휴가 유형</label>
          <div className="flex flex-wrap gap-2">
            {["연차", "반차(오전)", "반차(오후)", "병가"].map((t) => (
              <button key={t} onClick={() => setForm({ ...form, type: t })}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  form.type === t ? "bg-[var(--teal)] text-white" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">시작일</label>
            <input type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-border rounded-xl outline-none focus:ring-2 focus:ring-[var(--teal)]/30" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">종료일</label>
            <input type="date" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-border rounded-xl outline-none focus:ring-2 focus:ring-[var(--teal)]/30" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">사유</label>
          <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder="휴가 사유를 입력해주세요" rows={3}
            className="w-full px-3 py-2 text-sm border border-border rounded-xl outline-none focus:ring-2 focus:ring-[var(--teal)]/30 resize-none" />
        </div>
        <div className="p-3 bg-[var(--teal-light)] rounded-xl text-xs text-[var(--teal-dark)]">
          <strong>잔여 연차 {remaining}일</strong> · 승인 시 자동 차감됩니다
        </div>
        <Button className="w-full rounded-xl text-white" style={{ background: "var(--teal)" }} onClick={handleSubmit}>
          신청하기
        </Button>
      </div>
    </DialogContent>
  );
}

function SpecialLeavePanel() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {specialLeaveTypes.map((item) => (
          <div key={item.label} className="p-4 bg-white rounded-2xl border border-border hover:shadow-sm transition-all cursor-pointer"
            onClick={() => toast.info(`${item.label} 휴가 신청`, { description: "증빙 서류를 업로드해주세요" })}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: item.color + "20" }}>
              <item.icon size={20} style={{ color: item.color }} />
            </div>
            <div className="font-semibold text-sm text-foreground">{item.label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">유급 {item.days}일</div>
          </div>
        ))}
      </div>
      <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center cursor-pointer hover:border-[var(--teal)] hover:bg-[var(--teal-light)] transition-all"
        onClick={() => toast.info("파일 업로드", { description: "증빙 서류를 선택해주세요" })}>
        <Upload size={24} className="mx-auto text-muted-foreground mb-2" />
        <div className="text-sm font-medium text-foreground">증빙 서류 업로드</div>
        <div className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG · 최대 10MB</div>
      </div>
    </div>
  );
}

// ─── Employee View ────────────────────────────────────────────────────────────

function EmployeeView({ userName, userDept }: { userName: string; userDept: string }) {
  // 본인 데이터 로드 (이름 기반 매핑, 없으면 기본값)
  const myData = employeeLeaveData[userName] ?? defaultLeaveData;
  const leaveBalance = {
    total: myData.total,
    used: myData.used,
    pending: myData.pending,
    remaining: myData.remaining,
  };
  const myLeaveHistory = myData.history;
  const calendarData = myData.calendarData;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-muted-foreground">2025년 5월 · 입사일 기준 자동 생성</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl text-white text-sm" style={{ background: "var(--teal)" }}>
              <Plus size={16} />연차 신청
            </Button>
          </DialogTrigger>
          <LeaveRequestDialog remaining={leaveBalance.remaining} />
        </Dialog>
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">2025년 5월</h2>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="w-7 h-7 rounded-lg"><ChevronLeft size={14} /></Button>
                <Button variant="ghost" size="icon" className="w-7 h-7 rounded-lg"><ChevronRight size={14} /></Button>
              </div>
            </div>
            <MiniCalendar calendarData={calendarData} />
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
                    {myLeaveHistory.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0",
                          item.status === "승인" ? "bg-[var(--teal-light)] text-[var(--teal-dark)]" : "bg-amber-50 text-amber-600")}>
                          {item.type}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{item.reason}</span>
                            <StatusBadge status={item.status} />
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">{item.start} ~ {item.end}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="mono-num text-sm font-bold text-foreground">{item.days}일</div>
                          <div className="text-xs text-muted-foreground">차감</div>
                        </div>
                        <div className="shrink-0">
                          {item.status === "승인" ? <CheckCircle2 size={18} className="text-[var(--teal)]" /> : <AlertCircle size={18} className="text-amber-400" />}
                        </div>
                      </div>
                    ))}
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

function AdminView() {
  const [requests, setRequests] = useState<LeaveRequest[]>(allLeaveRequests);
  const [filterStatus, setFilterStatus] = useState<"전체" | LeaveStatus>("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [bulkGrantOpen, setBulkGrantOpen] = useState(false);
  const [bulkDays, setBulkDays] = useState("15");
  const [bulkDept, setBulkDept] = useState("전체");

  const pendingCount = requests.filter((r) => r.status === "대기").length;

  const filteredRequests = requests.filter((r) => {
    const matchStatus = filterStatus === "전체" || r.status === filterStatus;
    const matchSearch = !searchQuery || r.empName.includes(searchQuery) || r.empDept.includes(searchQuery);
    return matchStatus && matchSearch;
  });

  const handleApprove = (id: number) => {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "승인" as LeaveStatus } : r));
    toast.success("연차 신청을 승인했습니다", { description: "직원에게 알림이 발송됩니다." });
  };

  const handleReject = (id: number, name: string) => {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "거절" as LeaveStatus } : r));
    toast.error(`${name}의 연차 신청을 거절했습니다`);
  };

  const handleApproveAll = () => {
    const pendingIds = requests.filter((r) => r.status === "대기").map((r) => r.id);
    setRequests((prev) => prev.map((r) => pendingIds.includes(r.id) ? { ...r, status: "승인" as LeaveStatus } : r));
    toast.success(`${pendingIds.length}건의 연차 신청을 일괄 승인했습니다`);
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
                  {(["전체", "대기", "승인", "거절"] as const).map((s) => (
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
                {filteredRequests.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">해당 조건의 신청이 없습니다</div>
                ) : filteredRequests.map((req) => (
                  <div key={req.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: req.empColor }}>
                      {req.empAvatar}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">{req.empName}</span>
                        <span className="text-[11px] text-muted-foreground">{req.empDept}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">{req.type}</span>
                        <StatusBadge status={req.status} />
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {req.start} ~ {req.end} · <span className="mono-num font-semibold text-foreground">{req.days}일</span> · {req.reason}
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
                          onClick={() => handleReject(req.id, req.empName)}
                        >
                          <X size={12} />거절
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
                ))}
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
