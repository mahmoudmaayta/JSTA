import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useTranslation, useLanguage } from "@/lib/i18n";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { OfficeSidebar } from "@/components/layout/office-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { LoadingPage, LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Office, LicenseRenewal, Document } from "@shared/schema";
import { DocumentPreviewButton } from "@/components/ui/document-preview";
import {
  Building2,
  FileText,
  RefreshCw,
  Download,
  Calendar,
  Clock,
  CheckCircle2,
  Plus,
  ArrowRight,
  Files,
  AlertCircle,
  Eye,
} from "lucide-react";

interface FormCompletionStatus {
  officeInfoFormCompleted: boolean;
  staffFormCompleted: boolean;
  commitmentFormCompleted: boolean;
  allFormsCompleted: boolean;
}

export default function OfficeDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { toast } = useToast();
  const sidebarSide = language === 'ar' ? 'right' : 'left';

  const { data: office, isLoading: officeLoading } = useQuery<Office>({
    queryKey: ["/api/office/profile"],
  });

  const { data: renewals, isLoading: renewalsLoading } = useQuery<LicenseRenewal[]>({
    queryKey: ["/api/office/renewals"],
  });

  const { data: documents, isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ["/api/office/documents"],
  });

  const { data: formStatus } = useQuery<FormCompletionStatus>({
    queryKey: ["/api/office/form-completion-status"],
  });

  const canRequestRenewal = formStatus?.staffFormCompleted && formStatus?.commitmentFormCompleted;

  const getOfficeStatusLabel = (status?: string): string => {
    if (!status) return t("common.unknown");
    const statusMap: Record<string, string> = {
      "PENDING_APPROVAL": t("office.statusPendingApproval"),
      "ACTIVE": t("office.statusActive"),
      "REJECTED": t("office.statusRejected"),
    };
    return statusMap[status] || status.toLowerCase().replace("_", " ");
  };

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
        title: t("renewal.renewalRequested") || "Renewal Requested",
        description: t("renewal.renewalRequestedDesc") || "Your renewal request has been submitted.",
      });
      const year = data.year || new Date().getFullYear();
      setLocation(year >= 2026 ? `/office/renewals-2026/${data.id}` : `/office/renewals/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error") || "Error",
        description: error.message,
        variant: "destructive",
      });
    },
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
        <OfficeSidebar key={`sidebar-${language}`} side={sidebarSide} />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold">{t("navigation.dashboard")}</h1>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6">
            {isLoading ? (
              <LoadingPage message={t("common.loading")} />
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold" data-testid="text-office-name">
                      {office?.tradeNameAr || t("common.welcome")}
                    </h2>
                    <p className="text-muted-foreground">
                      {t("office.manageDescription")}
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
                        {t("office.accountStatus")}
                      </CardTitle>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold capitalize" data-testid="text-status">
                        {getOfficeStatusLabel(office?.status)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {t("office.totalDocuments")}
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
                        {t("admin.pendingRenewals")}
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
                        {t("office.approvedRenewals")}
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
                          {t("renewal.licenseRenewal")}
                        </CardTitle>
                        <CardDescription>
                          {t("renewal.requestAndManage")}
                        </CardDescription>
                      </div>
                      {canRequestRenewal && !hasActiveRenewal && (
                        <Button 
                          className="gap-2" 
                          data-testid="button-new-renewal"
                          onClick={() => createRenewalMutation.mutate()}
                          disabled={createRenewalMutation.isPending}
                        >
                          {createRenewalMutation.isPending ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                          {t("renewal.requestRenewal")}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!canRequestRenewal ? (
                      <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <AlertDescription className="text-amber-800 dark:text-amber-300">
                          <p className="font-medium mb-2">{t("renewal.formsRequiredTitle")}</p>
                          <p className="text-sm mb-3">{t("renewal.formsRequiredDesc")}</p>
                          <div className="flex flex-wrap gap-2">
                            {!formStatus?.staffFormCompleted && (
                              <Link href="/office/staff-form-2026">
                                <Button variant="outline" size="sm" className="gap-1 border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/40">
                                  {t("navigation.staffForm2026")}
                                  <ArrowRight className="h-3 w-3 rtl-flip" />
                                </Button>
                              </Link>
                            )}
                            {!formStatus?.commitmentFormCompleted && (
                              <Link href="/office/commitment-form-2026">
                                <Button variant="outline" size="sm" className="gap-1 border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/40">
                                  {t("navigation.commitmentForm")}
                                  <ArrowRight className="h-3 w-3 rtl-flip" />
                                </Button>
                              </Link>
                            )}
                          </div>
                        </AlertDescription>
                      </Alert>
                    ) : renewals && renewals.length > 0 ? (
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
                                <p className="font-medium">{t("renewal.year")} {renewal.year}</p>
                                <p className="text-sm text-muted-foreground">
                                  {t("renewal.submitted")} {new Date(renewal.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <StatusBadge status={renewal.status as any} size="sm" />
                              <Link href={`/office/renewals/${renewal.id}`}>
                                <Button variant="ghost" size="sm" className="gap-1" data-testid={`link-renewal-${renewal.id}`}>
                                  {t("common.view")}
                                  <ArrowRight className="h-3 w-3 rtl-flip" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        ))}
                        {renewals.length > 3 && (
                          <Link href="/office/renewals">
                            <Button variant="outline" className="w-full gap-2" data-testid="link-all-renewals">
                              {t("renewal.viewAllRenewals")}
                              <ArrowRight className="h-4 w-4 rtl-flip" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    ) : (
                      <EmptyState
                        icon={RefreshCw}
                        title={t("renewal.noRequests")}
                        description={t("renewal.noRequestsDesc")}
                        action={!hasActiveRenewal ? {
                          label: t("renewal.requestRenewal"),
                          onClick: () => createRenewalMutation.mutate(),
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
                            {t("office.officeInformation")}
                          </CardTitle>
                          <CardDescription>{t("office.registeredDetails")}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {office ? (
                        <dl className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">{t("office.tradeName")}</dt>
                            <dd className="font-medium text-end">{office.tradeNameAr}</dd>
                          </div>
                          {office.legalNameRegistrar && (
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">{t("office.legalName")}</dt>
                              <dd className="font-medium text-end">{office.legalNameRegistrar}</dd>
                            </div>
                          )}
                          {office.nationalEstablishmentNumber && (
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">{t("office.establishmentNo")}</dt>
                              <dd className="font-medium text-end ltr">{office.nationalEstablishmentNumber}</dd>
                            </div>
                          )}
                          {office.mainCity && (
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">{t("office.city")}</dt>
                              <dd className="font-medium text-end">{office.mainCity}</dd>
                            </div>
                          )}
                          {office.phone && (
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">{t("office.phone")}</dt>
                              <dd className="font-medium text-end ltr">{office.phone}</dd>
                            </div>
                          )}
                          {office.mainEmail && (
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">{t("auth.email")}</dt>
                              <dd className="font-medium text-end ltr">{office.mainEmail}</dd>
                            </div>
                          )}
                        </dl>
                      ) : (
                        <p className="text-muted-foreground text-sm">{t("office.noInfoAvailable")}</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            {t("office.recentDocuments")}
                          </CardTitle>
                          <CardDescription>{t("office.uploadedDocuments")}</CardDescription>
                        </div>
                        <Link href="/office/documents">
                          <Button variant="outline" size="sm" className="gap-1" data-testid="link-all-documents">
                            {t("common.viewAll")}
                            <ArrowRight className="h-3 w-3 rtl-flip" />
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
                              <div className="flex gap-1 shrink-0">
                                <DocumentPreviewButton
                                  documentId={doc.id}
                                  filename={doc.originalFilename}
                                />
                                <a
                                  href={`/api/documents/${doc.id}/download`}
                                  data-testid={`button-download-${doc.id}`}
                                >
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <EmptyState
                          icon={FileText}
                          title={t("office.noDocuments")}
                          description={t("office.noDocumentsDesc")}
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
