import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  Edit2, 
  Save, 
  ArrowRight, 
  ArrowLeft,
  Users,
  Building2,
  UserCheck,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Loader2
} from "lucide-react";

const personRowSchema = z.object({
  id: z.number().optional(),
  fullNameAr: z.string().min(1, "الاسم الرباعي مطلوب"),
  fullNameEn: z.string().min(1, "الاسم باللغة الإنجليزية مطلوب"),
  nationalId: z.string().min(1, "الرقم الوطني مطلوب"),
  socialSecurityNo: z.string().optional(),
  nationality: z.string().min(1, "الجنسية مطلوبة"),
  gender: z.string().min(1, "الجنس مطلوب"),
  motherName: z.string().min(1, "اسم الأم مطلوب"),
  mobile: z.string().min(1, "رقم الموبايل مطلوب"),
  birthDate: z.string().min(1, "تاريخ الميلاد مطلوب"),
  currentPosition: z.string().min(1, "الوظيفة الحالية مطلوبة"),
  startDate: z.string().min(1, "تاريخ مباشرة العمل مطلوب"),
  branch: z.string().min(1, "الفرع مطلوب"),
});

type PersonRow = z.infer<typeof personRowSchema>;

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
  "أردني",
  "سعودي",
  "إماراتي",
  "كويتي",
  "قطري",
  "عماني",
  "بحريني",
  "مصري",
  "سوري",
  "لبناني",
  "فلسطيني",
  "عراقي",
  "يمني",
  "سوداني",
  "مغربي",
  "جزائري",
  "تونسي",
  "ليبي",
  "أخرى",
];

const positions = [
  "شريك",
  "مفوض",
  "المدير المتفرغ",
  "مدير فرع",
  "مسؤول حجوزات",
  "خدمة عملاء",
  "محاسب",
  "سكرتير",
  "موظف استقبال",
  "مندوب مبيعات",
  "موظف إداري",
  "أخرى",
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
  const [editingRow, setEditingRow] = useState<{ section: string; index: number; data: PersonRow } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ section: string; index: number } | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [ownersPartners, setOwnersPartners] = useState<PersonRow[]>([{ ...emptyRow }]);
  const [authorizedSignatories, setAuthorizedSignatories] = useState<PersonRow[]>([]);
  const [dedicatedManagers, setDedicatedManagers] = useState<PersonRow[]>([{ ...emptyRow }]);
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
        title: "تم الحفظ بنجاح",
        description: `تم حفظ ${result.savedCount} من بيانات العاملين`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/forms/staff-2026"] });
      setValidationErrors([]);
    },
    onError: (error: any) => {
      const errors = error.errors || [error.message || "حدث خطأ أثناء الحفظ"];
      setValidationErrors(Array.isArray(errors) ? errors : [errors]);
      toast({
        title: "خطأ في الحفظ",
        description: "يرجى مراجعة الأخطاء وتصحيحها",
        variant: "destructive",
      });
    },
  });

  const handleAddRow = (section: string) => {
    const newRow = { ...emptyRow };
    switch (section) {
      case "owners":
        setOwnersPartners([...ownersPartners, newRow]);
        break;
      case "authorized":
        setAuthorizedSignatories([...authorizedSignatories, newRow]);
        break;
      case "managers":
        setDedicatedManagers([...dedicatedManagers, newRow]);
        break;
      case "employees":
        setEmployees([...employees, newRow]);
        break;
    }
  };

  const handleDeleteRow = (section: string, index: number) => {
    switch (section) {
      case "owners":
        if (ownersPartners.length > 1 || authorizedSignatories.length > 0) {
          setOwnersPartners(ownersPartners.filter((_, i) => i !== index));
        } else {
          toast({
            title: "لا يمكن الحذف",
            description: "مطلوب صف واحد على الأقل في مقطع المالك/الشركاء أو المفوّضين",
            variant: "destructive",
          });
        }
        break;
      case "authorized":
        if (authorizedSignatories.length > 0 || ownersPartners.length > 1) {
          setAuthorizedSignatories(authorizedSignatories.filter((_, i) => i !== index));
        }
        break;
      case "managers":
        if (dedicatedManagers.length > 1) {
          setDedicatedManagers(dedicatedManagers.filter((_, i) => i !== index));
        } else {
          toast({
            title: "لا يمكن الحذف",
            description: "مطلوب صف واحد على الأقل في مقطع المدير المتفرّغ",
            variant: "destructive",
          });
        }
        break;
      case "employees":
        setEmployees(employees.filter((_, i) => i !== index));
        break;
    }
    setDeleteConfirm(null);
  };

  const handleEditRow = (section: string, index: number) => {
    let data: PersonRow;
    switch (section) {
      case "owners":
        data = ownersPartners[index];
        break;
      case "authorized":
        data = authorizedSignatories[index];
        break;
      case "managers":
        data = dedicatedManagers[index];
        break;
      case "employees":
        data = employees[index];
        break;
      default:
        return;
    }
    setEditingRow({ section, index, data: { ...data } });
  };

  const handleSaveEdit = () => {
    if (!editingRow) return;
    
    const { section, index, data } = editingRow;
    switch (section) {
      case "owners":
        const newOwners = [...ownersPartners];
        newOwners[index] = data;
        setOwnersPartners(newOwners);
        break;
      case "authorized":
        const newAuthorized = [...authorizedSignatories];
        newAuthorized[index] = data;
        setAuthorizedSignatories(newAuthorized);
        break;
      case "managers":
        const newManagers = [...dedicatedManagers];
        newManagers[index] = data;
        setDedicatedManagers(newManagers);
        break;
      case "employees":
        const newEmployees = [...employees];
        newEmployees[index] = data;
        setEmployees(newEmployees);
        break;
    }
    setEditingRow(null);
  };

  const handleUpdateEditField = (field: keyof PersonRow, value: string) => {
    if (!editingRow) return;
    setEditingRow({
      ...editingRow,
      data: { ...editingRow.data, [field]: value },
    });
  };

  const handleInlineUpdate = (section: string, index: number, field: keyof PersonRow, value: string) => {
    switch (section) {
      case "owners":
        const newOwners = [...ownersPartners];
        newOwners[index] = { ...newOwners[index], [field]: value };
        setOwnersPartners(newOwners);
        break;
      case "authorized":
        const newAuthorized = [...authorizedSignatories];
        newAuthorized[index] = { ...newAuthorized[index], [field]: value };
        setAuthorizedSignatories(newAuthorized);
        break;
      case "managers":
        const newManagers = [...dedicatedManagers];
        newManagers[index] = { ...newManagers[index], [field]: value };
        setDedicatedManagers(newManagers);
        break;
      case "employees":
        const newEmployees = [...employees];
        newEmployees[index] = { ...newEmployees[index], [field]: value };
        setEmployees(newEmployees);
        break;
    }
  };

  const handleSubmit = () => {
    if (!consentAccepted) {
      toast({
        title: "الموافقة مطلوبة",
        description: "يجب الموافقة على صحة البيانات قبل الحفظ",
        variant: "destructive",
      });
      return;
    }

    const hasOwners = ownersPartners.some(r => r.fullNameAr.trim());
    const hasAuthorized = authorizedSignatories.some(r => r.fullNameAr.trim());
    const hasManagers = dedicatedManagers.some(r => r.fullNameAr.trim());

    if (!hasOwners && !hasAuthorized) {
      toast({
        title: "بيانات ناقصة",
        description: "مطلوب صف واحد على الأقل في مقطع المالك/الشركاء أو المفوّضين",
        variant: "destructive",
      });
      return;
    }

    if (!hasManagers) {
      toast({
        title: "بيانات ناقصة",
        description: "مطلوب صف واحد على الأقل في مقطع المدير المتفرّغ",
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
        return { data: ownersPartners, section: "owners", managersCount: 0 };
      case "authorized":
        return { data: authorizedSignatories, section: "authorized", managersCount: 0 };
      case "managers":
        return { data: dedicatedManagers, section: "managers", managersCount: 0 };
      case "employees":
        // Combine managers (shown first, read-only) with employees
        const validManagers = dedicatedManagers.filter(m => m.fullNameAr.trim());
        const combinedData = [...validManagers, ...employees];
        return { data: combinedData, section: "employees", managersCount: validManagers.length };
    }
  };

  const sections = [
    { key: "owners", icon: Building2, label: "المالك أو الشركاء حسب السجل التجاري", required: true },
    { key: "authorized", icon: UserCheck, label: "المفوّضون حسب السجل التجاري", required: false },
    { key: "managers", icon: Users, label: "المدير المتفرّغ للمكتب", required: true },
    { key: "employees", icon: Briefcase, label: "الموظفون", required: false },
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
                <p>جاري تحميل البيانات...</p>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  const { data: currentData, section: currentSection, managersCount } = getSectionData();

  return (
    <SidebarProvider>
      <div className={`flex h-screen w-full ${language === 'ar' ? 'flex-row-reverse' : ''}`} dir={dir}>
        <OfficeSidebar key={`sidebar-${language}`} side={sidebarSide} />
        <SidebarInset className="flex-1 overflow-auto">
          <header className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background px-4 h-14">
            <SidebarTrigger data-testid="button-sidebar-trigger" />
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h1 className="font-semibold text-lg">
                {language === "ar" ? "نموذج معلومات العاملين 2026" : "Staff Information Form 2026"}
              </h1>
            </div>
          </header>
          <main className="p-4 md:p-6">
            <div className="max-w-[1600px] mx-auto">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Users className="w-6 h-6" />
                    نموذج معلومات العاملين 2026
                  </CardTitle>
                  <CardDescription>
                    أدخل بيانات جميع العاملين في المكتب وفروعه
                  </CardDescription>
                </CardHeader>
              </Card>

        {validationErrors.length > 0 && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2 text-destructive">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold mb-2">أخطاء في البيانات:</p>
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
              <span className="text-sm">{sec.label}</span>
              {sec.required && <span className="text-xs text-red-500">*</span>}
            </Button>
          ))}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-end gap-4">
            <Button 
              onClick={() => handleAddRow(currentSection)}
              className="flex items-center gap-2"
              data-testid="button-add-row"
            >
              <Plus className="w-4 h-4" />
              إضافة صف
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">الاسم الرباعي</TableHead>
                    <TableHead className="min-w-[150px]">الاسم بالإنجليزية</TableHead>
                    <TableHead className="min-w-[120px]">الرقم الوطني</TableHead>
                    <TableHead className="min-w-[120px]">رقم الضمان</TableHead>
                    <TableHead className="min-w-[100px]">الجنسية</TableHead>
                    <TableHead className="min-w-[80px]">الجنس</TableHead>
                    <TableHead className="min-w-[120px]">اسم الأم</TableHead>
                    <TableHead className="min-w-[120px]">موبايل</TableHead>
                    <TableHead className="min-w-[120px]">تاريخ الميلاد</TableHead>
                    <TableHead className="min-w-[120px]">الوظيفة</TableHead>
                    <TableHead className="min-w-[120px]">تاريخ المباشرة</TableHead>
                    <TableHead className="min-w-[120px]">الفرع</TableHead>
                    <TableHead className="min-w-[100px]">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center text-muted-foreground py-8">
                        لا توجد بيانات. انقر على "إضافة صف" لإضافة بيانات جديدة.
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentData.map((row, index) => {
                      const isManagerRow = activeSection === "employees" && index < managersCount;
                      const actualIndex = isManagerRow ? index : (activeSection === "employees" ? index - managersCount : index);
                      const actualSection = isManagerRow ? "managers" : currentSection;
                      
                      return (
                      <TableRow key={index} className={isManagerRow ? "bg-primary/5" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Input
                              value={row.fullNameAr}
                              onChange={(e) => handleInlineUpdate(actualSection, actualIndex, "fullNameAr", e.target.value)}
                              placeholder="أحمد محمد علي خالد"
                              className="min-w-[150px]"
                              disabled={isManagerRow}
                              data-testid={`input-fullNameAr-${index}`}
                            />
                            {isManagerRow && (
                              <Badge variant="secondary" className="whitespace-nowrap text-xs">
                                مدير
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.fullNameEn}
                            onChange={(e) => handleInlineUpdate(actualSection, actualIndex, "fullNameEn", e.target.value)}
                            placeholder="Ahmad M. Ali"
                            className="min-w-[150px]"
                            dir="ltr"
                            disabled={isManagerRow}
                            data-testid={`input-fullNameEn-${index}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.nationalId}
                            onChange={(e) => handleInlineUpdate(actualSection, actualIndex, "nationalId", e.target.value)}
                            placeholder="1234567890"
                            className="min-w-[120px]"
                            dir="ltr"
                            disabled={isManagerRow}
                            data-testid={`input-nationalId-${index}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.socialSecurityNo || ""}
                            onChange={(e) => handleInlineUpdate(actualSection, actualIndex, "socialSecurityNo", e.target.value)}
                            placeholder="اختياري"
                            className="min-w-[120px]"
                            dir="ltr"
                            disabled={isManagerRow}
                            data-testid={`input-socialSecurityNo-${index}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={row.nationality}
                            onValueChange={(value) => handleInlineUpdate(actualSection, actualIndex, "nationality", value)}
                            disabled={isManagerRow}
                          >
                            <SelectTrigger className="min-w-[100px]" data-testid={`select-nationality-${index}`}>
                              <SelectValue placeholder="اختر" />
                            </SelectTrigger>
                            <SelectContent>
                              {nationalities.map((nat) => (
                                <SelectItem key={nat} value={nat}>{nat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={row.gender}
                            onValueChange={(value) => handleInlineUpdate(actualSection, actualIndex, "gender", value)}
                            disabled={isManagerRow}
                          >
                            <SelectTrigger className="min-w-[80px]" data-testid={`select-gender-${index}`}>
                              <SelectValue placeholder="اختر" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ذكر">ذكر</SelectItem>
                              <SelectItem value="أنثى">أنثى</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.motherName}
                            onChange={(e) => handleInlineUpdate(actualSection, actualIndex, "motherName", e.target.value)}
                            placeholder="اسم الأم"
                            className="min-w-[120px]"
                            disabled={isManagerRow}
                            data-testid={`input-motherName-${index}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.mobile}
                            onChange={(e) => handleInlineUpdate(actualSection, actualIndex, "mobile", e.target.value)}
                            placeholder="07XXXXXXXX"
                            className="min-w-[120px]"
                            dir="ltr"
                            disabled={isManagerRow}
                            data-testid={`input-mobile-${index}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={row.birthDate}
                            onChange={(e) => handleInlineUpdate(actualSection, actualIndex, "birthDate", e.target.value)}
                            className="min-w-[120px]"
                            dir="ltr"
                            max={new Date().toISOString().split("T")[0]}
                            disabled={isManagerRow}
                            data-testid={`input-birthDate-${index}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={row.currentPosition}
                            onValueChange={(value) => handleInlineUpdate(actualSection, actualIndex, "currentPosition", value)}
                            disabled={isManagerRow}
                          >
                            <SelectTrigger className="min-w-[120px]" data-testid={`select-position-${index}`}>
                              <SelectValue placeholder="اختر" />
                            </SelectTrigger>
                            <SelectContent>
                              {positions.map((pos) => (
                                <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={row.startDate}
                            onChange={(e) => handleInlineUpdate(actualSection, actualIndex, "startDate", e.target.value)}
                            className="min-w-[120px]"
                            dir="ltr"
                            max={new Date().toISOString().split("T")[0]}
                            disabled={isManagerRow}
                            data-testid={`input-startDate-${index}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={row.branch}
                            onValueChange={(value) => handleInlineUpdate(actualSection, actualIndex, "branch", value)}
                            disabled={isManagerRow}
                          >
                            <SelectTrigger className="min-w-[120px]" data-testid={`select-branch-${index}`}>
                              <SelectValue placeholder="اختر" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="الفرع الرئيسي">الفرع الرئيسي</SelectItem>
                              {staffData?.branches?.map((b: any) => (
                                <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {isManagerRow ? (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              من قسم المدراء
                            </span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteConfirm({ section: currentSection, index: actualIndex })}
                                className="text-destructive hover:text-destructive"
                                data-testid={`button-delete-${index}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );})
                  )}
                </TableBody>
              </Table>
            </div>
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
                  الموافقة الإلكترونية
                </Label>
                <p className="text-sm text-muted-foreground">
                  أُقرّ بصحة بيانات المالكين/المفوّضين/المدير/الموظفين، وأوافق على سياسة الخصوصية وشروط الجمعية.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-6 rtl:flex-row-reverse">
              <Button
                variant="outline"
                onClick={() => navigate("/office/dashboard")}
                data-testid="button-back"
              >
                <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
                العودة للوحة التحكم
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
                حفظ البيانات
              </Button>
            </div>
          </CardContent>
        </Card>

        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent dir={dir}>
            <DialogHeader>
              <DialogTitle>تأكيد الحذف</DialogTitle>
              <DialogDescription>
                هل أنت متأكد من حذف هذا الصف؟ لا يمكن التراجع عن هذا الإجراء.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                إلغاء
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirm && handleDeleteRow(deleteConfirm.section, deleteConfirm.index)}
                data-testid="button-confirm-delete"
              >
                حذف
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
