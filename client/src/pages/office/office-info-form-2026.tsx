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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  Save, 
  ArrowRight,
  Building2,
  CheckCircle2,
  Loader2,
  FileText,
  CalendarDays,
  Lock,
  Info
} from "lucide-react";
import type { Office, OfficeInfoFormRecord } from "@shared/schema";

interface OfficeInfoFormData {
  establishmentNameCommercialReg: string;
  tradeNameAr: string;
  tradeNameEn: string;
  nationalEstablishmentNumber: string;
  trademark: string;
  awqafAccreditationNumber: string;
  socialSecurityNumber: string;
  guaranteeExpiryDate: string;
  consentAccepted: boolean;
}

export default function OfficeInfoForm2026() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const dir = language === "ar" ? "rtl" : "ltr";
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [formData, setFormData] = useState<OfficeInfoFormData>({
    establishmentNameCommercialReg: "",
    tradeNameAr: "",
    tradeNameEn: "",
    nationalEstablishmentNumber: "",
    trademark: "",
    awqafAccreditationNumber: "",
    socialSecurityNumber: "",
    guaranteeExpiryDate: "",
    consentAccepted: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: office, isLoading: officeLoading } = useQuery<Office>({
    queryKey: ["/api/office/profile"],
  });

  const { data: existingForm, isLoading: formLoading } = useQuery<OfficeInfoFormRecord | null>({
    queryKey: ["/api/office-info-form"],
  });

  const isFormLocked = !!existingForm;

  useEffect(() => {
    if (office && !existingForm) {
      setFormData(prev => ({
        ...prev,
        tradeNameAr: office.tradeNameAr || "",
        tradeNameEn: office.tradeNameEn || "",
        nationalEstablishmentNumber: office.nationalEstablishmentNumber || "",
        trademark: office.trademark || "",
        awqafAccreditationNumber: office.awqafApprovalNo || "",
        socialSecurityNumber: office.socialSecurityNumber || "",
        guaranteeExpiryDate: office.guaranteeExpiryDate || "",
      }));
    }
  }, [office, existingForm]);

  useEffect(() => {
    if (existingForm) {
      setFormData({
        establishmentNameCommercialReg: existingForm.establishmentNameCommercialReg || "",
        tradeNameAr: existingForm.tradeNameAr || "",
        tradeNameEn: existingForm.tradeNameEn || "",
        nationalEstablishmentNumber: existingForm.nationalEstablishmentNumber || "",
        trademark: existingForm.trademark || "",
        awqafAccreditationNumber: existingForm.awqafAccreditationNumber || "",
        socialSecurityNumber: existingForm.socialSecurityNumber || "",
        guaranteeExpiryDate: existingForm.guaranteeExpiryDate || "",
        consentAccepted: false,
      });
    }
  }, [existingForm]);

  const saveMutation = useMutation({
    mutationFn: async (data: OfficeInfoFormData) => {
      const response = await apiRequest("POST", "/api/office-info-form", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/office-info-form"] });
      toast({
        title: t("officeInfoForm2026.messages.savedSuccess"),
        description: t("officeInfoForm2026.messages.savedDesc"),
      });
      navigate("/office/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("officeInfoForm2026.messages.saveError"),
        variant: "destructive",
      });
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.establishmentNameCommercialReg.trim()) {
      newErrors.establishmentNameCommercialReg = t("officeInfoForm2026.errors.establishmentNameRequired");
    }
    if (!formData.tradeNameAr.trim()) {
      newErrors.tradeNameAr = t("officeInfoForm2026.errors.tradeNameArRequired");
    }
    if (!formData.nationalEstablishmentNumber.trim()) {
      newErrors.nationalEstablishmentNumber = t("officeInfoForm2026.errors.nationalEstablishmentNumberRequired");
    }
    if (!formData.consentAccepted) {
      newErrors.consent = t("officeInfoForm2026.errors.consentRequired");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      saveMutation.mutate(formData);
    }
  };

  if (officeLoading || formLoading) {
    return (
      <SidebarProvider>
        <div className="flex h-screen w-full" dir={dir}>
          <OfficeSidebar />
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
      <div className="flex h-screen w-full" dir={dir}>
        <OfficeSidebar />
        <SidebarInset className="flex-1 overflow-auto">
          <header className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background px-4 h-14">
            <SidebarTrigger data-testid="button-sidebar-trigger" />
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h1 className="font-semibold text-lg">{t("officeInfoForm2026.title")}</h1>
            </div>
          </header>
          <main className="bg-muted/30 py-8">
            <div className="max-w-4xl mx-auto px-4">
              <Card className="mb-6">
                <CardHeader className="text-center border-b">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <Building2 className="w-8 h-8 text-primary" />
                    <CardTitle className="text-2xl">{t("officeInfoForm2026.title")}</CardTitle>
                  </div>
                  <CardDescription className="text-base">
                    {t("officeInfoForm2026.subtitle")}
                  </CardDescription>
                </CardHeader>
              </Card>

              {isFormLocked && (
                <Alert className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                  <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertTitle className="text-amber-700 dark:text-amber-400">
                    {t("officeInfoForm2026.locked.title")}
                  </AlertTitle>
                  <AlertDescription className="text-amber-600 dark:text-amber-500">
                    {t("officeInfoForm2026.locked.description")}
                  </AlertDescription>
                </Alert>
              )}

              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">{t("officeInfoForm2026.basicInfo.title")}</CardTitle>
                    {isFormLocked && (
                      <Lock className="w-4 h-4 text-muted-foreground ms-auto" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="establishmentNameCommercialReg">
                        {t("officeInfoForm2026.fields.establishmentNameCommercialReg")} {!isFormLocked && <span className="text-red-500">*</span>}
                      </Label>
                      <Input
                        id="establishmentNameCommercialReg"
                        value={formData.establishmentNameCommercialReg}
                        onChange={(e) => setFormData(prev => ({ ...prev, establishmentNameCommercialReg: e.target.value }))}
                        disabled={isFormLocked}
                        className={isFormLocked ? "bg-muted cursor-not-allowed" : ""}
                        data-testid="input-establishment-name"
                      />
                      {errors.establishmentNameCommercialReg && (
                        <p className="text-sm text-destructive">{errors.establishmentNameCommercialReg}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tradeNameAr">
                        {t("officeInfoForm2026.fields.tradeNameAr")} {!isFormLocked && <span className="text-red-500">*</span>}
                      </Label>
                      <Input
                        id="tradeNameAr"
                        value={formData.tradeNameAr}
                        onChange={(e) => setFormData(prev => ({ ...prev, tradeNameAr: e.target.value }))}
                        disabled={isFormLocked}
                        className={isFormLocked ? "bg-muted cursor-not-allowed" : ""}
                        data-testid="input-trade-name-ar"
                      />
                      {errors.tradeNameAr && (
                        <p className="text-sm text-destructive">{errors.tradeNameAr}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tradeNameEn">
                        {t("officeInfoForm2026.fields.tradeNameEn")}
                      </Label>
                      <Input
                        id="tradeNameEn"
                        value={formData.tradeNameEn}
                        onChange={(e) => setFormData(prev => ({ ...prev, tradeNameEn: e.target.value }))}
                        disabled={isFormLocked}
                        className={isFormLocked ? "bg-muted cursor-not-allowed" : ""}
                        data-testid="input-trade-name-en"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nationalEstablishmentNumber">
                        {t("officeInfoForm2026.fields.nationalEstablishmentNumber")} {!isFormLocked && <span className="text-red-500">*</span>}
                      </Label>
                      <Input
                        id="nationalEstablishmentNumber"
                        value={formData.nationalEstablishmentNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, nationalEstablishmentNumber: e.target.value }))}
                        disabled={isFormLocked}
                        className={isFormLocked ? "bg-muted cursor-not-allowed" : ""}
                        data-testid="input-national-establishment-number"
                      />
                      {errors.nationalEstablishmentNumber && (
                        <p className="text-sm text-destructive">{errors.nationalEstablishmentNumber}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="trademark">
                        {t("officeInfoForm2026.fields.trademark")}
                      </Label>
                      <Input
                        id="trademark"
                        value={formData.trademark}
                        onChange={(e) => setFormData(prev => ({ ...prev, trademark: e.target.value }))}
                        disabled={isFormLocked}
                        className={isFormLocked ? "bg-muted cursor-not-allowed" : ""}
                        data-testid="input-trademark"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="awqafAccreditationNumber">
                        {t("officeInfoForm2026.fields.awqafAccreditationNumber")}
                      </Label>
                      <Input
                        id="awqafAccreditationNumber"
                        value={formData.awqafAccreditationNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, awqafAccreditationNumber: e.target.value }))}
                        disabled={isFormLocked}
                        className={isFormLocked ? "bg-muted cursor-not-allowed" : ""}
                        data-testid="input-awqaf-accreditation"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="socialSecurityNumber">
                        {t("officeInfoForm2026.fields.socialSecurityNumber")}
                      </Label>
                      <Input
                        id="socialSecurityNumber"
                        value={formData.socialSecurityNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, socialSecurityNumber: e.target.value }))}
                        disabled={isFormLocked}
                        className={isFormLocked ? "bg-muted cursor-not-allowed" : ""}
                        data-testid="input-social-security"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="guaranteeExpiryDate">
                        <CalendarDays className="w-4 h-4 inline me-1" />
                        {t("officeInfoForm2026.fields.guaranteeExpiryDate")}
                      </Label>
                      <Input
                        id="guaranteeExpiryDate"
                        type="date"
                        value={formData.guaranteeExpiryDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, guaranteeExpiryDate: e.target.value }))}
                        disabled={isFormLocked}
                        className={isFormLocked ? "bg-muted cursor-not-allowed" : ""}
                        data-testid="input-guarantee-expiry"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {!isFormLocked ? (
                <Card className="mb-6">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      <CardTitle className="text-lg">{t("officeInfoForm2026.consent.title")}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-muted/50 rounded-lg border mb-6">
                      <p className="text-base leading-relaxed">
                        {t("officeInfoForm2026.consent.text")}
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
                          {t("officeInfoForm2026.consent.accept")}
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
                        {t("officeInfoForm2026.buttons.back")}
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
                          ? t("officeInfoForm2026.buttons.saving")
                          : t("officeInfoForm2026.buttons.save")
                        }
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-medium">{t("officeInfoForm2026.messages.alreadySubmitted")}</span>
                    </div>
                    <p className="text-sm text-green-600 dark:text-green-500 mt-2">
                      {t("officeInfoForm2026.messages.submittedAt")}: {new Date(existingForm!.submittedAt).toLocaleDateString(language === "ar" ? "ar-JO" : "en-US", { 
                        year: "numeric", 
                        month: "long", 
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                    <div className="flex justify-start mt-4">
                      <Button
                        variant="outline"
                        onClick={() => navigate("/office/dashboard")}
                        data-testid="button-back-locked"
                      >
                        <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
                        {t("officeInfoForm2026.buttons.back")}
                      </Button>
                    </div>
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
