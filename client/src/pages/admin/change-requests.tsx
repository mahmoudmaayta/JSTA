import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Textarea } from "@/components/ui/textarea";
import { useTranslation, useLanguage } from "@/lib/i18n";
import { format } from "date-fns";
import { CheckCircle, XCircle, Clock, FileEdit, Building2, Users, FileText, Eye } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ChangeRequest } from "@shared/schema";

type ChangeRequestWithOffice = ChangeRequest & { 
  office: { id: number; tradeNameAr: string; tradeNameEn?: string };
  submitter: { email: string } | null;
};

const requestTypeIcons: Record<string, any> = {
  OFFICE_INFO: Building2,
  BRANCH_CREATE: Building2,
  BRANCH_UPDATE: Building2,
  BRANCH_DELETE: Building2,
  STAFF_CREATE: Users,
  STAFF_UPDATE: Users,
  STAFF_DELETE: Users,
  DOCUMENT_UPLOAD: FileText,
  DOCUMENT_DELETE: FileText,
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400",
  SUBMITTED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function AdminChangeRequests() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { toast } = useToast();
  const sidebarSide = language === 'ar' ? 'right' : 'left';

  const [statusFilter, setStatusFilter] = useState<string>("SUBMITTED");
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequestWithOffice | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null);

  const { data: requests, isLoading, refetch } = useQuery<ChangeRequestWithOffice[]>({
    queryKey: ["/api/admin/change-requests", { status: statusFilter }],
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, note }: { id: number; note?: string }) => {
      const response = await apiRequest("POST", `/api/admin/change-requests/${id}/approve`, { note });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/change-requests"] });
      toast({ title: t("changeRequests.approved"), description: t("changeRequests.approvedDesc") });
      setReviewDialogOpen(false);
      setSelectedRequest(null);
      setReviewNote("");
    },
    onError: () => {
      toast({ title: t("common.error"), description: t("changeRequests.approveError"), variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, note }: { id: number; note?: string }) => {
      const response = await apiRequest("POST", `/api/admin/change-requests/${id}/reject`, { note });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/change-requests"] });
      toast({ title: t("changeRequests.rejected"), description: t("changeRequests.rejectedDesc") });
      setReviewDialogOpen(false);
      setSelectedRequest(null);
      setReviewNote("");
    },
    onError: () => {
      toast({ title: t("common.error"), description: t("changeRequests.rejectError"), variant: "destructive" });
    },
  });

  const handleReview = (request: ChangeRequestWithOffice, action: "approve" | "reject") => {
    setSelectedRequest(request);
    setReviewAction(action);
    setReviewNote("");
    setReviewDialogOpen(true);
  };

  const confirmReview = () => {
    if (!selectedRequest || !reviewAction) return;
    
    if (reviewAction === "approve") {
      approveMutation.mutate({ id: selectedRequest.id, note: reviewNote });
    } else {
      rejectMutation.mutate({ id: selectedRequest.id, note: reviewNote });
    }
  };

  const getRequestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      OFFICE_INFO: t("changeRequests.types.officeInfo"),
      BRANCH_CREATE: t("changeRequests.types.branchCreate"),
      BRANCH_UPDATE: t("changeRequests.types.branchUpdate"),
      BRANCH_DELETE: t("changeRequests.types.branchDelete"),
      STAFF_CREATE: t("changeRequests.types.staffCreate"),
      STAFF_UPDATE: t("changeRequests.types.staffUpdate"),
      STAFF_DELETE: t("changeRequests.types.staffDelete"),
      DOCUMENT_UPLOAD: t("changeRequests.types.documentUpload"),
      DOCUMENT_DELETE: t("changeRequests.types.documentDelete"),
    };
    return labels[type] || type;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      DRAFT: t("changeRequests.status.draft"),
      SUBMITTED: t("changeRequests.status.submitted"),
      APPROVED: t("changeRequests.status.approved"),
      REJECTED: t("changeRequests.status.rejected"),
    };
    return labels[status] || status;
  };

  const renderChangeDiff = (request: ChangeRequestWithOffice) => {
    const current = request.currentData as Record<string, any> || {};
    const proposed = request.proposedData as Record<string, any> || {};
    
    const allKeys = new Set([...Object.keys(current), ...Object.keys(proposed)]);
    const changes: { key: string; oldValue: any; newValue: any }[] = [];
    
    allKeys.forEach(key => {
      if (JSON.stringify(current[key]) !== JSON.stringify(proposed[key])) {
        changes.push({ key, oldValue: current[key], newValue: proposed[key] });
      }
    });

    if (changes.length === 0) {
      return <p className="text-muted-foreground text-sm">{t("changeRequests.noChanges")}</p>;
    }

    return (
      <div className="space-y-2">
        {changes.map(({ key, oldValue, newValue }) => (
          <div key={key} className="border rounded-md p-3 text-sm">
            <div className="font-medium mb-1">{key}</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-muted-foreground text-xs">{t("changeRequests.current")}:</span>
                <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded mt-1">
                  {oldValue !== undefined ? String(oldValue) : "-"}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">{t("changeRequests.proposed")}:</span>
                <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded mt-1">
                  {newValue !== undefined ? String(newValue) : "-"}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <AdminSidebar side={sidebarSide} />
        <SidebarInset className="flex-1">
          <header className="flex h-16 items-center gap-4 border-b px-6">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <h1 className="text-xl font-semibold">{t("changeRequests.title")}</h1>
          </header>

          <main className="flex-1 overflow-auto p-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileEdit className="h-5 w-5" />
                    {t("changeRequests.pendingRequests")}
                  </CardTitle>
                  <CardDescription>{t("changeRequests.description")}</CardDescription>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48" data-testid="select-status-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUBMITTED">{t("changeRequests.status.submitted")}</SelectItem>
                    <SelectItem value="APPROVED">{t("changeRequests.status.approved")}</SelectItem>
                    <SelectItem value="REJECTED">{t("changeRequests.status.rejected")}</SelectItem>
                    <SelectItem value="all">{t("common.all")}</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : !requests || requests.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileEdit className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t("changeRequests.noRequests")}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("changeRequests.office")}</TableHead>
                        <TableHead>{t("changeRequests.type")}</TableHead>
                        <TableHead>{t("changeRequests.submittedBy")}</TableHead>
                        <TableHead>{t("changeRequests.submittedAt")}</TableHead>
                        <TableHead>{t("changeRequests.statusLabel")}</TableHead>
                        <TableHead>{t("common.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((request) => {
                        const Icon = requestTypeIcons[request.requestType] || FileEdit;
                        return (
                          <TableRow key={request.id} data-testid={`row-change-request-${request.id}`}>
                            <TableCell>
                              <div className="font-medium">{request.office?.tradeNameAr}</div>
                              {request.office?.tradeNameEn && (
                                <div className="text-sm text-muted-foreground">{request.office.tradeNameEn}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                                {getRequestTypeLabel(request.requestType)}
                              </div>
                            </TableCell>
                            <TableCell>{request.submitter?.email || "-"}</TableCell>
                            <TableCell>
                              {request.submittedAt ? format(new Date(request.submittedAt), "yyyy-MM-dd HH:mm") : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge className={statusColors[request.status]}>
                                {getStatusLabel(request.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedRequest(request)}
                                  data-testid={`button-view-${request.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {request.status === "SUBMITTED" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => handleReview(request, "approve")}
                                      data-testid={`button-approve-${request.id}`}
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleReview(request, "reject")}
                                      data-testid={`button-reject-${request.id}`}
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </main>
        </SidebarInset>
      </div>

      <Dialog open={!!selectedRequest && !reviewDialogOpen} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("changeRequests.viewRequest")}</DialogTitle>
            <DialogDescription>
              {selectedRequest?.office?.tradeNameAr} - {getRequestTypeLabel(selectedRequest?.requestType || "")}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">{t("changeRequests.statusLabel")}:</span>
                  <Badge className={`ms-2 ${statusColors[selectedRequest.status]}`}>
                    {getStatusLabel(selectedRequest.status)}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("changeRequests.submittedAt")}:</span>
                  <span className="ms-2">
                    {selectedRequest.submittedAt ? format(new Date(selectedRequest.submittedAt), "yyyy-MM-dd HH:mm") : "-"}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">{t("changeRequests.changesRequested")}</h4>
                {renderChangeDiff(selectedRequest)}
              </div>

              {selectedRequest.decisionNote && (
                <div>
                  <h4 className="font-medium mb-2">{t("changeRequests.reviewNote")}</h4>
                  <p className="text-sm bg-muted p-3 rounded">{selectedRequest.decisionNote}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedRequest?.status === "SUBMITTED" && (
              <>
                <Button variant="outline" onClick={() => handleReview(selectedRequest, "reject")}>
                  <XCircle className="h-4 w-4 me-2" />
                  {t("changeRequests.reject")}
                </Button>
                <Button onClick={() => handleReview(selectedRequest, "approve")}>
                  <CheckCircle className="h-4 w-4 me-2" />
                  {t("changeRequests.approve")}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "approve" ? t("changeRequests.confirmApprove") : t("changeRequests.confirmReject")}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === "approve" 
                ? t("changeRequests.confirmApproveDesc") 
                : t("changeRequests.confirmRejectDesc")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t("changeRequests.note")}</label>
              <Textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder={t("changeRequests.notePlaceholder")}
                className="mt-1"
                data-testid="textarea-review-note"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant={reviewAction === "approve" ? "default" : "destructive"}
              onClick={confirmReview}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              data-testid="button-confirm-review"
            >
              {reviewAction === "approve" ? t("changeRequests.approve") : t("changeRequests.reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
