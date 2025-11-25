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
import { Header } from "@/components/layout/header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { registerSchema, officeInfoSchema, branchSchema, type RegisterForm, type OfficeInfoForm, type BranchForm } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
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
  FileCheck
} from "lucide-react";

const TOURISM_ACTIVITIES = [
  { id: "tickets", label: "Air Tickets" },
  { id: "inbound", label: "Inbound Tourism" },
  { id: "outbound", label: "Outbound Tourism" },
  { id: "hajj_umrah", label: "Hajj & Umrah" },
  { id: "domestic", label: "Domestic Tourism" },
];

const STEPS = [
  { id: 1, title: "Account", description: "Create your login credentials", icon: User },
  { id: 2, title: "Office Info", description: "Enter office details", icon: Building },
  { id: 3, title: "Branches", description: "Add branch offices", icon: MapPin },
  { id: 4, title: "Documents", description: "Upload required files", icon: FileCheck },
];

interface DocumentUpload {
  file: File;
  category: string;
}

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<BranchForm[]>([]);
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
      legalNameRegistrar: "",
      nationalEstablishmentNumber: "",
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

  const handleBranchRemove = (index: number) => {
    setBranches((prev) => prev.filter((_, i) => i !== index));
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
                  Account Information
                </CardTitle>
                <CardDescription>
                  Create your login credentials. This email will be used as your username.
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
                          <FormLabel>Contact Person Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your full name" data-testid="input-contact-name" {...field} />
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
                          <FormLabel>Email Address *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="your@email.com" data-testid="input-email" {...field} />
                          </FormControl>
                          <FormDescription>This will be your login username</FormDescription>
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
                            <FormLabel>Password *</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  placeholder="Min 6 characters"
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
                            <FormLabel>Confirm Password *</FormLabel>
                            <FormControl>
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Re-enter password"
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
                        Continue
                        <ArrowRight className="h-4 w-4" />
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
                  Office Information
                </CardTitle>
                <CardDescription>
                  Enter your tourism office details and contact information.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...officeForm}>
                  <form onSubmit={officeForm.handleSubmit(handleOfficeSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Basic Information</h3>
                      
                      <FormField
                        control={officeForm.control}
                        name="tradeNameAr"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Trade Name (Arabic) *</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter trade name" data-testid="input-trade-name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={officeForm.control}
                        name="legalNameRegistrar"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Legal Name (Registrar)</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter legal registered name" data-testid="input-legal-name" {...field} />
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
                              <FormLabel>National Establishment Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter number" data-testid="input-national-number" {...field} />
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
                              <FormLabel>Social Security Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter SSN" data-testid="input-ssn" {...field} />
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
                            <FormLabel>Guarantee Expiry Date</FormLabel>
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
                        render={() => (
                          <FormItem>
                            <FormLabel>Tourism Activities</FormLabel>
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              {TOURISM_ACTIVITIES.map((activity) => (
                                <FormField
                                  key={activity.id}
                                  control={officeForm.control}
                                  name="tourismActivities"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(activity.id)}
                                          onCheckedChange={(checked) => {
                                            const current = field.value || [];
                                            if (checked) {
                                              field.onChange([...current, activity.id]);
                                            } else {
                                              field.onChange(current.filter((v) => v !== activity.id));
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
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Address</h3>
                      
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={officeForm.control}
                          name="mainCity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter city" data-testid="input-city" {...field} />
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
                              <FormLabel>Area</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter area" data-testid="input-area" {...field} />
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
                              <FormLabel>Street</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter street" data-testid="input-street" {...field} />
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
                              <FormLabel>Building Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter building #" data-testid="input-building" {...field} />
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
                              <FormLabel>P.O. Box</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter P.O. Box" data-testid="input-pobox" {...field} />
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
                              <FormLabel>Postal Code</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter postal code" data-testid="input-postal" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Contact Information</h3>
                      
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={officeForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter phone number" data-testid="input-phone" {...field} />
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
                              <FormLabel>Mobile</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter mobile number" data-testid="input-mobile" {...field} />
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
                              <FormLabel>Fax</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter fax number" data-testid="input-fax" {...field} />
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
                              <FormLabel>Website</FormLabel>
                              <FormControl>
                                <Input placeholder="https://example.com" data-testid="input-website" {...field} />
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
                              <FormLabel>Main Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="main@office.com" data-testid="input-main-email" {...field} />
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
                              <FormLabel>Additional Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="extra@office.com" data-testid="input-extra-email" {...field} />
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
                        <ArrowLeft className="h-4 w-4" />
                        Back
                      </Button>
                      <Button type="submit" className="gap-2" data-testid="button-next-step">
                        Continue
                        <ArrowRight className="h-4 w-4" />
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
                  Branch Offices
                </CardTitle>
                <CardDescription>
                  Add any branch offices if applicable. You can skip this step if you have no branches.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {branches.length > 0 && (
                  <div className="mb-6 space-y-3">
                    <h3 className="text-sm font-medium">Added Branches ({branches.length})</h3>
                    {branches.map((branch, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg border p-3 bg-muted/30"
                      >
                        <div>
                          <p className="font-medium text-sm">
                            {branch.city || "Branch"} {branch.area && `- ${branch.area}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {branch.managerName && `Manager: ${branch.managerName}`}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleBranchRemove(index)}
                          className="text-destructive hover:text-destructive"
                          data-testid={`button-remove-branch-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Form {...branchForm}>
                  <form onSubmit={branchForm.handleSubmit(handleBranchAdd)} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={branchForm.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter city" data-testid="input-branch-city" {...field} />
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
                            <FormLabel>Area</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter area" data-testid="input-branch-area" {...field} />
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
                            <FormLabel>Street</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter street" data-testid="input-branch-street" {...field} />
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
                            <FormLabel>Building Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter building #" data-testid="input-branch-building" {...field} />
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
                            <FormLabel>Manager Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter manager name" data-testid="input-branch-manager" {...field} />
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
                            <FormLabel>Manager Mobile</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter mobile" data-testid="input-branch-manager-mobile" {...field} />
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
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter phone" data-testid="input-branch-phone" {...field} />
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
                            <FormLabel>Fax</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter fax" data-testid="input-branch-fax" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button type="submit" variant="outline" className="gap-2" data-testid="button-add-branch">
                      <Plus className="h-4 w-4" />
                      Add Branch
                    </Button>
                  </form>
                </Form>

                <div className="flex justify-between pt-6 mt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                    className="gap-2"
                    data-testid="button-prev-step"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button onClick={() => setCurrentStep(4)} className="gap-2" data-testid="button-next-step">
                    Continue
                    <ArrowRight className="h-4 w-4" />
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
                  Required Documents
                </CardTitle>
                <CardDescription>
                  Upload the required documents for your membership application.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <h3 className="font-medium mb-2 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                      Membership and Info Forms
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Internal association forms filled, printed, signed, and stamped (Office information form, form for owners, authorized signatories, employees).
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
                      <span className="text-sm font-medium">Click to upload files</span>
                      <span className="text-xs text-muted-foreground">PDF, JPG, PNG up to 10MB</span>
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
                      Legal / Commercial Documents
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Updated commercial registration showing status and registered trade name. Include updated registration and official letter if there are any changes in partners/authorized signatories.
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
                      <span className="text-sm font-medium">Click to upload files</span>
                      <span className="text-xs text-muted-foreground">PDF, JPG, PNG up to 10MB</span>
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
                      Personal Documents
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      ID card for new owners/employees, recent clean criminal record certificate, recent personal photo.
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
                      <span className="text-sm font-medium">Click to upload files</span>
                      <span className="text-xs text-muted-foreground">PDF, JPG, PNG up to 10MB</span>
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
                    <ArrowLeft className="h-4 w-4" />
                    Back
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
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Registration
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
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
