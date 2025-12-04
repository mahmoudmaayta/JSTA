import { useQuery } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { OfficeSidebar } from "@/components/layout/office-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingPage } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { DocumentPreviewButton } from "@/components/ui/document-preview";
import { useTranslation, useLanguage } from "@/lib/i18n";
import type { Document } from "@shared/schema";
import { FileText, Download, Calendar, FolderOpen } from "lucide-react";

export default function OfficeDocuments() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const sidebarSide = language === 'ar' ? 'right' : 'left';

  const CATEGORY_LABELS: Record<string, string> = {
    INITIAL_FIRST_FORMS: t("documents.categoryMembership"),
    INITIAL_SECOND_LEGAL: t("documents.categoryLegal"),
    INITIAL_THIRD_PERSONAL: t("documents.categoryPersonal"),
    RENEWAL_TEMPLATE: t("documents.categoryRenewalTemplate"),
    MINISTRY_APPROVED_DOC: t("documents.categoryMinistryApproved"),
  };
  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ["/api/office/documents"],
  });

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const groupedDocuments = documents?.reduce((acc, doc) => {
    const category = doc.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(doc);
    return acc;
  }, {} as Record<string, Document[]>) || {};

  const categories = Object.keys(groupedDocuments);

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <OfficeSidebar key={`sidebar-${language}`} side={sidebarSide} />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold">{t("documents.title")}</h1>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6">
            {isLoading ? (
              <LoadingPage message={t("documents.loading")} />
            ) : categories.length > 0 ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">{t("documents.yourDocuments")}</h2>
                  <p className="text-muted-foreground">
                    {t("documents.description")}
                  </p>
                </div>

                {categories.map((category) => (
                  <Card key={category}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <FolderOpen className="h-5 w-5" />
                        {CATEGORY_LABELS[category] || category}
                      </CardTitle>
                      <CardDescription>
                        {groupedDocuments[category].length} {t("documents.files")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {groupedDocuments[category].map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between rounded-lg border p-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium truncate" data-testid={`text-doc-name-${doc.id}`}>
                                  {doc.originalFilename}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  <span>
                                    {t("documents.uploaded")} {new Date(doc.uploadedAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <DocumentPreviewButton
                                documentId={doc.id}
                                filename={doc.originalFilename}
                              />
                              <a
                                href={`/api/documents/${doc.id}/download`}
                                data-testid={`button-download-${doc.id}`}
                              >
                                <Button variant="outline" size="sm" className="gap-2">
                                  <Download className="h-4 w-4" />
                                  {t("common.download")}
                                </Button>
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={FileText}
                title={t("documents.noDocuments")}
                description={t("documents.noDocumentsDesc")}
              />
            )}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
