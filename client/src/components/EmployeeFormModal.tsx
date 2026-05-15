/**
 * EmployeeFormModal — TeamPulse Employee Registration & Edit
 * Design: Soft Teal Clarity
 *
 * 3-step wizard modal:
 *   Step 1 — 기본 정보 (이름, 부서, 직책, 직급, 재직 상태)
 *   Step 2 — 연락처 & 인사 정보 (이메일, 전화, 위치, 입사일, 생년월일, 직속 상관)
 *   Step 3 — 스킬 & 추가 정보 (스킬 태그, 참여 점수, 메모)
 *
 * Features:
 * - 신규 등록 / 수정 모드 자동 전환
 * - 필수 필드 인라인 유효성 검사
 * - 스킬 태그 동적 추가/삭제
 * - 아바타 색상 자동 배정
 * - 완료 시 목록에 즉시 반영
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Plus,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Building2,
  Star,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmployeeFormData {
  id?: number;
  name: string;
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
  skills: string[];
  engagementScore: number;
  memo: string;
  color: string;
  avatar: string;
  leaveTotal: number;
}

interface EmployeeFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: EmployeeFormData) => void;
  initialData?: Partial<EmployeeFormData> | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEPTS = ["개발팀", "마케팅", "디자인", "영업팀", "인사팀", "재무팀", "운영팀", "법무팀"];
const GRADES = ["사원", "주임", "선임", "책임", "수석", "임원"];
const STATUSES: Array<"재직" | "수습" | "휴직"> = ["재직", "수습", "휴직"];
const LOCATIONS = ["서울 강남구", "서울 마포구", "서울 성동구", "서울 여의도", "경기 성남시", "경기 수원시", "부산 해운대구"];

const AVATAR_COLORS = [
  "oklch(0.65 0.14 185)",
  "oklch(0.65 0.20 300)",
  "oklch(0.65 0.18 340)",
  "oklch(0.55 0.15 240)",
  "oklch(0.65 0.18 60)",
  "oklch(0.65 0.20 25)",
  "oklch(0.60 0.15 160)",
  "oklch(0.55 0.10 220)",
];

const SKILL_SUGGESTIONS: Record<string, string[]> = {
  개발팀: ["React", "TypeScript", "Node.js", "Python", "Java", "Spring Boot", "AWS", "Docker", "Kubernetes", "PostgreSQL"],
  마케팅: ["SNS 마케팅", "콘텐츠 기획", "SEO", "Google Ads", "카피라이팅", "브랜드 전략", "데이터 분석"],
  디자인: ["Figma", "Photoshop", "Illustrator", "UX Research", "Prototyping", "Motion Design", "3D"],
  영업팀: ["B2B 영업", "CRM", "협상", "고객 관리", "제안서 작성", "영어"],
  인사팀: ["채용", "온보딩", "노무", "성과 관리", "교육 기획", "Excel"],
  재무팀: ["재무 분석", "회계", "SAP", "Excel", "세무", "예산 관리"],
  운영팀: ["프로세스 개선", "데이터 분석", "프로젝트 관리", "Excel"],
  법무팀: ["계약 검토", "법률 자문", "규정 준수", "리스크 관리"],
};

const STEPS = [
  { label: "기본 정보", icon: User },
  { label: "연락처 · 인사", icon: Mail },
  { label: "스킬 · 추가", icon: Star },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_FORM: EmployeeFormData = {
  name: "", dept: "개발팀", role: "", grade: "사원", status: "재직",
  email: "", phone: "", location: "서울 강남구", joinDate: "", birthDate: "",
  manager: "", skills: [], engagementScore: 80, memo: "",
  color: AVATAR_COLORS[0], avatar: "",
  leaveTotal: 15,
};

function getAvatarText(name: string) {
  return name.length >= 2 ? name.slice(0, 2) : name || "??";
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <div className="flex items-center gap-1 mt-1 text-[11px] text-destructive">
      <AlertCircle size={11} />
      {msg}
    </div>
  );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-6">
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={step.label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200",
                  done && "bg-[var(--teal)] text-white",
                  active && "bg-[var(--teal)] text-white ring-4 ring-[var(--teal)]/20",
                  !done && !active && "bg-muted text-muted-foreground"
                )}
              >
                {done ? <Check size={14} /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium whitespace-nowrap",
                  active ? "text-[var(--teal-dark)]" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-16 mx-1 mb-4 rounded-full transition-all duration-300",
                  i < current ? "bg-[var(--teal)]" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: 기본 정보 ────────────────────────────────────────────────────────

function Step1({
  form,
  errors,
  onChange,
}: {
  form: EmployeeFormData;
  errors: Partial<Record<keyof EmployeeFormData, string>>;
  onChange: (field: keyof EmployeeFormData, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Avatar Preview */}
      <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-2xl">
        <Avatar className="w-14 h-14">
          <AvatarFallback
            className="text-base font-bold text-white transition-all"
            style={{ background: form.color }}
          >
            {getAvatarText(form.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="text-sm font-semibold text-foreground mb-2">아바타 색상</div>
          <div className="flex gap-2 flex-wrap">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={cn(
                  "w-6 h-6 rounded-full transition-all hover:scale-110",
                  form.color === c && "ring-2 ring-offset-2 ring-[var(--teal)] scale-110"
                )}
                style={{ background: c }}
                onClick={() => onChange("color", c)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 이름 */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          이름 <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          placeholder="홍길동"
          value={form.name}
          onChange={(e) => onChange("name", e.target.value)}
          className={cn(
            "w-full px-3 py-2.5 text-sm border rounded-xl outline-none transition-all",
            "focus:ring-2 focus:ring-[var(--teal)]/30 placeholder:text-muted-foreground/50",
            errors.name ? "border-destructive bg-red-50/30" : "border-border"
          )}
        />
        <FieldError msg={errors.name} />
      </div>

      {/* 부서 + 직책 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            부서 <span className="text-destructive">*</span>
          </label>
          <select
            value={form.dept}
            onChange={(e) => onChange("dept", e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-border rounded-xl outline-none focus:ring-2 focus:ring-[var(--teal)]/30 bg-white"
          >
            {DEPTS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            직책 <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            placeholder="Frontend Engineer"
            value={form.role}
            onChange={(e) => onChange("role", e.target.value)}
            className={cn(
              "w-full px-3 py-2.5 text-sm border rounded-xl outline-none transition-all",
              "focus:ring-2 focus:ring-[var(--teal)]/30 placeholder:text-muted-foreground/50",
              errors.role ? "border-destructive bg-red-50/30" : "border-border"
            )}
          />
          <FieldError msg={errors.role} />
        </div>
      </div>

      {/* 직급 + 재직 상태 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">직급</label>
          <select
            value={form.grade}
            onChange={(e) => onChange("grade", e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-border rounded-xl outline-none focus:ring-2 focus:ring-[var(--teal)]/30 bg-white"
          >
            {GRADES.map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">재직 상태</label>
          <div className="flex gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChange("status", s)}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all",
                  form.status === s
                    ? s === "재직"
                      ? "bg-emerald-500 text-white border-emerald-500"
                      : s === "수습"
                      ? "bg-amber-400 text-white border-amber-400"
                      : "bg-slate-400 text-white border-slate-400"
                    : "bg-white text-muted-foreground border-border hover:border-muted-foreground"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: 연락처 & 인사 정보 ───────────────────────────────────────────────

function Step2({
  form,
  errors,
  onChange,
}: {
  form: EmployeeFormData;
  errors: Partial<Record<keyof EmployeeFormData, string>>;
  onChange: (field: keyof EmployeeFormData, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* 이메일 */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          <span className="flex items-center gap-1.5"><Mail size={13} />이메일 <span className="text-destructive">*</span></span>
        </label>
        <input
          type="email"
          placeholder="name@teampulse.kr"
          value={form.email}
          onChange={(e) => onChange("email", e.target.value)}
          className={cn(
            "w-full px-3 py-2.5 text-sm border rounded-xl outline-none transition-all",
            "focus:ring-2 focus:ring-[var(--teal)]/30 placeholder:text-muted-foreground/50",
            errors.email ? "border-destructive bg-red-50/30" : "border-border"
          )}
        />
        <FieldError msg={errors.email} />
      </div>

      {/* 전화번호 */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          <span className="flex items-center gap-1.5"><Phone size={13} />전화번호</span>
        </label>
        <input
          type="tel"
          placeholder="010-0000-0000"
          value={form.phone}
          onChange={(e) => {
            // Auto-format phone number
            const raw = e.target.value.replace(/\D/g, "").slice(0, 11);
            const fmt = raw.length <= 3 ? raw
              : raw.length <= 7 ? `${raw.slice(0, 3)}-${raw.slice(3)}`
              : `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7)}`;
            onChange("phone", fmt);
          }}
          className="w-full px-3 py-2.5 text-sm border border-border rounded-xl outline-none focus:ring-2 focus:ring-[var(--teal)]/30 placeholder:text-muted-foreground/50"
        />
      </div>

      {/* 근무지 */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          <span className="flex items-center gap-1.5"><MapPin size={13} />근무지</span>
        </label>
        <select
          value={form.location}
          onChange={(e) => onChange("location", e.target.value)}
          className="w-full px-3 py-2.5 text-sm border border-border rounded-xl outline-none focus:ring-2 focus:ring-[var(--teal)]/30 bg-white"
        >
          {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
        </select>
      </div>

      {/* 입사일 + 생년월일 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            <span className="flex items-center gap-1.5"><Calendar size={13} />입사일 <span className="text-destructive">*</span></span>
          </label>
          <input
            type="date"
            value={form.joinDate}
            onChange={(e) => onChange("joinDate", e.target.value)}
            className={cn(
              "w-full px-3 py-2.5 text-sm border rounded-xl outline-none transition-all",
              "focus:ring-2 focus:ring-[var(--teal)]/30",
              errors.joinDate ? "border-destructive bg-red-50/30" : "border-border"
            )}
          />
          <FieldError msg={errors.joinDate} />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            <span className="flex items-center gap-1.5"><Calendar size={13} />생년월일</span>
          </label>
          <input
            type="date"
            value={form.birthDate}
            onChange={(e) => onChange("birthDate", e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-border rounded-xl outline-none focus:ring-2 focus:ring-[var(--teal)]/30"
          />
        </div>
      </div>

      {/* 직속 상관 + 연차 수 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-1">
          <label className="block text-sm font-medium text-foreground mb-1.5">
            <span className="flex items-center gap-1.5"><Briefcase size={13} />직속 상관</span>
          </label>
          <input
            type="text"
            placeholder="상관 이름 입력"
            value={form.manager}
            onChange={(e) => onChange("manager", e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-border rounded-xl outline-none focus:ring-2 focus:ring-[var(--teal)]/30 placeholder:text-muted-foreground/50"
          />
        </div>
        <div className="col-span-1">
          <label className="block text-sm font-medium text-foreground mb-1.5">
            <span className="flex items-center gap-1.5"><Calendar size={13} />연차 수 (일) <span className="text-destructive">*</span></span>
          </label>
          <input
            type="number"
            min={0}
            max={365}
            placeholder="15"
            value={form.leaveTotal}
            onChange={(e) => onChange("leaveTotal", e.target.value)}
            className={cn(
              "w-full px-3 py-2.5 text-sm border rounded-xl outline-none transition-all",
              "focus:ring-2 focus:ring-[var(--teal)]/30 placeholder:text-muted-foreground/50",
              errors.leaveTotal ? "border-destructive bg-red-50/30" : "border-border"
            )}
          />
          <FieldError msg={errors.leaveTotal} />
          <p className="text-[10px] text-muted-foreground mt-1">입사 기준 부여 연차 총일수</p>
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: 스킬 & 추가 정보 ─────────────────────────────────────────────────

function Step3({
  form,
  onChange,
  onSkillsChange,
}: {
  form: EmployeeFormData;
  onChange: (field: keyof EmployeeFormData, value: string) => void;
  onSkillsChange: (skills: string[]) => void;
}) {
  const [skillInput, setSkillInput] = useState("");
  const suggestions = (SKILL_SUGGESTIONS[form.dept] || []).filter(
    (s) => !form.skills.includes(s)
  );

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (!trimmed || form.skills.includes(trimmed)) return;
    onSkillsChange([...form.skills, trimmed]);
    setSkillInput("");
  };

  const removeSkill = (skill: string) => {
    onSkillsChange(form.skills.filter((s) => s !== skill));
  };

  return (
    <div className="space-y-4">
      {/* Skills */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          <span className="flex items-center gap-1.5"><Star size={13} />보유 스킬</span>
        </label>

        {/* Tag input */}
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="스킬 직접 입력 후 Enter"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addSkill(skillInput); }
            }}
            className="flex-1 px-3 py-2 text-sm border border-border rounded-xl outline-none focus:ring-2 focus:ring-[var(--teal)]/30 placeholder:text-muted-foreground/50"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-xl px-3 shrink-0"
            onClick={() => addSkill(skillInput)}
          >
            <Plus size={14} />
          </Button>
        </div>

        {/* Added tags */}
        {form.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3 p-3 bg-[var(--teal-light)] rounded-xl min-h-10">
            {form.skills.map((s) => (
              <span
                key={s}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium text-[var(--teal-dark)]"
                style={{ background: "oklch(0.65 0.14 185 / 0.15)" }}
              >
                {s}
                <button
                  type="button"
                  onClick={() => removeSkill(s)}
                  className="text-[var(--teal-dark)]/60 hover:text-[var(--coral)] transition-colors"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div>
            <div className="text-[11px] text-muted-foreground mb-1.5">
              {form.dept} 추천 스킬
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.slice(0, 8).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addSkill(s)}
                  className="text-[11px] px-2.5 py-1 rounded-lg border border-dashed border-border text-muted-foreground hover:border-[var(--teal)] hover:text-[var(--teal)] hover:bg-[var(--teal-light)] transition-all"
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 참여 점수 */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          <span className="flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Star size={13} />초기 참여 점수</span>
            <span className="mono-num font-bold text-[var(--teal)]">{form.engagementScore}점</span>
          </span>
        </label>
        <input
          type="range"
          min={0}
          max={100}
          value={form.engagementScore}
          onChange={(e) => onChange("engagementScore", e.target.value)}
          className="w-full accent-[var(--teal)] h-2"
          style={{ accentColor: "var(--teal)" }}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
        </div>
      </div>

      {/* 메모 */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">메모 (선택)</label>
        <textarea
          placeholder="특이사항, 채용 경로, 추가 메모 등..."
          value={form.memo}
          onChange={(e) => onChange("memo", e.target.value)}
          rows={3}
          className="w-full px-3 py-2.5 text-sm border border-border rounded-xl outline-none focus:ring-2 focus:ring-[var(--teal)]/30 resize-none placeholder:text-muted-foreground/50"
        />
      </div>

      {/* Summary preview */}
      <div className="p-4 bg-muted/40 rounded-2xl border border-border">
        <div className="text-xs font-semibold text-muted-foreground mb-2">등록 정보 요약</div>
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 shrink-0">
            <AvatarFallback className="text-xs font-bold text-white" style={{ background: form.color }}>
              {getAvatarText(form.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="text-sm font-bold text-foreground">{form.name || "—"}</div>
            <div className="text-xs text-muted-foreground">
              {form.dept} · {form.role || "—"} · {form.grade}
            </div>
            <div className="text-xs text-muted-foreground">{form.email || "—"}</div>
          </div>
          <div className="ml-auto text-right">
            <div
              className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full",
                form.status === "재직" ? "bg-emerald-50 text-emerald-600"
                : form.status === "수습" ? "bg-amber-50 text-amber-600"
                : "bg-slate-100 text-slate-500"
              )}
            >
              {form.status}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function EmployeeFormModal({
  open,
  onClose,
  onSubmit,
  initialData,
}: EmployeeFormModalProps) {
  const isEdit = !!initialData?.id;
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<EmployeeFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof EmployeeFormData, string>>>({});

  // Populate form when editing
  useEffect(() => {
    if (open) {
      setStep(0);
      setErrors({});
      if (initialData) {
        setForm({ ...EMPTY_FORM, ...initialData } as EmployeeFormData);
      } else {
        setForm({
          ...EMPTY_FORM,
          color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
        });
      }
    }
  }, [open, initialData]);

  const handleChange = (field: keyof EmployeeFormData, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: (field === "engagementScore" || field === "leaveTotal") ? Number(value) : value,
      ...(field === "name" ? { avatar: getAvatarText(value) } : {}),
    }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSkillsChange = (skills: string[]) => {
    setForm((prev) => ({ ...prev, skills }));
  };

  // Validate per step
  const validate = (s: number): boolean => {
    const newErrors: Partial<Record<keyof EmployeeFormData, string>> = {};
    if (s === 0) {
      if (!form.name.trim()) newErrors.name = "이름을 입력해주세요";
      else if (form.name.trim().length < 2) newErrors.name = "이름은 2자 이상이어야 합니다";
      if (!form.role.trim()) newErrors.role = "직책을 입력해주세요";
    }
    if (s === 1) {
      if (!form.email.trim()) newErrors.email = "이메일을 입력해주세요";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        newErrors.email = "올바른 이메일 형식을 입력해주세요";
      if (!form.joinDate) newErrors.joinDate = "입사일을 선택해주세요";
      if (form.leaveTotal < 0 || form.leaveTotal > 365)
        newErrors.leaveTotal = "연차 수는 0~365일 사이로 입력해주세요";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validate(step)) return;
    setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => s - 1);

  const handleSubmit = () => {
    if (!validate(step)) return;
    const finalData: EmployeeFormData = {
      ...form,
      avatar: getAvatarText(form.name),
      id: initialData?.id ?? Date.now(),
      // Format joinDate display
      joinDate: form.joinDate
        ? new Date(form.joinDate).toLocaleDateString("ko-KR", {
            year: "numeric", month: "2-digit", day: "2-digit",
          }).replace(/\. /g, ".").replace(/\.$/, "")
        : form.joinDate,
      birthDate: form.birthDate
        ? new Date(form.birthDate).toLocaleDateString("ko-KR", {
            year: "numeric", month: "2-digit", day: "2-digit",
          }).replace(/\. /g, ".").replace(/\.$/, "")
        : form.birthDate,
    };
    onSubmit(finalData);
    toast.success(isEdit ? "직원 정보가 수정되었습니다" : "새 직원이 등록되었습니다", {
      description: `${finalData.name} · ${finalData.dept} · ${finalData.role}`,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-lg rounded-2xl p-0 overflow-hidden gap-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Modal Header */}
        <DialogHeader className="px-6 pt-6 pb-0">
          <div className="flex items-center justify-between mb-1">
            <DialogTitle className="text-lg font-bold text-foreground">
              {isEdit ? "직원 정보 수정" : "신규 직원 등록"}
            </DialogTitle>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-5">
            {isEdit
              ? `${form.name}의 정보를 수정합니다`
              : "3단계로 직원 정보를 입력해주세요"}
          </p>
          <StepIndicator current={step} />
        </DialogHeader>

        {/* Step Content */}
        <div
          className="px-6 pb-2 overflow-y-auto"
          style={{ maxHeight: "calc(80vh - 220px)", minHeight: "280px" }}
          key={step}
        >
          <div style={{ animation: "pageIn 0.18s cubic-bezier(0.23,1,0.32,1) both" }}>
            {step === 0 && (
              <Step1 form={form} errors={errors} onChange={handleChange} />
            )}
            {step === 1 && (
              <Step2 form={form} errors={errors} onChange={handleChange} />
            )}
            {step === 2 && (
              <Step3 form={form} onChange={handleChange} onSkillsChange={handleSkillsChange} />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/20">
          <div className="text-xs text-muted-foreground">
            {step + 1} / {STEPS.length} 단계
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl gap-1.5 text-sm"
                onClick={handleBack}
              >
                <ChevronLeft size={14} />
                이전
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button
                size="sm"
                className="rounded-xl gap-1.5 text-sm text-white min-w-24"
                style={{ background: "var(--teal)" }}
                onClick={handleNext}
              >
                다음
                <ChevronRight size={14} />
              </Button>
            ) : (
              <Button
                size="sm"
                className="rounded-xl gap-1.5 text-sm text-white min-w-28"
                style={{ background: "var(--teal)" }}
                onClick={handleSubmit}
              >
                <Check size={14} />
                {isEdit ? "수정 완료" : "등록 완료"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
