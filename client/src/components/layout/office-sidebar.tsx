import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useTranslation, useLanguage } from "@/lib/i18n";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  Lock,
  CheckCircle2,
  CreditCard,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface FormCompletionStatus {
  officeInfoFormCompleted: boolean;
  staffFormCompleted: boolean;
  commitmentFormCompleted: boolean;
  allFormsCompleted: boolean;
}

interface Payment {
  id: number;
  status: 'PENDING' | 'UPLOADED' | 'APPROVED' | 'REJECTED';
}

interface ChangeRequest {
  id: number;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
}

export function OfficeSidebar({ side = "left" }: { side?: "left" | "right" }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { t } = useTranslation();
  const { language } = useLanguage();

  // These two gate the Renewals nav item. Payment approval happens admin-side, so
  // they have to go stale on their own rather than waiting for an invalidation the
  // office's browser will never see.
  const { data: formStatus } = useQuery<FormCompletionStatus>({
    queryKey: ["/api/office/form-completion-status"],
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: payment } = useQuery<Payment | null>({
    queryKey: ["/api/payments/current"],
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: changeRequests } = useQuery<ChangeRequest[]>({
    queryKey: ["/api/office/change-requests"],
  });

  const isPaymentApproved = payment?.status === 'APPROVED';
  const pendingChangeRequests = changeRequests?.filter(r => r.status === 'SUBMITTED')?.length || 0;

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
      title: t("navigation.officeInfoForm2026"),
      url: "/office/office-info-form-2026",
      icon: Building2,
      showStatus: true,
      completed: formStatus?.officeInfoFormCompleted,
      showChangeRequestBadge: true,
    },
    {
      title: t("navigation.staffForm2026"),
      url: "/office/staff-2026",
      icon: Users,
      showStatus: true,
      completed: formStatus?.staffFormCompleted,
    },
    {
      title: t("navigation.commitmentForm"),
      url: "/office/commitment-form-2026",
      icon: FileWarning,
      showStatus: true,
      completed: formStatus?.commitmentFormCompleted,
    },
    {
      title: t("navigation.payment"),
      url: "/office/payment",
      icon: CreditCard,
      showStatus: true,
      completed: isPaymentApproved,
    },
    {
      title: t("navigation.renewals"),
      url: "/office/renewals",
      icon: RefreshCw,
      requiresPayment: true,
      locked: !formStatus?.allFormsCompleted || !isPaymentApproved,
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

  const borderClass = side === "right" ? "border-l" : "border-r";

  return (
    <Sidebar side={side} className="bg-emerald-50/50 dark:bg-emerald-950/20">
      <SidebarHeader className="border-b border-emerald-200/50 dark:border-emerald-800/30">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 dark:bg-emerald-700">
            <Briefcase className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm">JSTA Portal</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
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
              {officeMenuItems.map((item) => {
                const isLocked = 'locked' in item && item.locked;
                const showStatus = 'showStatus' in item && item.showStatus;
                const isCompleted = 'completed' in item && item.completed;
                const showChangeRequestBadge = 'showChangeRequestBadge' in item && item.showChangeRequestBadge;
                
                if (isLocked) {
                  return (
                    <SidebarMenuItem key={item.url}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton
                            className="opacity-50 cursor-not-allowed"
                            data-testid={`nav-${item.url.split("/").pop()}-locked`}
                          >
                            <Lock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{item.title}</span>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-[220px]">
                          <p className="text-xs">
                            {t("navigation.renewalsLockedHint")}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </SidebarMenuItem>
                  );
                }
                
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url || (item.url !== "/office/dashboard" && location.startsWith(item.url))}
                    >
                      <Link href={item.url} data-testid={`nav-${item.url.split("/").pop()}`}>
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1">{item.title}</span>
                        {showStatus && isCompleted && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                    {showChangeRequestBadge && pendingChangeRequests > 0 && (
                      <SidebarMenuBadge 
                        className="bg-amber-500 text-white"
                        data-testid="badge-pending-office-change-requests"
                      >
                        {pendingChangeRequests > 99 ? "99+" : pendingChangeRequests}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
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
