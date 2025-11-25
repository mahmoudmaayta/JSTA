import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { OfficeSidebar } from "@/components/layout/office-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { LoadingPage, LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { LicenseRenewal } from "@shared/schema";
import {
  RefreshCw,
  Plus,
  Calendar,
  ArrowRight,
  FileCheck,
} from "lucide-react";

export default function OfficeRenewals() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: renewals, isLoading } = useQuery<LicenseRenewal[]>({
    queryKey: ["/api/office/renewals"],
  });

  const createRenewalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/office/renewals");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create renewal");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/office/renewals"] });
      toast({
        title: "Renewal Requested",
        description: "Your license renewal request has been submitted.",
      });
      setLocation(`/office/renewals/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

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
              <h1 className="text-lg font-semibold">License Renewals</h1>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6">
            {isLoading ? (
              <LoadingPage message="Loading renewals..." />
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">License Renewals</h2>
                    <p className="text-muted-foreground">
                      Manage your license renewal requests
                    </p>
                  </div>
                  {!hasActiveRenewal && (
                    <Button
                      onClick={() => createRenewalMutation.mutate()}
                      disabled={createRenewalMutation.isPending}
                      className="gap-2"
                      data-testid="button-new-renewal"
                    >
                      {createRenewalMutation.isPending ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Request New Renewal
                    </Button>
                  )}
                </div>

                {renewals && renewals.length > 0 ? (
                  <div className="space-y-4">
                    {renewals.map((renewal) => (
                      <Card key={renewal.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                                <Calendar className="h-6 w-6 text-primary" />
                              </div>
                              <div>
                                <CardTitle className="text-lg">Year {renewal.year}</CardTitle>
                                <CardDescription>
                                  Submitted on {new Date(renewal.createdAt).toLocaleDateString()}
                                </CardDescription>
                              </div>
                            </div>
                            <StatusBadge status={renewal.status as any} />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                              {renewal.status === "SUBMITTED" && "Waiting for admin review"}
                              {renewal.status === "UNDER_REVIEW" && "Currently being reviewed"}
                              {renewal.status === "APPROVED_FOR_DOWNLOAD" && "Ready to download your renewal document"}
                              {renewal.status === "MINISTRY_DOC_UPLOADED" && "Ministry document uploaded, awaiting final approval"}
                              {renewal.status === "FINAL_APPROVED" && "Renewal has been approved"}
                              {renewal.status === "REJECTED" && "Renewal was rejected"}
                            </div>
                            <Link href={`/office/renewals/${renewal.id}`}>
                              <Button variant="outline" className="gap-2" data-testid={`link-renewal-${renewal.id}`}>
                                View Details
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12">
                      <EmptyState
                        icon={FileCheck}
                        title="No Renewal Requests"
                        description="You haven't submitted any license renewal requests yet. Click the button above to request a new renewal."
                        action={!hasActiveRenewal ? {
                          label: "Request Renewal",
                          onClick: () => createRenewalMutation.mutate(),
                        } : undefined}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
