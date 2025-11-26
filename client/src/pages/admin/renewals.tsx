import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { LoadingPage } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/lib/i18n";
import type { LicenseRenewal, Office } from "@shared/schema";
import { FileCheck, Search, Eye, FolderOpen } from "lucide-react";

interface RenewalWithOffice extends LicenseRenewal {
  office?: Office;
}

export default function AdminRenewals() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useLanguage();

  const { data: renewals, isLoading } = useQuery<RenewalWithOffice[]>({
    queryKey: ["/api/admin/renewals"],
  });

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const filteredRenewals = renewals?.filter((renewal) => {
    const matchesStatus = statusFilter === "all" || renewal.status === statusFilter;
    const matchesSearch = 
      renewal.office?.tradeNameAr?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(renewal.year).includes(searchQuery);
    return matchesStatus && matchesSearch;
  }) || [];

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <AdminSidebar />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold">{t("admin.renewals")}</h1>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6">
            {isLoading ? (
              <LoadingPage message={t("adminRenewals.loading")} />
            ) : (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">{t("adminRenewals.title")}</h2>
                  <p className="text-muted-foreground">
                    {t("admin.manageRenewals")}
                  </p>
                </div>

                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder={t("adminRenewals.searchPlaceholder")}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9"
                          data-testid="input-search"
                        />
                      </div>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-status">
                          <SelectValue placeholder={t("admin.filterByStatus")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("admin.allStatuses")}</SelectItem>
                          <SelectItem value="SUBMITTED">{t("status.submitted")}</SelectItem>
                          <SelectItem value="UNDER_REVIEW">{t("status.inReview")}</SelectItem>
                          <SelectItem value="APPROVED_FOR_DOWNLOAD">{t("status.approvedForDownload")}</SelectItem>
                          <SelectItem value="MINISTRY_DOC_UPLOADED">{t("adminRenewals.ministryDocUploaded")}</SelectItem>
                          <SelectItem value="FINAL_APPROVED">{t("status.finalApproved")}</SelectItem>
                          <SelectItem value="REJECTED">{t("status.rejected")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {filteredRenewals.length > 0 ? (
                      <div className="rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("adminRenewals.id")}</TableHead>
                              <TableHead>{t("adminRenewals.office")}</TableHead>
                              <TableHead>{t("adminRenewals.year")}</TableHead>
                              <TableHead className="hidden md:table-cell">{t("adminRenewals.submitted")}</TableHead>
                              <TableHead>{t("adminRenewals.status")}</TableHead>
                              <TableHead className="text-right">{t("adminRenewals.actions")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredRenewals.map((renewal) => (
                              <TableRow key={renewal.id}>
                                <TableCell className="font-mono text-sm">
                                  {renewal.id}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">
                                      {renewal.office?.tradeNameAr || `${t("adminRenewals.officePrefix")} #${renewal.officeId}`}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell>{renewal.year}</TableCell>
                                <TableCell className="hidden md:table-cell">
                                  {new Date(renewal.createdAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  <StatusBadge status={renewal.status as any} size="sm" />
                                </TableCell>
                                <TableCell className="text-right">
                                  <Link href={`/admin/renewals/${renewal.id}`}>
                                    <Button variant="ghost" size="sm" className="gap-1" data-testid={`button-view-${renewal.id}`}>
                                      <Eye className="h-4 w-4" />
                                      {t("common.view")}
                                    </Button>
                                  </Link>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <EmptyState
                        icon={FolderOpen}
                        title={t("adminRenewals.noRenewals")}
                        description={
                          searchQuery || statusFilter !== "all"
                            ? t("adminRenewals.noMatchingRenewals")
                            : t("adminRenewals.noSubmittedRenewals")
                        }
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
