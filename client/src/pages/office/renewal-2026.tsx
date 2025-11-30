import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { OfficeSidebar } from "@/components/layout/office-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { LoadingPage, LoadingSpinner } from "@/components/ui/loading-spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLanguage } from "@/lib/i18n";
import type { LicenseRenewal, Person, RoleInOffice, RenewalAttachment } from "@shared/schema";
import {
  Calendar,
  ArrowLeft,
  Building2,
  Users,
  FileCheck,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Plus,
  Send,
  X,
  Save,
  FolderOpen,
  Loader2,
} from "lucide-react";

interface StaffMember {
  id?: number;
  fullNameAr: string;
  fullNameEn: string;
  nationalId: string;
  socialSecurityNo: string;
  nationality: string;
  gender: string;
  motherName: string;
  mobile: string;
  birthDate: string;
  currentPosition: string;
  startDate: string;
  branch: string;
  roleType: string;
}

interface OfficeFormData {
  officeNameAr: string;
  officeNameEn: string;
  licenseNumber: string;
  commercialRegNumber: string;
  dateEstablished: string;
  mainAddress: string;
  phone: string;
  email: string;
  website: string;
  branchCount: number;
}

type TabType = "office" | "staff" | "commitment" | "attachments" | "submit";

const PACK_CATEGORIES = [
  { key: "PACK_1_FINANCIAL_DOCS", required: true },
  { key: "PACK_2_LEGAL_DOCS", required: true },
  { key: "PACK_3_INSURANCE_DOCS", required: true },
  { key: "PACK_4_EMPLOYEE_DOCS", required: false },
  { key: "PACK_5_OTHER_DOCS", required: false },
] as const;

const CONSENT_TYPES = [
  "DATA_ACCURACY",
  "TERMS_ACCEPTANCE",
  "ANTI_FRAUD",
  "MINISTRY_AUTHORIZATION",
] as const;

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

  // Form state for Office Info
  const [officeForm, setOfficeForm] = useState<OfficeFormData>({
    officeNameAr: "",
    officeNameEn: "",
    licenseNumber: "",
    commercialRegNumber: "",
    dateEstablished: "",
    mainAddress: "",
    phone: "",
    email: "",
    website: "",
    branchCount: 0,
  });

  // Form state for Staff
  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  // Form state for Commitment
  const [consents, setConsents] = useState<string[]>([]);
  const [complaintNumbers, setComplaintNumbers] = useState("");
  const [notes, setNotes] = useState("");

  const isRtl = language === "ar";

  // Fetch renewal data
  const { data: renewal, isLoading } = useQuery<LicenseRenewal>({
    queryKey: ["/api/office/renewals", renewalId],
  });

  // Fetch staff (people + roles)
  const { data: staffData } = useQuery<{ people: Person[]; roles: RoleInOffice[] }>({
    queryKey: ["/api/office/renewals-2026", renewalId, "staff"],
    enabled: !!renewalId,
  });

  // Fetch attachments
  const { data: attachments } = useQuery<RenewalAttachment[]>({
    queryKey: ["/api/office/renewals-2026", renewalId, "attachments"],
  });

  // Save office form mutation
  const saveOfficeMutation = useMutation({
    mutationFn: async (data: OfficeFormData) => {
      const response = await apiRequest("POST", `/api/office/renewals-2026/${renewalId}/form-office`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save office form");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/office/renewals", renewalId] });
      toast({
        title: t("renewal2026.formSaved"),
        description: t("renewal2026.officeFormSaved"),
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

  // Save staff form mutation
  const saveStaffMutation = useMutation({
    mutationFn: async (staffList: StaffMember[]) => {
      const response = await apiRequest("POST", `/api/office/renewals-2026/${renewalId}/form-staff`, { staffList });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save staff form");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/office/renewals", renewalId] });
      queryClient.invalidateQueries({ queryKey: ["/api/office/renewals-2026", renewalId, "staff"] });
      toast({
        title: t("renewal2026.formSaved"),
        description: t("renewal2026.staffFormSaved"),
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

  // Save commitment form mutation
  const saveCommitmentMutation = useMutation({
    mutationFn: async (data: { consents: string[]; complaintNumbers: string; notes: string }) => {
      const response = await apiRequest("POST", `/api/office/renewals-2026/${renewalId}/form-commitment`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save commitment form");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/office/renewals", renewalId] });
      toast({
        title: t("renewal2026.formSaved"),
        description: t("renewal2026.commitmentFormSaved"),
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
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Delete failed");
      }
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
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Submission failed");
      }
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

  const addStaffMember = () => {
    setStaffList([
      ...staffList,
      {
        fullNameAr: "",
        fullNameEn: "",
        nationalId: "",
        socialSecurityNo: "",
        nationality: "JO",
        gender: "male",
        motherName: "",
        mobile: "",
        birthDate: "",
        currentPosition: "",
        startDate: "",
        branch: "",
        roleType: "EMPLOYEE",
      },
    ]);
  };

  const updateStaffMember = (index: number, field: keyof StaffMember, value: string) => {
    const updated = [...staffList];
    (updated[index] as any)[field] = value;
    setStaffList(updated);
  };

  const removeStaffMember = (index: number) => {
    setStaffList(staffList.filter((_, i) => i !== index));
  };

  const toggleConsent = (consentType: string) => {
    if (consents.includes(consentType)) {
      setConsents(consents.filter((c) => c !== consentType));
    } else {
      setConsents([...consents, consentType]);
    }
  };

  const getAttachmentsByCategory = (category: string) => {
    return attachments?.filter((a) => a.category === category) || [];
  };

  const canSubmit = () => {
    if (!renewal) return false;
    const hasAllForms =
      renewal.officeFormCompleted && renewal.staffFormCompleted && renewal.commitmentFormCompleted;
    const hasRequiredPacks =
      getAttachmentsByCategory("PACK_1_FINANCIAL_DOCS").length > 0 &&
      getAttachmentsByCategory("PACK_2_LEGAL_DOCS").length > 0 &&
      getAttachmentsByCategory("PACK_3_INSURANCE_DOCS").length > 0;
    return hasAllForms && hasRequiredPacks;
  };

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  if (isLoading) {
    return (
      <SidebarProvider style={sidebarStyle as React.CSSProperties}>
        <div className="flex min-h-screen w-full">
          <OfficeSidebar />
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
        <div className="flex min-h-screen w-full">
          <OfficeSidebar />
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
      <div className="flex min-h-screen w-full" dir={isRtl ? "rtl" : "ltr"}>
        <OfficeSidebar />
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

              {/* Progress indicators */}
              <div className="grid grid-cols-5 gap-2">
                <div
                  className={`p-3 rounded-lg border text-center cursor-pointer transition-colors ${
                    activeTab === "office"
                      ? "bg-primary text-primary-foreground"
                      : renewal.officeFormCompleted
                      ? "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300"
                      : "bg-muted/50"
                  }`}
                  onClick={() => setActiveTab("office")}
                  data-testid="tab-office"
                >
                  <Building2 className="h-5 w-5 mx-auto mb-1" />
                  <span className="text-xs font-medium">{t("renewal2026.tabs.office")}</span>
                  {renewal.officeFormCompleted && activeTab !== "office" && (
                    <CheckCircle2 className="h-3 w-3 mx-auto mt-1 text-emerald-600" />
                  )}
                </div>
                <div
                  className={`p-3 rounded-lg border text-center cursor-pointer transition-colors ${
                    activeTab === "staff"
                      ? "bg-primary text-primary-foreground"
                      : renewal.staffFormCompleted
                      ? "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300"
                      : "bg-muted/50"
                  }`}
                  onClick={() => setActiveTab("staff")}
                  data-testid="tab-staff"
                >
                  <Users className="h-5 w-5 mx-auto mb-1" />
                  <span className="text-xs font-medium">{t("renewal2026.tabs.staff")}</span>
                  {renewal.staffFormCompleted && activeTab !== "staff" && (
                    <CheckCircle2 className="h-3 w-3 mx-auto mt-1 text-emerald-600" />
                  )}
                </div>
                <div
                  className={`p-3 rounded-lg border text-center cursor-pointer transition-colors ${
                    activeTab === "commitment"
                      ? "bg-primary text-primary-foreground"
                      : renewal.commitmentFormCompleted
                      ? "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300"
                      : "bg-muted/50"
                  }`}
                  onClick={() => setActiveTab("commitment")}
                  data-testid="tab-commitment"
                >
                  <FileCheck className="h-5 w-5 mx-auto mb-1" />
                  <span className="text-xs font-medium">{t("renewal2026.tabs.commitment")}</span>
                  {renewal.commitmentFormCompleted && activeTab !== "commitment" && (
                    <CheckCircle2 className="h-3 w-3 mx-auto mt-1 text-emerald-600" />
                  )}
                </div>
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

              {/* Form 1: Office Information */}
              {activeTab === "office" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      {t("renewal2026.officeForm.title")}
                    </CardTitle>
                    <CardDescription>{t("renewal2026.officeForm.description")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="officeNameAr">{t("renewal2026.officeForm.officeNameAr")}</Label>
                        <Input
                          id="officeNameAr"
                          value={officeForm.officeNameAr}
                          onChange={(e) => setOfficeForm({ ...officeForm, officeNameAr: e.target.value })}
                          className="text-right"
                          dir="rtl"
                          data-testid="input-office-name-ar"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="officeNameEn">{t("renewal2026.officeForm.officeNameEn")}</Label>
                        <Input
                          id="officeNameEn"
                          value={officeForm.officeNameEn}
                          onChange={(e) => setOfficeForm({ ...officeForm, officeNameEn: e.target.value })}
                          data-testid="input-office-name-en"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="licenseNumber">{t("renewal2026.officeForm.licenseNumber")}</Label>
                        <Input
                          id="licenseNumber"
                          value={officeForm.licenseNumber}
                          onChange={(e) => setOfficeForm({ ...officeForm, licenseNumber: e.target.value })}
                          data-testid="input-license-number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="commercialRegNumber">{t("renewal2026.officeForm.commercialRegNumber")}</Label>
                        <Input
                          id="commercialRegNumber"
                          value={officeForm.commercialRegNumber}
                          onChange={(e) => setOfficeForm({ ...officeForm, commercialRegNumber: e.target.value })}
                          data-testid="input-commercial-reg"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dateEstablished">{t("renewal2026.officeForm.dateEstablished")}</Label>
                        <Input
                          id="dateEstablished"
                          type="date"
                          value={officeForm.dateEstablished}
                          onChange={(e) => setOfficeForm({ ...officeForm, dateEstablished: e.target.value })}
                          data-testid="input-date-established"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="branchCount">{t("renewal2026.officeForm.branchCount")}</Label>
                        <Input
                          id="branchCount"
                          type="number"
                          min="0"
                          value={officeForm.branchCount}
                          onChange={(e) => setOfficeForm({ ...officeForm, branchCount: parseInt(e.target.value) || 0 })}
                          data-testid="input-branch-count"
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="mainAddress">{t("renewal2026.officeForm.mainAddress")}</Label>
                        <Textarea
                          id="mainAddress"
                          value={officeForm.mainAddress}
                          onChange={(e) => setOfficeForm({ ...officeForm, mainAddress: e.target.value })}
                          rows={2}
                          data-testid="input-main-address"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">{t("renewal2026.officeForm.phone")}</Label>
                        <Input
                          id="phone"
                          value={officeForm.phone}
                          onChange={(e) => setOfficeForm({ ...officeForm, phone: e.target.value })}
                          data-testid="input-phone"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">{t("renewal2026.officeForm.email")}</Label>
                        <Input
                          id="email"
                          type="email"
                          value={officeForm.email}
                          onChange={(e) => setOfficeForm({ ...officeForm, email: e.target.value })}
                          data-testid="input-email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="website">{t("renewal2026.officeForm.website")}</Label>
                        <Input
                          id="website"
                          value={officeForm.website}
                          onChange={(e) => setOfficeForm({ ...officeForm, website: e.target.value })}
                          data-testid="input-website"
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2">
                    <Button
                      onClick={() => saveOfficeMutation.mutate(officeForm)}
                      disabled={saveOfficeMutation.isPending}
                      className="gap-2"
                      data-testid="button-save-office"
                    >
                      {saveOfficeMutation.isPending ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {t("renewal2026.saveForm")}
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab("staff")} data-testid="button-next-staff">
                      {t("renewal2026.next")}
                    </Button>
                  </CardFooter>
                </Card>
              )}

              {/* Form 2: Staff Information */}
              {activeTab === "staff" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {t("renewal2026.staffForm.title")}
                    </CardTitle>
                    <CardDescription>{t("renewal2026.staffForm.description")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {staffList.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed rounded-lg">
                        <Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground mb-4">{t("renewal2026.staffForm.noStaff")}</p>
                        <Button onClick={addStaffMember} className="gap-2" data-testid="button-add-staff">
                          <Plus className="h-4 w-4" />
                          {t("renewal2026.staffForm.addStaff")}
                        </Button>
                      </div>
                    ) : (
                      <>
                        {staffList.map((staff, index) => (
                          <div key={index} className="border rounded-lg p-4 space-y-4 relative">
                            <div className="absolute top-2 right-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeStaffMember(index)}
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                data-testid={`button-remove-staff-${index}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="font-medium text-sm text-muted-foreground">
                              {t("renewal2026.staffForm.staffMember")} #{index + 1}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label>{t("renewal2026.staffForm.fullNameAr")}</Label>
                                <Input
                                  value={staff.fullNameAr}
                                  onChange={(e) => updateStaffMember(index, "fullNameAr", e.target.value)}
                                  className="text-right"
                                  dir="rtl"
                                  data-testid={`input-staff-name-ar-${index}`}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{t("renewal2026.staffForm.fullNameEn")}</Label>
                                <Input
                                  value={staff.fullNameEn}
                                  onChange={(e) => updateStaffMember(index, "fullNameEn", e.target.value)}
                                  data-testid={`input-staff-name-en-${index}`}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{t("renewal2026.staffForm.nationalId")}</Label>
                                <Input
                                  value={staff.nationalId}
                                  onChange={(e) => updateStaffMember(index, "nationalId", e.target.value)}
                                  data-testid={`input-staff-national-id-${index}`}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{t("renewal2026.staffForm.socialSecurityNo")}</Label>
                                <Input
                                  value={staff.socialSecurityNo}
                                  onChange={(e) => updateStaffMember(index, "socialSecurityNo", e.target.value)}
                                  data-testid={`input-staff-social-security-${index}`}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{t("renewal2026.staffForm.nationality")}</Label>
                                <Select
                                  value={staff.nationality}
                                  onValueChange={(value) => updateStaffMember(index, "nationality", value)}
                                >
                                  <SelectTrigger data-testid={`select-staff-nationality-${index}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="JO">{t("renewal2026.staffForm.nationalities.jo")}</SelectItem>
                                    <SelectItem value="SY">{t("renewal2026.staffForm.nationalities.sy")}</SelectItem>
                                    <SelectItem value="EG">{t("renewal2026.staffForm.nationalities.eg")}</SelectItem>
                                    <SelectItem value="OTHER">{t("renewal2026.staffForm.nationalities.other")}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>{t("renewal2026.staffForm.gender")}</Label>
                                <Select
                                  value={staff.gender}
                                  onValueChange={(value) => updateStaffMember(index, "gender", value)}
                                >
                                  <SelectTrigger data-testid={`select-staff-gender-${index}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="male">{t("renewal2026.staffForm.genders.male")}</SelectItem>
                                    <SelectItem value="female">{t("renewal2026.staffForm.genders.female")}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>{t("renewal2026.staffForm.motherName")}</Label>
                                <Input
                                  value={staff.motherName}
                                  onChange={(e) => updateStaffMember(index, "motherName", e.target.value)}
                                  data-testid={`input-staff-mother-name-${index}`}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{t("renewal2026.staffForm.mobile")}</Label>
                                <Input
                                  value={staff.mobile}
                                  onChange={(e) => updateStaffMember(index, "mobile", e.target.value)}
                                  data-testid={`input-staff-mobile-${index}`}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{t("renewal2026.staffForm.birthDate")}</Label>
                                <Input
                                  type="date"
                                  value={staff.birthDate}
                                  onChange={(e) => updateStaffMember(index, "birthDate", e.target.value)}
                                  data-testid={`input-staff-birth-date-${index}`}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{t("renewal2026.staffForm.currentPosition")}</Label>
                                <Input
                                  value={staff.currentPosition}
                                  onChange={(e) => updateStaffMember(index, "currentPosition", e.target.value)}
                                  data-testid={`input-staff-position-${index}`}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{t("renewal2026.staffForm.startDate")}</Label>
                                <Input
                                  type="date"
                                  value={staff.startDate}
                                  onChange={(e) => updateStaffMember(index, "startDate", e.target.value)}
                                  data-testid={`input-staff-start-date-${index}`}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{t("renewal2026.staffForm.branch")}</Label>
                                <Input
                                  value={staff.branch}
                                  onChange={(e) => updateStaffMember(index, "branch", e.target.value)}
                                  data-testid={`input-staff-branch-${index}`}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{t("renewal2026.staffForm.roleType")}</Label>
                                <Select
                                  value={staff.roleType}
                                  onValueChange={(value) => updateStaffMember(index, "roleType", value)}
                                >
                                  <SelectTrigger data-testid={`select-staff-role-${index}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="OWNER">{t("renewal2026.staffForm.roles.owner")}</SelectItem>
                                    <SelectItem value="MANAGER">{t("renewal2026.staffForm.roles.manager")}</SelectItem>
                                    <SelectItem value="EMPLOYEE">{t("renewal2026.staffForm.roles.employee")}</SelectItem>
                                    <SelectItem value="ACCOUNTANT">{t("renewal2026.staffForm.roles.accountant")}</SelectItem>
                                    <SelectItem value="GUIDE">{t("renewal2026.staffForm.roles.guide")}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        ))}
                        <Button onClick={addStaffMember} variant="outline" className="gap-2 w-full" data-testid="button-add-more-staff">
                          <Plus className="h-4 w-4" />
                          {t("renewal2026.staffForm.addMore")}
                        </Button>
                      </>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between gap-2">
                    <Button variant="outline" onClick={() => setActiveTab("office")} data-testid="button-back-office">
                      {t("renewal2026.back")}
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => saveStaffMutation.mutate(staffList)}
                        disabled={saveStaffMutation.isPending || staffList.length === 0}
                        className="gap-2"
                        data-testid="button-save-staff"
                      >
                        {saveStaffMutation.isPending ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        {t("renewal2026.saveForm")}
                      </Button>
                      <Button variant="outline" onClick={() => setActiveTab("commitment")} data-testid="button-next-commitment">
                        {t("renewal2026.next")}
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              )}

              {/* Form 3: Commitment */}
              {activeTab === "commitment" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileCheck className="h-5 w-5" />
                      {t("renewal2026.commitmentForm.title")}
                    </CardTitle>
                    <CardDescription>{t("renewal2026.commitmentForm.description")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      {CONSENT_TYPES.map((consentType) => (
                        <div
                          key={consentType}
                          className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox
                            id={consentType}
                            checked={consents.includes(consentType)}
                            onCheckedChange={() => toggleConsent(consentType)}
                            data-testid={`checkbox-consent-${consentType}`}
                          />
                          <div className="flex-1">
                            <Label htmlFor={consentType} className="text-sm font-medium cursor-pointer">
                              {t(`renewal2026.commitmentForm.consents.${consentType}.title`)}
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              {t(`renewal2026.commitmentForm.consents.${consentType}.description`)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="complaintNumbers">{t("renewal2026.commitmentForm.complaintNumbers")}</Label>
                      <Input
                        id="complaintNumbers"
                        value={complaintNumbers}
                        onChange={(e) => setComplaintNumbers(e.target.value)}
                        placeholder={t("renewal2026.commitmentForm.complaintNumbersPlaceholder")}
                        data-testid="input-complaint-numbers"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">{t("renewal2026.commitmentForm.notes")}</Label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={t("renewal2026.commitmentForm.notesPlaceholder")}
                        rows={3}
                        data-testid="input-notes"
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between gap-2">
                    <Button variant="outline" onClick={() => setActiveTab("staff")} data-testid="button-back-staff">
                      {t("renewal2026.back")}
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => saveCommitmentMutation.mutate({ consents, complaintNumbers, notes })}
                        disabled={saveCommitmentMutation.isPending || consents.length === 0}
                        className="gap-2"
                        data-testid="button-save-commitment"
                      >
                        {saveCommitmentMutation.isPending ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        {t("renewal2026.saveForm")}
                      </Button>
                      <Button variant="outline" onClick={() => setActiveTab("attachments")} data-testid="button-next-attachments">
                        {t("renewal2026.next")}
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              )}

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
                        <div className="flex items-center gap-2">
                          {renewal.officeFormCompleted ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                          )}
                          <span className={renewal.officeFormCompleted ? "" : "text-muted-foreground"}>
                            {t("renewal2026.submitForm.officeFormStatus")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {renewal.staffFormCompleted ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                          )}
                          <span className={renewal.staffFormCompleted ? "" : "text-muted-foreground"}>
                            {t("renewal2026.submitForm.staffFormStatus")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {renewal.commitmentFormCompleted ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                          )}
                          <span className={renewal.commitmentFormCompleted ? "" : "text-muted-foreground"}>
                            {t("renewal2026.submitForm.commitmentFormStatus")}
                          </span>
                        </div>
                        <Separator className="my-2" />
                        <div className="flex items-center gap-2">
                          {getAttachmentsByCategory("PACK_1_FINANCIAL_DOCS").length > 0 ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                          )}
                          <span>{t("renewal2026.attachments.packs.PACK_1_FINANCIAL_DOCS.title")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getAttachmentsByCategory("PACK_2_LEGAL_DOCS").length > 0 ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                          )}
                          <span>{t("renewal2026.attachments.packs.PACK_2_LEGAL_DOCS.title")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getAttachmentsByCategory("PACK_3_INSURANCE_DOCS").length > 0 ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                          )}
                          <span>{t("renewal2026.attachments.packs.PACK_3_INSURANCE_DOCS.title")}</span>
                        </div>
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
