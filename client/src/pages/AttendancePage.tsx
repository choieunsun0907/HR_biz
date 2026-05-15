/**
 * AttendancePage — TeamPulse Attendance & Leave Management
 * Design: Soft Teal Clarity
 * Features:
 * - 스마트 연차 현황 (잔여/사용/총 연차)
 * - 연차 신청 폼
 * - 모바일 외근 체크 (GPS 기반 시뮬레이션)
 * - 경조사 지원 탭
 * - 이번 달 근태 캘린더
 */

import { useState } from "react";
import {
  CalendarDays,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Upload,
  ChevronLeft,
  ChevronRight,
  Plus,
  Navigation,
  Heart,
  Coffee,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Mock Data ───────────────────────────────────────────────────────────────

const leaveBalance = {
  total: 15,
  used: 6,
  pending: 2,
  remaining: 7,
};

const leaveHistory = [
  { id: 1, type: "연차", start: "2025.04.14", end: "2025.04.15", days: 2, status: "승인", reason: "개인 사유" },
  { id: 2, type: "반차", start: "2025.04.22", end: "2025.04.22", days: 0.5, status: "승인", reason: "병원 방문" },
  { id: 3, type: "연차", start: "2025.05.02", end: "2025.05.02", days: 1, status: "승인", reason: "개인 사유" },
  { id: 4, type: "연차", start: "2025.05.19", end: "2025.05.21", days: 3, status: "대기", reason: "가족 여행" },
  { id: 5, type: "반차", start: "2025.05.28", end: "2025.05.28", days: 0.5, status: "대기", reason: "개인 사유" },
];

const fieldCheckHistory = [
  { date: "2025.05.15", location: "서울 강남구 테헤란로 152", checkIn: "09:12", checkOut: "18:35", status: "완료" },
  { date: "2025.05.14", location: "경기 성남시 분당구 판교역로 235", checkIn: "09:45", checkOut: "17:20", status: "완료" },
  { date: "2025.05.12", location: "서울 마포구 월드컵북로 396", checkIn: "10:00", checkOut: null, status: "미완료" },
];

const specialLeaveTypes = [
  { icon: Heart, label: "결혼", days: 5, color: "var(--coral)" },
  { icon: Heart, label: "배우자 출산", days: 10, color: "oklch(0.65 0.20 25)" },
  { icon: Coffee, label: "부모 사망", days: 5, color: "oklch(0.50 0.10 240)" },
  { icon: Briefcase, label: "본인 사망(조의)", days: 3, color: "oklch(0.55 0.01 220)" },
];

// Calendar data for May 2025
const calendarData: Record<number, { type: string; label: string }> = {
  2: { type: "leave", label: "연차" },
  14: { type: "field", label: "외근" },
  15: { type: "field", label: "외근" },
  19: { type: "pending", label: "연차(대기)" },
  20: { type: "pending", label: "연차(대기)" },
  21: { type: "pending", label: "연차(대기)" },
};

// ─── Leave Balance Ring ───────────────────────────────────────────────────────

function LeaveRing({ used, total }: { used: number; total: number }) {
  const pct = (used / total) * 100;
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r={r} fill="none" stroke="oklch(0.94 0.03 185)" strokeWidth="8" />
      <circle
        cx="48"
        cy="48"
        r={r}
        fill="none"
        stroke="oklch(0.65 0.14 185)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 48 48)"
        style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.23,1,0.32,1)" }}
      />
      <text x="48" y="44" textAnchor="middle" fontSize="14" fontWeight="700" fill="oklch(0.20 0.01 240)" fontFamily="JetBrains Mono">
        {total - used}
      </text>
      <text x="48" y="58" textAnchor="middle" fontSize="10" fill="oklch(0.55 0.01 220)">
        잔여
      </text>
    </svg>
  );
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────

function MiniCalendar() {
  const [month] = useState(4); // May (0-indexed)
  const year = 2025;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = 15;

  const cells = [];
  for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dayLabels = ["월", "화", "수", "목", "금", "토", "일"];

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayLabels.map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={`empty-${i}`} />;
          const info = calendarData[d];
          const isToday = d === today;
          const isWeekend = (i % 7) >= 5;

          return (
            <div
              key={d}
              className={cn(
                "h-9 flex flex-col items-center justify-center rounded-lg text-xs font-medium cursor-pointer transition-all hover:scale-105",
                isToday && "ring-2 ring-[var(--teal)] ring-offset-1",
                info?.type === "leave" && "bg-[var(--teal)] text-white",
                info?.type === "field" && "bg-[var(--teal-light)] text-[var(--teal-dark)]",
                info?.type === "pending" && "bg-amber-50 text-amber-600",
                !info && isWeekend && "text-muted-foreground/50",
                !info && !isWeekend && "text-foreground hover:bg-muted"
              )}
              title={info?.label}
            >
              {d}
              {info && (
                <div className="w-1 h-1 rounded-full mt-0.5 bg-current opacity-60" />
              )}
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-[var(--teal)] inline-block" />연차
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-[var(--teal-light)] border border-[var(--teal)] inline-block" />외근
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-amber-50 border border-amber-200 inline-block" />대기
        </span>
      </div>
    </div>
  );
}

// ─── Leave Request Dialog ─────────────────────────────────────────────────────

function LeaveRequestDialog() {
  const [form, setForm] = useState({ type: "연차", start: "", end: "", reason: "" });

  const handleSubmit = () => {
    if (!form.start || !form.end || !form.reason) {
      toast.error("모든 항목을 입력해주세요");
      return;
    }
    toast.success("연차 신청이 완료되었습니다", {
      description: "승인 후 잔여 연차에서 자동 차감됩니다.",
    });
  };

  return (
    <DialogContent className="max-w-md rounded-2xl">
      <DialogHeader>
        <DialogTitle className="text-lg font-bold">연차 신청</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 pt-2">
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">휴가 유형</label>
          <div className="flex gap-2">
            {["연차", "반차(오전)", "반차(오후)", "병가"].map((t) => (
              <button
                key={t}
                onClick={() => setForm({ ...form, type: t })}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  form.type === t
                    ? "bg-[var(--teal)] text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">시작일</label>
            <input
              type="date"
              value={form.start}
              onChange={(e) => setForm({ ...form, start: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-border rounded-xl outline-none focus:ring-2 focus:ring-[var(--teal)]/30"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">종료일</label>
            <input
              type="date"
              value={form.end}
              onChange={(e) => setForm({ ...form, end: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-border rounded-xl outline-none focus:ring-2 focus:ring-[var(--teal)]/30"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">사유</label>
          <textarea
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder="휴가 사유를 입력해주세요"
            rows={3}
            className="w-full px-3 py-2 text-sm border border-border rounded-xl outline-none focus:ring-2 focus:ring-[var(--teal)]/30 resize-none"
          />
        </div>
        <div className="p-3 bg-[var(--teal-light)] rounded-xl text-xs text-[var(--teal-dark)]">
          <strong>잔여 연차 7일</strong> · 승인 시 자동 차감됩니다
        </div>
        <Button
          className="w-full rounded-xl text-white"
          style={{ background: "var(--teal)" }}
          onClick={handleSubmit}
        >
          신청하기
        </Button>
      </div>
    </DialogContent>
  );
}

// ─── GPS Field Check ──────────────────────────────────────────────────────────

function FieldCheckPanel() {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const handleCheckIn = () => {
    setIsLocating(true);
    setTimeout(() => {
      setIsLocating(false);
      setIsCheckedIn(true);
      setCheckInTime(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
      toast.success("외근 시작이 기록되었습니다", {
        description: "서울 강남구 테헤란로 152 · GPS 인증 완료",
      });
    }, 1500);
  };

  const handleCheckOut = () => {
    setIsCheckedIn(false);
    toast.success("외근 종료가 기록되었습니다", {
      description: `근무 시간: ${checkInTime} ~ ${new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`,
    });
    setCheckInTime(null);
  };

  return (
    <div className="space-y-4">
      {/* GPS Status Card */}
      <div
        className={cn(
          "rounded-2xl p-5 border-2 transition-all",
          isCheckedIn
            ? "bg-[var(--teal-light)] border-[var(--teal)]"
            : "bg-white border-border"
        )}
      >
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center",
              isCheckedIn ? "bg-[var(--teal)] text-white" : "bg-muted text-muted-foreground"
            )}
          >
            <Navigation size={24} className={isLocating ? "animate-pulse" : ""} />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-foreground">
              {isCheckedIn ? "외근 진행 중" : "외근 대기 중"}
            </div>
            {isCheckedIn && checkInTime && (
              <div className="text-sm text-[var(--teal-dark)] mt-0.5">
                시작: {checkInTime} · 서울 강남구 테헤란로 152
              </div>
            )}
            {!isCheckedIn && (
              <div className="text-sm text-muted-foreground mt-0.5">
                GPS 위치 인증으로 외근을 시작하세요
              </div>
            )}
          </div>
        </div>
        <div className="mt-4">
          {!isCheckedIn ? (
            <Button
              className="w-full rounded-xl text-white gap-2"
              style={{ background: "var(--teal)" }}
              onClick={handleCheckIn}
              disabled={isLocating}
            >
              <MapPin size={16} />
              {isLocating ? "위치 확인 중..." : "외근 시작"}
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full rounded-xl gap-2 border-[var(--coral)] text-[var(--coral)] hover:bg-[var(--coral-light)]"
              onClick={handleCheckOut}
            >
              <Clock size={16} />
              외근 종료
            </Button>
          )}
        </div>
      </div>

      {/* History */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">최근 외근 기록</h3>
        <div className="space-y-2">
          {fieldCheckHistory.map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-border">
              <div
                className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  item.status === "완료" ? "bg-[var(--teal)]" : "bg-amber-400"
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground truncate">{item.location}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {item.date} · {item.checkIn} ~ {item.checkOut ?? "미완료"}
                </div>
              </div>
              <span
                className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0",
                  item.status === "완료"
                    ? "bg-[var(--teal-light)] text-[var(--teal-dark)]"
                    : "bg-amber-50 text-amber-600"
                )}
              >
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Special Leave Panel ──────────────────────────────────────────────────────

function SpecialLeavePanel() {
  const handleApply = (type: string) => {
    toast.info(`${type} 휴가 신청`, { description: "증빙 서류를 업로드해주세요" });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {specialLeaveTypes.map((item) => (
          <div
            key={item.label}
            className="p-4 bg-white rounded-2xl border border-border hover:shadow-sm transition-all cursor-pointer"
            onClick={() => handleApply(item.label)}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ background: item.color + "20" }}
            >
              <item.icon size={20} style={{ color: item.color }} />
            </div>
            <div className="font-semibold text-sm text-foreground">{item.label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">유급 {item.days}일</div>
          </div>
        ))}
      </div>

      {/* Upload */}
      <div
        className="border-2 border-dashed border-border rounded-2xl p-6 text-center cursor-pointer hover:border-[var(--teal)] hover:bg-[var(--teal-light)] transition-all"
        onClick={() => toast.info("파일 업로드", { description: "증빙 서류를 선택해주세요" })}
      >
        <Upload size={24} className="mx-auto text-muted-foreground mb-2" />
        <div className="text-sm font-medium text-foreground">증빙 서류 업로드</div>
        <div className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG · 최대 10MB</div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  return (
    <div className="p-5 lg:p-7 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">근태 · 연차 관리</h1>
          <p className="text-sm text-muted-foreground mt-0.5">2025년 5월 · 입사일 기준 자동 생성</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              className="gap-2 rounded-xl text-white text-sm"
              style={{ background: "var(--teal)" }}
            >
              <Plus size={16} />
              연차 신청
            </Button>
          </DialogTrigger>
          <LeaveRequestDialog />
        </Dialog>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Left: Leave Balance + Calendar */}
        <div className="xl:col-span-1 space-y-5">
          {/* Leave Balance Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-border">
            <h2 className="section-title mb-4">연차 현황</h2>
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

          {/* Calendar */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">2025년 5월</h2>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="w-7 h-7 rounded-lg">
                  <ChevronLeft size={14} />
                </Button>
                <Button variant="ghost" size="icon" className="w-7 h-7 rounded-lg">
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
            <MiniCalendar />
          </div>
        </div>

        {/* Right: Tabs */}
        <div className="xl:col-span-2">
          <Tabs defaultValue="history" className="h-full">
            <TabsList className="bg-muted rounded-xl p-1 mb-5">
              <TabsTrigger value="history" className="rounded-lg text-sm">연차 내역</TabsTrigger>
              <TabsTrigger value="field" className="rounded-lg text-sm">외근 체크</TabsTrigger>
              <TabsTrigger value="special" className="rounded-lg text-sm">경조사 지원</TabsTrigger>
            </TabsList>

            {/* Leave History Tab */}
            <TabsContent value="history">
              <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
                <div className="p-5 border-b border-border flex items-center justify-between">
                  <h2 className="section-title">연차 사용 내역</h2>
                  <span className="text-xs text-muted-foreground">총 {leaveHistory.length}건</span>
                </div>
                <div className="divide-y divide-border">
                  {leaveHistory.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0",
                          item.status === "승인"
                            ? "bg-[var(--teal-light)] text-[var(--teal-dark)]"
                            : "bg-amber-50 text-amber-600"
                        )}
                      >
                        {item.type}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{item.reason}</span>
                          <span
                            className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                              item.status === "승인"
                                ? "bg-[var(--teal-light)] text-[var(--teal-dark)]"
                                : "bg-amber-50 text-amber-600"
                            )}
                          >
                            {item.status}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {item.start} ~ {item.end}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="mono-num text-sm font-bold text-foreground">{item.days}일</div>
                        <div className="text-xs text-muted-foreground">차감</div>
                      </div>
                      <div className="shrink-0">
                        {item.status === "승인" ? (
                          <CheckCircle2 size={18} className="text-[var(--teal)]" />
                        ) : (
                          <AlertCircle size={18} className="text-amber-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Field Check Tab */}
            <TabsContent value="field">
              <div className="bg-[oklch(0.975_0.005_220)] rounded-2xl p-5">
                <h2 className="section-title mb-4">모바일 외근 체크</h2>
                <FieldCheckPanel />
              </div>
            </TabsContent>

            {/* Special Leave Tab */}
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
