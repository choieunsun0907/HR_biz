/**
 * leavePolicy.ts — TeamPulse 연차 정책 스토어 & 자동 계산 유틸
 * Design: Soft Teal Clarity
 *
 * 연차 계산 방식:
 * 1. 근속연수 기반 (default): 입사일로부터 경과 연수에 따라 정책 테이블 참조
 * 2. 회계연도 기반: 매년 1월 1일 기준 일괄 부여
 *
 * 전환 로직 (입사일 기준 → 회계연도 기준):
 * - 전환 연도 한정으로 일할 계산 적용
 * - 전환 시행일 ~ 12월 31일 잔여 일수 / 연도 전체 일수 × 회계연도 기준 연차
 * - 소수점 처리: 올림 / 반올림 / 내림 선택 가능
 */

export type LeaveCalcMode = "tenure" | "fiscal";
export type RoundingMode = "ceil" | "round" | "floor";

export interface LeavePolicyRule {
  yearsFrom: number; // 이상 (inclusive)
  yearsTo: number;   // 미만 (exclusive), -1 = 무제한
  days: number;
  label: string;
}

export interface LeavePolicy {
  calcMode: LeaveCalcMode;
  rules: LeavePolicyRule[];
  fiscalMonthStart: number; // 회계연도 시작 월 (1~12)
  probationDays: number;    // 수습 기간 중 월별 부여일 (기본 1)
  maxDays: number;          // 최대 연차 상한
}

// 기본 정책 (근로기준법 기준)
export const DEFAULT_POLICY: LeavePolicy = {
  calcMode: "tenure",
  fiscalMonthStart: 1,
  probationDays: 1,
  maxDays: 25,
  rules: [
    { yearsFrom: 0,  yearsTo: 1,  days: 11, label: "1년 미만 (월 1일 × 11개월)" },
    { yearsFrom: 1,  yearsTo: 3,  days: 15, label: "1년 이상 ~ 3년 미만" },
    { yearsFrom: 3,  yearsTo: 5,  days: 16, label: "3년 이상 ~ 5년 미만" },
    { yearsFrom: 5,  yearsTo: 7,  days: 17, label: "5년 이상 ~ 7년 미만" },
    { yearsFrom: 7,  yearsTo: 9,  days: 18, label: "7년 이상 ~ 9년 미만" },
    { yearsFrom: 9,  yearsTo: 11, days: 19, label: "9년 이상 ~ 11년 미만" },
    { yearsFrom: 11, yearsTo: 13, days: 20, label: "11년 이상 ~ 13년 미만" },
    { yearsFrom: 13, yearsTo: 15, days: 21, label: "13년 이상 ~ 15년 미만" },
    { yearsFrom: 15, yearsTo: 17, days: 22, label: "15년 이상 ~ 17년 미만" },
    { yearsFrom: 17, yearsTo: 19, days: 23, label: "17년 이상 ~ 19년 미만" },
    { yearsFrom: 19, yearsTo: 21, days: 24, label: "19년 이상 ~ 21년 미만" },
    { yearsFrom: 21, yearsTo: -1, days: 25, label: "21년 이상" },
  ],
};

// localStorage 키
const STORAGE_KEY = "teampulse_leave_policy";

export function loadPolicy(): LeavePolicy {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_POLICY, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return { ...DEFAULT_POLICY };
}

export function savePolicy(policy: LeavePolicy): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(policy));
}

/**
 * 입사일과 정책을 기반으로 이번 연도 부여 연차 수를 계산
 */
export function calcLeaveByPolicy(
  joinDateStr: string,
  policy: LeavePolicy,
  referenceDate?: Date
): { days: number; rule: LeavePolicyRule | null; tenureYears: number; tenureMonths: number } {
  const ref = referenceDate ?? new Date();
  const normalized = joinDateStr.replace(/\./g, "-");
  const joinDate = new Date(normalized);
  if (isNaN(joinDate.getTime())) {
    return { days: 0, rule: null, tenureYears: 0, tenureMonths: 0 };
  }

  const totalMonths =
    (ref.getFullYear() - joinDate.getFullYear()) * 12 +
    (ref.getMonth() - joinDate.getMonth());
  const tenureYears = Math.floor(totalMonths / 12);
  const tenureMonths = totalMonths % 12;

  if (policy.calcMode === "fiscal") {
    const fiscalStart = new Date(ref.getFullYear(), policy.fiscalMonthStart - 1, 1);
    const fiscalMonths =
      (fiscalStart.getFullYear() - joinDate.getFullYear()) * 12 +
      (fiscalStart.getMonth() - joinDate.getMonth());
    const fiscalYears = Math.floor(fiscalMonths / 12);
    const rule = findRule(policy.rules, fiscalYears);
    const days = Math.min(rule?.days ?? 0, policy.maxDays);
    return { days, rule: rule ?? null, tenureYears, tenureMonths };
  }

  const rule = findRule(policy.rules, tenureYears);
  const days = Math.min(rule?.days ?? 0, policy.maxDays);
  return { days, rule: rule ?? null, tenureYears, tenureMonths };
}

// ─── 일할 계산 전환 로직 ──────────────────────────────────────────────────────

export interface TransitionEmployee {
  id: number;
  name: string;
  dept: string;
  joinDate: string;       // "YYYY-MM-DD"
  currentLeave: number;   // 현재 잔여 연차 (이미 사용분 차감된 값)
  usedLeave: number;      // 전환 시행일 이전 사용 연차
}

export interface TransitionResult {
  employee: TransitionEmployee;
  group: "pre-transition" | "post-transition" | "probation"; // 직원 분류
  tenureYears: number;
  tenureMonths: number;
  // 입사일 기준 현재 연차
  tenureBasedDays: number;
  // 회계연도 기준 연차 (일할 계산 전)
  fiscalBasedDays: number;
  // 일할 계산 비율 (잔여 일수 / 연도 전체 일수)
  prorationRatio: number;
  // 일할 계산 후 부여 연차 (소수점 처리 전)
  proratedRaw: number;
  // 일할 계산 후 부여 연차 (소수점 처리 후)
  proratedDays: number;
  // 이미 사용한 연차 차감 후 최종 잔여
  finalLeave: number;
  // 변경 전 대비 증감
  diff: number;
  // 경고: 최종 잔여가 음수였다가 0으로 처리된 경우
  wasNegative: boolean;
}

/**
 * 연도의 전체 일수 (윤년 고려)
 */
function daysInYear(year: number): number {
  return (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 366 : 365;
}

/**
 * 두 날짜 사이의 일수 (당일 포함)
 */
function daysBetweenInclusive(from: Date, to: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((to.getTime() - from.getTime()) / msPerDay) + 1;
}

/**
 * 소수점 처리
 */
function applyRounding(value: number, mode: RoundingMode): number {
  switch (mode) {
    case "ceil":  return Math.ceil(value);
    case "round": return Math.round(value);
    case "floor": return Math.floor(value);
  }
}

/**
 * 근속연수 계산 (기준일 기준)
 */
function calcTenure(joinDateStr: string, referenceDate: Date) {
  const normalized = joinDateStr.replace(/\./g, "-");
  const joinDate = new Date(normalized);
  if (isNaN(joinDate.getTime())) return { years: 0, months: 0, joinDate: new Date() };
  const totalMonths =
    (referenceDate.getFullYear() - joinDate.getFullYear()) * 12 +
    (referenceDate.getMonth() - joinDate.getMonth());
  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    joinDate,
  };
}

/**
 * 일할 계산 전환 시뮬레이션
 *
 * @param employees 전환 대상 직원 목록
 * @param transitionDateStr 전환 시행일 "YYYY-MM-DD"
 * @param policy 연차 정책 (회계연도 기준 규칙 포함)
 * @param roundingMode 소수점 처리 방식
 */
export function simulateTransition(
  employees: TransitionEmployee[],
  transitionDateStr: string,
  policy: LeavePolicy,
  roundingMode: RoundingMode = "ceil"
): TransitionResult[] {
  const transitionDate = new Date(transitionDateStr);
  if (isNaN(transitionDate.getTime())) return [];

  const year = transitionDate.getFullYear();
  const yearEnd = new Date(year, 11, 31); // 12월 31일
  const yearStart = new Date(year, 0, 1); // 1월 1일
  const totalDaysInYear = daysInYear(year);

  // 전환 시행일 ~ 12월 31일 잔여 일수 (당일 포함)
  const remainingDays = daysBetweenInclusive(transitionDate, yearEnd);
  // 비율
  const prorationRatio = remainingDays / totalDaysInYear;

  return employees.map((emp): TransitionResult => {
    const tenureAtTransition = calcTenure(emp.joinDate, transitionDate);
    const { years: tenureYears, months: tenureMonths, joinDate } = tenureAtTransition;

    // ── 그룹 분류 ──────────────────────────────────────────────────────────────
    // 전환 시행일 이후 입사자: 처음부터 회계연도 기준 적용
    if (joinDate >= transitionDate) {
      const fiscalResult = calcLeaveByPolicy(emp.joinDate, { ...policy, calcMode: "fiscal" }, yearStart);
      return {
        employee: emp,
        group: "post-transition",
        tenureYears,
        tenureMonths,
        tenureBasedDays: emp.currentLeave,
        fiscalBasedDays: fiscalResult.days,
        prorationRatio: 1,
        proratedRaw: fiscalResult.days,
        proratedDays: fiscalResult.days,
        finalLeave: fiscalResult.days,
        diff: fiscalResult.days - emp.currentLeave,
        wasNegative: false,
      };
    }

    // 1년 미만 수습 직원: 잔여 월 수 × probationDays
    if (tenureYears === 0) {
      // 전환 시행월부터 12월까지 남은 월 수
      const remainingMonths = 12 - transitionDate.getMonth(); // getMonth() 0-indexed
      const proratedDays = Math.min(remainingMonths * policy.probationDays, policy.maxDays);
      const finalLeaveRaw = proratedDays - emp.usedLeave;
      const wasNegative = finalLeaveRaw < 0;
      return {
        employee: emp,
        group: "probation",
        tenureYears,
        tenureMonths,
        tenureBasedDays: emp.currentLeave,
        fiscalBasedDays: proratedDays,
        prorationRatio: remainingMonths / 12,
        proratedRaw: remainingMonths * policy.probationDays,
        proratedDays,
        finalLeave: Math.max(0, finalLeaveRaw),
        diff: Math.max(0, finalLeaveRaw) - emp.currentLeave,
        wasNegative,
      };
    }

    // ── 전환 전 입사자 (1년 이상): 일할 계산 적용 ──────────────────────────────
    // 회계연도 기준 연차 (전환 연도 1월 1일 기준 근속연수로 계산)
    const fiscalResult = calcLeaveByPolicy(emp.joinDate, { ...policy, calcMode: "fiscal" }, yearStart);
    const fiscalBasedDays = fiscalResult.days;

    // 일할 계산 (소수점 처리 전)
    const proratedRaw = fiscalBasedDays * prorationRatio;
    // 소수점 처리
    const proratedDays = Math.min(applyRounding(proratedRaw, roundingMode), policy.maxDays);

    // 이미 사용한 연차 차감
    const finalLeaveRaw = proratedDays - emp.usedLeave;
    const wasNegative = finalLeaveRaw < 0;
    const finalLeave = Math.max(0, finalLeaveRaw);

    return {
      employee: emp,
      group: "pre-transition",
      tenureYears,
      tenureMonths,
      tenureBasedDays: emp.currentLeave,
      fiscalBasedDays,
      prorationRatio,
      proratedRaw,
      proratedDays,
      finalLeave,
      diff: finalLeave - emp.currentLeave,
      wasNegative,
    };
  });
}

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

function findRule(rules: LeavePolicyRule[], years: number): LeavePolicyRule | undefined {
  return rules.find(
    (r) => years >= r.yearsFrom && (r.yearsTo === -1 || years < r.yearsTo)
  );
}

/** 근속 기간 한국어 표현 */
export function formatTenure(years: number, months: number): string {
  if (years === 0 && months === 0) return "입사 당일";
  if (years === 0) return `${months}개월`;
  if (months === 0) return `${years}년`;
  return `${years}년 ${months}개월`;
}

/** 비율을 퍼센트 문자열로 */
export function formatRatio(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}
