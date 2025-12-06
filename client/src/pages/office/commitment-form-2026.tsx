import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation, useLanguage } from "@/lib/i18n";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { OfficeSidebar } from "@/components/layout/office-sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Trash2, 
  Save, 
  ArrowRight,
  FileWarning,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Building2,
  Phone,
  Mail,
  User,
  FileText
} from "lucide-react";
import type { Office, ComplaintRow, CommitmentFormRecord, Complaint } from "@shared/schema";

interface CommitmentFormWithComplaints extends CommitmentFormRecord {
  complaints: Complaint[];
}

interface CommitmentFormData {
  officeName: string;
  licenseNo: string;
  contactName: string;
  contactEmail: string;
  contactMobile: string;
  hasComplaints: boolean;
  complaints: ComplaintRow[];
  consentAccepted: boolean;
}

const emptyComplaint: ComplaintRow = {
  complaintNumber: "",
  authority: "الجمعية",
  notifiedAt: "",
  summary: "",
  proposedAction: "",
};

const authorityOptions = ["الجمعية", "الوزارة", "أخرى"] as const;

export default function CommitmentForm2026() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const sidebarSide = language === 'ar' ? 'right' : 'left';
  const dir = language === "ar" ? "rtl" : "ltr";
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [formData, setFormData] = useState<CommitmentFormData>({
    officeName: "",
    licenseNo: "",
    contactName: "",
    contactEmail: "",
    contactMobile: "",
    hasComplaints: false,
    complaints: [],
    consentAccepted: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: office, isLoading: officeLoading } = useQuery<Office>({
    queryKey: ["/api/office/profile"],
  });

  const { data: existingForm, isLoading: formLoading } = useQuery<CommitmentFormWithComplaints | null>({
    queryKey: ["/api/office/commitment-form"],
  });

  useEffect(() => {
    if (office) {
      setFormData(prev => ({
        ...prev,
        officeName: office.tradeNameAr || "",
        licenseNo: office.nationalEntityNo || "",
        contactEmail: office.mainEmail || "",
        contactMobile: office.mobile || "",
      }));
    }
  }, [office]);

  useEffect(() => {
    if (existingForm) {
      setFormData({
        officeName: existingForm.officeName || "",
        licenseNo: existingForm.licenseNo || "",
        contactName: existingForm.contactName || "",
        contactEmail: existingForm.contactEmail || "",
        contactMobile: existingForm.contactMobile || "",
        hasComplaints: existingForm.hasComplaints || false,
        complaints: (existingForm.complaints || []).map(c => ({
          complaintNumber: c.complaintNumber,
          authority: c.authority as "الجمعية" | "الوزارة" | "أخرى",
          notifiedAt: c.notifiedAt,
          summary: c.summary || undefined,
          proposedAction: c.proposedAction || undefined,
        })),
        consentAccepted: false,
      });
    }
  }, [existingForm]);

  const saveMutation = useMutation({
    mutationFn: async (data: CommitmentFormData) => {
      const response = await apiRequest("POST", "/api/office/commitment-form", data);
      return response.json();
    },
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/office/commitment-form"] });
        toast({
          title: t("commitmentForm2026.messages.savedSuccess"),
          description: t("commitmentForm2026.messages.savedDesc"),
        });
        navigate("/office/dashboard");
      }
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("commitmentForm2026.messages.saveError"),
        variant: "destructive",
      });
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.contactName.trim()) {
      newErrors.contactName = language === "ar" ? "اسم المسؤول مطلوب" : "Contact name is required";
    }

    if (formData.hasComplaints && formData.complaints.length > 0) {
      formData.complaints.forEach((complaint, index) => {
        if (!complaint.complaintNumber.trim()) {
          newErrors[`complaint_${index}_number`] = language === "ar" ? "رقم الشكوى مطلوب" : "Complaint number is required";
        }
        if (!complaint.notifiedAt) {
          newErrors[`complaint_${index}_date`] = language === "ar" ? "تاريخ التبليغ مطلوب" : "Notification date is required";
        }
        if (complaint.summary && complaint.summary.length > 200) {
          newErrors[`complaint_${index}_summary`] = language === "ar" ? "الملخص طويل جداً" : "Summary is too long";
        }
      });
    }

    if (!formData.consentAccepted) {
      newErrors.consent = t("commitmentForm2026.messages.consentRequiredDesc");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      saveMutation.mutate(formData);
    }
  };

  const addComplaint = () => {
    setFormData(prev => ({
      ...prev,
      complaints: [...prev.complaints, { ...emptyComplaint }],
    }));
  };

  const removeComplaint = (index: number) => {
    setFormData(prev => ({
      ...prev,
      complaints: prev.complaints.filter((_, i) => i !== index),
    }));
    const newErrors = { ...errors };
    delete newErrors[`complaint_${index}_number`];
    delete newErrors[`complaint_${index}_date`];
    delete newErrors[`complaint_${index}_summary`];
    setErrors(newErrors);
  };

  const updateComplaint = (index: number, field: keyof ComplaintRow, value: string) => {
    setFormData(prev => ({
      ...prev,
      complaints: prev.complaints.map((c, i) => 
        i === index ? { ...c, [field]: value } : c
      ),
    }));
  };

  if (officeLoading || formLoading) {
    return (
      <SidebarProvider>
        <div className={`flex h-screen w-full ${language === 'ar' ? 'flex-row-reverse' : ''}`} dir={dir}>
          <OfficeSidebar key={`sidebar-${language}`} side={sidebarSide} />
          <SidebarInset className="flex-1 overflow-auto">
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className={`flex h-screen w-full ${language === 'ar' ? 'flex-row-reverse' : ''}`} dir={dir}>
        <OfficeSidebar key={`sidebar-${language}`} side={sidebarSide} />
        <SidebarInset className="flex-1 overflow-auto">
          <header className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background px-4 h-14">
            <SidebarTrigger data-testid="button-sidebar-trigger" />
            <div className="flex items-center gap-2">
              <FileWarning className="h-5 w-5 text-primary" />
              <h1 className="font-semibold text-lg">{t("commitmentForm2026.title")}</h1>
            </div>
          </header>
          <main className="bg-muted/30 py-8">
            <div className="max-w-4xl mx-auto px-4">
              <Card className="mb-6">
                <CardHeader className="text-center border-b">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <FileWarning className="w-8 h-8 text-primary" />
                    <CardTitle className="text-2xl">{t("commitmentForm2026.title")}</CardTitle>
                  </div>
                  <CardDescription className="text-base">
                    {t("commitmentForm2026.subtitle")}
                  </CardDescription>
                </CardHeader>
              </Card>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">{t("commitmentForm2026.officeInfo.title")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg border mb-2">
              <p className="text-xs text-muted-foreground">
                {language === "ar" 
                  ? "هذه البيانات معبأة تلقائياً من ملف المكتب ولا يمكن تعديلها هنا"
                  : "This information is auto-filled from your office profile and cannot be edited here"
                }
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">
                  {t("commitmentForm2026.officeInfo.officeName")}
                </Label>
                <div className="p-3 bg-muted/30 rounded-lg border" data-testid="display-office-name">
                  <span className="font-medium">{formData.officeName || "-"}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">
                  {t("commitmentForm2026.officeInfo.licenseNo")}
                </Label>
                <div className="p-3 bg-muted/30 rounded-lg border" data-testid="display-license-no">
                  <span className="font-medium font-mono">{formData.licenseNo || "-"}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">
                  <User className="w-4 h-4 inline me-1" />
                  {t("commitmentForm2026.officeInfo.contactName")}
                </Label>
                <Input
                  id="contactName"
                  value={formData.contactName}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
                  placeholder={language === "ar" ? "أدخل اسم المسؤول / المالك / المفوض" : "Enter owner/authorized person name"}
                  data-testid="input-contact-name"
                />
                {errors.contactName && (
                  <p className="text-sm text-destructive">{errors.contactName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">
                  <Mail className="w-4 h-4 inline me-1" />
                  {t("commitmentForm2026.officeInfo.contactEmail")}
                </Label>
                <div className="p-3 bg-muted/30 rounded-lg border" data-testid="display-contact-email">
                  <span className="font-medium">{formData.contactEmail || "-"}</span>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-muted-foreground">
                  <Phone className="w-4 h-4 inline me-1" />
                  {t("commitmentForm2026.officeInfo.contactMobile")}
                </Label>
                <div className="p-3 bg-muted/30 rounded-lg border md:w-1/2" data-testid="display-contact-mobile">
                  <span className="font-medium">{formData.contactMobile || "-"}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <CardTitle className="text-lg">{t("commitmentForm2026.complaintsSection.title")}</CardTitle>
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="hasComplaints" className="text-sm">
                  {t("commitmentForm2026.complaintsSection.hasComplaints")}
                </Label>
                <Switch
                  id="hasComplaints"
                  checked={formData.hasComplaints}
                  onCheckedChange={(checked) => {
                    setFormData(prev => ({
                      ...prev,
                      hasComplaints: checked,
                      complaints: checked ? (prev.complaints.length > 0 ? prev.complaints : [{ ...emptyComplaint }]) : [],
                    }));
                  }}
                  data-testid="switch-has-complaints"
                />
              </div>
            </div>
            <CardDescription>
              {formData.hasComplaints 
                ? ""
                : t("commitmentForm2026.complaintsSection.noComplaintsDesc")
              }
            </CardDescription>
          </CardHeader>
          
          {formData.hasComplaints && (
            <CardContent className="space-y-6">
              {/* Pledge Section - Auto-filled with office data */}
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <h3 className="font-semibold text-amber-800 dark:text-amber-300">
                    {language === "ar" ? "تعهد" : "Pledge"}
                  </h3>
                </div>
                <p className="text-base leading-relaxed text-amber-900 dark:text-amber-200" data-testid="pledge-text">
                  {language === "ar" ? (
                    <>
                      أتعهد أنا <span className="font-bold text-primary bg-primary/10 px-1 rounded">{formData.contactName || "(المالك/المفوّض)"}</span> عن مكتب <span className="font-bold text-primary bg-primary/10 px-1 rounded">{formData.officeName || "(اسم المكتب)"}</span> ببذل أقصى جهد ممكن من قبلي لتسوية الشكوى أو الشكاوي المقدّمة إلى الجمعية/الوزارة بحق المكتب العائد لي، وتزويد الجمعية/الوزارة بما يثبت ذلك خلال مدة أقصاها نهاية شهر آذار، وتحت طائلة الإحالة إلى المجلس التأديبي في حال وجود أي شكوى محقّقة بقرار من لجنة الشكاوي المشكّلة بالجمعية.
                    </>
                  ) : (
                    <>
                      I, <span className="font-bold text-primary bg-primary/10 px-1 rounded">{formData.contactName || "(Owner/Agent)"}</span>, on behalf of <span className="font-bold text-primary bg-primary/10 px-1 rounded">{formData.officeName || "(Office Name)"}</span>, pledge to make every possible effort to settle the complaint(s) submitted to the Association/Ministry against my office, and to provide the Association/Ministry with proof of this by the end of March at the latest, under penalty of referral to the Disciplinary Council in case of any verified complaint by decision of the Complaints Committee formed by the Association.
                    </>
                  )}
                </p>
                
                {/* Show complaint summary in pledge if complaints exist */}
                {formData.complaints.length > 0 && formData.complaints.some(c => c.complaintNumber || c.summary) && (
                  <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-700">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">
                      {language === "ar" ? "الشكاوى المسجلة:" : "Registered Complaints:"}
                    </p>
                    <ul className="space-y-2">
                      {formData.complaints.map((complaint, index) => (
                        complaint.complaintNumber && (
                          <li key={index} className="text-sm text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/30 p-2 rounded">
                            <span className="font-medium">
                              {language === "ar" ? `شكوى رقم ${complaint.complaintNumber}` : `Complaint #${complaint.complaintNumber}`}
                            </span>
                            {complaint.authority && (
                              <span className="mx-2">-</span>
                            )}
                            {complaint.authority && (
                              <span>{complaint.authority}</span>
                            )}
                            {complaint.notifiedAt && (
                              <>
                                <span className="mx-2">-</span>
                                <span>{new Date(complaint.notifiedAt).toLocaleDateString(language === "ar" ? "ar-JO" : "en-US")}</span>
                              </>
                            )}
                            {complaint.summary && (
                              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{complaint.summary}</p>
                            )}
                          </li>
                        )
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Complaint Details Table */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  {language === "ar" ? "تفاصيل الشكاوى" : "Complaint Details"}
                </h4>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px]">{t("commitmentForm2026.complaintsSection.tableHeaders.complaintNumber")}</TableHead>
                        <TableHead className="min-w-[120px]">{t("commitmentForm2026.complaintsSection.tableHeaders.authority")}</TableHead>
                        <TableHead className="min-w-[140px]">{t("commitmentForm2026.complaintsSection.tableHeaders.notifiedAt")}</TableHead>
                        <TableHead className="min-w-[200px]">{t("commitmentForm2026.complaintsSection.tableHeaders.summary")}</TableHead>
                        <TableHead className="min-w-[200px]">{t("commitmentForm2026.complaintsSection.tableHeaders.proposedAction")}</TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.complaints.map((complaint, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Input
                              value={complaint.complaintNumber}
                              onChange={(e) => updateComplaint(index, "complaintNumber", e.target.value)}
                              className={errors[`complaint_${index}_number`] ? "border-destructive" : ""}
                              data-testid={`input-complaint-number-${index}`}
                            />
                            {errors[`complaint_${index}_number`] && (
                              <p className="text-xs text-destructive mt-1">{errors[`complaint_${index}_number`]}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={complaint.authority}
                              onValueChange={(value) => updateComplaint(index, "authority", value as any)}
                            >
                              <SelectTrigger data-testid={`select-authority-${index}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {authorityOptions.map((opt) => (
                                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              value={complaint.notifiedAt}
                              onChange={(e) => updateComplaint(index, "notifiedAt", e.target.value)}
                              className={errors[`complaint_${index}_date`] ? "border-destructive" : ""}
                              data-testid={`input-notified-at-${index}`}
                            />
                            {errors[`complaint_${index}_date`] && (
                              <p className="text-xs text-destructive mt-1">{errors[`complaint_${index}_date`]}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Textarea
                              value={complaint.summary || ""}
                              onChange={(e) => updateComplaint(index, "summary", e.target.value)}
                              className={`resize-none ${errors[`complaint_${index}_summary`] ? "border-destructive" : ""}`}
                              rows={2}
                              data-testid={`input-summary-${index}`}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              {(complaint.summary?.length || 0)}/200
                            </p>
                            {errors[`complaint_${index}_summary`] && (
                              <p className="text-xs text-destructive">{errors[`complaint_${index}_summary`]}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Textarea
                              value={complaint.proposedAction || ""}
                              onChange={(e) => updateComplaint(index, "proposedAction", e.target.value)}
                              className="resize-none"
                              rows={2}
                              data-testid={`input-proposed-action-${index}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeComplaint(index)}
                              className="text-destructive hover:text-destructive"
                              data-testid={`button-remove-complaint-${index}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <Button
                  variant="outline"
                  onClick={addComplaint}
                  className="mt-4"
                  data-testid="button-add-complaint"
                >
                  <Plus className="w-4 h-4 me-2" />
                  {t("commitmentForm2026.complaintsSection.addComplaint")}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">{t("commitmentForm2026.consent.title")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-muted/50 rounded-lg border mb-6">
              <p className="text-base leading-relaxed">
                {t("commitmentForm2026.consent.text")}
              </p>
            </div>

            <div className="flex items-start gap-3 p-4 border rounded-lg bg-card">
              <Checkbox
                id="consent"
                checked={formData.consentAccepted}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, consentAccepted: checked === true }))}
                data-testid="checkbox-consent"
              />
              <div className="space-y-1">
                <Label htmlFor="consent" className="text-base font-medium cursor-pointer">
                  {t("commitmentForm2026.consent.accept")}
                </Label>
                {errors.consent && (
                  <p className="text-sm text-destructive">{errors.consent}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mt-6 rtl:flex-row-reverse">
              <Button
                variant="outline"
                onClick={() => navigate("/office/dashboard")}
                data-testid="button-back"
              >
                <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
                {t("commitmentForm2026.buttons.back")}
              </Button>
              
              <Button
                onClick={handleSubmit}
                disabled={saveMutation.isPending}
                className="flex items-center gap-2"
                data-testid="button-submit"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saveMutation.isPending 
                  ? t("commitmentForm2026.buttons.saving")
                  : t("commitmentForm2026.buttons.save")
                }
              </Button>
            </div>
          </CardContent>
        </Card>

              {existingForm && (
                <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                      <CheckCircle2 className="w-5 h-5" />
                      <p className="font-medium">{t("commitmentForm2026.status.alreadySubmitted")}</p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("commitmentForm2026.status.submittedAt", { date: new Date(existingForm.submittedAt).toLocaleDateString(language === "ar" ? "ar-JO" : "en-US") })}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
