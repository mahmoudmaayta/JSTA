import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation, useLanguage } from "@/lib/i18n";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { OfficeSidebar } from "@/components/layout/office-sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Trash2, 
  Save, 
  ArrowRight,
  Users,
  Building2,
  UserCheck,
  Briefcase,
  AlertCircle,
  Loader2,
  Eye,
  User
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
}

const emptyRow: PersonRow = {
  fullNameAr: "",
  fullNameEn: "",
  nationalId: "",
  socialSecurityNo: "",
  nationality: "أردني",
  gender: "",
  motherName: "",
  mobile: "",
  birthDate: "",
  currentPosition: "",
  startDate: "",
  branch: "الفرع الرئيسي",
};

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

interface StaffFormData {
  ownersPartners: PersonRow[];
  authorizedSignatories: PersonRow[];
  dedicatedManagers: PersonRow[];
  employees: PersonRow[];
  consentAccepted: boolean;
}

export default function StaffForm2026() {
  const { t } = useTranslation();
  const { language, isRTL } = useLanguage();
  const sidebarSide = language === 'ar' ? 'right' : 'left';
  const dir = isRTL ? "rtl" : "ltr";
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const [activeSection, setActiveSection] = useState<"owners" | "authorized" | "managers" | "employees">("owners");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newPerson, setNewPerson] = useState<PersonRow>({ ...emptyRow });
  const [deleteConfirm, setDeleteConfirm] = useState<{ section: string; index: number } | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [ownersPartners, setOwnersPartners] = useState<PersonRow[]>([]);
  const [authorizedSignatories, setAuthorizedSignatories] = useState<PersonRow[]>([]);
  const [dedicatedManagers, setDedicatedManagers] = useState<PersonRow[]>([]);
  const [employees, setEmployees] = useState<PersonRow[]>([]);

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
      if (staffData.ownersPartners?.length > 0) {
        setOwnersPartners(staffData.ownersPartners);
      }
      if (staffData.authorizedSignatories?.length > 0) {
        setAuthorizedSignatories(staffData.authorizedSignatories);
      }
      if (staffData.dedicatedManagers?.length > 0) {
        setDedicatedManagers(staffData.dedicatedManagers);
      }
      if (staffData.employees?.length > 0) {
        setEmployees(staffData.employees);
      }
    }
  }, [staffData]);

  const saveMutation = useMutation({
    mutationFn: async (data: StaffFormData) => {
      const res = await apiRequest("POST", "/api/forms/staff-2026", data);
      return res.json();
    },
    onSuccess: (result: any) => {
      toast({
        title: t("staffForm.saveSuccess"),
        description: `${t("staffForm.savedCount")} ${result.savedCount}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/forms/staff-2026"] });
      setValidationErrors([]);
    },
    onError: (error: any) => {
      const errors = error.errors || [error.message || t("common.error")];
      setValidationErrors(Array.isArray(errors) ? errors : [errors]);
      toast({
        title: t("staffForm.saveError"),
        description: t("staffForm.reviewErrors"),
        variant: "destructive",
      });
    },
  });

  const handleAddPerson = () => {
    if (!newPerson.fullNameAr.trim() || !newPerson.nationalId.trim()) {
      toast({
        title: t("common.error"),
        description: t("staffForm.requiredFields"),
        variant: "destructive",
      });
      return;
    }

    switch (activeSection) {
      case "owners":
        setOwnersPartners([...ownersPartners, { ...newPerson }]);
        break;
      case "authorized":
        setAuthorizedSignatories([...authorizedSignatories, { ...newPerson }]);
        break;
      case "managers":
        setDedicatedManagers([...dedicatedManagers, { ...newPerson }]);
        break;
      case "employees":
        setEmployees([...employees, { ...newPerson }]);
        break;
    }

    setNewPerson({ ...emptyRow });
    setAddDialogOpen(false);
    toast({
      title: t("staffForm.personAdded"),
      description: newPerson.fullNameAr,
    });
  };

  const handleDeleteRow = (section: string, index: number) => {
    switch (section) {
      case "owners":
        setOwnersPartners(ownersPartners.filter((_, i) => i !== index));
        break;
      case "authorized":
        setAuthorizedSignatories(authorizedSignatories.filter((_, i) => i !== index));
        break;
      case "managers":
        setDedicatedManagers(dedicatedManagers.filter((_, i) => i !== index));
        break;
      case "employees":
        setEmployees(employees.filter((_, i) => i !== index));
        break;
    }
    setDeleteConfirm(null);
  };

  const handleSubmit = () => {
    if (!consentAccepted) {
      toast({
        title: t("staffForm.consentRequired"),
        description: t("staffForm.consentDescription"),
        variant: "destructive",
      });
      return;
    }

    const hasOwners = ownersPartners.some(r => r.fullNameAr.trim());
    const hasAuthorized = authorizedSignatories.some(r => r.fullNameAr.trim());
    const hasManagers = dedicatedManagers.some(r => r.fullNameAr.trim());

    if (!hasOwners && !hasAuthorized) {
      toast({
        title: t("staffForm.missingData"),
        description: t("staffForm.ownerOrAuthorizedRequired"),
        variant: "destructive",
      });
      return;
    }

    if (!hasManagers) {
      toast({
        title: t("staffForm.missingData"),
        description: t("staffForm.managerRequired"),
        variant: "destructive",
      });
      return;
    }

    saveMutation.mutate({
      ownersPartners: ownersPartners.filter(r => r.fullNameAr.trim()),
      authorizedSignatories: authorizedSignatories.filter(r => r.fullNameAr.trim()),
      dedicatedManagers: dedicatedManagers.filter(r => r.fullNameAr.trim()),
      employees: employees.filter(r => r.fullNameAr.trim()),
      consentAccepted,
    });
  };

  const getSectionData = () => {
    switch (activeSection) {
      case "owners":
        return { data: ownersPartners, section: "owners" };
      case "authorized":
        return { data: authorizedSignatories, section: "authorized" };
      case "managers":
        return { data: dedicatedManagers, section: "managers" };
      case "employees":
        return { data: employees, section: "employees" };
    }
  };

  const getRoleBadge = (section: string) => {
    switch (section) {
      case "owners":
        return <Badge variant="default">{t("staffForm.sections.owner")}</Badge>;
      case "authorized":
        return <Badge variant="secondary">{t("staffForm.sections.authorized")}</Badge>;
      case "managers":
        return <Badge className="bg-primary/80">{t("staffForm.sections.manager")}</Badge>;
      case "employees":
        return <Badge variant="outline">{t("staffForm.sections.employee")}</Badge>;
    }
  };

  const sections = [
    { key: "owners", icon: Building2, labelKey: "staffForm.sections.ownersLabel", required: true },
    { key: "authorized", icon: UserCheck, labelKey: "staffForm.sections.authorizedLabel", required: false },
    { key: "managers", icon: Users, labelKey: "staffForm.sections.managersLabel", required: true },
    { key: "employees", icon: Briefcase, labelKey: "staffForm.sections.employeesLabel", required: false },
  ];

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

  const { data: currentData, section: currentSection } = getSectionData();

  return (
    <SidebarProvider>
      <div className={`flex h-screen w-full ${language === 'ar' ? 'flex-row-reverse' : ''}`} dir={dir}>
        <OfficeSidebar key={`sidebar-${language}`} side={sidebarSide} />
        <SidebarInset className="flex-1 overflow-auto">
          <header className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background px-4 h-14">
            <SidebarTrigger data-testid="button-sidebar-trigger" />
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h1 className="font-semibold text-lg">{t("staffForm.title")}</h1>
            </div>
          </header>
          <main className="p-4 md:p-6">
            <div className="max-w-5xl mx-auto">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Users className="w-6 h-6" />
                    {t("staffForm.title")}
                  </CardTitle>
                  <CardDescription>{t("staffForm.subtitle")}</CardDescription>
                </CardHeader>
              </Card>

              {validationErrors.length > 0 && (
                <Card className="mb-6 border-destructive">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-2 text-destructive">
                      <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold mb-2">{t("staffForm.validationErrors")}</p>
                        <ul className="list-disc list-inside space-y-1">
                          {validationErrors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-6">
                {sections.map((sec) => (
                  <Button
                    key={sec.key}
                    variant={activeSection === sec.key ? "default" : "outline"}
                    className="flex items-center gap-2 justify-start h-auto py-3"
                    onClick={() => setActiveSection(sec.key as any)}
                    data-testid={`tab-${sec.key}`}
                  >
                    <sec.icon className="w-5 h-5" />
                    <span className="text-sm">{t(sec.labelKey)}</span>
                    {sec.required && <span className="text-xs text-red-500">*</span>}
                  </Button>
                ))}
              </div>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">{t(`staffForm.sections.${activeSection}Label`)}</CardTitle>
                    <CardDescription>
                      {currentData.length} {t("staffForm.persons")}
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => {
                      setNewPerson({ ...emptyRow });
                      setAddDialogOpen(true);
                    }}
                    className="flex items-center gap-2"
                    data-testid="button-add-person"
                  >
                    <Plus className="w-4 h-4" />
                    {t("staffForm.addPerson")}
                  </Button>
                </CardHeader>
                <CardContent>
                  {currentData.length === 0 ? (
                    <div className="flex items-center justify-center gap-3 py-3 text-muted-foreground text-sm">
                      <User className="w-5 h-5 opacity-50" />
                      <span>{t("staffForm.noData")}</span>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("staffForm.fields.fullName")}</TableHead>
                          <TableHead>{t("staffForm.fields.nationalId")}</TableHead>
                          <TableHead>{t("staffForm.fields.role")}</TableHead>
                          <TableHead>{t("staffForm.fields.mobile")}</TableHead>
                          <TableHead className="text-center">{t("common.actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentData.map((row, index) => (
                          <TableRow key={index} data-testid={`staff-row-${index}`}>
                            <TableCell className="font-medium">{row.fullNameAr}</TableCell>
                            <TableCell dir="ltr">{row.nationalId}</TableCell>
                            <TableCell>{getRoleBadge(currentSection)}</TableCell>
                            <TableCell dir="ltr">{row.mobile || "-"}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => navigate(`/office/staff/${currentSection}/${index}`)}
                                  data-testid={`button-view-profile-${index}`}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteConfirm({ section: currentSection, index })}
                                  className="text-destructive hover:text-destructive"
                                  data-testid={`button-delete-${index}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card className="mt-6">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 p-4 border rounded-lg bg-muted/50">
                    <Checkbox
                      id="consent"
                      checked={consentAccepted}
                      onCheckedChange={(checked) => setConsentAccepted(checked === true)}
                      data-testid="checkbox-consent"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="consent" className="text-base font-medium cursor-pointer">
                        {t("staffForm.electronicConsent")}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {t("staffForm.consentText")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-6 gap-4 flex-wrap">
                    <Button
                      variant="outline"
                      onClick={() => navigate("/office/dashboard")}
                      data-testid="button-back"
                    >
                      <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
                      {t("common.backToDashboard")}
                    </Button>
                    
                    <Button
                      onClick={handleSubmit}
                      disabled={saveMutation.isPending || !consentAccepted}
                      className="flex items-center gap-2"
                      data-testid="button-save"
                    >
                      {saveMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {t("staffForm.saveData")}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogContent dir={dir} className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{t("staffForm.addNewPerson")}</DialogTitle>
                    <DialogDescription>
                      {t("staffForm.fillPersonDetails")}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                      <Label>{t("staffForm.fields.fullNameAr")} *</Label>
                      <Input
                        value={newPerson.fullNameAr}
                        onChange={(e) => setNewPerson({ ...newPerson, fullNameAr: e.target.value })}
                        placeholder={t("staffForm.placeholders.fullNameAr")}
                        data-testid="input-fullNameAr"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("staffForm.fields.fullNameEn")}</Label>
                      <Input
                        value={newPerson.fullNameEn}
                        onChange={(e) => setNewPerson({ ...newPerson, fullNameEn: e.target.value })}
                        placeholder="Ahmad Mohammad Ali"
                        dir="ltr"
                        data-testid="input-fullNameEn"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("staffForm.fields.nationalId")} *</Label>
                      <Input
                        value={newPerson.nationalId}
                        onChange={(e) => setNewPerson({ ...newPerson, nationalId: e.target.value })}
                        placeholder="9XXXXXXXXX"
                        dir="ltr"
                        data-testid="input-nationalId"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("staffForm.fields.mobile")} *</Label>
                      <Input
                        value={newPerson.mobile}
                        onChange={(e) => setNewPerson({ ...newPerson, mobile: e.target.value })}
                        placeholder="07XXXXXXXX"
                        dir="ltr"
                        data-testid="input-mobile"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("staffForm.fields.nationality")}</Label>
                      <Select
                        value={newPerson.nationality}
                        onValueChange={(value) => setNewPerson({ ...newPerson, nationality: value })}
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
                        value={newPerson.gender}
                        onValueChange={(value) => setNewPerson({ ...newPerson, gender: value })}
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
                        value={newPerson.motherName}
                        onChange={(e) => setNewPerson({ ...newPerson, motherName: e.target.value })}
                        data-testid="input-motherName"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("staffForm.fields.birthDate")}</Label>
                      <Input
                        type="date"
                        value={newPerson.birthDate}
                        onChange={(e) => setNewPerson({ ...newPerson, birthDate: e.target.value })}
                        max={new Date().toISOString().split("T")[0]}
                        dir="ltr"
                        data-testid="input-birthDate"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("staffForm.fields.currentPosition")}</Label>
                      <Select
                        value={newPerson.currentPosition}
                        onValueChange={(value) => setNewPerson({ ...newPerson, currentPosition: value })}
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
                      <Label>{t("staffForm.fields.startDate")}</Label>
                      <Input
                        type="date"
                        value={newPerson.startDate}
                        onChange={(e) => setNewPerson({ ...newPerson, startDate: e.target.value })}
                        max={new Date().toISOString().split("T")[0]}
                        dir="ltr"
                        data-testid="input-startDate"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("staffForm.fields.socialSecurityNo")}</Label>
                      <Input
                        value={newPerson.socialSecurityNo || ""}
                        onChange={(e) => setNewPerson({ ...newPerson, socialSecurityNo: e.target.value })}
                        dir="ltr"
                        data-testid="input-socialSecurityNo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("staffForm.fields.branch")}</Label>
                      <Select
                        value={newPerson.branch}
                        onValueChange={(value) => setNewPerson({ ...newPerson, branch: value })}
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

                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                      {t("common.cancel")}
                    </Button>
                    <Button onClick={handleAddPerson} data-testid="button-confirm-add">
                      <Plus className="w-4 h-4 me-2" />
                      {t("staffForm.addPerson")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <DialogContent dir={dir}>
                  <DialogHeader>
                    <DialogTitle>{t("staffForm.confirmDelete")}</DialogTitle>
                    <DialogDescription>
                      {t("staffForm.deleteWarning")}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                      {t("common.cancel")}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => deleteConfirm && handleDeleteRow(deleteConfirm.section, deleteConfirm.index)}
                      data-testid="button-confirm-delete"
                    >
                      {t("common.delete")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
