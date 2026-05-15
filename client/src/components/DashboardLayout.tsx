/**
 * DashboardLayout — TeamPulse HR Platform
 * Design: Soft Teal Clarity (Scandinavian Minimalism)
 * - Fixed 240px sidebar with teal brand color
 * - Rounded nav items with active pill animation
 * - Clean white content area with subtle background
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
  Bell,
  Search,
  ChevronDown,
  Building2,
  BarChart3,
  Menu,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: number;
  group?: string;
}

const navItems: NavItem[] = [
  { label: "HR 대시보드", icon: LayoutDashboard, href: "/", group: "메인" },
  { label: "근태 · 연차", icon: CalendarDays, href: "/attendance", group: "메인" },
  { label: "소통 · 협업", icon: MessageSquare, href: "/community", badge: 3, group: "메인" },
  { label: "직원 관리", icon: Users, href: "/employees", group: "관리" },
  { label: "조직도", icon: Building2, href: "/org-chart", group: "관리" },
  { label: "보고서", icon: BarChart3, href: "/reports", group: "관리" },
  { label: "문서 관리", icon: FileText, href: "/documents", group: "관리" },
  { label: "설정", icon: Settings, href: "/settings", group: "시스템" },
];

const groups = ["메인", "관리", "시스템"];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeRoutes = ["/", "/attendance", "/community"];
  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
            style={{ background: "linear-gradient(135deg, oklch(0.65 0.14 185), oklch(0.50 0.14 185))" }}
          >
            TP
          </div>
          <div>
            <div className="font-bold text-foreground text-base tracking-tight">TeamPulse</div>
            <div className="text-xs text-muted-foreground">HR Platform</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {groups.map((group) => {
          const items = navItems.filter((n) => n.group === group);
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
      <div className="px-3 py-4 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors cursor-pointer">
          <Avatar className="w-8 h-8">
            <AvatarFallback
              className="text-xs font-semibold text-white"
              style={{ background: "var(--teal)" }}
            >
              김HR
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground truncate">김인사</div>
            <div className="text-xs text-muted-foreground truncate">HR Manager</div>
          </div>
          <ChevronDown size={14} className="text-muted-foreground shrink-0" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[oklch(0.975_0.005_220)] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-white border-r border-border shadow-sm">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-60 bg-white border-r border-border shadow-lg transition-transform duration-300 lg:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-border flex items-center px-4 lg:px-6 gap-4 shrink-0">
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
            {/* Notification */}
            <Button variant="ghost" size="icon" className="relative rounded-xl">
              <Bell size={18} />
              <span
                className="absolute top-2 right-2 w-2 h-2 rounded-full"
                style={{ background: "var(--coral)" }}
              />
            </Button>

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
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
