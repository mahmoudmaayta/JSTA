import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslation, useLanguage } from "@/lib/i18n";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, History, Building2, RefreshCw, CheckCircle, XCircle, Download, FileCheck } from "lucide-react";
import type { AuditLog } from "@shared/schema";

type AuditLogWithUser = AuditLog & { user: { email: string } };

const actionIcons: Record<string, any> = {
  OFFICE_APPROVED: CheckCircle,
  OFFICE_REJECTED: XCircle,
  RENEWAL_APPROVED_FOR_DOWNLOAD: Download,
  RENEWAL_FINAL_APPROVED: FileCheck,
  RENEWAL_REJECTED: XCircle,
};

const actionColors: Record<string, string> = {
  OFFICE_APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  OFFICE_REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  RENEWAL_APPROVED_FOR_DOWNLOAD: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  RENEWAL_FINAL_APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  RENEWAL_REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function AdminAuditLogs() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const sidebarSide = language === 'ar' ? 'right' : 'left';

  const actionLabels: Record<string, string> = {
    OFFICE_APPROVED: t("auditLogs.officeApproved"),
    OFFICE_REJECTED: t("auditLogs.officeRejected"),
    RENEWAL_APPROVED_FOR_DOWNLOAD: t("auditLogs.renewalApprovedForDownload"),
    RENEWAL_FINAL_APPROVED: t("auditLogs.renewalFinalApproved"),
    RENEWAL_REJECTED: t("auditLogs.renewalRejected"),
  };
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const { data, isLoading, refetch } = useQuery<{
    logs: AuditLogWithUser[];
    total: number;
    limit: number;
    offset: number;
  }>({
    queryKey: ["/api/admin/audit-logs", { limit, offset }],
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;
  const currentPage = Math.floor(offset / limit) + 1;

  const handlePrevPage = () => {
    if (offset > 0) {
      setOffset(offset - limit);
    }
  };

  const handleNextPage = () => {
    if (data && offset + limit < data.total) {
      setOffset(offset + limit);
    }
  };

  const renderDetails = (log: AuditLogWithUser) => {
    const details = log.details as Record<string, any> | null;
    if (!details) return null;

    const items = [];
    if (details.officeName) {
      items.push(`${t("auditLogs.office")}: ${details.officeName}`);
    }
    if (details.year) {
      items.push(`${t("auditLogs.year")}: ${details.year}`);
    }
    if (details.comment) {
      items.push(`${t("auditLogs.comment")}: ${details.comment}`);
    }
    
    return items.join(" | ");
  };

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
              <h1 className="text-lg font-semibold">{t("auditLogs.title")}</h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              data-testid="button-refresh"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t("auditLogs.refresh")}
            </Button>
          </header>

          <main className="flex-1 p-4 sm:p-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold" data-testid="text-page-title">{t("auditLogs.activityHistory")}</h2>
                <p className="text-muted-foreground">
                  {t("auditLogs.description")}
                </p>
              </div>

              <Card>
                <CardContent className="pt-6">
                  {isLoading ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("auditLogs.action")}</TableHead>
                              <TableHead>{t("auditLogs.adminUser")}</TableHead>
                              <TableHead>{t("auditLogs.target")}</TableHead>
                              <TableHead className="hidden md:table-cell">{t("auditLogs.details")}</TableHead>
                              <TableHead>{t("auditLogs.dateTime")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data?.logs.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                  {t("auditLogs.noLogs")}
                                </TableCell>
                              </TableRow>
                            ) : (
                              data?.logs.map((log) => {
                                const Icon = actionIcons[log.action] || History;
                                return (
                                  <TableRow key={log.id} data-testid={`row-audit-log-${log.id}`}>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <Icon className={`h-4 w-4 ${
                                          log.action.includes("APPROVED") ? "text-green-600" :
                                          log.action.includes("REJECTED") ? "text-red-600" : "text-blue-600"
                                        }`} />
                                        <Badge className={actionColors[log.action] || "bg-muted"}>
                                          {actionLabels[log.action] || log.action}
                                        </Badge>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                      {log.user?.email || "Unknown"}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        {log.targetType === "office" ? (
                                          <Building2 className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                          <RefreshCw className="h-4 w-4 text-muted-foreground" />
                                        )}
                                        <span className="text-sm">
                                          {log.targetType === "office" ? t("auditLogs.office") : t("auditLogs.renewal")} #{log.targetId}
                                        </span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground hidden md:table-cell">
                                      {renderDetails(log)}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                      {format(new Date(log.createdAt!), "MMM d, yyyy HH:mm")}
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                          <p className="text-sm text-muted-foreground">
                            {t("auditLogs.showing", { from: offset + 1, to: Math.min(offset + limit, data?.total || 0), total: data?.total || 0 })}
                          </p>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handlePrevPage}
                              disabled={offset === 0}
                              data-testid="button-prev-page"
                            >
                              <ChevronLeft className="h-4 w-4" />
                              {t("common.previous")}
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              {t("auditLogs.pageOf", { current: currentPage, total: totalPages })}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleNextPage}
                              disabled={!data || offset + limit >= data.total}
                              data-testid="button-next-page"
                            >
                              {t("common.next")}
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
