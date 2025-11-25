import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LucideIcon, FileX, FolderOpen, Inbox } from "lucide-react";
import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} data-testid="button-empty-action">
          {action.label}
        </Button>
      )}
      {children}
    </div>
  );
}

export function NoDocuments() {
  return (
    <EmptyState
      icon={FileX}
      title="No Documents"
      description="No documents have been uploaded yet."
    />
  );
}

export function NoData({ title = "No Data", description }: { title?: string; description?: string }) {
  return (
    <EmptyState
      icon={FolderOpen}
      title={title}
      description={description || "There's nothing here yet."}
    />
  );
}
