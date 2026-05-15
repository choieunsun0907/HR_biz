/**
 * OrgChartPage — TeamPulse 조직도
 * Design: Soft Teal Clarity
 *
 * 기능:
 * - 회사 최상위 → 부서 → 팀장 → 팀원 계층형 트리 시각화
 * - 직원 노드 클릭 시 우측 상세 패널 표시
 * - 부서별 접기/펼치기
 * - 이름/부서 검색 및 하이라이트
 * - 줌 인/아웃 및 전체 보기
 * - 뷰 전환: 트리 뷰 / 카드 뷰
 */

import { useState, useMemo, useRef, useCallback } from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Users,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Award,
  LayoutGrid,
  GitBranch,
  Building2,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ─── 데이터 타입 ──────────────────────────────────────────────────────────────

interface OrgEmployee {
  id: number;
  name: string;
  title: string;       // 직책
  level: string;       // 직급
  dept: string;
  team: string;
  email: string;
  phone: string;
  location: string;
  joinDate: string;
  avatar: string;      // 아바타 색상
  skills: string[];
  reportsTo: number | null;
  isHead: boolean;     // 팀장 여부
  engagementScore: number;
}

interface Department {
  id: string;
  name: string;
  color: string;
  headId: number;
  members: OrgEmployee[];
}

// ─── 샘플 데이터 ──────────────────────────────────────────────────────────────

const ALL_EMPLOYEES: OrgEmployee[] = [
  // 경영진
  { id: 0,  name: "박대표",  title: "대표이사",    level: "C-Level", dept: "경영진",  team: "경영",   email: "ceo@ssaka.com",    phone: "010-1000-0001", location: "서울 본사", joinDate: "2010-01-01", avatar: "#0D9488", skills: ["경영전략", "사업개발"], reportsTo: null, isHead: true,  engagementScore: 95 },
  { id: 1,  name: "김인사",  title: "HR 본부장",   level: "임원",    dept: "인사팀",  team: "인사",   email: "hr@ssaka.com",     phone: "010-1000-0002", location: "서울 본사", joinDate: "2012-03-01", avatar: "#0891B2", skills: ["인사관리", "노무"], reportsTo: 0, isHead: true, engagementScore: 88 },
  { id: 2,  name: "이개발",  title: "CTO",         level: "C-Level", dept: "개발팀",  team: "개발",   email: "cto@ssaka.com",    phone: "010-1000-0003", location: "서울 본사", joinDate: "2011-06-01", avatar: "#7C3AED", skills: ["아키텍처", "기술전략"], reportsTo: 0, isHead: true, engagementScore: 92 },
  { id: 3,  name: "최마케팅", title: "마케팅 본부장", level: "임원",  dept: "마케팅",  team: "마케팅", email: "mkt@ssaka.com",    phone: "010-1000-0004", location: "서울 본사", joinDate: "2013-09-01", avatar: "#DB2777", skills: ["브랜드", "디지털마케팅"], reportsTo: 0, isHead: true, engagementScore: 85 },
  { id: 4,  name: "정영업",  title: "영업 본부장",  level: "임원",   dept: "영업팀",  team: "영업",   email: "sales@ssaka.com",  phone: "010-1000-0005", location: "서울 본사", joinDate: "2014-02-01", avatar: "#D97706", skills: ["영업전략", "고객관리"], reportsTo: 0, isHead: true, engagementScore: 90 },
  { id: 5,  name: "강디자인", title: "디자인 팀장", level: "팀장",   dept: "디자인",  team: "디자인", email: "design@ssaka.com", phone: "010-1000-0006", location: "서울 본사", joinDate: "2015-05-01", avatar: "#059669", skills: ["UI/UX", "브랜드디자인"], reportsTo: 0, isHead: true, engagementScore: 87 },
  { id: 6,  name: "윤재무",  title: "재무 팀장",   level: "팀장",   dept: "재무팀",  team: "재무",   email: "finance@ssaka.com", phone: "010-1000-0007", location: "서울 본사", joinDate: "2016-08-01", avatar: "#DC2626", skills: ["회계", "재무분석"], reportsTo: 0, isHead: true, engagementScore: 83 },

  // 인사팀
  { id: 10, name: "박채용",  title: "채용 담당",   level: "대리",   dept: "인사팀",  team: "채용",   email: "recruit@ssaka.com", phone: "010-2000-0001", location: "서울 본사", joinDate: "2020-03-01", avatar: "#0891B2", skills: ["채용", "면접"], reportsTo: 1, isHead: false, engagementScore: 82 },
  { id: 11, name: "최복지",  title: "복지 담당",   level: "사원",   dept: "인사팀",  team: "복지",   email: "welfare@ssaka.com", phone: "010-2000-0002", location: "서울 본사", joinDate: "2022-07-01", avatar: "#0891B2", skills: ["복리후생", "문화"], reportsTo: 1, isHead: false, engagementScore: 79 },
  { id: 12, name: "임교육",  title: "교육 담당",   level: "주임",   dept: "인사팀",  team: "교육",   email: "edu@ssaka.com",    phone: "010-2000-0003", location: "서울 본사", joinDate: "2021-01-01", avatar: "#0891B2", skills: ["교육기획", "HRD"], reportsTo: 1, isHead: false, engagementScore: 85 },

  // 개발팀
  { id: 20, name: "김민준",  title: "백엔드 개발", level: "과장",   dept: "개발팀",  team: "백엔드", email: "minjun@ssaka.com",  phone: "010-3000-0001", location: "서울 본사", joinDate: "2019-03-15", avatar: "#7C3AED", skills: ["Node.js", "Python", "AWS"], reportsTo: 2, isHead: false, engagementScore: 88 },
  { id: 21, name: "이서연",  title: "프론트엔드",  level: "대리",   dept: "개발팀",  team: "프론트", email: "seoyeon@ssaka.com", phone: "010-3000-0002", location: "서울 본사", joinDate: "2021-07-01", avatar: "#7C3AED", skills: ["React", "TypeScript"], reportsTo: 2, isHead: false, engagementScore: 91 },
  { id: 22, name: "윤성민",  title: "모바일 개발", level: "사원",   dept: "개발팀",  team: "모바일", email: "sungmin@ssaka.com", phone: "010-3000-0003", location: "서울 본사", joinDate: "2024-02-01", avatar: "#7C3AED", skills: ["Flutter", "Swift"], reportsTo: 2, isHead: false, engagementScore: 76 },
  { id: 23, name: "신재원",  title: "DevOps",      level: "차장",   dept: "개발팀",  team: "인프라", email: "jaewon@ssaka.com",  phone: "010-3000-0004", location: "서울 본사", joinDate: "2013-12-01", avatar: "#7C3AED", skills: ["Docker", "K8s", "CI/CD"], reportsTo: 2, isHead: false, engagementScore: 84 },

  // 마케팅
  { id: 30, name: "한승우",  title: "콘텐츠 마케터", level: "대리", dept: "마케팅",  team: "콘텐츠", email: "seungwoo@ssaka.com", phone: "010-4000-0001", location: "서울 본사", joinDate: "2022-04-11", avatar: "#DB2777", skills: ["콘텐츠", "SNS"], reportsTo: 3, isHead: false, engagementScore: 80 },
  { id: 31, name: "임지은",  title: "브랜드 마케터", level: "과장", dept: "마케팅",  team: "브랜드", email: "jieun@ssaka.com",   phone: "010-4000-0002", location: "서울 본사", joinDate: "2016-08-22", avatar: "#DB2777", skills: ["브랜딩", "광고기획"], reportsTo: 3, isHead: false, engagementScore: 87 },

  // 영업팀
  { id: 40, name: "최수아",  title: "영업 담당",   level: "사원",   dept: "영업팀",  team: "국내영업", email: "sua@ssaka.com",   phone: "010-5000-0001", location: "서울 본사", joinDate: "2023-11-20", avatar: "#D97706", skills: ["영업", "고객관리"], reportsTo: 4, isHead: false, engagementScore: 78 },
  { id: 41, name: "강하은",  title: "영업 대리",   level: "대리",   dept: "영업팀",  team: "국내영업", email: "haeun@ssaka.com",  phone: "010-5000-0002", location: "부산 지사", joinDate: "2020-09-14", avatar: "#D97706", skills: ["B2B영업", "제안서"], reportsTo: 4, isHead: false, engagementScore: 83 },

  // 디자인팀
  { id: 50, name: "오나연",  title: "UI 디자이너", level: "사원",   dept: "디자인",  team: "UI/UX",  email: "nayeon@ssaka.com", phone: "010-6000-0001", location: "서울 본사", joinDate: "2024-08-05", avatar: "#059669", skills: ["Figma", "UI디자인"], reportsTo: 5, isHead: false, engagementScore: 74 },
  { id: 51, name: "박지훈",  title: "그래픽 디자이너", level: "과장", dept: "디자인", team: "그래픽", email: "jihoon@ssaka.com",  phone: "010-6000-0002", location: "서울 본사", joinDate: "2015-01-10", avatar: "#059669", skills: ["Illustrator", "Photoshop"], reportsTo: 5, isHead: false, engagementScore: 86 },

  // 재무팀
  { id: 60, name: "배소희",  title: "회계 담당",   level: "대리",   dept: "재무팀",  team: "회계",   email: "sohee@ssaka.com",  phone: "010-7000-0001", location: "서울 본사", joinDate: "2017-06-30", avatar: "#DC2626", skills: ["회계", "세무"], reportsTo: 6, isHead: false, engagementScore: 81 },
  { id: 61, name: "정도현",  title: "예산 담당",   level: "과장",   dept: "재무팀",  team: "예산",   email: "dohyun@ssaka.com", phone: "010-7000-0002", location: "서울 본사", joinDate: "2018-05-03", avatar: "#DC2626", skills: ["예산관리", "재무계획"], reportsTo: 6, isHead: false, engagementScore: 88 },
];

const DEPARTMENTS: Department[] = [
  { id: "hr",      name: "인사팀",  color: "#0891B2", headId: 1,  members: ALL_EMPLOYEES.filter(e => e.dept === "인사팀") },
  { id: "dev",     name: "개발팀",  color: "#7C3AED", headId: 2,  members: ALL_EMPLOYEES.filter(e => e.dept === "개발팀") },
  { id: "mkt",     name: "마케팅",  color: "#DB2777", headId: 3,  members: ALL_EMPLOYEES.filter(e => e.dept === "마케팅") },
  { id: "sales",   name: "영업팀",  color: "#D97706", headId: 4,  members: ALL_EMPLOYEES.filter(e => e.dept === "영업팀") },
  { id: "design",  name: "디자인",  color: "#059669", headId: 5,  members: ALL_EMPLOYEES.filter(e => e.dept === "디자인") },
  { id: "finance", name: "재무팀",  color: "#DC2626", headId: 6,  members: ALL_EMPLOYEES.filter(e => e.dept === "재무팀") },
];

const CEO = ALL_EMPLOYEES.find(e => e.id === 0)!;

// ─── 아바타 컴포넌트 ──────────────────────────────────────────────────────────

function Avatar({ emp, size = "md" }: { emp: OrgEmployee; size?: "sm" | "md" | "lg" }) {
  const sizeClass = { sm: "w-7 h-7 text-xs", md: "w-10 h-10 text-sm", lg: "w-14 h-14 text-base" }[size];
  return (
    <div
      className={cn("rounded-full flex items-center justify-center font-bold text-white shrink-0", sizeClass)}
      style={{ background: emp.avatar }}
    >
      {emp.name.slice(0, 1)}
    </div>
  );
}

// ─── 직원 노드 (트리 뷰) ──────────────────────────────────────────────────────

function EmployeeNode({
  emp,
  isSelected,
  isHighlighted,
  onClick,
  deptColor,
  isHead = false,
}: {
  emp: OrgEmployee;
  isSelected: boolean;
  isHighlighted: boolean;
  onClick: () => void;
  deptColor: string;
  isHead?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex flex-col items-center gap-1.5 transition-all duration-200",
        isHighlighted && !isSelected && "opacity-100",
        !isHighlighted && !isSelected && "opacity-60 hover:opacity-100",
      )}
    >
      <div
        className={cn(
          "relative rounded-2xl p-3 border-2 transition-all duration-200 shadow-sm",
          "bg-white flex flex-col items-center gap-1 w-28",
          isSelected
            ? "border-[var(--teal)] shadow-md shadow-[var(--teal)]/20 scale-105"
            : isHighlighted
            ? "border-[var(--coral)] shadow-md"
            : "border-border hover:border-[var(--teal)]/50 hover:shadow-md"
        )}
      >
        {isHead && (
          <div
            className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-bold text-white whitespace-nowrap"
            style={{ background: deptColor }}
          >
            {emp.title.includes("대표") ? "대표" : emp.title.includes("본부장") ? "본부장" : "팀장"}
          </div>
        )}
        <Avatar emp={emp} size="md" />
        <div className="text-center">
          <div className="text-xs font-bold text-foreground leading-tight">{emp.name}</div>
          <div className="text-[10px] text-muted-foreground leading-tight mt-0.5 line-clamp-1">{emp.title}</div>
          <div
            className="text-[9px] font-medium px-1.5 py-0.5 rounded-full mt-1"
            style={{ background: `${deptColor}18`, color: deptColor }}
          >
            {emp.level}
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── 연결선 SVG ───────────────────────────────────────────────────────────────

function ConnectorLine({ color }: { color: string }) {
  return (
    <div className="flex justify-center">
      <div className="w-0.5 h-6" style={{ background: `${color}50` }} />
    </div>
  );
}

function HorizontalConnector({ count, color }: { count: number; color: string }) {
  if (count <= 1) return null;
  return (
    <div className="flex justify-center mb-0">
      <div className="h-0.5 w-[calc(100%-7rem)]" style={{ background: `${color}40` }} />
    </div>
  );
}

// ─── 부서 트리 블록 ───────────────────────────────────────────────────────────

function DeptBlock({
  dept,
  selectedId,
  highlightIds,
  onSelect,
  collapsed,
  onToggle,
}: {
  dept: Department;
  selectedId: number | null;
  highlightIds: Set<number>;
  onSelect: (emp: OrgEmployee) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const head = ALL_EMPLOYEES.find(e => e.id === dept.headId)!;
  const members = dept.members.filter(e => !e.isHead);

  return (
    <div className="flex flex-col items-center">
      {/* 부서 헤더 */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-semibold mb-3 cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
        style={{ background: dept.color }}
        onClick={onToggle}
      >
        <span>{dept.name}</span>
        <span className="opacity-70">({dept.members.length}명)</span>
        {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
      </div>

      {/* 팀장 */}
      <EmployeeNode
        emp={head}
        isSelected={selectedId === head.id}
        isHighlighted={highlightIds.size === 0 || highlightIds.has(head.id)}
        onClick={() => onSelect(head)}
        deptColor={dept.color}
        isHead
      />

      {/* 팀원 */}
      {!collapsed && members.length > 0 && (
        <>
          <ConnectorLine color={dept.color} />
          <HorizontalConnector count={members.length} color={dept.color} />
          <div className="flex flex-wrap justify-center gap-4 mt-0">
            {members.map((emp) => (
              <div key={emp.id} className="flex flex-col items-center">
                <ConnectorLine color={dept.color} />
                <EmployeeNode
                  emp={emp}
                  isSelected={selectedId === emp.id}
                  isHighlighted={highlightIds.size === 0 || highlightIds.has(emp.id)}
                  onClick={() => onSelect(emp)}
                  deptColor={dept.color}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── 카드 뷰 ─────────────────────────────────────────────────────────────────

function CardView({
  employees,
  selectedId,
  highlightIds,
  onSelect,
}: {
  employees: OrgEmployee[];
  selectedId: number | null;
  highlightIds: Set<number>;
  onSelect: (emp: OrgEmployee) => void;
}) {
  const grouped = useMemo(() => {
    const map: Record<string, OrgEmployee[]> = {};
    employees.forEach((e) => {
      if (!map[e.dept]) map[e.dept] = [];
      map[e.dept].push(e);
    });
    return map;
  }, [employees]);

  return (
    <div className="space-y-6 p-6">
      {Object.entries(grouped).map(([dept, emps]) => {
        const deptInfo = DEPARTMENTS.find(d => d.name === dept);
        const color = deptInfo?.color ?? "#6B7280";
        return (
          <div key={dept}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full" style={{ background: color }} />
              <span className="text-sm font-bold text-foreground">{dept}</span>
              <span className="text-xs text-muted-foreground">({emps.length}명)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {emps.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => onSelect(emp)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all text-left",
                    "bg-white hover:shadow-md",
                    selectedId === emp.id
                      ? "border-[var(--teal)] shadow-md"
                      : highlightIds.size > 0 && !highlightIds.has(emp.id)
                      ? "opacity-40 border-border"
                      : "border-border hover:border-[var(--teal)]/40"
                  )}
                >
                  <Avatar emp={emp} size="md" />
                  <div className="text-center w-full">
                    <div className="text-xs font-bold text-foreground">{emp.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{emp.title}</div>
                    <div className="text-[9px] font-medium px-1.5 py-0.5 rounded-full mt-1 inline-block"
                      style={{ background: `${color}18`, color }}>
                      {emp.level}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── 상세 패널 ────────────────────────────────────────────────────────────────

function DetailPanel({ emp, onClose }: { emp: OrgEmployee; onClose: () => void }) {
  const dept = DEPARTMENTS.find(d => d.name === emp.dept);
  const color = dept?.color ?? "#6B7280";
  const reportsTo = emp.reportsTo !== null ? ALL_EMPLOYEES.find(e => e.id === emp.reportsTo) : null;
  const directReports = ALL_EMPLOYEES.filter(e => e.reportsTo === emp.id);

  // 근속 계산
  const joinDate = new Date(emp.joinDate);
  const now = new Date();
  const totalMonths = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const tenure = years > 0 ? `${years}년 ${months > 0 ? `${months}개월` : ""}` : `${months}개월`;

  return (
    <div className="w-72 shrink-0 bg-white border-l border-border flex flex-col h-full overflow-hidden">
      {/* 헤더 */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">직원 상세</span>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <X size={15} className="text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* 프로필 헤더 */}
        <div className="px-5 pt-5 pb-4 flex flex-col items-center text-center border-b border-border"
          style={{ background: `${color}08` }}>
          <div className="relative mb-3">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-md"
              style={{ background: color }}
            >
              {emp.name.slice(0, 1)}
            </div>
            {emp.isHead && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center">
                <Award size={10} className="text-white" />
              </div>
            )}
          </div>
          <div className="text-base font-bold text-foreground">{emp.name}</div>
          <div className="text-sm text-muted-foreground mt-0.5">{emp.title}</div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs font-medium px-2.5 py-1 rounded-full text-white" style={{ background: color }}>
              {emp.dept}
            </span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
              {emp.level}
            </span>
          </div>
        </div>

        {/* 참여 점수 */}
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">참여 점수</span>
            <span className="text-sm font-bold mono-num" style={{ color }}>{emp.engagementScore}점</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${emp.engagementScore}%`, background: color }}
            />
          </div>
        </div>

        {/* 연락처 */}
        <div className="px-5 py-4 border-b border-border space-y-2.5">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">연락처</div>
          {[
            { icon: Mail,     value: emp.email },
            { icon: Phone,    value: emp.phone },
            { icon: MapPin,   value: emp.location },
            { icon: Calendar, value: `${emp.joinDate} 입사 (${tenure})` },
          ].map(({ icon: Icon, value }) => (
            <div key={value} className="flex items-start gap-2.5">
              <Icon size={13} className="text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-xs text-foreground leading-relaxed">{value}</span>
            </div>
          ))}
        </div>

        {/* 스킬 */}
        {emp.skills.length > 0 && (
          <div className="px-5 py-4 border-b border-border">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">스킬</div>
            <div className="flex flex-wrap gap-1.5">
              {emp.skills.map((s) => (
                <span key={s} className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: `${color}15`, color }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 보고 체계 */}
        <div className="px-5 py-4 space-y-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">보고 체계</div>
          {reportsTo && (
            <div>
              <div className="text-[10px] text-muted-foreground mb-1.5">직속 상관</div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/30 border border-border">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: reportsTo.avatar }}>
                  {reportsTo.name.slice(0, 1)}
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">{reportsTo.name}</div>
                  <div className="text-[10px] text-muted-foreground">{reportsTo.title}</div>
                </div>
              </div>
            </div>
          )}
          {directReports.length > 0 && (
            <div>
              <div className="text-[10px] text-muted-foreground mb-1.5">직속 부하 ({directReports.length}명)</div>
              <div className="space-y-1.5">
                {directReports.map((dr) => (
                  <div key={dr.id} className="flex items-center gap-2 p-2 rounded-xl bg-muted/30 border border-border">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: dr.avatar }}>
                      {dr.name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">{dr.name}</div>
                      <div className="text-[10px] text-muted-foreground">{dr.title}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function OrgChartPage() {
  const [query, setQuery] = useState("");
  const [selectedEmp, setSelectedEmp] = useState<OrgEmployee | null>(null);
  const [collapsedDepts, setCollapsedDepts] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"tree" | "card">("tree");
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // 검색 결과
  const highlightIds = useMemo<Set<number>>(() => {
    if (!query.trim()) return new Set();
    const q = query.toLowerCase();
    return new Set(
      ALL_EMPLOYEES
        .filter(e =>
          e.name.includes(q) ||
          e.dept.toLowerCase().includes(q) ||
          e.title.toLowerCase().includes(q) ||
          e.level.toLowerCase().includes(q) ||
          e.skills.some(s => s.toLowerCase().includes(q))
        )
        .map(e => e.id)
    );
  }, [query]);

  const toggleDept = useCallback((deptId: string) => {
    setCollapsedDepts(prev => {
      const next = new Set(prev);
      if (next.has(deptId)) next.delete(deptId);
      else next.add(deptId);
      return next;
    });
  }, []);

  const handleZoomIn  = () => setZoom(z => Math.min(z + 0.1, 1.8));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.1, 0.4));
  const handleFit     = () => setZoom(1);

  // 통계
  const stats = useMemo(() => ({
    total:   ALL_EMPLOYEES.length,
    depts:   DEPARTMENTS.length,
    heads:   ALL_EMPLOYEES.filter(e => e.isHead).length,
    avgScore: Math.round(ALL_EMPLOYEES.reduce((s, e) => s + e.engagementScore, 0) / ALL_EMPLOYEES.length),
  }), []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden page-enter">
      {/* 헤더 */}
      <div className="px-5 lg:px-7 pt-5 lg:pt-7 pb-4 bg-[oklch(0.975_0.005_220)] border-b border-border shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">조직도</h1>
            <p className="text-sm text-muted-foreground mt-0.5">싸카스포츠의 조직 구조를 한눈에 파악하세요</p>
          </div>
          {/* 통계 배지 */}
          <div className="hidden sm:flex items-center gap-3">
            {[
              { icon: Users,     label: "전체 인원",  value: `${stats.total}명` },
              { icon: Building2, label: "부서 수",    value: `${stats.depts}개` },
              { icon: UserCheck, label: "팀장 이상",  value: `${stats.heads}명` },
              { icon: Award,     label: "평균 참여",  value: `${stats.avgScore}점` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl border border-border shadow-sm">
                <Icon size={13} className="text-[var(--teal)]" />
                <div className="text-right">
                  <div className="text-xs font-bold text-foreground mono-num">{value}</div>
                  <div className="text-[10px] text-muted-foreground">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 툴바 */}
        <div className="flex items-center gap-3 mt-4">
          {/* 검색 */}
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="이름, 부서, 직책, 스킬 검색..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-xl outline-none focus:ring-2 focus:ring-[var(--teal)]/30 bg-white"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X size={13} className="text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          {/* 뷰 전환 */}
          <div className="flex items-center gap-1 bg-white border border-border rounded-xl p-1">
            {([
              { id: "tree", icon: GitBranch, label: "트리" },
              { id: "card", icon: LayoutGrid, label: "카드" },
            ] as const).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setViewMode(id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  viewMode === id
                    ? "bg-[var(--teal)] text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon size={13} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* 줌 컨트롤 (트리 뷰만) */}
          {viewMode === "tree" && (
            <div className="flex items-center gap-1 bg-white border border-border rounded-xl p-1">
              <button onClick={handleZoomOut} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <ZoomOut size={14} className="text-muted-foreground" />
              </button>
              <span className="text-xs font-medium text-muted-foreground mono-num w-10 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button onClick={handleZoomIn} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <ZoomIn size={14} className="text-muted-foreground" />
              </button>
              <button onClick={handleFit} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <Maximize2 size={14} className="text-muted-foreground" />
              </button>
            </div>
          )}

          {/* 검색 결과 카운트 */}
          {highlightIds.size > 0 && (
            <div className="text-xs text-muted-foreground bg-[var(--coral-light)] border border-[var(--coral)]/30 px-3 py-1.5 rounded-xl">
              <span className="font-bold text-[var(--coral)] mono-num">{highlightIds.size}명</span> 검색됨
            </div>
          )}
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 조직도 영역 */}
        <div className="flex-1 overflow-auto" ref={containerRef}>
          {viewMode === "tree" ? (
            <div
              className="min-w-max p-8 origin-top-left transition-transform duration-200"
              style={{ transform: `scale(${zoom})` }}
            >
              {/* CEO */}
              <div className="flex flex-col items-center mb-8">
                <EmployeeNode
                  emp={CEO}
                  isSelected={selectedEmp?.id === CEO.id}
                  isHighlighted={highlightIds.size === 0 || highlightIds.has(CEO.id)}
                  onClick={() => setSelectedEmp(selectedEmp?.id === CEO.id ? null : CEO)}
                  deptColor="#0D9488"
                  isHead
                />
                <ConnectorLine color="#0D9488" />
                {/* 가로 연결선 */}
                <div className="w-full flex justify-center">
                  <div className="h-0.5 w-[calc(100%-7rem)] max-w-4xl" style={{ background: "#0D948840" }} />
                </div>
              </div>

              {/* 부서 블록 */}
              <div className="flex flex-wrap justify-center gap-8">
                {DEPARTMENTS.map((dept) => (
                  <div key={dept.id} className="flex flex-col items-center">
                    <ConnectorLine color={dept.color} />
                    <DeptBlock
                      dept={dept}
                      selectedId={selectedEmp?.id ?? null}
                      highlightIds={highlightIds}
                      onSelect={(emp) => setSelectedEmp(selectedEmp?.id === emp.id ? null : emp)}
                      collapsed={collapsedDepts.has(dept.id)}
                      onToggle={() => toggleDept(dept.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <CardView
              employees={ALL_EMPLOYEES}
              selectedId={selectedEmp?.id ?? null}
              highlightIds={highlightIds}
              onSelect={(emp) => setSelectedEmp(selectedEmp?.id === emp.id ? null : emp)}
            />
          )}
        </div>

        {/* 상세 패널 */}
        {selectedEmp && (
          <DetailPanel
            emp={selectedEmp}
            onClose={() => setSelectedEmp(null)}
          />
        )}
      </div>
    </div>
  );
}
