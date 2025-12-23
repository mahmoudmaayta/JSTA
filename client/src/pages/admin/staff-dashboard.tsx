import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation, useLanguage } from "@/lib/i18n";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Search, 
  Filter, 
  Building2, 
  Download, 
  X,
  Eye,
  Loader2,
  UserCheck,
  Briefcase,
  User
} from "lucide-react";
import type { Office, Person, RoleInOffice } from "@shared/schema";

interface StaffDataItem {
  person: Partial<Person>;
  role: Partial<RoleInOffice> & { description?: string };
  office: Partial<Office>;
  workHistory?: {
    dateIn?: string;
    dateOut?: string;
    jobTitle?: number;
    description?: string;
  };
}

interface StaffResponse {
  data: StaffDataItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AdminStaffDashboard() {
  const { t } = useTranslation();
  const { language, isRTL } = useLanguage();
  const dir = isRTL ? "rtl" : "ltr";
  const sidebarSide = language === 'ar' ? 'right' : 'left';
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOffice, setSelectedOffice] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedNationality, setSelectedNationality] = useState<string>("all");
  const [selectedPerson, setSelectedPerson] = useState<StaffDataItem | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const { data: officesData, isLoading: isLoadingOffices } = useQuery<Office[]>({
    queryKey: ["/api/admin/offices"],
  });

  const [officeSearchQuery, setOfficeSearchQuery] = useState("");

  const { data: staffResponse, isLoading: isLoadingStaff } = useQuery<StaffResponse>({
    queryKey: ["/api/admin/staff", currentPage, searchQuery, selectedOffice],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });
      if (searchQuery) params.set("search", searchQuery);
      if (selectedOffice !== "all") params.set("officeId", selectedOffice);
      
      const response = await fetch(`/api/admin/staff?${params}`);
      if (!response.ok) throw new Error("Failed to fetch staff");
      return response.json();
    },
  });

  const staffData = staffResponse?.data || [];
  const totalStaff = staffResponse?.total || 0;
  const totalPages = staffResponse?.totalPages || 1;

  const filteredStaff = useMemo(() => {
    if (!staffData) return [];

    return staffData.filter((item) => {
      const matchesRole =
        selectedRole === "all" || item.role?.roleType === selectedRole;

      const matchesNationality =
        selectedNationality === "all" || item.person.nationality === selectedNationality;

      return matchesRole && matchesNationality;
    });
  }, [staffData, selectedRole, selectedNationality]);

  const uniqueNationalities = useMemo(() => {
    if (!staffData) return [];
    const nationalities = new Set(staffData.map((item) => item.person.nationality).filter(Boolean));
    return Array.from(nationalities).sort();
  }, [staffData]);

  const filteredOffices = useMemo(() => {
    if (!officesData) return [];
    if (!officeSearchQuery.trim()) return officesData;
    
    const query = officeSearchQuery.toLowerCase();
    return officesData.filter(office => 
      office.tradeNameAr?.toLowerCase().includes(query) ||
      office.tradeNameEn?.toLowerCase().includes(query)
    );
  }, [officesData, officeSearchQuery]);

  const roleTypeLabels: Record<string, { ar: string; en: string }> = {
    OWNER_PARTNER: { ar: "مالك/شريك", en: "Owner/Partner" },
    AUTHORIZED_SIGNATORY: { ar: "مفوّض", en: "Authorized" },
    DEDICATED_MANAGER: { ar: "مدير متفرّغ", en: "Dedicated Manager" },
    EMPLOYEE: { ar: "موظف", en: "Employee" },
  };

  const getRoleLabel = (roleType: string) => {
    const label = roleTypeLabels[roleType];
    return language === "ar" ? label?.ar || roleType : label?.en || roleType;
  };

  const getRoleBadgeVariant = (roleType: string) => {
    switch (roleType) {
      case "OWNER_PARTNER":
        return "default";
      case "AUTHORIZED_SIGNATORY":
        return "secondary";
      case "DEDICATED_MANAGER":
        return "outline";
      default:
        return "outline";
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedOffice("all");
    setSelectedRole("all");
    setSelectedNationality("all");
  };

  const exportToCSV = () => {
    if (!filteredStaff.length) {
      toast({
        title: language === "ar" ? "لا توجد بيانات" : "No Data",
        description: language === "ar" ? "لا توجد بيانات للتصدير" : "No data to export",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      "Office Name",
      "Full Name (Arabic)",
      "Full Name (English)",
      "National ID",
      "Social Security",
      "Nationality",
      "Gender",
      "Mother's Name",
      "Mobile",
      "Birth Date",
      "Position",
      "Start Date",
      "Branch",
      "Role Type",
    ];

    const csvContent = [
      headers.join(","),
      ...filteredStaff.map((item) =>
        [
          `"${item.office.tradeNameAr || ""}"`,
          `"${item.person.fullNameAr || ""}"`,
          `"${item.person.fullNameEn || ""}"`,
          `"${item.person.nationalId || ""}"`,
          `"${item.person.socialSecurityNo || ""}"`,
          `"${item.person.nationality || ""}"`,
          `"${item.person.gender || ""}"`,
          `"${item.person.motherName || ""}"`,
          `"${item.person.mobile || ""}"`,
          `"${item.person.birthDate || ""}"`,
          `"${item.person.currentPosition || ""}"`,
          `"${item.person.startDate || ""}"`,
          `"${item.person.branch || ""}"`,
          `"${getRoleLabel(item.role?.roleType || 'EMPLOYEE')}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `staff_report_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const isLoading = isLoadingOffices || isLoadingStaff;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full" dir={dir}>
        <AdminSidebar key={`sidebar-${language}`} side={sidebarSide} />
        <SidebarInset className="flex-1 overflow-auto">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold">
                {language === "ar" ? "لوحة بيانات العاملين" : "Staff Dashboard"}
              </h1>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      {language === "ar" ? "بحث وتصفية" : "Search & Filter"}
                    </CardTitle>
                    <CardDescription>
                      {language === "ar"
                        ? "ابحث عن العاملين وفلتر النتائج حسب المكتب أو الدور"
                        : "Search for staff and filter results by office or role"}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={exportToCSV}
                    className="flex items-center gap-2"
                    data-testid="button-export-csv"
                  >
                    <Download className="w-4 h-4" />
                    {language === "ar" ? "تصدير CSV" : "Export CSV"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="search">
                      {language === "ar" ? "البحث" : "Search"}
                    </Label>
                    <div className="relative">
                      <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={language === "ar" ? "ابحث بالاسم أو الرقم الوطني أو الموبايل..." : "Search by name, national ID, or mobile..."}
                        className="ps-9"
                        data-testid="input-search"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>{language === "ar" ? "المكتب" : "Office"}</Label>
                    <Select value={selectedOffice} onValueChange={(value) => {
                      setSelectedOffice(value);
                      setOfficeSearchQuery("");
                    }}>
                      <SelectTrigger data-testid="select-office">
                        <SelectValue placeholder={language === "ar" ? "جميع المكاتب" : "All Offices"} />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="p-2 border-b">
                          <div className="relative">
                            <Search className="absolute start-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              value={officeSearchQuery}
                              onChange={(e) => setOfficeSearchQuery(e.target.value)}
                              placeholder={language === "ar" ? "ابحث عن مكتب..." : "Search office..."}
                              className="ps-8 h-8"
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                              data-testid="input-office-search"
                            />
                          </div>
                        </div>
                        <SelectItem value="all">{language === "ar" ? "جميع المكاتب" : "All Offices"}</SelectItem>
                        {isLoadingOffices ? (
                          <div className="p-2 text-center text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                          </div>
                        ) : filteredOffices.length === 0 ? (
                          <div className="p-2 text-center text-muted-foreground text-sm">
                            {language === "ar" ? "لا توجد مكاتب مطابقة" : "No matching offices"}
                          </div>
                        ) : (
                          filteredOffices.map((office) => (
                            <SelectItem key={office.id} value={office.id.toString()}>
                              <div className="flex flex-col">
                                <span>{office.tradeNameAr}</span>
                                {office.tradeNameEn && (
                                  <span className="text-xs text-muted-foreground">{office.tradeNameEn}</span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>{language === "ar" ? "الدور" : "Role"}</Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger data-testid="select-role">
                        <SelectValue placeholder={language === "ar" ? "جميع الأدوار" : "All Roles"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{language === "ar" ? "جميع الأدوار" : "All Roles"}</SelectItem>
                        {Object.entries(roleTypeLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {language === "ar" ? label.ar : label.en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>{language === "ar" ? "الجنسية" : "Nationality"}</Label>
                    <Select value={selectedNationality} onValueChange={setSelectedNationality}>
                      <SelectTrigger data-testid="select-nationality">
                        <SelectValue placeholder={language === "ar" ? "جميع الجنسيات" : "All Nationalities"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{language === "ar" ? "جميع الجنسيات" : "All Nationalities"}</SelectItem>
                        {uniqueNationalities.map((nat) => (
                          <SelectItem key={nat} value={nat as string}>
                            {nat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(searchQuery || selectedOffice !== "all" || selectedRole !== "all" || selectedNationality !== "all") && (
                  <div className="mt-4 flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <Filter className="w-3 h-3" />
                      {filteredStaff.length} {language === "ar" ? "نتيجة" : "results"}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={resetFilters} data-testid="button-reset-filters">
                      <X className="w-4 h-4 me-1" />
                      {language === "ar" ? "مسح الفلاتر" : "Clear Filters"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="ms-2">{language === "ar" ? "جاري التحميل..." : "Loading..."}</span>
                  </div>
                ) : filteredStaff.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">
                      {language === "ar" ? "لا توجد بيانات" : "No Data Found"}
                    </p>
                    <p className="text-sm">
                      {language === "ar"
                        ? "جرّب تغيير معايير البحث أو الفلترة"
                        : "Try changing your search or filter criteria"}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[150px]">{language === "ar" ? "المكتب" : "Office"}</TableHead>
                          <TableHead className="min-w-[150px]">{language === "ar" ? "الاسم الرباعي" : "Full Name (AR)"}</TableHead>
                          <TableHead className="min-w-[150px]">{language === "ar" ? "الاسم بالإنجليزية" : "Full Name (EN)"}</TableHead>
                          <TableHead className="min-w-[120px]">{language === "ar" ? "الرقم الوطني" : "National ID"}</TableHead>
                          <TableHead className="min-w-[100px]">{language === "ar" ? "الجنسية" : "Nationality"}</TableHead>
                          <TableHead className="min-w-[120px]">{language === "ar" ? "الوظيفة" : "Position"}</TableHead>
                          <TableHead className="min-w-[100px]">{language === "ar" ? "الدور" : "Role"}</TableHead>
                          <TableHead className="min-w-[80px]">{language === "ar" ? "إجراءات" : "Actions"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStaff.map((item, index) => (
                          <TableRow key={`${item.person.id}-${item.role.id}-${index}`}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-muted-foreground" />
                                {item.office.tradeNameAr}
                              </div>
                            </TableCell>
                            <TableCell>{item.person.fullNameAr}</TableCell>
                            <TableCell dir="ltr">{item.person.fullNameEn}</TableCell>
                            <TableCell dir="ltr">{item.person.nationalId}</TableCell>
                            <TableCell>{item.person.nationality}</TableCell>
                            <TableCell>{item.person.job || item.workHistory?.description || item.person.currentPosition || "-"}</TableCell>
                            <TableCell>
                              <Badge variant={getRoleBadgeVariant(item.role?.roleType || 'EMPLOYEE')}>
                                {getRoleLabel(item.role?.roleType || 'EMPLOYEE')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedPerson(item)}
                                data-testid={`button-view-${index}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
                      <div className="text-sm text-muted-foreground">
                        {language === "ar" 
                          ? `عرض ${filteredStaff.length} من ${totalStaff} موظف`
                          : `Showing ${filteredStaff.length} of ${totalStaff} employees`}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage <= 1}
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          data-testid="button-prev-page"
                        >
                          {language === "ar" ? "السابق" : "Previous"}
                        </Button>
                        <span className="text-sm">
                          {language === "ar" 
                            ? `صفحة ${currentPage} من ${totalPages}`
                            : `Page ${currentPage} of ${totalPages}`}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage >= totalPages}
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          data-testid="button-next-page"
                        >
                          {language === "ar" ? "التالي" : "Next"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </main>
        </SidebarInset>
      </div>

      <Dialog open={!!selectedPerson} onOpenChange={() => setSelectedPerson(null)}>
        <DialogContent className="max-w-2xl" dir={dir}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {language === "ar" ? "تفاصيل الموظف" : "Staff Details"}
            </DialogTitle>
            <DialogDescription>
              {selectedPerson?.office.tradeNameAr}
            </DialogDescription>
          </DialogHeader>
          {selectedPerson && (
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div>
                <Label className="text-muted-foreground">{language === "ar" ? "الاسم الرباعي" : "Full Name (Arabic)"}</Label>
                <p className="font-medium">{selectedPerson.person.fullNameAr}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{language === "ar" ? "الاسم بالإنجليزية" : "Full Name (English)"}</Label>
                <p className="font-medium" dir="ltr">{selectedPerson.person.fullNameEn}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{language === "ar" ? "الرقم الوطني" : "National ID"}</Label>
                <p className="font-medium" dir="ltr">{selectedPerson.person.nationalId}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{language === "ar" ? "رقم الضمان" : "Social Security"}</Label>
                <p className="font-medium" dir="ltr">{selectedPerson.person.socialSecurityNo || "-"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{language === "ar" ? "الجنسية" : "Nationality"}</Label>
                <p className="font-medium">{selectedPerson.person.nationality}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{language === "ar" ? "الجنس" : "Gender"}</Label>
                <p className="font-medium">{selectedPerson.person.gender}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{language === "ar" ? "اسم الأم" : "Mother's Name"}</Label>
                <p className="font-medium">{selectedPerson.person.motherName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{language === "ar" ? "الموبايل" : "Mobile"}</Label>
                <p className="font-medium" dir="ltr">{selectedPerson.person.mobile}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{language === "ar" ? "تاريخ الميلاد" : "Birth Date"}</Label>
                <p className="font-medium">{selectedPerson.person.birthDate}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{language === "ar" ? "الوظيفة الحالية" : "Current Position"}</Label>
                <p className="font-medium">{selectedPerson.person.currentPosition}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{language === "ar" ? "تاريخ المباشرة" : "Start Date"}</Label>
                <p className="font-medium">{selectedPerson.person.startDate}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{language === "ar" ? "الفرع" : "Branch"}</Label>
                <p className="font-medium">{selectedPerson.person.branch || "-"}</p>
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground">{language === "ar" ? "الدور" : "Role"}</Label>
                <div className="mt-1">
                  <Badge variant={getRoleBadgeVariant(selectedPerson.role?.roleType || 'EMPLOYEE')} className="text-sm">
                    {getRoleLabel(selectedPerson.role?.roleType || 'EMPLOYEE')}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
