import { useQuery } from "@tanstack/react-query";
import { useTranslation, useLanguage } from "@/lib/i18n";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import { 
  Building2, 
  CreditCard, 
  AlertTriangle, 
  FileWarning,
  TrendingUp,
  MapPin,
  Plane,
  Download,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2
} from "lucide-react";
import { Link } from "wouter";

const CHART_COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

interface ActivityData {
  total: number;
  activities: Array<{ name: string; nameEn: string; count: number }>;
}

interface PaymentsSummary {
  summary: {
    totalPayments: number;
    totalAmount: number;
    totalPending: number;
    totalApproved: number;
    totalRejected: number;
  };
  monthly: Array<{ month: string; pending: number; approved: number; rejected: number; total: number }>;
}

interface ExpiringLicenses {
  expired: Array<{ id: number; name: string; lastRenewal: number | null; city: string }>;
  expiring30Days: Array<{ id: number; name: string; lastRenewal: number | null; city: string }>;
  expiring60Days: Array<{ id: number; name: string; lastRenewal: number | null; city: string }>;
  expiring90Days: Array<{ id: number; name: string; lastRenewal: number | null; city: string }>;
  summary: {
    expired: number;
    expiring30: number;
    expiring60: number;
    expiring90: number;
    total: number;
  };
}

interface AnalyticsData {
  totalOffices: number;
  byCategory: Array<{ name: string; value: number }>;
  byCity: Array<{ name: string; value: number }>;
  memberships: { iata: number; uftaa: number; asta: number; wto: number };
  byRenewalYear: Array<{ year: number; count: number }>;
}

export default function AdminReports() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isRTL = language === "ar";

  const { data: activityData, isLoading: activityLoading } = useQuery<ActivityData>({
    queryKey: ["/api/admin/reports/activity-types"]
  });

  const { data: paymentsData, isLoading: paymentsLoading } = useQuery<PaymentsSummary>({
    queryKey: ["/api/admin/reports/payments-summary"]
  });

  const { data: expiringData, isLoading: expiringLoading } = useQuery<ExpiringLicenses>({
    queryKey: ["/api/admin/reports/expiring-licenses"]
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics"]
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-JO' : 'en-JO', {
      style: 'currency',
      currency: 'JOD',
      minimumFractionDigits: 0
    }).format(amount / 100);
  };

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full" dir={isRTL ? "rtl" : "ltr"}>
        <AdminSidebar side={isRTL ? "right" : "left"} />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 p-4 border-b bg-background sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="text-xl font-semibold">{t("admin.reports.title")}</h1>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6 space-y-6">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid grid-cols-4 w-full max-w-2xl">
                <TabsTrigger value="overview" data-testid="tab-overview">
                  <TrendingUp className="h-4 w-4 me-2" />
                  {t("admin.reports.overview")}
                </TabsTrigger>
                <TabsTrigger value="activities" data-testid="tab-activities">
                  <Plane className="h-4 w-4 me-2" />
                  {t("admin.reports.activities")}
                </TabsTrigger>
                <TabsTrigger value="payments" data-testid="tab-payments">
                  <CreditCard className="h-4 w-4 me-2" />
                  {t("admin.reports.payments")}
                </TabsTrigger>
                <TabsTrigger value="expiring" data-testid="tab-expiring">
                  <AlertTriangle className="h-4 w-4 me-2" />
                  {t("admin.reports.expiring")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {analyticsLoading ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map(i => (
                      <Card key={i}>
                        <CardHeader className="pb-2">
                          <Skeleton className="h-4 w-24" />
                        </CardHeader>
                        <CardContent>
                          <Skeleton className="h-8 w-16" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                          <CardTitle className="text-sm font-medium">{t("admin.reports.totalOffices")}</CardTitle>
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{analyticsData?.totalOffices.toLocaleString()}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                          <CardTitle className="text-sm font-medium">{t("admin.reports.iataMembers")}</CardTitle>
                          <Plane className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{analyticsData?.memberships.iata.toLocaleString()}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                          <CardTitle className="text-sm font-medium">{t("admin.reports.pendingPayments")}</CardTitle>
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{formatCurrency(paymentsData?.summary.totalPending || 0)}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                          <CardTitle className="text-sm font-medium">{t("admin.reports.expiringLicenses")}</CardTitle>
                          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-destructive">{expiringData?.summary.expired || 0}</div>
                          <p className="text-xs text-muted-foreground">{t("admin.reports.needRenewal")}</p>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <Card>
                        <CardHeader>
                          <CardTitle>{t("admin.reports.byCategory")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={analyticsData?.byCategory.slice(0, 6) || []}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                  outerRadius={80}
                                  fill="#8884d8"
                                  dataKey="value"
                                >
                                  {analyticsData?.byCategory.slice(0, 6).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>{t("admin.reports.byCity")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={analyticsData?.byCity.slice(0, 8) || []} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={100} />
                                <Tooltip />
                                <Bar dataKey="value" fill="#0088FE" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="activities" className="space-y-6">
                {activityLoading ? (
                  <Card>
                    <CardContent className="p-6">
                      <Skeleton className="h-[300px] w-full" />
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-5">
                      {activityData?.activities.map((activity, index) => (
                        <Card key={index}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">
                              {isRTL ? activity.name : activity.nameEn}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">{activity.count.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">
                              {((activity.count / (activityData?.total || 1)) * 100).toFixed(1)}% {t("admin.reports.ofTotal")}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle>{t("admin.reports.activityDistribution")}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[350px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={activityData?.activities.map(a => ({
                              name: isRTL ? a.name : a.nameEn,
                              count: a.count
                            })) || []}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="count" fill="#00C49F" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>

              <TabsContent value="payments" className="space-y-6">
                {paymentsLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-[300px] w-full" />
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-4">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                          <CardTitle className="text-sm font-medium">{t("admin.reports.totalPaymentsCount")}</CardTitle>
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{paymentsData?.summary.totalPayments.toLocaleString()}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                          <CardTitle className="text-sm font-medium">{t("admin.reports.approvedAmount")}</CardTitle>
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-green-600">{formatCurrency(paymentsData?.summary.totalApproved || 0)}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                          <CardTitle className="text-sm font-medium">{t("admin.reports.pendingAmount")}</CardTitle>
                          <Clock className="h-4 w-4 text-yellow-500" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-yellow-600">{formatCurrency(paymentsData?.summary.totalPending || 0)}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                          <CardTitle className="text-sm font-medium">{t("admin.reports.rejectedAmount")}</CardTitle>
                          <XCircle className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-red-600">{formatCurrency(paymentsData?.summary.totalRejected || 0)}</div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle>{t("admin.reports.monthlyPayments")}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[350px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={paymentsData?.monthly.slice().reverse() || []}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="month" />
                              <YAxis />
                              <Tooltip formatter={(value: number) => formatCurrency(value)} />
                              <Legend />
                              <Line type="monotone" dataKey="approved" stroke="#22c55e" name={t("admin.reports.approved")} />
                              <Line type="monotone" dataKey="pending" stroke="#eab308" name={t("admin.reports.pending")} />
                              <Line type="monotone" dataKey="rejected" stroke="#ef4444" name={t("admin.reports.rejected")} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>

              <TabsContent value="expiring" className="space-y-6">
                {expiringLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-[400px] w-full" />
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-4">
                      <Card className="border-red-200 dark:border-red-800">
                        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                          <CardTitle className="text-sm font-medium">{t("admin.reports.expired")}</CardTitle>
                          <XCircle className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-red-600">{expiringData?.summary.expired.toLocaleString()}</div>
                        </CardContent>
                      </Card>
                      <Card className="border-orange-200 dark:border-orange-800">
                        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                          <CardTitle className="text-sm font-medium">{t("admin.reports.expiring30")}</CardTitle>
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-orange-600">{expiringData?.summary.expiring30.toLocaleString()}</div>
                        </CardContent>
                      </Card>
                      <Card className="border-yellow-200 dark:border-yellow-800">
                        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                          <CardTitle className="text-sm font-medium">{t("admin.reports.expiring60")}</CardTitle>
                          <Clock className="h-4 w-4 text-yellow-500" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-yellow-600">{expiringData?.summary.expiring60.toLocaleString()}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                          <CardTitle className="text-sm font-medium">{t("admin.reports.expiring90")}</CardTitle>
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{expiringData?.summary.expiring90.toLocaleString()}</div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileWarning className="h-5 w-5 text-destructive" />
                          {t("admin.reports.expiredLicensesList")}
                        </CardTitle>
                        <CardDescription>
                          {t("admin.reports.expiredLicensesDesc")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {expiringData?.expired && expiringData.expired.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{t("admin.reports.officeName")}</TableHead>
                                <TableHead>{t("admin.reports.city")}</TableHead>
                                <TableHead>{t("admin.reports.lastRenewal")}</TableHead>
                                <TableHead>{t("common.actions")}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {expiringData.expired.slice(0, 20).map((office) => (
                                <TableRow key={office.id} data-testid={`row-expired-${office.id}`}>
                                  <TableCell className="font-medium">{office.name || "-"}</TableCell>
                                  <TableCell>{office.city || "-"}</TableCell>
                                  <TableCell>
                                    <Badge variant="destructive">
                                      {office.lastRenewal || t("admin.reports.never")}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Link href={`/admin/offices/${office.id}`}>
                                      <Button variant="outline" size="sm" data-testid={`button-view-office-${office.id}`}>
                                        {t("common.view")}
                                      </Button>
                                    </Link>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-muted-foreground text-center py-8">{t("admin.reports.noExpiredLicenses")}</p>
                        )}
                        {expiringData?.expired && expiringData.expired.length > 20 && (
                          <p className="text-sm text-muted-foreground mt-4 text-center">
                            {t("admin.reports.showingFirst", { count: 20, total: expiringData.expired.length })}
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-orange-500" />
                          {t("admin.reports.expiringIn30Days")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {expiringData?.expiring30Days && expiringData.expiring30Days.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{t("admin.reports.officeName")}</TableHead>
                                <TableHead>{t("admin.reports.city")}</TableHead>
                                <TableHead>{t("admin.reports.lastRenewal")}</TableHead>
                                <TableHead>{t("common.actions")}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {expiringData.expiring30Days.slice(0, 10).map((office) => (
                                <TableRow key={office.id} data-testid={`row-expiring30-${office.id}`}>
                                  <TableCell className="font-medium">{office.name || "-"}</TableCell>
                                  <TableCell>{office.city || "-"}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="border-orange-500 text-orange-600">
                                      {office.lastRenewal}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Link href={`/admin/offices/${office.id}`}>
                                      <Button variant="outline" size="sm" data-testid={`button-view-office-${office.id}`}>
                                        {t("common.view")}
                                      </Button>
                                    </Link>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-muted-foreground text-center py-8">{t("admin.reports.noExpiringLicenses")}</p>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}