import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { LoadingPage, LoadingSpinner } from "@/components/ui/loading-spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { LicenseRenewal, Office } from "@shared/schema";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  Download,
  FileText,
  Building,
  AlertCircle,
  Clock,
} from "lucide-react";

interface RenewalDetailResponse {
  renewal: LicenseRenewal;
  office: Office;
}

export default function AdminRenewalDetail() {
  const params = useParams();
  const renewalId = params.id;
  const { toast } = useToast();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState("");

  const { data, isLoading } = useQuery<RenewalDetailResponse>({
    queryKey: ["/api/admin/renewals", renewalId],
  });

  const approveDownloadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/admin/renewals/${renewalId}/approve-download`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to approve renewal");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/renewals", renewalId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/renewals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Renewal Approved",
        description: "The office can now download the renewal document.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const finalApproveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/admin/renewals/${renewalId}/final-approve`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to final approve renewal");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/renewals", renewalId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/renewals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Renewal Fully Approved",
        description: "The license renewal has been fully approved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (comment: string) => {
      const response = await apiRequest("POST", `/api/admin/renewals/${renewalId}/reject`, { comment });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reject renewal");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/renewals", renewalId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/renewals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setRejectDialogOpen(false);
      toast({
        title: "Renewal Rejected",
        description: "The license renewal has been rejected.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const getActionButtons = () => {
    if (!data?.renewal) return null;

    switch (data.renewal.status) {
      case "SUBMITTED":
      case "UNDER_REVIEW":
        return (
          <div className="flex gap-2">
            <Button
              onClick={() => approveDownloadMutation.mutate()}
              disabled={approveDownloadMutation.isPending}
              className="gap-2"
              data-testid="button-approve-download"
            >
              {approveDownloadMutation.isPending ? (
                <LoadingSpinner size="sm" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Approve for Download
            </Button>
            <Button
              variant="destructive"
              onClick={() => setRejectDialogOpen(true)}
              className="gap-2"
              data-testid="button-reject"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
          </div>
        );
      case "MINISTRY_DOC_UPLOADED":
        return (
          <div className="flex gap-2">
            <Button
              onClick={() => finalApproveMutation.mutate()}
              disabled={finalApproveMutation.isPending}
              className="gap-2"
              data-testid="button-final-approve"
            >
              {finalApproveMutation.isPending ? (
                <LoadingSpinner size="sm" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Final Approve
            </Button>
            <Button
              variant="destructive"
              onClick={() => setRejectDialogOpen(true)}
              className="gap-2"
              data-testid="button-reject"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <AdminSidebar />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <Link href="/admin/renewals">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
                Back to Renewals
              </Button>
            </Link>
          </header>

          <main className="flex-1 p-4 sm:p-6">
            {isLoading ? (
              <LoadingPage message="Loading renewal details..." />
            ) : data?.renewal ? (
              <div className="space-y-6 max-w-4xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <Calendar className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Renewal {data.renewal.year}</h2>
                      <p className="text-muted-foreground">
                        {data.office?.tradeNameAr || `Office #${data.renewal.officeId}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <StatusBadge status={data.renewal.status as any} />
                    {getActionButtons()}
                  </div>
                </div>

                {data.renewal.status === "REJECTED" && data.renewal.adminComment && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Renewal Rejected</AlertTitle>
                    <AlertDescription>{data.renewal.adminComment}</AlertDescription>
                  </Alert>
                )}

                {data.renewal.status === "MINISTRY_DOC_UPLOADED" && (
                  <Card className="border-indigo-200 bg-indigo-50/50 dark:border-indigo-800 dark:bg-indigo-900/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                        <FileText className="h-5 w-5" />
                        Ministry Document Uploaded
                      </CardTitle>
                      <CardDescription>
                        The office has uploaded their Ministry-approved document. Review and provide final approval.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <a href={`/api/documents/ministry/${data.renewal.id}/download`} data-testid="button-download-ministry">
                        <Button variant="outline" className="gap-2">
                          <Download className="h-4 w-4" />
                          Download Ministry Document
                        </Button>
                      </a>
                    </CardContent>
                  </Card>
                )}

                {data.renewal.status === "FINAL_APPROVED" && (
                  <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <AlertTitle className="text-emerald-700 dark:text-emerald-400">
                      Renewal Fully Approved
                    </AlertTitle>
                    <AlertDescription className="text-emerald-600 dark:text-emerald-300">
                      This license renewal has been fully approved.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Renewal Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Renewal ID</dt>
                          <dd className="font-mono">{data.renewal.id}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Year</dt>
                          <dd className="font-medium">{data.renewal.year}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Status</dt>
                          <dd>
                            <StatusBadge status={data.renewal.status as any} size="sm" />
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Submitted</dt>
                          <dd>{new Date(data.renewal.createdAt).toLocaleString()}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Last Updated</dt>
                          <dd>{new Date(data.renewal.updatedAt).toLocaleString()}</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        Office Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Office ID</dt>
                          <dd className="font-mono">{data.office?.id}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Trade Name</dt>
                          <dd className="font-medium text-right">{data.office?.tradeNameAr}</dd>
                        </div>
                        {data.office?.mainCity && (
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">City</dt>
                            <dd className="text-right">{data.office.mainCity}</dd>
                          </div>
                        )}
                        {data.office?.phone && (
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Phone</dt>
                            <dd className="text-right">{data.office.phone}</dd>
                          </div>
                        )}
                        {data.office?.mainEmail && (
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Email</dt>
                            <dd className="text-right truncate max-w-[150px]">{data.office.mainEmail}</dd>
                          </div>
                        )}
                      </dl>
                      <div className="mt-4 pt-4 border-t">
                        <Link href={`/admin/offices/${data.office?.id}`}>
                          <Button variant="outline" size="sm" className="w-full gap-2" data-testid="link-office-detail">
                            <Building className="h-4 w-4" />
                            View Full Office Details
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold">Renewal Not Found</h3>
                <p className="text-muted-foreground mb-4">
                  The renewal request you're looking for doesn't exist.
                </p>
                <Link href="/admin/renewals">
                  <Button variant="outline">Back to Renewals</Button>
                </Link>
              </div>
            )}
          </main>
        </SidebarInset>
      </div>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Renewal Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this renewal request. This will be sent to the office.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason..."
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            className="min-h-[100px]"
            data-testid="textarea-reject-reason"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectMutation.mutate(rejectComment)}
              disabled={rejectMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? <LoadingSpinner size="sm" /> : "Reject Renewal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
