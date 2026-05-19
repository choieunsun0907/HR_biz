/**
 * OrgChartPage — TeamPulse 조직도
 * Design: Soft Teal Clarity
 *
 * 기능:
 * - 계층형 트리 조직도 (대표이사 → 부서장 → 팀원)
 * - 드래그 앤 드롭으로 직원 부서/팀 이동 (편집 모드)
 * - 이동 확인 모달 + 변경 이력 로그
 * - 부서별 접기/펼치기
 * - 이름/부서/직책/스킬 검색 하이라이트
 * - 줌 인/아웃, 트리/카드 뷰 전환
 */

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  Search, ChevronDown, ChevronRight, X, ZoomIn, ZoomOut,
  Maximize2, Users, Phone, Mail, MapPin, Calendar, Award,
  LayoutGrid, GitBranch, Building2, UserCheck, Edit3,
  CheckCircle2, RotateCcw, History, ArrowRight, AlertTriangle,
  GripVertical, Download, FileSpreadsheet, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface OrgEmployee {
  id: number;
  name: string;
  title: string;
  level: string;
  dept: string;
  team: string;
  email: string;
  phone: string;
  location: string;
  joinDate: string;
  avatar: string;
  skills: string[];
  reportsTo: number | null;
  isHead: boolean;
  engagementScore: number;
}

interface Department {
  id: string;
  name: string;
  color: string;
  headId: number;
}

interface MoveHistory {
  id: string;
  empId: number;
  empName: string;
  fromDept: string;
  toDept: string;
  fromReportsTo: number | null;
  toReportsTo: number;
  timestamp: Date;
}

// ─── 초기 데이터 ──────────────────────────────────────────────────────────────

const INITIAL_EMPLOYEES: OrgEmployee[] = [
  { id: 0,  name: "박대표",   title: "대표이사",      level: "C-Level", dept: "경영진",  team: "경영",    email: "ceo@ssaka.com",     phone: "010-1000-0001", location: "서울 본사", joinDate: "2010-01-01", avatar: "#0D9488", skills: ["경영전략", "사업개발"],          reportsTo: null, isHead: true,  engagementScore: 95 },
  { id: 1,  name: "김인사",   title: "HR 본부장",     level: "임원",    dept: "인사팀",  team: "인사",    email: "hr@ssaka.com",      phone: "010-1000-0002", location: "서울 본사", joinDate: "2012-03-01", avatar: "#0891B2", skills: ["인사관리", "노무"],              reportsTo: 0, isHead: true,  engagementScore: 88 },
  { id: 2,  name: "이개발",   title: "CTO",           level: "C-Level", dept: "개발팀",  team: "개발",    email: "cto@ssaka.com",     phone: "010-1000-0003", location: "서울 본사", joinDate: "2011-06-01", avatar: "#7C3AED", skills: ["아키텍처", "기술전략"],          reportsTo: 0, isHead: true,  engagementScore: 92 },
  { id: 3,  name: "최마케팅", title: "마케팅 본부장", level: "임원",    dept: "마케팅",  team: "마케팅",  email: "mkt@ssaka.com",     phone: "010-1000-0004", location: "서울 본사", joinDate: "2013-09-01", avatar: "#DB2777", skills: ["브랜드", "디지털마케팅"],        reportsTo: 0, isHead: true,  engagementScore: 85 },
  { id: 4,  name: "정영업",   title: "영업 본부장",   level: "임원",    dept: "영업팀",  team: "영업",    email: "sales@ssaka.com",   phone: "010-1000-0005", location: "서울 본사", joinDate: "2014-02-01", avatar: "#D97706", skills: ["영업전략", "고객관리"],          reportsTo: 0, isHead: true,  engagementScore: 90 },
  { id: 5,  name: "강디자인", title: "디자인 팀장",   level: "팀장",    dept: "디자인",  team: "디자인",  email: "design@ssaka.com",  phone: "010-1000-0006", location: "서울 본사", joinDate: "2015-05-01", avatar: "#059669", skills: ["UI/UX", "브랜드디자인"],        reportsTo: 0, isHead: true,  engagementScore: 87 },
  { id: 6,  name: "윤재무",   title: "재무 팀장",     level: "팀장",    dept: "재무팀",  team: "재무",    email: "finance@ssaka.com", phone: "010-1000-0007", location: "서울 본사", joinDate: "2016-08-01", avatar: "#DC2626", skills: ["회계", "재무분석"],              reportsTo: 0, isHead: true,  engagementScore: 83 },
  { id: 10, name: "박채용",   title: "채용 담당",     level: "대리",    dept: "인사팀",  team: "채용",    email: "recruit@ssaka.com", phone: "010-2000-0001", location: "서울 본사", joinDate: "2020-03-01", avatar: "#0891B2", skills: ["채용", "면접"],                  reportsTo: 1, isHead: false, engagementScore: 82 },
  { id: 11, name: "최복지",   title: "복지 담당",     level: "사원",    dept: "인사팀",  team: "복지",    email: "welfare@ssaka.com", phone: "010-2000-0002", location: "서울 본사", joinDate: "2022-07-01", avatar: "#0891B2", skills: ["복리후생", "문화"],              reportsTo: 1, isHead: false, engagementScore: 79 },
  { id: 12, name: "임교육",   title: "교육 담당",     level: "주임",    dept: "인사팀",  team: "교육",    email: "edu@ssaka.com",     phone: "010-2000-0003", location: "서울 본사", joinDate: "2021-01-01", avatar: "#0891B2", skills: ["교육기획", "HRD"],               reportsTo: 1, isHead: false, engagementScore: 85 },
  { id: 20, name: "김민준",   title: "백엔드 개발",   level: "과장",    dept: "개발팀",  team: "백엔드",  email: "minjun@ssaka.com",  phone: "010-3000-0001", location: "서울 본사", joinDate: "2019-03-15", avatar: "#7C3AED", skills: ["Node.js", "Python", "AWS"],     reportsTo: 2, isHead: false, engagementScore: 88 },
  { id: 21, name: "이서연",   title: "프론트엔드",    level: "대리",    dept: "개발팀",  team: "프론트",  email: "seoyeon@ssaka.com", phone: "010-3000-0002", location: "서울 본사", joinDate: "2021-07-01", avatar: "#7C3AED", skills: ["React", "TypeScript"],          reportsTo: 2, isHead: false, engagementScore: 91 },
  { id: 22, name: "윤성민",   title: "모바일 개발",   level: "사원",    dept: "개발팀",  team: "모바일",  email: "sungmin@ssaka.com", phone: "010-3000-0003", location: "서울 본사", joinDate: "2024-02-01", avatar: "#7C3AED", skills: ["Flutter", "Swift"],             reportsTo: 2, isHead: false, engagementScore: 76 },
  { id: 23, name: "신재원",   title: "DevOps",        level: "차장",    dept: "개발팀",  team: "인프라",  email: "jaewon@ssaka.com",  phone: "010-3000-0004", location: "서울 본사", joinDate: "2013-12-01", avatar: "#7C3AED", skills: ["Docker", "K8s", "CI/CD"],      reportsTo: 2, isHead: false, engagementScore: 84 },
  { id: 30, name: "한승우",   title: "콘텐츠 마케터", level: "대리",    dept: "마케팅",  team: "콘텐츠",  email: "seungwoo@ssaka.com",phone: "010-4000-0001", location: "서울 본사", joinDate: "2022-04-11", avatar: "#DB2777", skills: ["콘텐츠", "SNS"],                reportsTo: 3, isHead: false, engagementScore: 80 },
  { id: 31, name: "임지은",   title: "브랜드 마케터", level: "과장",    dept: "마케팅",  team: "브랜드",  email: "jieun@ssaka.com",   phone: "010-4000-0002", location: "서울 본사", joinDate: "2016-08-22", avatar: "#DB2777", skills: ["브랜딩", "광고기획"],            reportsTo: 3, isHead: false, engagementScore: 87 },
  { id: 40, name: "최수아",   title: "영업 담당",     level: "사원",    dept: "영업팀",  team: "국내영업",email: "sua@ssaka.com",     phone: "010-5000-0001", location: "서울 본사", joinDate: "2023-11-20", avatar: "#D97706", skills: ["영업", "고객관리"],              reportsTo: 4, isHead: false, engagementScore: 78 },
  { id: 41, name: "강하은",   title: "영업 대리",     level: "대리",    dept: "영업팀",  team: "국내영업",email: "haeun@ssaka.com",   phone: "010-5000-0002", location: "부산 지사", joinDate: "2020-09-14", avatar: "#D97706", skills: ["B2B영업", "제안서"],             reportsTo: 4, isHead: false, engagementScore: 83 },
  { id: 50, name: "오나연",   title: "UI 디자이너",   level: "사원",    dept: "디자인",  team: "UI/UX",   email: "nayeon@ssaka.com",  phone: "010-6000-0001", location: "서울 본사", joinDate: "2024-08-05", avatar: "#059669", skills: ["Figma", "UI디자인"],            reportsTo: 5, isHead: false, engagementScore: 74 },
  { id: 51, name: "박지훈",   title: "그래픽 디자이너",level: "과장",   dept: "디자인",  team: "그래픽",  email: "jihoon@ssaka.com",  phone: "010-6000-0002", location: "서울 본사", joinDate: "2015-01-10", avatar: "#059669", skills: ["Illustrator", "Photoshop"],     reportsTo: 5, isHead: false, engagementScore: 86 },
  { id: 60, name: "배소희",   title: "회계 담당",     level: "대리",    dept: "재무팀",  team: "회계",    email: "sohee@ssaka.com",   phone: "010-7000-0001", location: "서울 본사", joinDate: "2017-06-30", avatar: "#DC2626", skills: ["회계", "세무"],                  reportsTo: 6, isHead: false, engagementScore: 81 },
  { id: 61, name: "정도현",   title: "예산 담당",     level: "과장",    dept: "재무팀",  team: "예산",    email: "dohyun@ssaka.com",  phone: "010-7000-0002", location: "서울 본사", joinDate: "2018-05-03", avatar: "#DC2626", skills: ["예산관리", "재무계획"],          reportsTo: 6, isHead: false, engagementScore: 88 },
];

const DEPARTMENTS: Department[] = [
  { id: "hr",      name: "인사팀",  color: "#0891B2", headId: 1 },
  { id: "dev",     name: "개발팀",  color: "#7C3AED", headId: 2 },
  { id: "mkt",     name: "마케팅",  color: "#DB2777", headId: 3 },
  { id: "sales",   name: "영업팀",  color: "#D97706", headId: 4 },
  { id: "design",  name: "디자인",  color: "#059669", headId: 5 },
  { id: "finance", name: "재무팀",  color: "#DC2626", headId: 6 },
];

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

function getDeptColor(deptName: string): string {
  return DEPARTMENTS.find(d => d.name === deptName)?.color ?? "#6B7280";
}

function getDeptHead(employees: OrgEmployee[], deptName: string): OrgEmployee | undefined {
  const dept = DEPARTMENTS.find(d => d.name === deptName);
  if (!dept) return undefined;
  return employees.find(e => e.id === dept.headId);
}

// ─── 아바타 ───────────────────────────────────────────────────────────────────

function EmpAvatar({ emp, size = "md" }: { emp: OrgEmployee; size?: "sm" | "md" | "lg" }) {
  const cls = { sm: "w-7 h-7 text-xs", md: "w-10 h-10 text-sm", lg: "w-14 h-14 text-base" }[size];
  return (
    <div className={cn("rounded-full flex items-center justify-center font-bold text-white shrink-0", cls)}
      style={{ background: emp.avatar }}>
      {emp.name.slice(0, 1)}
    </div>
  );
}

// ─── 이동 확인 모달 ───────────────────────────────────────────────────────────

interface MoveConfirmProps {
  emp: OrgEmployee;
  targetDept: Department;
  targetHead: OrgEmployee;
  onConfirm: () => void;
  onCancel: () => void;
}

function MoveConfirmModal({ emp, targetDept, targetHead, onConfirm, onCancel }: MoveConfirmProps) {
  const fromColor = getDeptColor(emp.dept);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* 헤더 */}
        <div className="px-6 py-5 border-b border-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
            <AlertTriangle size={18} className="text-amber-500" />
          </div>
          <div>
            <div className="text-base font-bold text-foreground">부서 이동 확인</div>
            <div className="text-xs text-muted-foreground mt-0.5">변경 사항을 검토하고 확인해 주세요</div>
          </div>
          <button onClick={onCancel} className="ml-auto p-1.5 rounded-lg hover:bg-muted">
            <X size={15} className="text-muted-foreground" />
          </button>
        </div>

        {/* 직원 정보 */}
        <div className="px-6 py-4">
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border mb-4">
            <EmpAvatar emp={emp} size="md" />
            <div>
              <div className="text-sm font-bold text-foreground">{emp.name}</div>
              <div className="text-xs text-muted-foreground">{emp.title} · {emp.level}</div>
            </div>
          </div>

          {/* 이동 화살표 */}
          <div className="flex items-center gap-3">
            <div className="flex-1 p-3 rounded-xl border-2 text-center" style={{ borderColor: `${fromColor}40`, background: `${fromColor}08` }}>
              <div className="text-[10px] text-muted-foreground mb-1">현재 부서</div>
              <div className="text-sm font-bold" style={{ color: fromColor }}>{emp.dept}</div>
            </div>
            <ArrowRight size={18} className="text-muted-foreground shrink-0" />
            <div className="flex-1 p-3 rounded-xl border-2 text-center"
              style={{ borderColor: `${targetDept.color}60`, background: `${targetDept.color}10` }}>
              <div className="text-[10px] text-muted-foreground mb-1">이동할 부서</div>
              <div className="text-sm font-bold" style={{ color: targetDept.color }}>{targetDept.name}</div>
            </div>
          </div>

          <div className="mt-3 p-3 bg-muted/20 rounded-xl border border-border">
            <div className="text-[11px] text-muted-foreground mb-1">새 직속 상관</div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ background: targetHead.avatar }}>
                {targetHead.name.slice(0, 1)}
              </div>
              <span className="text-sm font-semibold text-foreground">{targetHead.name}</span>
              <span className="text-xs text-muted-foreground">({targetHead.title})</span>
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div className="px-6 pb-5 flex gap-2">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
            취소
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
            style={{ background: targetDept.color }}>
            이동 확인
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 변경 이력 패널 ───────────────────────────────────────────────────────────

function HistoryPanel({ history, onUndo, onClose }: {
  history: MoveHistory[];
  onUndo: (h: MoveHistory) => void;
  onClose: () => void;
}) {
  return (
    <div className="w-64 shrink-0 bg-white border-l border-border flex flex-col h-full">
      <div className="px-4 py-3.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History size={14} className="text-[var(--teal)]" />
          <span className="text-sm font-semibold text-foreground">변경 이력</span>
          {history.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--teal)]/10 text-[var(--teal)] mono-num">
              {history.length}
            </span>
          )}
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted">
          <X size={13} className="text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <History size={24} className="text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">아직 변경 이력이 없습니다</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {[...history].reverse().map((h) => {
              const fromColor = getDeptColor(h.fromDept);
              const toColor   = getDeptColor(h.toDept);
              return (
                <div key={h.id} className="p-3 rounded-xl border border-border bg-muted/20 group">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                        style={{ background: toColor }}>
                        {h.empName.slice(0, 1)}
                      </div>
                      <span className="text-xs font-bold text-foreground">{h.empName}</span>
                    </div>
                    <button
                      onClick={() => onUndo(h)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-muted"
                      title="되돌리기"
                    >
                      <RotateCcw size={11} className="text-muted-foreground" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="font-medium px-1.5 py-0.5 rounded-full" style={{ background: `${fromColor}15`, color: fromColor }}>
                      {h.fromDept}
                    </span>
                    <ArrowRight size={9} className="text-muted-foreground" />
                    <span className="font-medium px-1.5 py-0.5 rounded-full" style={{ background: `${toColor}15`, color: toColor }}>
                      {h.toDept}
                    </span>
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-1.5">
                    {h.timestamp.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 직원 노드 (드래그 지원) ──────────────────────────────────────────────────

function EmployeeNode({
  emp, isSelected, isHighlighted, onClick, deptColor, isHead = false,
  editMode, isDragging, onDragStart, onDragEnd,
}: {
  emp: OrgEmployee; isSelected: boolean; isHighlighted: boolean;
  onClick: () => void; deptColor: string; isHead?: boolean;
  editMode: boolean; isDragging: boolean;
  onDragStart: (emp: OrgEmployee) => void;
  onDragEnd: () => void;
}) {
  const draggable = editMode && !isHead;

  return (
    <div
      draggable={draggable}
      onDragStart={draggable ? (e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(emp); } : undefined}
      onDragEnd={draggable ? onDragEnd : undefined}
      onClick={onClick}
      className={cn(
        "group flex flex-col items-center gap-1.5 transition-all duration-200",
        draggable && "cursor-grab active:cursor-grabbing",
        !draggable && "cursor-pointer",
        isDragging && "opacity-30 scale-95",
        isHighlighted && !isSelected ? "opacity-100" : "",
        !isHighlighted && !isSelected ? "opacity-60 hover:opacity-100" : "",
      )}
    >
      <div className={cn(
        "relative rounded-2xl p-3 border-2 transition-all duration-200 shadow-sm",
        "bg-white flex flex-col items-center gap-1 w-28 select-none",
        isSelected
          ? "border-[var(--teal)] shadow-md shadow-[var(--teal)]/20 scale-105"
          : isHighlighted
          ? "border-[var(--coral)] shadow-md"
          : "border-border hover:border-[var(--teal)]/50 hover:shadow-md",
        editMode && !isHead && "hover:border-dashed",
      )}>
        {isHead && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-bold text-white whitespace-nowrap"
            style={{ background: deptColor }}>
            {emp.title.includes("대표") ? "대표" : emp.title.includes("본부장") ? "본부장" : "팀장"}
          </div>
        )}
        {editMode && !isHead && (
          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical size={10} className="text-muted-foreground" />
          </div>
        )}
        <EmpAvatar emp={emp} size="md" />
        <div className="text-center">
          <div className="text-xs font-bold text-foreground leading-tight">{emp.name}</div>
          <div className="text-[10px] text-muted-foreground leading-tight mt-0.5 line-clamp-1">{emp.title}</div>
          <div className="text-[9px] font-medium px-1.5 py-0.5 rounded-full mt-1"
            style={{ background: `${deptColor}18`, color: deptColor }}>
            {emp.level}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 드롭 존 (부서 블록) ──────────────────────────────────────────────────────

function DeptBlock({
  dept, employees, selectedId, highlightIds, onSelect,
  collapsed, onToggle, editMode, draggingEmp,
  onDragStart, onDragEnd, onDropToDept,
}: {
  dept: Department; employees: OrgEmployee[];
  selectedId: number | null; highlightIds: Set<number>;
  onSelect: (emp: OrgEmployee) => void;
  collapsed: boolean; onToggle: () => void;
  editMode: boolean; draggingEmp: OrgEmployee | null;
  onDragStart: (emp: OrgEmployee) => void;
  onDragEnd: () => void;
  onDropToDept: (targetDept: Department) => void;
}) {
  const [isOver, setIsOver] = useState(false);
  const head    = employees.find(e => e.id === dept.headId)!;
  const members = employees.filter(e => e.dept === dept.name && !e.isHead);

  // 드롭 가능 여부: 편집 모드이고, 드래그 중인 직원이 이 부서 소속이 아닐 때
  const canDrop = editMode && draggingEmp !== null && draggingEmp.dept !== dept.name;

  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl transition-all duration-200 p-3",
        isOver && canDrop ? "bg-[var(--teal)]/8 ring-2 ring-[var(--teal)] ring-dashed" : "bg-transparent",
      )}
      onDragOver={canDrop ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setIsOver(true); } : undefined}
      onDragLeave={canDrop ? () => setIsOver(false) : undefined}
      onDrop={canDrop ? (e) => { e.preventDefault(); setIsOver(false); onDropToDept(dept); } : undefined}
    >
      {/* 부서 헤더 */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-semibold mb-3 cursor-pointer hover:opacity-90 transition-all shadow-sm",
          isOver && canDrop && "scale-105 shadow-md",
        )}
        style={{ background: dept.color }}
        onClick={onToggle}
      >
        <span>{dept.name}</span>
        <span className="opacity-70">({members.length + 1}명)</span>
        {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
        {isOver && canDrop && <span className="text-[10px] opacity-90">여기에 놓기</span>}
      </div>

      {/* 팀장 */}
      {head && (
        <EmployeeNode
          emp={head}
          isSelected={selectedId === head.id}
          isHighlighted={highlightIds.size === 0 || highlightIds.has(head.id)}
          onClick={() => onSelect(head)}
          deptColor={dept.color}
          isHead
          editMode={editMode}
          isDragging={draggingEmp?.id === head.id}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      )}

      {/* 팀원 */}
      {!collapsed && members.length > 0 && (
        <>
          <div className="flex justify-center">
            <div className="w-0.5 h-6" style={{ background: `${dept.color}50` }} />
          </div>
          {members.length > 1 && (
            <div className="flex justify-center mb-0">
              <div className="h-0.5 w-[calc(100%-7rem)]" style={{ background: `${dept.color}40` }} />
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-4 mt-0">
            {members.map((emp) => (
              <div key={emp.id} className="flex flex-col items-center">
                <div className="flex justify-center">
                  <div className="w-0.5 h-6" style={{ background: `${dept.color}50` }} />
                </div>
                <EmployeeNode
                  emp={emp}
                  isSelected={selectedId === emp.id}
                  isHighlighted={highlightIds.size === 0 || highlightIds.has(emp.id)}
                  onClick={() => onSelect(emp)}
                  deptColor={dept.color}
                  editMode={editMode}
                  isDragging={draggingEmp?.id === emp.id}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── 상세 패널 ────────────────────────────────────────────────────────────────

function DetailPanel({ emp, employees, onClose }: {
  emp: OrgEmployee; employees: OrgEmployee[]; onClose: () => void;
}) {
  const color      = getDeptColor(emp.dept);
  const reportsTo  = emp.reportsTo !== null ? employees.find(e => e.id === emp.reportsTo) : null;
  const directs    = employees.filter(e => e.reportsTo === emp.id);
  const joinDate   = new Date(emp.joinDate);
  const now        = new Date();
  const totalMonths = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());
  const years  = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const tenure = years > 0 ? `${years}년 ${months > 0 ? `${months}개월` : ""}` : `${months}개월`;

  return (
    <div className="w-72 shrink-0 bg-white border-l border-border flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">직원 상세</span>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <X size={15} className="text-muted-foreground" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 pt-5 pb-4 flex flex-col items-center text-center border-b border-border"
          style={{ background: `${color}08` }}>
          <div className="relative mb-3">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-md"
              style={{ background: color }}>
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
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">참여 점수</span>
            <span className="text-sm font-bold mono-num" style={{ color }}>{emp.engagementScore}점</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${emp.engagementScore}%`, background: color }} />
          </div>
        </div>
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
          {directs.length > 0 && (
            <div>
              <div className="text-[10px] text-muted-foreground mb-1.5">직속 부하 ({directs.length}명)</div>
              <div className="space-y-1.5">
                {directs.map((dr) => (
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

// ─── 카드 뷰 ─────────────────────────────────────────────────────────────────

function CardView({ employees, selectedId, highlightIds, onSelect }: {
  employees: OrgEmployee[]; selectedId: number | null;
  highlightIds: Set<number>; onSelect: (emp: OrgEmployee) => void;
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
        const color = getDeptColor(dept);
        return (
          <div key={dept}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full" style={{ background: color }} />
              <span className="text-sm font-bold text-foreground">{dept}</span>
              <span className="text-xs text-muted-foreground">({emps.length}명)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {emps.map((emp) => (
                <button key={emp.id} onClick={() => onSelect(emp)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all text-left bg-white hover:shadow-md",
                    selectedId === emp.id ? "border-[var(--teal)] shadow-md"
                      : highlightIds.size > 0 && !highlightIds.has(emp.id) ? "opacity-40 border-border"
                      : "border-border hover:border-[var(--teal)]/40"
                  )}>
                  <EmpAvatar emp={emp} size="md" />
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

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function OrgChartPage() {
  const [employees, setEmployees] = useState<OrgEmployee[]>(INITIAL_EMPLOYEES);
  const [query, setQuery]         = useState("");

  // DB에서 직원 데이터 로드 (INITIAL_EMPLOYEES를 fallback으로 사용)
  useEffect(() => {
    fetch("/api/employees", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.employees?.length) return;
        const DEPT_COLORS: Record<string, string> = {
          "개발팀": "#7C3AED", "인사팀": "#0891B2", "마케팅": "#DB2777",
          "영업팀": "#D97706", "디자인": "#059669", "재무팀": "#DC2626",
          "경영진": "#0D9488",
        };
        const mapped: OrgEmployee[] = data.employees.map((e: Record<string, unknown>) => ({
          id: e.id as number,
          name: e.name as string,
          title: (e.title as string) || (e.position as string) || "직원",
          level: (e.grade as string) || "사원",
          dept: (e.department as string) || "미배정",
          team: (e.department as string) || "미배정",
          email: (e.email as string) || "",
          phone: (e.phone as string) || "",
          location: (e.location as string) || "서울 본사",
          joinDate: (e.join_date as string) || "",
          avatar: DEPT_COLORS[(e.department as string) || ""] || "#6B7280",
          skills: [],
          reportsTo: null,
          isHead: false,
          engagementScore: 80,
        }));
        // 부서별 첫 번째 직원을 부서장으로 설정
        const deptHeads: Record<string, number> = {};
        mapped.forEach(e => {
          if (!deptHeads[e.dept]) {
            deptHeads[e.dept] = e.id;
            e.isHead = true;
          }
        });
        // reportsTo 설정 (부서장이 아닌 직원은 해당 부서장에게 보고)
        mapped.forEach(e => {
          if (!e.isHead) e.reportsTo = deptHeads[e.dept] ?? null;
        });
        setEmployees(mapped);
      })
      .catch(() => {}); // 실패 시 INITIAL_EMPLOYEES 유지
  }, []);
  const [selectedEmp, setSelectedEmp] = useState<OrgEmployee | null>(null);
  const [collapsedDepts, setCollapsedDepts] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode]   = useState<"tree" | "card">("tree");
  const [zoom, setZoom]           = useState(1);
  const [editMode, setEditMode]   = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [moveHistory, setMoveHistory] = useState<MoveHistory[]>([]);

  // 드래그 상태
  const [draggingEmp, setDraggingEmp]     = useState<OrgEmployee | null>(null);
  const [pendingMove, setPendingMove]     = useState<{ emp: OrgEmployee; targetDept: Department } | null>(null);
  const [exporting, setExporting]         = useState<"excel" | "pdf" | null>(null);
  const treeRef = useRef<HTMLDivElement | null>(null);

  const CEO = employees.find(e => e.id === 0)!;

  const highlightIds = useMemo<Set<number>>(() => {
    if (!query.trim()) return new Set();
    const q = query.toLowerCase();
    return new Set(
      employees.filter(e =>
        e.name.includes(q) || e.dept.toLowerCase().includes(q) ||
        e.title.toLowerCase().includes(q) || e.skills.some(s => s.toLowerCase().includes(q))
      ).map(e => e.id)
    );
  }, [query, employees]);

  const toggleDept = useCallback((deptId: string) => {
    setCollapsedDepts(prev => {
      const next = new Set(prev);
      next.has(deptId) ? next.delete(deptId) : next.add(deptId);
      return next;
    });
  }, []);

  // 드롭 처리 → 확인 모달 오픈
  const handleDropToDept = useCallback((targetDept: Department) => {
    if (!draggingEmp) return;
    setPendingMove({ emp: draggingEmp, targetDept });
    setDraggingEmp(null);
  }, [draggingEmp]);

  // 이동 확인
  const handleConfirmMove = useCallback(() => {
    if (!pendingMove) return;
    const { emp, targetDept } = pendingMove;
    const targetHead = employees.find(e => e.id === targetDept.headId);
    if (!targetHead) return;

    const histEntry: MoveHistory = {
      id: `${Date.now()}`,
      empId: emp.id, empName: emp.name,
      fromDept: emp.dept, toDept: targetDept.name,
      fromReportsTo: emp.reportsTo, toReportsTo: targetHead.id,
      timestamp: new Date(),
    };

    setEmployees(prev => prev.map(e =>
      e.id === emp.id
        ? { ...e, dept: targetDept.name, team: targetDept.name, reportsTo: targetHead.id, avatar: targetDept.color }
        : e
    ));
    setMoveHistory(prev => [...prev, histEntry]);
    setPendingMove(null);

    // 선택된 직원 정보도 갱신
    if (selectedEmp?.id === emp.id) {
      setSelectedEmp(prev => prev ? { ...prev, dept: targetDept.name, team: targetDept.name, reportsTo: targetHead.id, avatar: targetDept.color } : null);
    }

    toast.success(`${emp.name}님이 ${targetDept.name}으로 이동되었습니다`, {
      description: `직속 상관: ${targetHead.name} (${targetHead.title})`,
    });
  }, [pendingMove, employees, selectedEmp]);

  // ─── 엑셀 내보내기 ────────────────────────────────────────────────────────
  const handleDownloadExcel = useCallback(async () => {
    setExporting("excel");
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      const today = new Date().toLocaleDateString("ko-KR").replace(/\. /g, "-").replace(".", "");

      // 시트1: 전체 직원 목록 (부서별 정렬)
      const sorted = [...employees].sort((a, b) => a.dept.localeCompare(b.dept, "ko"));
      const empRows = sorted.map((e, i) => {
        const reportsToEmp = e.reportsTo !== null ? employees.find(x => x.id === e.reportsTo) : null;
        const joinDate = new Date(e.joinDate);
        const now = new Date();
        const months = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());
        const tenure = months >= 12 ? `${Math.floor(months / 12)}년 ${months % 12 > 0 ? `${months % 12}개월` : ""}` : `${months}개월`;
        return {
          "순번": i + 1,
          "이름": e.name,
          "부서": e.dept,
          "팀": e.team,
          "직책": e.title,
          "직급": e.level,
          "이메일": e.email,
          "전화번호": e.phone,
          "근무지": e.location,
          "입사일": e.joinDate,
          "근속기간": tenure,
          "직속상관": reportsToEmp?.name ?? "(최상위)",
          "스킬": e.skills.join(", "),
          "참여점수": e.engagementScore,
          "구분": e.isHead ? "팀장/본부장" : "팀원",
        };
      });
      const ws1 = XLSX.utils.json_to_sheet(empRows);
      ws1["!cols"] = [8,10,8,8,14,8,24,14,10,12,12,10,24,8,10].map(w => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, ws1, "전체 직원 목록");

      // 시트2: 부서별 요약
      const deptSummary = DEPARTMENTS.map(d => {
        const deptEmps = employees.filter(e => e.dept === d.name);
        const head = employees.find(e => e.id === d.headId);
        const avgScore = deptEmps.length > 0
          ? Math.round(deptEmps.reduce((s, e) => s + e.engagementScore, 0) / deptEmps.length)
          : 0;
        return {
          "부서명": d.name,
          "부서장": head?.name ?? "-",
          "부서장 직책": head?.title ?? "-",
          "총 인원": deptEmps.length,
          "팀원 수": deptEmps.filter(e => !e.isHead).length,
          "평균 참여 점수": avgScore,
        };
      });
      const ws2 = XLSX.utils.json_to_sheet(deptSummary);
      ws2["!cols"] = [10, 10, 14, 8, 8, 12].map(w => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, ws2, "부서별 요약");

      // 시트3: 변경 이력
      if (moveHistory.length > 0) {
        const histRows = moveHistory.map((h, i) => ({
          "순번": i + 1,
          "직원명": h.empName,
          "이전 부서": h.fromDept,
          "이동 부서": h.toDept,
          "변경 일시": h.timestamp.toLocaleString("ko-KR"),
        }));
        const ws3 = XLSX.utils.json_to_sheet(histRows);
        ws3["!cols"] = [6, 10, 10, 10, 18].map(w => ({ wch: w }));
        XLSX.utils.book_append_sheet(wb, ws3, "변경 이력");
      }

      XLSX.writeFile(wb, `조직도_${today}.xlsx`);
      toast.success("엑셀 파일이 다운로드되었습니다", { description: `조직도_${today}.xlsx` });
    } catch (e) {
      toast.error("엑셀 내보내기에 실패했습니다");
    } finally {
      setExporting(null);
    }
  }, [employees, moveHistory]);

  // ─── PDF 내보내기 ─────────────────────────────────────────────────────────
  const handleDownloadPDF = useCallback(async () => {
    if (!treeRef.current) {
      // 카드 뷰 기반 PDF 생성
      setExporting("pdf");
      try {
        const jsPDF = (await import("jspdf")).default;
        const today = new Date().toLocaleDateString("ko-KR").replace(/\. /g, "-").replace(".", "");
        const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        doc.setFillColor(13, 148, 136);
        doc.rect(0, 0, pageW, 14, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("싸카스포츠 조직도", 12, 9);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(`생성일: ${today}  |  전체 ${employees.length}명`, pageW - 12, 9, { align: "right" });
        const headers = ["이름", "부서", "직책", "직급", "이메일", "연락처"];
        const colWidths = [28, 30, 40, 20, 60, 30];
        let y = 20;
        const rowH = 7;
        doc.setFillColor(240, 253, 250);
        doc.rect(10, y, pageW - 20, rowH, "F");
        doc.setTextColor(13, 148, 136);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        let x = 10;
        headers.forEach((h, i) => { doc.text(h, x + 1, y + 5); x += colWidths[i]; });
        y += rowH;
        doc.setFont("helvetica", "normal");
        employees.forEach((e, idx) => {
          if (y + rowH > pageH - 10) { doc.addPage(); y = 14; }
          if (idx % 2 === 0) { doc.setFillColor(250, 250, 252); doc.rect(10, y, pageW - 20, rowH, "F"); }
          doc.setTextColor(30, 30, 30);
          const cells = [e.name, e.dept, e.title, e.level, e.email, e.phone];
          x = 10;
          cells.forEach((cell, i) => {
            const txt = doc.splitTextToSize(String(cell ?? ""), colWidths[i] - 2)[0] ?? "";
            doc.text(txt, x + 1, y + 5);
            x += colWidths[i];
          });
          y += rowH;
        });
        doc.save(`조직도_${today}.pdf`);
        toast.success("PDF 파일이 다운로드되었습니다");
      } catch {
        toast.error("PDF 내보내기에 실패했습니다");
      } finally {
        setExporting(null);
      }
      return;
    }
    setExporting("pdf");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      const today = new Date().toLocaleDateString("ko-KR").replace(/\. /g, "-").replace(".", "");

      const canvas = await html2canvas(treeRef.current, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: "#f8fafb",
        logging: false,
      });

      const imgW = canvas.width;
      const imgH = canvas.height;
      // A4 가로 기준 (mm)
      const pdfW = 297;
      const pdfH = Math.round((imgH / imgW) * pdfW);

      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [pdfW, Math.max(pdfH, 210)] });

      // 제목 헤더
      pdf.setFillColor(13, 148, 136);
      pdf.rect(0, 0, pdfW, 12, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text("싸카스포츠 조직도", 10, 8);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.text(`생성일: ${today}  |  총 인원: ${employees.length}명  |  부서: ${DEPARTMENTS.length}개`, pdfW - 10, 8, { align: "right" });

      // 조직도 이미지
      const imgData = canvas.toDataURL("image/png");
      const margin = 5;
      const availW = pdfW - margin * 2;
      const availH = Math.max(pdfH, 210) - 14;
      const ratio = Math.min(availW / imgW, availH / imgH);
      const drawW = imgW * ratio;
      const drawH = imgH * ratio;
      const offsetX = margin + (availW - drawW) / 2;
      pdf.addImage(imgData, "PNG", offsetX, 14, drawW, drawH);

      pdf.save(`조직도_${today}.pdf`);
      toast.success("PDF 파일이 다운로드되었습니다", { description: `조직도_${today}.pdf` });
    } catch (e) {
      toast.error("PDF 내보내기에 실패했습니다");
    } finally {
      setExporting(null);
    }
  }, [employees]);

  // 되돌리기
  const handleUndo = useCallback((h: MoveHistory) => {
    setEmployees(prev => prev.map(e => {
      if (e.id !== h.empId) return e;
      const origColor = INITIAL_EMPLOYEES.find(ie => ie.id === h.empId)?.avatar ?? e.avatar;
      return { ...e, dept: h.fromDept, team: h.fromDept, reportsTo: h.fromReportsTo, avatar: origColor };
    }));
    setMoveHistory(prev => prev.filter(item => item.id !== h.id));
    toast.info(`${h.empName}님의 이동이 취소되었습니다`);
  }, []);

  const stats = useMemo(() => ({
    total: employees.length,
    depts: DEPARTMENTS.length,
    heads: employees.filter(e => e.isHead).length,
    avgScore: Math.round(employees.reduce((s, e) => s + e.engagementScore, 0) / employees.length),
  }), [employees]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden page-enter print:block print:overflow-visible">
      {/* 인쇄 전용 헤더 (화면에서는 숨김) */}
      <div className="print-only hidden px-6 py-4 border-b-2 mb-4" style={{ borderColor: "var(--teal)" }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-bold" style={{ color: "var(--teal)" }}>싸카스포츠 조직도</div>
            <div className="text-sm text-gray-500 mt-0.5">
              {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })} 기준
            </div>
          </div>
          <div className="flex gap-6 text-sm">
            <span><strong>총 인원</strong> {stats.total}명</span>
            <span><strong>부서</strong> {stats.depts}개</span>
            <span><strong>팀장 이상</strong> {stats.heads}명</span>
            <span><strong>평균 참여</strong> {stats.avgScore}점</span>
          </div>
        </div>
      </div>

      {/* 헤더 */}
      <div className="px-5 lg:px-7 pt-5 lg:pt-7 pb-4 bg-[oklch(0.975_0.005_220)] border-b border-border shrink-0 print-hide">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">조직도</h1>
            <p className="text-sm text-muted-foreground mt-0.5">싸카스포츠의 조직 구조를 한눈에 파악하세요</p>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            {[
              { icon: Users,     label: "전체 인원", value: `${stats.total}명` },
              { icon: Building2, label: "부서 수",   value: `${stats.depts}개` },
              { icon: UserCheck, label: "팀장 이상", value: `${stats.heads}명` },
              { icon: Award,     label: "평균 참여", value: `${stats.avgScore}점` },
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
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="이름, 부서, 직책, 스킬 검색..."
              value={query} onChange={e => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-xl outline-none focus:ring-2 focus:ring-[var(--teal)]/30 bg-white" />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X size={13} className="text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          {/* 뷰 전환 */}
          <div className="flex items-center gap-1 bg-white border border-border rounded-xl p-1">
            {([
              { id: "tree" as const, icon: GitBranch, label: "트리" },
              { id: "card" as const, icon: LayoutGrid, label: "카드" },
            ]).map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setViewMode(id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  viewMode === id ? "bg-[var(--teal)] text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}>
                <Icon size={13} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* 편집 모드 토글 */}
          {viewMode === "tree" && (
            <button
              onClick={() => { setEditMode(e => !e); if (editMode) setShowHistory(false); }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border",
                editMode
                  ? "bg-[var(--coral)] text-white border-[var(--coral)] shadow-sm"
                  : "bg-white text-muted-foreground border-border hover:border-[var(--coral)]/50 hover:text-[var(--coral)]"
              )}>
              {editMode ? <CheckCircle2 size={13} /> : <Edit3 size={13} />}
              {editMode ? "편집 완료" : "편집 모드"}
            </button>
          )}

          {/* 이력 버튼 */}
          {editMode && (
            <button
              onClick={() => setShowHistory(h => !h)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border",
                showHistory ? "bg-muted border-border text-foreground" : "bg-white border-border text-muted-foreground hover:text-foreground"
              )}>
              <History size={13} />
              이력
              {moveHistory.length > 0 && (
                <span className="ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--teal)]/10 text-[var(--teal)] mono-num">
                  {moveHistory.length}
                </span>
              )}
            </button>
          )}

          {/* 줌 컨트롤 */}
          {viewMode === "tree" && (
            <div className="flex items-center gap-1 bg-white border border-border rounded-xl p-1">
              <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.4))} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <ZoomOut size={14} className="text-muted-foreground" />
              </button>
              <span className="text-xs font-medium text-muted-foreground mono-num w-10 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button onClick={() => setZoom(z => Math.min(z + 0.1, 1.8))} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <ZoomIn size={14} className="text-muted-foreground" />
              </button>
              <button onClick={() => setZoom(1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <Maximize2 size={14} className="text-muted-foreground" />
              </button>
            </div>
          )}

          {highlightIds.size > 0 && (
            <div className="text-xs text-muted-foreground bg-[var(--coral-light)] border border-[var(--coral)]/30 px-3 py-1.5 rounded-xl">
              <span className="font-bold text-[var(--coral)] mono-num">{highlightIds.size}명</span> 검색됨
            </div>
          )}

          {/* 내보내기 버튼 */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={handleDownloadExcel}
              disabled={exporting !== null}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border",
                "bg-white border-border text-muted-foreground hover:border-emerald-400 hover:text-emerald-600",
                exporting === "excel" && "opacity-60 cursor-not-allowed"
              )}>
              <FileSpreadsheet size={13} />
              {exporting === "excel" ? "생성 중..." : "엑셀"}
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={exporting !== null}
              title="PDF로 내보내기"
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border",
                "bg-white border-border text-muted-foreground hover:border-rose-400 hover:text-rose-600",
                exporting === "pdf" && "opacity-60 cursor-not-allowed"
              )}>
              <FileText size={13} />
              {exporting === "pdf" ? "생성 중..." : "PDF"}
            </button>
          </div>
        </div>

        {/* 편집 모드 안내 배너 */}
        {editMode && (
          <div className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
            <GripVertical size={13} className="shrink-0" />
            <span>
              <strong>편집 모드 활성화</strong> — 팀원 노드를 다른 부서 블록으로 드래그하여 소속을 변경할 수 있습니다.
              팀장/대표이사 노드는 이동할 수 없습니다.
            </span>
          </div>
        )}
      </div>

      {/* 본문 */}
      <div className="flex-1 flex overflow-hidden print:block print:overflow-visible">
        <div className="flex-1 overflow-auto print:overflow-visible print-org-tree">
          {viewMode === "tree" ? (
            <div ref={treeRef} className="min-w-max p-8 origin-top-left transition-transform duration-200 print:transform-none print:scale-100"
              style={{ transform: `scale(${zoom})` }}>
              {/* CEO */}
              <div className="flex flex-col items-center mb-8">
                <EmployeeNode
                  emp={CEO}
                  isSelected={selectedEmp?.id === CEO.id}
                  isHighlighted={highlightIds.size === 0 || highlightIds.has(CEO.id)}
                  onClick={() => setSelectedEmp(selectedEmp?.id === CEO.id ? null : CEO)}
                  deptColor="#0D9488" isHead
                  editMode={editMode} isDragging={false}
                  onDragStart={setDraggingEmp} onDragEnd={() => setDraggingEmp(null)}
                />
                <div className="flex justify-center">
                  <div className="w-0.5 h-6" style={{ background: "#0D948840" }} />
                </div>
                <div className="flex justify-center">
                  <div className="h-0.5 w-[calc(100%-7rem)] max-w-4xl" style={{ background: "#0D948840" }} />
                </div>
              </div>

              {/* 부서 블록 */}
              <div className="flex flex-wrap justify-center gap-8">
                {DEPARTMENTS.map((dept) => (
                  <div key={dept.id} className="flex flex-col items-center">
                    <div className="flex justify-center">
                      <div className="w-0.5 h-6" style={{ background: `${dept.color}50` }} />
                    </div>
                    <DeptBlock
                      dept={dept}
                      employees={employees}
                      selectedId={selectedEmp?.id ?? null}
                      highlightIds={highlightIds}
                      onSelect={(emp) => setSelectedEmp(selectedEmp?.id === emp.id ? null : emp)}
                      collapsed={collapsedDepts.has(dept.id)}
                      onToggle={() => toggleDept(dept.id)}
                      editMode={editMode}
                      draggingEmp={draggingEmp}
                      onDragStart={setDraggingEmp}
                      onDragEnd={() => setDraggingEmp(null)}
                      onDropToDept={handleDropToDept}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <CardView
              employees={employees}
              selectedId={selectedEmp?.id ?? null}
              highlightIds={highlightIds}
              onSelect={(emp) => setSelectedEmp(selectedEmp?.id === emp.id ? null : emp)}
            />
          )}
        </div>

        {/* 변경 이력 패널 */}
        {showHistory && editMode && (
          <div className="print-hide contents">
          <HistoryPanel
            history={moveHistory}
            onUndo={handleUndo}
            onClose={() => setShowHistory(false)}
          />
          </div>
        )}

        {/* 상세 패널 */}
        {selectedEmp && !showHistory && (
          <div className="print-hide contents">
          <DetailPanel
            emp={selectedEmp}
            employees={employees}
            onClose={() => setSelectedEmp(null)}
          />
          </div>
        )}
      </div>

      {/* 이동 확인 모달 */}
      <div className="print-hide">
      {pendingMove && (() => {
        const targetHead = getDeptHead(employees, pendingMove.targetDept.name);
        if (!targetHead) return null;
        return (
          <MoveConfirmModal
            emp={pendingMove.emp}
            targetDept={pendingMove.targetDept}
            targetHead={targetHead}
            onConfirm={handleConfirmMove}
            onCancel={() => setPendingMove(null)}
          />
        );
      })()}
      </div>
    </div>
  );
}
