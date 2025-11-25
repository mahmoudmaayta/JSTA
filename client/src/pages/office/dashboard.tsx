import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { OfficeSidebar } from "@/components/layout/office-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { LoadingPage, LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import type { Office, LicenseRenewal, Document } from "@shared/schema";
import {
  Building2,
  FileText,
  RefreshCw,
  Download,
  Upload,
  Calendar,
  Clock,
  CheckCircle2,
  Plus,
  ArrowRight,
  Files,
} from "lucide-react";

export default function OfficeDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: office, isLoading: officeLoading } = useQuery<Office>({
    queryKey: ["/api/office/profile"],
  });

  const { data: renewals, isLoading: renewalsLoading } = useQuery<LicenseRenewal[]>({
    queryKey: ["/api/office/renewals"],
  });

  const { data: documents, isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ["/api/office/documents"],
  });

  const isLoading = officeLoading || renewalsLoading || documentsLoading;

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const pendingRenewals = renewals?.filter(
    (r) => r.status !== "FINAL_APPROVED" && r.status !== "REJECTED"
  ) || [];
  
  const approvedRenewals = renewals?.filter((r) => r.status === "FINAL_APPROVED") || [];

  const currentYear = new Date().getFullYear();
  const hasActiveRenewal = renewals?.some(
    (r) => r.year === currentYear && r.status !== "REJECTED"
  );

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <OfficeSidebar />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold">Dashboard</h1>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6">
            {isLoading ? (
              <LoadingPage message="Loading dashboard..." />
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold" data-testid="text-office-name">
                      {office?.tradeNameAr || "Welcome"}
                    </h2>
                    <p className="text-muted-foreground">
                      Manage your office documents and license renewals
                    </p>
                  </div>
                  {office && (
                    <StatusBadge status={office.status as any} />
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Account Status
                      </CardTitle>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold capitalize" data-testid="text-status">
                        {office?.status?.toLowerCase().replace("_", " ") || "Unknown"}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Documents
                      </CardTitle>
                      <Files className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="text-doc-count">
                        {documents?.length || 0}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Pending Renewals
                      </CardTitle>
                      <Clock className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="text-pending-count">
                        {pendingRenewals.length}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Approved Renewals
                      </CardTitle>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="text-approved-count">
                        {approvedRenewals.length}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <RefreshCw className="h-5 w-5" />
                          License Renewal
                        </CardTitle>
                        <CardDescription>
                          Request and manage your license renewals
                        </CardDescription>
                      </div>
                      {!hasActiveRenewal && (
                        <Link href="/office/renewals/new">
                          <Button className="gap-2" data-testid="button-new-renewal">
                            <Plus className="h-4 w-4" />
                            Request Renewal
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {renewals && renewals.length > 0 ? (
                      <div className="space-y-3">
                        {renewals.slice(0, 3).map((renewal) => (
                          <div
                            key={renewal.id}
                            className="flex items-center justify-between rounded-lg border p-4"
                          >
                            <div className="flex items-center gap-4">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                <Calendar className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">Year {renewal.year}</p>
                                <p className="text-sm text-muted-foreground">
                                  Submitted {new Date(renewal.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <StatusBadge status={renewal.status as any} size="sm" />
                              <Link href={`/office/renewals/${renewal.id}`}>
                                <Button variant="ghost" size="sm" className="gap-1" data-testid={`link-renewal-${renewal.id}`}>
                                  View
                                  <ArrowRight className="h-3 w-3" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        ))}
                        {renewals.length > 3 && (
                          <Link href="/office/renewals">
                            <Button variant="outline" className="w-full gap-2" data-testid="link-all-renewals">
                              View All Renewals
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    ) : (
                      <EmptyState
                        icon={RefreshCw}
                        title="No Renewal Requests"
                        description="You haven't submitted any license renewal requests yet."
                        action={!hasActiveRenewal ? {
                          label: "Request Renewal",
                          onClick: () => setLocation("/office/renewals/new"),
                        } : undefined}
                      />
                    )}
                  </CardContent>
                </Card>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Office Information
                          </CardTitle>
                          <CardDescription>Your registered office details</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {office ? (
                        <dl className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Trade Name</dt>
                            <dd className="font-medium text-right">{office.tradeNameAr}</dd>
                          </div>
                          {office.legalNameRegistrar && (
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">Legal Name</dt>
                              <dd className="font-medium text-right">{office.legalNameRegistrar}</dd>
                            </div>
                          )}
                          {office.nationalEstablishmentNumber && (
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">Establishment No.</dt>
                              <dd className="font-medium text-right">{office.nationalEstablishmentNumber}</dd>
                            </div>
                          )}
                          {office.mainCity && (
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">City</dt>
                              <dd className="font-medium text-right">{office.mainCity}</dd>
                            </div>
                          )}
                          {office.phone && (
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">Phone</dt>
                              <dd className="font-medium text-right">{office.phone}</dd>
                            </div>
                          )}
                          {office.mainEmail && (
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">Email</dt>
                              <dd className="font-medium text-right">{office.mainEmail}</dd>
                            </div>
                          )}
                        </dl>
                      ) : (
                        <p className="text-muted-foreground text-sm">No office information available.</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Recent Documents
                          </CardTitle>
                          <CardDescription>Your uploaded documents</CardDescription>
                        </div>
                        <Link href="/office/documents">
                          <Button variant="outline" size="sm" className="gap-1" data-testid="link-all-documents">
                            View All
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {documents && documents.length > 0 ? (
                        <div className="space-y-3">
                          {documents.slice(0, 4).map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="text-sm truncate">{doc.originalFilename}</span>
                              </div>
                              <a
                                href={`/api/documents/${doc.id}/download`}
                                className="shrink-0"
                                data-testid={`button-download-${doc.id}`}
                              >
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Download className="h-4 w-4" />
                                </Button>
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <EmptyState
                          icon={FileText}
                          title="No Documents"
                          description="No documents have been uploaded yet."
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
