/**
 * ReportsPage — TeamPulse HR Platform
 * Design: Soft Teal Clarity (Scandinavian Minimalism)
 * Features:
 * - 연차 미사용률 월별 집계 차트 (AreaChart)
 * - 직원별 미사용률 순위 테이블 (상위 10명 강조)
 * - 부서별 평균 미사용률 바 차트
 * - 연도/월 필터 선택
 * - PDF 다운로드 (jsPDF + html2canvas)
 */

import { useState, useRef } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import {
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  Calendar,
  BarChart3,
  ChevronDown,
  Printer,
  RefreshCw,
  Sheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmployeeLeaveReport {
  rank: number;
  name: string;
  dept: string;
  color: string;
  total: number;
  used: number;
  remaining: number;
  unusedRate: number; // 미사용률 (%)
  trend: "up" | "down" | "same"; // 전월 대비
  trendVal: number;
}

interface MonthlyData {
  month: string;
  avgUnusedRate: number;
  highRiskCount: number; // 미사용률 70% 이상
  totalEmployees: number;
}

interface DeptData {
  dept: string;
  avgUnusedRate: number;
  count: number;
  color: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const DEPT_COLORS: Record<string, string> = {
  개발팀: "oklch(0.65 0.14 185)",
  마케팅: "oklch(0.65 0.18 60)",
  디자인: "oklch(0.65 0.18 320)",
  영업팀: "oklch(0.65 0.18 30)",
  인사팀: "oklch(0.65 0.14 140)",
  재무팀: "oklch(0.65 0.14 250)",
};

function generateMonthlyData(year: number): MonthlyData[] {
  const base = [62, 58, 65, 70, 68, 55, 52, 60, 72, 75, 78, 80];
  return Array.from({ length: 12 }, (_, i) => ({
    month: `${i + 1}월`,
    avgUnusedRate: base[i] + Math.round((year - 2024) * 3 + Math.random() * 4 - 2),
    highRiskCount: Math.round(base[i] / 10) + (year - 2024),
    totalEmployees: 247,
  }));
}

function generateEmployeeData(month: number, year: number): EmployeeLeaveReport[] {
  const seed = month + year * 12;
  const employees = [
    { name: "박서준", dept: "개발팀", color: DEPT_COLORS["개발팀"], total: 15, used: 2 },
    { name: "최지원", dept: "마케팅", color: DEPT_COLORS["마케팅"], total: 15, used: 1 },
    { name: "김태현", dept: "영업팀", color: DEPT_COLORS["영업팀"], total: 15, used: 2 },
    { name: "이수빈", dept: "디자인", color: DEPT_COLORS["디자인"], total: 15, used: 3 },
    { name: "정민준", dept: "개발팀", color: DEPT_COLORS["개발팀"], total: 15, used: 3 },
    { name: "한소희", dept: "재무팀", color: DEPT_COLORS["재무팀"], total: 15, used: 4 },
    { name: "오준혁", dept: "인사팀", color: DEPT_COLORS["인사팀"], total: 15, used: 4 },
    { name: "윤지현", dept: "마케팅", color: DEPT_COLORS["마케팅"], total: 15, used: 5 },
    { name: "강민서", dept: "개발팀", color: DEPT_COLORS["개발팀"], total: 15, used: 5 },
    { name: "임채원", dept: "영업팀", color: DEPT_COLORS["영업팀"], total: 15, used: 6 },
    { name: "신예은", dept: "디자인", color: DEPT_COLORS["디자인"], total: 15, used: 6 },
    { name: "황도현", dept: "재무팀", color: DEPT_COLORS["재무팀"], total: 15, used: 7 },
  ];

  return employees
    .map((emp, i) => {
      const usedAdj = Math.max(0, emp.used + ((seed + i) % 3) - 1);
      const remaining = emp.total - usedAdj;
      const unusedRate = Math.round((remaining / emp.total) * 100);
      const trendVal = ((seed + i) % 5) - 2;
      return {
        rank: 0,
        ...emp,
        used: usedAdj,
        remaining,
        unusedRate,
        trend: trendVal > 0 ? "up" : trendVal < 0 ? "down" : "same",
        trendVal: Math.abs(trendVal),
      } as EmployeeLeaveReport;
    })
    .sort((a, b) => b.unusedRate - a.unusedRate)
    .map((emp, i) => ({ ...emp, rank: i + 1 }));
}

function generateDeptData(month: number, year: number): DeptData[] {
  const depts = Object.keys(DEPT_COLORS);
  const base = [72, 65, 78, 60, 55, 68];
  return depts.map((dept, i) => ({
    dept,
    avgUnusedRate: base[i] + ((month + year + i) % 10) - 5,
    count: [8, 5, 6, 7, 4, 6][i],
    color: DEPT_COLORS[dept],
  }));
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomAreaTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-xl shadow-lg p-3 text-xs">
      <div className="font-semibold text-foreground mb-1">{label}</div>
      <div className="flex items-center gap-1.5 text-[var(--teal-dark)]">
        <span className="w-2 h-2 rounded-full bg-[var(--teal)] inline-block" />
        평균 미사용률: <span className="mono-num font-bold">{payload[0]?.value}%</span>
      </div>
      <div className="flex items-center gap-1.5 text-[var(--coral)] mt-0.5">
        <span className="w-2 h-2 rounded-full bg-[var(--coral)] inline-block" />
        고위험 직원: <span className="mono-num font-bold">{payload[1]?.value}명</span>
      </div>
    </div>
  );
}

function CustomBarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-xl shadow-lg p-3 text-xs">
      <div className="font-semibold text-foreground mb-1">{label}</div>
      <div className="text-muted-foreground">
        평균 미사용률: <span className="mono-num font-bold text-foreground">{payload[0]?.value}%</span>
      </div>
    </div>
  );
}

// ─── PDF Report Content (printable area) ─────────────────────────────────────

function ReportPrintArea({
  printRef,
  selectedYear,
  selectedMonth,
  monthlyData,
  employeeData,
  deptData,
  summaryStats,
}: {
  printRef: React.RefObject<HTMLDivElement | null>;
  selectedYear: number;
  selectedMonth: number;
  monthlyData: MonthlyData[];
  employeeData: EmployeeLeaveReport[];
  deptData: DeptData[];
  summaryStats: { avgUnused: number; highRisk: number; maxUnused: number; topEmp: string };
}) {
  const monthLabel = `${selectedYear}년 ${selectedMonth}월`;
  const highRiskEmps = employeeData.filter((e) => e.unusedRate >= 70);

  return (
    <div
      ref={printRef}
      id="pdf-report-area"
      className="bg-white"
      style={{ width: "794px", padding: "40px", fontFamily: "Pretendard, sans-serif" }}
    >
      {/* Header */}
      <div style={{ borderBottom: "2px solid oklch(0.65 0.14 185)", paddingBottom: "20px", marginBottom: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "oklch(0.2 0.02 185)", letterSpacing: "-0.5px" }}>
              연차 미사용률 요약 리포트
            </div>
            <div style={{ fontSize: "13px", color: "oklch(0.55 0.01 185)", marginTop: "4px" }}>
              {monthLabel} 기준 · 싸카스포츠 HR Platform
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", color: "oklch(0.55 0.01 185)" }}>생성일</div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "oklch(0.3 0.02 185)" }}>
              {new Date().toLocaleDateString("ko-KR")}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "28px" }}>
        {[
          { label: "평균 미사용률", value: `${summaryStats.avgUnused}%`, sub: "전체 직원 기준", color: "oklch(0.65 0.14 185)" },
          { label: "고위험 직원", value: `${summaryStats.highRisk}명`, sub: "미사용률 70% 이상", color: "oklch(0.65 0.18 30)" },
          { label: "최고 미사용률", value: `${summaryStats.maxUnused}%`, sub: summaryStats.topEmp, color: "oklch(0.65 0.18 320)" },
          { label: "총 직원 수", value: "247명", sub: "재직 기준", color: "oklch(0.65 0.14 140)" },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: "oklch(0.97 0.005 185)", borderRadius: "12px", padding: "14px" }}>
            <div style={{ fontSize: "11px", color: "oklch(0.55 0.01 185)", marginBottom: "4px" }}>{kpi.label}</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: kpi.color, fontVariantNumeric: "tabular-nums" }}>{kpi.value}</div>
            <div style={{ fontSize: "10px", color: "oklch(0.6 0.01 185)", marginTop: "2px" }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* High Risk Table */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "oklch(0.2 0.02 185)", marginBottom: "10px" }}>
          미사용률 상위 직원 ({highRiskEmps.length}명)
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ background: "oklch(0.95 0.01 185)" }}>
              {["순위", "직원", "부서", "총 연차", "사용", "잔여", "미사용률", "전월 대비"].map((h) => (
                <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "oklch(0.4 0.02 185)", borderBottom: "1px solid oklch(0.9 0.01 185)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employeeData.slice(0, 10).map((emp, i) => (
              <tr key={emp.name} style={{ background: i % 2 === 0 ? "white" : "oklch(0.985 0.003 185)", borderBottom: "1px solid oklch(0.93 0.005 185)" }}>
                <td style={{ padding: "7px 10px", fontWeight: 700, color: emp.rank <= 3 ? "oklch(0.65 0.18 30)" : "oklch(0.5 0.01 185)" }}>
                  {emp.rank <= 3 ? `🔴 ${emp.rank}` : emp.rank}
                </td>
                <td style={{ padding: "7px 10px", fontWeight: 600, color: "oklch(0.2 0.02 185)" }}>{emp.name}</td>
                <td style={{ padding: "7px 10px", color: "oklch(0.5 0.01 185)" }}>{emp.dept}</td>
                <td style={{ padding: "7px 10px", fontVariantNumeric: "tabular-nums" }}>{emp.total}일</td>
                <td style={{ padding: "7px 10px", fontVariantNumeric: "tabular-nums", color: "oklch(0.45 0.14 185)" }}>{emp.used}일</td>
                <td style={{ padding: "7px 10px", fontVariantNumeric: "tabular-nums", fontWeight: 700, color: emp.unusedRate >= 70 ? "oklch(0.65 0.18 30)" : "oklch(0.3 0.02 185)" }}>
                  {emp.remaining}일
                </td>
                <td style={{ padding: "7px 10px" }}>
                  <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, color: emp.unusedRate >= 80 ? "oklch(0.55 0.22 27)" : emp.unusedRate >= 70 ? "oklch(0.65 0.18 30)" : "oklch(0.45 0.14 185)" }}>
                    {emp.unusedRate}%
                  </span>
                </td>
                <td style={{ padding: "7px 10px", fontSize: "11px" }}>
                  {emp.trend === "up" ? (
                    <span style={{ color: "oklch(0.55 0.22 27)" }}>▲ {emp.trendVal}%p</span>
                  ) : emp.trend === "down" ? (
                    <span style={{ color: "oklch(0.45 0.14 185)" }}>▼ {emp.trendVal}%p</span>
                  ) : (
                    <span style={{ color: "oklch(0.6 0.01 185)" }}>— 변동없음</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dept Summary */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "oklch(0.2 0.02 185)", marginBottom: "10px" }}>
          부서별 평균 미사용률
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
          {deptData.map((dept) => (
            <div key={dept.dept} style={{ background: "oklch(0.97 0.005 185)", borderRadius: "10px", padding: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "oklch(0.3 0.02 185)" }}>{dept.dept}</span>
                <span style={{ fontSize: "14px", fontWeight: 700, color: dept.color, fontVariantNumeric: "tabular-nums" }}>{dept.avgUnusedRate}%</span>
              </div>
              <div style={{ height: "6px", background: "oklch(0.9 0.01 185)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${dept.avgUnusedRate}%`, background: dept.color, borderRadius: "3px" }} />
              </div>
              <div style={{ fontSize: "10px", color: "oklch(0.6 0.01 185)", marginTop: "4px" }}>{dept.count}명 재직</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid oklch(0.9 0.01 185)", paddingTop: "12px", display: "flex", justifyContent: "space-between", fontSize: "10px", color: "oklch(0.6 0.01 185)" }}>
        <span>싸카스포츠 · HR Platform · TeamPulse</span>
        <span>본 리포트는 {new Date().toLocaleDateString("ko-KR")} 기준으로 자동 생성되었습니다.</span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [sortBy, setSortBy] = useState<"unusedRate" | "remaining" | "name">("unusedRate");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const monthlyData = generateMonthlyData(selectedYear);
  const employeeData = generateEmployeeData(selectedMonth, selectedYear)
    .sort((a, b) => {
      if (sortBy === "unusedRate") return b.unusedRate - a.unusedRate;
      if (sortBy === "remaining") return b.remaining - a.remaining;
      return a.name.localeCompare(b.name);
    })
    .map((emp, i) => ({ ...emp, rank: i + 1 }));
  const deptData = generateDeptData(selectedMonth, selectedYear);

  const summaryStats = {
    avgUnused: Math.round(employeeData.reduce((s, e) => s + e.unusedRate, 0) / employeeData.length),
    highRisk: employeeData.filter((e) => e.unusedRate >= 70).length,
    maxUnused: employeeData[0]?.unusedRate ?? 0,
    topEmp: employeeData[0]?.name ?? "-",
  };

  const currentMonthData = monthlyData[selectedMonth - 1];

  const handleDownloadExcel = async () => {
    setIsExporting(true);
    toast.info("엑셀 파일 생성 중...", { description: "잠시만 기다려 주세요." });
    try {
      const XLSX = await import("xlsx");

      // ── Sheet 1: 직원별 상세 데이터 ──────────────────────────────────
      const empRows = employeeData.map((emp) => ({
        순위: emp.rank,
        이름: emp.name,
        부서: emp.dept,
        "총 연차(일)": emp.total,
        "사용(일)": emp.used,
        "잔여(일)": emp.remaining,
        "미사용률(%)": emp.unusedRate,
        "전월 대비": emp.trend === "up" ? `+${emp.trendVal}%p` : emp.trend === "down" ? `-${emp.trendVal}%p` : "변동없음",
        위험도: emp.unusedRate >= 85 ? "위험" : emp.unusedRate >= 70 ? "주의" : "양호",
      }));
      const empSheet = XLSX.utils.json_to_sheet(empRows);
      // 컬럼 너비 설정
      empSheet["!cols"] = [8, 10, 10, 12, 10, 10, 12, 12, 8].map((w) => ({ wch: w }));

      // ── Sheet 2: 월별 추세 데이터 ────────────────────────────────────
      const monthRows = monthlyData.map((m) => ({
        월: m.month,
        "평균 미사용률(%)": m.avgUnusedRate,
        "고위험 직원 수(명)": m.highRiskCount,
        "총 직원 수(명)": m.totalEmployees,
      }));
      const monthSheet = XLSX.utils.json_to_sheet(monthRows);
      monthSheet["!cols"] = [8, 16, 16, 14].map((w) => ({ wch: w }));

      // ── Sheet 3: 부서별 통계 ─────────────────────────────────────────
      const deptRows = deptData.map((d) => ({
        부서: d.dept,
        "평균 미사용률(%)": d.avgUnusedRate,
        "재직 인원(명)": d.count,
      }));
      const deptSheet = XLSX.utils.json_to_sheet(deptRows);
      deptSheet["!cols"] = [12, 16, 14].map((w) => ({ wch: w }));

      // ── Sheet 4: 요약 KPI ────────────────────────────────────────────
      const kpiRows = [
        { 항목: "기준 연도", 값: `${selectedYear}년` },
        { 항목: "기준 월", 값: `${selectedMonth}월` },
        { 항목: "평균 미사용률", 값: `${summaryStats.avgUnused}%` },
        { 항목: "고위험 직원 수", 값: `${summaryStats.highRisk}명` },
        { 항목: "최고 미사용률", 값: `${summaryStats.maxUnused}%` },
        { 항목: "최고 미사용률 직원", 값: summaryStats.topEmp },
        { 항목: "총 직원 수", 값: "247명" },
        { 항목: "생성일", 값: new Date().toLocaleDateString("ko-KR") },
      ];
      const kpiSheet = XLSX.utils.json_to_sheet(kpiRows);
      kpiSheet["!cols"] = [20, 16].map((w) => ({ wch: w }));

      // ── 워크북 조합 ──────────────────────────────────────────────────
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, empSheet, "직원별 미사용률");
      XLSX.utils.book_append_sheet(wb, monthSheet, "월별 추세");
      XLSX.utils.book_append_sheet(wb, deptSheet, "부서별 통계");
      XLSX.utils.book_append_sheet(wb, kpiSheet, "요약 KPI");

      const fileName = `연차미사용률_리포트_${selectedYear}년${selectedMonth}월.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast.success("엑셀 다운로드 완료", { description: `${fileName} · 시트 4개 포함` });
    } catch (err) {
      console.error(err);
      toast.error("엑셀 생성에 실패했습니다", { description: "잠시 후 다시 시도해주세요." });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setIsGenerating(true);
    toast.info("PDF 생성 중...", { description: "잠시만 기다려 주세요." });

    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      // If content exceeds one page, split across pages
      const pageHeight = pdf.internal.pageSize.getHeight();
      if (pdfHeight <= pageHeight) {
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      } else {
        let yOffset = 0;
        let remaining = pdfHeight;
        let page = 0;
        while (remaining > 0) {
          if (page > 0) pdf.addPage();
          const sliceHeight = Math.min(pageHeight, remaining);
          const srcY = (yOffset / pdfHeight) * canvas.height;
          const srcH = (sliceHeight / pdfHeight) * canvas.height;

          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = canvas.width;
          pageCanvas.height = srcH;
          const ctx = pageCanvas.getContext("2d")!;
          ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
          pdf.addImage(pageCanvas.toDataURL("image/png"), "PNG", 0, 0, pdfWidth, sliceHeight);

          yOffset += sliceHeight;
          remaining -= sliceHeight;
          page++;
        }
      }

      pdf.save(`연차미사용률_리포트_${selectedYear}년${selectedMonth}월.pdf`);
      toast.success("PDF 다운로드 완료", {
        description: `연차미사용률_리포트_${selectedYear}년${selectedMonth}월.pdf`,
      });
    } catch (err) {
      console.error(err);
      toast.error("PDF 생성에 실패했습니다", { description: "잠시 후 다시 시도해주세요." });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-5 lg:p-7 page-enter">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">연차 미사용률 리포트</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {selectedYear}년 {selectedMonth}월 기준 · 싸카스포츠
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Year Selector */}
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="appearance-none pl-3 pr-8 py-2 text-sm font-medium bg-white border border-border rounded-xl outline-none focus:ring-2 focus:ring-[var(--teal)]/30 cursor-pointer"
            >
              {[2023, 2024, 2025].map((y) => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
          {/* Month Selector */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="appearance-none pl-3 pr-8 py-2 text-sm font-medium bg-white border border-border rounded-xl outline-none focus:ring-2 focus:ring-[var(--teal)]/30 cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m}월</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
          {/* Excel Download */}
          <Button
            variant="outline"
            className="gap-2 rounded-xl text-sm border-[var(--teal)] text-[var(--teal-dark)] hover:bg-[var(--teal-light)] bg-white"
            onClick={handleDownloadExcel}
            disabled={isExporting}
          >
            {isExporting ? (
              <><span className="w-3.5 h-3.5 border-2 border-[var(--teal)]/40 border-t-[var(--teal)] rounded-full animate-spin" />생성 중...</>
            ) : (
              <><Sheet size={15} />엑셀 다운로드</>
            )}
          </Button>
          {/* PDF Download */}
          <Button
            className="gap-2 rounded-xl text-white text-sm"
            style={{ background: isGenerating ? "var(--teal-dark)" : "var(--teal)" }}
            onClick={handleDownloadPDF}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />생성 중...</>
            ) : (
              <><Download size={15} />PDF 다운로드</>
            )}
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "평균 미사용률",
            value: `${summaryStats.avgUnused}%`,
            sub: "전체 직원 기준",
            icon: BarChart3,
            color: "text-[var(--teal-dark)]",
            bg: "bg-[var(--teal-light)]",
          },
          {
            label: "고위험 직원",
            value: `${summaryStats.highRisk}명`,
            sub: "미사용률 70% 이상",
            icon: AlertTriangle,
            color: "text-[var(--coral)]",
            bg: "bg-[var(--coral-light)]",
          },
          {
            label: "최고 미사용률",
            value: `${summaryStats.maxUnused}%`,
            sub: summaryStats.topEmp,
            icon: TrendingUp,
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
          {
            label: "이번 달 연차자",
            value: `${currentMonthData?.highRiskCount ?? 0}명`,
            sub: "오늘 기준",
            icon: Users,
            color: "text-violet-600",
            bg: "bg-violet-50",
          },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl p-4 shadow-sm border border-border">
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", card.bg)}>
                <card.icon size={18} className={card.color} />
              </div>
              <div>
                <div className={cn("mono-num text-2xl font-bold", card.color)}>{card.value}</div>
                <div className="text-xs text-muted-foreground">{card.label}</div>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground mt-2 pl-1">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
        {/* Monthly Trend Chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="section-title">{selectedYear}년 월별 미사용률 추세</h2>
              <p className="text-xs text-muted-foreground mt-0.5">평균 미사용률 및 고위험 직원 수 변화</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[var(--teal)] inline-block" />미사용률</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[var(--coral)] inline-block" />고위험 인원</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--teal)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--teal)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="coralGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--coral)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--coral)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.93 0.004 286)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "oklch(0.55 0.016 286)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "oklch(0.55 0.016 286)" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomAreaTooltip />} />
              <Area type="monotone" dataKey="avgUnusedRate" stroke="var(--teal)" strokeWidth={2} fill="url(#tealGrad)" dot={false}
                activeDot={{ r: 4, fill: "var(--teal)", strokeWidth: 0 }} />
              <Area type="monotone" dataKey="highRiskCount" stroke="var(--coral)" strokeWidth={2} fill="url(#coralGrad)" dot={false}
                activeDot={{ r: 4, fill: "var(--coral)", strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Dept Bar Chart */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-border">
          <div className="mb-4">
            <h2 className="section-title">부서별 평균 미사용률</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{selectedYear}년 {selectedMonth}월 기준</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deptData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.93 0.004 286)" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "oklch(0.55 0.016 286)" }} axisLine={false} tickLine={false} unit="%" />
              <YAxis type="category" dataKey="dept" tick={{ fontSize: 11, fill: "oklch(0.35 0.01 185)" }} axisLine={false} tickLine={false} width={45} />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar dataKey="avgUnusedRate" radius={[0, 6, 6, 0]} maxBarSize={18}>
                {deptData.map((entry) => (
                  <Cell key={entry.dept} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Employee Ranking Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden mb-6">
        <div className="p-5 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="section-title">직원별 미사용률 순위</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedYear}년 {selectedMonth}월 기준 · 미사용률 70% 이상은 <span className="text-[var(--coral)] font-semibold">고위험</span>으로 표시
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">정렬:</span>
              {(["unusedRate", "remaining", "name"] as const).map((s) => {
                const labels = { unusedRate: "미사용률", remaining: "잔여일", name: "이름" };
                return (
                  <button key={s} onClick={() => setSortBy(s)}
                    className={cn("px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all",
                      sortBy === s ? "bg-[var(--teal)] text-white" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
                    {labels[s]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["순위", "직원", "부서", "총 연차", "사용", "잔여", "미사용률", "전월 대비", "위험도"].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {employeeData.map((emp) => {
                const isHighRisk = emp.unusedRate >= 70;
                const isCritical = emp.unusedRate >= 85;
                return (
                  <tr key={emp.name} className={cn("transition-colors hover:bg-muted/20", isHighRisk && "bg-[var(--coral-light)]/30")}>
                    <td className="px-4 py-3">
                      <span className={cn("mono-num text-sm font-bold",
                        emp.rank === 1 ? "text-[var(--coral)]" : emp.rank <= 3 ? "text-amber-500" : "text-muted-foreground")}>
                        {emp.rank <= 3 ? ["🥇", "🥈", "🥉"][emp.rank - 1] : emp.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={{ background: emp.color }}>
                          {emp.name.slice(0, 1)}
                        </div>
                        <span className="text-sm font-semibold text-foreground">{emp.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{emp.dept}</td>
                    <td className="px-4 py-3 mono-num text-sm text-foreground">{emp.total}일</td>
                    <td className="px-4 py-3 mono-num text-sm text-[var(--teal-dark)] font-semibold">{emp.used}일</td>
                    <td className="px-4 py-3 mono-num text-sm font-bold text-foreground">{emp.remaining}일</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${emp.unusedRate}%`, background: isCritical ? "var(--coral)" : isHighRisk ? "oklch(0.65 0.18 60)" : "var(--teal)" }} />
                        </div>
                        <span className={cn("mono-num text-sm font-bold",
                          isCritical ? "text-[var(--coral)]" : isHighRisk ? "text-amber-600" : "text-foreground")}>
                          {emp.unusedRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {emp.trend === "up" ? (
                        <span className="flex items-center gap-0.5 text-xs font-semibold text-[var(--coral)]">
                          <TrendingUp size={12} />+{emp.trendVal}%p
                        </span>
                      ) : emp.trend === "down" ? (
                        <span className="flex items-center gap-0.5 text-xs font-semibold text-[var(--teal-dark)]">
                          <TrendingDown size={12} />-{emp.trendVal}%p
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isCritical ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--coral-light)] text-[var(--coral)]">위험</span>
                      ) : isHighRisk ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">주의</span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--teal-light)] text-[var(--teal-dark)]">양호</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hidden PDF Print Area */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none" aria-hidden="true">
        <ReportPrintArea
          printRef={printRef}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          monthlyData={monthlyData}
          employeeData={employeeData}
          deptData={deptData}
          summaryStats={summaryStats}
        />
      </div>
    </div>
  );
}
