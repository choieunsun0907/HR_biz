/**
 * EmployeesPage — TeamPulse Employee Management
 * Design: Soft Teal Clarity
 * Features:
 * - 직원 카드 뷰 / 테이블 뷰 전환
 * - 이름·부서·직책·스킬 통합 검색
 * - 부서·재직 상태·직급 필터
 * - 우측 슬라이드 상세 프로필 패널
 * - 신규 직원 등록 모달 (3단계 폼)
 * - 기존 직원 정보 수정 모달
 */

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Search,
  LayoutGrid,
  List,
  ChevronDown,
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Star,
  TrendingUp,
  MoreHorizontal,
  UserPlus,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  ChevronRight,
  Briefcase,
  Building2,
  CheckCircle2,
  Pencil,
  CalendarPlus,
  Minus,
  Plus,
  Users,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import EmployeeFormModal, { EmployeeFormData } from "@/components/EmployeeFormModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Employee {
  id: number;
  name: string;
  avatar: string;
  dept: string;
  role: string;
  grade: string;
  status: "재직" | "휴직" | "수습";
  email: string;
  phone: string;
  location: string;
  joinDate: string;
  birthDate: string;
  manager: string;
  engagementScore: number;
  leaveBalance: number;
  leaveUsed: number;
  attendanceRate: number;
  skills: string[];
  recentActivity: { date: string; content: string }[];
  color: string;
  memo?: string;
}

// ─── DB 응답 → Employee 매핑 헬퍼 ──────────────────────────────────────────────

function mapRow(e: Record<string, unknown>): Employee {
  return {
    id: e.id as number,
    name: String(e.name ?? ""),
    avatar: String(e.avatar ?? String(e.name ?? "").slice(0, 2)),
    dept: String(e.dept ?? ""),
    role: String(e.role ?? ""),
    grade: String(e.grade ?? ""),
    status: (e.status as Employee["status"]) ?? "재직",
    email: String(e.email ?? ""),
    phone: String(e.phone ?? ""),
    location: String(e.location ?? ""),
    joinDate: String(e.join_date ?? e.joinDate ?? ""),
    birthDate: String(e.birth_date ?? e.birthDate ?? ""),
    manager: String(e.manager ?? ""),
    engagementScore: Number(e.engagement_score ?? e.engagementScore ?? 80),
    leaveBalance: Number(e.leave_balance ?? e.leaveBalance ?? 15),
    leaveUsed: Number(e.leave_used ?? e.leaveUsed ?? 0),
    attendanceRate: Number(e.attendance_rate ?? e.attendanceRate ?? 100),
    skills: Array.isArray(e.skills) ? e.skills : (typeof e.skills === "string" ? e.skills.split(",").map((s: string) => s.trim()).filter(Boolean) : []),
    recentActivity: Array.isArray(e.recentActivity) ? e.recentActivity : (Array.isArray(e.recent_activity) ? e.recent_activity : []),
    color: String(e.color ?? "oklch(0.65 0.14 185)"),
    memo: e.memo ? String(e.memo) : undefined,
  };
}

const INITIAL_EMPLOYEES: Employee[] = [];
const STATUSES = ["전체", "재직", "수습", "휴직"];

// DB 마스터 데이터 훅 (필터 드롭다운용)
function useMasterFilter(type: string) {
  const [items, setItems] = useState<string[]>(["전체"]);
  useEffect(() => {
    fetch(`/api/master/${type}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setItems(["전체", ...(d.items || []).map((i: { name: string }) => i.name)]))
      .catch(() => {});
  }, [type]);
  return items;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Employee["status"] }) {
  const map = {
    재직: "bg-emerald-50 text-emerald-600",
    수습: "bg-amber-50 text-amber-600",
    휴직: "bg-slate-100 text-slate-500",
  };
  return (
    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", map[status])}>
      {status}
    </span>
  );
}

function ScoreBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = (value / max) * 100;
  const color =
    pct >= 90 ? "var(--teal)" : pct >= 75 ? "oklch(0.65 0.18 60)" : "oklch(0.65 0.20 25)";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="mono-num text-xs font-semibold text-foreground w-8 text-right">{value}</span>
    </div>
  );
}

// ─── Employee Card ────────────────────────────────────────────────────────────

function EmployeeCard({
  emp,
  onClick,
  selected,
}: {
  emp: Employee;
  onClick: () => void;
  selected: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl p-5 border-2 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
        selected ? "border-[var(--teal)] shadow-md" : "border-transparent shadow-sm"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="w-12 h-12">
              <AvatarFallback
                className="text-sm font-bold text-white"
                style={{ background: emp.color }}
              >
                {emp.avatar}
              </AvatarFallback>
            </Avatar>
            {emp.status === "재직" && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
            )}
          </div>
          <div>
            <div className="font-bold text-foreground text-sm">{emp.name}</div>
            <div className="text-xs text-muted-foreground">{emp.role}</div>
          </div>
        </div>
        <StatusBadge status={emp.status} />
      </div>
      <div className="space-y-1.5 mb-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Building2 size={12} className="shrink-0" />
          <span>{emp.dept} · {emp.grade}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar size={12} className="shrink-0" />
          <span>입사 {emp.joinDate}</span>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
          <span>참여 점수</span>
          <span>출석률 <span className="mono-num font-semibold text-foreground">{emp.attendanceRate}%</span></span>
        </div>
        <ScoreBar value={emp.engagementScore} />
      </div>
      <div className="flex flex-wrap gap-1 mt-3">
        {emp.skills.slice(0, 3).map((s) => (
          <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {s}
          </span>
        ))}
        {emp.skills.length > 3 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            +{emp.skills.length - 3}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  emp,
  onClose,
  onEdit,
}: {
  emp: Employee;
  onClose: () => void;
  onEdit: (emp: Employee) => void;
}) {
  const leaveTotal = emp.leaveBalance + emp.leaveUsed;
  const leavePct = leaveTotal > 0 ? (emp.leaveUsed / leaveTotal) * 100 : 0;

  return (
    <div className="flex flex-col h-full bg-white border-l border-border">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="w-14 h-14">
              <AvatarFallback
                className="text-base font-bold text-white"
                style={{ background: emp.color }}
              >
                {emp.avatar}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-bold text-foreground">{emp.name}</span>
                <StatusBadge status={emp.status} />
              </div>
              <div className="text-sm text-muted-foreground">{emp.role}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{emp.dept} · {emp.grade}</div>
            </div>
          </div>
          <button
            className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-4">
          <Button
            size="sm"
            className="flex-1 rounded-xl text-white text-xs gap-1.5"
            style={{ background: "var(--teal)" }}
            onClick={() => toast.info(`${emp.name}에게 메시지 전송`)}
          >
            <Mail size={13} />
            메시지
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 rounded-xl text-xs gap-1.5"
            onClick={() => onEdit(emp)}
          >
            <Pencil size={13} />
            수정
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="rounded-xl px-2.5">
                <MoreHorizontal size={15} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem onClick={() => toast.info("재직증명서 발급")}>재직증명서 발급</DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("급여 명세서 조회")}>급여 명세서 조회</DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("인사 발령 처리")}>인사 발령</DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => toast.error("퇴사 처리는 관리자 승인이 필요합니다")}
              >
                퇴사 처리
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-6 py-5 space-y-6">
          {/* Contact Info */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
              연락처 정보
            </h3>
            <div className="space-y-2.5">
              {[
                { icon: Mail, label: emp.email },
                { icon: Phone, label: emp.phone || "—" },
                { icon: MapPin, label: emp.location },
                { icon: Calendar, label: `입사일 ${emp.joinDate}` },
                { icon: Clock, label: `생년월일 ${emp.birthDate || "—"}` },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3 text-sm">
                  <Icon size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-foreground">{label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Attendance & Leave */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
              근태 · 연차 현황
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-[var(--teal-light)] rounded-xl p-3 text-center">
                <div className="mono-num text-xl font-bold text-[var(--teal-dark)]">{emp.attendanceRate}%</div>
                <div className="text-xs text-[var(--teal-dark)]/70 mt-0.5">이번 달 출석률</div>
              </div>
              <div className="bg-muted rounded-xl p-3 text-center">
                <div className="mono-num text-xl font-bold text-foreground">{emp.leaveBalance}일</div>
                <div className="text-xs text-muted-foreground mt-0.5">잔여 연차</div>
              </div>
            </div>
            <div className="bg-white border border-border rounded-xl p-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span>연차 사용 현황</span>
                <span className="mono-num font-semibold text-foreground">
                  {emp.leaveUsed} / {leaveTotal}일
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${leavePct}%`, background: "var(--teal)" }}
                />
              </div>
            </div>
          </section>

          {/* Engagement */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
              참여 지표
            </h3>
            <div className="space-y-3">
              {[
                { label: "참여 점수", value: emp.engagementScore, icon: Star },
                { label: "출석률", value: emp.attendanceRate, icon: CheckCircle2 },
                { label: "업무 효율", value: Math.min(100, emp.engagementScore + 3), icon: TrendingUp },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label}>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                    <Icon size={12} />
                    {label}
                  </div>
                  <ScoreBar value={value} />
                </div>
              ))}
            </div>
          </section>

          {/* Skills */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
              보유 스킬
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {emp.skills.length > 0 ? emp.skills.map((s) => (
                <span
                  key={s}
                  className="text-xs px-2.5 py-1 rounded-lg font-medium"
                  style={{ background: emp.color + "18", color: emp.color }}
                >
                  {s}
                </span>
              )) : <span className="text-xs text-muted-foreground">등록된 스킬 없음</span>}
            </div>
          </section>

          {/* Memo */}
          {emp.memo && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
                메모
              </h3>
              <p className="text-xs text-foreground bg-muted/40 rounded-xl p-3 leading-relaxed">{emp.memo}</p>
            </section>
          )}

          {/* Recent Activity */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
              최근 활동
            </h3>
            <div className="space-y-2">
              {emp.recentActivity.map((act, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                    style={{ background: emp.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-foreground">{act.content}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">{act.date}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Manager */}
          {emp.manager && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
                직속 상관
              </h3>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs font-bold text-white" style={{ background: "var(--teal)" }}>
                    {emp.manager.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-semibold text-foreground">{emp.manager}</div>
                  <div className="text-xs text-muted-foreground">{emp.dept}</div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto rounded-lg w-7 h-7"
                  onClick={() => toast.info(`${emp.manager}에게 메시지`)}
                >
                  <Mail size={13} />
                </Button>
              </div>
            </section>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Filter Chip ──────────────────────────────────────────────────────────────

function FilterChip({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
            value !== "전체"
              ? "bg-[var(--teal)] text-white border-[var(--teal)]"
              : "bg-white text-muted-foreground border-border hover:border-[var(--teal)] hover:text-[var(--teal)]"
          )}
        >
          {label}{value !== "전체" ? `: ${value}` : ""}
          <ChevronDown size={12} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="rounded-xl min-w-32">
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt}
            className={cn("text-xs rounded-lg", value === opt && "font-semibold text-[var(--teal)]")}
            onClick={() => onChange(opt)}
          >
            {opt}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ─── DB에서 직원 목록 로드 ────────────────────────────────────────────
  const loadEmployees = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/employees", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setEmployees((data.employees as Record<string, unknown>[]).map(mapRow));
    } catch {
      toast.error("직원 데이터를 불러오는 데 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);
  const [query, setQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("전체");
  const [statusFilter, setStatusFilter] = useState("전체");
  const [gradeFilter, setGradeFilter] = useState("전체");
  // DB 마스터 데이터 로드
  const DEPTS = useMasterFilter("departments");
  const GRADES = useMasterFilter("grades");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Partial<EmployeeFormData> | null>(null);

  const xlsxUploadRef = useRef<HTMLInputElement>(null);

  // ─── 엑셀 내보내기 ──────────────────────────────────────────────
  const handleExportExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const rows = filtered.map((e) => ({
        "이름": e.name,
        "부서": e.dept,
        "직책": e.role,
        "직급": e.grade,
        "재직상태": e.status,
        "이메일": e.email,
        "연락처": e.phone,
        "근무지": e.location,
        "입사일": e.joinDate,
        "생년월일": e.birthDate,
        "담당매니저": e.manager,
        "잔여연차": e.leaveBalance,
        "사용연차": e.leaveUsed,
        "근무율(%)": e.attendanceRate,
        "스킬": e.skills.join(", "),
        "메모": e.memo || "",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "직원목록");
      const date = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `직원목록_${date}.xlsx`);
      toast.success("엑셀 파일이 다운로드되었습니다");
    } catch {
      toast.error("내보내기 실패");
    }
  };

  // ─── PDF 내보내기 ───────────────────────────────────────────────
  const handleExportPDF = async () => {
    try {
      const [{ default: jsPDF }] = await Promise.all([import("jspdf")]);
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const date = new Date().toLocaleDateString("ko-KR");
      doc.setFillColor(16, 185, 129);
      doc.rect(0, 0, pageW, 18, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("직원 목록", 14, 12);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`출력일: ${date}  /  전체 ${filtered.length}명`, pageW - 14, 12, { align: "right" });
      const headers = ["이름", "부서", "직책", "직급", "재직상태", "이메일", "연락처", "입사일", "잔여연차"];
      const colWidths = [22, 24, 36, 16, 18, 52, 28, 22, 18];
      let y = 24;
      const rowH = 7;
      doc.setFillColor(240, 253, 250);
      doc.rect(10, y, pageW - 20, rowH, "F");
      doc.setTextColor(16, 185, 129);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      let x = 10;
      headers.forEach((h, i) => { doc.text(h, x + 1, y + 5); x += colWidths[i]; });
      y += rowH;
      doc.setFont("helvetica", "normal");
      filtered.forEach((e, idx) => {
        if (y + rowH > pageH - 10) { doc.addPage(); y = 14; }
        if (idx % 2 === 0) { doc.setFillColor(250, 250, 252); doc.rect(10, y, pageW - 20, rowH, "F"); }
        doc.setTextColor(30, 30, 30);
        const cells = [e.name, e.dept, e.role, e.grade, e.status, e.email, e.phone, e.joinDate, String(e.leaveBalance)];
        x = 10;
        cells.forEach((cell, i) => {
          const txt = doc.splitTextToSize(cell, colWidths[i] - 2)[0] ?? "";
          doc.text(txt, x + 1, y + 5);
          x += colWidths[i];
        });
        y += rowH;
      });
      doc.save(`직원목록_${date.replace(/\./g, "")}.pdf`);
      toast.success("PDF 파일이 다운로드되었습니다");
    } catch {
      toast.error("PDF 내보내기 실패");
    }
  };

  // ─── 엑셀 업로드 ───────────────────────────────────────────────
  const handleXlsxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
      if (rows.length === 0) { toast.error("데이터가 없습니다"); return; }
      const newEmps: Employee[] = rows.map((row, idx) => ({
        id: Date.now() + idx,
        name: String(row["이름"] ?? row["name"] ?? "").trim(),
        avatar: String(row["이름"] ?? row["name"] ?? "").trim(),
        dept: String(row["부서"] ?? row["dept"] ?? "").trim(),
        role: String(row["직책"] ?? row["role"] ?? "").trim(),
        grade: String(row["직급"] ?? row["grade"] ?? "일반").trim(),
        status: (String(row["재직상태"] ?? "재직") as Employee["status"]),
        email: String(row["이메일"] ?? row["email"] ?? "").trim(),
        phone: String(row["연락처"] ?? row["phone"] ?? "").trim(),
        location: String(row["근무지"] ?? row["location"] ?? "").trim(),
        joinDate: String(row["입사일"] ?? row["joinDate"] ?? "").trim(),
        birthDate: String(row["생년월일"] ?? row["birthDate"] ?? "").trim(),
        manager: String(row["담당매니저"] ?? row["manager"] ?? "").trim(),
        engagementScore: 80,
        leaveBalance: Number(row["잔여연차"] ?? 15),
        leaveUsed: Number(row["사용연차"] ?? 0),
        attendanceRate: Number(row["근무율(%)"] ?? 100),
        skills: [],
        recentActivity: [{ date: new Date().toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" }).replace(". ", ".").replace(".", ""), content: "엑셀에서 등록되었습니다" }],
        color: `oklch(0.65 0.14 ${(idx * 37) % 360})`,
        memo: String(row["메모"] ?? ""),
      })).filter((e) => e.name);
      if (newEmps.length === 0) { toast.error("유효한 직원 데이터가 없습니다 (이름 필드 필수)"); return; }
      // API로 일괄 등록
      const bulkRes = await fetch("/api/employees/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ employees: newEmps.map((e) => ({
          name: e.name, avatar: e.avatar, dept: e.dept, role: e.role, grade: e.grade,
          status: e.status, email: e.email, phone: e.phone, location: e.location,
          join_date: e.joinDate, birth_date: e.birthDate, manager: e.manager,
          engagement_score: e.engagementScore, leave_balance: e.leaveBalance,
          leave_used: e.leaveUsed, attendance_rate: e.attendanceRate,
          skills: e.skills, color: e.color, memo: e.memo || "",
        })) }),
      });
      if (!bulkRes.ok) throw new Error("서버 등록 실패");
      await loadEmployees();
      toast.success(`${newEmps.length}명의 직원이 등록되었습니다`);
    } catch {
      toast.error("엑셀 파일 읽기 실패");
    }
  };

  // Bulk leave state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkLeaveOpen, setBulkLeaveOpen] = useState(false);
  const [bulkLeaveMode, setBulkLeaveMode] = useState<"add" | "set">("add");
  const [bulkLeaveAmount, setBulkLeaveAmount] = useState(1);
  const [bulkApplying, setBulkApplying] = useState(false);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((e) => next.delete(e.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((e) => next.add(e.id));
        return next;
      });
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkLeaveApply = async () => {
    setBulkApplying(true);
    try {
      const targets = employees.filter((e) => selectedIds.has(e.id));
      await Promise.all(targets.map(async (e) => {
        const newBalance = bulkLeaveMode === "add" ? e.leaveBalance + bulkLeaveAmount : bulkLeaveAmount;
        await fetch(`/api/employees/${e.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: e.name, avatar: e.avatar, dept: e.dept, role: e.role, grade: e.grade,
            status: e.status, email: e.email, phone: e.phone, location: e.location,
            join_date: e.joinDate, birth_date: e.birthDate, manager: e.manager,
            skills: e.skills, engagement_score: e.engagementScore,
            leave_balance: newBalance, leave_used: e.leaveUsed,
            attendance_rate: e.attendanceRate, color: e.color, memo: e.memo || "",
          }),
        });
      }));
      await loadEmployees();
      const modeLabel = bulkLeaveMode === "add" ? `+${bulkLeaveAmount}일 추가` : `${bulkLeaveAmount}일로 설정`;
      toast.success(`연차 일괄 부여 완료`, {
        description: `${selectedIds.size}명에게 연차 ${modeLabel}`,
      });
      setBulkLeaveOpen(false);
      clearSelection();
    } catch {
      toast.error("연차 부여에 실패했습니다");
    } finally {
      setBulkApplying(false);
    }
  };

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const q = query.toLowerCase();
      const matchQuery =
        !q ||
        e.name.includes(q) ||
        e.dept.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q) ||
        e.skills.some((s) => s.toLowerCase().includes(q));
      const matchDept = deptFilter === "전체" || e.dept === deptFilter;
      const matchStatus = statusFilter === "전체" || e.status === statusFilter;
      const matchGrade = gradeFilter === "전체" || e.grade === gradeFilter;
      return matchQuery && matchDept && matchStatus && matchGrade;
    });
  }, [employees, query, deptFilter, statusFilter, gradeFilter]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((e) => selectedIds.has(e.id));
  const someFilteredSelected = filtered.some((e) => selectedIds.has(e.id)) && !allFilteredSelected;

  const activeFilters = [deptFilter, statusFilter, gradeFilter].filter((f) => f !== "전체").length;

  const clearFilters = () => {
    setDeptFilter("전체");
    setStatusFilter("전체");
    setGradeFilter("전체");
    setQuery("");
  };

  const handleSelectEmp = (emp: Employee) => {
    setSelectedEmp((prev) => (prev?.id === emp.id ? null : emp));
  };

  // Open modal for new employee
  const handleAddEmployee = () => {
    setEditTarget(null);
    setModalOpen(true);
  };

  // Open modal for editing
  const handleEditEmployee = (emp: Employee) => {
    setEditTarget({
      id: emp.id,
      name: emp.name,
      dept: emp.dept,
      role: emp.role,
      grade: emp.grade,
      status: emp.status,
      email: emp.email,
      phone: emp.phone,
      location: emp.location,
      joinDate: emp.joinDate,
      birthDate: emp.birthDate,
      manager: emp.manager,
      skills: emp.skills,
      engagementScore: emp.engagementScore,
      memo: emp.memo || "",
      color: emp.color,
      avatar: emp.avatar,
      leaveTotal: emp.leaveBalance,
    });
    setModalOpen(true);
  };

  // Handle form submit (add or update) - API 연동
  const handleFormSubmit = async (data: EmployeeFormData) => {
    try {
      const payload = {
        name: data.name,
        avatar: data.avatar || data.name,
        dept: data.dept,
        role: data.role,
        grade: data.grade,
        status: data.status,
        email: data.email,
        phone: data.phone,
        location: data.location,
        join_date: data.joinDate,
        birth_date: data.birthDate,
        manager: data.manager,
        skills: data.skills,
        engagement_score: data.engagementScore,
        leave_balance: data.leaveTotal,
        memo: data.memo,
        color: data.color,
      };
      if (data.id) {
        // 수정
        const res = await fetch(`/api/employees/${data.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        const result = await res.json();
        const updated = mapRow(result.employee);
        setEmployees((prev) => prev.map((e) => e.id === updated.id ? updated : e));
        if (selectedEmp?.id === updated.id) setSelectedEmp(updated);
        toast.success(`${updated.name} 정보가 수정되었습니다`);
      } else {
        // 신규 등록
        const res = await fetch("/api/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        const result = await res.json();
        const newEmp = mapRow(result.employee);
        setEmployees((prev) => [newEmp, ...prev]);
        toast.success(`${newEmp.name} 직원이 등록되었습니다`);
      }
    } catch (err) {
      toast.error("저장에 실패했습니다: " + String(err));
    }
  };

  return (
    <div className="flex h-full page-enter">
      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Page Header */}
        <div className="px-5 lg:px-7 pt-5 lg:pt-7 pb-4 bg-[oklch(0.975_0.005_220)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">직원 관리</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                전체 <span className="mono-num font-semibold text-foreground">{employees.length}</span>명 ·
                검색 결과 <span className="mono-num font-semibold text-foreground">{filtered.length}</span>명
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <>
                  <span className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground mono-num">{selectedIds.size}</span>명 선택됨
                  </span>
                  <Button
                    size="sm"
                    className="gap-1.5 rounded-xl text-xs text-white"
                    style={{ background: "var(--coral)" }}
                    onClick={() => { setBulkLeaveAmount(1); setBulkLeaveMode("add"); setBulkLeaveOpen(true); }}
                  >
                    <CalendarPlus size={13} />
                    연차 일괄 부여
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 rounded-xl text-xs"
                    onClick={clearSelection}
                  >
                    <X size={13} />
                    선택 해제
                  </Button>
                </>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-xs">
                    <Download size={13} />
                    내보내기
                    <ChevronDown size={11} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={handleExportExcel} className="gap-2 text-xs cursor-pointer">
                    <FileSpreadsheet size={13} className="text-green-600" />
                    엑셀 다운로드
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPDF} className="gap-2 text-xs cursor-pointer">
                    <FileText size={13} className="text-red-500" />
                    PDF 다운로드
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <input ref={xlsxUploadRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleXlsxUpload} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="gap-1.5 rounded-xl text-xs text-white" style={{ background: "var(--teal)" }}>
                    <UserPlus size={13} />
                    직원 추가
                    <ChevronDown size={11} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={handleAddEmployee} className="gap-2 text-xs cursor-pointer">
                    <UserPlus size={13} />
                    직접 등록
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => xlsxUploadRef.current?.click()} className="gap-2 text-xs cursor-pointer">
                    <Upload size={13} className="text-green-600" />
                    엑셀 업로드
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-48 max-w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="이름, 부서, 직책, 스킬 검색..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white rounded-xl border border-border outline-none focus:ring-2 focus:ring-[var(--teal)]/30 placeholder:text-muted-foreground/60 transition-all"
              />
              {query && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setQuery("")}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <FilterChip label="부서" options={DEPTS} value={deptFilter} onChange={setDeptFilter} />
            <FilterChip label="재직 상태" options={STATUSES} value={statusFilter} onChange={setStatusFilter} />
            <FilterChip label="직급" options={GRADES} value={gradeFilter} onChange={setGradeFilter} />

            {activeFilters > 0 && (
              <button
                className="flex items-center gap-1 text-xs text-[var(--coral)] font-medium hover:underline"
                onClick={clearFilters}
              >
                <X size={12} />
                필터 초기화
              </button>
            )}

            <div className="ml-auto flex items-center gap-1 bg-white border border-border rounded-xl p-1">
              <button
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  viewMode === "card" ? "bg-[var(--teal)] text-white" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setViewMode("card")}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  viewMode === "table" ? "bg-[var(--teal)] text-white" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setViewMode("table")}
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 lg:px-7 py-5">
          {/* 로딩 상태 */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-8 h-8 border-3 border-[var(--teal)]/30 border-t-[var(--teal)] rounded-full animate-spin mb-4" />
              <p className="text-sm text-muted-foreground">직원 데이터를 불러오는 중...</p>
            </div>
          ) : null}

          {/* 카드 뷰 선택 안내 */}
          {!isLoading && viewMode === "card" && filtered.length > 0 && (
            <div className="flex items-center gap-3 mb-3 px-1">
              <Checkbox
                checked={allFilteredSelected ? true : someFilteredSelected ? "indeterminate" : false}
                onCheckedChange={toggleSelectAll}
                className="rounded-md"
              />
              <span className="text-xs text-muted-foreground">
                {allFilteredSelected ? "전체 선택 해제" : "전체 선택"}
              </span>
              {selectedIds.size > 0 && (
                <span className="text-xs text-[var(--coral)] font-medium">
                  {selectedIds.size}명 선택
                </span>
              )}
            </div>
          )}

          {!isLoading && filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search size={40} className="text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-foreground">검색 결과가 없습니다</p>
              <p className="text-xs text-muted-foreground mt-1">다른 검색어나 필터를 시도해보세요</p>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={clearFilters}>
                  필터 초기화
                </Button>
                <Button
                  size="sm"
                  className="rounded-xl text-xs text-white gap-1.5"
                  style={{ background: "var(--teal)" }}
                  onClick={handleAddEmployee}
                >
                  <UserPlus size={13} />
                  직원 추가
                </Button>
              </div>
            </div>
          ) : !isLoading && viewMode === "card" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 stagger">
              {filtered.map((emp) => (
                <div key={emp.id} className="relative">
                  {/* 체크박스 오버레이 */}
                  <div
                    className="absolute top-3 left-3 z-10"
                    onClick={(e) => { e.stopPropagation(); toggleSelect(emp.id); }}
                  >
                    <Checkbox
                      checked={selectedIds.has(emp.id)}
                      onCheckedChange={() => toggleSelect(emp.id)}
                      className="rounded-md bg-white/90 shadow-sm"
                    />
                  </div>
                  <div
                    className={cn(
                      "transition-all duration-150",
                      selectedIds.has(emp.id) && "ring-2 ring-[var(--coral)] ring-offset-1 rounded-2xl"
                    )}
                  >
                    <EmployeeCard
                      emp={emp}
                      onClick={() => handleSelectEmp(emp)}
                      selected={selectedEmp?.id === emp.id}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : !isLoading ? (
            <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
              {/* 테이블 뷰 */}
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 w-10">
                      <Checkbox
                        checked={allFilteredSelected ? true : someFilteredSelected ? "indeterminate" : false}
                        onCheckedChange={toggleSelectAll}
                        className="rounded-md"
                      />
                    </th>
                    {["직원", "부서 · 직급", "재직 상태", "입사일", "출석률", "참여 점수", "연차 잔여", ""].map((h) => (
                      <th
                        key={h}
                        className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((emp) => (
                    <tr
                      key={emp.id}
                      className={cn(
                        "hover:bg-muted/30 transition-colors cursor-pointer",
                        selectedEmp?.id === emp.id && "bg-[var(--teal-light)]",
                        selectedIds.has(emp.id) && "bg-orange-50/60"
                      )}
                      onClick={() => handleSelectEmp(emp)}
                    >
                      <td className="px-4 py-3" onClick={(e) => { e.stopPropagation(); toggleSelect(emp.id); }}>
                        <Checkbox
                          checked={selectedIds.has(emp.id)}
                          onCheckedChange={() => toggleSelect(emp.id)}
                          className="rounded-md"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8 shrink-0">
                            <AvatarFallback
                              className="text-xs font-bold text-white"
                              style={{ background: emp.color }}
                            >
                              {emp.avatar}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-semibold text-foreground">{emp.name}</div>
                            <div className="text-xs text-muted-foreground">{emp.role}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                        {emp.dept} · <span className="text-muted-foreground">{emp.grade}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={emp.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {emp.joinDate}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 min-w-24">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${emp.attendanceRate}%`,
                                background: emp.attendanceRate >= 95 ? "var(--teal)" : "oklch(0.65 0.18 60)",
                              }}
                            />
                          </div>
                          <span className="mono-num text-xs font-semibold text-foreground w-9 text-right">
                            {emp.attendanceRate}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Star size={12} className="text-amber-400" />
                          <span className="mono-num text-sm font-semibold text-foreground">{emp.engagementScore}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="mono-num text-sm font-semibold text-foreground">{emp.leaveBalance}</span>
                        <span className="text-xs text-muted-foreground">일</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 rounded-lg"
                            title="수정"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditEmployee(emp);
                            }}
                          >
                            <Pencil size={13} className="text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 rounded-lg"
                            title="상세 보기"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectEmp(emp);
                            }}
                          >
                            <ChevronRight size={14} className="text-muted-foreground" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedEmp && (
        <div
          className="w-80 xl:w-96 shrink-0 overflow-hidden"
          style={{ animation: "slideInRight 0.2s cubic-bezier(0.23, 1, 0.32, 1) both" }}
        >
          <DetailPanel
            emp={selectedEmp}
            onClose={() => setSelectedEmp(null)}
            onEdit={handleEditEmployee}
          />
        </div>
      )}

      {/* Employee Form Modal */}
      <EmployeeFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editTarget}
      />

      {/* Bulk Leave Modal */}
      <Dialog open={bulkLeaveOpen} onOpenChange={(v) => !v && setBulkLeaveOpen(false)}>
        <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-base">
              <CalendarPlus size={18} className="text-[var(--coral)]" />
              연차 일괄 부여
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 py-5 space-y-5">
            {/* 대상 직원 요약 */}
            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl border border-orange-100">
              <Users size={16} className="text-[var(--coral)] shrink-0" />
              <div>
                <div className="text-sm font-semibold text-foreground">
                  <span className="mono-num text-[var(--coral)]">{selectedIds.size}</span>명 선택됨
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {Array.from(selectedIds)
                    .slice(0, 3)
                    .map((id) => employees.find((e) => e.id === id)?.name)
                    .filter(Boolean)
                    .join(", ")}
                  {selectedIds.size > 3 && ` 외 ${selectedIds.size - 3}명`}
                </div>
              </div>
            </div>

            {/* 부여 방식 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">부여 방식</label>
              <div className="grid grid-cols-2 gap-2">
                {(["add", "set"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setBulkLeaveMode(mode)}
                    className={cn(
                      "py-2.5 px-3 rounded-xl text-sm font-medium border transition-all",
                      bulkLeaveMode === mode
                        ? "bg-[var(--coral)] text-white border-[var(--coral)]"
                        : "bg-white text-muted-foreground border-border hover:border-[var(--coral)]/50"
                    )}
                  >
                    {mode === "add" ? "+ 추가 부여" : "= 일괄 설정"}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                {bulkLeaveMode === "add"
                  ? "현재 잔여 연차에 입력한 일수를 더합니다"
                  : "현재 잔여 연차를 입력한 일수로 덮어씁니다"}
              </p>
            </div>

            {/* 일수 입력 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {bulkLeaveMode === "add" ? "추가할 연차 일수" : "설정할 연차 일수"}
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setBulkLeaveAmount((v) => Math.max(0, v - 1))}
                  className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={bulkLeaveAmount}
                  onChange={(e) => setBulkLeaveAmount(Math.max(0, Math.min(365, Number(e.target.value))))}
                  className="flex-1 text-center text-2xl font-bold mono-num text-foreground border border-border rounded-xl py-2 outline-none focus:ring-2 focus:ring-[var(--coral)]/30"
                />
                <button
                  onClick={() => setBulkLeaveAmount((v) => Math.min(365, v + 1))}
                  className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
              <p className="text-center text-xs text-muted-foreground mt-1.5">일 (0~365)</p>
            </div>

            {/* 미리보기 */}
            {bulkLeaveMode === "add" && bulkLeaveAmount > 0 && (
              <div className="p-3 bg-muted/40 rounded-xl text-xs text-muted-foreground">
                <span className="font-medium text-foreground">예시:</span> 잔여 연차 10일인 직원 →{" "}
                <span className="font-bold text-[var(--teal-dark)] mono-num">{10 + bulkLeaveAmount}일</span>로 변경
              </div>
            )}
          </div>

          <DialogFooter className="px-6 pb-6 pt-0 flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => setBulkLeaveOpen(false)}
              disabled={bulkApplying}
            >
              취소
            </Button>
            <Button
              className="flex-1 rounded-xl text-white gap-2"
              style={{ background: "var(--coral)" }}
              onClick={handleBulkLeaveApply}
              disabled={bulkApplying}
            >
              {bulkApplying ? (
                <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />적용 중...</>
              ) : (
                <><CalendarPlus size={14} />{selectedIds.size}명에게 적용</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pageIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
