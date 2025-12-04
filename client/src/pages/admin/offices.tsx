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
import type { Office } from "@shared/schema";
import { Building, Search, Eye, FolderOpen } from "lucide-react";

export default function AdminOffices() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { t, language } = useLanguage();
  const sidebarSide = language === 'ar' ? 'right' : 'left';

  const { data: offices, isLoading } = useQuery<Office[]>({
    queryKey: ["/api/admin/offices"],
  });

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const filteredOffices = offices?.filter((office) => {
    const matchesStatus = statusFilter === "all" || office.status === statusFilter;
    const matchesSearch = 
      office.tradeNameAr?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      office.legalNameRegistrar?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      office.mainEmail?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  }) || [];

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <AdminSidebar key={`sidebar-${language}`} side={sidebarSide} />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold">{t("admin.offices")}</h1>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6">
            {isLoading ? (
              <LoadingPage message={t("adminOffices.loading")} />
            ) : (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">{t("adminOffices.title")}</h2>
                  <p className="text-muted-foreground">
                    {t("admin.manageOffices")}
                  </p>
                </div>

                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder={t("admin.searchByName")}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9"
                          data-testid="input-search"
                        />
                      </div>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status">
                          <SelectValue placeholder={t("admin.filterByStatus")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("admin.allStatuses")}</SelectItem>
                          <SelectItem value="PENDING_APPROVAL">{t("status.pendingApproval")}</SelectItem>
                          <SelectItem value="ACTIVE">{t("status.active")}</SelectItem>
                          <SelectItem value="REJECTED">{t("status.rejected")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {filteredOffices.length > 0 ? (
                      <div className="rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("adminOffices.id")}</TableHead>
                              <TableHead>{t("adminOffices.tradeName")}</TableHead>
                              <TableHead className="hidden md:table-cell">{t("adminOffices.city")}</TableHead>
                              <TableHead className="hidden lg:table-cell">{t("adminOffices.registered")}</TableHead>
                              <TableHead>{t("adminOffices.status")}</TableHead>
                              <TableHead className="text-right">{t("adminOffices.actions")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredOffices.map((office) => (
                              <TableRow key={office.id}>
                                <TableCell className="font-mono text-sm">
                                  {office.id}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{office.tradeNameAr}</p>
                                    {office.mainEmail && (
                                      <p className="text-xs text-muted-foreground">{office.mainEmail}</p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                  {office.mainCity || "-"}
                                </TableCell>
                                <TableCell className="hidden lg:table-cell">
                                  {new Date(office.createdAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  <StatusBadge status={office.status as any} size="sm" />
                                </TableCell>
                                <TableCell className="text-right">
                                  <Link href={`/admin/offices/${office.id}`}>
                                    <Button variant="ghost" size="sm" className="gap-1" data-testid={`button-view-${office.id}`}>
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
                        title={t("adminOffices.noOffices")}
                        description={
                          searchQuery || statusFilter !== "all"
                            ? t("adminOffices.noMatchingOffices")
                            : t("adminOffices.noRegisteredOffices")
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
