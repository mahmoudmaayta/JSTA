import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LoadingPage } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Inspection, Office } from "@shared/schema";
import { 
  Search, 
  ClipboardCheck, 
  Plus, 
  Eye, 
  MapPin, 
  Calendar, 
  User, 
  Building2, 
  Camera, 
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

type InspectionWithOffice = Inspection & {
  officeName?: string;
  officeNameEn?: string;
};

export default function FieldInspection() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>("");
  const [inspectorName, setInspectorName] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [notes, setNotes] = useState("");
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const sidebarSide = language === 'ar' ? 'right' : 'left';

  const { data: inspections, isLoading } = useQuery<InspectionWithOffice[]>({
    queryKey: ["/api/admin/inspections"],
  });

  const { data: offices } = useQuery<Office[]>({
    queryKey: ["/api/admin/offices"],
  });

  const createInspectionMutation = useMutation({
    mutationFn: async (data: { officeId: number; inspectorName: string; scheduledDate: string; notes: string }) => {
      return apiRequest("POST", "/api/admin/inspections", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/inspections"] });
      setIsCreateDialogOpen(false);
      setSelectedOfficeId("");
      setInspectorName("");
      setScheduledDate("");
      setNotes("");
      toast({
        title: language === 'ar' ? "تم إنشاء الكشف الحسي" : "Inspection Created",
        description: language === 'ar' ? "تم إنشاء طلب الكشف الحسي بنجاح" : "Field inspection request created successfully",
      });
    },
    onError: () => {
      toast({
        title: language === 'ar' ? "خطأ" : "Error",
        description: language === 'ar' ? "حدث خطأ أثناء إنشاء الكشف الحسي" : "Failed to create inspection",
        variant: "destructive",
      });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest("PATCH", `/api/admin/inspections/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/inspections"] });
      toast({
        title: language === 'ar' ? "تم التحديث" : "Updated",
        description: language === 'ar' ? "تم تحديث حالة الكشف بنجاح" : "Inspection status updated successfully",
      });
    }
  });

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; icon: any; label: string; labelAr: string }> = {
      PENDING: { variant: "secondary", icon: Clock, label: "Pending", labelAr: "معلق" },
      SCHEDULED: { variant: "outline", icon: Calendar, label: "Scheduled", labelAr: "مجدول" },
      IN_PROGRESS: { variant: "default", icon: AlertCircle, label: "In Progress", labelAr: "قيد التنفيذ" },
      COMPLETED: { variant: "default", icon: CheckCircle2, label: "Completed", labelAr: "مكتمل" },
      CANCELLED: { variant: "destructive", icon: XCircle, label: "Cancelled", labelAr: "ملغي" },
    };
    const config = statusConfig[status] || statusConfig.PENDING;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {language === 'ar' ? config.labelAr : config.label}
      </Badge>
    );
  };

  const filteredInspections = inspections?.filter((inspection) => {
    const matchesStatus = statusFilter === "all" || inspection.status === statusFilter;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      inspection.officeName?.toLowerCase().includes(searchLower) ||
      inspection.officeNameEn?.toLowerCase().includes(searchLower) ||
      inspection.inspectorName?.toLowerCase().includes(searchLower) ||
      inspection.city?.toLowerCase().includes(searchLower);
    return matchesStatus && matchesSearch;
  }) || [];

  const totalCount = inspections?.length || 0;
  const pendingCount = inspections?.filter(i => i.status === 'PENDING').length || 0;
  const scheduledCount = inspections?.filter(i => i.status === 'SCHEDULED').length || 0;
  const completedCount = inspections?.filter(i => i.status === 'COMPLETED').length || 0;

  const handleCreateInspection = () => {
    if (!selectedOfficeId || !scheduledDate) {
      toast({
        title: language === 'ar' ? "خطأ" : "Error",
        description: language === 'ar' ? "يرجى تعبئة جميع الحقول المطلوبة" : "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }
    createInspectionMutation.mutate({
      officeId: parseInt(selectedOfficeId),
      inspectorName,
      scheduledDate,
      notes
    });
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <AdminSidebar key={`sidebar-${language}`} side={sidebarSide} />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold">{t("navigation.fieldInspection")}</h1>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6">
            {isLoading ? (
              <LoadingPage message={language === 'ar' ? 'جاري التحميل...' : 'Loading...'} />
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">
                      {language === 'ar' ? 'الكشف الحسي' : 'Field Inspection'}
                    </h2>
                    <p className="text-muted-foreground">
                      {language === 'ar' ? 'إدارة زيارات الكشف الميداني للمكاتب' : 'Manage field inspection visits for offices'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <ClipboardCheck className="h-3 w-3" />
                      {totalCount} {language === 'ar' ? 'كشف' : 'Inspections'}
                    </Badge>
                    <Badge variant="outline" className="gap-1 text-yellow-600">
                      <Clock className="h-3 w-3" />
                      {pendingCount} {language === 'ar' ? 'معلق' : 'Pending'}
                    </Badge>
                    <Badge variant="outline" className="gap-1 text-green-600">
                      <CheckCircle2 className="h-3 w-3" />
                      {completedCount} {language === 'ar' ? 'مكتمل' : 'Completed'}
                    </Badge>
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                      <DialogTrigger asChild>
                        <Button data-testid="button-create-inspection">
                          <Plus className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                          {language === 'ar' ? 'كشف جديد' : 'New Inspection'}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                          <DialogTitle>
                            {language === 'ar' ? 'إنشاء كشف حسي جديد' : 'Create New Field Inspection'}
                          </DialogTitle>
                          <DialogDescription>
                            {language === 'ar' ? 'أدخل بيانات الكشف الحسي الجديد' : 'Enter the details for the new field inspection'}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="office">
                              {language === 'ar' ? 'المكتب' : 'Office'} *
                            </Label>
                            <Select value={selectedOfficeId} onValueChange={setSelectedOfficeId}>
                              <SelectTrigger data-testid="select-office">
                                <SelectValue placeholder={language === 'ar' ? 'اختر المكتب' : 'Select office'} />
                              </SelectTrigger>
                              <SelectContent>
                                {offices?.map((office) => (
                                  <SelectItem key={office.id} value={office.id.toString()}>
                                    {language === 'ar' ? office.tradeNameAr : (office.tradeNameEn || office.tradeNameAr)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="inspector">
                              {language === 'ar' ? 'اسم المفتش' : 'Inspector Name'}
                            </Label>
                            <Input
                              id="inspector"
                              value={inspectorName}
                              onChange={(e) => setInspectorName(e.target.value)}
                              placeholder={language === 'ar' ? 'أدخل اسم المفتش' : 'Enter inspector name'}
                              data-testid="input-inspector-name"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="date">
                              {language === 'ar' ? 'تاريخ الزيارة المجدول' : 'Scheduled Visit Date'} *
                            </Label>
                            <Input
                              id="date"
                              type="date"
                              value={scheduledDate}
                              onChange={(e) => setScheduledDate(e.target.value)}
                              data-testid="input-scheduled-date"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="notes">
                              {language === 'ar' ? 'ملاحظات' : 'Notes'}
                            </Label>
                            <Textarea
                              id="notes"
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder={language === 'ar' ? 'أدخل ملاحظات إضافية' : 'Enter additional notes'}
                              data-testid="input-notes"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                            {language === 'ar' ? 'إلغاء' : 'Cancel'}
                          </Button>
                          <Button 
                            onClick={handleCreateInspection}
                            disabled={createInspectionMutation.isPending}
                            data-testid="button-submit-inspection"
                          >
                            {createInspectionMutation.isPending 
                              ? (language === 'ar' ? 'جاري الإنشاء...' : 'Creating...') 
                              : (language === 'ar' ? 'إنشاء' : 'Create')}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3" />
                        <Input
                          placeholder={language === 'ar' ? 'بحث بالاسم أو المدينة...' : 'Search by name or city...'}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 rtl:pl-3 rtl:pr-9"
                          data-testid="input-search"
                        />
                      </div>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="sm:w-48" data-testid="select-status">
                          <SelectValue placeholder={language === 'ar' ? 'الحالة' : 'Status'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{language === 'ar' ? 'جميع الحالات' : 'All Statuses'}</SelectItem>
                          <SelectItem value="PENDING">{language === 'ar' ? 'معلق' : 'Pending'}</SelectItem>
                          <SelectItem value="SCHEDULED">{language === 'ar' ? 'مجدول' : 'Scheduled'}</SelectItem>
                          <SelectItem value="IN_PROGRESS">{language === 'ar' ? 'قيد التنفيذ' : 'In Progress'}</SelectItem>
                          <SelectItem value="COMPLETED">{language === 'ar' ? 'مكتمل' : 'Completed'}</SelectItem>
                          <SelectItem value="CANCELLED">{language === 'ar' ? 'ملغي' : 'Cancelled'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {filteredInspections.length === 0 ? (
                      <EmptyState
                        icon={ClipboardCheck}
                        title={language === 'ar' ? 'لا توجد كشوفات' : 'No Inspections'}
                        description={language === 'ar' ? 'لم يتم العثور على أي كشوفات حسية' : 'No field inspections found'}
                      />
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="rtl:text-right">{language === 'ar' ? 'المكتب' : 'Office'}</TableHead>
                              <TableHead className="rtl:text-right">{language === 'ar' ? 'المفتش' : 'Inspector'}</TableHead>
                              <TableHead className="rtl:text-right">{language === 'ar' ? 'التاريخ المجدول' : 'Scheduled Date'}</TableHead>
                              <TableHead className="rtl:text-right">{language === 'ar' ? 'تاريخ الزيارة' : 'Visit Date'}</TableHead>
                              <TableHead className="rtl:text-right">{language === 'ar' ? 'المدينة' : 'City'}</TableHead>
                              <TableHead className="rtl:text-right">{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                              <TableHead className="rtl:text-right">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredInspections.map((inspection) => (
                              <TableRow key={inspection.id} data-testid={`row-inspection-${inspection.id}`}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">
                                      {language === 'ar' ? inspection.officeName : (inspection.officeNameEn || inspection.officeName)}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    {inspection.inspectorName || '-'}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {inspection.scheduledDate 
                                    ? format(new Date(inspection.scheduledDate), 'dd/MM/yyyy', { locale: language === 'ar' ? ar : undefined })
                                    : '-'}
                                </TableCell>
                                <TableCell>
                                  {inspection.visitDate 
                                    ? format(new Date(inspection.visitDate), 'dd/MM/yyyy', { locale: language === 'ar' ? ar : undefined })
                                    : '-'}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    {inspection.city || '-'}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {getStatusBadge(inspection.status)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      data-testid={`button-view-${inspection.id}`}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    {inspection.status === 'PENDING' && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => updateStatusMutation.mutate({ id: inspection.id, status: 'SCHEDULED' })}
                                        data-testid={`button-schedule-${inspection.id}`}
                                      >
                                        {language === 'ar' ? 'جدولة' : 'Schedule'}
                                      </Button>
                                    )}
                                    {inspection.status === 'SCHEDULED' && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => updateStatusMutation.mutate({ id: inspection.id, status: 'IN_PROGRESS' })}
                                        data-testid={`button-start-${inspection.id}`}
                                      >
                                        {language === 'ar' ? 'بدء' : 'Start'}
                                      </Button>
                                    )}
                                    {inspection.status === 'IN_PROGRESS' && (
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => updateStatusMutation.mutate({ id: inspection.id, status: 'COMPLETED' })}
                                        data-testid={`button-complete-${inspection.id}`}
                                      >
                                        {language === 'ar' ? 'إكمال' : 'Complete'}
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
