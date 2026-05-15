/**
 * leavePolicy.ts — TeamPulse 연차 정책 스토어 & 자동 계산 유틸
 * Design: Soft Teal Clarity
 *
 * 연차 계산 방식:
 * 1. 근속연수 기반 (default): 입사일로부터 경과 연수에 따라 정책 테이블 참조
 * 2. 회계연도 기반: 매년 1월 1일 기준 일괄 부여
 *
 * 근로기준법 기본값:
 * - 1년 미만: 매월 1일 (최대 11일)
 * - 1년 이상: 15일 + 2년마다 1일 추가 (최대 25일)
 */

export type LeaveCalcMode = "tenure" | "fiscal";

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
    { yearsFrom: 0, yearsTo: 1,  days: 11, label: "1년 미만 (월 1일 × 11개월)" },
    { yearsFrom: 1, yearsTo: 3,  days: 15, label: "1년 이상 ~ 3년 미만" },
    { yearsFrom: 3, yearsTo: 5,  days: 16, label: "3년 이상 ~ 5년 미만" },
    { yearsFrom: 5, yearsTo: 7,  days: 17, label: "5년 이상 ~ 7년 미만" },
    { yearsFrom: 7, yearsTo: 9,  days: 18, label: "7년 이상 ~ 9년 미만" },
    { yearsFrom: 9, yearsTo: 11, days: 19, label: "9년 이상 ~ 11년 미만" },
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
 * @param joinDateStr "YYYY.MM.DD" 또는 "YYYY-MM-DD" 형식
 * @param policy 연차 정책
 * @param referenceDate 기준일 (기본: 오늘)
 */
export function calcLeaveByPolicy(
  joinDateStr: string,
  policy: LeavePolicy,
  referenceDate?: Date
): { days: number; rule: LeavePolicyRule | null; tenureYears: number; tenureMonths: number } {
  const ref = referenceDate ?? new Date();

  // 날짜 파싱 (YYYY.MM.DD 또는 YYYY-MM-DD)
  const normalized = joinDateStr.replace(/\./g, "-");
  const joinDate = new Date(normalized);
  if (isNaN(joinDate.getTime())) {
    return { days: 0, rule: null, tenureYears: 0, tenureMonths: 0 };
  }

  // 근속 개월 수
  const totalMonths =
    (ref.getFullYear() - joinDate.getFullYear()) * 12 +
    (ref.getMonth() - joinDate.getMonth());
  const tenureYears = Math.floor(totalMonths / 12);
  const tenureMonths = totalMonths % 12;

  if (policy.calcMode === "fiscal") {
    // 회계연도 기준: 이번 회계연도 시작일 기준으로 근속연수 계산
    const fiscalStart = new Date(ref.getFullYear(), policy.fiscalMonthStart - 1, 1);
    const fiscalMonths =
      (fiscalStart.getFullYear() - joinDate.getFullYear()) * 12 +
      (fiscalStart.getMonth() - joinDate.getMonth());
    const fiscalYears = Math.floor(fiscalMonths / 12);
    const rule = findRule(policy.rules, fiscalYears);
    const days = Math.min(rule?.days ?? 0, policy.maxDays);
    return { days, rule: rule ?? null, tenureYears, tenureMonths };
  }

  // 근속연수 기반
  const rule = findRule(policy.rules, tenureYears);
  const days = Math.min(rule?.days ?? 0, policy.maxDays);
  return { days, rule: rule ?? null, tenureYears, tenureMonths };
}

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
