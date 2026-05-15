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

import { useState, useMemo } from "react";
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
  ChevronRight,
  Briefcase,
  Building2,
  CheckCircle2,
  Pencil,
} from "lucide-react";
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

// ─── Mock Data ────────────────────────────────────────────────────────────────

const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 1, name: "이준혁", avatar: "이준", dept: "개발팀", role: "Frontend Engineer", grade: "선임",
    status: "재직", email: "junhyuk.lee@teampulse.kr", phone: "010-1234-5678",
    location: "서울 강남구", joinDate: "2022.03.07", birthDate: "1993.06.15",
    manager: "김태호", engagementScore: 92, leaveBalance: 9, leaveUsed: 6,
    attendanceRate: 98, skills: ["React", "TypeScript", "Next.js", "Figma"],
    recentActivity: [
      { date: "05.15", content: "React 19 마이그레이션 가이드 게시판 공유" },
      { date: "05.14", content: "외근 체크인 — 판교 오피스" },
      { date: "05.12", content: "연차 신청 (05.19~05.21)" },
    ],
    color: "oklch(0.65 0.14 185)",
  },
  {
    id: 2, name: "박소연", avatar: "박소", dept: "마케팅", role: "Brand Manager", grade: "책임",
    status: "재직", email: "soyeon.park@teampulse.kr", phone: "010-2345-6789",
    location: "서울 마포구", joinDate: "2020.08.17", birthDate: "1990.11.03",
    manager: "최지현", engagementScore: 88, leaveBalance: 7, leaveUsed: 8,
    attendanceRate: 96, skills: ["Brand Strategy", "Copywriting", "Adobe CC", "SNS 마케팅"],
    recentActivity: [
      { date: "05.14", content: "Q2 브랜드 캠페인 결과 보고서 공유" },
      { date: "05.10", content: "입사 5주년 기념일" },
      { date: "05.08", content: "워크샵 참가 신청 완료" },
    ],
    color: "oklch(0.65 0.20 300)",
  },
  {
    id: 3, name: "정하은", avatar: "정하", dept: "디자인", role: "UX Designer", grade: "선임",
    status: "재직", email: "haeun.jung@teampulse.kr", phone: "010-3456-7890",
    location: "서울 성동구", joinDate: "2021.11.22", birthDate: "1995.02.28",
    manager: "최지원", engagementScore: 95, leaveBalance: 11, leaveUsed: 4,
    attendanceRate: 99, skills: ["Figma", "Prototyping", "User Research", "Motion Design"],
    recentActivity: [
      { date: "05.13", content: "2025 UI 가이드라인 v2.0 배포" },
      { date: "05.11", content: "UX 리서치 인터뷰 진행" },
      { date: "05.09", content: "디자인 시스템 컴포넌트 업데이트" },
    ],
    color: "oklch(0.65 0.18 340)",
  },
  {
    id: 4, name: "김태호", avatar: "김태", dept: "개발팀", role: "Backend Engineer", grade: "수석",
    status: "재직", email: "taeho.kim@teampulse.kr", phone: "010-4567-8901",
    location: "경기 성남시", joinDate: "2018.05.14", birthDate: "1988.09.20",
    manager: "박민준", engagementScore: 85, leaveBalance: 6, leaveUsed: 9,
    attendanceRate: 97, skills: ["Java", "Spring Boot", "Kubernetes", "PostgreSQL"],
    recentActivity: [
      { date: "05.15", content: "API 성능 최적화 배포 완료" },
      { date: "05.13", content: "코드 리뷰 — 이준혁 PR 승인" },
      { date: "05.10", content: "사내 기술 세미나 발표" },
    ],
    color: "oklch(0.55 0.15 240)",
  },
  {
    id: 5, name: "홍길동", avatar: "홍길", dept: "영업팀", role: "Sales Lead", grade: "책임",
    status: "재직", email: "gildong.hong@teampulse.kr", phone: "010-5678-9012",
    location: "서울 여의도", joinDate: "2019.02.11", birthDate: "1991.04.07",
    manager: "이수진", engagementScore: 78, leaveBalance: 5, leaveUsed: 10,
    attendanceRate: 94, skills: ["B2B 영업", "CRM", "협상", "고객 관리"],
    recentActivity: [
      { date: "05.15", content: "5월 영업 목표 달성 현황 공유" },
      { date: "05.12", content: "신규 고객사 미팅 — A사 계약 체결" },
      { date: "05.08", content: "분기 영업 전략 회의 참석" },
    ],
    color: "oklch(0.65 0.18 60)",
  },
  {
    id: 6, name: "최지원", avatar: "최지", dept: "디자인", role: "Visual Designer", grade: "선임",
    status: "재직", email: "jiwon.choi@teampulse.kr", phone: "010-6789-0123",
    location: "서울 강남구", joinDate: "2021.06.01", birthDate: "1994.12.10",
    manager: "정하은", engagementScore: 91, leaveBalance: 10, leaveUsed: 5,
    attendanceRate: 98, skills: ["Illustrator", "Photoshop", "Brand Identity", "3D"],
    recentActivity: [
      { date: "05.14", content: "신규 브랜드 에셋 제작 완료" },
      { date: "05.12", content: "마케팅팀 협업 — 캠페인 비주얼" },
      { date: "05.07", content: "디자인 피드백 세션 진행" },
    ],
    color: "oklch(0.65 0.20 25)",
  },
  {
    id: 7, name: "이수진", avatar: "이수", dept: "마케팅", role: "Content Writer", grade: "주임",
    status: "재직", email: "sujin.lee@teampulse.kr", phone: "010-7890-1234",
    location: "서울 마포구", joinDate: "2023.01.09", birthDate: "1997.07.22",
    manager: "박소연", engagementScore: 82, leaveBalance: 12, leaveUsed: 3,
    attendanceRate: 97, skills: ["콘텐츠 기획", "SEO", "카피라이팅", "영상 편집"],
    recentActivity: [
      { date: "05.15", content: "5월 뉴스레터 발행" },
      { date: "05.13", content: "블로그 포스팅 3건 업로드" },
      { date: "05.10", content: "콘텐츠 캘린더 6월분 작성" },
    ],
    color: "oklch(0.60 0.15 160)",
  },
  {
    id: 8, name: "박민준", avatar: "박민", dept: "개발팀", role: "DevOps Engineer", grade: "책임",
    status: "휴직", email: "minjun.park@teampulse.kr", phone: "010-8901-2345",
    location: "경기 수원시", joinDate: "2019.09.23", birthDate: "1989.03.14",
    manager: "김태호", engagementScore: 76, leaveBalance: 15, leaveUsed: 0,
    attendanceRate: 0, skills: ["AWS", "Docker", "CI/CD", "Terraform"],
    recentActivity: [
      { date: "04.30", content: "육아 휴직 시작" },
      { date: "04.29", content: "인수인계 문서 작성 완료" },
      { date: "04.25", content: "인프라 모니터링 대시보드 구축" },
    ],
    color: "oklch(0.55 0.10 220)",
  },
  {
    id: 9, name: "강다은", avatar: "강다", dept: "인사팀", role: "HR Specialist", grade: "주임",
    status: "수습", email: "daeun.kang@teampulse.kr", phone: "010-9012-3456",
    location: "서울 강남구", joinDate: "2025.04.07", birthDate: "1999.01.30",
    manager: "김인사", engagementScore: 88, leaveBalance: 11, leaveUsed: 0,
    attendanceRate: 100, skills: ["채용", "온보딩", "노무", "Excel"],
    recentActivity: [
      { date: "05.15", content: "신입사원 온보딩 자료 검토" },
      { date: "05.13", content: "채용 공고 3건 등록" },
      { date: "05.09", content: "수습 1개월 평가 완료" },
    ],
    color: "oklch(0.65 0.14 185)",
  },
  {
    id: 10, name: "윤재원", avatar: "윤재", dept: "재무팀", role: "Financial Analyst", grade: "선임",
    status: "재직", email: "jaewon.yoon@teampulse.kr", phone: "010-0123-4567",
    location: "서울 여의도", joinDate: "2020.11.30", birthDate: "1992.08.17",
    manager: "오세진", engagementScore: 80, leaveBalance: 8, leaveUsed: 7,
    attendanceRate: 96, skills: ["재무 분석", "Excel", "SAP", "회계"],
    recentActivity: [
      { date: "05.15", content: "Q1 재무 보고서 최종 검토" },
      { date: "05.12", content: "예산 집행 현황 보고" },
      { date: "05.08", content: "세무 신고 서류 제출" },
    ],
    color: "oklch(0.60 0.12 80)",
  },
  {
    id: 11, name: "오세진", avatar: "오세", dept: "재무팀", role: "CFO", grade: "임원",
    status: "재직", email: "sejin.oh@teampulse.kr", phone: "010-1111-2222",
    location: "서울 여의도", joinDate: "2015.03.02", birthDate: "1980.05.25",
    manager: "대표이사", engagementScore: 83, leaveBalance: 20, leaveUsed: 5,
    attendanceRate: 95, skills: ["재무 전략", "M&A", "투자", "리더십"],
    recentActivity: [
      { date: "05.15", content: "이사회 보고 자료 준비" },
      { date: "05.13", content: "투자사 미팅 — 시리즈 B 논의" },
      { date: "05.10", content: "전사 예산 조정 회의 주재" },
    ],
    color: "oklch(0.45 0.10 240)",
  },
  {
    id: 12, name: "신예린", avatar: "신예", dept: "영업팀", role: "Sales Representative", grade: "사원",
    status: "수습", email: "yerin.shin@teampulse.kr", phone: "010-2222-3333",
    location: "서울 여의도", joinDate: "2025.05.02", birthDate: "2000.09.11",
    manager: "홍길동", engagementScore: 90, leaveBalance: 15, leaveUsed: 0,
    attendanceRate: 100, skills: ["고객 응대", "제안서 작성", "PPT", "영어"],
    recentActivity: [
      { date: "05.15", content: "신규 고객사 콜드콜 20건 진행" },
      { date: "05.14", content: "영업 교육 프로그램 이수" },
      { date: "05.12", content: "첫 고객 미팅 동행 참여" },
    ],
    color: "oklch(0.65 0.18 60)",
  },
];

const DEPTS = ["전체", "개발팀", "마케팅", "디자인", "영업팀", "인사팀", "재무팀"];
const STATUSES = ["전체", "재직", "수습", "휴직"];
const GRADES = ["전체", "사원", "주임", "선임", "책임", "수석", "임원"];

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
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [query, setQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("전체");
  const [statusFilter, setStatusFilter] = useState("전체");
  const [gradeFilter, setGradeFilter] = useState("전체");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Partial<EmployeeFormData> | null>(null);

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

  // Handle form submit (add or update)
  const handleFormSubmit = (data: EmployeeFormData) => {
    setEmployees((prev) => {
      const exists = prev.find((e) => e.id === data.id);
      if (exists) {
        // Update existing
        const updated = prev.map((e) =>
          e.id === data.id
            ? {
                ...e,
                name: data.name,
                avatar: data.avatar || data.name.slice(0, 2),
                dept: data.dept,
                role: data.role,
                grade: data.grade,
                status: data.status,
                email: data.email,
                phone: data.phone,
                location: data.location,
                joinDate: data.joinDate,
                birthDate: data.birthDate,
                manager: data.manager,
                skills: data.skills,
                engagementScore: data.engagementScore,
                memo: data.memo,
                color: data.color,
                leaveBalance: data.leaveTotal !== undefined ? data.leaveTotal : e.leaveBalance,
              }
            : e
        );
        // Update selectedEmp if it's the one being edited
        const updatedEmp = updated.find((e) => e.id === data.id);
        if (updatedEmp && selectedEmp?.id === data.id) {
          setSelectedEmp(updatedEmp);
        }
        return updated;
      } else {
        // Add new employee
        const newEmp: Employee = {
          id: data.id ?? Date.now(),
          name: data.name,
          avatar: data.name.slice(0, 2),
          dept: data.dept,
          role: data.role,
          grade: data.grade,
          status: data.status,
          email: data.email,
          phone: data.phone,
          location: data.location,
          joinDate: data.joinDate,
          birthDate: data.birthDate,
          manager: data.manager,
          engagementScore: data.engagementScore,
          leaveBalance: data.leaveTotal ?? 15,
          leaveUsed: 0,
          attendanceRate: 100,
          skills: data.skills,
          recentActivity: [
            { date: new Date().toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" }).replace(". ", ".").replace(".", ""), content: "TeamPulse에 등록되었습니다" },
          ],
          color: data.color,
          memo: data.memo,
        };
        return [newEmp, ...prev];
      }
    });
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
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-xl text-xs"
                onClick={() => toast.info("직원 목록 엑셀 다운로드")}
              >
                <Download size={13} />
                내보내기
              </Button>
              <Button
                size="sm"
                className="gap-1.5 rounded-xl text-xs text-white"
                style={{ background: "var(--teal)" }}
                onClick={handleAddEmployee}
              >
                <UserPlus size={13} />
                직원 추가
              </Button>
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
          {filtered.length === 0 ? (
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
          ) : viewMode === "card" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 stagger">
              {filtered.map((emp) => (
                <EmployeeCard
                  key={emp.id}
                  emp={emp}
                  onClick={() => handleSelectEmp(emp)}
                  selected={selectedEmp?.id === emp.id}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
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
                        selectedEmp?.id === emp.id && "bg-[var(--teal-light)]"
                      )}
                      onClick={() => handleSelectEmp(emp)}
                    >
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
          )}
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
