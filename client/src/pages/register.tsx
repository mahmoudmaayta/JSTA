import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Header } from "@/components/layout/header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { registerSchema, officeInfoSchema, branchSchema, type RegisterForm, type OfficeInfoForm, type BranchForm } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/lib/i18n";
import { 
  Building2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ArrowLeft,
  Check,
  Upload,
  X,
  FileText,
  Plus,
  Trash2,
  User,
  Building,
  MapPin,
  FileCheck,
  ChevronDown,
  Edit
} from "lucide-react";

interface DocumentUpload {
  file: File;
  category: string;
}

export default function RegisterPage() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  
  const TOURISM_ACTIVITIES = [
    { id: "tickets", label: t("forms.officeStep.activities.tickets") },
    { id: "inbound", label: t("forms.officeStep.activities.inbound") },
    { id: "outbound", label: t("forms.officeStep.activities.outbound") },
    { id: "hajj_umrah", label: t("forms.officeStep.activities.hajjUmrah") },
    { id: "domestic", label: t("forms.officeStep.activities.domestic") },
  ];

  const STEPS = [
    { id: 1, title: t("forms.steps.account"), description: t("forms.steps.accountDesc"), icon: User },
    { id: 2, title: t("forms.steps.officeInfo"), description: t("forms.steps.officeInfoDesc"), icon: Building },
    { id: 3, title: t("forms.steps.branches"), description: t("forms.steps.branchesDesc"), icon: MapPin },
    { id: 4, title: t("forms.steps.documents"), description: t("forms.steps.documentsDesc"), icon: FileCheck },
  ];
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<BranchForm[]>([]);
  const [editingBranchIndex, setEditingBranchIndex] = useState<number | null>(null);
  const [documents, setDocuments] = useState<DocumentUpload[]>([]);
  const [registrationData, setRegistrationData] = useState<{
    account?: RegisterForm;
    office?: OfficeInfoForm;
  }>({});

  const accountForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      contactName: "",
    },
  });

  const officeForm = useForm<OfficeInfoForm>({
    resolver: zodResolver(officeInfoSchema),
    defaultValues: {
      tradeNameAr: "",
      tradeNameEn: "",
      legalNameRegistrar: "",
      nationalEstablishmentNumber: "",
      trademark: "",
      awqafAccreditationNumber: "",
      socialSecurityNumber: "",
      guaranteeExpiryDate: "",
      tourismActivities: [],
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
  });

  const branchForm = useForm<BranchForm>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      city: "",
      area: "",
      street: "",
      buildingNumber: "",
      managerName: "",
      managerMobile: "",
      phone: "",
      fax: "",
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Registration failed");
      }
      return response.json();
    },
    onSuccess: () => {
      setLocation("/registration-success");
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  const handleAccountSubmit = (data: RegisterForm) => {
    setRegistrationData((prev) => ({ ...prev, account: data }));
    setCurrentStep(2);
  };

  const handleOfficeSubmit = (data: OfficeInfoForm) => {
    setRegistrationData((prev) => ({ ...prev, office: data }));
    setCurrentStep(3);
  };

  const handleBranchAdd = (data: BranchForm) => {
    setBranches((prev) => [...prev, data]);
    branchForm.reset();
  };

  const handleBranchUpdate = (index: number, data: BranchForm) => {
    setBranches((prev) => prev.map((branch, i) => i === index ? data : branch));
    setEditingBranchIndex(null);
    branchForm.reset();
  };

  const handleBranchRemove = (index: number) => {
    setBranches((prev) => prev.filter((_, i) => i !== index));
    if (editingBranchIndex === index) {
      setEditingBranchIndex(null);
      branchForm.reset();
    }
  };

  const startEditingBranch = (index: number) => {
    const branch = branches[index];
    branchForm.reset(branch);
    setEditingBranchIndex(index);
  };

  const cancelEditingBranch = () => {
    setEditingBranchIndex(null);
    branchForm.reset();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, category: string) => {
    const files = e.target.files;
    if (files) {
      const newDocs = Array.from(files).map((file) => ({
        file,
        category,
      }));
      setDocuments((prev) => [...prev, ...newDocs]);
    }
    e.target.value = "";
  };

  const handleDocumentRemove = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFinalSubmit = () => {
    if (!registrationData.account || !registrationData.office) {
      setError("Please complete all previous steps");
      return;
    }

    const formData = new FormData();
    formData.append("account", JSON.stringify(registrationData.account));
    formData.append("office", JSON.stringify(registrationData.office));
    formData.append("branches", JSON.stringify(branches));
    
    documents.forEach((doc, index) => {
      formData.append(`documents`, doc.file);
      formData.append(`documentCategories`, doc.category);
    });

    registerMutation.mutate(formData);
  };

  const progress = (currentStep / STEPS.length) * 100;

  const getDocsByCategory = (category: string) => 
    documents.filter((d) => d.category === category);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 py-8 px-4">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {STEPS.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center ${index < STEPS.length - 1 ? "flex-1" : ""}`}
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                        currentStep > step.id
                          ? "bg-primary border-primary text-primary-foreground"
                          : currentStep === step.id
                          ? "border-primary text-primary bg-primary/10"
                          : "border-muted-foreground/30 text-muted-foreground"
                      }`}
                    >
                      {currentStep > step.id ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <step.icon className="h-5 w-5" />
                      )}
                    </div>
                    <span className={`mt-2 text-xs font-medium hidden sm:block ${
                      currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                    }`}>
                      {step.title}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 ${
                        currentStep > step.id ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <Progress value={progress} className="h-1" />
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t("forms.accountStep.title")}
                </CardTitle>
                <CardDescription>
                  {t("forms.accountStep.description")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...accountForm}>
                  <form onSubmit={accountForm.handleSubmit(handleAccountSubmit)} className="space-y-4">
                    <FormField
                      control={accountForm.control}
                      name="contactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("forms.accountStep.contactName")} <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder={t("forms.accountStep.contactNamePlaceholder")} data-testid="input-contact-name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={accountForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("forms.accountStep.emailAddress")} <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input type="email" placeholder={t("forms.accountStep.emailPlaceholder")} data-testid="input-email" {...field} />
                          </FormControl>
                          <FormDescription>{t("forms.accountStep.emailDescription")}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={accountForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("forms.accountStep.password")} <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  placeholder={t("forms.accountStep.passwordPlaceholder")}
                                  data-testid="input-password"
                                  {...field}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={accountForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("forms.accountStep.confirmPassword")} <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder={t("forms.accountStep.confirmPasswordPlaceholder")}
                                data-testid="input-confirm-password"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button type="submit" className="gap-2" data-testid="button-next-step">
                        {t("forms.continue")}
                        <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  {t("forms.officeStep.title")}
                </CardTitle>
                <CardDescription>
                  {t("forms.officeStep.description")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...officeForm}>
                  <form onSubmit={officeForm.handleSubmit(handleOfficeSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{t("forms.officeStep.basicInfo")}</h3>
                      
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={officeForm.control}
                          name="tradeNameAr"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("forms.officeStep.tradeNameAr")} <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input placeholder={t("forms.officeStep.tradeNamePlaceholder")} data-testid="input-trade-name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={officeForm.control}
                          name="tradeNameEn"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("forms.officeStep.tradeNameEn")}</FormLabel>
                              <FormControl>
                                <Input placeholder={t("forms.officeStep.tradeNameEnPlaceholder")} data-testid="input-trade-name-en" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={officeForm.control}
                        name="legalNameRegistrar"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("forms.officeStep.legalName")}</FormLabel>
                            <FormControl>
                              <Input placeholder={t("forms.officeStep.legalNamePlaceholder")} data-testid="input-legal-name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={officeForm.control}
                          name="nationalEstablishmentNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("forms.officeStep.nationalNumber")}</FormLabel>
                              <FormControl>
                                <Input placeholder={t("forms.officeStep.nationalNumberPlaceholder")} data-testid="input-national-number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={officeForm.control}
                          name="trademark"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("forms.officeStep.trademark")}</FormLabel>
                              <FormControl>
                                <Input placeholder={t("forms.officeStep.trademarkPlaceholder")} data-testid="input-trademark" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={officeForm.control}
                          name="awqafAccreditationNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("forms.officeStep.awqafAccreditation")}</FormLabel>
                              <FormControl>
                                <Input placeholder={t("forms.officeStep.awqafAccreditationPlaceholder")} data-testid="input-awqaf" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={officeForm.control}
                          name="socialSecurityNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("forms.officeStep.socialSecurity")}</FormLabel>
                              <FormControl>
                                <Input placeholder={t("forms.officeStep.socialSecurityPlaceholder")} data-testid="input-ssn" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={officeForm.control}
                        name="guaranteeExpiryDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("forms.officeStep.guaranteeExpiry")}</FormLabel>
                            <FormControl>
                              <Input type="date" data-testid="input-guarantee-date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={officeForm.control}
                        name="tourismActivities"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("forms.officeStep.tourismActivities")}</FormLabel>
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              <FormItem className="flex items-center space-x-2 rtl:space-x-reverse space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.length === TOURISM_ACTIVITIES.length}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        field.onChange(TOURISM_ACTIVITIES.map(a => a.id));
                                      } else {
                                        field.onChange([]);
                                      }
                                    }}
                                    data-testid="checkbox-activity-all"
                                  />
                                </FormControl>
                                <FormLabel className="font-medium text-sm cursor-pointer">
                                  {t("forms.officeStep.activities.all")}
                                </FormLabel>
                              </FormItem>
                              {TOURISM_ACTIVITIES.map((activity) => (
                                <FormField
                                  key={activity.id}
                                  control={officeForm.control}
                                  name="tourismActivities"
                                  render={({ field: innerField }) => (
                                    <FormItem className="flex items-center space-x-2 rtl:space-x-reverse space-y-0">
                                      <FormControl>
                                        <Checkbox
                                          checked={innerField.value?.includes(activity.id)}
                                          onCheckedChange={(checked) => {
                                            const current = innerField.value || [];
                                            if (checked) {
                                              innerField.onChange([...current, activity.id]);
                                            } else {
                                              innerField.onChange(current.filter((v) => v !== activity.id));
                                            }
                                          }}
                                          data-testid={`checkbox-activity-${activity.id}`}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal text-sm cursor-pointer">
                                        {activity.label}
                                      </FormLabel>
                                    </FormItem>
                                  )}
                                />
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{t("forms.officeStep.address")}</h3>
                      
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={officeForm.control}
                          name="mainCity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("forms.officeStep.city")}</FormLabel>
                              <FormControl>
                                <Input placeholder={t("forms.officeStep.cityPlaceholder")} data-testid="input-city" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={officeForm.control}
                          name="mainArea"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("forms.officeStep.area")}</FormLabel>
                              <FormControl>
                                <Input placeholder={t("forms.officeStep.areaPlaceholder")} data-testid="input-area" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={officeForm.control}
                          name="mainStreet"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("forms.officeStep.street")}</FormLabel>
                              <FormControl>
                                <Input placeholder={t("forms.officeStep.streetPlaceholder")} data-testid="input-street" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={officeForm.control}
                          name="mainBuildingNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("forms.officeStep.buildingNumber")}</FormLabel>
                              <FormControl>
                                <Input placeholder={t("forms.officeStep.buildingPlaceholder")} data-testid="input-building" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={officeForm.control}
                          name="poBox"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("forms.officeStep.poBox")}</FormLabel>
                              <FormControl>
                                <Input placeholder={t("forms.officeStep.poBoxPlaceholder")} data-testid="input-pobox" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={officeForm.control}
                          name="postalCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("forms.officeStep.postalCode")}</FormLabel>
                              <FormControl>
                                <Input placeholder={t("forms.officeStep.postalCodePlaceholder")} data-testid="input-postal" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{t("forms.officeStep.contactInfo")}</h3>
                      
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={officeForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("forms.officeStep.phone")}</FormLabel>
                              <FormControl>
                                <Input placeholder={t("forms.officeStep.phonePlaceholder")} data-testid="input-phone" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={officeForm.control}
                          name="mobile"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("forms.officeStep.mobile")}</FormLabel>
                              <FormControl>
                                <Input placeholder={t("forms.officeStep.mobilePlaceholder")} data-testid="input-mobile" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={officeForm.control}
                          name="fax"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("forms.officeStep.fax")}</FormLabel>
                              <FormControl>
                                <Input placeholder={t("forms.officeStep.faxPlaceholder")} data-testid="input-fax" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={officeForm.control}
                          name="website"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("forms.officeStep.website")}</FormLabel>
                              <FormControl>
                                <Input placeholder={t("forms.officeStep.websitePlaceholder")} data-testid="input-website" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={officeForm.control}
                          name="mainEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("forms.officeStep.mainEmail")}</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder={t("forms.officeStep.mainEmailPlaceholder")} data-testid="input-main-email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={officeForm.control}
                          name="extraEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("forms.officeStep.additionalEmail")}</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder={t("forms.officeStep.additionalEmailPlaceholder")} data-testid="input-extra-email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCurrentStep(1)}
                        className="gap-2"
                        data-testid="button-prev-step"
                      >
                        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                        {t("common.back")}
                      </Button>
                      <Button type="submit" className="gap-2" data-testid="button-next-step">
                        {t("forms.continue")}
                        <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {t("forms.branchStep.title")}
                </CardTitle>
                <CardDescription>
                  {t("forms.branchStep.description")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {branches.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium mb-3">{t("forms.addedBranches")} ({branches.length})</h3>
                    <Accordion type="single" collapsible className="space-y-2">
                      {branches.map((branch, index) => (
                        <AccordionItem 
                          key={index} 
                          value={`branch-${index}`}
                          className="border rounded-lg px-4"
                        >
                          <AccordionTrigger className="hover:no-underline py-3">
                            <div className="flex items-center justify-between w-full pe-2">
                              <div className="text-start">
                                <p className="font-medium text-sm">
                                  {t("forms.branch")} {index + 1}: {branch.city || "-"} {branch.area && `- ${branch.area}`}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {branch.managerName && `${t("forms.manager")}: ${branch.managerName}`}
                                </p>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pb-4">
                            {editingBranchIndex === index ? (
                              <Form {...branchForm}>
                                <form 
                                  onSubmit={branchForm.handleSubmit((data) => handleBranchUpdate(index, data))} 
                                  className="space-y-4 pt-2"
                                >
                                  <div className="grid gap-4 sm:grid-cols-2">
                                    <FormField
                                      control={branchForm.control}
                                      name="city"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>{t("forms.officeStep.city")}</FormLabel>
                                          <FormControl>
                                            <Input placeholder={t("forms.officeStep.cityPlaceholder")} {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={branchForm.control}
                                      name="area"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>{t("forms.officeStep.area")}</FormLabel>
                                          <FormControl>
                                            <Input placeholder={t("forms.officeStep.areaPlaceholder")} {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                  <div className="grid gap-4 sm:grid-cols-2">
                                    <FormField
                                      control={branchForm.control}
                                      name="street"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>{t("forms.officeStep.street")}</FormLabel>
                                          <FormControl>
                                            <Input placeholder={t("forms.officeStep.streetPlaceholder")} {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={branchForm.control}
                                      name="buildingNumber"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>{t("forms.officeStep.buildingNumber")}</FormLabel>
                                          <FormControl>
                                            <Input placeholder={t("forms.officeStep.buildingPlaceholder")} {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                  <div className="grid gap-4 sm:grid-cols-2">
                                    <FormField
                                      control={branchForm.control}
                                      name="managerName"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>{t("forms.branchStep.managerName")}</FormLabel>
                                          <FormControl>
                                            <Input placeholder={t("forms.branchStep.managerNamePlaceholder")} {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={branchForm.control}
                                      name="managerMobile"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>{t("forms.branchStep.managerMobile")}</FormLabel>
                                          <FormControl>
                                            <Input placeholder={t("forms.branchStep.managerMobilePlaceholder")} {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                  <div className="grid gap-4 sm:grid-cols-2">
                                    <FormField
                                      control={branchForm.control}
                                      name="phone"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>{t("forms.officeStep.phone")}</FormLabel>
                                          <FormControl>
                                            <Input placeholder={t("forms.officeStep.phonePlaceholder")} {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={branchForm.control}
                                      name="fax"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>{t("forms.officeStep.fax")}</FormLabel>
                                          <FormControl>
                                            <Input placeholder={t("forms.officeStep.faxPlaceholder")} {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                  <div className="flex gap-2 justify-end pt-2">
                                    <Button type="button" variant="outline" onClick={cancelEditingBranch}>
                                      {t("forms.cancelEdit")}
                                    </Button>
                                    <Button type="submit">
                                      {t("forms.saveBranch")}
                                    </Button>
                                  </div>
                                </form>
                              </Form>
                            ) : (
                              <div className="space-y-3 pt-2">
                                <div className="grid gap-2 sm:grid-cols-2 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">{t("forms.officeStep.city")}:</span>{" "}
                                    <span>{branch.city || "-"}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">{t("forms.officeStep.area")}:</span>{" "}
                                    <span>{branch.area || "-"}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">{t("forms.officeStep.street")}:</span>{" "}
                                    <span>{branch.street || "-"}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">{t("forms.officeStep.buildingNumber")}:</span>{" "}
                                    <span>{branch.buildingNumber || "-"}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">{t("forms.branchStep.managerName")}:</span>{" "}
                                    <span>{branch.managerName || "-"}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">{t("forms.branchStep.managerMobile")}:</span>{" "}
                                    <span>{branch.managerMobile || "-"}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">{t("forms.officeStep.phone")}:</span>{" "}
                                    <span>{branch.phone || "-"}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">{t("forms.officeStep.fax")}:</span>{" "}
                                    <span>{branch.fax || "-"}</span>
                                  </div>
                                </div>
                                <div className="flex gap-2 justify-end pt-2 border-t">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => startEditingBranch(index)}
                                    className="gap-1"
                                    data-testid={`button-edit-branch-${index}`}
                                  >
                                    <Edit className="h-3 w-3" />
                                    {t("forms.editBranch")}
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleBranchRemove(index)}
                                    className="gap-1"
                                    data-testid={`button-remove-branch-${index}`}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    {t("common.delete")}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                )}

                {editingBranchIndex === null && (
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <h4 className="text-sm font-medium mb-4">{t("forms.addNewBranch")}</h4>
                    <Form {...branchForm}>
                      <form onSubmit={branchForm.handleSubmit(handleBranchAdd)} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField
                            control={branchForm.control}
                            name="city"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("forms.officeStep.city")}</FormLabel>
                                <FormControl>
                                  <Input placeholder={t("forms.officeStep.cityPlaceholder")} data-testid="input-branch-city" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={branchForm.control}
                            name="area"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("forms.officeStep.area")}</FormLabel>
                                <FormControl>
                                  <Input placeholder={t("forms.officeStep.areaPlaceholder")} data-testid="input-branch-area" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField
                            control={branchForm.control}
                            name="street"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("forms.officeStep.street")}</FormLabel>
                                <FormControl>
                                  <Input placeholder={t("forms.officeStep.streetPlaceholder")} data-testid="input-branch-street" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={branchForm.control}
                            name="buildingNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("forms.officeStep.buildingNumber")}</FormLabel>
                                <FormControl>
                                  <Input placeholder={t("forms.officeStep.buildingPlaceholder")} data-testid="input-branch-building" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField
                            control={branchForm.control}
                            name="managerName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("forms.branchStep.managerName")}</FormLabel>
                                <FormControl>
                                  <Input placeholder={t("forms.branchStep.managerNamePlaceholder")} data-testid="input-branch-manager" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={branchForm.control}
                            name="managerMobile"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("forms.branchStep.managerMobile")}</FormLabel>
                                <FormControl>
                                  <Input placeholder={t("forms.branchStep.managerMobilePlaceholder")} data-testid="input-branch-manager-mobile" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField
                            control={branchForm.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("forms.officeStep.phone")}</FormLabel>
                                <FormControl>
                                  <Input placeholder={t("forms.officeStep.phonePlaceholder")} data-testid="input-branch-phone" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={branchForm.control}
                            name="fax"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("forms.officeStep.fax")}</FormLabel>
                                <FormControl>
                                  <Input placeholder={t("forms.officeStep.faxPlaceholder")} data-testid="input-branch-fax" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <Button type="submit" variant="outline" className="gap-2" data-testid="button-add-branch">
                          <Plus className="h-4 w-4" />
                          {t("forms.addBranch")}
                        </Button>
                      </form>
                    </Form>
                  </div>
                )}

                <div className="flex justify-between pt-6 mt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                    className="gap-2"
                    data-testid="button-prev-step"
                  >
                    <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                    {t("common.back")}
                  </Button>
                  <Button onClick={() => setCurrentStep(4)} className="gap-2" data-testid="button-next-step">
                    {t("forms.continue")}
                    <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  {t("forms.documentStep.title")}
                </CardTitle>
                <CardDescription>
                  {t("forms.documentStep.description")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <h3 className="font-medium mb-2 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                      {t("forms.documentStep.category1Title")}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t("forms.documentStep.category1Desc")}
                    </p>
                    
                    {getDocsByCategory("INITIAL_FIRST_FORMS").length > 0 && (
                      <div className="mb-3 space-y-2">
                        {getDocsByCategory("INITIAL_FIRST_FORMS").map((doc, idx) => {
                          const globalIdx = documents.findIndex((d) => d === doc);
                          return (
                            <div key={idx} className="flex items-center justify-between rounded bg-muted/50 px-3 py-2">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm truncate max-w-[200px]">{doc.file.name}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDocumentRemove(globalIdx)}
                                data-testid={`button-remove-doc-${globalIdx}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors hover:border-primary/50 hover:bg-muted/30">
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm font-medium">{t("forms.clickToUpload")}</span>
                      <span className="text-xs text-muted-foreground">{t("forms.fileTypes")}</span>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, "INITIAL_FIRST_FORMS")}
                        data-testid="input-upload-first"
                      />
                    </label>
                  </div>

                  <div className="rounded-lg border p-4">
                    <h3 className="font-medium mb-2 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                      {t("forms.documentStep.category2Title")}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t("forms.documentStep.category2Desc")}
                    </p>
                    
                    {getDocsByCategory("INITIAL_SECOND_LEGAL").length > 0 && (
                      <div className="mb-3 space-y-2">
                        {getDocsByCategory("INITIAL_SECOND_LEGAL").map((doc, idx) => {
                          const globalIdx = documents.findIndex((d) => d === doc);
                          return (
                            <div key={idx} className="flex items-center justify-between rounded bg-muted/50 px-3 py-2">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm truncate max-w-[200px]">{doc.file.name}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDocumentRemove(globalIdx)}
                                data-testid={`button-remove-doc-${globalIdx}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors hover:border-primary/50 hover:bg-muted/30">
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm font-medium">{t("forms.clickToUpload")}</span>
                      <span className="text-xs text-muted-foreground">{t("forms.fileTypes")}</span>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, "INITIAL_SECOND_LEGAL")}
                        data-testid="input-upload-second"
                      />
                    </label>
                  </div>

                  <div className="rounded-lg border p-4">
                    <h3 className="font-medium mb-2 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
                      {t("forms.documentStep.category3Title")}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t("forms.documentStep.category3Desc")}
                    </p>
                    
                    {getDocsByCategory("INITIAL_THIRD_PERSONAL").length > 0 && (
                      <div className="mb-3 space-y-2">
                        {getDocsByCategory("INITIAL_THIRD_PERSONAL").map((doc, idx) => {
                          const globalIdx = documents.findIndex((d) => d === doc);
                          return (
                            <div key={idx} className="flex items-center justify-between rounded bg-muted/50 px-3 py-2">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm truncate max-w-[200px]">{doc.file.name}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDocumentRemove(globalIdx)}
                                data-testid={`button-remove-doc-${globalIdx}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors hover:border-primary/50 hover:bg-muted/30">
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm font-medium">{t("forms.clickToUpload")}</span>
                      <span className="text-xs text-muted-foreground">{t("forms.fileTypes")}</span>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, "INITIAL_THIRD_PERSONAL")}
                        data-testid="input-upload-third"
                      />
                    </label>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(3)}
                    className="gap-2"
                    data-testid="button-prev-step"
                  >
                    <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                    {t("common.back")}
                  </Button>
                  <Button
                    onClick={handleFinalSubmit}
                    disabled={registerMutation.isPending}
                    className="gap-2"
                    data-testid="button-submit-registration"
                  >
                    {registerMutation.isPending ? (
                      <>
                        <LoadingSpinner size="sm" />
                        {t("forms.submitting")}
                      </>
                    ) : (
                      <>
                        {t("forms.submitRegistration")}
                        <Check className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t("forms.alreadyHaveAccount")}{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                {t("forms.signInHere")}
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
