import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation, useLanguage } from "@/lib/i18n";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { OfficeSidebar } from "@/components/layout/office-sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload,
  CheckCircle2,
  Loader2,
  CreditCard,
  FileText,
  Download,
  AlertCircle,
  Clock,
  X,
  FileImage,
  Building2
} from "lucide-react";
import type { Payment, Office } from "@shared/schema";

const JSTA_IBAN = "JO71ARAB1310000000114100306009";
const JSTA_BANK = "Arab Bank";
const JSTA_ACCOUNT_NAME = "Jordan Society of Tourism and Travel Agents";
const MEMBERSHIP_FEE = 350;

export default function PaymentForm() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const sidebarSide = language === 'ar' ? 'right' : 'left';
  const dir = language === "ar" ? "rtl" : "ltr";
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: office, isLoading: officeLoading } = useQuery<Office>({
    queryKey: ["/api/office/profile"],
  });

  const { data: payment, isLoading: paymentLoading, refetch: refetchPayment } = useQuery<Payment | null>({
    queryKey: ["/api/payments/current"],
  });

  const createPaymentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/payments", { amount: MEMBERSHIP_FEE });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments/current"] });
    },
  });

  useEffect(() => {
    if (!payment && !paymentLoading && office) {
      createPaymentMutation.mutate();
    }
  }, [payment, paymentLoading, office]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: t("payment.invalidFileType"),
          description: t("payment.allowedFileTypes"),
          variant: "destructive",
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: t("payment.fileTooLarge"),
          description: t("payment.maxFileSize"),
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !payment) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(`/api/payments/${payment.id}/upload-proof`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Upload failed");
      }

      toast({
        title: t("payment.uploadSuccess"),
        description: t("payment.uploadSuccessDesc"),
      });

      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      refetchPayment();
    } catch (error: any) {
      toast({
        title: t("payment.uploadError"),
        description: error.message || t("payment.uploadErrorDesc"),
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> {t("payment.statusPending")}</Badge>;
      case 'UPLOADED':
        return <Badge variant="secondary" className="gap-1"><FileText className="h-3 w-3" /> {t("payment.statusUploaded")}</Badge>;
      case 'APPROVED':
        return <Badge className="gap-1 bg-green-600"><CheckCircle2 className="h-3 w-3" /> {t("payment.statusApproved")}</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive" className="gap-1"><X className="h-3 w-3" /> {t("payment.statusRejected")}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isLoading = officeLoading || paymentLoading;

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full" dir={dir}>
        <OfficeSidebar side={sidebarSide} />
        <SidebarInset className="flex-1 flex flex-col overflow-hidden">
          <header className="flex items-center justify-between gap-2 px-4 py-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>

          <main className="flex-1 overflow-y-auto">
            <div className="container max-w-4xl mx-auto p-6 space-y-6">
              <div>
                <h1 className="text-2xl font-bold" data-testid="text-page-title">{t("payment.title")}</h1>
                <p className="text-muted-foreground">{t("payment.subtitle")}</p>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        {t("payment.bankDetails")}
                      </CardTitle>
                      <CardDescription>{t("payment.bankDetailsDesc")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">{t("payment.bankName")}</p>
                          <p className="font-medium" data-testid="text-bank-name">{JSTA_BANK}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">{t("payment.accountName")}</p>
                          <p className="font-medium" data-testid="text-account-name">{JSTA_ACCOUNT_NAME}</p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">{t("payment.iban")}</p>
                        <div className="flex items-center gap-2">
                          <code className="px-3 py-2 bg-muted rounded-md font-mono text-sm select-all" data-testid="text-iban">
                            {JSTA_IBAN}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              navigator.clipboard.writeText(JSTA_IBAN);
                              toast({ title: t("payment.ibanCopied") });
                            }}
                            data-testid="button-copy-iban"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">{t("payment.amount")}</p>
                            <p className="text-2xl font-bold text-primary" data-testid="text-amount">{MEMBERSHIP_FEE} {t("payment.currency")}</p>
                          </div>
                          <CreditCard className="h-8 w-8 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="flex items-center gap-2">
                          <FileImage className="h-5 w-5" />
                          {t("payment.proofUpload")}
                        </CardTitle>
                        {payment && getStatusBadge(payment.status)}
                      </div>
                      <CardDescription>{t("payment.proofUploadDesc")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {payment?.status === 'REJECTED' && payment.rejectionReason && (
                        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                            <div>
                              <p className="font-medium text-destructive">{t("payment.rejectionReason")}</p>
                              <p className="text-sm text-destructive/80">{payment.rejectionReason}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {payment?.status === 'APPROVED' ? (
                        <div className="p-6 text-center bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                          <CheckCircle2 className="h-12 w-12 mx-auto text-green-600 mb-2" />
                          <p className="font-medium text-green-700 dark:text-green-400">{t("payment.paymentApproved")}</p>
                          <p className="text-sm text-green-600 dark:text-green-500">{t("payment.paymentApprovedDesc")}</p>
                        </div>
                      ) : (
                        <>
                          {payment?.proofFileUrl && payment.status !== 'REJECTED' && (
                            <div className="p-4 bg-muted rounded-lg">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-5 w-5 text-muted-foreground" />
                                  <span className="text-sm">{payment.proofFileName || t("payment.uploadedFile")}</span>
                                </div>
                                <a 
                                  href={payment.proofFileUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline text-sm flex items-center gap-1"
                                >
                                  <Download className="h-4 w-4" />
                                  {t("payment.view")}
                                </a>
                              </div>
                            </div>
                          )}

                          {(payment?.status === 'PENDING' || payment?.status === 'REJECTED') && (
                            <div className="space-y-4">
                              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                                <input
                                  type="file"
                                  ref={fileInputRef}
                                  onChange={handleFileSelect}
                                  accept="image/jpeg,image/png,image/gif,application/pdf"
                                  className="hidden"
                                  data-testid="input-payment-proof"
                                />
                                {selectedFile ? (
                                  <div className="space-y-2">
                                    <FileText className="h-10 w-10 mx-auto text-primary" />
                                    <p className="font-medium">{selectedFile.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                    <div className="flex items-center justify-center gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedFile(null);
                                          if (fileInputRef.current) {
                                            fileInputRef.current.value = "";
                                          }
                                        }}
                                        data-testid="button-clear-file"
                                      >
                                        {t("payment.removeFile")}
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                                    <p className="text-muted-foreground">{t("payment.dropzoneText")}</p>
                                    <Button
                                      variant="outline"
                                      onClick={() => fileInputRef.current?.click()}
                                      data-testid="button-select-file"
                                    >
                                      {t("payment.selectFile")}
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground text-center">
                                {t("payment.allowedFormats")}
                              </p>
                            </div>
                          )}

                          {payment?.status === 'UPLOADED' && (
                            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
                              <div className="flex items-start gap-2">
                                <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
                                <div>
                                  <p className="font-medium text-amber-700 dark:text-amber-400">{t("payment.pendingReview")}</p>
                                  <p className="text-sm text-amber-600 dark:text-amber-500">{t("payment.pendingReviewDesc")}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                    {(payment?.status === 'PENDING' || payment?.status === 'REJECTED') && selectedFile && (
                      <CardFooter>
                        <Button
                          onClick={handleUpload}
                          disabled={isUploading}
                          className="w-full"
                          data-testid="button-upload-proof"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {t("payment.uploading")}
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              {t("payment.uploadProof")}
                            </>
                          )}
                        </Button>
                      </CardFooter>
                    )}
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>{t("payment.instructions")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                        <li>{t("payment.step1")}</li>
                        <li>{t("payment.step2")}</li>
                        <li>{t("payment.step3")}</li>
                        <li>{t("payment.step4")}</li>
                      </ol>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
