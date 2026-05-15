/**
 * SettingsPage — TeamPulse 시스템 설정
 * Design: Soft Teal Clarity
 *
 * 탭 구성:
 * 1. 연차 정책 — 계산 방식, 근속연수별 일수 테이블, 상한 설정
 * 2. 알림 설정 — (placeholder)
 * 3. 회사 정보 — (placeholder)
 */

import { useState, useEffect } from "react";
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
  ChevronRight,
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
} from "@/lib/leavePolicy";

// ─── 탭 정의 ──────────────────────────────────────────────────────────────────

const TABS = [
  { id: "leave", label: "연차 정책", icon: CalendarDays },
  { id: "notification", label: "알림 설정", icon: Bell },
  { id: "company", label: "회사 정보", icon: Building2 },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── 연차 정책 탭 ─────────────────────────────────────────────────────────────

function LeavePolicyTab() {
  const [policy, setPolicy] = useState<LeavePolicy>(() => loadPolicy());
  const [saved, setSaved] = useState(false);
  const [previewDate, setPreviewDate] = useState("");

  // 미리보기 계산
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
              <div
                className={cn(
                  "w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center",
                  policy.calcMode === mode ? "border-[var(--teal)] bg-[var(--teal)]" : "border-muted-foreground"
                )}
              >
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

      {/* 최대 연차 / 수습 설정 */}
      <section className="bg-white rounded-2xl border border-border p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-4">기본 설정</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              연차 최대 상한 (일)
            </label>
            <input
              type="number"
              min={1}
              max={365}
              value={policy.maxDays}
              onChange={(e) => setPolicy((p) => ({ ...p, maxDays: Math.max(1, Number(e.target.value)) }))}
              className="w-full text-sm border border-border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--teal)]/30 mono-num"
            />
            <p className="text-[11px] text-muted-foreground mt-1">근속연수와 무관하게 이 일수를 초과하지 않습니다</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              수습 기간 월별 부여일
            </label>
            <input
              type="number"
              min={0}
              max={5}
              value={policy.probationDays}
              onChange={(e) => setPolicy((p) => ({ ...p, probationDays: Math.max(0, Number(e.target.value)) }))}
              className="w-full text-sm border border-border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--teal)]/30 mono-num"
            />
            <p className="text-[11px] text-muted-foreground mt-1">1년 미만 직원에게 매월 부여하는 연차 일수</p>
          </div>
        </div>
      </section>

      {/* 근속연수별 연차 규칙 테이블 */}
      <section className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="text-sm font-semibold text-foreground">근속연수별 연차 규칙</h3>
            <p className="text-xs text-muted-foreground mt-0.5">행을 직접 수정하거나 추가/삭제할 수 있습니다</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 rounded-xl text-xs"
            onClick={addRule}
          >
            <Plus size={12} />
            규칙 추가
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
                    <input
                      type="number"
                      min={0}
                      value={rule.yearsFrom}
                      onChange={(e) => updateRule(idx, "yearsFrom", e.target.value)}
                      className="w-20 text-sm border border-border rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-[var(--teal)]/30 mono-num"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min={-1}
                      value={rule.yearsTo}
                      onChange={(e) => updateRule(idx, "yearsTo", e.target.value)}
                      className="w-20 text-sm border border-border rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-[var(--teal)]/30 mono-num"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min={0}
                      max={365}
                      value={rule.days}
                      onChange={(e) => updateRule(idx, "days", e.target.value)}
                      className="w-20 text-sm border border-border rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-[var(--teal)]/30 mono-num font-bold text-[var(--teal-dark)]"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={rule.label}
                      onChange={(e) => updateRule(idx, "label", e.target.value)}
                      className="w-full text-xs border border-border rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-[var(--teal)]/30 text-muted-foreground"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => removeRule(idx)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
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
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={previewDate}
            onChange={(e) => setPreviewDate(e.target.value)}
            className="text-sm border border-border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--teal)]/30"
          />
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
                    <span className="text-xs font-normal text-muted-foreground ml-2">
                      ({preview.rule.label})
                    </span>
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
          <RotateCcw size={14} />
          기본값으로 초기화
        </Button>
        <Button
          className="gap-2 rounded-xl text-white min-w-28"
          style={{ background: saved ? "var(--teal)" : "var(--teal)" }}
          onClick={handleSave}
        >
          {saved ? (
            <><CheckCircle2 size={14} />저장 완료</>
          ) : (
            <><Save size={14} />정책 저장</>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── 알림 설정 탭 (placeholder) ───────────────────────────────────────────────

function NotificationTab() {
  const [settings, setSettings] = useState({
    leaveApproval: true,
    leaveReminder: true,
    birthdayAlert: false,
    newEmployee: true,
    reportGenerated: false,
  });

  const items = [
    { key: "leaveApproval", label: "연차 승인/거절 알림", desc: "직원의 연차 신청이 승인 또는 거절될 때 알림" },
    { key: "leaveReminder", label: "연차 소진 독려 알림", desc: "잔여 연차가 설정 임계값 이하일 때 자동 알림" },
    { key: "birthdayAlert", label: "생일 알림", desc: "직원 생일 당일 관리자에게 알림" },
    { key: "newEmployee", label: "신규 직원 등록 알림", desc: "새 직원이 시스템에 등록될 때 알림" },
    { key: "reportGenerated", label: "리포트 생성 알림", desc: "월별 연차 미사용률 리포트 생성 시 알림" },
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
        <Button
          className="gap-2 rounded-xl text-white"
          style={{ background: "var(--teal)" }}
          onClick={() => toast.success("알림 설정이 저장되었습니다")}
        >
          <Save size={14} />
          저장
        </Button>
      </div>
    </div>
  );
}

// ─── 회사 정보 탭 (placeholder) ───────────────────────────────────────────────

function CompanyTab() {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
      <div className="flex items-center gap-3 mb-4">
        <Building2 size={18} className="text-[var(--teal)]" />
        <h3 className="text-sm font-semibold text-foreground">회사 기본 정보</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: "회사명", placeholder: "싸카스포츠", defaultValue: "싸카스포츠" },
          { label: "사업자 등록번호", placeholder: "000-00-00000", defaultValue: "" },
          { label: "대표자명", placeholder: "홍길동", defaultValue: "" },
          { label: "업종", placeholder: "스포츠용품 제조/유통", defaultValue: "" },
          { label: "설립일", placeholder: "2010.01.01", defaultValue: "" },
          { label: "직원 수", placeholder: "247", defaultValue: "247" },
        ].map((f) => (
          <div key={f.label}>
            <label className="block text-xs font-medium text-foreground mb-1.5">{f.label}</label>
            <input
              type="text"
              placeholder={f.placeholder}
              defaultValue={f.defaultValue}
              className="w-full text-sm border border-border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--teal)]/30"
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-5">
        <Button
          className="gap-2 rounded-xl text-white"
          style={{ background: "var(--teal)" }}
          onClick={() => toast.success("회사 정보가 저장되었습니다")}
        >
          <Save size={14} />
          저장
        </Button>
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
        <p className="text-sm text-muted-foreground mt-0.5">연차 정책, 알림, 회사 정보를 관리합니다</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 lg:px-7 py-6">
        <div className="max-w-3xl mx-auto">
          {/* Tab Nav */}
          <div className="flex items-center gap-1 bg-white border border-border rounded-2xl p-1 mb-6 shadow-sm">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all",
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
          {activeTab === "leave" && <LeavePolicyTab />}
          {activeTab === "notification" && <NotificationTab />}
          {activeTab === "company" && <CompanyTab />}
        </div>
      </div>
    </div>
  );
}
