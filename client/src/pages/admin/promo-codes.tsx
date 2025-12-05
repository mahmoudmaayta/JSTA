import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { useTranslation, useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Plus, Tag, RefreshCw, Percent, DollarSign, Gift, Calendar, Users } from "lucide-react";
import type { PromoCode } from "@shared/schema";

export default function AdminPromoCodes() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { toast } = useToast();
  const sidebarSide = language === 'ar' ? 'right' : 'left';

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPromoCode, setNewPromoCode] = useState({
    code: "",
    discountType: "PERCENT" as "PERCENT" | "FIXED" | "FREE",
    discountValue: 0,
    validFrom: "",
    validUntil: "",
    maxUses: "",
    isActive: true,
  });

  const { data: promoCodes, isLoading, refetch } = useQuery<PromoCode[]>({
    queryKey: ["/api/admin/promo-codes"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/admin/promo-codes", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promo-codes"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: t("promoCodes.createSuccess"),
        description: t("promoCodes.createSuccessDesc"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("promoCodes.createError"),
        description: error.message || t("promoCodes.createErrorDesc"),
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await apiRequest("PATCH", `/api/admin/promo-codes/${id}`, { isActive });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promo-codes"] });
      toast({
        title: t("promoCodes.updateSuccess"),
        description: t("promoCodes.updateSuccessDesc"),
      });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promo-codes"] });
      toast({
        title: t("promoCodes.updateError"),
        description: t("promoCodes.updateErrorDesc"),
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setNewPromoCode({
      code: "",
      discountType: "PERCENT",
      discountValue: 0,
      validFrom: "",
      validUntil: "",
      maxUses: "",
      isActive: true,
    });
  };

  const handleCreate = () => {
    const data: any = {
      code: newPromoCode.code.toUpperCase(),
      discountType: newPromoCode.discountType,
      discountValue: newPromoCode.discountType === "FREE" ? 100 : newPromoCode.discountValue,
      isActive: newPromoCode.isActive,
    };

    if (newPromoCode.validFrom) {
      data.validFrom = new Date(newPromoCode.validFrom).toISOString();
    }
    if (newPromoCode.validUntil) {
      data.validUntil = new Date(newPromoCode.validUntil).toISOString();
    }
    if (newPromoCode.maxUses) {
      data.maxUses = parseInt(newPromoCode.maxUses);
    }

    createMutation.mutate(data);
  };

  const getDiscountTypeIcon = (type: string) => {
    switch (type) {
      case "PERCENT":
        return <Percent className="h-4 w-4" />;
      case "FIXED":
        return <DollarSign className="h-4 w-4" />;
      case "FREE":
        return <Gift className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const formatDiscountValue = (code: PromoCode) => {
    switch (code.discountType) {
      case "PERCENT":
        return `${code.discountValue}%`;
      case "FIXED":
        return `${code.discountValue} JOD`;
      case "FREE":
        return t("promoCodes.freeLabel");
      default:
        return code.discountValue;
    }
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
              <h1 className="text-lg font-semibold">{t("promoCodes.title")}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                data-testid="button-refresh"
              >
                <RefreshCw className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                {t("common.refresh")}
              </Button>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-create-promo">
                    <Plus className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                    {t("promoCodes.createNew")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t("promoCodes.createTitle")}</DialogTitle>
                    <DialogDescription>{t("promoCodes.createDescription")}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="code">{t("promoCodes.codeLabel")}</Label>
                      <Input
                        id="code"
                        placeholder={t("promoCodes.codePlaceholder")}
                        value={newPromoCode.code}
                        onChange={(e) => setNewPromoCode({ ...newPromoCode, code: e.target.value })}
                        className="uppercase"
                        data-testid="input-promo-code"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="discountType">{t("promoCodes.discountTypeLabel")}</Label>
                      <Select
                        value={newPromoCode.discountType}
                        onValueChange={(value: "PERCENT" | "FIXED" | "FREE") => 
                          setNewPromoCode({ ...newPromoCode, discountType: value })
                        }
                      >
                        <SelectTrigger id="discountType" data-testid="select-discount-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PERCENT">{t("promoCodes.typePercent")}</SelectItem>
                          <SelectItem value="FIXED">{t("promoCodes.typeFixed")}</SelectItem>
                          <SelectItem value="FREE">{t("promoCodes.typeFree")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {newPromoCode.discountType !== "FREE" && (
                      <div className="space-y-2">
                        <Label htmlFor="discountValue">
                          {newPromoCode.discountType === "PERCENT" 
                            ? t("promoCodes.percentValue") 
                            : t("promoCodes.fixedValue")}
                        </Label>
                        <Input
                          id="discountValue"
                          type="number"
                          min={0}
                          max={newPromoCode.discountType === "PERCENT" ? 100 : undefined}
                          value={newPromoCode.discountValue}
                          onChange={(e) => setNewPromoCode({ ...newPromoCode, discountValue: parseInt(e.target.value) || 0 })}
                          data-testid="input-discount-value"
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="validFrom">{t("promoCodes.validFrom")}</Label>
                        <Input
                          id="validFrom"
                          type="date"
                          value={newPromoCode.validFrom}
                          onChange={(e) => setNewPromoCode({ ...newPromoCode, validFrom: e.target.value })}
                          data-testid="input-valid-from"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="validUntil">{t("promoCodes.validUntil")}</Label>
                        <Input
                          id="validUntil"
                          type="date"
                          value={newPromoCode.validUntil}
                          onChange={(e) => setNewPromoCode({ ...newPromoCode, validUntil: e.target.value })}
                          data-testid="input-valid-until"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxUses">{t("promoCodes.maxUsesLabel")}</Label>
                      <Input
                        id="maxUses"
                        type="number"
                        min={1}
                        placeholder={t("promoCodes.maxUsesPlaceholder")}
                        value={newPromoCode.maxUses}
                        onChange={(e) => setNewPromoCode({ ...newPromoCode, maxUses: e.target.value })}
                        data-testid="input-max-uses"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="isActive">{t("promoCodes.activeLabel")}</Label>
                      <Switch
                        id="isActive"
                        checked={newPromoCode.isActive}
                        onCheckedChange={(checked) => setNewPromoCode({ ...newPromoCode, isActive: checked })}
                        data-testid="switch-is-active"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      {t("common.cancel")}
                    </Button>
                    <Button 
                      onClick={handleCreate} 
                      disabled={!newPromoCode.code || createMutation.isPending}
                      data-testid="button-submit-promo"
                    >
                      {createMutation.isPending ? t("common.creating") : t("promoCodes.create")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6">
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t("promoCodes.totalCodes")}</CardTitle>
                    <Tag className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{promoCodes?.length || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t("promoCodes.activeCodes")}</CardTitle>
                    <Tag className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {promoCodes?.filter(c => c.isActive).length || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t("promoCodes.totalUsages")}</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {promoCodes?.reduce((sum, c) => sum + c.currentUses, 0) || 0}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{t("promoCodes.allCodes")}</CardTitle>
                  <CardDescription>{t("promoCodes.allCodesDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : !promoCodes || promoCodes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Tag className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">{t("promoCodes.noPromoCodes")}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{t("promoCodes.noPromoCodesDesc")}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("promoCodes.codeLabel")}</TableHead>
                            <TableHead>{t("promoCodes.discountTypeLabel")}</TableHead>
                            <TableHead>{t("promoCodes.discountLabel")}</TableHead>
                            <TableHead>{t("promoCodes.validityLabel")}</TableHead>
                            <TableHead>{t("promoCodes.usageLabel")}</TableHead>
                            <TableHead>{t("promoCodes.statusLabel")}</TableHead>
                            <TableHead className="text-end">{t("common.actions")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {promoCodes.map((code) => (
                            <TableRow key={code.id} data-testid={`promo-row-${code.id}`}>
                              <TableCell className="font-mono font-bold">{code.code}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getDiscountTypeIcon(code.discountType)}
                                  <span>{t(`promoCodes.type${code.discountType.charAt(0) + code.discountType.slice(1).toLowerCase()}`)}</span>
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">{formatDiscountValue(code)}</TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {code.validFrom || code.validUntil ? (
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      <span>
                                        {code.validFrom ? format(new Date(code.validFrom), "MMM d, yyyy") : t("promoCodes.anyTime")}
                                        {" - "}
                                        {code.validUntil ? format(new Date(code.validUntil), "MMM d, yyyy") : t("promoCodes.noExpiry")}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">{t("promoCodes.alwaysValid")}</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-medium">{code.currentUses}</span>
                                <span className="text-muted-foreground">
                                  {" / "}
                                  {code.maxUses !== null ? code.maxUses : t("promoCodes.unlimited")}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge variant={code.isActive ? "default" : "secondary"}>
                                  {code.isActive ? t("promoCodes.active") : t("promoCodes.inactive")}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-end">
                                <Switch
                                  checked={code.isActive}
                                  onCheckedChange={(checked) => 
                                    toggleActiveMutation.mutate({ id: code.id, isActive: checked })
                                  }
                                  disabled={toggleActiveMutation.isPending}
                                  data-testid={`switch-toggle-${code.id}`}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
