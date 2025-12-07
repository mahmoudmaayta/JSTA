import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
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
import { RefreshCw, IdCard, Eye, CheckCircle, XCircle, Clock, Printer } from "lucide-react";
import type { MembershipCard, Office } from "@shared/schema";

type CardWithOffice = MembershipCard & { office?: Office };

export default function AdminMembershipCards() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { toast } = useToast();
  const sidebarSide = language === 'ar' ? 'right' : 'left';

  const [selectedCard, setSelectedCard] = useState<CardWithOffice | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const { data: cards, isLoading, refetch } = useQuery<CardWithOffice[]>({
    queryKey: ["/api/admin/membership-cards"],
  });

  const { data: offices } = useQuery<Office[]>({
    queryKey: ["/api/admin/offices"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/admin/membership-cards/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/membership-cards"] });
      setIsDetailOpen(false);
      toast({
        title: t("membershipCards.updateSuccess"),
        description: t("membershipCards.updateSuccessDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("membershipCards.updateError"),
        description: t("membershipCards.updateErrorDesc"),
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      PENDING: { variant: "secondary", icon: Clock },
      APPROVED: { variant: "default", icon: CheckCircle },
      ISSUED: { variant: "default", icon: IdCard },
      EXPIRED: { variant: "outline", icon: Clock },
      REVOKED: { variant: "destructive", icon: XCircle },
    };
    const config = variants[status] || { variant: "secondary", icon: Clock };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {t(`membershipCards.status.${status}`)}
      </Badge>
    );
  };

  const handleStatusUpdate = (status: string) => {
    if (!selectedCard) return;
    const updates: any = { status };
    if (status === 'ISSUED') {
      updates.issuedAt = new Date().toISOString();
    }
    updateMutation.mutate({ id: selectedCard.id, updates });
  };

  const filteredCards = cards?.filter(card => 
    statusFilter === "ALL" || card.status === statusFilter
  );

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
              <h1 className="text-lg font-semibold">{t("membershipCards.title")}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status-filter">
                  <SelectValue placeholder={t("common.filter")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("common.all")}</SelectItem>
                  <SelectItem value="PENDING">{t("membershipCards.status.PENDING")}</SelectItem>
                  <SelectItem value="APPROVED">{t("membershipCards.status.APPROVED")}</SelectItem>
                  <SelectItem value="ISSUED">{t("membershipCards.status.ISSUED")}</SelectItem>
                  <SelectItem value="EXPIRED">{t("membershipCards.status.EXPIRED")}</SelectItem>
                  <SelectItem value="REVOKED">{t("membershipCards.status.REVOKED")}</SelectItem>
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
                  <IdCard className="h-5 w-5" />
                  {t("membershipCards.listTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : filteredCards && filteredCards.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("membershipCards.office")}</TableHead>
                        <TableHead>{t("membershipCards.cardNumber")}</TableHead>
                        <TableHead>{t("common.status")}</TableHead>
                        <TableHead>{t("membershipCards.issuedAt")}</TableHead>
                        <TableHead>{t("membershipCards.expiresAt")}</TableHead>
                        <TableHead>{t("common.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCards.map((card) => (
                        <TableRow key={card.id} data-testid={`row-card-${card.id}`}>
                          <TableCell className="font-medium">
                            {getOfficeName(card.officeId)}
                          </TableCell>
                          <TableCell>{card.cardNumber}</TableCell>
                          <TableCell>{getStatusBadge(card.status)}</TableCell>
                          <TableCell>
                            {card.issuedAt ? format(new Date(card.issuedAt), "PP") : "-"}
                          </TableCell>
                          <TableCell>
                            {card.expiresAt ? format(new Date(card.expiresAt), "PP") : "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedCard(card);
                                setIsDetailOpen(true);
                              }}
                              data-testid={`button-view-card-${card.id}`}
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
            <DialogTitle>{t("membershipCards.detailTitle")}</DialogTitle>
            <DialogDescription>{t("membershipCards.detailDescription")}</DialogDescription>
          </DialogHeader>
          {selectedCard && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">{t("membershipCards.office")}</Label>
                  <p className="font-medium">{getOfficeName(selectedCard.officeId)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t("common.status")}</Label>
                  <div className="mt-1">{getStatusBadge(selectedCard.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t("membershipCards.cardNumber")}</Label>
                  <p className="font-medium">{selectedCard.cardNumber}</p>
                </div>
                {selectedCard.issuedAt && (
                  <div>
                    <Label className="text-muted-foreground">{t("membershipCards.issuedAt")}</Label>
                    <p className="font-medium">{format(new Date(selectedCard.issuedAt), "PP")}</p>
                  </div>
                )}
                {selectedCard.expiresAt && (
                  <div>
                    <Label className="text-muted-foreground">{t("membershipCards.expiresAt")}</Label>
                    <p className="font-medium">{format(new Date(selectedCard.expiresAt), "PP")}</p>
                  </div>
                )}
              </div>
              {selectedCard.notes && (
                <div>
                  <Label className="text-muted-foreground">{t("common.notes")}</Label>
                  <p className="text-sm mt-1">{selectedCard.notes}</p>
                </div>
              )}
              <div className="pt-4 border-t">
                <Label>{t("membershipCards.updateStatus")}</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedCard.status === 'PENDING' && (
                    <>
                      <Button size="sm" onClick={() => handleStatusUpdate('APPROVED')} data-testid="button-approve">
                        <CheckCircle className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                        {t("membershipCards.approve")}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate('REVOKED')} data-testid="button-revoke">
                        <XCircle className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                        {t("membershipCards.revoke")}
                      </Button>
                    </>
                  )}
                  {selectedCard.status === 'APPROVED' && (
                    <Button size="sm" onClick={() => handleStatusUpdate('ISSUED')} data-testid="button-issue">
                      <Printer className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                      {t("membershipCards.issue")}
                    </Button>
                  )}
                </div>
              </div>
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
