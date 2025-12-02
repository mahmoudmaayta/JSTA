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
  Building2,
  LayoutDashboard,
  FileText,
  RefreshCw,
  LogOut,
  Briefcase,
  UserCog,
  Users,
  FileWarning,
} from "lucide-react";
import logoImage from "@assets/logo-0 (1)_1764114456004.png";

export function OfficeSidebar() {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { t } = useTranslation();

  const officeMenuItems = [
    {
      title: t("navigation.dashboard"),
      url: "/office/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: t("navigation.documents"),
      url: "/office/documents",
      icon: FileText,
    },
    {
      title: t("navigation.renewals"),
      url: "/office/renewals",
      icon: RefreshCw,
    },
    {
      title: t("navigation.officeInfoForm2026"),
      url: "/office/office-info-form-2026",
      icon: Building2,
    },
    {
      title: t("navigation.staffForm2026"),
      url: "/office/staff-form-2026",
      icon: Users,
    },
    {
      title: t("navigation.commitmentForm"),
      url: "/office/commitment-form-2026",
      icon: FileWarning,
    },
    {
      title: t("navigation.profile"),
      url: "/office/profile",
      icon: UserCog,
    },
  ];

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-3 px-2 py-3">
          <img 
            src={logoImage} 
            alt="JSTA Logo" 
            className="h-10 w-auto object-contain"
            data-testid="img-office-logo"
          />
          <div className="flex flex-col">
            <span className="font-semibold text-sm">JSTA Portal</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Briefcase className="h-3 w-3" />
              {t("office.dashboard")}
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("navigation.home")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {officeMenuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url || (item.url !== "/office/dashboard" && location.startsWith(item.url))}
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
              {user?.email ? getInitials(user.email) : "OF"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col truncate">
            <span className="truncate text-sm font-medium ltr">{user?.email}</span>
            <span className="text-xs text-muted-foreground">
              {user?.office?.tradeNameAr || t("office.dashboard")}
            </span>
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
