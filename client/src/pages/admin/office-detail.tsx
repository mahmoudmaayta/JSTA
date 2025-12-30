import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { LoadingPage, LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLanguage } from "@/lib/i18n";
import type { Office, Branch, Document, CommitmentFormRecord, Complaint } from "@shared/schema";
import { DocumentPreviewButton } from "@/components/ui/document-preview";
import {
  Building,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  MapPin,
  FileText,
  Download,
  Phone,
  Mail,
  Globe,
  Calendar,
  User,
  FolderOpen,
  AlertCircle,
  FileWarning,
  AlertTriangle,
  Users,
  UserCheck,
  Briefcase,
  Building2,
} from "lucide-react";
import { RenewalStepsTimeline } from "@/components/ui/renewal-steps-timeline";

interface CommitmentFormResponse extends CommitmentFormRecord {
  complaints: Complaint[];
}

interface StaffPerson {
  id?: number;
  fullNameAr: string | null;
  fullNameEn: string | null;
  nationalId: string | null;
  socialSecurityNo: string | null;
  nationality: string | null;
  gender: string | null;
  motherName: string | null;
  mobile: string | null;
  birthDate: string | null;
  currentPosition: string | null;
  startDate: string | null;
  branch: string | null;
  isLegacy?: boolean;
}

interface StaffFormResponse {
  officeId: number;
  ownersPartners: StaffPerson[];
  authorizedSignatories: StaffPerson[];
  dedicatedManagers: StaffPerson[];
  employees: StaffPerson[];
  branches: { id: number; name: string }[];
}

interface OfficeDetailResponse {
  office: Office;
  branches: Branch[];
  documents: Document[];
}

export default function AdminOfficeDetail() {
  const params = useParams();
  const officeId = params.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const sidebarSide = language === 'ar' ? 'right' : 'left';
  const dir = language === 'ar' ? 'rtl' : 'ltr';
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState("");

  const CATEGORY_LABELS: Record<string, string> = {
    INITIAL_FIRST_FORMS: t("adminOffice.categoryMembership"),
    INITIAL_SECOND_LEGAL: t("adminOffice.categoryLegal"),
    INITIAL_THIRD_PERSONAL: t("adminOffice.categoryPersonal"),
  };

  const ACTIVITY_LABELS: Record<string, string> = {
    tickets: t("adminOffice.activityTickets"),
    inbound: t("adminOffice.activityInbound"),
    outbound: t("adminOffice.activityOutbound"),
    hajj_umrah: t("adminOffice.activityHajjUmrah"),
    domestic: t("adminOffice.activityDomestic"),
  };

  const { data, isLoading } = useQuery<OfficeDetailResponse>({
    queryKey: ["/api/admin/offices", officeId],
  });

  const { data: commitmentForm } = useQuery<CommitmentFormResponse | null>({
    queryKey: ["/api/admin/offices", officeId, "commitment-form"],
    enabled: !!officeId,
  });

  const { data: staffFormData } = useQuery<StaffFormResponse | null>({
    queryKey: ["/api/forms/staff-2026", officeId],
    enabled: !!officeId,
  });

  const hasStaffData = staffFormData && (
    staffFormData.ownersPartners.length > 0 ||
    staffFormData.authorizedSignatories.length > 0 ||
    staffFormData.dedicatedManagers.length > 0 ||
    staffFormData.employees.length > 0
  );

  const notFilled = t("adminOffice.notFilled");

  const approveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/admin/offices/${officeId}/approve`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || t("adminOffice.approveFailed"));
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offices", officeId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: t("adminOffice.officeApproved"),
        description: t("adminOffice.officeApprovedDesc"),
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

  const rejectMutation = useMutation({
    mutationFn: async (comment: string) => {
      const response = await apiRequest("POST", `/api/admin/offices/${officeId}/reject`, { comment });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || t("adminOffice.rejectFailed"));
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offices", officeId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setRejectDialogOpen(false);
      toast({
        title: t("adminOffice.officeRejected"),
        description: t("adminOffice.officeRejectedDesc"),
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

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const groupedDocuments = data?.documents.reduce((acc, doc) => {
    const category = doc.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(doc);
    return acc;
  }, {} as Record<string, Document[]>) || {};

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex min-h-screen w-full" dir={dir}>
        <AdminSidebar key={`sidebar-${language}`} side={sidebarSide} />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <Link href="/admin/offices">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                {t("adminOffice.backToOffices")}
              </Button>
            </Link>
          </header>

          <main className="flex-1 p-4 sm:p-6">
            {isLoading ? (
              <LoadingPage message={t("adminOffice.loadingDetails")} />
            ) : data?.office ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <Building className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold" data-testid="text-office-name">
                        {data.office.tradeNameAr}
                      </h2>
                      <p className="text-muted-foreground">
                        {t("adminOffice.officeId")}: {data.office.id}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <StatusBadge status={data.office.status as any} />
                    {data.office.status === "PENDING_APPROVAL" && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => approveMutation.mutate()}
                          disabled={approveMutation.isPending}
                          className="gap-2"
                          data-testid="button-approve"
                        >
                          {approveMutation.isPending ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          {t("adminOffice.approve")}
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => setRejectDialogOpen(true)}
                          className="gap-2"
                          data-testid="button-reject"
                        >
                          <XCircle className="h-4 w-4" />
                          {t("adminOffice.reject")}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {data.office.adminComment && data.office.status === "REJECTED" && (
                  <Card className="border-destructive bg-destructive/5">
                    <CardContent className="pt-4">
                      <p className="text-sm">
                        <span className="font-medium">{t("adminOffice.rejectionReason")}:</span> {data.office.adminComment}
                      </p>
                    </CardContent>
                  </Card>
                )}

                <Tabs defaultValue="info" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                  <TabsList className="flex flex-wrap">
                    <TabsTrigger value="info" data-testid="tab-info">{t("adminOffice.tabInfo")}</TabsTrigger>
                    <TabsTrigger value="branches" data-testid="tab-branches">
                      {t("adminOffice.tabBranches")} ({data.branches.length})
                    </TabsTrigger>
                    <TabsTrigger value="documents" data-testid="tab-documents">
                      {t("adminOffice.tabDocuments")} ({data.documents.length})
                    </TabsTrigger>
                    <TabsTrigger value="staff" data-testid="tab-staff">
                      {t("adminOffice.tabStaffForm")} {hasStaffData ? "✓" : ""}
                    </TabsTrigger>
                    <TabsTrigger value="pledge" data-testid="tab-pledge">
                      {t("adminOffice.tabPledge")} {commitmentForm ? "✓" : ""}
                    </TabsTrigger>
                    <TabsTrigger value="timeline" data-testid="tab-timeline">
                      {language === 'ar' ? 'سجل التجديد' : 'Renewal Timeline'}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="info" className="mt-4">
                    <div className={`flex flex-col gap-6 lg:flex-row ${language === 'ar' ? 'lg:flex-row-reverse' : ''}`}>
                      <Card className="flex-1">
                        <CardHeader>
                          <CardTitle className="text-lg">{t("adminOffice.basicInfo")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <dl className="space-y-3 text-sm">
                            <div className="flex justify-between gap-2">
                              <dt className="text-muted-foreground">{t("adminOffice.tradeNameAr")}</dt>
                              <dd className="font-medium">{data.office.tradeNameAr || "-"}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-muted-foreground">{t("adminOffice.tradeNameEn")}</dt>
                              <dd className="font-medium">{data.office.tradeNameEn || "-"}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-muted-foreground">{t("adminOffice.legalNameAr")}</dt>
                              <dd className="font-medium">{data.office.legalNameAr || "-"}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-muted-foreground">{t("adminOffice.legalName")}</dt>
                              <dd className="font-medium">{data.office.legalNameRegistrar || "-"}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-muted-foreground">{t("adminOffice.nationalEntityNo")}</dt>
                              <dd className="font-mono">{data.office.nationalEntityNo || "-"}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-muted-foreground">{t("adminOffice.establishmentNo")}</dt>
                              <dd className="font-mono">{data.office.nationalEstablishmentNumber || "-"}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-muted-foreground">{t("adminOffice.trademark")}</dt>
                              <dd className="font-medium">{data.office.trademark || "-"}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-muted-foreground">{t("adminOffice.awqafApprovalNo")}</dt>
                              <dd className="font-mono">{data.office.awqafApprovalNo || "-"}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-muted-foreground">{t("adminOffice.ssn")}</dt>
                              <dd className="font-mono">{data.office.socialSecurityNumber || "-"}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-muted-foreground">{t("adminOffice.guaranteeExpiry")}</dt>
                              <dd>{data.office.guaranteeExpiryDate || "-"}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-muted-foreground">{t("adminOffice.registered")}</dt>
                              <dd>{new Date(data.office.createdAt).toLocaleDateString()}</dd>
                            </div>
                          </dl>

                          <div className="mt-4 pt-4 border-t">
                            <p className="text-sm font-medium mb-2">{t("adminOffice.tourismActivities")}</p>
                            <div className="flex flex-wrap gap-1">
                              {data.office.tourismActivities && (data.office.tourismActivities as string[]).length > 0 ? (
                                (data.office.tourismActivities as string[]).map((activity) => (
                                  <Badge key={activity} variant="secondary" className="text-xs">
                                    {ACTIVITY_LABELS[activity] || activity}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="flex-1">
                        <CardHeader>
                          <CardTitle className="text-lg">{t("adminOffice.contactInfo")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <dl className="space-y-3 text-sm">
                            <div className="flex justify-between gap-2">
                              <dt className="text-muted-foreground">{t("adminOffice.address")}</dt>
                              <dd className="font-medium">
                                {[data.office.mainCity, data.office.mainArea, data.office.mainStreet, data.office.mainBuildingNumber]
                                  .filter(Boolean)
                                  .join(", ") || "-"}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-muted-foreground">{t("adminOffice.phone")}</dt>
                              <dd>{data.office.phone || "-"}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-muted-foreground">{t("adminOffice.mobile")}</dt>
                              <dd>{data.office.mobile || "-"}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-muted-foreground">{t("adminOffice.fax")}</dt>
                              <dd>{data.office.fax || "-"}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-muted-foreground">{t("adminOffice.mainEmail")}</dt>
                              <dd>{data.office.mainEmail || "-"}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-muted-foreground">{t("adminOffice.extraEmail")}</dt>
                              <dd>{data.office.extraEmail || "-"}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-muted-foreground">{t("adminOffice.website")}</dt>
                              <dd>
                                {data.office.website ? (
                                  <a href={data.office.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                    {data.office.website}
                                  </a>
                                ) : "-"}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-muted-foreground">{t("adminOffice.poBox")}</dt>
                              <dd>{data.office.poBox || "-"}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-muted-foreground">{t("adminOffice.postal")}</dt>
                              <dd>{data.office.postalCode || "-"}</dd>
                            </div>
                          </dl>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="branches" className="mt-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      {data.branches.length > 0 ? (
                        data.branches.map((branch, index) => (
                          <Card key={branch.id}>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                {t("adminOffice.branch")} {index + 1}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <dl className="space-y-2 text-sm">
                                <div className="flex justify-between gap-2">
                                  <dt className="text-muted-foreground">{t("adminOffice.city")}</dt>
                                  <dd>{branch.city || "-"}</dd>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <dt className="text-muted-foreground">{t("adminOffice.area")}</dt>
                                  <dd>{branch.region || "-"}</dd>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <dt className="text-muted-foreground">{t("adminOffice.street")}</dt>
                                  <dd>{branch.street || "-"}</dd>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <dt className="text-muted-foreground">{t("adminOffice.buildingNumber")}</dt>
                                  <dd>{branch.buildingNumber || "-"}</dd>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <dt className="text-muted-foreground">{t("adminOffice.manager")}</dt>
                                  <dd>{[branch.managerFirstName, branch.managerMiddleName, branch.managerLastName].filter(Boolean).join(' ') || "-"}</dd>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <dt className="text-muted-foreground">{t("adminOffice.managerMobile")}</dt>
                                  <dd>{branch.mobile || "-"}</dd>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <dt className="text-muted-foreground">{t("adminOffice.phone")}</dt>
                                  <dd>{branch.phone || "-"}</dd>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <dt className="text-muted-foreground">{t("adminOffice.fax")}</dt>
                                  <dd>{branch.fax || "-"}</dd>
                                </div>
                              </dl>
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <Card className="md:col-span-2">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {t("adminOffice.branchFields")}
                            </CardTitle>
                            <CardDescription>{t("adminOffice.noBranchesRegistered")}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <dl className="space-y-2 text-sm">
                              <div className="flex justify-between gap-2">
                                <dt className="text-muted-foreground">{t("adminOffice.city")}</dt>
                                <dd>-</dd>
                              </div>
                              <div className="flex justify-between gap-2">
                                <dt className="text-muted-foreground">{t("adminOffice.area")}</dt>
                                <dd>-</dd>
                              </div>
                              <div className="flex justify-between gap-2">
                                <dt className="text-muted-foreground">{t("adminOffice.street")}</dt>
                                <dd>-</dd>
                              </div>
                              <div className="flex justify-between gap-2">
                                <dt className="text-muted-foreground">{t("adminOffice.buildingNumber")}</dt>
                                <dd>-</dd>
                              </div>
                              <div className="flex justify-between gap-2">
                                <dt className="text-muted-foreground">{t("adminOffice.manager")}</dt>
                                <dd>-</dd>
                              </div>
                              <div className="flex justify-between gap-2">
                                <dt className="text-muted-foreground">{t("adminOffice.managerMobile")}</dt>
                                <dd>-</dd>
                              </div>
                              <div className="flex justify-between gap-2">
                                <dt className="text-muted-foreground">{t("adminOffice.phone")}</dt>
                                <dd>-</dd>
                              </div>
                              <div className="flex justify-between gap-2">
                                <dt className="text-muted-foreground">{t("adminOffice.fax")}</dt>
                                <dd>-</dd>
                              </div>
                            </dl>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="documents" className="mt-4">
                    <div className="space-y-4">
                      {["INITIAL_FIRST_FORMS", "INITIAL_SECOND_LEGAL", "INITIAL_THIRD_PERSONAL"].map((category) => {
                        const docs = groupedDocuments[category] || [];
                        return (
                          <Card key={category}>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base flex items-center gap-2">
                                <FolderOpen className="h-4 w-4" />
                                {CATEGORY_LABELS[category] || category}
                              </CardTitle>
                              <CardDescription>
                                {docs.length > 0 
                                  ? `${docs.length} ${t("adminOffice.files")}`
                                  : t("adminOffice.noFilesUploaded")
                                }
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              {docs.length > 0 ? (
                                <div className="space-y-2">
                                  {docs.map((doc) => (
                                    <div
                                      key={doc.id}
                                      className="flex items-center justify-between rounded-lg border p-3"
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                                        <div className="min-w-0">
                                          <p className="font-medium truncate text-sm">{doc.originalFilename}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {t("adminOffice.uploaded")} {new Date(doc.uploadedAt).toLocaleDateString()}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <DocumentPreviewButton
                                          documentId={doc.id}
                                          filename={doc.originalFilename}
                                        />
                                        <a href={`/api/documents/${doc.id}/download`} data-testid={`button-download-${doc.id}`}>
                                          <Button variant="outline" size="sm" className="gap-2">
                                            <Download className="h-4 w-4" />
                                            {t("common.download")}
                                          </Button>
                                        </a>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">-</p>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </TabsContent>

                  <TabsContent value="staff" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          {t("adminOffice.tabStaffForm")}
                        </CardTitle>
                        <CardDescription>
                          {t("adminOffice.staffFormDescription")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Accordion type="multiple" defaultValue={["partners"]} className="w-full">
                          {/* Section 1: Owners/Partners */}
                          <AccordionItem value="partners" data-testid="accordion-partners">
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                  <Building2 className="h-5 w-5 text-primary" />
                                </div>
                                <div className="text-right">
                                  <span className="font-medium">{t("adminOffice.staffSectionPartners")}</span>
                                  <Badge variant="secondary" className="mr-2 text-xs">
                                    {staffFormData?.ownersPartners.length || 0}
                                  </Badge>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="pt-4 space-y-4">
                                {staffFormData && staffFormData.ownersPartners.length > 0 ? (
                                  staffFormData.ownersPartners.map((person, index) => (
                                    <div key={person.id || index} className="p-4 border rounded-lg bg-muted/20">
                                      <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">{person.fullNameAr || notFilled}</span>
                                      </div>
                                      <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffFullNameAr")}</dt><dd className="font-medium">{person.fullNameAr || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffFullNameEn")}</dt><dd>{person.fullNameEn || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffNationalId")}</dt><dd className="font-mono">{person.nationalId || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffSocialSecurityNo")}</dt><dd className="font-mono">{person.socialSecurityNo || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffNationality")}</dt><dd>{person.nationality || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffGender")}</dt><dd>{person.gender || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffMotherName")}</dt><dd>{person.motherName || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffMobile")}</dt><dd>{person.mobile || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffBirthDate")}</dt><dd>{person.birthDate || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffCurrentPosition")}</dt><dd>{person.currentPosition || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffStartDate")}</dt><dd>{person.startDate || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffBranch")}</dt><dd>{person.branch || notFilled}</dd></div>
                                      </dl>
                                    </div>
                                  ))
                                ) : (
                                  <div className="p-4 border rounded-lg bg-muted/20">
                                    <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffFullNameAr")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffFullNameEn")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffNationalId")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffSocialSecurityNo")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffNationality")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffGender")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffMotherName")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffMobile")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffBirthDate")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffCurrentPosition")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffStartDate")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffBranch")}</dt><dd>{notFilled}</dd></div>
                                    </dl>
                                  </div>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>

                          {/* Section 2: Authorized Signatories */}
                          <AccordionItem value="authorized" data-testid="accordion-authorized">
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/10">
                                  <UserCheck className="h-5 w-5 text-blue-500" />
                                </div>
                                <div className="text-right">
                                  <span className="font-medium">{t("adminOffice.staffSectionAuthorized")}</span>
                                  <Badge variant="secondary" className="mr-2 text-xs">
                                    {staffFormData?.authorizedSignatories.length || 0}
                                  </Badge>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="pt-4 space-y-4">
                                {staffFormData && staffFormData.authorizedSignatories.length > 0 ? (
                                  staffFormData.authorizedSignatories.map((person, index) => (
                                    <div key={person.id || index} className="p-4 border rounded-lg bg-muted/20">
                                      <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">{person.fullNameAr || notFilled}</span>
                                      </div>
                                      <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffFullNameAr")}</dt><dd className="font-medium">{person.fullNameAr || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffFullNameEn")}</dt><dd>{person.fullNameEn || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffNationalId")}</dt><dd className="font-mono">{person.nationalId || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffSocialSecurityNo")}</dt><dd className="font-mono">{person.socialSecurityNo || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffNationality")}</dt><dd>{person.nationality || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffGender")}</dt><dd>{person.gender || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffMotherName")}</dt><dd>{person.motherName || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffMobile")}</dt><dd>{person.mobile || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffBirthDate")}</dt><dd>{person.birthDate || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffCurrentPosition")}</dt><dd>{person.currentPosition || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffStartDate")}</dt><dd>{person.startDate || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffBranch")}</dt><dd>{person.branch || notFilled}</dd></div>
                                      </dl>
                                    </div>
                                  ))
                                ) : (
                                  <div className="p-4 border rounded-lg bg-muted/20">
                                    <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffFullNameAr")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffFullNameEn")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffNationalId")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffSocialSecurityNo")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffNationality")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffGender")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffMotherName")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffMobile")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffBirthDate")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffCurrentPosition")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffStartDate")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffBranch")}</dt><dd>{notFilled}</dd></div>
                                    </dl>
                                  </div>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>

                          {/* Section 3: Dedicated Managers */}
                          <AccordionItem value="managers" data-testid="accordion-managers">
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-500/10">
                                  <Users className="h-5 w-5 text-emerald-500" />
                                </div>
                                <div className="text-right">
                                  <span className="font-medium">{t("adminOffice.staffSectionManagers")}</span>
                                  <Badge variant="secondary" className="mr-2 text-xs">
                                    {staffFormData?.dedicatedManagers.length || 0}
                                  </Badge>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="pt-4 space-y-4">
                                {staffFormData && staffFormData.dedicatedManagers.length > 0 ? (
                                  staffFormData.dedicatedManagers.map((person, index) => (
                                    <div key={person.id || index} className="p-4 border rounded-lg bg-muted/20">
                                      <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">{person.fullNameAr || notFilled}</span>
                                      </div>
                                      <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffFullNameAr")}</dt><dd className="font-medium">{person.fullNameAr || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffFullNameEn")}</dt><dd>{person.fullNameEn || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffNationalId")}</dt><dd className="font-mono">{person.nationalId || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffSocialSecurityNo")}</dt><dd className="font-mono">{person.socialSecurityNo || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffNationality")}</dt><dd>{person.nationality || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffGender")}</dt><dd>{person.gender || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffMotherName")}</dt><dd>{person.motherName || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffMobile")}</dt><dd>{person.mobile || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffBirthDate")}</dt><dd>{person.birthDate || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffCurrentPosition")}</dt><dd>{person.currentPosition || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffStartDate")}</dt><dd>{person.startDate || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffBranch")}</dt><dd>{person.branch || notFilled}</dd></div>
                                      </dl>
                                    </div>
                                  ))
                                ) : (
                                  <div className="p-4 border rounded-lg bg-muted/20">
                                    <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffFullNameAr")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffFullNameEn")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffNationalId")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffSocialSecurityNo")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffNationality")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffGender")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffMotherName")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffMobile")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffBirthDate")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffCurrentPosition")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffStartDate")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffBranch")}</dt><dd>{notFilled}</dd></div>
                                    </dl>
                                  </div>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>

                          {/* Section 4: Employees */}
                          <AccordionItem value="employees" data-testid="accordion-employees">
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-orange-500/10">
                                  <Briefcase className="h-5 w-5 text-orange-500" />
                                </div>
                                <div className="text-right">
                                  <span className="font-medium">{t("adminOffice.staffSectionEmployees")}</span>
                                  <Badge variant="secondary" className="mr-2 text-xs">
                                    {staffFormData?.employees.length || 0}
                                  </Badge>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="pt-4 space-y-4">
                                {staffFormData && staffFormData.employees.length > 0 ? (
                                  staffFormData.employees.map((person, index) => (
                                    <div key={person.id || index} className="p-4 border rounded-lg bg-muted/20">
                                      <div className="flex items-center gap-2 mb-3 pb-2 border-b flex-wrap">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">{person.fullNameAr || notFilled}</span>
                                        {person.isLegacy && (
                                          <Badge variant="outline" className="text-xs">
                                            {language === "ar" ? "بيانات مستوردة" : "Imported"}
                                          </Badge>
                                        )}
                                      </div>
                                      <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffFullNameAr")}</dt><dd className="font-medium">{person.fullNameAr || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffFullNameEn")}</dt><dd>{person.fullNameEn || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffNationalId")}</dt><dd className="font-mono">{person.nationalId || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffSocialSecurityNo")}</dt><dd className="font-mono">{person.socialSecurityNo || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffNationality")}</dt><dd>{person.nationality || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffGender")}</dt><dd>{person.gender || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffMotherName")}</dt><dd>{person.motherName || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffMobile")}</dt><dd>{person.mobile || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffBirthDate")}</dt><dd>{person.birthDate || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffCurrentPosition")}</dt><dd>{person.currentPosition || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffStartDate")}</dt><dd>{person.startDate || notFilled}</dd></div>
                                        <div><dt className="text-muted-foreground">{t("adminOffice.staffBranch")}</dt><dd>{person.branch || notFilled}</dd></div>
                                      </dl>
                                    </div>
                                  ))
                                ) : (
                                  <div className="p-4 border rounded-lg bg-muted/20">
                                    <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffFullNameAr")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffFullNameEn")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffNationalId")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffSocialSecurityNo")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffNationality")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffGender")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffMotherName")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffMobile")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffBirthDate")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffCurrentPosition")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffStartDate")}</dt><dd>{notFilled}</dd></div>
                                      <div><dt className="text-muted-foreground">{t("adminOffice.staffBranch")}</dt><dd>{notFilled}</dd></div>
                                    </dl>
                                  </div>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="pledge" className="mt-4">
                    {commitmentForm ? (
                      <div className="space-y-4">
                        {/* Pledge Details Card */}
                        <Card>
                          <CardHeader>
                            <div className="flex items-center gap-2">
                              <FileWarning className="h-5 w-5 text-amber-500" />
                              <CardTitle className="text-lg">{t("adminOffice.pledgeDetails")}</CardTitle>
                            </div>
                            <CardDescription>
                              {t("adminOffice.pledgeSubmittedAt", { date: new Date(commitmentForm.submittedAt).toLocaleDateString() })}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Office & Contact Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">{t("adminOffice.pledgeOfficeName")}</p>
                                <p className="font-medium">{commitmentForm.officeName || "-"}</p>
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">{t("adminOffice.pledgeLicenseNo")}</p>
                                <p className="font-mono">{commitmentForm.licenseNo || "-"}</p>
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">{t("adminOffice.pledgeContactName")}</p>
                                <p className="font-medium">{commitmentForm.contactName || "-"}</p>
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">{t("adminOffice.pledgeContactEmail")}</p>
                                <p>{commitmentForm.contactEmail || "-"}</p>
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">{t("adminOffice.pledgeContactMobile")}</p>
                                <p>{commitmentForm.contactMobile || "-"}</p>
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">{t("adminOffice.pledgeHasComplaints")}</p>
                                <Badge variant={commitmentForm.hasComplaints ? "destructive" : "secondary"}>
                                  {commitmentForm.hasComplaints ? t("common.yes") : t("common.no")}
                                </Badge>
                              </div>
                            </div>

                            {/* Pledge Text */}
                            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 mt-4">
                              <div className="flex items-center gap-2 mb-3">
                                <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                <h3 className="font-semibold text-amber-800 dark:text-amber-300">
                                  {t("adminOffice.pledgeText")}
                                </h3>
                              </div>
                              <p className="text-base leading-relaxed text-amber-900 dark:text-amber-200">
                                {t("adminOffice.pledgeTextFull", { 
                                  contactName: commitmentForm.contactName, 
                                  officeName: commitmentForm.officeName 
                                })}
                              </p>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Complaints Card - if any */}
                        {commitmentForm.hasComplaints && commitmentForm.complaints && commitmentForm.complaints.length > 0 && (
                          <Card>
                            <CardHeader>
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                                <CardTitle className="text-lg">{t("adminOffice.registeredComplaints")}</CardTitle>
                              </div>
                              <CardDescription>
                                {commitmentForm.complaints.length} {t("adminOffice.complaintsRegistered")}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                {commitmentForm.complaints.map((complaint, index) => (
                                  <div key={complaint.id || index} className="p-3 border rounded-lg bg-muted/30">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-medium">
                                        {t("adminOffice.complaintNumber")}: {complaint.complaintNumber}
                                      </span>
                                      <Badge variant="outline">{complaint.authority}</Badge>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                      <div>
                                        <span className="text-muted-foreground">{t("adminOffice.complaintNotifiedAt")}:</span>{" "}
                                        {complaint.notifiedAt ? new Date(complaint.notifiedAt).toLocaleDateString() : "-"}
                                      </div>
                                      {complaint.summary && (
                                        <div className="md:col-span-2">
                                          <span className="text-muted-foreground">{t("adminOffice.complaintSummary")}:</span>{" "}
                                          {complaint.summary}
                                        </div>
                                      )}
                                      {complaint.proposedAction && (
                                        <div className="md:col-span-2">
                                          <span className="text-muted-foreground">{t("adminOffice.complaintProposedAction")}:</span>{" "}
                                          {complaint.proposedAction}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    ) : (
                      <Card>
                        <CardHeader>
                          <div className="flex items-center gap-2">
                            <FileWarning className="h-5 w-5 text-muted-foreground" />
                            <CardTitle className="text-lg">{t("adminOffice.pledgeFields")}</CardTitle>
                          </div>
                          <CardDescription>{t("adminOffice.noPledgeSubmitted")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <dl className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">{t("adminOffice.pledgeOfficeName")}</dt>
                              <dd className="text-right">-</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">{t("adminOffice.pledgeLicenseNo")}</dt>
                              <dd className="text-right">-</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">{t("adminOffice.pledgeContactName")}</dt>
                              <dd className="text-right">-</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">{t("adminOffice.pledgeContactEmail")}</dt>
                              <dd className="text-right">-</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">{t("adminOffice.pledgeContactMobile")}</dt>
                              <dd className="text-right">-</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">{t("adminOffice.pledgeHasComplaints")}</dt>
                              <dd className="text-right">-</dd>
                            </div>
                          </dl>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="timeline" className="mt-4">
                    <RenewalStepsTimeline officeId={parseInt(officeId!)} />
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold">{t("adminOffice.officeNotFound")}</h3>
                <p className="text-muted-foreground mb-4">
                  {t("adminOffice.officeNotFoundDesc")}
                </p>
                <Link href="/admin/offices">
                  <Button variant="outline">{t("adminOffice.backToOffices")}</Button>
                </Link>
              </div>
            )}
          </main>
        </SidebarInset>
      </div>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("adminOffice.rejectDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("adminOffice.rejectDialogDesc")}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={t("adminOffice.enterRejectionReason")}
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            className="min-h-[100px]"
            data-testid="textarea-reject-reason"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectMutation.mutate(rejectComment)}
              disabled={rejectMutation.isPending || !rejectComment.trim()}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? <LoadingSpinner size="sm" /> : t("adminOffice.rejectOffice")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
