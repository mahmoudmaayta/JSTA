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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useTranslation, useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { RefreshCw, Scale, Eye, Plus, CheckCircle, XCircle, Clock, AlertTriangle, AlertCircle, Info } from "lucide-react";
import type { ComplianceCheck, ComplianceAction, Office } from "@shared/schema";

type CheckWithOffice = ComplianceCheck & { office?: Office };

export default function AdminCompliance() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { toast } = useToast();
  const sidebarSide = language === 'ar' ? 'right' : 'left';

  const [selectedCheck, setSelectedCheck] = useState<CheckWithOffice | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAddActionOpen, setIsAddActionOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [newCheck, setNewCheck] = useState({ officeId: 0, checkType: "DOCUMENT_REVIEW", severity: "INFO", summary: "", dueDate: "" });
  const [newAction, setNewAction] = useState({ actionType: "WARNING_SENT", description: "", performedBy: "" });

  const { data: checks, isLoading, refetch } = useQuery<CheckWithOffice[]>({
    queryKey: ["/api/admin/compliance-checks"],
  });

  const { data: offices } = useQuery<Office[]>({
    queryKey: ["/api/admin/offices"],
  });

  const { data: actions } = useQuery<ComplianceAction[]>({
    queryKey: ["/api/admin/compliance-actions"],
    enabled: !!selectedCheck,
  });

  const createCheckMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/admin/compliance-checks", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/compliance-checks"] });
      setIsCreateOpen(false);
      setNewCheck({ officeId: 0, checkType: "DOCUMENT_REVIEW", severity: "INFO", summary: "", dueDate: "" });
      toast({
        title: t("compliance.createSuccess"),
        description: t("compliance.createSuccessDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("compliance.createError"),
        description: t("compliance.createErrorDesc"),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/admin/compliance-checks/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/compliance-checks"] });
      toast({
        title: t("compliance.updateSuccess"),
        description: t("compliance.updateSuccessDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("compliance.updateError"),
        description: t("compliance.updateErrorDesc"),
        variant: "destructive",
      });
    },
  });

  const createActionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/admin/compliance-actions", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/compliance-actions"] });
      setIsAddActionOpen(false);
      setNewAction({ actionType: "WARNING_SENT", description: "", performedBy: "" });
      toast({
        title: t("compliance.actionCreated"),
        description: t("compliance.actionCreatedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("compliance.actionError"),
        description: t("compliance.actionErrorDesc"),
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      OPEN: { variant: "secondary", icon: Clock },
      IN_PROGRESS: { variant: "outline", icon: Scale },
      PENDING_RESPONSE: { variant: "outline", icon: Clock },
      CLOSED: { variant: "default", icon: CheckCircle },
    };
    const config = variants[status] || { variant: "secondary", icon: Clock };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {t(`compliance.status.${status}`)}
      </Badge>
    );
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      INFO: { variant: "secondary", icon: Info },
      WARNING: { variant: "outline", icon: AlertTriangle },
      CRITICAL: { variant: "destructive", icon: AlertCircle },
    };
    const config = variants[severity] || { variant: "secondary", icon: Info };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {t(`compliance.severity.${severity}`)}
      </Badge>
    );
  };

  const handleStatusUpdate = (status: string) => {
    if (!selectedCheck) return;
    const updates: any = { status };
    if (status === 'CLOSED') {
      updates.closedAt = new Date().toISOString();
    }
    updateMutation.mutate({ id: selectedCheck.id, updates });
  };

  const handleCreateCheck = () => {
    if (!newCheck.officeId || !newCheck.summary) return;
    createCheckMutation.mutate({
      ...newCheck,
      dueDate: newCheck.dueDate ? new Date(newCheck.dueDate).toISOString() : undefined,
    });
  };

  const handleAddAction = () => {
    if (!selectedCheck || !newAction.actionType) return;
    createActionMutation.mutate({
      checkId: selectedCheck.id,
      ...newAction,
      performedAt: new Date().toISOString(),
    });
  };

  const filteredChecks = checks?.filter(c => 
    statusFilter === "ALL" || c.status === statusFilter
  );

  const checkActions = actions?.filter(a => a.checkId === selectedCheck?.id) || [];

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
              <h1 className="text-lg font-semibold">{t("compliance.title")}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status-filter">
                  <SelectValue placeholder={t("common.filter")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("common.all")}</SelectItem>
                  <SelectItem value="OPEN">{t("compliance.status.OPEN")}</SelectItem>
                  <SelectItem value="IN_PROGRESS">{t("compliance.status.IN_PROGRESS")}</SelectItem>
                  <SelectItem value="PENDING_RESPONSE">{t("compliance.status.PENDING_RESPONSE")}</SelectItem>
                  <SelectItem value="CLOSED">{t("compliance.status.CLOSED")}</SelectItem>
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
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-create-check">
                    <Plus className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                    {t("compliance.createCheck")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t("compliance.createTitle")}</DialogTitle>
                    <DialogDescription>{t("compliance.createDescription")}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="officeId">{t("compliance.office")}</Label>
                      <Select value={newCheck.officeId.toString()} onValueChange={(v) => setNewCheck({ ...newCheck, officeId: parseInt(v) })}>
                        <SelectTrigger id="officeId" data-testid="select-office">
                          <SelectValue placeholder={t("compliance.selectOffice")} />
                        </SelectTrigger>
                        <SelectContent>
                          {offices?.map((office) => (
                            <SelectItem key={office.id} value={office.id.toString()}>
                              {office.tradeNameAr || office.tradeNameEn}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="checkType">{t("compliance.checkType")}</Label>
                        <Select value={newCheck.checkType} onValueChange={(v) => setNewCheck({ ...newCheck, checkType: v })}>
                          <SelectTrigger id="checkType" data-testid="select-check-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DOCUMENT_REVIEW">{t("compliance.type.DOCUMENT_REVIEW")}</SelectItem>
                            <SelectItem value="LICENSE_EXPIRY">{t("compliance.type.LICENSE_EXPIRY")}</SelectItem>
                            <SelectItem value="COMPLAINT_FOLLOWUP">{t("compliance.type.COMPLAINT_FOLLOWUP")}</SelectItem>
                            <SelectItem value="PERIODIC_AUDIT">{t("compliance.type.PERIODIC_AUDIT")}</SelectItem>
                            <SelectItem value="OTHER">{t("compliance.type.OTHER")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="severity">{t("compliance.severityLabel")}</Label>
                        <Select value={newCheck.severity} onValueChange={(v) => setNewCheck({ ...newCheck, severity: v })}>
                          <SelectTrigger id="severity" data-testid="select-severity">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INFO">{t("compliance.severity.INFO")}</SelectItem>
                            <SelectItem value="WARNING">{t("compliance.severity.WARNING")}</SelectItem>
                            <SelectItem value="CRITICAL">{t("compliance.severity.CRITICAL")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="summary">{t("compliance.summary")}</Label>
                      <Textarea
                        id="summary"
                        value={newCheck.summary}
                        onChange={(e) => setNewCheck({ ...newCheck, summary: e.target.value })}
                        placeholder={t("compliance.summaryPlaceholder")}
                        data-testid="input-summary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dueDate">{t("compliance.dueDate")}</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={newCheck.dueDate}
                        onChange={(e) => setNewCheck({ ...newCheck, dueDate: e.target.value })}
                        data-testid="input-due-date"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                      {t("common.cancel")}
                    </Button>
                    <Button onClick={handleCreateCheck} disabled={!newCheck.officeId || !newCheck.summary} data-testid="button-save-check">
                      {t("common.save")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  {t("compliance.listTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : filteredChecks && filteredChecks.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("compliance.office")}</TableHead>
                        <TableHead>{t("compliance.checkType")}</TableHead>
                        <TableHead>{t("compliance.severityLabel")}</TableHead>
                        <TableHead>{t("common.status")}</TableHead>
                        <TableHead>{t("compliance.dueDate")}</TableHead>
                        <TableHead>{t("common.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredChecks.map((check) => (
                        <TableRow key={check.id} data-testid={`row-check-${check.id}`}>
                          <TableCell className="font-medium">
                            {getOfficeName(check.officeId)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{t(`compliance.type.${check.checkType}`)}</Badge>
                          </TableCell>
                          <TableCell>{getSeverityBadge(check.severity)}</TableCell>
                          <TableCell>{getStatusBadge(check.status)}</TableCell>
                          <TableCell>
                            {check.dueDate ? format(new Date(check.dueDate), "PP") : "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedCheck(check);
                                setIsDetailOpen(true);
                              }}
                              data-testid={`button-view-check-${check.id}`}
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("compliance.detailTitle")}</DialogTitle>
            <DialogDescription>{t("compliance.detailDescription")}</DialogDescription>
          </DialogHeader>
          {selectedCheck && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">{t("compliance.checkDetails")}</TabsTrigger>
                <TabsTrigger value="actions">{t("compliance.actions")}</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">{t("compliance.office")}</Label>
                    <p className="font-medium">{getOfficeName(selectedCheck.officeId)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("common.status")}</Label>
                    <div className="mt-1">{getStatusBadge(selectedCheck.status)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("compliance.checkType")}</Label>
                    <p className="font-medium">{t(`compliance.type.${selectedCheck.checkType}`)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("compliance.severityLabel")}</Label>
                    <div className="mt-1">{getSeverityBadge(selectedCheck.severity)}</div>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">{t("compliance.summary")}</Label>
                    <p className="text-sm mt-1">{selectedCheck.summary}</p>
                  </div>
                  {selectedCheck.dueDate && (
                    <div>
                      <Label className="text-muted-foreground">{t("compliance.dueDate")}</Label>
                      <p className="font-medium">{format(new Date(selectedCheck.dueDate), "PP")}</p>
                    </div>
                  )}
                </div>
                <div className="pt-4 border-t">
                  <Label>{t("compliance.updateStatus")}</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedCheck.status === 'OPEN' && (
                      <Button size="sm" onClick={() => handleStatusUpdate('IN_PROGRESS')} data-testid="button-start">
                        <Scale className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                        {t("compliance.startWork")}
                      </Button>
                    )}
                    {selectedCheck.status === 'IN_PROGRESS' && (
                      <Button size="sm" variant="outline" onClick={() => handleStatusUpdate('PENDING_RESPONSE')} data-testid="button-pending">
                        <Clock className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                        {t("compliance.awaitResponse")}
                      </Button>
                    )}
                    {selectedCheck.status !== 'CLOSED' && (
                      <Button size="sm" onClick={() => handleStatusUpdate('CLOSED')} data-testid="button-close">
                        <CheckCircle className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                        {t("compliance.closeCheck")}
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="actions" className="space-y-4 py-4">
                <div className="flex justify-between items-center">
                  <Label>{t("compliance.actionHistory")}</Label>
                  <Button size="sm" onClick={() => setIsAddActionOpen(true)} data-testid="button-add-action">
                    <Plus className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                    {t("compliance.addAction")}
                  </Button>
                </div>
                {checkActions.length > 0 ? (
                  <div className="space-y-3">
                    {checkActions.map((action) => (
                      <Card key={action.id} className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline">{t(`compliance.actionType.${action.actionType}`)}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {action.performedAt ? format(new Date(action.performedAt), "PP") : "-"}
                            </span>
                          </div>
                          {action.description && (
                            <p className="text-sm">{action.description}</p>
                          )}
                          {action.performedBy && (
                            <p className="text-xs text-muted-foreground">{t("compliance.by")}: {action.performedBy}</p>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    {t("compliance.noActions")}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddActionOpen} onOpenChange={setIsAddActionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("compliance.addActionTitle")}</DialogTitle>
            <DialogDescription>{t("compliance.addActionDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="actionType">{t("compliance.actionTypeLabel")}</Label>
              <Select value={newAction.actionType} onValueChange={(v) => setNewAction({ ...newAction, actionType: v })}>
                <SelectTrigger id="actionType" data-testid="select-action-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WARNING_SENT">{t("compliance.actionType.WARNING_SENT")}</SelectItem>
                  <SelectItem value="DOCUMENT_REQUESTED">{t("compliance.actionType.DOCUMENT_REQUESTED")}</SelectItem>
                  <SelectItem value="MEETING_SCHEDULED">{t("compliance.actionType.MEETING_SCHEDULED")}</SelectItem>
                  <SelectItem value="FINE_ISSUED">{t("compliance.actionType.FINE_ISSUED")}</SelectItem>
                  <SelectItem value="SUSPENSION_NOTICE">{t("compliance.actionType.SUSPENSION_NOTICE")}</SelectItem>
                  <SelectItem value="RESOLVED">{t("compliance.actionType.RESOLVED")}</SelectItem>
                  <SelectItem value="OTHER">{t("compliance.actionType.OTHER")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="performedBy">{t("compliance.performedBy")}</Label>
              <Input
                id="performedBy"
                value={newAction.performedBy}
                onChange={(e) => setNewAction({ ...newAction, performedBy: e.target.value })}
                placeholder={t("compliance.performedByPlaceholder")}
                data-testid="input-performed-by"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actionDescription">{t("compliance.actionDescription")}</Label>
              <Textarea
                id="actionDescription"
                value={newAction.description}
                onChange={(e) => setNewAction({ ...newAction, description: e.target.value })}
                placeholder={t("compliance.actionDescriptionPlaceholder")}
                data-testid="input-action-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddActionOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleAddAction} data-testid="button-save-action">
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
