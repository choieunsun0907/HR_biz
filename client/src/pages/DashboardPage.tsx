/**
 * DashboardPage — TeamPulse HR Dashboard
 * Design: Soft Teal Clarity
 * Features:
 * - KPI Cards (총 인원, 이직률, 참여 점수, 신규 채용)
 * - 부서별 출석 히트맵
 * - 직원 만족도 추세 차트 (Recharts)
 * - 최근 채용/퇴사 현황
 * - 엑셀 업로드/다운로드 버튼
 */

import { useState, useEffect } from "react";
import {
  Users,
  TrendingUp,
  Download,
  Upload,
  PenLine,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// ─── Mock Data ───────────────────────────────────────────────────────────────

const satisfactionData = [
  { month: "1월", score: 72, industry: 68 },
  { month: "2월", score: 75, industry: 69 },
  { month: "3월", score: 71, industry: 70 },
  { month: "4월", score: 78, industry: 71 },
  { month: "5월", score: 82, industry: 71 },
  { month: "6월", score: 80, industry: 72 },
  { month: "7월", score: 85, industry: 72 },
  { month: "8월", score: 83, industry: 73 },
  { month: "9월", score: 87, industry: 73 },
  { month: "10월", score: 84, industry: 74 },
  { month: "11월", score: 89, industry: 74 },
  { month: "12월", score: 91, industry: 75 },
];

const turnoverData = [
  { month: "1월", 자발: 2, 비자발: 1 },
  { month: "2월", 자발: 1, 비자발: 0 },
  { month: "3월", 자발: 3, 비자발: 1 },
  { month: "4월", 자발: 2, 비자발: 2 },
  { month: "5월", 자발: 1, 비자발: 1 },
  { month: "6월", 자발: 4, 비자발: 0 },
];

const departments = ["개발팀", "마케팅", "영업팀", "인사팀", "재무팀", "디자인"];
const weekDays = ["월", "화", "수", "목", "금"];

// Generate heatmap data
const generateHeatmap = () =>
  departments.map((dept) => ({
    dept,
    days: weekDays.map((day) => ({
      day,
      rate: Math.floor(Math.random() * 30) + 70, // 70~100%
    })),
  }));

const recentActivity = [
  { type: "hire", name: "이준혁", dept: "개발팀", role: "Frontend Engineer", date: "2025.05.13", avatar: "이준" },
  { type: "hire", name: "박소연", dept: "마케팅", role: "Brand Manager", date: "2025.05.10", avatar: "박소" },
  { type: "resign", name: "최민수", dept: "영업팀", role: "Sales Lead", date: "2025.05.08", avatar: "최민" },
  { type: "hire", name: "정하은", dept: "디자인", role: "UX Designer", date: "2025.05.05", avatar: "정하" },
  { type: "resign", name: "강태양", dept: "재무팀", role: "Accountant", date: "2025.05.01", avatar: "강태" },
];

// ─── KPI Card ────────────────────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  value: string;
  change: string;
  changeType: "up" | "down" | "neutral";
  icon: React.ElementType;
  color: string;
  delay?: number;
}

function KpiCard({ title, value, change, changeType, icon: Icon, color, delay = 0 }: KpiCardProps) {
  const [displayed, setDisplayed] = useState("0");

  useEffect(() => {
    const timer = setTimeout(() => setDisplayed(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return (
    <div className="kpi-card" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: color + "20" }}
        >
          <Icon size={20} style={{ color }} />
        </div>
        <div
          className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
            changeType === "up"
              ? "bg-emerald-50 text-emerald-600"
              : changeType === "down"
              ? "bg-red-50 text-red-500"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {changeType === "up" ? <ArrowUpRight size={12} /> : changeType === "down" ? <ArrowDownRight size={12} /> : null}
          {change}
        </div>
      </div>
      <div className="mono-num text-2xl font-bold text-foreground count-up">{displayed}</div>
      <div className="text-sm text-muted-foreground mt-1">{title}</div>
    </div>
  );
}

// ─── Heatmap Cell ─────────────────────────────────────────────────────────────

function HeatCell({ rate }: { rate: number }) {
  const getColor = (r: number) => {
    if (r >= 95) return "oklch(0.50 0.14 185)";
    if (r >= 90) return "oklch(0.60 0.14 185)";
    if (r >= 85) return "oklch(0.70 0.12 185)";
    if (r >= 80) return "oklch(0.80 0.09 185)";
    if (r >= 75) return "oklch(0.88 0.06 185)";
    return "oklch(0.94 0.03 185)";
  };

  return (
    <div
      className="heatmap-cell"
      style={{ background: getColor(rate) }}
      title={`출석률: ${rate}%`}
    />
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [heatmapData] = useState(generateHeatmap);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("데이터가 업데이트되었습니다");
    }, 1200);
  };

  const handleExcelDownload = () => {
    toast.success("엑셀 파일 다운로드 중...", { description: "HR_Dashboard_2025.xlsx" });
  };

  const handleExcelUpload = () => {
    toast.info("파일을 선택해주세요", { description: ".xlsx, .csv 형식 지원" });
  };

  const handleESign = () => {
    toast.info("전자 서명 모듈을 불러오는 중...");
  };

  return (
    <div className="p-5 lg:p-7 page-enter">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">HR 대시보드</h1>
          <p className="text-sm text-muted-foreground mt-0.5">2025년 5월 기준 · 실시간 업데이트</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-xl text-xs"
            onClick={handleExcelUpload}
          >
            <Upload size={14} />
            업로드
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-xl text-xs"
            onClick={handleExcelDownload}
          >
            <Download size={14} />
            다운로드
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-xl text-xs"
            onClick={handleESign}
          >
            <PenLine size={14} />
            전자서명
          </Button>
          <Button
            size="sm"
            className="gap-2 rounded-xl text-xs text-white"
            style={{ background: "var(--teal)" }}
            onClick={handleRefresh}
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            새로고침
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 mb-6 stagger">
        <KpiCard
          title="총 인원"
          value="247명"
          change="+12 이번 달"
          changeType="up"
          icon={Users}
          color="oklch(0.65 0.14 185)"
          delay={0}
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
        {/* Satisfaction Chart - 2/3 width */}
        <div className="xl:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="section-title">직원 만족도 추세</h2>
              <p className="text-xs text-muted-foreground mt-0.5">업계 평균 대비 비교 · 2025년</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded-full inline-block" style={{ background: "var(--teal)" }} />
                우리 회사
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded-full inline-block bg-muted-foreground/40" />
                업계 평균
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={satisfactionData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.65 0.14 185)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="oklch(0.65 0.14 185)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.94 0.005 220)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "oklch(0.55 0.01 220)" }} axisLine={false} tickLine={false} />
              <YAxis domain={[60, 100]} tick={{ fontSize: 11, fill: "oklch(0.55 0.01 220)" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid oklch(0.92 0.005 220)",
                  fontSize: "12px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="oklch(0.65 0.14 185)"
                strokeWidth={2.5}
                fill="url(#tealGrad)"
                name="우리 회사"
                dot={false}
                activeDot={{ r: 5, fill: "oklch(0.65 0.14 185)" }}
              />
              <Line
                type="monotone"
                dataKey="industry"
                stroke="oklch(0.75 0.01 220)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                name="업계 평균"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Turnover Chart - 1/3 width */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-border">
          <div className="mb-4">
            <h2 className="section-title">이직 현황</h2>
            <p className="text-xs text-muted-foreground mt-0.5">자발적 / 비자발적 퇴사</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={turnoverData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.94 0.005 220)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "oklch(0.55 0.01 220)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "oklch(0.55 0.01 220)" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid oklch(0.92 0.005 220)",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="자발" fill="oklch(0.65 0.14 185)" radius={[4, 4, 0, 0]} name="자발적" />
              <Bar dataKey="비자발" fill="oklch(0.65 0.20 25)" radius={[4, 4, 0, 0]} name="비자발적" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Heatmap - 2/3 */}
        <div className="xl:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="section-title">부서별 출석 현황</h2>
              <p className="text-xs text-muted-foreground mt-0.5">이번 주 · 부서별 출석률 히트맵</p>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>낮음</span>
              {[0.94, 0.88, 0.80, 0.70, 0.60, 0.50].map((l, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded"
                  style={{ background: `oklch(${l} ${l < 0.85 ? "0.12" : "0.04"} 185)` }}
                />
              ))}
              <span>높음</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left text-xs text-muted-foreground font-medium pb-2 pr-4 w-24">부서</th>
                  {weekDays.map((d) => (
                    <th key={d} className="text-xs text-muted-foreground font-medium pb-2 text-center w-10">
                      {d}
                    </th>
                  ))}
                  <th className="text-xs text-muted-foreground font-medium pb-2 text-right pl-4">평균</th>
                </tr>
              </thead>
              <tbody>
                {heatmapData.map((row) => {
                  const avg = Math.round(row.days.reduce((s, d) => s + d.rate, 0) / row.days.length);
                  return (
                    <tr key={row.dept}>
                      <td className="text-xs font-medium text-foreground pr-4 py-1">{row.dept}</td>
                      {row.days.map((d) => (
                        <td key={d.day} className="py-1 text-center">
                          <HeatCell rate={d.rate} />
                        </td>
                      ))}
                      <td className="py-1 text-right pl-4">
                        <span className="mono-num text-xs font-semibold text-foreground">{avg}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity - 1/3 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">최근 인사 현황</h2>
            <button className="text-xs text-[var(--teal)] font-medium flex items-center gap-0.5 hover:underline">
              전체보기 <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{
                    background:
                      item.type === "hire"
                        ? "var(--teal)"
                        : "var(--coral)",
                  }}
                >
                  {item.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{item.name}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        item.type === "hire"
                          ? "bg-[var(--teal-light)] text-[var(--teal-dark)]"
                          : "bg-[var(--coral-light)] text-[var(--coral)]"
                      }`}
                    >
                      {item.type === "hire" ? "입사" : "퇴사"}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {item.dept} · {item.role}
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground shrink-0">{item.date}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
