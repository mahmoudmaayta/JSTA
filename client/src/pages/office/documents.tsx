import { useQuery } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { OfficeSidebar } from "@/components/layout/office-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingPage } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import type { Document } from "@shared/schema";
import { FileText, Download, Calendar, FolderOpen } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  INITIAL_FIRST_FORMS: "Membership & Info Forms",
  INITIAL_SECOND_LEGAL: "Legal / Commercial Documents",
  INITIAL_THIRD_PERSONAL: "Personal Documents",
  RENEWAL_TEMPLATE: "Renewal Template",
  MINISTRY_APPROVED_DOC: "Ministry Approved Document",
};

export default function OfficeDocuments() {
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
        <OfficeSidebar />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold">Documents</h1>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6">
            {isLoading ? (
              <LoadingPage message="Loading documents..." />
            ) : categories.length > 0 ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">Your Documents</h2>
                  <p className="text-muted-foreground">
                    All documents uploaded for your office registration and renewals
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
                        {groupedDocuments[category].length} document(s)
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
                                    Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <a
                              href={`/api/documents/${doc.id}/download`}
                              data-testid={`button-download-${doc.id}`}
                            >
                              <Button variant="outline" size="sm" className="gap-2">
                                <Download className="h-4 w-4" />
                                Download
                              </Button>
                            </a>
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
                title="No Documents"
                description="You haven't uploaded any documents yet."
              />
            )}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
