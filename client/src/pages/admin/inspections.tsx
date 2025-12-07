import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation, useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { RefreshCw, ClipboardCheck, Eye, CheckCircle, XCircle, Clock, Calendar } from "lucide-react";
import type { Inspection, Office } from "@shared/schema";

type InspectionWithOffice = Inspection & { office?: Office };

export default function AdminInspections() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { toast } = useToast();
  const sidebarSide = language === 'ar' ? 'right' : 'left';

  const [selectedInspection, setSelectedInspection] = useState<InspectionWithOffice | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [scheduledAt, setScheduledAt] = useState("");
  const [inspectorName, setInspectorName] = useState("");
  const [findings, setFindings] = useState("");

  const { data: inspections, isLoading, refetch } = useQuery<InspectionWithOffice[]>({
    queryKey: ["/api/admin/inspections"],
  });

  const { data: offices } = useQuery<Office[]>({
    queryKey: ["/api/admin/offices"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/admin/inspections/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/inspections"] });
      setIsDetailOpen(false);
      toast({
        title: t("inspections.updateSuccess"),
        description: t("inspections.updateSuccessDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("inspections.updateError"),
        description: t("inspections.updateErrorDesc"),
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      SCHEDULED: { variant: "secondary", icon: Calendar },
      IN_PROGRESS: { variant: "outline", icon: ClipboardCheck },
      COMPLETED: { variant: "default", icon: CheckCircle },
      CANCELLED: { variant: "destructive", icon: XCircle },
    };
    const config = variants[status] || { variant: "secondary", icon: Clock };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {t(`inspections.status.${status}`)}
      </Badge>
    );
  };

  const getOutcomeBadge = (outcome: string | null) => {
    if (!outcome) return null;
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      PASSED: "default",
      PASSED_WITH_NOTES: "outline",
      FAILED: "destructive",
      FOLLOW_UP_REQUIRED: "secondary",
    };
    return <Badge variant={variants[outcome] || "secondary"}>{t(`inspections.outcome.${outcome}`)}</Badge>;
  };

  const handleSchedule = () => {
    if (!selectedInspection || !scheduledAt) return;
    updateMutation.mutate({
      id: selectedInspection.id,
      updates: {
        scheduledAt: new Date(scheduledAt).toISOString(),
        inspectorName: inspectorName || undefined,
      },
    });
  };

  const handleStatusUpdate = (status: string, outcome?: string) => {
    if (!selectedInspection) return;
    const updates: any = { status };
    if (status === 'COMPLETED') {
      updates.completedAt = new Date().toISOString();
      updates.findings = findings || undefined;
      if (outcome) updates.outcome = outcome;
    }
    updateMutation.mutate({ id: selectedInspection.id, updates });
  };

  const filteredInspections = inspections?.filter(insp => 
    statusFilter === "ALL" || insp.status === statusFilter
  );

  const getOfficeName = (officeId: number) => {
    const office = offices?.find(o => o.id === officeId);
    return office?.tradeNameAr || office?.tradeNameEn || `Office #${officeId}`;
  };

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <AdminSidebar key={`sidebar-${language}`} side={sidebarSide} />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold">{t("inspections.title")}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status-filter">
                  <SelectValue placeholder={t("common.filter")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("common.all")}</SelectItem>
                  <SelectItem value="SCHEDULED">{t("inspections.status.SCHEDULED")}</SelectItem>
                  <SelectItem value="IN_PROGRESS">{t("inspections.status.IN_PROGRESS")}</SelectItem>
                  <SelectItem value="COMPLETED">{t("inspections.status.COMPLETED")}</SelectItem>
                  <SelectItem value="CANCELLED">{t("inspections.status.CANCELLED")}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                data-testid="button-refresh"
              >
                <RefreshCw className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                {t("common.refresh")}
              </Button>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5" />
                  {t("inspections.listTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : filteredInspections && filteredInspections.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("inspections.office")}</TableHead>
                        <TableHead>{t("inspections.inspectionType")}</TableHead>
                        <TableHead>{t("common.status")}</TableHead>
                        <TableHead>{t("inspections.outcome")}</TableHead>
                        <TableHead>{t("inspections.scheduledAt")}</TableHead>
                        <TableHead>{t("common.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInspections.map((insp) => (
                        <TableRow key={insp.id} data-testid={`row-inspection-${insp.id}`}>
                          <TableCell className="font-medium">
                            {getOfficeName(insp.officeId)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {t(`inspections.type.${insp.inspectionType}`)}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(insp.status)}</TableCell>
                          <TableCell>{getOutcomeBadge(insp.outcome)}</TableCell>
                          <TableCell>
                            {insp.scheduledAt ? format(new Date(insp.scheduledAt), "PP") : "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedInspection(insp);
                                setScheduledAt(insp.scheduledAt ? format(new Date(insp.scheduledAt), "yyyy-MM-dd") : "");
                                setInspectorName(insp.inspectorName || "");
                                setFindings(insp.findings || "");
                                setIsDetailOpen(true);
                              }}
                              data-testid={`button-view-inspection-${insp.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {t("common.noData")}
                  </div>
                )}
              </CardContent>
            </Card>
          </main>
        </SidebarInset>
      </div>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("inspections.detailTitle")}</DialogTitle>
            <DialogDescription>{t("inspections.detailDescription")}</DialogDescription>
          </DialogHeader>
          {selectedInspection && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">{t("inspections.office")}</Label>
                  <p className="font-medium">{getOfficeName(selectedInspection.officeId)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t("common.status")}</Label>
                  <div className="mt-1">{getStatusBadge(selectedInspection.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t("inspections.inspectionType")}</Label>
                  <p className="font-medium">{t(`inspections.type.${selectedInspection.inspectionType}`)}</p>
                </div>
                {selectedInspection.outcome && (
                  <div>
                    <Label className="text-muted-foreground">{t("inspections.outcome")}</Label>
                    <div className="mt-1">{getOutcomeBadge(selectedInspection.outcome)}</div>
                  </div>
                )}
                {selectedInspection.inspectorName && (
                  <div>
                    <Label className="text-muted-foreground">{t("inspections.inspectorName")}</Label>
                    <p className="font-medium">{selectedInspection.inspectorName}</p>
                  </div>
                )}
                {selectedInspection.scheduledAt && (
                  <div>
                    <Label className="text-muted-foreground">{t("inspections.scheduledAt")}</Label>
                    <p className="font-medium">{format(new Date(selectedInspection.scheduledAt), "PP")}</p>
                  </div>
                )}
              </div>

              {selectedInspection.findings && (
                <div>
                  <Label className="text-muted-foreground">{t("inspections.findings")}</Label>
                  <p className="text-sm mt-1">{selectedInspection.findings}</p>
                </div>
              )}

              {selectedInspection.status === 'SCHEDULED' && (
                <div className="space-y-3 pt-4 border-t">
                  <Label>{t("inspections.reschedule")}</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="scheduledAt" className="text-sm">{t("inspections.scheduledAt")}</Label>
                      <Input
                        id="scheduledAt"
                        type="date"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        data-testid="input-scheduled-date"
                      />
                    </div>
                    <div>
                      <Label htmlFor="inspectorName" className="text-sm">{t("inspections.inspectorName")}</Label>
                      <Input
                        id="inspectorName"
                        value={inspectorName}
                        onChange={(e) => setInspectorName(e.target.value)}
                        placeholder={t("inspections.inspectorNamePlaceholder")}
                        data-testid="input-inspector-name"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSchedule} disabled={!scheduledAt} data-testid="button-reschedule">
                      <Calendar className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                      {t("inspections.reschedule")}
                    </Button>
                    <Button variant="outline" onClick={() => handleStatusUpdate('IN_PROGRESS')} data-testid="button-start">
                      <ClipboardCheck className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                      {t("inspections.startInspection")}
                    </Button>
                  </div>
                </div>
              )}

              {selectedInspection.status === 'IN_PROGRESS' && (
                <div className="space-y-3 pt-4 border-t">
                  <Label>{t("inspections.completeInspection")}</Label>
                  <div>
                    <Label htmlFor="findings" className="text-sm">{t("inspections.findings")}</Label>
                    <Textarea
                      id="findings"
                      value={findings}
                      onChange={(e) => setFindings(e.target.value)}
                      placeholder={t("inspections.findingsPlaceholder")}
                      data-testid="input-findings"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => handleStatusUpdate('COMPLETED', 'PASSED')} data-testid="button-pass">
                      <CheckCircle className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                      {t("inspections.passed")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleStatusUpdate('COMPLETED', 'PASSED_WITH_NOTES')} data-testid="button-pass-notes">
                      {t("inspections.passedWithNotes")}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate('COMPLETED', 'FAILED')} data-testid="button-fail">
                      <XCircle className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                      {t("inspections.failed")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
