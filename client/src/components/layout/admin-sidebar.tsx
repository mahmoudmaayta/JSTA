import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarMenuBadge,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import {
  LayoutDashboard,
  Building,
  FileCheck,
  LogOut,
  Shield,
  History,
  Users,
  Tag,
  CreditCard,
  Mail,
  BookOpen,
  Download,
  ClipboardCheck,
  GitPullRequest,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { ChangeRequest } from "@shared/schema";

interface SidebarCounts {
  pendingOffices: number;
  pendingRenewals: number;
  pendingPayments: number;
  pendingChangeRequests: number;
  criticalAlerts: number;
  warningAlerts: number;
  totalAlerts: number;
}

export function AdminSidebar({ side = "left" }: { side?: "left" | "right" }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { t } = useTranslation();

  // Fetch all sidebar counts in a single request
  const { data: sidebarCounts } = useQuery<SidebarCounts>({
    queryKey: ["/api/admin/sidebar-counts"],
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: pendingChangeRequests } = useQuery<ChangeRequest[]>({
    queryKey: ["/api/admin/change-requests", { status: "SUBMITTED" }],
  });
  
  const pendingCount = sidebarCounts?.pendingChangeRequests || pendingChangeRequests?.length || 0;

  const mainMenuItems = [
    {
      title: t("navigation.dashboard"),
      url: "/admin",
      icon: LayoutDashboard,
      badge: null as string | null,
    },
    {
      title: t("navigation.offices"),
      url: "/admin/offices",
      icon: Building,
      badge: "pendingOffices" as string | null,
    },
    {
      title: t("navigation.renewals"),
      url: "/admin/renewals",
      icon: FileCheck,
      badge: "pendingRenewals" as string | null,
    },
    {
      title: t("navigation.fieldInspection"),
      url: "/admin/field-inspection",
      icon: ClipboardCheck,
      badge: null as string | null,
    },
    {
      title: t("navigation.payments"),
      url: "/admin/payments",
      icon: CreditCard,
      badge: "pendingPayments" as string | null,
    },
    {
      title: t("navigation.staffDashboard"),
      url: "/admin/staff",
      icon: Users,
      badge: null as string | null,
    },
  ];

  // Helper function to get badge count
  const getBadgeCount = (badgeKey: string | null): number => {
    if (!badgeKey || !sidebarCounts) return 0;
    switch (badgeKey) {
      case "pendingOffices": return sidebarCounts.pendingOffices;
      case "pendingRenewals": return sidebarCounts.pendingRenewals;
      case "pendingPayments": return sidebarCounts.pendingPayments;
      case "pendingCount": return pendingCount;
      case "totalAlerts": return sidebarCounts.totalAlerts;
      default: return 0;
    }
  };

  const secondaryMenuItems = [
    {
      title: t("navigation.renewalInvitations") || "Renewal Invitations",
      url: "/admin/renewal-invitations",
      icon: Mail,
      badge: null as string | null,
    },
    {
      title: t("navigation.auditLogs"),
      url: "/admin/audit-logs",
      icon: History,
      badge: null as string | null,
    },
    {
      title: t("changeRequests.title") || "Change Requests",
      url: "/admin/change-requests",
      icon: GitPullRequest,
      badge: "pendingCount" as string | null,
    },
    {
      title: t("navigation.promoCodes"),
      url: "/admin/promo-codes",
      icon: Tag,
      badge: null as string | null,
    },
  ];

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const borderClass = side === "right" ? "border-l" : "border-r";

  return (
    <Sidebar side={side} className="bg-indigo-50/50 dark:bg-indigo-950/20">
      <SidebarHeader className="border-b border-indigo-200/50 dark:border-indigo-800/30">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 dark:bg-indigo-700">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm">JSTA Portal</span>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
              {t("navigation.adminPanel")}
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("navigation.home")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => {
                const badgeCount = getBadgeCount(item.badge);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url || (item.url !== "/admin" && location.startsWith(item.url))}
                    >
                      <Link href={item.url} data-testid={`nav-${item.url.split("/").pop()}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {badgeCount > 0 && (
                      <SidebarMenuBadge 
                        className="bg-destructive text-destructive-foreground"
                        data-testid={`badge-${item.url.split("/").pop()}`}
                      >
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>{t("navigation.management")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryMenuItems.map((item) => {
                const badgeCount = getBadgeCount(item.badge);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url || (item.url !== "/admin" && location.startsWith(item.url))}
                    >
                      <Link href={item.url} data-testid={`nav-${item.url.split("/").pop()}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {badgeCount > 0 && (
                      <SidebarMenuBadge 
                        className="bg-destructive text-destructive-foreground"
                        data-testid={`badge-${item.url.split("/").pop()}`}
                      >
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>{t("navigation.resources") || "Resources"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a 
                    href="/api/admin/user-manual" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    data-testid="link-user-manual"
                  >
                    <BookOpen className="h-4 w-4" />
                    <span>{t("navigation.userManual") || "User Manual"}</span>
                    <Download className="h-3 w-3 ml-auto opacity-60" />
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="flex items-center gap-2 px-2">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t">
        <div className="flex items-center gap-3 px-2 py-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {user?.email ? getInitials(user.email) : "AD"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col truncate">
            <span className="truncate text-sm font-medium ltr">{user?.email}</span>
            <span className="text-xs text-muted-foreground">{t("admin.overview")}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="shrink-0"
            data-testid="button-sidebar-logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
