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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ArrowRight,
  Building2,
  CheckCircle2,
  Loader2,
  FileText,
  CalendarDays,
  MapPin,
  Plane,
  Phone,
  Mail,
  Globe,
  Pencil,
  Clock,
  AlertCircle
} from "lucide-react";
import type { Office, OfficeInfoFormRecord, ChangeRequest } from "@shared/schema";

interface OfficeInfoFormData {
  establishmentNameCommercialReg: string;
  tradeNameAr: string;
  tradeNameEn: string;
  nationalEstablishmentNumber: string;
  trademark: string;
  awqafAccreditationNumber: string;
  socialSecurityNumber: string;
  guaranteeExpiryDate: string;
  city: string;
  phone: string;
  street: string;
  mobile: string;
  jstaEmail: string;
  poBox: string;
  region: string;
  buildingNumber: string;
  fax: string;
  website: string;
  geographicLocationLink: string;
  additionalEmail: string;
  zipCode: string;
  tourismImported: boolean;
  airlineTickets: boolean;
  hajjUmrah: boolean;
  domesticTourism: boolean;
  outboundTourism: boolean;
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
    city: "",
    phone: "",
    street: "",
    mobile: "",
    jstaEmail: "",
    poBox: "",
    region: "",
    buildingNumber: "",
    fax: "",
    website: "",
    geographicLocationLink: "",
    additionalEmail: "",
    zipCode: "",
    tourismImported: false,
    airlineTickets: false,
    hajjUmrah: false,
    domesticTourism: false,
    outboundTourism: false,
  });

  const [autoSaved, setAutoSaved] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<OfficeInfoFormData | null>(null);
  const { toast } = useToast();

  const { data: office, isLoading: officeLoading } = useQuery<Office>({
    queryKey: ["/api/office/profile"],
  });

  const { data: existingForm, isLoading: formLoading } = useQuery<OfficeInfoFormRecord | null>({
    queryKey: ["/api/office-info-form"],
  });

  const { data: pendingRequests } = useQuery<ChangeRequest[]>({
    queryKey: ["/api/office/change-requests"],
    select: (data) => data?.filter(r => r.status === "SUBMITTED" && r.requestType === "OFFICE_INFO") || [],
  });

  const hasPendingRequest = pendingRequests && pendingRequests.length > 0;
  const isFormLocked = !!existingForm;

  const submitChangeRequestMutation = useMutation({
    mutationFn: async (proposedData: OfficeInfoFormData) => {
      const response = await apiRequest("POST", "/api/office/change-requests/submit", {
        requestType: "OFFICE_INFO",
        currentData: formData,
        proposedData: proposedData,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/office/change-requests"] });
      toast({
        title: t("changeRequests.officeForm.requestSubmitted"),
        description: t("changeRequests.officeForm.requestSubmittedDesc"),
      });
      setEditDialogOpen(false);
      setEditFormData(null);
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("changeRequests.officeForm.submitError"),
        variant: "destructive",
      });
    },
  });

  const openEditDialog = () => {
    setEditFormData({ ...formData });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = () => {
    if (!editFormData) return;
    
    const hasChanges = Object.keys(formData).some(
      (key) => formData[key as keyof OfficeInfoFormData] !== editFormData[key as keyof OfficeInfoFormData]
    );
    
    if (!hasChanges) {
      toast({
        title: t("common.error"),
        description: t("changeRequests.officeForm.noChangesDetected"),
        variant: "destructive",
      });
      return;
    }
    
    submitChangeRequestMutation.mutate(editFormData);
  };

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
        city: existingForm.city || "",
        phone: existingForm.phone || "",
        street: existingForm.street || "",
        mobile: existingForm.mobile || "",
        jstaEmail: existingForm.jstaEmail || "",
        poBox: existingForm.poBox || "",
        region: existingForm.region || "",
        buildingNumber: existingForm.buildingNumber || "",
        fax: existingForm.fax || "",
        website: existingForm.website || "",
        geographicLocationLink: existingForm.geographicLocationLink || "",
        additionalEmail: existingForm.additionalEmail || "",
        zipCode: existingForm.zipCode || "",
        tourismImported: existingForm.tourismImported || false,
        airlineTickets: existingForm.airlineTickets || false,
        hajjUmrah: existingForm.hajjUmrah || false,
        domesticTourism: existingForm.domesticTourism || false,
        outboundTourism: existingForm.outboundTourism || false,
      });
    } else if (office && !autoSaved && !formLoading) {
      // Only auto-save when we're sure there's no existing form (formLoading is false)
      const autoFormData: OfficeInfoFormData = {
        establishmentNameCommercialReg: office.legalNameAr || office.tradeNameAr || "",
        tradeNameAr: office.tradeNameAr || "",
        tradeNameEn: office.tradeNameEn || "",
        nationalEstablishmentNumber: office.nationalEstablishmentNumber || "",
        trademark: office.trademark || "",
        awqafAccreditationNumber: office.awqafApprovalNo || "",
        socialSecurityNumber: office.socialSecurityNumber || "",
        guaranteeExpiryDate: office.guaranteeExpiryDate || "",
        city: office.mainCity || "",
        phone: office.phone || "",
        street: office.mainStreet || "",
        mobile: office.mobile || "",
        jstaEmail: office.mainEmail || "",
        poBox: office.poBox || "",
        region: office.mainArea || "",
        buildingNumber: office.mainBuildingNumber || "",
        fax: office.fax || "",
        website: office.website || "",
        geographicLocationLink: office.geographicLocationLink || "",
        additionalEmail: office.extraEmail || "",
        zipCode: office.postalCode || "",
        tourismImported: office.tourismImported || false,
        airlineTickets: office.airlineTickets || false,
        hajjUmrah: office.hajjUmrah || false,
        domesticTourism: office.domesticTourism || false,
        outboundTourism: office.outboundTourism || false,
      };
      setFormData(autoFormData);
      setAutoSaved(true);
      saveMutation.mutate(autoFormData);
    }
  }, [office, existingForm, autoSaved, formLoading]);

  const saveMutation = useMutation({
    mutationFn: async (data: OfficeInfoFormData) => {
      const response = await apiRequest("POST", "/api/office-info-form", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/office-info-form"] });
      // Unlocks the Renewals nav item, which is gated on form completion.
      queryClient.invalidateQueries({ queryKey: ["/api/office/form-completion-status"] });
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
          <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-background px-4 h-14">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-trigger" />
              <Building2 className="h-5 w-5 text-primary" />
              <h1 className="font-semibold text-lg">{t("officeInfoForm2026.title")}</h1>
            </div>
            {isFormLocked && !hasPendingRequest && (
              <Button
                variant="outline"
                size="sm"
                onClick={openEditDialog}
                data-testid="button-edit-info"
              >
                <Pencil className="w-4 h-4 me-2" />
                {t("changeRequests.officeForm.editInfo")}
              </Button>
            )}
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
                    {t("officeInfoForm2026.autoSaving")}
                  </AlertTitle>
                </Alert>
              )}

              {hasPendingRequest && (
                <Alert className="mb-6 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30">
                  <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <AlertTitle className="text-yellow-700 dark:text-yellow-400">
                    {t("changeRequests.officeForm.pendingChanges")}
                  </AlertTitle>
                  <AlertDescription className="text-yellow-600 dark:text-yellow-300">
                    {t("changeRequests.status.submitted")}
                  </AlertDescription>
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
                    {/* 1. Tourism Activity Type - FIRST */}
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="tourismActivityType">
                        <Plane className="w-4 h-4 inline me-1" />
                        {t("officeInfoForm2026.fields.tourismActivityType")}
                      </Label>
                      <Input
                        id="tourismActivityType"
                        value={office?.licenseCategory || "-"}
                        readOnly
                        className="bg-muted cursor-default"
                        data-testid="input-tourism-activity-type"
                      />
                    </div>

                    {/* 2. Establishment Name */}
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

                    {/* 3. National Establishment Number */}
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

                    {/* 4. Trade Name Arabic */}
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

                    {/* 5. Trademark */}
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

                    {/* 6. Trade Name English */}
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

                    {/* 7. Awqaf Accreditation */}
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

                    {/* 8. Social Security Number */}
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

                    {/* 9. Guarantee Expiry Date */}
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

              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Phone className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">{t("officeInfoForm2026.contactInfo.title")}</CardTitle>
                    <CheckCircle2 className="w-4 h-4 text-green-500 ms-auto" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">
                        {t("officeInfoForm2026.fields.city")}
                      </Label>
                      <Input
                        id="city"
                        value={formData.city}
                        readOnly
                        className="bg-muted cursor-default"
                        data-testid="input-city"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">
                        {t("officeInfoForm2026.fields.phone")}
                      </Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        readOnly
                        className="bg-muted cursor-default"
                        data-testid="input-phone"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="street">
                        {t("officeInfoForm2026.fields.street")}
                      </Label>
                      <Input
                        id="street"
                        value={formData.street}
                        readOnly
                        className="bg-muted cursor-default"
                        data-testid="input-street"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mobile">
                        {t("officeInfoForm2026.fields.mobile")}
                      </Label>
                      <Input
                        id="mobile"
                        value={formData.mobile}
                        readOnly
                        className="bg-muted cursor-default"
                        data-testid="input-mobile"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="jstaEmail">
                        <Mail className="w-4 h-4 inline me-1" />
                        {t("officeInfoForm2026.fields.jstaEmail")}
                      </Label>
                      <Input
                        id="jstaEmail"
                        value={formData.jstaEmail}
                        readOnly
                        className="bg-muted cursor-default"
                        data-testid="input-jsta-email"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="poBox">
                        {t("officeInfoForm2026.fields.poBox")}
                      </Label>
                      <Input
                        id="poBox"
                        value={formData.poBox}
                        readOnly
                        className="bg-muted cursor-default"
                        data-testid="input-po-box"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="region">
                        {t("officeInfoForm2026.fields.region")}
                      </Label>
                      <Input
                        id="region"
                        value={formData.region}
                        readOnly
                        className="bg-muted cursor-default"
                        data-testid="input-region"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="buildingNumber">
                        {t("officeInfoForm2026.fields.buildingNumber")}
                      </Label>
                      <Input
                        id="buildingNumber"
                        value={formData.buildingNumber}
                        readOnly
                        className="bg-muted cursor-default"
                        data-testid="input-building-number"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fax">
                        {t("officeInfoForm2026.fields.fax")}
                      </Label>
                      <Input
                        id="fax"
                        value={formData.fax}
                        readOnly
                        className="bg-muted cursor-default"
                        data-testid="input-fax"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="website">
                        <Globe className="w-4 h-4 inline me-1" />
                        {t("officeInfoForm2026.fields.website")}
                      </Label>
                      <Input
                        id="website"
                        value={formData.website}
                        readOnly
                        className="bg-muted cursor-default"
                        data-testid="input-website"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="additionalEmail">
                        {t("officeInfoForm2026.fields.additionalEmail")}
                      </Label>
                      <Input
                        id="additionalEmail"
                        value={formData.additionalEmail}
                        readOnly
                        className="bg-muted cursor-default"
                        data-testid="input-additional-email"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="zipCode">
                        {t("officeInfoForm2026.fields.zipCode")}
                      </Label>
                      <Input
                        id="zipCode"
                        value={formData.zipCode}
                        readOnly
                        className="bg-muted cursor-default"
                        data-testid="input-zip-code"
                      />
                    </div>
                    
                    <div className="space-y-2 md:col-span-2 lg:col-span-3">
                      <Label htmlFor="geographicLocationLink">
                        <MapPin className="w-4 h-4 inline me-1" />
                        {t("officeInfoForm2026.fields.geographicLocationLink")}
                      </Label>
                      <Input
                        id="geographicLocationLink"
                        value={formData.geographicLocationLink}
                        readOnly
                        className="bg-muted cursor-default"
                        placeholder={t("officeInfoForm2026.googleMapsLink")}
                        data-testid="input-geographic-location"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Plane className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">{t("officeInfoForm2026.tourismActivity.title")}</CardTitle>
                    <CheckCircle2 className="w-4 h-4 text-green-500 ms-auto" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="hajjUmrah"
                        checked={formData.hajjUmrah}
                        disabled
                        data-testid="checkbox-hajj-umrah"
                      />
                      <Label htmlFor="hajjUmrah" className="cursor-default">
                        {t("officeInfoForm2026.tourismActivity.hajjUmrah")}
                      </Label>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="tourismImported"
                        checked={formData.tourismImported}
                        disabled
                        data-testid="checkbox-tourism-imported"
                      />
                      <Label htmlFor="tourismImported" className="cursor-default">
                        {t("officeInfoForm2026.tourismActivity.tourismImported")}
                      </Label>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="outboundTourism"
                        checked={formData.outboundTourism}
                        disabled
                        data-testid="checkbox-outbound-tourism"
                      />
                      <Label htmlFor="outboundTourism" className="cursor-default">
                        {t("officeInfoForm2026.tourismActivity.outboundTourism")}
                      </Label>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="domesticTourism"
                        checked={formData.domesticTourism}
                        disabled
                        data-testid="checkbox-domestic-tourism"
                      />
                      <Label htmlFor="domesticTourism" className="cursor-default">
                        {t("officeInfoForm2026.tourismActivity.domesticTourism")}
                      </Label>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="airlineTickets"
                        checked={formData.airlineTickets}
                        disabled
                        data-testid="checkbox-airline-tickets"
                      />
                      <Label htmlFor="airlineTickets" className="cursor-default">
                        {t("officeInfoForm2026.tourismActivity.airlineTickets")}
                      </Label>
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

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              {t("changeRequests.officeForm.editInfo")}
            </DialogTitle>
            <DialogDescription>
              {t("changeRequests.officeForm.editFields")}
            </DialogDescription>
          </DialogHeader>
          
          {editFormData && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("officeInfoForm2026.fields.phone")}</Label>
                  <Input
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    data-testid="edit-input-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("officeInfoForm2026.fields.mobile")}</Label>
                  <Input
                    value={editFormData.mobile}
                    onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
                    data-testid="edit-input-mobile"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("officeInfoForm2026.fields.fax")}</Label>
                  <Input
                    value={editFormData.fax}
                    onChange={(e) => setEditFormData({ ...editFormData, fax: e.target.value })}
                    data-testid="edit-input-fax"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("officeInfoForm2026.fields.jstaEmail")}</Label>
                  <Input
                    value={editFormData.jstaEmail}
                    onChange={(e) => setEditFormData({ ...editFormData, jstaEmail: e.target.value })}
                    data-testid="edit-input-jsta-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("officeInfoForm2026.fields.additionalEmail")}</Label>
                  <Input
                    value={editFormData.additionalEmail}
                    onChange={(e) => setEditFormData({ ...editFormData, additionalEmail: e.target.value })}
                    data-testid="edit-input-additional-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("officeInfoForm2026.fields.website")}</Label>
                  <Input
                    value={editFormData.website}
                    onChange={(e) => setEditFormData({ ...editFormData, website: e.target.value })}
                    data-testid="edit-input-website"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>{t("officeInfoForm2026.fields.geographicLocationLink")}</Label>
                  <Input
                    value={editFormData.geographicLocationLink}
                    onChange={(e) => setEditFormData({ ...editFormData, geographicLocationLink: e.target.value })}
                    data-testid="edit-input-geography-link"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("officeInfoForm2026.fields.city")}</Label>
                  <Input
                    value={editFormData.city}
                    onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                    data-testid="edit-input-city"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("officeInfoForm2026.fields.region")}</Label>
                  <Input
                    value={editFormData.region}
                    onChange={(e) => setEditFormData({ ...editFormData, region: e.target.value })}
                    data-testid="edit-input-region"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("officeInfoForm2026.fields.street")}</Label>
                  <Input
                    value={editFormData.street}
                    onChange={(e) => setEditFormData({ ...editFormData, street: e.target.value })}
                    data-testid="edit-input-street"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("officeInfoForm2026.fields.buildingNumber")}</Label>
                  <Input
                    value={editFormData.buildingNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, buildingNumber: e.target.value })}
                    data-testid="edit-input-building-number"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("officeInfoForm2026.fields.poBox")}</Label>
                  <Input
                    value={editFormData.poBox}
                    onChange={(e) => setEditFormData({ ...editFormData, poBox: e.target.value })}
                    data-testid="edit-input-po-box"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("officeInfoForm2026.fields.zipCode")}</Label>
                  <Input
                    value={editFormData.zipCode}
                    onChange={(e) => setEditFormData({ ...editFormData, zipCode: e.target.value })}
                    data-testid="edit-input-zip-code"
                  />
                </div>
              </div>

              <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-700 dark:text-blue-300">
                  {t("changeRequests.officeForm.submitRequestDesc")}
                </AlertDescription>
              </Alert>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              data-testid="button-cancel-edit"
            >
              {t("changeRequests.officeForm.cancelRequest")}
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={submitChangeRequestMutation.isPending}
              data-testid="button-submit-change-request"
            >
              {submitChangeRequestMutation.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {t("changeRequests.officeForm.submitRequest")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
