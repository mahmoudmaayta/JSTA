import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/lib/i18n";
import {
  Key,
  User,
  Building2,
  FileCheck,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Shield,
  Lock,
} from "lucide-react";

type WizardStep = "validate" | "credentials" | "review" | "declarations" | "payment" | "complete";

interface ValidationResult {
  valid: boolean;
  message?: string;
  officeId?: number;
  officeName?: string;
  year?: number;
  renewalId?: number;
  /** PENDING / SENT means the invite still needs redeeming; CONSUMED means resume. */
  inviteStatus?: string;
  renewalState?: string;
}

interface RedemptionResult {
  success: boolean;
  officeId?: number;
  renewalId?: number;
  message?: string;
}

interface OfficeInfo {
  id: number;
  name: string;
  nameEn: string;
  registrationNumber: string;
  licenseCategory: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  managerName: string;
}

// Labels are stored as translation keys, not resolved text: this is module
// scope, where the `t` from useLanguage() is not available.
const STEP_CONFIG = {
  validate: { icon: Key, labelKey: "renewalWizard.steps.validate", order: 1 },
  credentials: { icon: Lock, labelKey: "renewalWizard.credentials.submit", order: 2 },
  review: { icon: Building2, labelKey: "renewalWizard.steps.review", order: 3 },
  declarations: { icon: FileCheck, labelKey: "renewalWizard.steps.declarations", order: 4 },
  payment: { icon: CreditCard, labelKey: "renewalWizard.steps.payment", order: 5 },
  complete: { icon: CheckCircle2, labelKey: "renewalWizard.steps.complete", order: 6 },
};

const DECLARATIONS = [
  {
    id: "data_accuracy",
    labelEn: "I confirm that all information provided is accurate and complete to the best of my knowledge.",
    labelAr: "أؤكد أن جميع المعلومات المقدمة دقيقة وكاملة على حد علمي.",
  },
  {
    id: "terms_acceptance", 
    labelEn: "I agree to the terms and conditions of the Jordan Society of Tourism and Travel Agents.",
    labelAr: "أوافق على شروط وأحكام جمعية وكلاء السياحة والسفر الأردنية.",
  },
  {
    id: "anti_fraud",
    labelEn: "I acknowledge that providing false information may result in rejection of the renewal application.",
    labelAr: "أقر بأن تقديم معلومات كاذبة قد يؤدي إلى رفض طلب التجديد.",
  },
  {
    id: "ministry_authorization",
    labelEn: "I authorize JSTA to submit this renewal application to the Ministry of Tourism on my behalf.",
    labelAr: "أفوض الجمعية بتقديم طلب التجديد هذا لوزارة السياحة نيابة عني.",
  },
];

/** Where a returning office picks the wizard back up, based on renewal state. */
function resumeStepFor(renewalState?: string): WizardStep {
  switch (renewalState) {
    case "CREDENTIALS_UPDATED":
      return "review";
    case "INFO_APPROVED":
      return "declarations";
    case "PAYMENT_PENDING":
      return "payment";
    case "COMPLETED":
      return "complete";
    default:
      return "credentials";
  }
}


/**
 * The public renewal endpoints answer in English. Most of their messages are no
 * more actionable than our own wording, so they are replaced with the translated
 * text; the few that tell the office something specific are mapped to their own
 * key rather than shown raw in an Arabic UI.
 */
const SERVER_MESSAGE_KEYS: Record<string, string> = {
  "Email already in use": "renewalWizard.toast.emailInUse",
  "Invalid renewal state. Please redeem your invitation link first.":
    "renewalWizard.toast.invalidState",
  "Token does not match renewal": "renewalWizard.toast.tokenMismatch",
};

export default function RenewalWizardPage() {
  const params = useParams();
  const token = params.token as string;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { language, t } = useLanguage();

  const translateServerMessage = (message: string | undefined, fallbackKey: string) => {
    const key = message ? SERVER_MESSAGE_KEYS[message] : undefined;
    return t(key ?? fallbackKey);
  };

  const [currentStep, setCurrentStep] = useState<WizardStep>("validate");
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [renewalId, setRenewalId] = useState<number | null>(null);
  const [officeId, setOfficeId] = useState<number | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [acceptedDeclarations, setAcceptedDeclarations] = useState<string[]>([]);

  const validateTokenMutation = useMutation({
    mutationFn: async (tokenValue: string) => {
      const response = await fetch(`/api/renew/validate/${tokenValue}`);
      return response.json() as Promise<ValidationResult>;
    },
    onSuccess: (data) => {
      setValidationResult(data);
      if (!data.valid) {
        return;
      }

      setRenewalId(data.renewalId ?? null);
      setOfficeId(data.officeId ?? null);

      // A fresh invite still has to be redeemed (that is what grants access and
      // records the step). An already-consumed one resumes where the office left off.
      if (data.inviteStatus === "PENDING" || data.inviteStatus === "SENT") {
        redeemTokenMutation.mutate(token);
        return;
      }

      setCurrentStep(resumeStepFor(data.renewalState));
    },
    onError: () => {
      toast({
        title: t("renewalWizard.toast.validationErrorTitle"),
        description: t("renewalWizard.toast.validationErrorBody"),
        variant: "destructive",
      });
    },
  });

  const redeemTokenMutation = useMutation({
    mutationFn: async (tokenValue: string) => {
      const response = await fetch(`/api/renew/redeem/${tokenValue}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      return response.json() as Promise<RedemptionResult>;
    },
    onSuccess: (data) => {
      if (data.success) {
        setRenewalId(data.renewalId || null);
        setOfficeId(data.officeId || null);
        setCurrentStep("credentials");
        toast({
          title: t("renewalWizard.toast.redeemedTitle"),
          description: t("renewalWizard.toast.redeemedBody"),
        });
      } else {
        toast({
          title: t("renewalWizard.toast.redeemFailedTitle"),
          description: translateServerMessage(data.message, "renewalWizard.toast.redeemFailedBody"),
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: t("renewalWizard.toast.errorTitle"),
        description: t("renewalWizard.toast.redeemRetryBody"),
        variant: "destructive",
      });
    },
  });

  const updateCredentialsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/renew/${renewalId}/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, token }),
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setCurrentStep("review");
        toast({
          title: t("renewalWizard.toast.credentialsSetTitle"),
          description: t("renewalWizard.toast.credentialsSetBody"),
        });
      } else {
        toast({
          title: t("renewalWizard.toast.errorTitle"),
          description: translateServerMessage(data.message, "renewalWizard.toast.credentialsFailedBody"),
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: t("renewalWizard.toast.errorTitle"),
        description: t("renewalWizard.toast.credentialsRetryBody"),
        variant: "destructive",
      });
    },
  });

  const { data: officeInfo, isLoading: officeLoading } = useQuery<OfficeInfo>({
    queryKey: ["/api/renew", renewalId, "office-info", token],
    queryFn: async () => {
      const response = await fetch(`/api/renew/${renewalId}/office-info?token=${encodeURIComponent(token)}`);
      if (!response.ok) {
        throw new Error("Unable to load office information");
      }
      return response.json();
    },
    enabled: currentStep === "review" && !!renewalId && !!token,
  });

  useEffect(() => {
    if (token) {
      validateTokenMutation.mutate(token);
    }
  }, [token]);

  const handleCredentialSubmit = () => {
    if (!email) {
      toast({ title: t("renewalWizard.toast.emailRequiredTitle"), description: t("renewalWizard.toast.emailRequiredBody"), variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: t("renewalWizard.toast.passwordShortTitle"), description: t("renewalWizard.toast.passwordShortBody"), variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: t("renewalWizard.toast.passwordMismatchTitle"), description: t("renewalWizard.toast.passwordMismatchBody"), variant: "destructive" });
      return;
    }
    updateCredentialsMutation.mutate();
  };

  const handleDeclarationToggle = (id: string) => {
    setAcceptedDeclarations(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const allDeclarationsAccepted = DECLARATIONS.every(d => acceptedDeclarations.includes(d.id));

  const getProgress = () => {
    const stepOrder = STEP_CONFIG[currentStep].order;
    return (stepOrder / 6) * 100;
  };

  const renderStepIndicator = () => {
    const steps: WizardStep[] = ["validate", "credentials", "review", "declarations", "payment", "complete"];
    return (
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => {
          const config = STEP_CONFIG[step];
          const Icon = config.icon;
          const isActive = step === currentStep;
          const isCompleted = config.order < STEP_CONFIG[currentStep].order;
          
          return (
            <div key={step} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors
                ${isActive ? "bg-primary text-primary-foreground border-primary" : ""}
                ${isCompleted ? "bg-primary/20 text-primary border-primary" : ""}
                ${!isActive && !isCompleted ? "bg-muted text-muted-foreground border-muted" : ""}
              `}>
                {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                <span className="sr-only">{t(config.labelKey)}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-8 h-0.5 mx-2 ${isCompleted ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderValidateStep = () => (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Key className="w-8 h-8 text-primary" />
        </div>
        <CardTitle>{t("renewalWizard.validate.title")}</CardTitle>
        <CardDescription>{t("renewalWizard.validate.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {validateTokenMutation.isPending || redeemTokenMutation.isPending ? (
          <LoadingSpinner />
        ) : (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("renewalWizard.validate.invalidTitle")}</AlertTitle>
            <AlertDescription>
              {t("renewalWizard.validate.invalidDescription")}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  const renderCredentialsStep = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <div>
            <CardTitle>{t("renewalWizard.credentials.title")}</CardTitle>
            <CardDescription>{t("renewalWizard.credentials.description")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t("renewalWizard.credentials.email")}</Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="input-email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t("renewalWizard.credentials.password")}</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder={t("renewalWizard.credentials.passwordHint")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="input-password"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0"
              onClick={() => setShowPassword(!showPassword)}
              data-testid="button-toggle-password"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{t("renewalWizard.credentials.confirmPassword")}</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder={t("renewalWizard.credentials.confirmHint")}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            data-testid="input-confirm-password"
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button 
          onClick={handleCredentialSubmit}
          disabled={updateCredentialsMutation.isPending}
          data-testid="button-set-credentials"
        >
          {updateCredentialsMutation.isPending ? <LoadingSpinner /> : t("renewalWizard.credentials.submit")}
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </CardFooter>
    </Card>
  );

  const renderReviewStep = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <CardTitle>{t("renewalWizard.review.title")}</CardTitle>
            <CardDescription>{t("renewalWizard.review.description")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {officeLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : officeInfo ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t("renewalWizard.review.nameAr")}</p>
              <p className="font-medium">{officeInfo.name || "-"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t("renewalWizard.review.nameEn")}</p>
              <p className="font-medium">{officeInfo.nameEn || "-"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t("renewalWizard.review.registrationNumber")}</p>
              <p className="font-medium">{officeInfo.registrationNumber || "-"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t("renewalWizard.review.licenseCategory")}</p>
              <p className="font-medium">{officeInfo.licenseCategory || "-"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t("renewalWizard.review.email")}</p>
              <p className="font-medium">{officeInfo.email || "-"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t("renewalWizard.review.phone")}</p>
              <p className="font-medium">{officeInfo.phone || "-"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t("renewalWizard.review.city")}</p>
              <p className="font-medium">{officeInfo.city || "-"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t("renewalWizard.review.manager")}</p>
              <p className="font-medium">{officeInfo.managerName || "-"}</p>
            </div>
          </div>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{t("renewalWizard.review.loadError")}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex justify-between gap-2">
        <Button 
          variant="outline" 
          onClick={() => setCurrentStep("credentials")}
          data-testid="button-back-to-credentials"
        >
          <ArrowLeft className="mr-2 w-4 h-4" />{t("renewalWizard.back")}</Button>
        <Button 
          onClick={() => setCurrentStep("declarations")}
          data-testid="button-proceed-declarations"
        >{t("renewalWizard.review.confirm")}<ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </CardFooter>
    </Card>
  );

  const renderDeclarationsStep = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <FileCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <CardTitle>{t("renewalWizard.declarations.title")}</CardTitle>
            <CardDescription>{t("renewalWizard.declarations.description")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {DECLARATIONS.map((declaration) => (
          <div 
            key={declaration.id}
            className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30"
          >
            <Checkbox
              id={declaration.id}
              checked={acceptedDeclarations.includes(declaration.id)}
              onCheckedChange={() => handleDeclarationToggle(declaration.id)}
              data-testid={`checkbox-${declaration.id}`}
            />
            <Label 
              htmlFor={declaration.id}
              className="text-sm leading-relaxed cursor-pointer"
            >
              {language === "ar" ? declaration.labelAr : declaration.labelEn}
            </Label>
          </div>
        ))}
      </CardContent>
      <CardFooter className="flex justify-between gap-2">
        <Button 
          variant="outline" 
          onClick={() => setCurrentStep("review")}
          data-testid="button-back-to-review"
        >
          <ArrowLeft className="mr-2 w-4 h-4" />{t("renewalWizard.back")}</Button>
        <Button 
          onClick={() => setCurrentStep("payment")}
          disabled={!allDeclarationsAccepted}
          data-testid="button-proceed-payment"
        >{t("renewalWizard.declarations.submit")}<ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </CardFooter>
    </Card>
  );

  const renderPaymentStep = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-primary" />
          </div>
          <div>
            <CardTitle>{t("renewalWizard.payment.title")}</CardTitle>
            <CardDescription>{t("renewalWizard.payment.description")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
            <Shield className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{t("renewalWizard.payment.comingSoon")}</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            The payment gateway integration is being configured. 
            For now, please contact JSTA to complete your renewal payment.
          </p>
        </div>
        <Separator className="my-6" />
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
          <span className="font-medium">{t("renewalWizard.payment.fee")}</span>
          <span className="text-lg font-bold">{t("renewalWizard.payment.contact")}</span>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between gap-2">
        <Button 
          variant="outline" 
          onClick={() => setCurrentStep("declarations")}
          data-testid="button-back-to-declarations"
        >
          <ArrowLeft className="mr-2 w-4 h-4" />{t("renewalWizard.back")}</Button>
        <Button 
          onClick={() => {
            toast({
              title: t("renewalWizard.toast.redirectTitle"),
              description: t("renewalWizard.toast.redirectBody"),
            });
            setLocation("/login");
          }}
          data-testid="button-go-to-login"
        >{t("renewalWizard.payment.goToLogin")}<ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </CardFooter>
    </Card>
  );

  const renderCompleteStep = () => (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
        <CardTitle className="text-2xl">{t("renewalWizard.complete.title")}</CardTitle>
        <CardDescription>{t("renewalWizard.complete.description")}</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-muted-foreground mb-6">{t("renewalWizard.complete.body")}</p>
        <Button onClick={() => setLocation("/login")} data-testid="button-login-complete">{t("renewalWizard.payment.goToLogin")}</Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container max-w-3xl mx-auto py-12 px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{t("renewalWizard.title")}</h1>
          <p className="text-muted-foreground">{t("renewalWizard.subtitle")}</p>
        </div>

        <Progress value={getProgress()} className="mb-8" />

        {renderStepIndicator()}

        {currentStep === "validate" && renderValidateStep()}
        {currentStep === "credentials" && renderCredentialsStep()}
        {currentStep === "review" && renderReviewStep()}
        {currentStep === "declarations" && renderDeclarationsStep()}
        {currentStep === "payment" && renderPaymentStep()}
        {currentStep === "complete" && renderCompleteStep()}
      </div>
    </div>
  );
}
