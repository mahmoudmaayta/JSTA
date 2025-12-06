import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LoadingPage, LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Office } from "@shared/schema";
import { 
  CreditCard, 
  Search, 
  CheckCircle2, 
  X, 
  Clock, 
  FileText, 
  Building2,
  Tag,
  Download,
  AlertCircle
} from "lucide-react";

interface Payment {
  id: number;
  officeId: number;
  renewalId: number | null;
  amount: number;
  promoCodeId: number | null;
  discountAmount: number | null;
  finalAmount: number | null;
  status: 'PENDING' | 'UPLOADED' | 'APPROVED' | 'REJECTED';
  proofFileUrl: string | null;
  proofFileName: string | null;
  rejectionReason: string | null;
  approvedByUserId: number | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  office?: Office;
}

export default function AdminPayments() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const sidebarSide = language === 'ar' ? 'right' : 'left';

  const { data: payments, isLoading } = useQuery<Payment[]>({
    queryKey: ["/api/admin/payments"],
  });

  const approveMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      const response = await apiRequest("POST", `/api/admin/payments/${paymentId}/approve`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payments"] });
      toast({
        title: t("adminPayments.approveSuccess"),
        description: t("adminPayments.approveSuccessDesc"),
      });
      setSelectedPayment(null);
    },
    onError: (error: Error) => {
      toast({
        title: t("adminPayments.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ paymentId, reason }: { paymentId: number; reason: string }) => {
      const response = await apiRequest("POST", `/api/admin/payments/${paymentId}/reject`, { reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payments"] });
      toast({
        title: t("adminPayments.rejectSuccess"),
        description: t("adminPayments.rejectSuccessDesc"),
      });
      setShowRejectDialog(false);
      setRejectionReason("");
      setSelectedPayment(null);
    },
    onError: (error: Error) => {
      toast({
        title: t("adminPayments.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> {t("adminPayments.statusPending")}</Badge>;
      case 'UPLOADED':
        return <Badge variant="secondary" className="gap-1"><FileText className="h-3 w-3" /> {t("adminPayments.statusUploaded")}</Badge>;
      case 'APPROVED':
        return <Badge className="gap-1 bg-green-600"><CheckCircle2 className="h-3 w-3" /> {t("adminPayments.statusApproved")}</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive" className="gap-1"><X className="h-3 w-3" /> {t("adminPayments.statusRejected")}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredPayments = payments?.filter((payment) => {
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    const matchesSearch = 
      payment.office?.tradeNameAr?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.office?.tradeNameEn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(payment.id).includes(searchQuery);
    return matchesStatus && matchesSearch;
  }) || [];

  const handleApprove = (payment: Payment) => {
    approveMutation.mutate(payment.id);
  };

  const handleReject = () => {
    if (selectedPayment && rejectionReason.trim()) {
      rejectMutation.mutate({ paymentId: selectedPayment.id, reason: rejectionReason });
    }
  };

  const openRejectDialog = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowRejectDialog(true);
  };

  const formatAmount = (amount: number) => {
    return `${amount} ${t("adminPayments.jod")}`;
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className={`flex min-h-screen w-full ${language === 'ar' ? 'flex-row-reverse' : ''}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <AdminSidebar key={`sidebar-${language}`} side={sidebarSide} />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold">{t("navigation.payments")}</h1>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6">
            {isLoading ? (
              <LoadingPage message={t("adminPayments.loading")} />
            ) : (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">{t("adminPayments.title")}</h2>
                  <p className="text-muted-foreground">
                    {t("adminPayments.subtitle")}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {t("adminPayments.totalPayments")}
                      </CardTitle>
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold" data-testid="text-total-payments">{payments?.length || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {t("adminPayments.awaitingReview")}
                      </CardTitle>
                      <Clock className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-amber-600" data-testid="text-pending-payments">
                        {payments?.filter(p => p.status === 'UPLOADED').length || 0}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {t("adminPayments.approved")}
                      </CardTitle>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-green-600" data-testid="text-approved-payments">
                        {payments?.filter(p => p.status === 'APPROVED').length || 0}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {t("adminPayments.rejected")}
                      </CardTitle>
                      <X className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-red-600" data-testid="text-rejected-payments">
                        {payments?.filter(p => p.status === 'REJECTED').length || 0}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3" />
                        <Input
                          placeholder={t("adminPayments.searchPlaceholder")}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 rtl:pl-3 rtl:pr-9"
                          data-testid="input-search"
                        />
                      </div>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-status">
                          <SelectValue placeholder={t("adminPayments.filterByStatus")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("adminPayments.allStatuses")}</SelectItem>
                          <SelectItem value="PENDING">{t("adminPayments.statusPending")}</SelectItem>
                          <SelectItem value="UPLOADED">{t("adminPayments.statusUploaded")}</SelectItem>
                          <SelectItem value="APPROVED">{t("adminPayments.statusApproved")}</SelectItem>
                          <SelectItem value="REJECTED">{t("adminPayments.statusRejected")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {filteredPayments.length > 0 ? (
                      <div className="rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("adminPayments.tableId")}</TableHead>
                              <TableHead>{t("adminPayments.tableOffice")}</TableHead>
                              <TableHead>{t("adminPayments.tableOriginalAmount")}</TableHead>
                              <TableHead>{t("adminPayments.tableDiscount")}</TableHead>
                              <TableHead>{t("adminPayments.tableFinalAmount")}</TableHead>
                              <TableHead>{t("adminPayments.tableStatus")}</TableHead>
                              <TableHead>{t("adminPayments.tableProof")}</TableHead>
                              <TableHead className={language === 'ar' ? 'text-left' : 'text-right'}>{t("adminPayments.tableActions")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredPayments.map((payment) => (
                              <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                                <TableCell className="font-mono text-sm">
                                  {payment.id}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="font-medium">
                                        {payment.office?.tradeNameAr || `${t("adminPayments.officeIdFallback")}${payment.officeId}`}
                                      </p>
                                      {payment.office?.tradeNameEn && (
                                        <p className="text-xs text-muted-foreground">{payment.office.tradeNameEn}</p>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {formatAmount(payment.amount)}
                                </TableCell>
                                <TableCell>
                                  {payment.discountAmount && payment.discountAmount > 0 ? (
                                    <div className="flex items-center gap-1 text-green-600">
                                      <Tag className="h-3 w-3" />
                                      -{formatAmount(payment.discountAmount)}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="font-semibold">
                                  {formatAmount(payment.finalAmount || payment.amount)}
                                </TableCell>
                                <TableCell>
                                  {getStatusBadge(payment.status)}
                                </TableCell>
                                <TableCell>
                                  {payment.proofFileUrl ? (
                                    <a 
                                      href={payment.proofFileUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-primary hover:underline"
                                      data-testid={`link-proof-${payment.id}`}
                                    >
                                      <Download className="h-4 w-4" />
                                      {t("adminPayments.viewProof")}
                                    </a>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">
                                      {t("adminPayments.notUploaded")}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className={language === 'ar' ? 'text-left' : 'text-right'}>
                                  <div className={`flex items-center gap-2 ${language === 'ar' ? 'justify-start' : 'justify-end'}`}>
                                    {payment.status === 'UPLOADED' && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="default"
                                          className="gap-1 bg-green-600 hover:bg-green-700"
                                          onClick={() => handleApprove(payment)}
                                          disabled={approveMutation.isPending}
                                          data-testid={`button-approve-${payment.id}`}
                                        >
                                          {approveMutation.isPending ? (
                                            <LoadingSpinner size="sm" />
                                          ) : (
                                            <CheckCircle2 className="h-4 w-4" />
                                          )}
                                          {t("adminPayments.approve")}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          className="gap-1"
                                          onClick={() => openRejectDialog(payment)}
                                          data-testid={`button-reject-${payment.id}`}
                                        >
                                          <X className="h-4 w-4" />
                                          {t("adminPayments.reject")}
                                        </Button>
                                      </>
                                    )}
                                    {payment.status === 'REJECTED' && payment.rejectionReason && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="gap-1"
                                        onClick={() => {
                                          toast({
                                            title: t("adminPayments.rejectionReason"),
                                            description: payment.rejectionReason,
                                          });
                                        }}
                                        data-testid={`button-view-reason-${payment.id}`}
                                      >
                                        <AlertCircle className="h-4 w-4" />
                                        {t("adminPayments.viewReason")}
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <EmptyState
                        icon={CreditCard}
                        title={t("adminPayments.noPayments")}
                        description={t("adminPayments.noPaymentsDesc")}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </main>
        </SidebarInset>
      </div>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("adminPayments.rejectTitle")}</DialogTitle>
            <DialogDescription>
              {t("adminPayments.rejectDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder={t("adminPayments.rejectionReasonPlaceholder")}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px]"
              data-testid="input-rejection-reason"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason("");
              }}
              data-testid="button-cancel-reject"
            >
              {t("adminPayments.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? (
                <LoadingSpinner size="sm" />
              ) : (
                t("adminPayments.confirmReject")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
