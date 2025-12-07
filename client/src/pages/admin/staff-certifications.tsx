import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { RefreshCw, BadgeCheck, Eye, CheckCircle, XCircle, Clock, FileText, User, Briefcase } from "lucide-react";
import type { StaffCertification, StaffCertDocument, Office } from "@shared/schema";

type CertWithOffice = StaffCertification & { office?: Office };

export default function AdminStaffCertifications() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { toast } = useToast();
  const sidebarSide = language === 'ar' ? 'right' : 'left';

  const [selectedCert, setSelectedCert] = useState<CertWithOffice | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [adminNotes, setAdminNotes] = useState("");

  const { data: certifications, isLoading, refetch } = useQuery<CertWithOffice[]>({
    queryKey: ["/api/admin/staff-certifications"],
  });

  const { data: offices } = useQuery<Office[]>({
    queryKey: ["/api/admin/offices"],
  });

  const { data: documents } = useQuery<StaffCertDocument[]>({
    queryKey: ["/api/admin/staff-cert-documents"],
    enabled: !!selectedCert,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/admin/staff-certifications/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/staff-certifications"] });
      setIsDetailOpen(false);
      toast({
        title: t("staffCertifications.updateSuccess"),
        description: t("staffCertifications.updateSuccessDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("staffCertifications.updateError"),
        description: t("staffCertifications.updateErrorDesc"),
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      SUBMITTED: { variant: "secondary", icon: Clock },
      UNDER_REVIEW: { variant: "outline", icon: Eye },
      APPROVED: { variant: "default", icon: CheckCircle },
      REJECTED: { variant: "destructive", icon: XCircle },
    };
    const config = variants[status] || { variant: "secondary", icon: Clock };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {t(`staffCertifications.status.${status}`)}
      </Badge>
    );
  };

  const handleStatusUpdate = (status: string) => {
    if (!selectedCert) return;
    const updates: any = { status, adminNotes };
    if (status === 'APPROVED' || status === 'REJECTED') {
      updates.decidedAt = new Date().toISOString();
    }
    updateMutation.mutate({ id: selectedCert.id, updates });
  };

  const filteredCerts = certifications?.filter(c => 
    statusFilter === "ALL" || c.status === statusFilter
  );

  const certDocuments = documents?.filter(d => d.certificationId === selectedCert?.id) || [];

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
              <h1 className="text-lg font-semibold">{t("staffCertifications.title")}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status-filter">
                  <SelectValue placeholder={t("common.filter")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("common.all")}</SelectItem>
                  <SelectItem value="SUBMITTED">{t("staffCertifications.status.SUBMITTED")}</SelectItem>
                  <SelectItem value="UNDER_REVIEW">{t("staffCertifications.status.UNDER_REVIEW")}</SelectItem>
                  <SelectItem value="APPROVED">{t("staffCertifications.status.APPROVED")}</SelectItem>
                  <SelectItem value="REJECTED">{t("staffCertifications.status.REJECTED")}</SelectItem>
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
                  <BadgeCheck className="h-5 w-5" />
                  {t("staffCertifications.listTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : filteredCerts && filteredCerts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("staffCertifications.office")}</TableHead>
                        <TableHead>{t("staffCertifications.fullName")}</TableHead>
                        <TableHead>{t("staffCertifications.role")}</TableHead>
                        <TableHead>{t("staffCertifications.yearsExperience")}</TableHead>
                        <TableHead>{t("common.status")}</TableHead>
                        <TableHead>{t("staffCertifications.submittedAt")}</TableHead>
                        <TableHead>{t("common.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCerts.map((cert) => (
                        <TableRow key={cert.id} data-testid={`row-cert-${cert.id}`}>
                          <TableCell className="font-medium">
                            {getOfficeName(cert.officeId)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {cert.fullNameAr || cert.fullNameEn}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4 text-muted-foreground" />
                              {cert.roleApplied ? t(`staffCertifications.role.${cert.roleApplied}`) : "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            {cert.yearsExperience || "-"}
                          </TableCell>
                          <TableCell>{getStatusBadge(cert.status)}</TableCell>
                          <TableCell>
                            {cert.submittedAt ? format(new Date(cert.submittedAt), "PP") : "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedCert(cert);
                                setAdminNotes(cert.adminNotes || "");
                                setIsDetailOpen(true);
                              }}
                              data-testid={`button-view-cert-${cert.id}`}
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
            <DialogTitle>{t("staffCertifications.detailTitle")}</DialogTitle>
            <DialogDescription>{t("staffCertifications.detailDescription")}</DialogDescription>
          </DialogHeader>
          {selectedCert && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">{t("staffCertifications.office")}</Label>
                  <p className="font-medium">{getOfficeName(selectedCert.officeId)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t("common.status")}</Label>
                  <div className="mt-1">{getStatusBadge(selectedCert.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t("staffCertifications.fullName")}</Label>
                  <p className="font-medium">{selectedCert.fullNameAr || selectedCert.fullNameEn}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t("staffCertifications.role")}</Label>
                  <p className="font-medium">{selectedCert.roleApplied ? t(`staffCertifications.role.${selectedCert.roleApplied}`) : "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t("staffCertifications.yearsExperience")}</Label>
                  <p className="font-medium">{selectedCert.yearsExperience || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t("staffCertifications.submittedAt")}</Label>
                  <p className="font-medium">
                    {selectedCert.submittedAt ? format(new Date(selectedCert.submittedAt), "PP") : "-"}
                  </p>
                </div>
                {selectedCert.nationalId && (
                  <div>
                    <Label className="text-muted-foreground">{t("staffCertifications.nationalId")}</Label>
                    <p className="font-medium">{selectedCert.nationalId}</p>
                  </div>
                )}
              </div>

              {certDocuments.length > 0 && (
                <div className="pt-4 border-t">
                  <Label>{t("staffCertifications.attachedDocuments")}</Label>
                  <div className="space-y-2 mt-2">
                    {certDocuments.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm flex-1">{doc.fileName}</span>
                        <Badge variant="outline" className="text-xs">
                          {doc.category}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(selectedCert.status === 'SUBMITTED' || selectedCert.status === 'UNDER_REVIEW') && (
                <div className="pt-4 border-t space-y-3">
                  <div>
                    <Label htmlFor="adminNotes">{t("staffCertifications.adminNotes")}</Label>
                    <Textarea
                      id="adminNotes"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder={t("staffCertifications.adminNotesPlaceholder")}
                      className="mt-1"
                      data-testid="input-admin-notes"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedCert.status === 'SUBMITTED' && (
                      <Button size="sm" variant="outline" onClick={() => handleStatusUpdate('UNDER_REVIEW')} data-testid="button-review">
                        <Eye className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                        {t("staffCertifications.startReview")}
                      </Button>
                    )}
                    <Button size="sm" onClick={() => handleStatusUpdate('APPROVED')} data-testid="button-approve">
                      <CheckCircle className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                      {t("staffCertifications.approve")}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate('REJECTED')} data-testid="button-reject">
                      <XCircle className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                      {t("staffCertifications.reject")}
                    </Button>
                  </div>
                </div>
              )}

              {selectedCert.adminNotes && selectedCert.status !== 'SUBMITTED' && selectedCert.status !== 'UNDER_REVIEW' && (
                <div className="pt-4 border-t">
                  <Label className="text-muted-foreground">{t("staffCertifications.adminNotes")}</Label>
                  <p className="text-sm mt-1">{selectedCert.adminNotes}</p>
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
