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
import { useLanguage } from "@/lib/i18n";
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
  const { t, language } = useLanguage();
  const sidebarSide = language === 'ar' ? 'right' : 'left';

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
        title: t("renewals.renewalRequested"),
        description: t("renewals.renewalRequestedDesc"),
      });
      const year = data.year || new Date().getFullYear();
      setLocation(year >= 2026 ? `/office/renewals-2026/${data.id}` : `/office/renewals/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
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
      <div className={`flex min-h-screen w-full ${language === 'ar' ? 'flex-row-reverse' : ''}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <OfficeSidebar key={`sidebar-${language}`} side={sidebarSide} />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold">{t("renewals.title")}</h1>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6">
            {isLoading ? (
              <LoadingPage message={t("renewals.loadingRenewals")} />
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">{t("renewals.title")}</h2>
                    <p className="text-muted-foreground">
                      {t("renewals.manageRenewals")}
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
                      {t("renewals.requestNewRenewal")}
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
                                <CardTitle className="text-lg">{t("renewals.year")} {renewal.year}</CardTitle>
                                <CardDescription>
                                  {t("renewals.submittedOn")} {new Date(renewal.createdAt).toLocaleDateString()}
                                </CardDescription>
                              </div>
                            </div>
                            <StatusBadge status={renewal.status as any} />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                              {renewal.status === "SUBMITTED" && t("renewals.statusMessages.submitted")}
                              {renewal.status === "UNDER_REVIEW" && t("renewals.statusMessages.underReview")}
                              {renewal.status === "APPROVED_FOR_DOWNLOAD" && t("renewals.statusMessages.approvedForDownload")}
                              {renewal.status === "MINISTRY_DOC_UPLOADED" && t("renewals.statusMessages.ministryDocUploaded")}
                              {renewal.status === "FINAL_APPROVED" && t("renewals.statusMessages.finalApproved")}
                              {renewal.status === "REJECTED" && t("renewals.statusMessages.rejected")}
                            </div>
                            <Link href={renewal.year >= 2026 ? `/office/renewals-2026/${renewal.id}` : `/office/renewals/${renewal.id}`}>
                              <Button variant="outline" className="gap-2" data-testid={`link-renewal-${renewal.id}`}>
                                {t("common.details")}
                                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
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
                        title={t("renewals.noRequests")}
                        description={t("renewals.noRequestsDesc")}
                        action={!hasActiveRenewal ? {
                          label: t("renewals.requestRenewal"),
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
