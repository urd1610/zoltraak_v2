"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/sidebar-store";
import {
  LayoutDashboard,
  ListChecks,
  CalendarDays,
  GanttChart,
  Map,
  Users,
  UserCog,
  CreditCard,
  Database,
  Mail,
  Inbox,
  CalendarRange,
  BarChart3,
  CheckSquare,
  Zap,
  Briefcase,
  Image,
  FileText,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { NavItem } from "@/types/navigation";

const navItems: NavItem[] = [
  { label: "ダッシュボード", href: "/dashboard", icon: LayoutDashboard },
  { label: "手順リスト", href: "/procedures", icon: ListChecks },
  { label: "スケジュール", href: "/schedule", icon: CalendarDays },
  { label: "ガントチャート", href: "/gantt", icon: GanttChart },
  { label: "ロードマップ", href: "/roadmap", icon: Map },
  { label: "セッション管理", href: "/sessions", icon: Users },
  { label: "ユーザー管理", href: "/users", icon: UserCog },
  { label: "Stripe連携", href: "/stripe", icon: CreditCard },
  { label: "DB操作", href: "/database", icon: Database },
  { label: "メール送信", href: "/email", icon: Mail },
  { label: "Gmail受信箱", href: "/gmail", icon: Inbox },
  { label: "配信カレンダー", href: "/calendar", icon: CalendarRange },
  { label: "SNS分析", href: "/sns-analytics", icon: BarChart3 },
  { label: "採点", href: "/scoring", icon: CheckSquare },
  { label: "ライト", href: "/lite", icon: Zap },
  { label: "ジョブズ", href: "/jobs", icon: Briefcase },
  { label: "OGP画像", href: "/ogp", icon: Image },
  { label: "要件定義", href: "/requirements", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggle } = useSidebarStore();

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-200",
        isCollapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex items-center justify-between h-14 px-4 border-b border-sidebar-border">
        {!isCollapsed && (
          <span className="text-lg font-bold text-sidebar-foreground">Admin</span>
        )}
        <button
          onClick={toggle}
          className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
        >
          {isCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors mb-0.5",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
