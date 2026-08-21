import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useLanguage } from "@/lib/i18n";
import {
  Mail,
  Key,
  CheckCircle,
  FileCheck,
  FileText,
  CreditCard,
  PartyPopper,
  Clock,
} from "lucide-react";

interface RenewalStep {
  id: number;
  renewalId: number;
  officeId: number;
  stepType: string;
  ipAddress?: string;
  userAgent?: string;
  completedAt: string;
}

const STEP_CONFIG: Record<string, { icon: typeof Mail; color: string; labelEn: string; labelAr: string }> = {
  INVITE_SENT: { icon: Mail, color: "bg-blue-500 dark:bg-blue-600", labelEn: "Invitation Sent", labelAr: "تم إرسال الدعوة" },
  TOKEN_REDEEMED: { icon: Key, color: "bg-purple-500 dark:bg-purple-600", labelEn: "Link Accessed", labelAr: "تم الوصول للرابط" },
  CREDENTIALS_RESET: { icon: CheckCircle, color: "bg-indigo-500 dark:bg-indigo-600", labelEn: "Credentials Updated", labelAr: "تم تحديث البيانات" },
  INFO_REVIEWED: { icon: FileCheck, color: "bg-teal-500 dark:bg-teal-600", labelEn: "Info Reviewed", labelAr: "تمت مراجعة المعلومات" },
  DECLARATIONS_ACCEPTED: { icon: FileText, color: "bg-cyan-500 dark:bg-cyan-600", labelEn: "Declarations Accepted", labelAr: "تم قبول الإقرارات" },
  PAYMENT_INITIATED: { icon: Clock, color: "bg-amber-500 dark:bg-amber-600", labelEn: "Payment Initiated", labelAr: "بدء الدفع" },
  PAYMENT_CONFIRMED: { icon: CreditCard, color: "bg-green-500 dark:bg-green-600", labelEn: "Payment Confirmed", labelAr: "تم تأكيد الدفع" },
  RENEWAL_COMPLETED: { icon: PartyPopper, color: "bg-emerald-500 dark:bg-emerald-600", labelEn: "Renewal Completed", labelAr: "اكتمل التجديد" },
};

export function RenewalStepsTimeline({ officeId }: { officeId: number }) {
  const { language, t } = useLanguage();
  
  const { data: steps, isLoading } = useQuery<RenewalStep[]>({
    queryKey: ['/api/admin/offices', officeId, 'renewal-steps'],
    enabled: !!officeId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t("renewalSteps.renewalStepsTimeline")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (!steps || steps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t("renewalSteps.renewalStepsTimeline")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("renewalSteps.noRenewalStepsRecordedYet")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-renewal-timeline">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {t("renewalSteps.renewalStepsTimeline")}
          <Badge variant="secondary" className="text-xs" data-testid="badge-step-count">
            {steps.length} {t("renewalSteps.steps")}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
          <div className="space-y-4">
            {steps.map((step, index) => {
              const config = STEP_CONFIG[step.stepType] || {
                icon: CheckCircle,
                color: "bg-gray-500 dark:bg-gray-600",
                labelEn: step.stepType,
                labelAr: step.stepType,
              };
              const Icon = config.icon;
              const label = language === 'ar' ? config.labelAr : config.labelEn;
              const date = new Date(step.completedAt);
              const formattedDate = date.toLocaleDateString(language === 'ar' ? 'ar-JO' : 'en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={step.id} className="relative flex items-start gap-4 pl-8" data-testid={`row-step-${step.id}`}>
                  <div className={`absolute left-2 w-5 h-5 rounded-full ${config.color} flex items-center justify-center ring-4 ring-background`}>
                    <Icon className="h-3 w-3 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm" data-testid={`text-step-label-${step.id}`}>{label}</span>
                      {index === 0 && (
                        <Badge variant="outline" className="text-xs">
                          {t("renewalSteps.latest")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5" data-testid={`text-step-date-${step.id}`}>
                      {formattedDate}
                    </p>
                    {step.ipAddress && (
                      <p className="text-xs text-muted-foreground" data-testid={`text-step-ip-${step.id}`}>
                        IP: {step.ipAddress}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
