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
import { RefreshCw, Handshake, Eye, CheckCircle, XCircle, Clock, Plus, Calendar } from "lucide-react";
import type { AdvocacyCase, AdvocacyEvent, Office } from "@shared/schema";

type CaseWithOffice = AdvocacyCase & { office?: Office };

export default function AdminAdvocacy() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { toast } = useToast();
  const sidebarSide = language === 'ar' ? 'right' : 'left';

  const [selectedCase, setSelectedCase] = useState<CaseWithOffice | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [newEvent, setNewEvent] = useState({ eventType: "NOTE", details: "" });

  const { data: cases, isLoading, refetch } = useQuery<CaseWithOffice[]>({
    queryKey: ["/api/admin/advocacy-cases"],
  });

  const { data: offices } = useQuery<Office[]>({
    queryKey: ["/api/admin/offices"],
  });

  const { data: events } = useQuery<AdvocacyEvent[]>({
    queryKey: ["/api/admin/advocacy-events"],
    enabled: !!selectedCase,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/admin/advocacy-cases/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/advocacy-cases"] });
      toast({
        title: t("advocacy.updateSuccess"),
        description: t("advocacy.updateSuccessDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("advocacy.updateError"),
        description: t("advocacy.updateErrorDesc"),
        variant: "destructive",
      });
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/admin/advocacy-events", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/advocacy-events"] });
      setIsAddEventOpen(false);
      setNewEvent({ eventType: "NOTE", details: "" });
      toast({
        title: t("advocacy.eventCreated"),
        description: t("advocacy.eventCreatedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("advocacy.eventError"),
        description: t("advocacy.eventErrorDesc"),
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      OPEN: { variant: "secondary", icon: Clock },
      IN_PROGRESS: { variant: "default", icon: Handshake },
      RESOLVED: { variant: "default", icon: CheckCircle },
      CLOSED: { variant: "outline", icon: XCircle },
    };
    const config = variants[status] || { variant: "secondary", icon: Clock };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {t(`advocacy.status.${status}`)}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string | null) => {
    if (!priority) return null;
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      LOW: "secondary",
      MEDIUM: "outline",
      HIGH: "default",
      URGENT: "destructive",
    };
    return <Badge variant={variants[priority] || "secondary"}>{t(`advocacy.priority.${priority}`)}</Badge>;
  };

  const handleStatusUpdate = (status: string) => {
    if (!selectedCase) return;
    const updates: any = { status };
    if (status === 'RESOLVED' || status === 'CLOSED') {
      updates.closedAt = new Date().toISOString();
    }
    updateMutation.mutate({ id: selectedCase.id, updates });
  };

  const handleAddEvent = () => {
    if (!selectedCase || !newEvent.eventType) return;
    createEventMutation.mutate({
      caseId: selectedCase.id,
      eventType: newEvent.eventType,
      details: newEvent.details,
    });
  };

  const filteredCases = cases?.filter(c => 
    statusFilter === "ALL" || c.status === statusFilter
  );

  const caseEvents = events?.filter(e => e.caseId === selectedCase?.id) || [];

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
              <h1 className="text-lg font-semibold">{t("advocacy.title")}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status-filter">
                  <SelectValue placeholder={t("common.filter")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("common.all")}</SelectItem>
                  <SelectItem value="OPEN">{t("advocacy.status.OPEN")}</SelectItem>
                  <SelectItem value="IN_PROGRESS">{t("advocacy.status.IN_PROGRESS")}</SelectItem>
                  <SelectItem value="RESOLVED">{t("advocacy.status.RESOLVED")}</SelectItem>
                  <SelectItem value="CLOSED">{t("advocacy.status.CLOSED")}</SelectItem>
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
                  <Handshake className="h-5 w-5" />
                  {t("advocacy.listTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : filteredCases && filteredCases.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("advocacy.office")}</TableHead>
                        <TableHead>{t("advocacy.title")}</TableHead>
                        <TableHead>{t("advocacy.caseType")}</TableHead>
                        <TableHead>{t("advocacy.priority")}</TableHead>
                        <TableHead>{t("common.status")}</TableHead>
                        <TableHead>{t("common.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCases.map((c) => (
                        <TableRow key={c.id} data-testid={`row-case-${c.id}`}>
                          <TableCell className="font-medium">
                            {getOfficeName(c.officeId)}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{c.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {t(`advocacy.caseType.${c.caseType}`)}
                            </Badge>
                          </TableCell>
                          <TableCell>{getPriorityBadge(c.priority)}</TableCell>
                          <TableCell>{getStatusBadge(c.status)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedCase(c);
                                setIsDetailOpen(true);
                              }}
                              data-testid={`button-view-case-${c.id}`}
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
            <DialogTitle>{t("advocacy.detailTitle")}</DialogTitle>
            <DialogDescription>{t("advocacy.detailDescription")}</DialogDescription>
          </DialogHeader>
          {selectedCase && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">{t("advocacy.caseDetails")}</TabsTrigger>
                <TabsTrigger value="events">{t("advocacy.events")}</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">{t("advocacy.office")}</Label>
                    <p className="font-medium">{getOfficeName(selectedCase.officeId)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("common.status")}</Label>
                    <div className="mt-1">{getStatusBadge(selectedCase.status)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("advocacy.caseType")}</Label>
                    <p className="font-medium">{t(`advocacy.caseType.${selectedCase.caseType}`)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t("advocacy.priority")}</Label>
                    <div className="mt-1">{getPriorityBadge(selectedCase.priority)}</div>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">{t("advocacy.title")}</Label>
                    <p className="font-medium">{selectedCase.title}</p>
                  </div>
                  {selectedCase.description && (
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">{t("advocacy.description")}</Label>
                      <p className="text-sm mt-1">{selectedCase.description}</p>
                    </div>
                  )}
                </div>
                <div className="pt-4 border-t">
                  <Label>{t("advocacy.updateStatus")}</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedCase.status === 'OPEN' && (
                      <Button size="sm" onClick={() => handleStatusUpdate('IN_PROGRESS')} data-testid="button-start-case">
                        <Handshake className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                        {t("advocacy.startWork")}
                      </Button>
                    )}
                    {selectedCase.status === 'IN_PROGRESS' && (
                      <Button size="sm" onClick={() => handleStatusUpdate('RESOLVED')} data-testid="button-resolve">
                        <CheckCircle className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                        {t("advocacy.markResolved")}
                      </Button>
                    )}
                    {(selectedCase.status === 'OPEN' || selectedCase.status === 'IN_PROGRESS') && (
                      <Button size="sm" variant="outline" onClick={() => handleStatusUpdate('CLOSED')} data-testid="button-close">
                        <XCircle className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                        {t("advocacy.closeCase")}
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="events" className="space-y-4 py-4">
                <div className="flex justify-between items-center">
                  <Label>{t("advocacy.caseEvents")}</Label>
                  <Button size="sm" onClick={() => setIsAddEventOpen(true)} data-testid="button-add-event">
                    <Plus className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                    {t("advocacy.addEvent")}
                  </Button>
                </div>
                {caseEvents.length > 0 ? (
                  <div className="space-y-3">
                    {caseEvents.map((event) => (
                      <Card key={event.id} className="p-3">
                        <div className="flex items-start gap-3">
                          <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{t(`advocacy.eventType.${event.eventType}`)}</Badge>
                              <span className="text-sm text-muted-foreground">
                                {event.createdAt ? format(new Date(event.createdAt), "PP") : "-"}
                              </span>
                            </div>
                            {event.details && (
                              <p className="text-sm mt-1">{event.details}</p>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    {t("advocacy.noEvents")}
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

      <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("advocacy.addEventTitle")}</DialogTitle>
            <DialogDescription>{t("advocacy.addEventDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="eventType">{t("advocacy.eventType.label")}</Label>
              <Select value={newEvent.eventType} onValueChange={(v) => setNewEvent({ ...newEvent, eventType: v })}>
                <SelectTrigger id="eventType" data-testid="select-event-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOTE">{t("advocacy.eventType.NOTE")}</SelectItem>
                  <SelectItem value="MEETING">{t("advocacy.eventType.MEETING")}</SelectItem>
                  <SelectItem value="DOCUMENT">{t("advocacy.eventType.DOCUMENT")}</SelectItem>
                  <SelectItem value="COMMUNICATION">{t("advocacy.eventType.COMMUNICATION")}</SelectItem>
                  <SelectItem value="RESOLUTION">{t("advocacy.eventType.RESOLUTION")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="eventDetails">{t("advocacy.eventDetails")}</Label>
              <Textarea
                id="eventDetails"
                value={newEvent.details}
                onChange={(e) => setNewEvent({ ...newEvent, details: e.target.value })}
                placeholder={t("advocacy.eventDetailsPlaceholder")}
                data-testid="input-event-details"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddEventOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleAddEvent} data-testid="button-save-event">
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
