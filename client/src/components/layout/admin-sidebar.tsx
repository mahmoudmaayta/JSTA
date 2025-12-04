import { Link, useLocation } from "wouter";
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
  FileWarning,
} from "lucide-react";

export function AdminSidebar({ side = "left" }: { side?: "left" | "right" }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { t } = useTranslation();

  const adminMenuItems = [
    {
      title: t("navigation.dashboard"),
      url: "/admin",
      icon: LayoutDashboard,
    },
    {
      title: t("navigation.offices"),
      url: "/admin/offices",
      icon: Building,
    },
    {
      title: t("navigation.renewals"),
      url: "/admin/renewals",
      icon: FileCheck,
    },
    {
      title: t("navigation.staffDashboard"),
      url: "/admin/staff",
      icon: Users,
    },
    {
      title: t("navigation.commitmentsDashboard"),
      url: "/admin/commitments",
      icon: FileWarning,
    },
    {
      title: t("navigation.auditLogs"),
      url: "/admin/audit-logs",
      icon: History,
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
          <SidebarGroupLabel>{t("navigation.management")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminMenuItems.map((item) => (
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
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="px-2">
              <LanguageSwitcher />
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
