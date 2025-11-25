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
import type { Office } from "@shared/schema";
import { Building, Search, Eye, FolderOpen } from "lucide-react";

export default function AdminOffices() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

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
        <AdminSidebar />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold">Offices</h1>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6">
            {isLoading ? (
              <LoadingPage message="Loading offices..." />
            ) : (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">Tourism Offices</h2>
                  <p className="text-muted-foreground">
                    Manage and review registered tourism offices
                  </p>
                </div>

                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search by name or email..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9"
                          data-testid="input-search"
                        />
                      </div>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status">
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="REJECTED">Rejected</SelectItem>
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
                              <TableHead>ID</TableHead>
                              <TableHead>Trade Name</TableHead>
                              <TableHead className="hidden md:table-cell">City</TableHead>
                              <TableHead className="hidden lg:table-cell">Registered</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
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
                                      View
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
                        title="No Offices Found"
                        description={
                          searchQuery || statusFilter !== "all"
                            ? "No offices match your search criteria."
                            : "No tourism offices have registered yet."
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
