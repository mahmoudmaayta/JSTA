import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { OfficeSidebar } from "@/components/layout/office-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { LoadingPage, LoadingSpinner } from "@/components/ui/loading-spinner";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLanguage } from "@/lib/i18n";
import type { Office } from "@shared/schema";
import { officeUpdateSchema, type OfficeUpdateForm } from "@shared/schema";
import { Building2, Save, MapPin, Phone, Mail, Lock } from "lucide-react";

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordChangeForm = z.infer<typeof passwordChangeSchema>;

export default function OfficeProfile() {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const sidebarSide = language === 'ar' ? 'right' : 'left';

  const { data: office, isLoading } = useQuery<Office>({
    queryKey: ["/api/office/profile"],
  });

  const form = useForm<OfficeUpdateForm>({
    resolver: zodResolver(officeUpdateSchema),
    defaultValues: {
      mainCity: "",
      mainArea: "",
      mainStreet: "",
      mainBuildingNumber: "",
      phone: "",
      mobile: "",
      fax: "",
      website: "",
      mainEmail: "",
      extraEmail: "",
      poBox: "",
      postalCode: "",
    },
    values: office ? {
      mainCity: office.mainCity || "",
      mainArea: office.mainArea || "",
      mainStreet: office.mainStreet || "",
      mainBuildingNumber: office.mainBuildingNumber || "",
      phone: office.phone || "",
      mobile: office.mobile || "",
      fax: office.fax || "",
      website: office.website || "",
      mainEmail: office.mainEmail || "",
      extraEmail: office.extraEmail || "",
      poBox: office.poBox || "",
      postalCode: office.postalCode || "",
    } : undefined,
  });

  const passwordForm = useForm<PasswordChangeForm>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: OfficeUpdateForm) => {
      const response = await apiRequest("PATCH", "/api/office/profile", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/office/profile"] });
      toast({
        title: t("profile.profileUpdated"),
        description: t("profile.profileUpdatedDesc"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async (data: PasswordChangeForm) => {
      const response = await apiRequest("POST", "/api/office/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      return response.json();
    },
    onSuccess: () => {
      passwordForm.reset();
      toast({
        title: t("profile.passwordChanged"),
        description: t("profile.passwordChangedDesc"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: OfficeUpdateForm) => {
    updateMutation.mutate(data);
  };

  const onPasswordSubmit = (data: PasswordChangeForm) => {
    passwordMutation.mutate(data);
  };

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className={`flex min-h-screen w-full ${language === 'ar' ? 'flex-row-reverse' : ''}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <OfficeSidebar key={`sidebar-${language}`} side={sidebarSide} />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold">{t("profile.title")}</h1>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6">
            {isLoading ? (
              <LoadingPage message={t("profile.loadingProfile")} />
            ) : (
              <div className="max-w-3xl space-y-6">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <Building2 className="h-7 w-7" />
                    {office?.tradeNameAr}
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    {t("profile.updateContactInfo")}
                  </p>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t("profile.businessInfo")}</CardTitle>
                    <CardDescription>
                      {t("profile.businessInfoDesc")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid gap-3 text-sm sm:grid-cols-2">
                      <div className="space-y-1">
                        <dt className="text-muted-foreground">{t("profile.tradeName")}</dt>
                        <dd className="font-medium">{office?.tradeNameAr}</dd>
                      </div>
                      {office?.legalNameRegistrar && (
                        <div className="space-y-1">
                          <dt className="text-muted-foreground">{t("profile.legalName")}</dt>
                          <dd className="font-medium">{office.legalNameRegistrar}</dd>
                        </div>
                      )}
                      {office?.nationalEstablishmentNumber && (
                        <div className="space-y-1">
                          <dt className="text-muted-foreground">{t("profile.establishmentNumber")}</dt>
                          <dd className="font-mono">{office.nationalEstablishmentNumber}</dd>
                        </div>
                      )}
                      {office?.socialSecurityNumber && (
                        <div className="space-y-1">
                          <dt className="text-muted-foreground">{t("profile.socialSecurityNumber")}</dt>
                          <dd className="font-mono">{office.socialSecurityNumber}</dd>
                        </div>
                      )}
                    </dl>
                  </CardContent>
                </Card>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <MapPin className="h-5 w-5" />
                          {t("forms.officeStep.address")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="mainCity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("forms.officeStep.city")}</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder={t("forms.officeStep.cityPlaceholder")} data-testid="input-city" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="mainArea"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("forms.officeStep.area")}</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder={t("forms.officeStep.areaPlaceholder")} data-testid="input-area" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="mainStreet"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("forms.officeStep.street")}</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder={t("forms.officeStep.streetPlaceholder")} data-testid="input-street" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="mainBuildingNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("forms.officeStep.buildingNumber")}</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder={t("forms.officeStep.buildingPlaceholder")} data-testid="input-building" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="poBox"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("forms.officeStep.poBox")}</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder={t("forms.officeStep.poBoxPlaceholder")} data-testid="input-pobox" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="postalCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("forms.officeStep.postalCode")}</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder={t("forms.officeStep.postalCodePlaceholder")} data-testid="input-postal" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Phone className="h-5 w-5" />
                          {t("profile.contactDetails")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("forms.officeStep.phone")}</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder={t("forms.officeStep.phonePlaceholder")} data-testid="input-phone" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="mobile"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("forms.officeStep.mobile")}</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder={t("forms.officeStep.mobilePlaceholder")} data-testid="input-mobile" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="fax"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("forms.officeStep.fax")}</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder={t("forms.officeStep.faxPlaceholder")} data-testid="input-fax" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Mail className="h-5 w-5" />
                          {t("profile.emailWebsite")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="mainEmail"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("profile.primaryEmail")}</FormLabel>
                                <FormControl>
                                  <Input {...field} type="email" placeholder={t("forms.officeStep.mainEmailPlaceholder")} data-testid="input-email" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="extraEmail"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("profile.secondaryEmail")}</FormLabel>
                                <FormControl>
                                  <Input {...field} type="email" placeholder={t("forms.officeStep.additionalEmailPlaceholder")} data-testid="input-extra-email" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="website"
                            render={({ field }) => (
                              <FormItem className="sm:col-span-2">
                                <FormLabel>{t("forms.officeStep.website")}</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder={t("forms.officeStep.websitePlaceholder")} data-testid="input-website" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={updateMutation.isPending}
                        className="gap-2"
                        data-testid="button-save"
                      >
                        {updateMutation.isPending ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        {t("common.save")}
                      </Button>
                    </div>
                  </form>
                </Form>

                <Separator className="my-8" />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    {t("profile.changePassword")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("profile.changePasswordDesc")}
                  </p>

                  <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="grid gap-4 sm:grid-cols-3">
                            <FormField
                              control={passwordForm.control}
                              name="currentPassword"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("profile.currentPassword")}</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="password"
                                      placeholder={t("profile.currentPasswordPlaceholder")}
                                      data-testid="input-current-password"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={passwordForm.control}
                              name="newPassword"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("profile.newPassword")}</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="password"
                                      placeholder={t("profile.newPasswordPlaceholder")}
                                      data-testid="input-new-password"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={passwordForm.control}
                              name="confirmPassword"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("profile.confirmNewPassword")}</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="password"
                                      placeholder={t("profile.confirmPasswordPlaceholder")}
                                      data-testid="input-confirm-password"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </CardContent>
                      </Card>

                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          variant="outline"
                          disabled={passwordMutation.isPending}
                          className="gap-2"
                          data-testid="button-change-password"
                        >
                          {passwordMutation.isPending ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            <Lock className="h-4 w-4" />
                          )}
                          {t("profile.changePassword")}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              </div>
            )}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
