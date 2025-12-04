import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation, useLanguage } from "@/lib/i18n";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/dialog";
import { 
  FileWarning, 
  Search, 
  Building2, 
  Eye,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  X,
  Phone,
  Mail,
  User,
  Calendar
} from "lucide-react";
import type { Office, CommitmentFormRecord, Complaint } from "@shared/schema";

interface CommitmentFormWithDetails extends CommitmentFormRecord {
  office?: Office;
  complaints?: Complaint[];
}

export default function AdminCommitmentDashboard() {
  const { t } = useTranslation();
  const { language, isRTL } = useLanguage();
  const dir = isRTL ? "rtl" : "ltr";
  const sidebarSide = language === 'ar' ? 'right' : 'left';

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHasComplaints, setSelectedHasComplaints] = useState<string>("all");
  const [selectedForm, setSelectedForm] = useState<CommitmentFormWithDetails | null>(null);

  const { data: formsData, isLoading } = useQuery<CommitmentFormWithDetails[]>({
    queryKey: ["/api/admin/commitment-forms"],
  });

  const { data: officesData } = useQuery<Office[]>({
    queryKey: ["/api/admin/offices"],
  });

  const officesMap = useMemo(() => {
    if (!officesData) return new Map<number, Office>();
    return new Map(officesData.map(office => [office.id, office]));
  }, [officesData]);

  const filteredForms = useMemo(() => {
    if (!formsData) return [];

    return formsData.filter((form) => {
      const office = form.office || officesMap.get(form.officeId);
      
      const matchesSearch =
        searchQuery === "" ||
        form.officeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        form.licenseNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        form.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        office?.tradeNameAr?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        office?.tradeNameEn?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesComplaintFilter =
        selectedHasComplaints === "all" ||
        (selectedHasComplaints === "yes" && form.hasComplaints) ||
        (selectedHasComplaints === "no" && !form.hasComplaints);

      return matchesSearch && matchesComplaintFilter;
    });
  }, [formsData, officesMap, searchQuery, selectedHasComplaints]);

  const stats = useMemo(() => {
    if (!formsData) return { total: 0, withComplaints: 0, withoutComplaints: 0 };
    
    return {
      total: formsData.length,
      withComplaints: formsData.filter(f => f.hasComplaints).length,
      withoutComplaints: formsData.filter(f => !f.hasComplaints).length,
    };
  }, [formsData]);

  const totalComplaints = useMemo(() => {
    if (!formsData) return 0;
    return formsData.reduce((acc, form) => acc + (form.complaints?.length || 0), 0);
  }, [formsData]);

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === "ar" ? "ar-JO" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getAuthorityBadge = (authority: string) => {
    const colors: Record<string, string> = {
      "الجمعية": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      "الوزارة": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      "أخرى": "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400",
    };
    return colors[authority] || colors["أخرى"];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full" dir={dir}>
        <AdminSidebar key={`sidebar-${language}`} side={sidebarSide} />
        <SidebarInset className="flex-1 overflow-auto">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <SidebarTrigger data-testid="button-sidebar-trigger" />
            <div className="flex items-center gap-2">
              <FileWarning className="h-5 w-5 text-primary" />
              <h1 className="font-semibold text-lg">
                {language === "ar" ? "لوحة الالتزامات والشكاوى" : "Commitment Forms Dashboard"}
              </h1>
            </div>
          </header>

          <main className="p-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <FileWarning className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.total}</p>
                      <p className="text-sm text-muted-foreground">
                        {language === "ar" ? "إجمالي النماذج" : "Total Forms"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.withComplaints}</p>
                      <p className="text-sm text-muted-foreground">
                        {language === "ar" ? "مكاتب لديها شكاوى" : "With Complaints"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.withoutComplaints}</p>
                      <p className="text-sm text-muted-foreground">
                        {language === "ar" ? "مكاتب بدون شكاوى" : "No Complaints"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totalComplaints}</p>
                      <p className="text-sm text-muted-foreground">
                        {language === "ar" ? "إجمالي الشكاوى" : "Total Complaints"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileWarning className="w-5 h-5" />
                      {language === "ar" ? "نماذج الالتزام المقدمة" : "Submitted Commitment Forms"}
                    </CardTitle>
                    <CardDescription>
                      {language === "ar" 
                        ? "عرض جميع نماذج الالتزام والشكاوى المقدمة من المكاتب"
                        : "View all commitment forms and complaints submitted by offices"
                      }
                    </CardDescription>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder={language === "ar" ? "بحث..." : "Search..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="ps-9"
                        data-testid="input-search"
                      />
                    </div>
                    
                    <Select value={selectedHasComplaints} onValueChange={setSelectedHasComplaints}>
                      <SelectTrigger className="w-40" data-testid="select-complaints-filter">
                        <SelectValue placeholder={language === "ar" ? "حالة الشكاوى" : "Complaints"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{language === "ar" ? "الكل" : "All"}</SelectItem>
                        <SelectItem value="yes">{language === "ar" ? "لديها شكاوى" : "Has Complaints"}</SelectItem>
                        <SelectItem value="no">{language === "ar" ? "بدون شكاوى" : "No Complaints"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === "ar" ? "اسم المكتب" : "Office Name"}</TableHead>
                        <TableHead>{language === "ar" ? "رقم الترخيص" : "License No."}</TableHead>
                        <TableHead>{language === "ar" ? "المسؤول" : "Contact"}</TableHead>
                        <TableHead>{language === "ar" ? "حالة الشكاوى" : "Complaints"}</TableHead>
                        <TableHead>{language === "ar" ? "تاريخ التقديم" : "Submitted"}</TableHead>
                        <TableHead className="w-24">{language === "ar" ? "الإجراءات" : "Actions"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredForms.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            {language === "ar" ? "لا توجد نماذج للعرض" : "No forms to display"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredForms.map((form) => {
                          const office = form.office || officesMap.get(form.officeId);
                          return (
                            <TableRow key={form.id} data-testid={`row-form-${form.id}`}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Building2 className="w-4 h-4 text-muted-foreground" />
                                  <div>
                                    <p className="font-medium">{form.officeName || office?.tradeNameAr}</p>
                                    {office?.tradeNameEn && (
                                      <p className="text-sm text-muted-foreground ltr">{office.tradeNameEn}</p>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-mono text-sm">{form.licenseNo}</span>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="text-sm">{form.contactName}</p>
                                  <p className="text-xs text-muted-foreground ltr">{form.contactEmail}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                {form.hasComplaints ? (
                                  <Badge variant="destructive" className="gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    {form.complaints?.length || 0} {language === "ar" ? "شكوى" : "complaints"}
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                    <CheckCircle2 className="w-3 h-3 me-1" />
                                    {language === "ar" ? "لا يوجد" : "None"}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">{formatDate(form.submittedAt)}</span>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedForm(form)}
                                  data-testid={`button-view-form-${form.id}`}
                                >
                                  <Eye className="w-4 h-4 me-1" />
                                  {language === "ar" ? "عرض" : "View"}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </main>
        </SidebarInset>
      </div>
      <Dialog open={!!selectedForm} onOpenChange={() => setSelectedForm(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" dir={dir}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <FileWarning className="w-5 h-5 text-primary" />
                {language === "ar" ? "تفاصيل نموذج الالتزام" : "Commitment Form Details"}
              </DialogTitle>
            </div>
          </DialogHeader>

          {selectedForm && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    {language === "ar" ? "معلومات المكتب" : "Office Information"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">{language === "ar" ? "اسم المكتب" : "Office Name"}</p>
                    <p className="font-medium">{selectedForm.officeName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{language === "ar" ? "رقم الترخيص" : "License No."}</p>
                    <p className="font-medium font-mono">{selectedForm.licenseNo}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">{language === "ar" ? "المسؤول" : "Contact"}</p>
                      <p className="font-medium">{selectedForm.contactName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">{language === "ar" ? "البريد" : "Email"}</p>
                      <p className="font-medium ltr">{selectedForm.contactEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">{language === "ar" ? "الموبايل" : "Mobile"}</p>
                      <p className="font-medium ltr">{selectedForm.contactMobile}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">{language === "ar" ? "تاريخ التقديم" : "Submitted"}</p>
                      <p className="font-medium">{formatDate(selectedForm.submittedAt)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {language === "ar" ? "حالة الشكاوى" : "Complaints Status"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedForm.hasComplaints && selectedForm.complaints && selectedForm.complaints.length > 0 ? (
                    <div className="space-y-4">
                      <Badge variant="destructive" className="mb-4">
                        {selectedForm.complaints.length} {language === "ar" ? "شكوى مسجلة" : "complaint(s) registered"}
                      </Badge>
                      
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{language === "ar" ? "رقم الشكوى" : "Complaint No."}</TableHead>
                            <TableHead>{language === "ar" ? "الجهة" : "Authority"}</TableHead>
                            <TableHead>{language === "ar" ? "تاريخ التبليغ" : "Notified"}</TableHead>
                            <TableHead>{language === "ar" ? "ملخص" : "Summary"}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedForm.complaints.map((complaint, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-mono">{complaint.complaintNumber}</TableCell>
                              <TableCell>
                                <Badge className={getAuthorityBadge(complaint.authority)}>
                                  {complaint.authority}
                                </Badge>
                              </TableCell>
                              <TableCell>{complaint.notifiedAt}</TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {complaint.summary || "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="w-5 h-5" />
                      <p>{language === "ar" ? "لا توجد شكاوى مسجلة على هذا المكتب" : "No complaints registered for this office"}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
