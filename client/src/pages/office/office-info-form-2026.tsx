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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  ArrowRight,
  Building2,
  CheckCircle2,
  Loader2,
  FileText,
  CalendarDays,
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
}

export default function OfficeInfoForm2026() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const sidebarSide = language === 'ar' ? 'right' : 'left';
  const dir = language === "ar" ? "rtl" : "ltr";
  const [, navigate] = useLocation();

  const [formData, setFormData] = useState<OfficeInfoFormData>({
    establishmentNameCommercialReg: "",
    tradeNameAr: "",
    tradeNameEn: "",
    nationalEstablishmentNumber: "",
    trademark: "",
    awqafAccreditationNumber: "",
    socialSecurityNumber: "",
    guaranteeExpiryDate: "",
  });

  const [autoSaved, setAutoSaved] = useState(false);

  const { data: office, isLoading: officeLoading } = useQuery<Office>({
    queryKey: ["/api/office/profile"],
  });

  const { data: existingForm, isLoading: formLoading } = useQuery<OfficeInfoFormRecord | null>({
    queryKey: ["/api/office-info-form"],
  });

  const isFormLocked = !!existingForm;

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
      });
    } else if (office && !autoSaved) {
      const autoFormData: OfficeInfoFormData = {
        establishmentNameCommercialReg: office.legalNameAr || office.tradeNameAr || "",
        tradeNameAr: office.tradeNameAr || "",
        tradeNameEn: office.tradeNameEn || "",
        nationalEstablishmentNumber: office.nationalEstablishmentNumber || "",
        trademark: office.trademark || "",
        awqafAccreditationNumber: office.awqafApprovalNo || "",
        socialSecurityNumber: office.socialSecurityNumber || "",
        guaranteeExpiryDate: office.guaranteeExpiryDate || "",
      };
      setFormData(autoFormData);
      setAutoSaved(true);
      saveMutation.mutate(autoFormData);
    }
  }, [office, existingForm, autoSaved]);

  const saveMutation = useMutation({
    mutationFn: async (data: OfficeInfoFormData) => {
      const response = await apiRequest("POST", "/api/office-info-form", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/office-info-form"] });
    },
    onError: (error: any) => {
      console.error("Auto-save error:", error);
    },
  });

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

              {saveMutation.isPending && (
                <Alert className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
                  <Loader2 className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />
                  <AlertTitle className="text-blue-700 dark:text-blue-400">
                    {language === "ar" ? "جاري الحفظ التلقائي..." : "Auto-saving..."}
                  </AlertTitle>
                </Alert>
              )}

              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">{t("officeInfoForm2026.basicInfo.title")}</CardTitle>
                    <CheckCircle2 className="w-4 h-4 text-green-500 ms-auto" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="establishmentNameCommercialReg">
                        {t("officeInfoForm2026.fields.establishmentNameCommercialReg")}
                      </Label>
                      <Input
                        id="establishmentNameCommercialReg"
                        value={formData.establishmentNameCommercialReg}
                        readOnly
                        className="bg-muted cursor-default"
                        data-testid="input-establishment-name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tradeNameAr">
                        {t("officeInfoForm2026.fields.tradeNameAr")}
                      </Label>
                      <Input
                        id="tradeNameAr"
                        value={formData.tradeNameAr}
                        readOnly
                        className="bg-muted cursor-default"
                        data-testid="input-trade-name-ar"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tradeNameEn">
                        {t("officeInfoForm2026.fields.tradeNameEn")}
                      </Label>
                      <Input
                        id="tradeNameEn"
                        value={formData.tradeNameEn}
                        readOnly
                        className="bg-muted cursor-default"
                        data-testid="input-trade-name-en"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nationalEstablishmentNumber">
                        {t("officeInfoForm2026.fields.nationalEstablishmentNumber")}
                      </Label>
                      <Input
                        id="nationalEstablishmentNumber"
                        value={formData.nationalEstablishmentNumber}
                        readOnly
                        className="bg-muted cursor-default"
                        data-testid="input-national-establishment-number"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="trademark">
                        {t("officeInfoForm2026.fields.trademark")}
                      </Label>
                      <Input
                        id="trademark"
                        value={formData.trademark}
                        readOnly
                        className="bg-muted cursor-default"
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
                        readOnly
                        className="bg-muted cursor-default"
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
                        readOnly
                        className="bg-muted cursor-default"
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
                        readOnly
                        className="bg-muted cursor-default"
                        data-testid="input-guarantee-expiry"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-start">
                <Button
                  variant="outline"
                  onClick={() => navigate("/office/dashboard")}
                  data-testid="button-back"
                >
                  <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
                  {t("officeInfoForm2026.buttons.back")}
                </Button>
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
