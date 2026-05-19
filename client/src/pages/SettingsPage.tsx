/**
 * SettingsPage — TeamPulse 시스템 설정
 * Design: Soft Teal Clarity
 *
 * 탭 구성:
 * 1. 연차 정책 — 계산 방식, 근속연수별 일수 테이블, 상한 설정
 * 2. 전환 시뮬레이션 — 입사일→회계연도 기준 전환 일할 계산 미리보기 & 일괄 적용
 * 3. 알림 설정
 * 4. 회사 정보
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  CalendarDays,
  Bell,
  Building2,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Info,
  CheckCircle2,
  ArrowRightLeft,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Play,
  CheckSquare,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Shield,
  KeyRound,
  UserPlus,
  UserX,
  Eye,
  EyeOff,
  RefreshCw,
  Pencil,
  X,
  MapPin,
  Briefcase,
  Tag,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  LeavePolicy,
  LeavePolicyRule,
  DEFAULT_POLICY,
  loadPolicy,
  savePolicy,
  calcLeaveByPolicy,
  formatTenure,
  formatRatio,
  simulateTransition,
  TransitionEmployee,
  TransitionResult,
  RoundingMode,
} from "@/lib/leavePolicy";

// ─── 탭 정의 ──────────────────────────────────────────────────────────────────

const TABS = [
  { id: "leave",      label: "연차 정책",      icon: CalendarDays },
  { id: "transition", label: "전환 시뮬레이션", icon: ArrowRightLeft },
  { id: "accounts",   label: "계정 관리",       icon: Users },
  { id: "notification", label: "알림 설정",    icon: Bell },
  { id: "company",    label: "회사 정보",       icon: Building2 },
  { id: "master",     label: "조직 마스터",     icon: Briefcase },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── 샘플 직원 데이터 (시뮬레이션용) ──────────────────────────────────────────

const SAMPLE_EMPLOYEES: TransitionEmployee[] = [
  { id: 1,  name: "김민준", dept: "개발팀",  joinDate: "2019-03-15", currentLeave: 12, usedLeave: 3 },
  { id: 2,  name: "이서연", dept: "마케팅",  joinDate: "2021-07-01", currentLeave: 10, usedLeave: 5 },
  { id: 3,  name: "박지훈", dept: "디자인",  joinDate: "2015-01-10", currentLeave: 18, usedLeave: 2 },
  { id: 4,  name: "최수아", dept: "영업팀",  joinDate: "2023-11-20", currentLeave: 8,  usedLeave: 1 },
  { id: 5,  name: "정도현", dept: "인사팀",  joinDate: "2018-05-03", currentLeave: 15, usedLeave: 7 },
  { id: 6,  name: "강하은", dept: "재무팀",  joinDate: "2020-09-14", currentLeave: 11, usedLeave: 4 },
  { id: 7,  name: "윤성민", dept: "개발팀",  joinDate: "2024-02-01", currentLeave: 5,  usedLeave: 0 },
  { id: 8,  name: "임지은", dept: "마케팅",  joinDate: "2016-08-22", currentLeave: 20, usedLeave: 6 },
  { id: 9,  name: "한승우", dept: "운영팀",  joinDate: "2022-04-11", currentLeave: 9,  usedLeave: 2 },
  { id: 10, name: "오나연", dept: "디자인",  joinDate: "2024-08-05", currentLeave: 4,  usedLeave: 0 },
  { id: 11, name: "신재원", dept: "개발팀",  joinDate: "2013-12-01", currentLeave: 22, usedLeave: 8 },
  { id: 12, name: "배소희", dept: "인사팀",  joinDate: "2017-06-30", currentLeave: 17, usedLeave: 3 },
];

// ─── 연차 정책 탭 ─────────────────────────────────────────────────────────────

function LeavePolicyTab() {
  const [policy, setPolicy] = useState<LeavePolicy>(() => loadPolicy());
  const [saved, setSaved] = useState(false);
  const [previewDate, setPreviewDate] = useState("");

  const preview = previewDate
    ? calcLeaveByPolicy(previewDate, policy)
    : null;

  const handleSave = () => {
    savePolicy(policy);
    setSaved(true);
    toast.success("연차 정책이 저장되었습니다", {
      description: `${policy.calcMode === "tenure" ? "근속연수 기반" : "회계연도 기반"} · 최대 ${policy.maxDays}일`,
    });
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setPolicy({ ...DEFAULT_POLICY });
    toast.info("기본값(근로기준법 기준)으로 초기화되었습니다");
  };

  const updateRule = (idx: number, field: keyof LeavePolicyRule, value: string | number) => {
    setPolicy((prev) => {
      const rules = [...prev.rules];
      rules[idx] = { ...rules[idx], [field]: typeof value === "string" ? value : Number(value) };
      return { ...prev, rules };
    });
  };

  const addRule = () => {
    setPolicy((prev) => ({
      ...prev,
      rules: [
        ...prev.rules,
        {
          yearsFrom: prev.rules.length > 0 ? prev.rules[prev.rules.length - 1].yearsFrom + 2 : 0,
          yearsTo: -1,
          days: 15,
          label: "새 규칙",
        },
      ],
    }));
  };

  const removeRule = (idx: number) => {
    setPolicy((prev) => ({ ...prev, rules: prev.rules.filter((_, i) => i !== idx) }));
  };

  return (
    <div className="space-y-6">
      {/* 계산 방식 */}
      <section className="bg-white rounded-2xl border border-border p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-1">연차 계산 방식</h3>
        <p className="text-xs text-muted-foreground mb-4">
          직원 등록 시 입사일을 기준으로 연차를 자동 계산하는 방식을 선택합니다.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(["tenure", "fiscal"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setPolicy((p) => ({ ...p, calcMode: mode }))}
              className={cn(
                "flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all",
                policy.calcMode === mode
                  ? "border-[var(--teal)] bg-[var(--teal-light)]"
                  : "border-border bg-white hover:border-[var(--teal)]/40"
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center",
                policy.calcMode === mode ? "border-[var(--teal)] bg-[var(--teal)]" : "border-muted-foreground"
              )}>
                {policy.calcMode === mode && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">
                  {mode === "tenure" ? "근속연수 기반" : "회계연도 기반"}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {mode === "tenure"
                    ? "입사일로부터 경과 연수에 따라 아래 규칙 테이블 적용"
                    : `매년 ${policy.fiscalMonthStart}월 1일 기준으로 근속연수를 계산하여 부여`}
                </div>
              </div>
            </button>
          ))}
        </div>
        {policy.calcMode === "fiscal" && (
          <div className="mt-3 flex items-center gap-3">
            <label className="text-xs font-medium text-foreground whitespace-nowrap">회계연도 시작 월</label>
            <select
              value={policy.fiscalMonthStart}
              onChange={(e) => setPolicy((p) => ({ ...p, fiscalMonthStart: Number(e.target.value) }))}
              className="text-sm border border-border rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-[var(--teal)]/30"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m}월</option>
              ))}
            </select>
          </div>
        )}
      </section>

      {/* 기본 설정 */}
      <section className="bg-white rounded-2xl border border-border p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-4">기본 설정</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">연차 최대 상한 (일)</label>
            <input
              type="number" min={1} max={365} value={policy.maxDays}
              onChange={(e) => setPolicy((p) => ({ ...p, maxDays: Math.max(1, Number(e.target.value)) }))}
              className="w-full text-sm border border-border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--teal)]/30 mono-num"
            />
            <p className="text-[11px] text-muted-foreground mt-1">근속연수와 무관하게 이 일수를 초과하지 않습니다</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">수습 기간 월별 부여일</label>
            <input
              type="number" min={0} max={5} value={policy.probationDays}
              onChange={(e) => setPolicy((p) => ({ ...p, probationDays: Math.max(0, Number(e.target.value)) }))}
              className="w-full text-sm border border-border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--teal)]/30 mono-num"
            />
            <p className="text-[11px] text-muted-foreground mt-1">1년 미만 직원에게 매월 부여하는 연차 일수</p>
          </div>
        </div>
      </section>

      {/* 근속연수별 규칙 테이블 */}
      <section className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="text-sm font-semibold text-foreground">근속연수별 연차 규칙</h3>
            <p className="text-xs text-muted-foreground mt-0.5">행을 직접 수정하거나 추가/삭제할 수 있습니다</p>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5 rounded-xl text-xs" onClick={addRule}>
            <Plus size={12} />규칙 추가
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2.5">근속 이상 (년)</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2.5">근속 미만 (년, -1=무제한)</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2.5">부여 일수</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2.5">설명</th>
                <th className="px-4 py-2.5 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {policy.rules.map((rule, idx) => (
                <tr key={idx} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2">
                    <input type="number" min={0} value={rule.yearsFrom}
                      onChange={(e) => updateRule(idx, "yearsFrom", e.target.value)}
                      className="w-20 text-sm border border-border rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-[var(--teal)]/30 mono-num" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="number" min={-1} value={rule.yearsTo}
                      onChange={(e) => updateRule(idx, "yearsTo", e.target.value)}
                      className="w-20 text-sm border border-border rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-[var(--teal)]/30 mono-num" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="number" min={0} max={365} value={rule.days}
                      onChange={(e) => updateRule(idx, "days", e.target.value)}
                      className="w-20 text-sm border border-border rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-[var(--teal)]/30 mono-num font-bold text-[var(--teal-dark)]" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="text" value={rule.label}
                      onChange={(e) => updateRule(idx, "label", e.target.value)}
                      className="w-full text-xs border border-border rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-[var(--teal)]/30 text-muted-foreground" />
                  </td>
                  <td className="px-4 py-2">
                    <button onClick={() => removeRule(idx)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 입사일 미리보기 */}
      <section className="bg-white rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Info size={15} className="text-[var(--teal)]" />
          <h3 className="text-sm font-semibold text-foreground">연차 자동 계산 미리보기</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          입사일을 입력하면 현재 정책 기준으로 부여될 연차 수를 미리 확인할 수 있습니다.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input type="date" value={previewDate}
            onChange={(e) => setPreviewDate(e.target.value)}
            className="text-sm border border-border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--teal)]/30" />
          {preview && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-[var(--teal-light)] rounded-xl border border-[var(--teal)]/20">
              <CheckCircle2 size={16} className="text-[var(--teal)] shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground">
                  근속 {formatTenure(preview.tenureYears, preview.tenureMonths)}
                </div>
                <div className="text-sm font-bold text-[var(--teal-dark)] mono-num">
                  {preview.days}일 부여
                  {preview.rule && (
                    <span className="text-xs font-normal text-muted-foreground ml-2">({preview.rule.label})</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 저장 버튼 */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="outline" className="gap-2 rounded-xl" onClick={handleReset}>
          <RotateCcw size={14} />기본값으로 초기화
        </Button>
        <Button className="gap-2 rounded-xl text-white min-w-28" style={{ background: "var(--teal)" }} onClick={handleSave}>
          {saved ? <><CheckCircle2 size={14} />저장 완료</> : <><Save size={14} />정책 저장</>}
        </Button>
      </div>
    </div>
  );
}

// ─── 전환 시뮬레이션 탭 ───────────────────────────────────────────────────────

const GROUP_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  "pre-transition": { label: "전환 전 입사 (일할 계산)", color: "text-[var(--teal-dark)]", bg: "bg-[var(--teal-light)]" },
  "post-transition": { label: "전환 후 입사 (즉시 적용)", color: "text-blue-700", bg: "bg-blue-50" },
  "probation": { label: "1년 미만 수습", color: "text-amber-700", bg: "bg-amber-50" },
};

function DiffBadge({ diff }: { diff: number }) {
  if (diff > 0) return (
    <span className="inline-flex items-center gap-0.5 text-emerald-700 font-semibold mono-num text-xs">
      <TrendingUp size={11} />+{diff}
    </span>
  );
  if (diff < 0) return (
    <span className="inline-flex items-center gap-0.5 text-rose-600 font-semibold mono-num text-xs">
      <TrendingDown size={11} />{diff}
    </span>
  );
  return <span className="inline-flex items-center gap-0.5 text-muted-foreground text-xs"><Minus size={11} />0</span>;
}

function TransitionSimulationTab() {
  const today = new Date().toISOString().split("T")[0];
  const [transitionDate, setTransitionDate] = useState(today);
  const [roundingMode, setRoundingMode] = useState<RoundingMode>("ceil");
  const [simulated, setSimulated] = useState(false);
  const [results, setResults] = useState<TransitionResult[]>([]);
  const [applied, setApplied] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [filterGroup, setFilterGroup] = useState<string>("all");

  const policy = loadPolicy();

  // 요약 통계
  const summary = useMemo(() => {
    if (!results.length) return null;
    const increased = results.filter((r) => r.diff > 0).length;
    const decreased = results.filter((r) => r.diff < 0).length;
    const unchanged = results.filter((r) => r.diff === 0).length;
    const negativeWarnings = results.filter((r) => r.wasNegative).length;
    const totalBefore = results.reduce((s, r) => s + r.employee.currentLeave, 0);
    const totalAfter = results.reduce((s, r) => s + r.finalLeave, 0);
    return { increased, decreased, unchanged, negativeWarnings, totalBefore, totalAfter };
  }, [results]);

  const filteredResults = useMemo(() => {
    if (filterGroup === "all") return results;
    return results.filter((r) => r.group === filterGroup);
  }, [results, filterGroup]);

  const handleSimulate = () => {
    if (!transitionDate) {
      toast.error("전환 시행일을 선택해주세요");
      return;
    }
    const res = simulateTransition(SAMPLE_EMPLOYEES, transitionDate, policy, roundingMode);
    setResults(res);
    setSimulated(true);
    setApplied(false);
    toast.success("시뮬레이션 완료", {
      description: `${res.length}명 직원의 전환 후 연차가 계산되었습니다`,
    });
  };

  const handleApply = () => {
    setApplied(true);
    toast.success("연차 일괄 적용 완료", {
      description: `${results.length}명의 연차가 회계연도 기준으로 전환되었습니다`,
    });
  };

  const transitionYear = transitionDate ? new Date(transitionDate).getFullYear() : new Date().getFullYear();
  const isLeapYear = (y: number) => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const yearDays = isLeapYear(transitionYear) ? 366 : 365;
  const remainingDays = transitionDate
    ? Math.round((new Date(transitionYear, 11, 31).getTime() - new Date(transitionDate).getTime()) / 86400000) + 1
    : 0;
  const ratio = remainingDays / yearDays;

  return (
    <div className="space-y-5">
      {/* 안내 배너 */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
        <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <div className="text-sm font-semibold text-amber-800">연차 계산 방식 전환 시뮬레이션</div>
          <div className="text-xs text-amber-700 mt-0.5 leading-relaxed">
            입사일 기준 → 회계연도 기준(1월 1일)으로 전환 시, 전환 연도에 한해 <strong>일할 계산</strong>을 적용합니다.
            전환 시행일부터 12월 31일까지의 잔여 일수를 연도 전체 일수로 나눈 비율만큼 연차를 부여합니다.
            시뮬레이션 결과를 확인한 후 일괄 적용하세요.
          </div>
        </div>
      </div>

      {/* 설정 패널 */}
      <section className="bg-white rounded-2xl border border-border p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-4">전환 설정</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 전환 시행일 */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">전환 시행일</label>
            <input
              type="date"
              value={transitionDate}
              onChange={(e) => { setTransitionDate(e.target.value); setSimulated(false); }}
              className="w-full text-sm border border-border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--teal)]/30"
            />
            {transitionDate && (
              <p className="text-[11px] text-muted-foreground mt-1">
                잔여 <span className="font-semibold mono-num text-[var(--teal-dark)]">{remainingDays}일</span>
                {" "}/ {yearDays}일 = <span className="font-semibold mono-num text-[var(--teal-dark)]">{formatRatio(ratio)}</span>
              </p>
            )}
          </div>

          {/* 소수점 처리 */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">소수점 처리 방식</label>
            <div className="flex flex-col gap-1.5">
              {([
                { value: "ceil",  label: "올림 (권장 — 직원 유리)" },
                { value: "round", label: "반올림 (중립)" },
                { value: "floor", label: "내림 (회사 유리)" },
              ] as const).map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="rounding"
                    value={opt.value}
                    checked={roundingMode === opt.value}
                    onChange={() => { setRoundingMode(opt.value); setSimulated(false); }}
                    className="accent-[var(--teal)]"
                  />
                  <span className={cn("text-xs", roundingMode === opt.value ? "font-semibold text-[var(--teal-dark)]" : "text-muted-foreground")}>
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 계산 공식 요약 */}
          <div className="bg-muted/30 rounded-xl p-3 border border-border">
            <div className="text-[11px] font-semibold text-muted-foreground mb-2">일할 계산 공식</div>
            <div className="text-xs text-foreground leading-relaxed font-mono bg-white rounded-lg p-2 border border-border">
              <div className="text-[var(--teal-dark)] font-bold">부여 연차 =</div>
              <div className="mt-1 pl-2">회계연도 기준 연차</div>
              <div className="pl-2">× (잔여 일수 / {yearDays}일)</div>
              <div className="pl-2 text-muted-foreground">→ 소수점 {roundingMode === "ceil" ? "올림" : roundingMode === "round" ? "반올림" : "내림"}</div>
              <div className="pl-2 text-muted-foreground">- 이미 사용한 연차</div>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <Button
            className="gap-2 rounded-xl text-white"
            style={{ background: "var(--teal)" }}
            onClick={handleSimulate}
          >
            <Play size={14} />
            시뮬레이션 실행
          </Button>
        </div>
      </section>

      {/* 시뮬레이션 결과 */}
      {simulated && summary && (
        <>
          {/* 요약 KPI */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "증가", value: summary.increased, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: TrendingUp },
              { label: "감소", value: summary.decreased, color: "text-rose-600", bg: "bg-rose-50 border-rose-200", icon: TrendingDown },
              { label: "변동 없음", value: summary.unchanged, color: "text-muted-foreground", bg: "bg-muted/30 border-border", icon: Minus },
              { label: "음수 경고", value: summary.negativeWarnings, color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: AlertTriangle },
            ].map((kpi) => (
              <div key={kpi.label} className={cn("rounded-xl border p-3", kpi.bg)}>
                <div className={cn("text-2xl font-bold mono-num", kpi.color)}>{kpi.value}명</div>
                <div className="text-xs text-muted-foreground mt-0.5">{kpi.label}</div>
              </div>
            ))}
          </div>

          {/* 전체 연차 합계 변화 */}
          <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground">전체 연차 합계 변화</div>
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">전환 전</span>
                  <span className="font-bold mono-num ml-2">{summary.totalBefore}일</span>
                </div>
                <span className="text-muted-foreground">→</span>
                <div>
                  <span className="text-muted-foreground text-xs">전환 후</span>
                  <span className="font-bold mono-num ml-2 text-[var(--teal-dark)]">{summary.totalAfter}일</span>
                </div>
                <DiffBadge diff={summary.totalAfter - summary.totalBefore} />
              </div>
            </div>
            {/* 진행 바 */}
            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, (summary.totalAfter / Math.max(summary.totalBefore, 1)) * 100)}%`,
                  background: "var(--teal)",
                }}
              />
            </div>
          </div>

          {/* 그룹 필터 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">필터:</span>
            {[
              { value: "all", label: `전체 (${results.length}명)` },
              { value: "pre-transition", label: `일할 계산 (${results.filter(r => r.group === "pre-transition").length}명)` },
              { value: "probation", label: `수습 (${results.filter(r => r.group === "probation").length}명)` },
              { value: "post-transition", label: `전환 후 입사 (${results.filter(r => r.group === "post-transition").length}명)` },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setFilterGroup(f.value)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-all border",
                  filterGroup === f.value
                    ? "bg-[var(--teal)] text-white border-[var(--teal)]"
                    : "bg-white text-muted-foreground border-border hover:border-[var(--teal)]/40"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* 결과 테이블 */}
          <section className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">직원별 시뮬레이션 결과</h3>
              <span className="text-xs text-muted-foreground">행 클릭 시 상세 계산 과정 확인</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["이름", "부서", "입사일", "근속", "그룹", "전환 전", "일할 계산", "전환 후", "증감"].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-2.5 whitespace-nowrap">{h}</th>
                    ))}
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredResults.map((r) => {
                    const grp = GROUP_LABELS[r.group];
                    const isExpanded = expandedRow === r.employee.id;
                    return (
                      <>
                        <tr
                          key={r.employee.id}
                          onClick={() => setExpandedRow(isExpanded ? null : r.employee.id)}
                          className={cn(
                            "cursor-pointer transition-colors",
                            isExpanded ? "bg-[var(--teal-light)]" : "hover:bg-muted/20",
                            r.wasNegative && "bg-amber-50/50"
                          )}
                        >
                          <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {r.wasNegative && <AlertTriangle size={12} className="text-amber-500 shrink-0" />}
                              {r.employee.name}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{r.employee.dept}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs mono-num">{r.employee.joinDate}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {formatTenure(r.tenureYears, r.tenureMonths)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", grp.bg, grp.color)}>
                              {r.group === "pre-transition" ? "일할 계산" : r.group === "probation" ? "수습" : "즉시 적용"}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold mono-num text-center">{r.employee.currentLeave}일</td>
                          <td className="px-4 py-3 text-center">
                            {r.group === "pre-transition" ? (
                              <span className="text-xs text-muted-foreground mono-num">
                                {r.fiscalBasedDays}×{formatRatio(r.prorationRatio)}={r.proratedDays}일
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-bold mono-num text-[var(--teal-dark)] text-center">{r.finalLeave}일</td>
                          <td className="px-4 py-3 text-center"><DiffBadge diff={r.diff} /></td>
                          <td className="px-4 py-3">
                            {isExpanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                          </td>
                        </tr>
                        {/* 상세 계산 과정 */}
                        {isExpanded && (
                          <tr key={`${r.employee.id}-detail`} className="bg-[var(--teal-light)]/60">
                            <td colSpan={10} className="px-6 py-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <div className="text-xs font-semibold text-[var(--teal-dark)] mb-2">상세 계산 과정</div>
                                  {r.group === "pre-transition" && (
                                    <div className="space-y-1.5 text-xs">
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">① 회계연도 기준 연차</span>
                                        <span className="font-semibold mono-num">{r.fiscalBasedDays}일</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">② 일할 비율 (잔여/연도)</span>
                                        <span className="font-semibold mono-num">{formatRatio(r.prorationRatio)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">③ 일할 계산 (소수점 전)</span>
                                        <span className="font-semibold mono-num">{r.proratedRaw.toFixed(2)}일</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">④ 소수점 처리 ({roundingMode === "ceil" ? "올림" : roundingMode === "round" ? "반올림" : "내림"})</span>
                                        <span className="font-semibold mono-num">{r.proratedDays}일</span>
                                      </div>
                                      <div className="flex justify-between border-t border-[var(--teal)]/20 pt-1">
                                        <span className="text-muted-foreground">⑤ 이미 사용한 연차 차감</span>
                                        <span className="font-semibold mono-num text-rose-600">-{r.employee.usedLeave}일</span>
                                      </div>
                                      <div className="flex justify-between font-bold text-[var(--teal-dark)]">
                                        <span>⑥ 최종 잔여 연차</span>
                                        <span className="mono-num">{r.finalLeave}일</span>
                                      </div>
                                      {r.wasNegative && (
                                        <div className="flex items-center gap-1.5 mt-1 text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5">
                                          <AlertTriangle size={11} />
                                          <span>초과 사용으로 음수 발생 → 0일로 처리됨</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {r.group === "probation" && (
                                    <div className="space-y-1.5 text-xs">
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">근속 기간</span>
                                        <span className="font-semibold">{formatTenure(r.tenureYears, r.tenureMonths)} (1년 미만)</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">전환 시행월부터 잔여 월</span>
                                        <span className="font-semibold mono-num">{Math.round(r.prorationRatio * 12)}개월</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">월별 부여일 × 잔여 월</span>
                                        <span className="font-semibold mono-num">{r.proratedDays}일</span>
                                      </div>
                                      <div className="flex justify-between border-t border-[var(--teal)]/20 pt-1 font-bold text-[var(--teal-dark)]">
                                        <span>최종 잔여 연차</span>
                                        <span className="mono-num">{r.finalLeave}일</span>
                                      </div>
                                    </div>
                                  )}
                                  {r.group === "post-transition" && (
                                    <div className="text-xs text-muted-foreground">
                                      전환 시행일 이후 입사자로, 처음부터 회계연도 기준이 적용됩니다.
                                      일할 계산 없이 회계연도 기준 연차({r.fiscalBasedDays}일)가 즉시 부여됩니다.
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  <div className="text-xs font-semibold text-[var(--teal-dark)] mb-2">직원 정보</div>
                                  <div className="space-y-1 text-xs">
                                    {[
                                      { label: "입사일", value: r.employee.joinDate },
                                      { label: "근속 기간", value: formatTenure(r.tenureYears, r.tenureMonths) },
                                      { label: "현재 잔여 연차", value: `${r.employee.currentLeave}일` },
                                      { label: "전환 전 사용 연차", value: `${r.employee.usedLeave}일` },
                                    ].map((item) => (
                                      <div key={item.label} className="flex justify-between">
                                        <span className="text-muted-foreground">{item.label}</span>
                                        <span className="font-medium mono-num">{item.value}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* 일괄 적용 버튼 */}
          {!applied ? (
            <div className="flex items-center justify-between p-4 bg-white border border-border rounded-2xl shadow-sm">
              <div>
                <div className="text-sm font-semibold text-foreground">시뮬레이션 결과를 일괄 적용</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  전체 {results.length}명의 연차가 위 계산 결과로 업데이트됩니다. 이 작업은 되돌릴 수 없습니다.
                </div>
              </div>
              <Button
                className="gap-2 rounded-xl text-white shrink-0 ml-4"
                style={{ background: "var(--coral)" }}
                onClick={handleApply}
              >
                <CheckSquare size={14} />
                일괄 적용
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <div>
                <div className="text-sm font-semibold text-emerald-800">일괄 적용 완료</div>
                <div className="text-xs text-emerald-700 mt-0.5">
                  {results.length}명의 연차가 회계연도 기준({transitionDate} 전환)으로 업데이트되었습니다.
                  다음 해 1월 1일부터 정상 회계연도 기준으로 운영됩니다.
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── 알림 설정 탭 ─────────────────────────────────────────────────────────────

function NotificationTab() {
  const [settings, setSettings] = useState({
    leaveApproval: true,
    leaveReminder: true,
    birthdayAlert: false,
    newEmployee: true,
    reportGenerated: false,
  });

  const items = [
    { key: "leaveApproval",   label: "연차 승인/거절 알림",   desc: "직원의 연차 신청이 승인 또는 거절될 때 알림" },
    { key: "leaveReminder",   label: "연차 소진 독려 알림",   desc: "잔여 연차가 설정 임계값 이하일 때 자동 알림" },
    { key: "birthdayAlert",   label: "생일 알림",             desc: "직원 생일 당일 관리자에게 알림" },
    { key: "newEmployee",     label: "신규 직원 등록 알림",   desc: "새 직원이 시스템에 등록될 때 알림" },
    { key: "reportGenerated", label: "리포트 생성 알림",      desc: "월별 연차 미사용률 리포트 생성 시 알림" },
  ] as const;

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">알림 항목 설정</h3>
        <p className="text-xs text-muted-foreground mt-0.5">수신할 알림 유형을 선택합니다</p>
      </div>
      <div className="divide-y divide-border">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between px-5 py-4">
            <div>
              <div className="text-sm font-medium text-foreground">{item.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
            </div>
            <Switch
              checked={settings[item.key]}
              onCheckedChange={(v) => setSettings((p) => ({ ...p, [item.key]: v }))}
            />
          </div>
        ))}
      </div>
      <div className="px-5 py-4 border-t border-border flex justify-end">
        <Button className="gap-2 rounded-xl text-white" style={{ background: "var(--teal)" }}
          onClick={() => toast.success("알림 설정이 저장되었습니다")}>
          <Save size={14} />저장
        </Button>
      </div>
    </div>
  );
}

// ─── 회사 정보 탭 ─────────────────────────────────────────────────────────────

function CompanyTab() {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
      <div className="flex items-center gap-3 mb-4">
        <Building2 size={18} className="text-[var(--teal)]" />
        <h3 className="text-sm font-semibold text-foreground">회사 기본 정보</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: "회사명",           placeholder: "싸카스포츠",         defaultValue: "싸카스포츠" },
          { label: "사업자 등록번호",  placeholder: "000-00-00000",       defaultValue: "" },
          { label: "대표자명",         placeholder: "홍길동",             defaultValue: "" },
          { label: "업종",             placeholder: "스포츠용품 제조/유통", defaultValue: "" },
          { label: "설립일",           placeholder: "2010.01.01",         defaultValue: "" },
          { label: "직원 수",          placeholder: "247",                defaultValue: "247" },
        ].map((f) => (
          <div key={f.label}>
            <label className="block text-xs font-medium text-foreground mb-1.5">{f.label}</label>
            <input type="text" placeholder={f.placeholder} defaultValue={f.defaultValue}
              className="w-full text-sm border border-border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--teal)]/30" />
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-5">
        <Button className="gap-2 rounded-xl text-white" style={{ background: "var(--teal)" }}
          onClick={() => toast.success("회사 정보가 저장되었습니다")}>
          <Save size={14} />저장
        </Button>
      </div>
    </div>
  );
}

// ─── 계정 관리 탭 ────────────────────────────────────────────────────────────

interface ManagedUser {
  id: number;
  email: string;
  name: string;
  role: "admin" | "employee";
  department: string | null;
  position: string | null;
  is_active: number;
  created_at: string;
  last_login_at: string | null;
}

interface CreateUserForm {
  email: string;
  name: string;
  password: string;
  role: "admin" | "employee";
  department: string;
  position: string;
}

function AccountsTab() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [resetUser, setResetUser] = useState<ManagedUser | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "employee">("all");

  // 검색 + 역할 필터링
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      const matchesQuery =
        !q ||
        u.name.toLowerCase().includes(q) ||
        (u.department ?? "").toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      return matchesQuery && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  // 계정 목록 로드
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users/", { credentials: "include" });
      const data = await res.json();
      if (res.ok) setUsers(data.users);
      else toast.error(data.error || "목록 로드 실패");
    } catch {
      toast.error("서버에 연결할 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // 계정 생성
  const handleCreate = async (form: CreateUserForm) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "생성 실패"); return; }
      toast.success(`${form.name} 계정이 생성되었습니다.`);
      setCreateOpen(false);
      loadUsers();
    } catch { toast.error("서버 오류"); } finally { setSubmitting(false); }
  };

  // 계정 수정 (역할/부서/직책/이름)
  const handlePatch = async (id: number, patch: Partial<ManagedUser>) => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "수정 실패"); return; }
      setUsers((prev) => prev.map((u) => u.id === id ? data.user : u));
      return data.user;
    } catch { toast.error("서버 오류"); }
  };

  // 활성화/비활성화 토글
  const handleToggleActive = async (user: ManagedUser) => {
    const next = user.is_active ? 0 : 1;
    const result = await handlePatch(user.id, { is_active: next } as any);
    if (result) toast.success(`${user.name} 계정이 ${next ? "활성화" : "비활성화"}되었습니다.`);
  };

  // 비밀번호 초기화
  const handleResetPassword = async (user: ManagedUser, newPassword: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "초기화 실패"); return; }
      toast.success(`${user.name}의 비밀번호가 초기화되었습니다.`);
      setResetUser(null);
    } catch { toast.error("서버 오류"); } finally { setSubmitting(false); }
  };

  const roleLabel = (role: string) => role === "admin" ? "관리자" : "직원";
  const roleBadge = (role: string) =>
    role === "admin"
      ? "bg-amber-100 text-amber-700 border border-amber-200"
      : "bg-teal-50 text-teal-700 border border-teal-200";

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <Users size={18} className="text-[var(--teal)]" />
            <h3 className="text-sm font-semibold text-foreground">계정 관리</h3>
          </div>
          <Button
            size="sm"
            className="gap-1.5 rounded-xl text-white text-xs"
            style={{ background: "var(--teal)" }}
            onClick={() => setCreateOpen(true)}
          >
            <UserPlus size={13} /> 새 계정 생성
          </Button>
        </div>
        <p className="text-xs text-muted-foreground ml-9">직원 계정을 생성하고 역할 및 상태를 관리합니다.</p>

        {/* 검색 바 */}
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none"
              fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
            >
              <circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="이름, 부서, 이메일로 검색..."
              className="w-full pl-8 pr-8 py-2 text-sm border border-border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-[var(--teal)]/30 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <div className="flex gap-1.5">
            {(["all", "admin", "employee"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-medium border transition-all whitespace-nowrap",
                  roleFilter === r
                    ? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-sm"
                    : "bg-white text-muted-foreground border-border hover:border-[var(--teal)]/40 hover:text-foreground"
                )}
              >
                {r === "all" ? "전체" : r === "admin" ? "관리자" : "직원"}
              </button>
            ))}
          </div>
        </div>

        {/* 검색 결과 카운트 */}
        {(searchQuery || roleFilter !== "all") && (
          <p className="mt-2 text-xs text-muted-foreground">
            {filteredUsers.length}명 검색됨
            {searchQuery && <span className="ml-1 text-[var(--teal)] font-medium">"{searchQuery}"</span>}
          </p>
        )}
      </div>

      {/* 계정 목록 */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
            <RefreshCw size={16} className="animate-spin" /> 불러오는 중...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            {users.length === 0 ? (
              <>
                <Users size={32} className="mb-2 opacity-30" />
                <p className="text-sm">등록된 계정이 없습니다.</p>
              </>
            ) : (
              <>
                <svg className="w-8 h-8 mb-2 opacity-30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" />
                </svg>
                <p className="text-sm">검색 결과가 없습니다.</p>
                <button
                  onClick={() => { setSearchQuery(""); setRoleFilter("all"); }}
                  className="mt-2 text-xs text-[var(--teal)] hover:underline"
                >
                  검색 초기화
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">이름</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">이메일</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">부서 / 직책</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">역할</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">상태</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">생성일</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden xl:table-cell">마지막 로그인</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className={cn("transition-colors hover:bg-muted/20", !user.is_active && "opacity-50")}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-bold shrink-0">
                          {user.name.charAt(0)}
                        </div>
                        <span className="font-medium text-foreground">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">{user.email}</td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className="text-foreground">{user.department || "-"}</span>
                      {user.position && <span className="text-muted-foreground text-xs ml-1">· {user.position}</span>}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium", roleBadge(user.role))}>
                        {user.role === "admin" ? <Shield size={10} /> : null}
                        {roleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={cn(
                        "inline-block text-xs px-2 py-0.5 rounded-full font-medium",
                        user.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                      )}>
                        {user.is_active ? "활성" : "비활성"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
                          : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 hidden xl:table-cell">
                      {user.last_login_at ? (
                        <span className="text-xs text-foreground">
                          {new Date(user.last_login_at).toLocaleString("ko-KR", {
                            month: "2-digit", day: "2-digit",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">로그인 이력 없음</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title="편집"
                          onClick={() => setEditUser(user)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          title="비밀번호 초기화"
                          onClick={() => setResetUser(user)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <KeyRound size={13} />
                        </button>
                        <button
                          title={user.is_active ? "비활성화" : "활성화"}
                          onClick={() => handleToggleActive(user)}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            user.is_active
                              ? "hover:bg-red-50 text-muted-foreground hover:text-red-600"
                              : "hover:bg-green-50 text-muted-foreground hover:text-green-600"
                          )}
                        >
                          {user.is_active ? <UserX size={13} /> : <UserPlus size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 새 계정 생성 모달 */}
      {createOpen && (
        <CreateUserModal
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreate}
          submitting={submitting}
        />
      )}

      {/* 계정 편집 모달 */}
      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSubmit={async (patch) => {
            const result = await handlePatch(editUser.id, patch);
            if (result) { toast.success("계정 정보가 수정되었습니다."); setEditUser(null); }
          }}
          submitting={submitting}
        />
      )}

      {/* 비밀번호 초기화 모달 */}
      {resetUser && (
        <ResetPasswordModal
          user={resetUser}
          onClose={() => setResetUser(null)}
          onSubmit={(pw) => handleResetPassword(resetUser, pw)}
          submitting={submitting}
        />
      )}
    </div>
  );
}

// ─── 새 계정 생성 모달 ────────────────────────────────────────────────────────

function CreateUserModal({
  onClose, onSubmit, submitting,
}: { onClose: () => void; onSubmit: (f: CreateUserForm) => void; submitting: boolean }) {
  const [form, setForm] = useState<CreateUserForm>({
    email: "", name: "", password: "", role: "employee", department: "", position: "",
  });
  const [showPw, setShowPw] = useState(false);

  const set = (k: keyof CreateUserForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <UserPlus size={16} className="text-[var(--teal)]" />
            <h2 className="text-sm font-semibold text-foreground">새 계정 생성</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">이름 <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={set("name")} placeholder="홍길동"
                className="w-full text-sm border border-border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--teal)]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">역할</label>
              <select value={form.role} onChange={set("role")}
                className="w-full text-sm border border-border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--teal)]/30 bg-white">
                <option value="employee">직원</option>
                <option value="admin">관리자</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">이메일 <span className="text-red-500">*</span></label>
            <input type="email" value={form.email} onChange={set("email")} placeholder="example@ssakasports.com"
              className="w-full text-sm border border-border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--teal)]/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">초기 비밀번호 <span className="text-red-500">*</span></label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={form.password} onChange={set("password")} placeholder="6자 이상"
                className="w-full text-sm border border-border rounded-xl px-3 py-2 pr-9 outline-none focus:ring-2 focus:ring-[var(--teal)]/30" />
              <button type="button" onClick={() => setShowPw((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">부서</label>
              <input value={form.department} onChange={set("department")} placeholder="개발팀"
                className="w-full text-sm border border-border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--teal)]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">직책</label>
              <input value={form.position} onChange={set("position")} placeholder="선임 개발자"
                className="w-full text-sm border border-border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--teal)]/30" />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
          <Button variant="outline" size="sm" className="rounded-xl" onClick={onClose} disabled={submitting}>취소</Button>
          <Button size="sm" className="rounded-xl text-white gap-1.5" style={{ background: "var(--teal)" }}
            onClick={() => onSubmit(form)} disabled={submitting}>
            {submitting ? <RefreshCw size={13} className="animate-spin" /> : <UserPlus size={13} />}
            생성
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── 계정 편집 모달 ────────────────────────────────────────────────────────────

function EditUserModal({
  user, onClose, onSubmit, submitting,
}: { user: ManagedUser; onClose: () => void; onSubmit: (p: Partial<ManagedUser>) => void; submitting: boolean }) {
  const [form, setForm] = useState({
    name: user.name,
    role: user.role as "admin" | "employee",
    department: user.department || "",
    position: user.position || "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Pencil size={16} className="text-[var(--teal)]" />
            <h2 className="text-sm font-semibold text-foreground">{user.name} 계정 편집</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">이름</label>
              <input value={form.name} onChange={set("name")}
                className="w-full text-sm border border-border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--teal)]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">역할</label>
              <select value={form.role} onChange={set("role")}
                className="w-full text-sm border border-border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--teal)]/30 bg-white">
                <option value="employee">직원</option>
                <option value="admin">관리자</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">부서</label>
              <input value={form.department} onChange={set("department")} placeholder="개발팀"
                className="w-full text-sm border border-border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--teal)]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">직책</label>
              <input value={form.position} onChange={set("position")} placeholder="선임 개발자"
                className="w-full text-sm border border-border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--teal)]/30" />
            </div>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-start gap-2">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            <span>역할을 관리자로 변경하면 모든 기능에 접근할 수 있습니다. 신중하게 설정해 주세요.</span>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
          <Button variant="outline" size="sm" className="rounded-xl" onClick={onClose} disabled={submitting}>취소</Button>
          <Button size="sm" className="rounded-xl text-white gap-1.5" style={{ background: "var(--teal)" }}
            onClick={() => onSubmit({ name: form.name, role: form.role, department: form.department || null, position: form.position || null } as any)}
            disabled={submitting}>
            {submitting ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
            저장
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── 비밀번호 초기화 모달 ──────────────────────────────────────────────────────

function ResetPasswordModal({
  user, onClose, onSubmit, submitting,
}: { user: ManagedUser; onClose: () => void; onSubmit: (pw: string) => void; submitting: boolean }) {
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <KeyRound size={16} className="text-[var(--teal)]" />
            <h2 className="text-sm font-semibold text-foreground">비밀번호 초기화</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{user.name}</span>의 비밀번호를 초기화합니다.
          </p>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">새 비밀번호 <span className="text-red-500">*</span></label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="6자 이상"
                className="w-full text-sm border border-border rounded-xl px-3 py-2 pr-9 outline-none focus:ring-2 focus:ring-[var(--teal)]/30" />
              <button type="button" onClick={() => setShowPw((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
          <Button variant="outline" size="sm" className="rounded-xl" onClick={onClose} disabled={submitting}>취소</Button>
          <Button size="sm" className="rounded-xl text-white gap-1.5" style={{ background: "var(--teal)" }}
            onClick={() => onSubmit(pw)} disabled={submitting || pw.length < 6}>
            {submitting ? <RefreshCw size={13} className="animate-spin" /> : <KeyRound size={13} />}
            초기화
          </Button>
        </div>
      </div>
    </div>
  );
}


// ─── 조직 마스터 탭 ────────────────────────────────────────────────────────────

type MasterItem = { id: number; name: string; description?: string; address?: string; sort_order: number };
type MasterType = { key: string; label: string; icon: React.ElementType; secondaryLabel: string };

const MASTER_TYPES: MasterType[] = [
  { key: "departments", label: "부서", icon: Building, secondaryLabel: "설명" },
  { key: "grades",      label: "직급", icon: Tag,      secondaryLabel: "설명" },
  { key: "positions",   label: "직책", icon: Briefcase, secondaryLabel: "설명" },
  { key: "locations",   label: "근무지", icon: MapPin,   secondaryLabel: "주소" },
];

function MasterSection({ type }: { type: MasterType }) {
  const [items, setItems] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newSecondary, setNewSecondary] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editSecondary, setEditSecondary] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/master/${type.key}`, { credentials: "include" });
      const data = await res.json();
      setItems(data.items || []);
    } catch { toast.error("데이터 로드 실패"); }
    finally { setLoading(false); }
  }, [type.key]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!newName.trim()) { toast.error("이름을 입력해주세요"); return; }
    setSaving(true);
    try {
      const body: Record<string, string> = { name: newName.trim() };
      if (type.key === "locations") body.address = newSecondary;
      else body.description = newSecondary;
      const res = await fetch(`/api/master/${type.key}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      setNewName(""); setNewSecondary("");
      await load();
      toast.success(`${type.label} 항목이 추가되었습니다`);
    } catch { toast.error("추가 실패"); }
    finally { setSaving(false); }
  };

  const handleEdit = async (id: number) => {
    setSaving(true);
    try {
      const body: Record<string, string> = { name: editName };
      if (type.key === "locations") body.address = editSecondary;
      else body.description = editSecondary;
      const res = await fetch(`/api/master/${type.key}/${id}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      setEditId(null);
      await load();
      toast.success("수정되었습니다");
    } catch { toast.error("수정 실패"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`"${name}" 항목을 삭제하시겠습니까?`)) return;
    try {
      await fetch(`/api/master/${type.key}/${id}`, { method: "DELETE", credentials: "include" });
      await load();
      toast.success("삭제되었습니다");
    } catch { toast.error("삭제 실패"); }
  };

  const Icon = type.icon;

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.92 0.04 180)" }}>
          <Icon size={16} style={{ color: "var(--teal)" }} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{type.label} 관리</h3>
          <p className="text-xs text-muted-foreground">{items.length}개 항목</p>
        </div>
      </div>
      <div className="flex gap-2">
        <input value={newName} onChange={(e) => setNewName(e.target.value)}
          placeholder={`새 ${type.label} 이름`}
          className="flex-1 min-w-0 h-8 px-3 text-xs rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-teal-400"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
        <input value={newSecondary} onChange={(e) => setNewSecondary(e.target.value)}
          placeholder={type.secondaryLabel}
          className="w-36 h-8 px-3 text-xs rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-teal-400"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
        <Button size="sm" className="h-8 rounded-xl text-white gap-1" style={{ background: "var(--teal)" }}
          onClick={handleAdd} disabled={saving || !newName.trim()}>
          <Plus size={13} /> 추가
        </Button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-6"><RefreshCw size={16} className="animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">등록된 {type.label}이 없습니다</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors">
              {editId === item.id ? (
                <>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 min-w-0 h-7 px-2 text-xs rounded-lg border border-border bg-background focus:outline-none" autoFocus />
                  <input value={editSecondary} onChange={(e) => setEditSecondary(e.target.value)}
                    placeholder={type.secondaryLabel}
                    className="w-28 h-7 px-2 text-xs rounded-lg border border-border bg-background focus:outline-none" />
                  <Button size="sm" className="h-6 px-2 text-xs rounded-lg text-white" style={{ background: "var(--teal)" }}
                    onClick={() => handleEdit(item.id)} disabled={saving}>
                    {saving ? <RefreshCw size={11} className="animate-spin" /> : "저장"}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs rounded-lg" onClick={() => setEditId(null)}>취소</Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-xs font-medium text-foreground">{item.name}</span>
                  {(item.description || item.address) && (
                    <span className="text-xs text-muted-foreground truncate max-w-[120px]">{item.description || item.address}</span>
                  )}
                  <button onClick={() => { setEditId(item.id); setEditName(item.name); setEditSecondary(item.description || item.address || ""); }}
                    className="p-1 rounded-lg hover:bg-background transition-colors text-muted-foreground hover:text-foreground">
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => handleDelete(item.id, item.name)}
                    className="p-1 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-500">
                    <Trash2 size={12} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MasterDataTab() {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">조직 마스터 데이터</h2>
          <p className="text-xs text-muted-foreground mt-0.5">부서·직급·직책·근무지를 관리합니다. 직원 등록 시 선택지로 사용됩니다.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MASTER_TYPES.map((t) => <MasterSection key={t.key} type={t} />)}
        </div>
      </div>
    </div>
  );
}


// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("leave");

  return (
    <div className="flex-1 flex flex-col overflow-hidden page-enter">
      {/* Header */}
      <div className="px-5 lg:px-7 pt-5 lg:pt-7 pb-4 bg-[oklch(0.975_0.005_220)] border-b border-border">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">설정</h1>
        <p className="text-sm text-muted-foreground mt-0.5">연차 정책, 전환 시뮬레이션, 알림, 회사 정보를 관리합니다</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 lg:px-7 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Tab Nav */}
          <div className="flex items-center gap-1 bg-white border border-border rounded-2xl p-1 mb-6 shadow-sm overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                    activeTab === tab.id
                      ? "bg-[var(--teal)] text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon size={15} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          {activeTab === "leave"        && <LeavePolicyTab />}
          {activeTab === "transition"   && <TransitionSimulationTab />}
          {activeTab === "accounts"     && <AccountsTab />}
          {activeTab === "notification" && <NotificationTab />}
          {activeTab === "company"      && <CompanyTab />}
          {activeTab === "master"       && <MasterDataTab />}
        </div>
      </div>
    </div>
  );
}
