import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LoadingPage, LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLanguage, useTranslation } from "@/lib/i18n";
import type { Office } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Send,
  Mail,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  RefreshCw,
  Building2,
  Users,
  AlertCircle,
  MailOpen,
  Key,
  CreditCard,
  FileCheck,
} from "lucide-react";

interface RenewalStats {
  totalActiveOffices: number;
  invitesSent: number;
  tokensRedeemed: number;
  credentialsUpdated: number;
  infoApproved: number;
  paymentsCompleted: number;
  renewalsCompleted: number;
}

interface InvitationStatus {
  officeId: number;
  officeName: string;
  officeNameEn: string;
  email: string;
  lastRenewalYear: number;
  inviteStatus: 'NOT_INVITED' | 'PENDING' | 'SENT' | 'CONSUMED' | 'EXPIRED';
  renewalState: string | null;
  inviteSentAt: string | null;
  tokenRedeemedAt: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  NOT_INVITED: "bg-muted text-muted-foreground",
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  SENT: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  CONSUMED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  EXPIRED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const getInviteStatusLabel = (status: string, t: (key: string) => string): string => {
  const labels: Record<string, string> = {
    NOT_INVITED: t("adminRenewalInvitations.notInvited"),
    PENDING: t("adminRenewalInvitations.pending"),
    SENT: t("adminRenewalInvitations.sentStatus"),
    CONSUMED: t("adminRenewalInvitations.consumed"),
    EXPIRED: t("adminRenewalInvitations.expired"),
  };
  return labels[status] || status.replace(/_/g, " ");
};

const getRenewalStateLabel = (state: string, t: (key: string) => string): string => {
  const labels: Record<string, string> = {
    NOT_STARTED: t("adminRenewalInvitations.stateNotStarted"),
    INVITED: t("adminRenewalInvitations.stateInvited"),
    ACCESS_GRANTED: t("adminRenewalInvitations.stateAccessGranted"),
    CREDENTIALS_UPDATED: t("adminRenewalInvitations.stateCredentialsSet"),
    INFO_APPROVED: t("adminRenewalInvitations.stateInfoApproved"),
    PAYMENT_PENDING: t("adminRenewalInvitations.statePaymentPending"),
    COMPLETED: t("adminRenewalInvitations.stateCompleted"),
  };
  return labels[state] || state;
};

export default function AdminRenewalInvitations() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const { t } = useTranslation();
  const sidebarSide = language === 'ar' ? 'right' : 'left';
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: stats, isLoading: statsLoading } = useQuery<RenewalStats>({
    queryKey: ["/api/admin/renewal-invitations/stats"],
  });

  const { data: invitations, isLoading: invitationsLoading, refetch } = useQuery<InvitationStatus[]>({
    queryKey: ["/api/admin/renewal-invitations"],
  });

  const sendInvitationMutation = useMutation({
    mutationFn: async (officeId: number) => {
      const response = await apiRequest("POST", `/api/admin/renewal-invitations/send/${officeId}`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/renewal-invitations"] });
      toast({
        title: t("adminRenewalInvitations.invitationSent"),
        description: t("adminRenewalInvitations.invitationSentDesc", { email: data.email }),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("adminRenewalInvitations.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendBulkInvitationsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/renewal-invitations/send-bulk");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/renewal-invitations"] });
      toast({
        title: t("adminRenewalInvitations.bulkInvitationsSent"),
        description: t("adminRenewalInvitations.bulkInvitationsSentDesc", { count: data.count }),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("adminRenewalInvitations.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isLoading = statsLoading || invitationsLoading;

  const filteredInvitations = invitations?.filter((inv) => {
    const matchesSearch = 
      inv.officeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.officeNameEn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterStatus === "all" || inv.inviteStatus === filterStatus;
    
    return matchesSearch && matchesFilter;
  }) || [];

  const completionRate = stats ? 
    Math.round((stats.renewalsCompleted / stats.totalActiveOffices) * 100) : 0;

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  if (isLoading) {
    return <LoadingPage message={t("adminRenewalInvitations.loading")} />;
  }

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className={`flex min-h-screen w-full ${language === 'ar' ? 'flex-row-reverse' : ''}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <AdminSidebar side={sidebarSide} />
        <SidebarInset className="flex-1">
          <header className="flex items-center justify-between gap-2 p-4 border-b">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="text-xl font-semibold">{t("adminRenewalInvitations.title")}</h1>
            </div>
            <Button
              onClick={() => sendBulkInvitationsMutation.mutate()}
              disabled={sendBulkInvitationsMutation.isPending}
              data-testid="button-send-bulk"
            >
              {sendBulkInvitationsMutation.isPending ? (
                <LoadingSpinner />
              ) : (
                <Send className={`w-4 h-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
              )}
              {t("adminRenewalInvitations.sendAllPending")}
            </Button>
          </header>

          <main className="p-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("adminRenewalInvitations.activeOffices")}</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalActiveOffices || 0}</div>
                  <p className="text-xs text-muted-foreground">{t("adminRenewalInvitations.activeOfficesDesc")}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("adminRenewalInvitations.invitesSent")}</CardTitle>
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.invitesSent || 0}</div>
                  <p className="text-xs text-muted-foreground">{t("adminRenewalInvitations.invitesSentDesc")}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("adminRenewalInvitations.credentialsSet")}</CardTitle>
                  <Key className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.credentialsUpdated || 0}</div>
                  <p className="text-xs text-muted-foreground">{t("adminRenewalInvitations.credentialsSetDesc")}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("adminRenewalInvitations.completed")}</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.renewalsCompleted || 0}</div>
                  <p className="text-xs text-muted-foreground">{t("adminRenewalInvitations.completedDesc")}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t("adminRenewalInvitations.renewalProgress")}</CardTitle>
                <CardDescription>{t("adminRenewalInvitations.renewalProgressDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>{t("adminRenewalInvitations.completionRate")}</span>
                    <span className="font-medium">{completionRate}%</span>
                  </div>
                  <Progress value={completionRate} />
                  <div className="grid gap-2 md:grid-cols-5 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-500" />
                      <span>{t("adminRenewalInvitations.sent")}: {stats?.invitesSent || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MailOpen className="w-4 h-4 text-orange-500" />
                      <span>{t("adminRenewalInvitations.redeemed")}: {stats?.tokensRedeemed || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-purple-500" />
                      <span>{t("adminRenewalInvitations.credentials")}: {stats?.credentialsUpdated || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-teal-500" />
                      <span>{t("adminRenewalInvitations.infoOk")}: {stats?.infoApproved || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-green-500" />
                      <span>{t("adminRenewalInvitations.paid")}: {stats?.paymentsCompleted || 0}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle>{t("adminRenewalInvitations.invitationStatus")}</CardTitle>
                    <CardDescription>{t("adminRenewalInvitations.invitationStatusDesc")}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                      <Input
                        placeholder={t("adminRenewalInvitations.searchOffices")}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`${language === 'ar' ? 'pr-9' : 'pl-9'} w-64`}
                        data-testid="input-search-offices"
                      />
                    </div>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="border rounded-md px-3 py-2 text-sm bg-background"
                      data-testid="select-filter-status"
                    >
                      <option value="all">{t("adminRenewalInvitations.allStatus")}</option>
                      <option value="NOT_INVITED">{t("adminRenewalInvitations.notInvited")}</option>
                      <option value="PENDING">{t("adminRenewalInvitations.pending")}</option>
                      <option value="SENT">{t("adminRenewalInvitations.sentStatus")}</option>
                      <option value="CONSUMED">{t("adminRenewalInvitations.consumed")}</option>
                      <option value="EXPIRED">{t("adminRenewalInvitations.expired")}</option>
                    </select>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => refetch()}
                      data-testid="button-refresh"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredInvitations.length === 0 ? (
                  <EmptyState
                    icon={Building2}
                    title={t("adminRenewalInvitations.noOfficesFound")}
                    description={t("adminRenewalInvitations.noMatchingCriteria")}
                  />
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("adminRenewalInvitations.office")}</TableHead>
                          <TableHead>{t("adminRenewalInvitations.email")}</TableHead>
                          <TableHead>{t("adminRenewalInvitations.inviteStatus")}</TableHead>
                          <TableHead>{t("adminRenewalInvitations.renewalState")}</TableHead>
                          <TableHead className={language === 'ar' ? 'text-left' : 'text-right'}>{t("adminRenewalInvitations.actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInvitations.slice(0, 25).map((inv) => (
                          <TableRow key={inv.officeId} data-testid={`row-office-${inv.officeId}`}>
                            <TableCell>
                              <div className="font-medium">{inv.officeName}</div>
                              {inv.officeNameEn && (
                                <div className="text-sm text-muted-foreground">{inv.officeNameEn}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">{inv.email || "-"}</TableCell>
                            <TableCell>
                              <Badge className={STATUS_COLORS[inv.inviteStatus] || ""}>
                                {getInviteStatusLabel(inv.inviteStatus, t)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {inv.renewalState ? (
                                <span className="text-sm">
                                  {getRenewalStateLabel(inv.renewalState, t)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className={language === 'ar' ? 'text-left' : 'text-right'}>
                              {(inv.inviteStatus === 'NOT_INVITED' || inv.inviteStatus === 'EXPIRED') && (
                                <Button
                                  size="sm"
                                  onClick={() => sendInvitationMutation.mutate(inv.officeId)}
                                  disabled={sendInvitationMutation.isPending || !inv.email}
                                  data-testid={`button-send-${inv.officeId}`}
                                >
                                  <Send className={`w-4 h-4 ${language === 'ar' ? 'ml-1' : 'mr-1'}`} />
                                  {t("adminRenewalInvitations.send")}
                                </Button>
                              )}
                              {inv.inviteStatus === 'SENT' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => sendInvitationMutation.mutate(inv.officeId)}
                                  disabled={sendInvitationMutation.isPending}
                                  data-testid={`button-resend-${inv.officeId}`}
                                >
                                  <RefreshCw className={`w-4 h-4 ${language === 'ar' ? 'ml-1' : 'mr-1'}`} />
                                  {t("adminRenewalInvitations.resend")}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {filteredInvitations.length > 25 && (
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    {t("adminRenewalInvitations.showing", { count: 25, total: filteredInvitations.length })}
                  </p>
                )}
              </CardContent>
            </Card>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
