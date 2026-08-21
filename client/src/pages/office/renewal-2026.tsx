import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { OfficeSidebar } from "@/components/layout/office-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { LoadingPage, LoadingSpinner } from "@/components/ui/loading-spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLanguage } from "@/lib/i18n";
import type { LicenseRenewal, RenewalAttachment } from "@shared/schema";
import {
  Calendar,
  ArrowLeft,
  ArrowRight,
  Building2,
  Users,
  FileCheck,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Send,
  FolderOpen,
  Loader2,
} from "lucide-react";

type TabType = "office" | "staff" | "commitment" | "attachments" | "submit";

const PACK_CATEGORIES = [
  { key: "PACK_1_FINANCIAL_DOCS", required: true },
  { key: "PACK_2_LEGAL_DOCS", required: true },
  { key: "PACK_3_INSURANCE_DOCS", required: true },
  { key: "PACK_4_EMPLOYEE_DOCS", required: false },
  { key: "PACK_5_OTHER_DOCS", required: false },
] as const;

interface FormCompletionStatus {
  officeInfoFormCompleted: boolean;
  staffFormCompleted: boolean;
  commitmentFormCompleted: boolean;
  allFormsCompleted: boolean;
}

/**
 * The three renewal forms live on their own pages and write to their own tables
 * (office_info_forms, people/roles, commitment_forms). This page is the renewal
 * container: it tracks their completion, collects the document packs, and submits.
 */
const FORM_TABS = [
  { key: "office" as const, href: "/office/office-info-form-2026", icon: Building2 },
  { key: "staff" as const, href: "/office/staff-2026", icon: Users },
  { key: "commitment" as const, href: "/office/commitment-form-2026", icon: FileCheck },
];

export default function Renewal2026Page() {
  const params = useParams();
  const renewalId = params.id;
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>("office");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPackCategory, setSelectedPackCategory] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const isRtl = language === "ar";
  const sidebarSide = language === 'ar' ? 'right' : 'left';

  // Fetch renewal data
  const { data: renewal, isLoading } = useQuery<LicenseRenewal>({
    queryKey: ["/api/office/renewals", renewalId],
  });

  // Redirect to detail page once the renewal has been submitted
  useEffect(() => {
    if (!isLoading && renewal && renewal.status !== "DRAFT") {
      setLocation(`/office/renewals/${renewalId}`);
    }
  }, [isLoading, renewal, renewalId, setLocation]);

  // Completion of the three forms is derived from the records themselves, which is
  // what the sidebar and the submit endpoint use too.
  const { data: formStatus } = useQuery<FormCompletionStatus>({
    queryKey: ["/api/office/form-completion-status"],
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  // Fetch attachments
  const { data: attachments } = useQuery<RenewalAttachment[]>({
    queryKey: ["/api/office/renewals-2026", renewalId, "attachments"],
  });

  // Upload attachment mutation
  const uploadAttachmentMutation = useMutation({
    mutationFn: async ({ file, category }: { file: File; category: string }) => {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);

      const response = await fetch(`/api/office/renewals-2026/${renewalId}/attachments`, {
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
      queryClient.invalidateQueries({ queryKey: ["/api/office/renewals-2026", renewalId, "attachments"] });
      toast({
        title: t("renewal2026.fileUploaded"),
        description: t("renewal2026.fileUploadedDesc"),
      });
      setUploading(false);
      setSelectedPackCategory(null);
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
      setUploading(false);
    },
  });

  // Delete attachment mutation
  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attachmentId: number) => {
      const response = await apiRequest("DELETE", `/api/office/renewals-2026/${renewalId}/attachments/${attachmentId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/office/renewals-2026", renewalId, "attachments"] });
      toast({
        title: t("renewal2026.fileDeleted"),
        description: t("renewal2026.fileDeletedDesc"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Submit renewal mutation
  const submitRenewalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/office/renewals-2026/${renewalId}/submit`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/office/renewals", renewalId] });
      toast({
        title: t("renewal2026.submitted"),
        description: t("renewal2026.submittedDesc"),
      });
      setLocation("/office/renewals");
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedPackCategory) {
      uploadAttachmentMutation.mutate({ file, category: selectedPackCategory });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUploadClick = (category: string) => {
    setSelectedPackCategory(category);
    setTimeout(() => fileInputRef.current?.click(), 0);
  };


  const getAttachmentsByCategory = (category: string) => {
    return attachments?.filter((a) => a.category === category) || [];
  };

  const isFormCompleted = (key: TabType) => {
    switch (key) {
      case "office":
        return !!formStatus?.officeInfoFormCompleted;
      case "staff":
        return !!formStatus?.staffFormCompleted;
      case "commitment":
        return !!formStatus?.commitmentFormCompleted;
      default:
        return false;
    }
  };

  const canSubmit = () => {
    if (!renewal || !formStatus?.allFormsCompleted) return false;
    return (
      getAttachmentsByCategory("PACK_1_FINANCIAL_DOCS").length > 0 &&
      getAttachmentsByCategory("PACK_2_LEGAL_DOCS").length > 0 &&
      getAttachmentsByCategory("PACK_3_INSURANCE_DOCS").length > 0
    );
  };


  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  if (isLoading) {
    return (
      <SidebarProvider style={sidebarStyle as React.CSSProperties}>
        <div className={`flex min-h-screen w-full ${isRtl ? 'flex-row-reverse' : ''}`} dir={isRtl ? "rtl" : "ltr"}>
          <OfficeSidebar key={`sidebar-${language}`} side={sidebarSide} />
          <SidebarInset className="flex-1">
            <LoadingPage message={t("renewal2026.loading")} />
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  if (!renewal) {
    return (
      <SidebarProvider style={sidebarStyle as React.CSSProperties}>
        <div className={`flex min-h-screen w-full ${isRtl ? 'flex-row-reverse' : ''}`} dir={isRtl ? "rtl" : "ltr"}>
          <OfficeSidebar key={`sidebar-${language}`} side={sidebarSide} />
          <SidebarInset className="flex-1">
            <div className="flex flex-col items-center justify-center h-screen gap-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">{t("renewal2026.notFound")}</h3>
              <Link href="/office/renewals">
                <Button variant="outline">{t("renewal2026.backToRenewals")}</Button>
              </Link>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className={`flex min-h-screen w-full ${isRtl ? 'flex-row-reverse' : ''}`} dir={isRtl ? "rtl" : "ltr"}>
        <OfficeSidebar key={`sidebar-${language}`} side={sidebarSide} />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <Link href="/office/renewals">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                {t("renewal2026.backToRenewals")}
              </Button>
            </Link>
            <div className="flex-1" />
            <StatusBadge status={renewal.status as any} />
          </header>

          <main className="flex-1 p-4 sm:p-6">
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <Calendar className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{t("renewal2026.title")} {renewal.year}</h2>
                  <p className="text-muted-foreground">{t("renewal2026.subtitle")}</p>
                </div>
              </div>

              {/* Progress indicators */}              <div className="grid grid-cols-5 gap-2">
                {FORM_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const completed = isFormCompleted(tab.key);
                  return (
                    <div
                      key={tab.key}
                      className={`p-3 rounded-lg border text-center cursor-pointer transition-colors ${
                        activeTab === tab.key
                          ? "bg-primary text-primary-foreground"
                          : completed
                          ? "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300"
                          : "bg-muted/50"
                      }`}
                      onClick={() => setActiveTab(tab.key)}
                      data-testid={`tab-${tab.key}`}
                    >
                      <Icon className="h-5 w-5 mx-auto mb-1" />
                      <span className="text-xs font-medium">{t(`renewal2026.tabs.${tab.key}`)}</span>
                      {completed && activeTab !== tab.key && (
                        <CheckCircle2 className="h-3 w-3 mx-auto mt-1 text-emerald-600" />
                      )}
                    </div>
                  );
                })}
                <div
                  className={`p-3 rounded-lg border text-center cursor-pointer transition-colors ${
                    activeTab === "attachments" ? "bg-primary text-primary-foreground" : "bg-muted/50"
                  }`}
                  onClick={() => setActiveTab("attachments")}
                  data-testid="tab-attachments"
                >
                  <FolderOpen className="h-5 w-5 mx-auto mb-1" />
                  <span className="text-xs font-medium">{t("renewal2026.tabs.attachments")}</span>
                  <Badge variant="secondary" className="text-[10px] px-1 mt-1">
                    {attachments?.length || 0}
                  </Badge>
                </div>
                <div
                  className={`p-3 rounded-lg border text-center cursor-pointer transition-colors ${
                    activeTab === "submit" ? "bg-primary text-primary-foreground" : "bg-muted/50"
                  }`}
                  onClick={() => setActiveTab("submit")}
                  data-testid="tab-submit"
                >
                  <Send className="h-5 w-5 mx-auto mb-1" />
                  <span className="text-xs font-medium">{t("renewal2026.tabs.submit")}</span>
                </div>
              </div>

              {/* The three forms are filled in on their own pages */}
              {FORM_TABS.map((tab) => {
                const Icon = tab.icon;
                const completed = isFormCompleted(tab.key);
                return (
                  activeTab === tab.key && (
                    <Card key={tab.key}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Icon className="h-5 w-5" />
                          {t(`renewal2026.forms.${tab.key}.title`)}
                        </CardTitle>
                        <CardDescription>{t(`renewal2026.forms.${tab.key}.description`)}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {completed ? (
                          <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <AlertTitle className="text-emerald-700 dark:text-emerald-400">
                              {t("renewal2026.forms.completed")}
                            </AlertTitle>
                            <AlertDescription className="text-emerald-600 dark:text-emerald-300">
                              {t("renewal2026.forms.completedDesc")}
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>{t("renewal2026.forms.notCompleted")}</AlertTitle>
                            <AlertDescription>{t("renewal2026.forms.notCompletedDesc")}</AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                      <CardFooter className="flex justify-end">
                        <Link href={tab.href}>
                          <Button className="gap-2" data-testid={`button-open-${tab.key}-form`}>
                            {completed ? t("renewal2026.forms.review") : t("renewal2026.forms.open")}
                            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                          </Button>
                        </Link>
                      </CardFooter>
                    </Card>
                  )
                );
              })}

              {/* Attachments Tab */}
              {activeTab === "attachments" && (
                <div className="space-y-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                    onChange={handleFileChange}
                    data-testid="input-file-upload"
                  />

                  {PACK_CATEGORIES.map((pack) => {
                    const packAttachments = getAttachmentsByCategory(pack.key);
                    return (
                      <Card key={pack.key}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FolderOpen className="h-5 w-5" />
                              <CardTitle className="text-base">
                                {t(`renewal2026.attachments.packs.${pack.key}.title`)}
                              </CardTitle>
                              {pack.required && (
                                <Badge variant="destructive" className="text-xs">
                                  {t("renewal2026.attachments.required")}
                                </Badge>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUploadClick(pack.key)}
                              disabled={uploading && selectedPackCategory === pack.key}
                              className="gap-2"
                              data-testid={`button-upload-${pack.key}`}
                            >
                              {uploading && selectedPackCategory === pack.key ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Upload className="h-4 w-4" />
                              )}
                              {t("renewal2026.attachments.upload")}
                            </Button>
                          </div>
                          <CardDescription>
                            {t(`renewal2026.attachments.packs.${pack.key}.description`)}
                          </CardDescription>
                        </CardHeader>
                        {packAttachments.length > 0 && (
                          <CardContent>
                            <div className="space-y-2">
                              {packAttachments.map((attachment) => (
                                <div
                                  key={attachment.id}
                                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                >
                                  <div className="flex items-center gap-3">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="text-sm font-medium">{attachment.fileName}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {((attachment.fileSize || 0) / 1024).toFixed(1)} KB
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => deleteAttachmentMutation.mutate(attachment.id)}
                                    data-testid={`button-delete-attachment-${attachment.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}

                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={() => setActiveTab("commitment")} data-testid="button-back-commitment">
                      {t("renewal2026.back")}
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab("submit")} data-testid="button-next-submit">
                      {t("renewal2026.next")}
                    </Button>
                  </div>
                </div>
              )}

              {/* Submit Tab */}
              {activeTab === "submit" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Send className="h-5 w-5" />
                      {t("renewal2026.submitForm.title")}
                    </CardTitle>
                    <CardDescription>{t("renewal2026.submitForm.description")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Checklist */}
                    <div className="space-y-3">
                      <h4 className="font-medium">{t("renewal2026.submitForm.checklist")}</h4>
                      <div className="space-y-2">
                        {([
                          ["office", "renewal2026.submitForm.officeFormStatus"],
                          ["staff", "renewal2026.submitForm.staffFormStatus"],
                          ["commitment", "renewal2026.submitForm.commitmentFormStatus"],
                        ] as const).map(([key, labelKey]) => (
                          <div key={key} className="flex items-center gap-2">
                            {isFormCompleted(key) ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-amber-500" />
                            )}
                            <span className={isFormCompleted(key) ? "" : "text-muted-foreground"}>
                              {t(labelKey)}
                            </span>
                          </div>
                        ))}
                        <Separator className="my-2" />
                        {PACK_CATEGORIES.filter((pack) => pack.required).map((pack) => (
                          <div key={pack.key} className="flex items-center gap-2">
                            {getAttachmentsByCategory(pack.key).length > 0 ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-amber-500" />
                            )}
                            <span>{t(`renewal2026.attachments.packs.${pack.key}.title`)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {!canSubmit() && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>{t("renewal2026.submitForm.cannotSubmit")}</AlertTitle>
                        <AlertDescription>
                          {t("renewal2026.submitForm.cannotSubmitDesc")}
                        </AlertDescription>
                      </Alert>
                    )}

                    {canSubmit() && (
                      <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <AlertTitle className="text-emerald-700 dark:text-emerald-400">
                          {t("renewal2026.submitForm.readyToSubmit")}
                        </AlertTitle>
                        <AlertDescription className="text-emerald-600 dark:text-emerald-300">
                          {t("renewal2026.submitForm.readyToSubmitDesc")}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between gap-2">
                    <Button variant="outline" onClick={() => setActiveTab("attachments")} data-testid="button-back-attachments">
                      {t("renewal2026.back")}
                    </Button>
                    <Button
                      onClick={() => submitRenewalMutation.mutate()}
                      disabled={!canSubmit() || submitRenewalMutation.isPending}
                      className="gap-2"
                      data-testid="button-submit-renewal"
                    >
                      {submitRenewalMutation.isPending ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      {t("renewal2026.submitForm.submitButton")}
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
