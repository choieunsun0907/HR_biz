import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import DashboardLayout from "./components/DashboardLayout";
import DashboardPage from "./pages/DashboardPage";
import AttendancePage from "./pages/AttendancePage";
import CommunityPage from "./pages/CommunityPage";
import EmployeesPage from "./pages/EmployeesPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import OrgChartPage from "./pages/OrgChartPage";
import LoginPage from "./pages/LoginPage";

// 인증 보호 래퍼
function ProtectedApp() {
  const { isAuthenticated, loading } = useAuth();
  const [location] = useLocation();

  // 로딩 중 스켈레톤
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-md"
            style={{ background: "linear-gradient(135deg, oklch(0.65 0.14 185), oklch(0.50 0.14 185))" }}
          >
            싸
          </div>
          <div className="flex gap-1.5">
            <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    );
  }

  // 미인증 → 로그인 페이지
  if (!isAuthenticated && location !== "/login") {
    return <LoginPage />;
  }

  // 로그인 페이지 직접 접근 시 (이미 인증된 경우 대시보드로)
  if (isAuthenticated && location === "/login") {
    window.location.replace("/");
    return null;
  }

  if (location === "/login") {
    return <LoginPage />;
  }

  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/attendance" component={AttendancePage} />
        <Route path="/community" component={CommunityPage} />
        <Route path="/employees" component={EmployeesPage} />
        <Route path="/org-chart" component={OrgChartPage} />
        <Route path="/reports" component={ReportsPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <AuthProvider>
            <ProtectedApp />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
