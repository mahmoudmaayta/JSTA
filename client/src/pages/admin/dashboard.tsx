import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { LoadingPage } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { useTranslation } from "@/lib/i18n";
import type { Office, LicenseRenewal } from "@shared/schema";
import {
  Building,
  FileCheck,
  Clock,
  CheckCircle2,
  ArrowRight,
  Users,
} from "lucide-react";

interface DashboardStats {
  offices: {
    total: number;
    pending: number;
    active: number;
    rejected: number;
  };
  renewals: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: pendingOffices, isLoading: officesLoading } = useQuery<Office[]>({
    queryKey: ["/api/admin/offices", { status: "PENDING_APPROVAL" }],
  });

  const { data: pendingRenewals, isLoading: renewalsLoading } = useQuery<LicenseRenewal[]>({
    queryKey: ["/api/admin/renewals", { pending: true }],
  });

  const isLoading = statsLoading || officesLoading || renewalsLoading;

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <AdminSidebar />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold">{t("admin.dashboard")}</h1>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6">
            {isLoading ? (
              <LoadingPage message={t("common.loading")} />
            ) : (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">{t("admin.overview")}</h2>
                  <p className="text-muted-foreground">
                    {t("admin.manageOfficesDesc")}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {t("admin.totalOffices")}
                      </CardTitle>
                      <Building className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="stat-total-offices">
                        {stats?.offices.total || 0}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {t("admin.pendingApproval")}
                      </CardTitle>
                      <Clock className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-amber-600" data-testid="stat-pending-offices">
                        {stats?.offices.pending || 0}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {t("admin.activeOffices")}
                      </CardTitle>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-emerald-600" data-testid="stat-active-offices">
                        {stats?.offices.active || 0}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {t("admin.pendingRenewals")}
                      </CardTitle>
                      <FileCheck className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600" data-testid="stat-pending-renewals">
                        {stats?.renewals.pending || 0}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            {t("admin.pendingRegistrations")}
                          </CardTitle>
                          <CardDescription>
                            {t("admin.officesAwaitingApproval")}
                          </CardDescription>
                        </div>
                        <Link href="/admin/offices">
                          <Button variant="outline" size="sm" className="gap-1" data-testid="link-all-offices">
                            {t("common.viewAll")}
                            <ArrowRight className="h-3 w-3 rtl-flip" />
                          </Button>
                        </Link>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {pendingOffices && pendingOffices.length > 0 ? (
                        <div className="space-y-3">
                          {pendingOffices.slice(0, 5).map((office) => (
                            <div
                              key={office.id}
                              className="flex items-center justify-between rounded-lg border p-3"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                                  <Building className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                  <p className="font-medium">{office.tradeNameAr}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(office.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <Link href={`/admin/offices/${office.id}`}>
                                <Button variant="ghost" size="sm" className="gap-1" data-testid={`link-office-${office.id}`}>
                                  {t("common.review")}
                                  <ArrowRight className="h-3 w-3 rtl-flip" />
                                </Button>
                              </Link>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <EmptyState
                          icon={CheckCircle2}
                          title={t("admin.allCaughtUp")}
                          description={t("admin.noPendingRegistrations")}
                        />
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <FileCheck className="h-5 w-5" />
                            {t("admin.pendingRenewalRequests")}
                          </CardTitle>
                          <CardDescription>
                            {t("admin.renewalsAwaitingAction")}
                          </CardDescription>
                        </div>
                        <Link href="/admin/renewals">
                          <Button variant="outline" size="sm" className="gap-1" data-testid="link-all-renewals">
                            {t("common.viewAll")}
                            <ArrowRight className="h-3 w-3 rtl-flip" />
                          </Button>
                        </Link>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {pendingRenewals && pendingRenewals.length > 0 ? (
                        <div className="space-y-3">
                          {pendingRenewals.slice(0, 5).map((renewal: any) => (
                            <div
                              key={renewal.id}
                              className="flex items-center justify-between rounded-lg border p-3"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                                  <FileCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                  <p className="font-medium">
                                    {renewal.office?.tradeNameAr || `${t("navigation.offices")} #${renewal.officeId}`}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">
                                      {t("renewal.year")} {renewal.year}
                                    </span>
                                    <StatusBadge status={renewal.status} size="sm" showIcon={false} />
                                  </div>
                                </div>
                              </div>
                              <Link href={`/admin/renewals/${renewal.id}`}>
                                <Button variant="ghost" size="sm" className="gap-1" data-testid={`link-renewal-${renewal.id}`}>
                                  {t("common.review")}
                                  <ArrowRight className="h-3 w-3 rtl-flip" />
                                </Button>
                              </Link>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <EmptyState
                          icon={CheckCircle2}
                          title={t("admin.allCaughtUp")}
                          description={t("admin.noPendingRenewals")}
                        />
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
