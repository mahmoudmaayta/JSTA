import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  FileCheck, 
  Upload, 
  AlertCircle,
  Loader2
} from "lucide-react";

type OfficeStatus = "PENDING_APPROVAL" | "ACTIVE" | "REJECTED";
type RenewalStatus = 
  | "SUBMITTED" 
  | "UNDER_REVIEW" 
  | "APPROVED_FOR_DOWNLOAD" 
  | "MINISTRY_DOC_UPLOADED" 
  | "FINAL_APPROVED" 
  | "REJECTED";

interface StatusBadgeProps {
  status: OfficeStatus | RenewalStatus;
  size?: "sm" | "default";
  showIcon?: boolean;
}

const statusConfig: Record<string, { 
  label: { en: string; ar: string };
  variant: "default" | "secondary" | "destructive" | "outline";
  className: string;
  icon: typeof Clock;
}> = {
  PENDING_APPROVAL: {
    label: { en: "Pending Approval", ar: "قيد الدراسة" },
    variant: "secondary",
    className: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
    icon: Clock,
  },
  ACTIVE: {
    label: { en: "Active", ar: "فعال" },
    variant: "default",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: { en: "Rejected", ar: "مرفوض" },
    variant: "destructive",
    className: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    icon: XCircle,
  },
  SUBMITTED: {
    label: { en: "Submitted", ar: "مُقَدَّم" },
    variant: "secondary",
    className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
    icon: Loader2,
  },
  UNDER_REVIEW: {
    label: { en: "Under Review", ar: "قيد المراجعة" },
    variant: "secondary",
    className: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
    icon: AlertCircle,
  },
  APPROVED_FOR_DOWNLOAD: {
    label: { en: "Ready for Download", ar: "جاهز للتحميل" },
    variant: "default",
    className: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800",
    icon: FileCheck,
  },
  MINISTRY_DOC_UPLOADED: {
    label: { en: "Ministry Document Uploaded", ar: "تم رفع مستند الوزارة" },
    variant: "secondary",
    className: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800",
    icon: Upload,
  },
  FINAL_APPROVED: {
    label: { en: "Approved", ar: "معتمد" },
    variant: "default",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
    icon: CheckCircle2,
  },
};

export function StatusBadge({ status, size = "default", showIcon = true }: StatusBadgeProps) {
  const { language } = useLanguage();
  const config = statusConfig[status];
  
  if (!config) {
    return (
      <Badge variant="secondary" className="font-medium">
        {status}
      </Badge>
    );
  }

  const Icon = config.icon;
  const label = config.label[language] || config.label.en;

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium border",
        config.className,
        size === "sm" && "text-xs px-2 py-0.5"
      )}
    >
      {showIcon && <Icon className={cn("ltr:mr-1 rtl:ml-1", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />}
      {label}
    </Badge>
  );
}
