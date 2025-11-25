import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { LoadingPage, LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Office, Branch, Document } from "@shared/schema";
import {
  Building,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  MapPin,
  FileText,
  Download,
  Phone,
  Mail,
  Globe,
  Calendar,
  User,
  FolderOpen,
  AlertCircle,
} from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  INITIAL_FIRST_FORMS: "Membership & Info Forms",
  INITIAL_SECOND_LEGAL: "Legal / Commercial Documents",
  INITIAL_THIRD_PERSONAL: "Personal Documents",
};

const ACTIVITY_LABELS: Record<string, string> = {
  tickets: "Air Tickets",
  inbound: "Inbound Tourism",
  outbound: "Outbound Tourism",
  hajj_umrah: "Hajj & Umrah",
  domestic: "Domestic Tourism",
};

interface OfficeDetailResponse {
  office: Office;
  branches: Branch[];
  documents: Document[];
}

export default function AdminOfficeDetail() {
  const params = useParams();
  const officeId = params.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState("");

  const { data, isLoading } = useQuery<OfficeDetailResponse>({
    queryKey: ["/api/admin/offices", officeId],
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/admin/offices/${officeId}/approve`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to approve office");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offices", officeId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Office Approved",
        description: "The office has been approved and can now access the portal.",
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
      const response = await apiRequest("POST", `/api/admin/offices/${officeId}/reject`, { comment });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reject office");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offices", officeId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setRejectDialogOpen(false);
      toast({
        title: "Office Rejected",
        description: "The office registration has been rejected.",
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

  const groupedDocuments = data?.documents.reduce((acc, doc) => {
    const category = doc.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(doc);
    return acc;
  }, {} as Record<string, Document[]>) || {};

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <AdminSidebar />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <Link href="/admin/offices">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
                Back to Offices
              </Button>
            </Link>
          </header>

          <main className="flex-1 p-4 sm:p-6">
            {isLoading ? (
              <LoadingPage message="Loading office details..." />
            ) : data?.office ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <Building className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold" data-testid="text-office-name">
                        {data.office.tradeNameAr}
                      </h2>
                      <p className="text-muted-foreground">
                        Office ID: {data.office.id}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <StatusBadge status={data.office.status as any} />
                    {data.office.status === "PENDING_APPROVAL" && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => approveMutation.mutate()}
                          disabled={approveMutation.isPending}
                          className="gap-2"
                          data-testid="button-approve"
                        >
                          {approveMutation.isPending ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          Approve
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
                    )}
                  </div>
                </div>

                {data.office.adminComment && data.office.status === "REJECTED" && (
                  <Card className="border-destructive bg-destructive/5">
                    <CardContent className="pt-4">
                      <p className="text-sm">
                        <span className="font-medium">Rejection Reason:</span> {data.office.adminComment}
                      </p>
                    </CardContent>
                  </Card>
                )}

                <Tabs defaultValue="info">
                  <TabsList>
                    <TabsTrigger value="info" data-testid="tab-info">Office Info</TabsTrigger>
                    <TabsTrigger value="branches" data-testid="tab-branches">
                      Branches ({data.branches.length})
                    </TabsTrigger>
                    <TabsTrigger value="documents" data-testid="tab-documents">
                      Documents ({data.documents.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="info" className="mt-4">
                    <div className="grid gap-6 lg:grid-cols-2">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Basic Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <dl className="space-y-3 text-sm">
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">Trade Name</dt>
                              <dd className="font-medium text-right">{data.office.tradeNameAr}</dd>
                            </div>
                            {data.office.legalNameRegistrar && (
                              <div className="flex justify-between">
                                <dt className="text-muted-foreground">Legal Name</dt>
                                <dd className="font-medium text-right">{data.office.legalNameRegistrar}</dd>
                              </div>
                            )}
                            {data.office.nationalEstablishmentNumber && (
                              <div className="flex justify-between">
                                <dt className="text-muted-foreground">Establishment No.</dt>
                                <dd className="font-mono text-right">{data.office.nationalEstablishmentNumber}</dd>
                              </div>
                            )}
                            {data.office.socialSecurityNumber && (
                              <div className="flex justify-between">
                                <dt className="text-muted-foreground">SSN</dt>
                                <dd className="font-mono text-right">{data.office.socialSecurityNumber}</dd>
                              </div>
                            )}
                            {data.office.guaranteeExpiryDate && (
                              <div className="flex justify-between">
                                <dt className="text-muted-foreground">Guarantee Expiry</dt>
                                <dd className="text-right">{data.office.guaranteeExpiryDate}</dd>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">Registered</dt>
                              <dd className="text-right">
                                {new Date(data.office.createdAt).toLocaleDateString()}
                              </dd>
                            </div>
                          </dl>

                          {data.office.tourismActivities && (data.office.tourismActivities as string[]).length > 0 && (
                            <div className="mt-4 pt-4 border-t">
                              <p className="text-sm font-medium mb-2">Tourism Activities</p>
                              <div className="flex flex-wrap gap-1">
                                {(data.office.tourismActivities as string[]).map((activity) => (
                                  <Badge key={activity} variant="secondary" className="text-xs">
                                    {ACTIVITY_LABELS[activity] || activity}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Contact Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <dl className="space-y-3 text-sm">
                            {data.office.mainCity && (
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                <div>
                                  <span className="font-medium">
                                    {[data.office.mainCity, data.office.mainArea, data.office.mainStreet, data.office.mainBuildingNumber]
                                      .filter(Boolean)
                                      .join(", ")}
                                  </span>
                                </div>
                              </div>
                            )}
                            {data.office.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{data.office.phone}</span>
                              </div>
                            )}
                            {data.office.mobile && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{data.office.mobile} (Mobile)</span>
                              </div>
                            )}
                            {data.office.mainEmail && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span>{data.office.mainEmail}</span>
                              </div>
                            )}
                            {data.office.extraEmail && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span>{data.office.extraEmail}</span>
                              </div>
                            )}
                            {data.office.website && (
                              <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4 text-muted-foreground" />
                                <a href={data.office.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                  {data.office.website}
                                </a>
                              </div>
                            )}
                            {(data.office.poBox || data.office.postalCode) && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span>
                                  {data.office.poBox && `P.O. Box: ${data.office.poBox}`}
                                  {data.office.poBox && data.office.postalCode && ", "}
                                  {data.office.postalCode && `Postal: ${data.office.postalCode}`}
                                </span>
                              </div>
                            )}
                          </dl>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="branches" className="mt-4">
                    {data.branches.length > 0 ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        {data.branches.map((branch, index) => (
                          <Card key={branch.id}>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                Branch {index + 1}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <dl className="space-y-2 text-sm">
                                {branch.city && (
                                  <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Location</dt>
                                    <dd className="text-right">
                                      {[branch.city, branch.area].filter(Boolean).join(", ")}
                                    </dd>
                                  </div>
                                )}
                                {branch.street && (
                                  <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Address</dt>
                                    <dd className="text-right">
                                      {[branch.street, branch.buildingNumber].filter(Boolean).join(", ")}
                                    </dd>
                                  </div>
                                )}
                                {branch.managerName && (
                                  <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Manager</dt>
                                    <dd className="text-right">{branch.managerName}</dd>
                                  </div>
                                )}
                                {branch.managerMobile && (
                                  <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Manager Mobile</dt>
                                    <dd className="text-right">{branch.managerMobile}</dd>
                                  </div>
                                )}
                                {branch.phone && (
                                  <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Phone</dt>
                                    <dd className="text-right">{branch.phone}</dd>
                                  </div>
                                )}
                              </dl>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="py-12">
                          <EmptyState
                            icon={MapPin}
                            title="No Branches"
                            description="This office has not registered any branch locations."
                          />
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="documents" className="mt-4">
                    {Object.keys(groupedDocuments).length > 0 ? (
                      <div className="space-y-4">
                        {Object.entries(groupedDocuments).map(([category, docs]) => (
                          <Card key={category}>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base flex items-center gap-2">
                                <FolderOpen className="h-4 w-4" />
                                {CATEGORY_LABELS[category] || category}
                              </CardTitle>
                              <CardDescription>{docs.length} file(s)</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                {docs.map((doc) => (
                                  <div
                                    key={doc.id}
                                    className="flex items-center justify-between rounded-lg border p-3"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                                      <div className="min-w-0">
                                        <p className="font-medium truncate text-sm">{doc.originalFilename}</p>
                                        <p className="text-xs text-muted-foreground">
                                          Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                                        </p>
                                      </div>
                                    </div>
                                    <a href={`/api/documents/${doc.id}/download`} data-testid={`button-download-${doc.id}`}>
                                      <Button variant="outline" size="sm" className="gap-2">
                                        <Download className="h-4 w-4" />
                                        Download
                                      </Button>
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="py-12">
                          <EmptyState
                            icon={FileText}
                            title="No Documents"
                            description="No documents have been uploaded for this office."
                          />
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold">Office Not Found</h3>
                <p className="text-muted-foreground mb-4">
                  The office you're looking for doesn't exist.
                </p>
                <Link href="/admin/offices">
                  <Button variant="outline">Back to Offices</Button>
                </Link>
              </div>
            )}
          </main>
        </SidebarInset>
      </div>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Office Registration</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this office registration. This will be sent to the applicant.
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
              {rejectMutation.isPending ? <LoadingSpinner size="sm" /> : "Reject Office"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
