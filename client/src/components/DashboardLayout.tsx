/**
 * DashboardLayout — 싸카스포츠 HR Platform
 * Design: Soft Teal Clarity (Scandinavian Minimalism)
 * - Fixed 240px sidebar with teal brand color
 * - Rounded nav items with active pill animation
 * - Role-based menu: admin (full) / employee (limited)
 */

import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  CalendarDays,
  MessageSquare,
  Users,
  FileText,
  Settings,
  Building2,
  BarChart3,
  Menu,
  ChevronDown,
  LogOut,
  User,
  Search,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/pages/AttendancePage";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: number;
  group: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: "HR 대시보드", icon: LayoutDashboard, href: "/", group: "메인" },
  { label: "근태 · 연차", icon: CalendarDays, href: "/attendance", group: "메인" },
  { label: "소통 · 협업", icon: MessageSquare, href: "/community", badge: 3, group: "메인" },
  { label: "직원 관리", icon: Users, href: "/employees", group: "관리", adminOnly: true },
  { label: "조직도", icon: Building2, href: "/org-chart", group: "관리" },
  { label: "보고서", icon: BarChart3, href: "/reports", group: "관리", adminOnly: true },
  { label: "문서 관리", icon: FileText, href: "/documents", group: "관리", adminOnly: true },
  { label: "설정", icon: Settings, href: "/settings", group: "시스템", adminOnly: true },
];

const groups = ["메인", "관리", "시스템"];

const activeRoutes = ["/", "/attendance", "/community", "/employees", "/org-chart", "/reports", "/settings"];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, isAdmin, logout } = useAuth();

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  const visibleNavItems = navItems.filter((item) => isAdmin || !item.adminOnly);

  const handleLogout = async () => {
    await logout();
  };

  const initials = user?.name
    ? user.name.slice(0, 2)
    : "HR";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
            style={{ background: "linear-gradient(135deg, oklch(0.65 0.14 185), oklch(0.50 0.14 185))" }}
          >
            싸
          </div>
          <div>
            <div className="font-bold text-foreground text-base tracking-tight">싸카스포츠</div>
            <div className="text-xs text-muted-foreground">HR Platform</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {groups.map((group) => {
          const items = visibleNavItems.filter((n) => n.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="mb-5">
              <div className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {group}
              </div>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active = isActive(item.href);
                  const isImplemented = activeRoutes.includes(item.href);
                  return (
                    <Link key={item.href} href={isImplemented ? item.href : "#"}>
                      <div
                        className={cn(
                          "nav-item",
                          active ? "nav-item-active" : "nav-item-inactive"
                        )}
                        onClick={() => {
                          if (!isImplemented) {
                            import("sonner").then(({ toast }) =>
                              toast("준비 중인 기능입니다", { description: "곧 제공될 예정입니다." })
                            );
                          }
                          setSidebarOpen(false);
                        }}
                      >
                        <item.icon
                          size={17}
                          className={cn(
                            "shrink-0",
                            active ? "text-[var(--teal-dark)]" : "text-muted-foreground"
                          )}
                        />
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                            style={{ background: "var(--coral)" }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="px-3 py-4 border-t border-border relative">
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors cursor-pointer"
          onClick={() => setProfileOpen(!profileOpen)}
        >
          <Avatar className="w-8 h-8">
            <AvatarFallback
              className="text-xs font-semibold text-white"
              style={{ background: isAdmin ? "var(--teal)" : "oklch(0.65 0.18 25)" }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground truncate">{user?.name || "사용자"}</div>
            <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: isAdmin ? "var(--teal)" : "oklch(0.65 0.18 25)" }}
              />
              {isAdmin ? "관리자" : "직원"} · {user?.department || user?.position || ""}
            </div>
          </div>
          <ChevronDown
            size={14}
            className={cn("text-muted-foreground shrink-0 transition-transform", profileOpen && "rotate-180")}
          />
        </div>

        {/* 프로필 드롭다운 */}
        {profileOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-1 bg-white rounded-xl shadow-lg border border-border overflow-hidden z-50">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <div className="text-sm font-semibold text-foreground">{user?.name}</div>
              <div className="text-xs text-muted-foreground">{user?.email}</div>
            </div>
            <div className="py-1">
              <button
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-muted transition-colors"
                onClick={() => setProfileOpen(false)}
              >
                <User size={15} />
                내 프로필
              </button>
              <button
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                onClick={handleLogout}
              >
                <LogOut size={15} />
                로그아웃
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[oklch(0.975_0.005_220)] overflow-hidden print:block print:h-auto print:overflow-visible">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-white border-r border-border shadow-sm print-hide">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden print-hide"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-60 bg-white border-r border-border shadow-lg transition-transform duration-300 lg:hidden print-hide",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden print:block print:overflow-visible">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-border flex items-center px-4 lg:px-6 gap-4 shrink-0 print-hide">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </Button>

          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="직원, 문서, 공지사항 검색..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-muted rounded-xl border-0 outline-none focus:ring-2 focus:ring-[var(--teal)]/30 placeholder:text-muted-foreground/60 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Notification Bell */}
            <NotificationBell />

            {/* 역할 배지 */}
            <span
              className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium"
              style={
                isAdmin
                  ? { background: "oklch(0.95 0.05 185)", color: "var(--teal-dark)" }
                  : { background: "oklch(0.95 0.05 25)", color: "oklch(0.50 0.18 25)" }
              }
            >
              {isAdmin ? "👑 관리자" : "👤 직원"}
            </span>

            {/* Date */}
            <div className="hidden sm:block text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
              {new Date().toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "short",
              })}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto print:overflow-visible print:h-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
