import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation, useLanguage } from "@/lib/i18n";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft,
  ArrowRight,
  User,
  Save,
  Loader2,
  Upload,
  FileText,
  CheckCircle2,
  Phone,
  Calendar,
  Building2,
  IdCard,
  ShieldCheck
} from "lucide-react";

interface PersonData {
  id: number;
  fullNameAr: string;
  fullNameEn: string;
  nationalId: string;
  socialSecurityNo?: string;
  nationality: string;
  gender: string;
  motherName: string;
  mobile: string;
  birthDate: string;
  job?: string;
  identityCardFile?: string;
  noCriminalRecordFile?: string;
}

const nationalities = [
  "أردني", "سعودي", "إماراتي", "كويتي", "قطري", "عماني", "بحريني",
  "مصري", "سوري", "لبناني", "فلسطيني", "عراقي", "يمني", "سوداني",
  "مغربي", "جزائري", "تونسي", "ليبي", "أخرى",
];

const positions = [
  "شريك", "مفوض", "المدير المتفرغ", "مدير فرع", "مسؤول حجوزات",
  "خدمة عملاء", "محاسب", "سكرتير", "موظف استقبال", "مندوب مبيعات",
  "موظف إداري", "أخرى",
];

export default function AdminStaffDetail() {
  const { t } = useTranslation();
  const { language, isRTL } = useLanguage();
  const sidebarSide = language === 'ar' ? 'right' : 'left';
  const dir = isRTL ? "rtl" : "ltr";
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const personId = parseInt(params.id || "0", 10);

  const [personData, setPersonData] = useState<PersonData | null>(null);
  const [uploadingIdentity, setUploadingIdentity] = useState(false);
  const [uploadingCriminal, setUploadingCriminal] = useState(false);

  const { data: staffData, isLoading } = useQuery({
    queryKey: ["/api/admin/staff", personId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/staff/${personId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch person");
      return res.json();
    },
    enabled: !isNaN(personId) && personId > 0,
  });

  useEffect(() => {
    if (staffData?.person) {
      setPersonData({
        id: staffData.person.id,
        fullNameAr: staffData.person.fullNameAr || "",
        fullNameEn: staffData.person.fullNameEn || "",
        nationalId: staffData.person.nationalId || "",
        socialSecurityNo: staffData.person.socialSecurityNo || "",
        nationality: staffData.person.nationality || "",
        gender: staffData.person.gender || "",
        motherName: staffData.person.motherName || "",
        mobile: staffData.person.mobile || "",
        birthDate: staffData.person.birthDate || "",
        job: staffData.person.job || "",
        identityCardFile: staffData.person.identityCardFile,
        noCriminalRecordFile: staffData.person.noCriminalRecordFile,
      });
    }
  }, [staffData]);

  const saveMutation = useMutation({
    mutationFn: async (data: PersonData) => {
      const res = await apiRequest("PUT", `/api/admin/staff/${data.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t("staffDetail.saveSuccessful"),
        description: t("staffDetail.dataSavedSuccessfully"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/staff"] });
    },
    onError: (error: any) => {
      toast({
        title: t("staffDetail.error"),
        description: error.message || (t("staffDetail.failedToSaveData")),
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (file: File, type: "identity" | "criminal") => {
    if (!personData?.id) return;

    const setUploading = type === "identity" ? setUploadingIdentity : setUploadingCriminal;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", type === "identity" ? "identity_card" : "no_criminal_record");

      const response = await fetch(`/api/admin/staff/${personData.id}/upload-document`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) throw new Error("Upload failed");

      const result = await response.json();
      
      setPersonData({
        ...personData,
        [type === "identity" ? "identityCardFile" : "noCriminalRecordFile"]: result.filePath,
      });

      toast({
        title: t("staffDetail.uploadSuccessful"),
        description: t("staffDetail.documentUploadedSuccessfully"),
      });

      queryClient.invalidateQueries({ queryKey: ["/api/admin/staff"] });
    } catch (error) {
      toast({
        title: t("staffDetail.error"),
        description: t("staffDetail.failedToUploadDocument"),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (personData) {
      saveMutation.mutate(personData);
    }
  };

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className={`flex h-screen w-full ${language === 'ar' ? 'flex-row-reverse' : ''}`} dir={dir}>
          <AdminSidebar key={`sidebar-${language}`} side={sidebarSide} />
          <SidebarInset className="flex-1 overflow-auto">
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                <p>{t("staffDetail.loading")}</p>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  if (!personData) {
    return (
      <SidebarProvider>
        <div className={`flex h-screen w-full ${language === 'ar' ? 'flex-row-reverse' : ''}`} dir={dir}>
          <AdminSidebar key={`sidebar-${language}`} side={sidebarSide} />
          <SidebarInset className="flex-1 overflow-auto">
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {t("staffDetail.employeeNotFound")}
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => navigate("/admin/staff")}
                  data-testid="button-back-to-list"
                >
                  {t("staffDetail.backToList")}
                </Button>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className={`flex h-screen w-full ${language === 'ar' ? 'flex-row-reverse' : ''}`} dir={dir}>
        <AdminSidebar key={`sidebar-${language}`} side={sidebarSide} />
        <SidebarInset className="flex-1 overflow-auto">
          <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-background px-4 h-14">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-trigger" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/admin/staff")}
                data-testid="button-back"
              >
                {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              </Button>
              <User className="h-5 w-5 text-primary" />
              <h1 className="font-semibold text-lg">
                {t("staffDetail.employeeProfile")}
              </h1>
            </div>
            {staffData?.office && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {staffData.office.tradeNameAr || staffData.office.tradeNameEn}
              </Badge>
            )}
          </header>
          
          <main className="p-4 md:p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              <Card>
                <CardHeader className="border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{personData.fullNameAr}</CardTitle>
                      {personData.fullNameEn && (
                        <CardDescription dir="ltr">{personData.fullNameEn}</CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {t("staffDetail.fullNameArabic")}
                      </Label>
                      <Input
                        value={personData.fullNameAr}
                        onChange={(e) => setPersonData({ ...personData, fullNameAr: e.target.value })}
                        data-testid="input-fullNameAr"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {t("staffDetail.fullNameEnglish")}
                      </Label>
                      <Input
                        value={personData.fullNameEn}
                        onChange={(e) => setPersonData({ ...personData, fullNameEn: e.target.value })}
                        dir="ltr"
                        data-testid="input-fullNameEn"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <IdCard className="w-4 h-4" />
                        {t("staffDetail.nationalId")}
                      </Label>
                      <Input
                        value={personData.nationalId}
                        onChange={(e) => setPersonData({ ...personData, nationalId: e.target.value })}
                        dir="ltr"
                        data-testid="input-nationalId"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {t("staffDetail.mobile")}
                      </Label>
                      <Input
                        value={personData.mobile}
                        onChange={(e) => setPersonData({ ...personData, mobile: e.target.value })}
                        dir="ltr"
                        data-testid="input-mobile"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("staffDetail.nationality")}</Label>
                      <Select
                        value={personData.nationality}
                        onValueChange={(value) => setPersonData({ ...personData, nationality: value })}
                      >
                        <SelectTrigger data-testid="select-nationality">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {nationalities.map((nat) => (
                            <SelectItem key={nat} value={nat}>{nat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("staffDetail.gender")}</Label>
                      <Select
                        value={personData.gender}
                        onValueChange={(value) => setPersonData({ ...personData, gender: value })}
                      >
                        <SelectTrigger data-testid="select-gender">
                          <SelectValue placeholder={t("staffDetail.select")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ذكر">{t("staffDetail.male")}</SelectItem>
                          <SelectItem value="أنثى">{t("staffDetail.female")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("staffDetail.motherSName")}</Label>
                      <Input
                        value={personData.motherName}
                        onChange={(e) => setPersonData({ ...personData, motherName: e.target.value })}
                        data-testid="input-motherName"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {t("staffDetail.birthDate")}
                      </Label>
                      <Input
                        type="date"
                        value={personData.birthDate}
                        onChange={(e) => setPersonData({ ...personData, birthDate: e.target.value })}
                        max={new Date().toISOString().split("T")[0]}
                        dir="ltr"
                        data-testid="input-birthDate"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("staffDetail.socialSecurityNo")}</Label>
                      <Input
                        value={personData.socialSecurityNo || ""}
                        onChange={(e) => setPersonData({ ...personData, socialSecurityNo: e.target.value })}
                        dir="ltr"
                        data-testid="input-socialSecurityNo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("staffDetail.position")}</Label>
                      <Select
                        value={personData.job || ""}
                        onValueChange={(value) => setPersonData({ ...personData, job: value })}
                      >
                        <SelectTrigger data-testid="select-position">
                          <SelectValue placeholder={t("staffDetail.select")} />
                        </SelectTrigger>
                        <SelectContent>
                          {positions.map((pos) => (
                            <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    {t("staffDetail.documents")}
                  </CardTitle>
                  <CardDescription>
                    {t("staffDetail.youCanUploadOrReplace")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center gap-2">
                        <IdCard className="w-5 h-5 text-primary" />
                        <Label className="font-medium">
                          {t("staffDetail.identityCardFront")}
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t("staffDetail.clearCopyOfPersonalId")}
                      </p>
                      {personData.identityCardFile ? (
                        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-md">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          <span className="text-sm text-green-700 dark:text-green-400">
                            {t("staffDetail.uploaded")}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ms-auto text-primary"
                            onClick={() => window.open(`/api/documents/staff/${personData.id}/identity`, "_blank")}
                            data-testid="button-view-identity"
                          >
                            {t("staffDetail.view")}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                          <span className="text-sm text-muted-foreground">
                            {t("staffDetail.notUploadedYet")}
                          </span>
                        </div>
                      )}
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, "identity");
                            e.target.value = "";
                          }}
                          disabled={uploadingIdentity}
                          data-testid="input-upload-identity"
                        />
                        <Button
                          variant="outline"
                          className="w-full"
                          disabled={uploadingIdentity}
                          data-testid="button-upload-identity"
                        >
                          {uploadingIdentity ? (
                            <Loader2 className="w-4 h-4 me-2 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4 me-2" />
                          )}
                          {personData.identityCardFile 
                            ? (t("staffDetail.replace"))
                            : (t("staffDetail.uploadIdentityCard"))}
                        </Button>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-primary" />
                        <Label className="font-medium">
                          {t("staffDetail.criminalRecordCertificate")}
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t("staffDetail.recentCriminalRecordCertificate")}
                      </p>
                      {personData.noCriminalRecordFile ? (
                        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-md">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          <span className="text-sm text-green-700 dark:text-green-400">
                            {t("staffDetail.uploaded")}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ms-auto text-primary"
                            onClick={() => window.open(`/api/documents/staff/${personData.id}/criminal`, "_blank")}
                            data-testid="button-view-criminal"
                          >
                            {t("staffDetail.view")}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                          <span className="text-sm text-muted-foreground">
                            {t("staffDetail.notUploadedYet")}
                          </span>
                        </div>
                      )}
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, "criminal");
                            e.target.value = "";
                          }}
                          disabled={uploadingCriminal}
                          data-testid="input-upload-criminal"
                        />
                        <Button
                          variant="outline"
                          className="w-full"
                          disabled={uploadingCriminal}
                          data-testid="button-upload-criminal"
                        >
                          {uploadingCriminal ? (
                            <Loader2 className="w-4 h-4 me-2 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4 me-2" />
                          )}
                          {personData.noCriminalRecordFile 
                            ? (t("staffDetail.replace"))
                            : (t("staffDetail.uploadCertificate"))}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-between gap-4">
                <Button
                  variant="outline"
                  onClick={() => navigate("/admin/staff")}
                  data-testid="button-back-bottom"
                >
                  {isRTL ? <ArrowRight className="w-4 h-4 ms-2" /> : <ArrowLeft className="w-4 h-4 me-2" />}
                  {t("staffDetail.backToList")}
                </Button>
                
                <Button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  data-testid="button-save"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 me-2" />
                  )}
                  {t("staffDetail.saveChanges")}
                </Button>
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
