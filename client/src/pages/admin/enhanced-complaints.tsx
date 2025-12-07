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
import { RefreshCw, MessageSquareWarning, Eye, Plus, CheckCircle, XCircle, Clock, AlertTriangle, ArrowUp } from "lucide-react";
import type { EnhancedComplaint, ComplaintUpdate, Office } from "@shared/schema";

type ComplaintWithOffice = EnhancedComplaint & { office?: Office };

export default function AdminEnhancedComplaints() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { toast } = useToast();
  const sidebarSide = language === 'ar' ? 'right' : 'left';

  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintWithOffice | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAddUpdateOpen, setIsAddUpdateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [newComplaint, setNewComplaint] = useState({ 
    officeId: 0, 
    complainantType: "MEMBER", 
    complainantName: "", 
    complainantContact: "",
    complaintType: "SERVICE_QUALITY",
    subject: "",
    description: "",
    priority: "MEDIUM"
  });
  const [newUpdate, setNewUpdate] = useState({ updateText: "", updatedBy: "" });

  const { data: complaints, isLoading, refetch } = useQuery<ComplaintWithOffice[]>({
    queryKey: ["/api/admin/enhanced-complaints"],
  });

  const { data: offices } = useQuery<Office[]>({
    queryKey: ["/api/admin/offices"],
  });

  const { data: updates } = useQuery<ComplaintUpdate[]>({
    queryKey: ["/api/admin/complaint-updates"],
    enabled: !!selectedComplaint,
  });

  const createComplaintMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/admin/enhanced-complaints", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/enhanced-complaints"] });
      setIsCreateOpen(false);
      setNewComplaint({ 
        officeId: 0, 
        complainantType: "MEMBER", 
        complainantName: "", 
        complainantContact: "",
        complaintType: "SERVICE_QUALITY",
        subject: "",
        description: "",
        priority: "MEDIUM"
      });
      toast({
        title: t("enhancedComplaints.createSuccess"),
        description: t("enhancedComplaints.createSuccessDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("enhancedComplaints.createError"),
        description: t("enhancedComplaints.createErrorDesc"),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/admin/enhanced-complaints/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/enhanced-complaints"] });
      toast({
        title: t("enhancedComplaints.updateSuccess"),
        description: t("enhancedComplaints.updateSuccessDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("enhancedComplaints.updateError"),
        description: t("enhancedComplaints.updateErrorDesc"),
        variant: "destructive",
      });
    },
  });

  const createUpdateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/admin/complaint-updates", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/complaint-updates"] });
      setIsAddUpdateOpen(false);
      setNewUpdate({ updateText: "", updatedBy: "" });
      toast({
        title: t("enhancedComplaints.updateAdded"),
        description: t("enhancedComplaints.updateAddedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("enhancedComplaints.updateError"),
        description: t("enhancedComplaints.updateErrorDesc"),
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      RECEIVED: { variant: "secondary", icon: Clock },
      UNDER_REVIEW: { variant: "outline", icon: Eye },
      IN_PROGRESS: { variant: "default", icon: MessageSquareWarning },
      ESCALATED: { variant: "destructive", icon: ArrowUp },
      RESOLVED: { variant: "default", icon: CheckCircle },
      CLOSED: { variant: "outline", icon: XCircle },
    };
    const config = variants[status] || { variant: "secondary", icon: Clock };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {t(`enhancedComplaints.status.${status}`)}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      LOW: "secondary",
      MEDIUM: "outline",
      HIGH: "default",
      URGENT: "destructive",
    };
    return <Badge variant={variants[priority] || "secondary"}>{t(`enhancedComplaints.priority.${priority}`)}</Badge>;
  };

  const handleStatusUpdate = (status: string) => {
    if (!selectedComplaint) return;
    const updates: any = { status };
    if (status === 'RESOLVED') {
      updates.resolvedAt = new Date().toISOString();
    }
    updateMutation.mutate({ id: selectedComplaint.id, updates });
  };

  const handleCreateComplaint = () => {
    if (!newComplaint.subject) return;
    createComplaintMutation.mutate(newComplaint);
  };

  const handleAddUpdate = () => {
    if (!selectedComplaint || !newUpdate.updateText) return;
    createUpdateMutation.mutate({
      complaintId: selectedComplaint.id,
      updateText: newUpdate.updateText,
      updatedBy: newUpdate.updatedBy,
    });
  };

  const filteredComplaints = complaints?.filter(c => 
    statusFilter === "ALL" || c.status === statusFilter
  );

  const complaintUpdates = updates?.filter(u => u.complaintId === selectedComplaint?.id) || [];

  const getOfficeName = (officeId: number | null) => {
    if (!officeId) return t("enhancedComplaints.noOffice");
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
              <h1 className="text-lg font-semibold">{t("enhancedComplaints.title")}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status-filter">
                  <SelectValue placeholder={t("common.filter")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("common.all")}</SelectItem>
                  <SelectItem value="RECEIVED">{t("enhancedComplaints.status.RECEIVED")}</SelectItem>
                  <SelectItem value="UNDER_REVIEW">{t("enhancedComplaints.status.UNDER_REVIEW")}</SelectItem>
                  <SelectItem value="IN_PROGRESS">{t("enhancedComplaints.status.IN_PROGRESS")}</SelectItem>
                  <SelectItem value="ESCALATED">{t("enhancedComplaints.status.ESCALATED")}</SelectItem>
                  <SelectItem value="RESOLVED">{t("enhancedComplaints.status.RESOLVED")}</SelectItem>
                  <SelectItem value="CLOSED">{t("enhancedComplaints.status.CLOSED")}</SelectItem>
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
                  <Button size="sm" data-testid="button-create-complaint">
                    <Plus className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                    {t("enhancedComplaints.createComplaint")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{t("enhancedComplaints.createTitle")}</DialogTitle>
                    <DialogDescription>{t("enhancedComplaints.createDescription")}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
                    <div className="space-y-2">
                      <Label htmlFor="officeId">{t("enhancedComplaints.relatedOffice")}</Label>
                      <Select value={newComplaint.officeId.toString()} onValueChange={(v) => setNewComplaint({ ...newComplaint, officeId: parseInt(v) })}>
                        <SelectTrigger id="officeId" data-testid="select-office">
                          <SelectValue placeholder={t("enhancedComplaints.selectOffice")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">{t("enhancedComplaints.noOffice")}</SelectItem>
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
                        <Label htmlFor="complainantType">{t("enhancedComplaints.complainantType")}</Label>
                        <Select value={newComplaint.complainantType} onValueChange={(v) => setNewComplaint({ ...newComplaint, complainantType: v })}>
                          <SelectTrigger id="complainantType" data-testid="select-complainant-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MEMBER">{t("enhancedComplaints.type.MEMBER")}</SelectItem>
                            <SelectItem value="PUBLIC">{t("enhancedComplaints.type.PUBLIC")}</SelectItem>
                            <SelectItem value="MINISTRY">{t("enhancedComplaints.type.MINISTRY")}</SelectItem>
                            <SelectItem value="INTERNAL">{t("enhancedComplaints.type.INTERNAL")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="priority">{t("enhancedComplaints.priorityLabel")}</Label>
                        <Select value={newComplaint.priority} onValueChange={(v) => setNewComplaint({ ...newComplaint, priority: v })}>
                          <SelectTrigger id="priority" data-testid="select-priority">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LOW">{t("enhancedComplaints.priority.LOW")}</SelectItem>
                            <SelectItem value="MEDIUM">{t("enhancedComplaints.priority.MEDIUM")}</SelectItem>
                            <SelectItem value="HIGH">{t("enhancedComplaints.priority.HIGH")}</SelectItem>
                            <SelectItem value="URGENT">{t("enhancedComplaints.priority.URGENT")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="complainantName">{t("enhancedComplaints.complainantName")}</Label>
                        <Input
                          id="complainantName"
                          value={newComplaint.complainantName}
                          onChange={(e) => setNewComplaint({ ...newComplaint, complainantName: e.target.value })}
                          placeholder={t("enhancedComplaints.namePlaceholder")}
                          data-testid="input-complainant-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="complainantContact">{t("enhancedComplaints.complainantContact")}</Label>
                        <Input
                          id="complainantContact"
                          value={newComplaint.complainantContact}
                          onChange={(e) => setNewComplaint({ ...newComplaint, complainantContact: e.target.value })}
                          placeholder={t("enhancedComplaints.contactPlaceholder")}
                          data-testid="input-complainant-contact"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="complaintType">{t("enhancedComplaints.complaintType")}</Label>
                      <Select value={newComplaint.complaintType} onValueChange={(v) => setNewComplaint({ ...newComplaint, complaintType: v })}>
                        <SelectTrigger id="complaintType" data-testid="select-complaint-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SERVICE_QUALITY">{t("enhancedComplaints.complaintTypes.SERVICE_QUALITY")}</SelectItem>
                          <SelectItem value="PRICING">{t("enhancedComplaints.complaintTypes.PRICING")}</SelectItem>
                          <SelectItem value="FRAUD">{t("enhancedComplaints.complaintTypes.FRAUD")}</SelectItem>
                          <SelectItem value="LICENSE_VIOLATION">{t("enhancedComplaints.complaintTypes.LICENSE_VIOLATION")}</SelectItem>
                          <SelectItem value="EMPLOYEE_CONDUCT">{t("enhancedComplaints.complaintTypes.EMPLOYEE_CONDUCT")}</SelectItem>
                          <SelectItem value="OTHER">{t("enhancedComplaints.complaintTypes.OTHER")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">{t("enhancedComplaints.subject")}</Label>
                      <Input
                        id="subject"
                        value={newComplaint.subject}
                        onChange={(e) => setNewComplaint({ ...newComplaint, subject: e.target.value })}
                        placeholder={t("enhancedComplaints.subjectPlaceholder")}
                        data-testid="input-subject"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">{t("enhancedComplaints.description")}</Label>
                      <Textarea
                        id="description"
                        value={newComplaint.description}
                        onChange={(e) => setNewComplaint({ ...newComplaint, description: e.target.value })}
                        placeholder={t("enhancedComplaints.descriptionPlaceholder")}
                        data-testid="input-description"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                      {t("common.cancel")}
                    </Button>
                    <Button onClick={handleCreateComplaint} disabled={!newComplaint.subject} data-testid="button-save-complaint">
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
                  <MessageSquareWarning className="h-5 w-5" />
                  {t("enhancedComplaints.listTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : filteredComplaints && filteredComplaints.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("enhancedComplaints.subject")}</TableHead>
                        <TableHead>{t("enhancedComplaints.complainantType")}</TableHead>
                        <TableHead>{t("enhancedComplaints.relatedOffice")}</TableHead>
                        <TableHead>{t("enhancedComplaints.priorityLabel")}</TableHead>
                        <TableHead>{t("common.status")}</TableHead>
                        <TableHead>{t("enhancedComplaints.receivedAt")}</TableHead>
                        <TableHead>{t("common.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredComplaints.map((complaint) => (
                        <TableRow key={complaint.id} data-testid={`row-complaint-${complaint.id}`}>
                          <TableCell className="font-medium max-w-xs truncate">
                            {complaint.subject}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{t(`enhancedComplaints.type.${complaint.complainantType}`)}</Badge>
                          </TableCell>
                          <TableCell>{getOfficeName(complaint.officeId)}</TableCell>
                          <TableCell>{getPriorityBadge(complaint.priority)}</TableCell>
                          <TableCell>{getStatusBadge(complaint.status)}</TableCell>
                          <TableCell>
                            {complaint.receivedAt ? format(new Date(complaint.receivedAt), "PP") : "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedComplaint(complaint);
                                setIsDetailOpen(true);
                              }}
                              data-testid={`button-view-complaint-${complaint.id}`}
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
            <DialogTitle>{t("enhancedComplaints.detailTitle")}</DialogTitle>
            <DialogDescription>{t("enhancedComplaints.detailDescription")}</DialogDescription>
          </DialogHeader>
          {selectedComplaint && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">{t("enhancedComplaints.complaintDetails")}</TabsTrigger>
                <TabsTrigger value="updates">{t("enhancedComplaints.updates")}</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">{t("enhancedComplaints.subject")}</Label>
                    <p className="font-medium">{selectedComplaint.subject}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("common.status")}</Label>
                    <div className="mt-1">{getStatusBadge(selectedComplaint.status)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("enhancedComplaints.complainantType")}</Label>
                    <p className="font-medium">{t(`enhancedComplaints.type.${selectedComplaint.complainantType}`)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("enhancedComplaints.priorityLabel")}</Label>
                    <div className="mt-1">{getPriorityBadge(selectedComplaint.priority)}</div>
                  </div>
                  {selectedComplaint.complainantName && (
                    <div>
                      <Label className="text-muted-foreground">{t("enhancedComplaints.complainantName")}</Label>
                      <p className="font-medium">{selectedComplaint.complainantName}</p>
                    </div>
                  )}
                  {selectedComplaint.complainantContact && (
                    <div>
                      <Label className="text-muted-foreground">{t("enhancedComplaints.complainantContact")}</Label>
                      <p className="font-medium">{selectedComplaint.complainantContact}</p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">{t("enhancedComplaints.relatedOffice")}</Label>
                    <p className="font-medium">{getOfficeName(selectedComplaint.officeId)}</p>
                  </div>
                  {selectedComplaint.description && (
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">{t("enhancedComplaints.description")}</Label>
                      <p className="text-sm mt-1">{selectedComplaint.description}</p>
                    </div>
                  )}
                </div>
                <div className="pt-4 border-t">
                  <Label>{t("enhancedComplaints.updateStatus")}</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedComplaint.status === 'RECEIVED' && (
                      <Button size="sm" onClick={() => handleStatusUpdate('UNDER_REVIEW')} data-testid="button-review">
                        <Eye className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                        {t("enhancedComplaints.startReview")}
                      </Button>
                    )}
                    {selectedComplaint.status === 'UNDER_REVIEW' && (
                      <Button size="sm" onClick={() => handleStatusUpdate('IN_PROGRESS')} data-testid="button-progress">
                        <MessageSquareWarning className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                        {t("enhancedComplaints.startWork")}
                      </Button>
                    )}
                    {(selectedComplaint.status === 'IN_PROGRESS' || selectedComplaint.status === 'UNDER_REVIEW') && (
                      <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate('ESCALATED')} data-testid="button-escalate">
                        <ArrowUp className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                        {t("enhancedComplaints.escalate")}
                      </Button>
                    )}
                    {selectedComplaint.status !== 'RESOLVED' && selectedComplaint.status !== 'CLOSED' && (
                      <Button size="sm" onClick={() => handleStatusUpdate('RESOLVED')} data-testid="button-resolve">
                        <CheckCircle className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                        {t("enhancedComplaints.markResolved")}
                      </Button>
                    )}
                    {selectedComplaint.status === 'RESOLVED' && (
                      <Button size="sm" variant="outline" onClick={() => handleStatusUpdate('CLOSED')} data-testid="button-close">
                        <XCircle className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                        {t("enhancedComplaints.closeComplaint")}
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="updates" className="space-y-4 py-4">
                <div className="flex justify-between items-center">
                  <Label>{t("enhancedComplaints.updateHistory")}</Label>
                  <Button size="sm" onClick={() => setIsAddUpdateOpen(true)} data-testid="button-add-update">
                    <Plus className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                    {t("enhancedComplaints.addUpdate")}
                  </Button>
                </div>
                {complaintUpdates.length > 0 ? (
                  <div className="space-y-3">
                    {complaintUpdates.map((update) => (
                      <Card key={update.id} className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              {update.createdAt ? format(new Date(update.createdAt), "PPp") : "-"}
                            </span>
                            {update.updatedBy && (
                              <Badge variant="outline">{update.updatedBy}</Badge>
                            )}
                          </div>
                          <p className="text-sm">{update.updateText}</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    {t("enhancedComplaints.noUpdates")}
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

      <Dialog open={isAddUpdateOpen} onOpenChange={setIsAddUpdateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("enhancedComplaints.addUpdateTitle")}</DialogTitle>
            <DialogDescription>{t("enhancedComplaints.addUpdateDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="updatedBy">{t("enhancedComplaints.updatedBy")}</Label>
              <Input
                id="updatedBy"
                value={newUpdate.updatedBy}
                onChange={(e) => setNewUpdate({ ...newUpdate, updatedBy: e.target.value })}
                placeholder={t("enhancedComplaints.updatedByPlaceholder")}
                data-testid="input-updated-by"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="updateText">{t("enhancedComplaints.updateText")}</Label>
              <Textarea
                id="updateText"
                value={newUpdate.updateText}
                onChange={(e) => setNewUpdate({ ...newUpdate, updateText: e.target.value })}
                placeholder={t("enhancedComplaints.updateTextPlaceholder")}
                data-testid="input-update-text"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddUpdateOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleAddUpdate} disabled={!newUpdate.updateText} data-testid="button-save-update">
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
