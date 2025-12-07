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
import { RefreshCw, Eye, Plus, MapPin, AlertTriangle, CheckCircle, XCircle, Clock, Building2 } from "lucide-react";
import type { OversightTarget, OversightVisit } from "@shared/schema";

export default function AdminOversight() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { toast } = useToast();
  const sidebarSide = language === 'ar' ? 'right' : 'left';

  const [selectedTarget, setSelectedTarget] = useState<OversightTarget | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAddVisitOpen, setIsAddVisitOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [newTarget, setNewTarget] = useState({ officeName: "", location: "", contactInfo: "", licenseStatus: "UNKNOWN", reportSource: "INTERNAL", notes: "" });
  const [newVisit, setNewVisit] = useState({ visitDate: "", actionsTaken: "", result: "UNKNOWN" });

  const { data: targets, isLoading, refetch } = useQuery<OversightTarget[]>({
    queryKey: ["/api/admin/oversight-targets"],
  });

  const { data: visits } = useQuery<OversightVisit[]>({
    queryKey: ["/api/admin/oversight-visits"],
    enabled: !!selectedTarget,
  });

  const createTargetMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/admin/oversight-targets", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/oversight-targets"] });
      setIsCreateOpen(false);
      setNewTarget({ officeName: "", location: "", contactInfo: "", licenseStatus: "UNKNOWN", reportSource: "INTERNAL", notes: "" });
      toast({
        title: t("oversight.createSuccess"),
        description: t("oversight.createSuccessDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("oversight.createError"),
        description: t("oversight.createErrorDesc"),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/admin/oversight-targets/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/oversight-targets"] });
      toast({
        title: t("oversight.updateSuccess"),
        description: t("oversight.updateSuccessDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("oversight.updateError"),
        description: t("oversight.updateErrorDesc"),
        variant: "destructive",
      });
    },
  });

  const createVisitMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/admin/oversight-visits", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/oversight-visits"] });
      setIsAddVisitOpen(false);
      setNewVisit({ visitDate: "", actionsTaken: "", result: "UNKNOWN" });
      toast({
        title: t("oversight.visitCreated"),
        description: t("oversight.visitCreatedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("oversight.visitError"),
        description: t("oversight.visitErrorDesc"),
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      NEW: { variant: "secondary", icon: Clock },
      UNDER_INVESTIGATION: { variant: "outline", icon: Eye },
      RESOLVED: { variant: "default", icon: CheckCircle },
    };
    const config = variants[status] || { variant: "secondary", icon: Clock };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {t(`oversight.status.${status}`)}
      </Badge>
    );
  };

  const getLicenseStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      UNKNOWN: "secondary",
      UNLICENSED: "destructive",
      EXPIRED: "destructive",
      SUSPENDED: "outline",
      VALID: "default",
    };
    return <Badge variant={variants[status] || "secondary"}>{t(`oversight.licenseStatus.${status}`)}</Badge>;
  };

  const handleStatusUpdate = (status: string) => {
    if (!selectedTarget) return;
    updateMutation.mutate({ id: selectedTarget.id, updates: { status } });
  };

  const handleCreateTarget = () => {
    if (!newTarget.officeName) return;
    const data: any = {
      officeName: newTarget.officeName,
      licenseStatus: newTarget.licenseStatus,
      reportSource: newTarget.reportSource,
      notes: newTarget.notes || undefined,
    };
    if (newTarget.location) {
      data.location = { address: newTarget.location };
    }
    if (newTarget.contactInfo) {
      data.contactInfo = { phone: newTarget.contactInfo };
    }
    createTargetMutation.mutate(data);
  };

  const handleAddVisit = () => {
    if (!selectedTarget || !newVisit.visitDate) return;
    createVisitMutation.mutate({
      targetId: selectedTarget.id,
      visitDate: new Date(newVisit.visitDate).toISOString(),
      actionsTaken: newVisit.actionsTaken || undefined,
      result: newVisit.result,
    });
  };

  const filteredTargets = targets?.filter(t => 
    statusFilter === "ALL" || t.status === statusFilter
  );

  const targetVisits = visits?.filter(v => v.targetId === selectedTarget?.id) || [];

  const getLocationDisplay = (location: { city?: string; area?: string; address?: string } | null) => {
    if (!location) return "-";
    return [location.city, location.area, location.address].filter(Boolean).join(", ") || "-";
  };

  const getContactDisplay = (contactInfo: { phone?: string; mobile?: string; email?: string } | null) => {
    if (!contactInfo) return "-";
    return [contactInfo.phone, contactInfo.mobile, contactInfo.email].filter(Boolean).join(" / ") || "-";
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
              <h1 className="text-lg font-semibold">{t("oversight.title")}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status-filter">
                  <SelectValue placeholder={t("common.filter")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("common.all")}</SelectItem>
                  <SelectItem value="NEW">{t("oversight.status.NEW")}</SelectItem>
                  <SelectItem value="UNDER_INVESTIGATION">{t("oversight.status.UNDER_INVESTIGATION")}</SelectItem>
                  <SelectItem value="RESOLVED">{t("oversight.status.RESOLVED")}</SelectItem>
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
                  <Button size="sm" data-testid="button-create-target">
                    <Plus className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                    {t("oversight.addTarget")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t("oversight.createTitle")}</DialogTitle>
                    <DialogDescription>{t("oversight.createDescription")}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="officeName">{t("oversight.officeName")}</Label>
                      <Input
                        id="officeName"
                        value={newTarget.officeName}
                        onChange={(e) => setNewTarget({ ...newTarget, officeName: e.target.value })}
                        placeholder={t("oversight.officeNamePlaceholder")}
                        data-testid="input-office-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">{t("oversight.location")}</Label>
                      <Input
                        id="location"
                        value={newTarget.location}
                        onChange={(e) => setNewTarget({ ...newTarget, location: e.target.value })}
                        placeholder={t("oversight.locationPlaceholder")}
                        data-testid="input-location"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactInfo">{t("oversight.contactInfo")}</Label>
                      <Input
                        id="contactInfo"
                        value={newTarget.contactInfo}
                        onChange={(e) => setNewTarget({ ...newTarget, contactInfo: e.target.value })}
                        placeholder={t("oversight.contactInfoPlaceholder")}
                        data-testid="input-contact-info"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="licenseStatus">{t("oversight.licenseStatusLabel")}</Label>
                        <Select value={newTarget.licenseStatus} onValueChange={(v) => setNewTarget({ ...newTarget, licenseStatus: v })}>
                          <SelectTrigger id="licenseStatus" data-testid="select-license-status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UNKNOWN">{t("oversight.licenseStatus.UNKNOWN")}</SelectItem>
                            <SelectItem value="UNLICENSED">{t("oversight.licenseStatus.UNLICENSED")}</SelectItem>
                            <SelectItem value="EXPIRED">{t("oversight.licenseStatus.EXPIRED")}</SelectItem>
                            <SelectItem value="SUSPENDED">{t("oversight.licenseStatus.SUSPENDED")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reportSource">{t("oversight.reportSource")}</Label>
                        <Select value={newTarget.reportSource} onValueChange={(v) => setNewTarget({ ...newTarget, reportSource: v })}>
                          <SelectTrigger id="reportSource" data-testid="select-report-source">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INTERNAL">{t("oversight.source.INTERNAL")}</SelectItem>
                            <SelectItem value="COMPLAINT">{t("oversight.source.COMPLAINT")}</SelectItem>
                            <SelectItem value="MINISTRY">{t("oversight.source.MINISTRY")}</SelectItem>
                            <SelectItem value="OTHER">{t("oversight.source.OTHER")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">{t("common.notes")}</Label>
                      <Textarea
                        id="notes"
                        value={newTarget.notes}
                        onChange={(e) => setNewTarget({ ...newTarget, notes: e.target.value })}
                        placeholder={t("oversight.notesPlaceholder")}
                        data-testid="input-notes"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                      {t("common.cancel")}
                    </Button>
                    <Button onClick={handleCreateTarget} disabled={!newTarget.officeName} data-testid="button-save-target">
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
                  <Eye className="h-5 w-5" />
                  {t("oversight.listTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : filteredTargets && filteredTargets.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("oversight.officeName")}</TableHead>
                        <TableHead>{t("oversight.location")}</TableHead>
                        <TableHead>{t("oversight.licenseStatusLabel")}</TableHead>
                        <TableHead>{t("common.status")}</TableHead>
                        <TableHead>{t("oversight.reportSource")}</TableHead>
                        <TableHead>{t("common.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTargets.map((target) => (
                        <TableRow key={target.id} data-testid={`row-target-${target.id}`}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {target.officeName}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <MapPin className="h-3 w-3" />
                              {getLocationDisplay(target.location)}
                            </div>
                          </TableCell>
                          <TableCell>{getLicenseStatusBadge(target.licenseStatus)}</TableCell>
                          <TableCell>{getStatusBadge(target.status)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{t(`oversight.source.${target.reportSource}`)}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedTarget(target);
                                setIsDetailOpen(true);
                              }}
                              data-testid={`button-view-target-${target.id}`}
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
            <DialogTitle>{t("oversight.detailTitle")}</DialogTitle>
            <DialogDescription>{t("oversight.detailDescription")}</DialogDescription>
          </DialogHeader>
          {selectedTarget && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">{t("oversight.targetDetails")}</TabsTrigger>
                <TabsTrigger value="visits">{t("oversight.visits")}</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">{t("oversight.officeName")}</Label>
                    <p className="font-medium">{selectedTarget.officeName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("common.status")}</Label>
                    <div className="mt-1">{getStatusBadge(selectedTarget.status)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("oversight.licenseStatusLabel")}</Label>
                    <div className="mt-1">{getLicenseStatusBadge(selectedTarget.licenseStatus)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("oversight.reportSource")}</Label>
                    <p className="font-medium">{t(`oversight.source.${selectedTarget.reportSource}`)}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">{t("oversight.location")}</Label>
                    <p className="font-medium flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {getLocationDisplay(selectedTarget.location)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">{t("oversight.contactInfo")}</Label>
                    <p className="font-medium">{getContactDisplay(selectedTarget.contactInfo)}</p>
                  </div>
                  {selectedTarget.notes && (
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">{t("common.notes")}</Label>
                      <p className="text-sm mt-1">{selectedTarget.notes}</p>
                    </div>
                  )}
                </div>
                <div className="pt-4 border-t">
                  <Label>{t("oversight.updateStatus")}</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedTarget.status === 'NEW' && (
                      <Button size="sm" onClick={() => handleStatusUpdate('UNDER_INVESTIGATION')} data-testid="button-investigate">
                        <Eye className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                        {t("oversight.startInvestigation")}
                      </Button>
                    )}
                    {selectedTarget.status === 'UNDER_INVESTIGATION' && (
                      <Button size="sm" onClick={() => handleStatusUpdate('RESOLVED')} data-testid="button-resolve">
                        <CheckCircle className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                        {t("oversight.markResolved")}
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="visits" className="space-y-4 py-4">
                <div className="flex justify-between items-center">
                  <Label>{t("oversight.visitHistory")}</Label>
                  <Button size="sm" onClick={() => setIsAddVisitOpen(true)} data-testid="button-add-visit">
                    <Plus className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                    {t("oversight.addVisit")}
                  </Button>
                </div>
                {targetVisits.length > 0 ? (
                  <div className="space-y-3">
                    {targetVisits.map((visit) => (
                      <Card key={visit.id} className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {visit.visitDate ? format(new Date(visit.visitDate), "PP") : "-"}
                            </span>
                            {visit.result && (
                              <Badge variant="outline">{t(`oversight.licenseStatus.${visit.result}`)}</Badge>
                            )}
                          </div>
                          {visit.actionsTaken && (
                            <div>
                              <Label className="text-xs text-muted-foreground">{t("oversight.actionsTaken")}</Label>
                              <p className="text-sm">{visit.actionsTaken}</p>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    {t("oversight.noVisits")}
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

      <Dialog open={isAddVisitOpen} onOpenChange={setIsAddVisitOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("oversight.addVisitTitle")}</DialogTitle>
            <DialogDescription>{t("oversight.addVisitDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="visitDate">{t("oversight.visitDate")}</Label>
                <Input
                  id="visitDate"
                  type="date"
                  value={newVisit.visitDate}
                  onChange={(e) => setNewVisit({ ...newVisit, visitDate: e.target.value })}
                  data-testid="input-visit-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="result">{t("oversight.result")}</Label>
                <Select value={newVisit.result} onValueChange={(v) => setNewVisit({ ...newVisit, result: v })}>
                  <SelectTrigger id="result" data-testid="select-result">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNKNOWN">{t("oversight.licenseStatus.UNKNOWN")}</SelectItem>
                    <SelectItem value="UNLICENSED">{t("oversight.licenseStatus.UNLICENSED")}</SelectItem>
                    <SelectItem value="EXPIRED">{t("oversight.licenseStatus.EXPIRED")}</SelectItem>
                    <SelectItem value="VALID">{t("oversight.licenseStatus.VALID")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="actionsTaken">{t("oversight.actionsTaken")}</Label>
              <Textarea
                id="actionsTaken"
                value={newVisit.actionsTaken}
                onChange={(e) => setNewVisit({ ...newVisit, actionsTaken: e.target.value })}
                placeholder={t("oversight.actionsTakenPlaceholder")}
                data-testid="input-actions-taken"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddVisitOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleAddVisit} disabled={!newVisit.visitDate} data-testid="button-save-visit">
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
