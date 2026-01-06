import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation, useLanguage } from "@/lib/i18n";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { OfficeSidebar } from "@/components/layout/office-sidebar";
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

interface PersonRow {
  id?: number;
  fullNameAr: string;
  fullNameEn: string;
  nationalId: string;
  socialSecurityNo?: string;
  nationality: string;
  gender: string;
  motherName: string;
  mobile: string;
  birthDate: string;
  currentPosition: string;
  startDate: string;
  branch: string;
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

export default function StaffProfile() {
  const { t } = useTranslation();
  const { language, isRTL } = useLanguage();
  const sidebarSide = language === 'ar' ? 'right' : 'left';
  const dir = isRTL ? "rtl" : "ltr";
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams<{ section: string; index: string }>();
  
  const section = params.section || "owners";
  const index = parseInt(params.index || "0", 10);

  const [personData, setPersonData] = useState<PersonRow | null>(null);
  const [uploadingIdentity, setUploadingIdentity] = useState(false);
  const [uploadingCriminal, setUploadingCriminal] = useState(false);

  const { data: staffData, isLoading: isLoadingStaff } = useQuery({
    queryKey: ["/api/forms/staff-2026", "current"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) return null;
      const user = await res.json();
      if (!user.officeId) return null;
      
      const staffRes = await fetch(`/api/forms/staff-2026/${user.officeId}`);
      if (!staffRes.ok) return null;
      return staffRes.json();
    },
  });

  useEffect(() => {
    if (staffData) {
      let data: PersonRow[] = [];
      switch (section) {
        case "owners":
          data = staffData.ownersPartners || [];
          break;
        case "authorized":
          data = staffData.authorizedSignatories || [];
          break;
        case "managers":
          data = staffData.dedicatedManagers || [];
          break;
        case "employees":
          data = staffData.employees || [];
          break;
      }
      if (data[index]) {
        setPersonData({ ...data[index] });
      }
    }
  }, [staffData, section, index]);

  const saveMutation = useMutation({
    mutationFn: async (data: PersonRow) => {
      const res = await apiRequest("PUT", `/api/forms/staff-2026/person/${section}/${index}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t("staffProfile.saveSuccess"),
        description: t("staffProfile.dataSaved"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/forms/staff-2026"] });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("staffProfile.saveError"),
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (file: File, type: "identity" | "criminal") => {
    const setUploading = type === "identity" ? setUploadingIdentity : setUploadingCriminal;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", type === "identity" ? "identity_card" : "no_criminal_record");
      formData.append("section", section);
      formData.append("personIndex", index.toString());

      const response = await fetch("/api/forms/staff-2026/upload-document", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();
      
      if (personData) {
        const updatedData = {
          ...personData,
          [type === "identity" ? "identityCardFile" : "noCriminalRecordFile"]: result.filePath,
        };
        setPersonData(updatedData);
      }

      toast({
        title: t("staffProfile.uploadSuccess"),
        description: t("staffProfile.documentUploaded"),
      });

      queryClient.invalidateQueries({ queryKey: ["/api/forms/staff-2026"] });
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("staffProfile.uploadError"),
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

  const getRoleLabel = () => {
    switch (section) {
      case "owners":
        return t("staffForm.sections.owner");
      case "authorized":
        return t("staffForm.sections.authorized");
      case "managers":
        return t("staffForm.sections.manager");
      case "employees":
        return t("staffForm.sections.employee");
      default:
        return "";
    }
  };

  if (isLoadingStaff) {
    return (
      <SidebarProvider>
        <div className={`flex h-screen w-full ${language === 'ar' ? 'flex-row-reverse' : ''}`} dir={dir}>
          <OfficeSidebar key={`sidebar-${language}`} side={sidebarSide} />
          <SidebarInset className="flex-1 overflow-auto">
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                <p>{t("common.loading")}</p>
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
          <OfficeSidebar key={`sidebar-${language}`} side={sidebarSide} />
          <SidebarInset className="flex-1 overflow-auto">
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">{t("staffProfile.personNotFound")}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => navigate("/office/staff-2026")}
                >
                  {t("staffProfile.backToList")}
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
        <OfficeSidebar key={`sidebar-${language}`} side={sidebarSide} />
        <SidebarInset className="flex-1 overflow-auto">
          <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-background px-4 h-14">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-trigger" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/office/staff-2026")}
              >
                {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              </Button>
              <User className="h-5 w-5 text-primary" />
              <h1 className="font-semibold text-lg">{t("staffProfile.title")}</h1>
            </div>
            <Badge variant="secondary">{getRoleLabel()}</Badge>
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
                        {t("staffForm.fields.fullNameAr")}
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
                        {t("staffForm.fields.fullNameEn")}
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
                        {t("staffForm.fields.nationalId")}
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
                        {t("staffForm.fields.mobile")}
                      </Label>
                      <Input
                        value={personData.mobile}
                        onChange={(e) => setPersonData({ ...personData, mobile: e.target.value })}
                        dir="ltr"
                        data-testid="input-mobile"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("staffForm.fields.nationality")}</Label>
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
                      <Label>{t("staffForm.fields.gender")}</Label>
                      <Select
                        value={personData.gender}
                        onValueChange={(value) => setPersonData({ ...personData, gender: value })}
                      >
                        <SelectTrigger data-testid="select-gender">
                          <SelectValue placeholder={t("common.select")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ذكر">{t("staffForm.male")}</SelectItem>
                          <SelectItem value="أنثى">{t("staffForm.female")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("staffForm.fields.motherName")}</Label>
                      <Input
                        value={personData.motherName}
                        onChange={(e) => setPersonData({ ...personData, motherName: e.target.value })}
                        data-testid="input-motherName"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {t("staffForm.fields.birthDate")}
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
                      <Label>{t("staffForm.fields.socialSecurityNo")}</Label>
                      <Input
                        value={personData.socialSecurityNo || ""}
                        onChange={(e) => setPersonData({ ...personData, socialSecurityNo: e.target.value })}
                        dir="ltr"
                        data-testid="input-socialSecurityNo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("staffForm.fields.currentPosition")}</Label>
                      <Select
                        value={personData.currentPosition}
                        onValueChange={(value) => setPersonData({ ...personData, currentPosition: value })}
                      >
                        <SelectTrigger data-testid="select-position">
                          <SelectValue placeholder={t("common.select")} />
                        </SelectTrigger>
                        <SelectContent>
                          {positions.map((pos) => (
                            <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {t("staffForm.fields.startDate")}
                      </Label>
                      <Input
                        type="date"
                        value={personData.startDate}
                        onChange={(e) => setPersonData({ ...personData, startDate: e.target.value })}
                        max={new Date().toISOString().split("T")[0]}
                        dir="ltr"
                        data-testid="input-startDate"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        {t("staffForm.fields.branch")}
                      </Label>
                      <Select
                        value={personData.branch}
                        onValueChange={(value) => setPersonData({ ...personData, branch: value })}
                      >
                        <SelectTrigger data-testid="select-branch">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="الفرع الرئيسي">{t("staffForm.mainBranch")}</SelectItem>
                          {staffData?.branches?.map((b: any) => (
                            <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
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
                    {t("staffProfile.documents")}
                  </CardTitle>
                  <CardDescription>
                    {t("staffProfile.documentsDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center gap-2">
                        <IdCard className="w-5 h-5 text-primary" />
                        <Label className="font-medium">{t("staffProfile.identityCard")}</Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t("staffProfile.identityCardDescription")}
                      </p>
                      {personData.identityCardFile ? (
                        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-md">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          <span className="text-sm text-green-700 dark:text-green-400">
                            {t("staffProfile.documentUploaded")}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ms-auto text-primary"
                            onClick={() => window.open(`/api/documents/download/${personData.identityCardFile}`, "_blank")}
                          >
                            {t("common.view")}
                          </Button>
                        </div>
                      ) : (
                        <div className="relative">
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(file, "identity");
                            }}
                            disabled={uploadingIdentity}
                            data-testid="input-upload-identity"
                          />
                          <Button
                            variant="outline"
                            className="w-full"
                            disabled={uploadingIdentity}
                          >
                            {uploadingIdentity ? (
                              <Loader2 className="w-4 h-4 me-2 animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4 me-2" />
                            )}
                            {t("staffProfile.uploadIdentity")}
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-primary" />
                        <Label className="font-medium">{t("staffProfile.noCriminalRecord")}</Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t("staffProfile.noCriminalRecordDescription")}
                      </p>
                      {personData.noCriminalRecordFile ? (
                        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-md">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          <span className="text-sm text-green-700 dark:text-green-400">
                            {t("staffProfile.documentUploaded")}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ms-auto text-primary"
                            onClick={() => window.open(`/api/documents/download/${personData.noCriminalRecordFile}`, "_blank")}
                          >
                            {t("common.view")}
                          </Button>
                        </div>
                      ) : (
                        <div className="relative">
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(file, "criminal");
                            }}
                            disabled={uploadingCriminal}
                            data-testid="input-upload-criminal"
                          />
                          <Button
                            variant="outline"
                            className="w-full"
                            disabled={uploadingCriminal}
                          >
                            {uploadingCriminal ? (
                              <Loader2 className="w-4 h-4 me-2 animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4 me-2" />
                            )}
                            {t("staffProfile.uploadCriminalRecord")}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-between gap-4">
                <Button
                  variant="outline"
                  onClick={() => navigate("/office/staff-2026")}
                  data-testid="button-back"
                >
                  {isRTL ? <ArrowRight className="w-4 h-4 ms-2" /> : <ArrowLeft className="w-4 h-4 me-2" />}
                  {t("staffProfile.backToList")}
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
                  {t("staffProfile.saveChanges")}
                </Button>
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
