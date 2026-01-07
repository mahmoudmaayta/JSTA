import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { LoadingPage } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslation, useLanguage } from "@/lib/i18n";
import type { Office, LicenseRenewal, Payment, ChangeRequest } from "@shared/schema";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import {
  Building,
  FileCheck,
  Clock,
  CheckCircle2,
  ArrowRight,
  CreditCard,
  Plane,
  MapPin,
  GitPullRequest,
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

interface PaymentWithOffice extends Payment {
  office?: Office;
}

interface AnalyticsData {
  totalOffices: number;
  byCategory: { name: string; value: number }[];
  byCity: { name: string; value: number }[];
  memberships: { iata: number; uftaa: number; asta: number; wto: number };
  byRenewalYear: { year: number; count: number }[];
}


const CHART_COLORS = [
  'hsl(221, 83%, 53%)',
  'hsl(142, 71%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(280, 67%, 60%)',
  'hsl(0, 84%, 60%)',
  'hsl(195, 74%, 50%)',
  'hsl(340, 82%, 52%)',
  'hsl(25, 95%, 53%)',
  'hsl(262, 83%, 58%)',
  'hsl(173, 80%, 40%)',
];

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const sidebarSide = language === 'ar' ? 'right' : 'left';

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: pendingRenewals, isLoading: renewalsLoading } = useQuery<LicenseRenewal[]>({
    queryKey: ["/api/admin/renewals", { pending: true }],
  });

  const { data: allPayments, isLoading: paymentsLoading } = useQuery<PaymentWithOffice[]>({
    queryKey: ["/api/admin/payments"],
  });

  const pendingPayments = allPayments?.filter(p => p.status === 'UPLOADED') || [];

  const { data: analytics } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics"],
  });

  const { data: pendingChangeRequests } = useQuery<ChangeRequest[]>({
    queryKey: ["/api/admin/change-requests", { status: "SUBMITTED" }],
  });

  const pendingChangeRequestsCount = pendingChangeRequests?.length || 0;

  const isLoading = statsLoading || renewalsLoading || paymentsLoading;

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <AdminSidebar key={`sidebar-${language}`} side={sidebarSide} />
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
                {(pendingChangeRequestsCount > 0 || (stats?.offices.pending || 0) > 0 || pendingPayments.length > 0) && (
                  <div className="space-y-3">
                    {pendingChangeRequestsCount > 0 && (
                      <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
                        <GitPullRequest className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <AlertTitle className="text-amber-800 dark:text-amber-200">
                          {t("changeRequests.title")}
                        </AlertTitle>
                        <AlertDescription className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-amber-700 dark:text-amber-300">
                            {t("changeRequests.pendingReview", { count: pendingChangeRequestsCount })}
                          </span>
                          <Button variant="outline" size="sm" asChild>
                            <Link href="/admin/change-requests" data-testid="link-change-requests-alert">
                              {t("common.view")}
                              <ArrowRight className="ms-2 h-3 w-3" />
                            </Link>
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}
                    {(stats?.offices.pending || 0) > 0 && (
                      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20">
                        <Building className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <AlertTitle className="text-blue-800 dark:text-blue-200">
                          {t("admin.pendingOffices")}
                        </AlertTitle>
                        <AlertDescription className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-blue-700 dark:text-blue-300">
                            {t("admin.pendingOfficesDesc", { count: stats?.offices.pending || 0 })}
                          </span>
                          <Button variant="outline" size="sm" asChild>
                            <Link href="/admin/offices?status=PENDING_APPROVAL" data-testid="link-pending-offices-alert">
                              {t("common.view")}
                              <ArrowRight className="ms-2 h-3 w-3" />
                            </Link>
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}
                    {pendingPayments.length > 0 && (
                      <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20">
                        <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <AlertTitle className="text-emerald-800 dark:text-emerald-200">
                          {t("payments.pendingPayments")}
                        </AlertTitle>
                        <AlertDescription className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-emerald-700 dark:text-emerald-300">
                            {t("payments.pendingPaymentsDesc", { count: pendingPayments.length })}
                          </span>
                          <Button variant="outline" size="sm" asChild>
                            <Link href="/admin/payments" data-testid="link-pending-payments-alert">
                              {t("common.view")}
                              <ArrowRight className="ms-2 h-3 w-3" />
                            </Link>
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

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

                {/* Analytics Charts Section */}
                {analytics && (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          {language === 'ar' ? 'توزيع المكاتب حسب الفئة' : 'Offices by License Category'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-6">
                          <div className="h-[200px] w-[200px] flex-shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={analytics.byCategory.slice(0, 8)}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={40}
                                  outerRadius={70}
                                  paddingAngle={2}
                                  dataKey="value"
                                  nameKey="name"
                                >
                                  {analytics.byCategory.slice(0, 8).map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  formatter={(value: number) => [value, language === 'ar' ? 'مكاتب' : 'Offices']}
                                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '6px' }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex-1 space-y-2">
                            {analytics.byCategory.slice(0, 8).map((cat, i) => (
                              <div key={cat.name} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i] }} />
                                  <span>{language === 'ar' ? `فئة ${cat.name}` : `Category ${cat.name}`}</span>
                                </div>
                                <span className="font-medium">{cat.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {language === 'ar' ? 'توزيع المكاتب حسب المدينة' : 'Offices by City'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {analytics.byCity.slice(0, 6).map((city, i) => {
                            const maxValue = Math.max(...analytics.byCity.map(c => c.value));
                            const percentage = (city.value / maxValue) * 100;
                            return (
                              <div key={city.name} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                  <span>{city.name}</span>
                                  <span className="font-medium">{city.value}</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full rounded-full transition-all"
                                    style={{ 
                                      width: `${percentage}%`,
                                      backgroundColor: CHART_COLORS[i % CHART_COLORS.length]
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="lg:col-span-2">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Plane className="h-4 w-4" />
                          {language === 'ar' ? 'العضويات الدولية' : 'International Memberships'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div className="flex flex-col items-center p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                            <span className="text-2xl font-bold text-blue-600">{analytics.memberships.iata}</span>
                            <span className="text-sm text-muted-foreground">IATA</span>
                          </div>
                          <div className="flex flex-col items-center p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                            <span className="text-2xl font-bold text-green-600">{analytics.memberships.uftaa}</span>
                            <span className="text-sm text-muted-foreground">UFTAA</span>
                          </div>
                          <div className="flex flex-col items-center p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                            <span className="text-2xl font-bold text-purple-600">{analytics.memberships.asta}</span>
                            <span className="text-sm text-muted-foreground">ASTA</span>
                          </div>
                          <div className="flex flex-col items-center p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                            <span className="text-2xl font-bold text-amber-600">{analytics.memberships.wto}</span>
                            <span className="text-sm text-muted-foreground">WTO</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Pending Renewals */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                            <FileCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <CardTitle className="text-base">
                              {t("admin.pendingRenewalRequests")}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {t("admin.renewalsAwaitingAction")}
                            </CardDescription>
                          </div>
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
                        <div className="space-y-2">
                          {pendingRenewals.slice(0, 5).map((renewal: any) => (
                            <div
                              key={renewal.id}
                              className="flex items-center justify-between rounded-lg border p-3 hover-elevate"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
                                  <FileCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-sm truncate">
                                    {renewal.office?.tradeNameAr || `${t("navigation.offices")} #${renewal.officeId}`}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">
                                      {renewal.year}
                                    </span>
                                    <StatusBadge status={renewal.status} size="sm" showIcon={false} />
                                  </div>
                                </div>
                              </div>
                              <Link href={`/admin/renewals/${renewal.id}`}>
                                <Button variant="ghost" size="sm" className="gap-1 flex-shrink-0" data-testid={`link-renewal-${renewal.id}`}>
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

                  {/* Pending Payments */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                            <CreditCard className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <CardTitle className="text-base">
                              {t("admin.pendingPayments")}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {t("admin.paymentsAwaitingApproval")}
                            </CardDescription>
                          </div>
                        </div>
                        <Link href="/admin/payments">
                          <Button variant="outline" size="sm" className="gap-1" data-testid="link-all-payments">
                            {t("common.viewAll")}
                            <ArrowRight className="h-3 w-3 rtl-flip" />
                          </Button>
                        </Link>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {pendingPayments.length > 0 ? (
                        <div className="space-y-2">
                          {pendingPayments.slice(0, 5).map((payment) => (
                            <div
                              key={payment.id}
                              className="flex items-center justify-between rounded-lg border p-3 hover-elevate"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                                  <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-sm truncate">
                                    {payment.office?.tradeNameAr || `${t("adminPayments.officeIdFallback")}${payment.officeId}`}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {payment.finalAmount ?? payment.amount} {t("adminPayments.jod")}
                                  </p>
                                </div>
                              </div>
                              <Link href="/admin/payments">
                                <Button variant="ghost" size="sm" className="gap-1 flex-shrink-0" data-testid={`link-payment-${payment.id}`}>
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
                          description={t("admin.noPendingPayments")}
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
