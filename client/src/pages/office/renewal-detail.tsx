import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { OfficeSidebar } from "@/components/layout/office-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { LoadingPage, LoadingSpinner } from "@/components/ui/loading-spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useLanguage } from "@/lib/i18n";
import type { LicenseRenewal } from "@shared/schema";
import {
  Calendar,
  ArrowLeft,
  Download,
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Award,
} from "lucide-react";

export default function OfficeRenewalDetail() {
  const params = useParams();
  const renewalId = params.id;
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const sidebarSide = language === 'ar' ? 'right' : 'left';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  
  const statusSteps = [
    { status: "SUBMITTED", label: t("renewalDetail.steps.submitted"), icon: Clock },
    { status: "APPROVED_FOR_DOWNLOAD", label: t("renewalDetail.steps.approvedForDownload"), icon: Download },
    { status: "MINISTRY_DOC_UPLOADED", label: t("renewalDetail.steps.ministryDocUploaded"), icon: Upload },
    { status: "FINAL_APPROVED", label: t("renewalDetail.steps.finalApproved"), icon: CheckCircle2 },
  ];

  const { data: renewal, isLoading } = useQuery<LicenseRenewal>({
    queryKey: ["/api/office/renewals", renewalId],
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploading(true);
      const formData = new FormData();
      formData.append("document", file);
      
      const response = await fetch(`/api/office/renewals/${renewalId}/upload-ministry-doc`, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/office/renewals", renewalId] });
      toast({
        title: t("renewalDetail.documentUploaded"),
        description: t("renewalDetail.documentUploadedDesc"),
      });
      setUploading(false);
    },
    onError: (error: Error) => {
      toast({
        title: t("renewalDetail.uploadFailed"),
        description: error.message,
        variant: "destructive",
      });
      setUploading(false);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const getCurrentStepIndex = () => {
    if (renewal?.status === "REJECTED") return -1;
    return statusSteps.findIndex((s) => s.status === renewal?.status);
  };

  const currentStepIndex = getCurrentStepIndex();

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className={`flex min-h-screen w-full ${language === 'ar' ? 'flex-row-reverse' : ''}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <OfficeSidebar key={`sidebar-${language}`} side={sidebarSide} />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <Link href="/office/renewals">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                {t("renewalDetail.backToRenewals")}
              </Button>
            </Link>
          </header>

          <main className="flex-1 p-4 sm:p-6">
            {isLoading ? (
              <LoadingPage message={t("renewalDetail.loadingDetails")} />
            ) : renewal ? (
              <div className="space-y-6 max-w-4xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                      <Calendar className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{t("renewalDetail.licenseRenewal")} {renewal.year}</h2>
                      <p className="text-muted-foreground">
                        {t("renewals.submittedOn")} {new Date(renewal.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={renewal.status as any} />
                </div>

                {renewal.status !== "REJECTED" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("renewalDetail.progress")}</CardTitle>
                      <CardDescription>{t("renewalDetail.trackStatus")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        {statusSteps.map((step, index) => {
                          const isCompleted = index <= currentStepIndex;
                          const isCurrent = index === currentStepIndex;
                          const Icon = step.icon;

                          return (
                            <div key={step.status} className="flex flex-col items-center flex-1">
                              <div className="flex items-center w-full">
                                {index > 0 && (
                                  <div
                                    className={`h-1 flex-1 ${
                                      index <= currentStepIndex ? "bg-primary" : "bg-muted"
                                    }`}
                                  />
                                )}
                                <div
                                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${
                                    isCompleted
                                      ? "bg-primary border-primary text-primary-foreground"
                                      : isCurrent
                                      ? "border-primary text-primary bg-primary/10"
                                      : "border-muted text-muted-foreground"
                                  }`}
                                >
                                  <Icon className="h-5 w-5" />
                                </div>
                                {index < statusSteps.length - 1 && (
                                  <div
                                    className={`h-1 flex-1 ${
                                      index < currentStepIndex ? "bg-primary" : "bg-muted"
                                    }`}
                                  />
                                )}
                              </div>
                              <span
                                className={`mt-2 text-xs text-center ${
                                  isCompleted ? "font-medium" : "text-muted-foreground"
                                }`}
                              >
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {renewal.status === "REJECTED" && renewal.adminComment && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>{t("renewalDetail.renewalRejected")}</AlertTitle>
                    <AlertDescription>{renewal.adminComment}</AlertDescription>
                  </Alert>
                )}

                {renewal.status === "APPROVED_FOR_DOWNLOAD" && (
                  <Card className="border-cyan-200 bg-cyan-50/50 dark:border-cyan-800 dark:bg-cyan-900/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400">
                        <Download className="h-5 w-5" />
                        {t("renewalDetail.downloadRenewalDoc")}
                      </CardTitle>
                      <CardDescription>
                        {t("renewalDetail.downloadRenewalDocDesc")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <a href={`/api/office/renewals/${renewal.id}/download`} data-testid="button-download-pdf">
                        <Button className="gap-2">
                          <Download className="h-4 w-4" />
                          {t("renewalDetail.downloadPdf")}
                        </Button>
                      </a>

                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-2">{t("renewalDetail.uploadMinistryDoc")}</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          {t("renewalDetail.uploadMinistryDocDesc")}
                        </p>
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleFileChange}
                          data-testid="input-upload-ministry"
                        />
                        <Button
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="gap-2"
                          data-testid="button-upload-ministry"
                        >
                          {uploading ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          {t("renewalDetail.uploadMinistryButton")}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {renewal.status === "MINISTRY_DOC_UPLOADED" && (
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertTitle>{t("renewalDetail.awaitingFinalApproval")}</AlertTitle>
                    <AlertDescription>
                      {t("renewalDetail.awaitingFinalApprovalDesc")}
                    </AlertDescription>
                  </Alert>
                )}

                {renewal.status === "FINAL_APPROVED" && (
                  <>
                    <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <AlertTitle className="text-emerald-700 dark:text-emerald-400">{t("renewalDetail.renewalApproved")}</AlertTitle>
                      <AlertDescription className="text-emerald-600 dark:text-emerald-300">
                        {t("renewalDetail.renewalApprovedDesc")}
                      </AlertDescription>
                    </Alert>

                    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/20">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                          <Award className="h-5 w-5" />
                          {t("renewalDetail.downloadCertificate")}
                        </CardTitle>
                        <CardDescription>
                          {t("renewalDetail.downloadCertificateDesc")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <a href={`/api/office/renewals/${renewal.id}/certificate`} data-testid="button-download-certificate">
                          <Button className="gap-2">
                            <Download className="h-4 w-4" />
                            {t("renewalDetail.downloadCertificateButton")}
                          </Button>
                        </a>
                      </CardContent>
                    </Card>
                  </>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>{t("renewalDetail.renewalDetails")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">{t("renewalDetail.renewalId")}</dt>
                        <dd className="font-mono">{renewal.id}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">{t("renewals.year")}</dt>
                        <dd className="font-medium">{renewal.year}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">{t("common.status")}</dt>
                        <dd>
                          <StatusBadge status={renewal.status as any} size="sm" />
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">{t("renewalDetail.submitted")}</dt>
                        <dd>{new Date(renewal.createdAt).toLocaleString()}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">{t("renewalDetail.lastUpdated")}</dt>
                        <dd>{new Date(renewal.updatedAt).toLocaleString()}</dd>
                      </div>
                      {renewal.ministryDocumentPath && (
                        <div className="flex justify-between items-center">
                          <dt className="text-muted-foreground">{t("renewalDetail.ministryDocument")}</dt>
                          <dd>
                            <a href={`/api/documents/ministry/${renewal.id}/download`}>
                              <Button variant="outline" size="sm" className="gap-2">
                                <FileText className="h-3 w-3" />
                                {t("renewalDetail.viewDocument")}
                              </Button>
                            </a>
                          </dd>
                        </div>
                      )}
                    </dl>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold">{t("renewalDetail.notFound")}</h3>
                <p className="text-muted-foreground mb-4">
                  {t("renewalDetail.notFoundDesc")}
                </p>
                <Link href="/office/renewals">
                  <Button variant="outline">{t("renewalDetail.backToRenewals")}</Button>
                </Link>
              </div>
            )}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
