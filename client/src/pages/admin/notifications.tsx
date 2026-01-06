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
  AlertTriangle, 
  Calendar, 
  CreditCard, 
  Shield,
  Bell,
  Clock,
  Building2,
  XCircle,
  AlertCircle
} from "lucide-react";
import { Link } from "wouter";

interface Alert {
  id: number;
  type: "license_expiry" | "payment_due" | "social_security_expiry" | "guarantee_expiry";
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  officeId: number;
  officeName: string;
  dueDate?: string;
  amount?: number;
}

interface AlertsData {
  licenseExpiry: Alert[];
  paymentDue: Alert[];
  socialSecurityExpiry: Alert[];
  guaranteeExpiry: Alert[];
  summary: {
    critical: number;
    warning: number;
    info: number;
    total: number;
  };
}

export default function AdminNotifications() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isRTL = language === "ar";

  const { data: alertsData, isLoading } = useQuery<AlertsData>({
    queryKey: ["/api/admin/notifications/alerts"]
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive">{t("admin.notifications.critical")}</Badge>;
      case "warning":
        return <Badge className="bg-orange-500 text-white">{t("admin.notifications.warning")}</Badge>;
      default:
        return <Badge variant="secondary">{t("admin.notifications.info")}</Badge>;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "license_expiry":
        return <Calendar className="h-4 w-4 text-orange-500" />;
      case "payment_due":
        return <CreditCard className="h-4 w-4 text-red-500" />;
      case "social_security_expiry":
        return <Shield className="h-4 w-4 text-yellow-500" />;
      case "guarantee_expiry":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  };

  const renderAlertTable = (alerts: Alert[] | undefined, emptyMessage: string) => {
    if (!alerts || alerts.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          {emptyMessage}
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("admin.notifications.severity")}</TableHead>
            <TableHead>{t("admin.notifications.office")}</TableHead>
            <TableHead>{t("admin.notifications.description")}</TableHead>
            <TableHead>{t("admin.notifications.dueDate")}</TableHead>
            <TableHead>{t("common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map((alert) => (
            <TableRow key={`${alert.type}-${alert.id}`} data-testid={`row-alert-${alert.id}`}>
              <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {getAlertIcon(alert.type)}
                  {alert.officeName}
                </div>
              </TableCell>
              <TableCell>{alert.description}</TableCell>
              <TableCell>
                {alert.dueDate ? (
                  <span className={alert.severity === "critical" ? "text-destructive font-medium" : ""}>
                    {alert.dueDate}
                  </span>
                ) : "-"}
              </TableCell>
              <TableCell>
                <Link href={`/admin/offices/${alert.officeId}`}>
                  <Button variant="outline" size="sm" data-testid={`button-view-${alert.id}`}>
                    {t("common.view")}
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full" dir={isRTL ? "rtl" : "ltr"}>
        <AdminSidebar />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex-1 flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <h1 className="text-lg font-semibold">{t("admin.notifications.title")}</h1>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6 space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-4">
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
                <Skeleton className="h-[400px] w-full" />
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <Card className="border-red-200 dark:border-red-800">
                    <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                      <CardTitle className="text-sm font-medium">{t("admin.notifications.criticalAlerts")}</CardTitle>
                      <XCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">{alertsData?.summary.critical || 0}</div>
                    </CardContent>
                  </Card>
                  <Card className="border-orange-200 dark:border-orange-800">
                    <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                      <CardTitle className="text-sm font-medium">{t("admin.notifications.warningAlerts")}</CardTitle>
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">{alertsData?.summary.warning || 0}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                      <CardTitle className="text-sm font-medium">{t("admin.notifications.infoAlerts")}</CardTitle>
                      <Bell className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{alertsData?.summary.info || 0}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                      <CardTitle className="text-sm font-medium">{t("admin.notifications.totalAlerts")}</CardTitle>
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{alertsData?.summary.total || 0}</div>
                    </CardContent>
                  </Card>
                </div>

                <Tabs defaultValue="license" className="space-y-4">
                  <TabsList className="grid grid-cols-2 lg:grid-cols-4 w-full max-w-3xl h-auto gap-1 p-1">
                    <TabsTrigger value="license" data-testid="tab-license" className="text-xs px-2 py-2 whitespace-normal">
                      <Calendar className="h-4 w-4 me-1 flex-shrink-0" />
                      <span className="truncate">{t("admin.notifications.licenseExpiry")}</span>
                    </TabsTrigger>
                    <TabsTrigger value="payment" data-testid="tab-payment" className="text-xs px-2 py-2 whitespace-normal">
                      <CreditCard className="h-4 w-4 me-1 flex-shrink-0" />
                      <span className="truncate">{t("admin.notifications.paymentDue")}</span>
                    </TabsTrigger>
                    <TabsTrigger value="security" data-testid="tab-security" className="text-xs px-2 py-2 whitespace-normal">
                      <Shield className="h-4 w-4 me-1 flex-shrink-0" />
                      <span className="truncate">{t("admin.notifications.socialSecurity")}</span>
                    </TabsTrigger>
                    <TabsTrigger value="guarantee" data-testid="tab-guarantee" className="text-xs px-2 py-2 whitespace-normal">
                      <AlertCircle className="h-4 w-4 me-1 flex-shrink-0" />
                      <span className="truncate">{t("admin.notifications.guarantee")}</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="license">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-orange-500" />
                          {t("admin.notifications.licenseExpiryAlerts")}
                        </CardTitle>
                        <CardDescription>
                          {t("admin.notifications.licenseExpiryDesc")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {renderAlertTable(alertsData?.licenseExpiry, t("admin.notifications.noLicenseAlerts"))}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="payment">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CreditCard className="h-5 w-5 text-red-500" />
                          {t("admin.notifications.paymentDueAlerts")}
                        </CardTitle>
                        <CardDescription>
                          {t("admin.notifications.paymentDueDesc")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {renderAlertTable(alertsData?.paymentDue, t("admin.notifications.noPaymentAlerts"))}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="security">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="h-5 w-5 text-yellow-500" />
                          {t("admin.notifications.socialSecurityAlerts")}
                        </CardTitle>
                        <CardDescription>
                          {t("admin.notifications.socialSecurityDesc")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {renderAlertTable(alertsData?.socialSecurityExpiry, t("admin.notifications.noSecurityAlerts"))}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="guarantee">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-red-500" />
                          {t("admin.notifications.guaranteeAlerts")}
                        </CardTitle>
                        <CardDescription>
                          {t("admin.notifications.guaranteeDesc")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {renderAlertTable(alertsData?.guaranteeExpiry, t("admin.notifications.noGuaranteeAlerts"))}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}