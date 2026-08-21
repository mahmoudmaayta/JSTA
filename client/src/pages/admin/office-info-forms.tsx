import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingPage } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n";
import type { Office } from "@shared/schema";
import {
  Building,
  FileText,
  Search,
  Eye,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { useState } from "react";

interface OfficeInfoFormRecord {
  id: number;
  officeId: number;
  renewalId?: number | null;
  data: Record<string, any>;
  submittedAt: string;
  office?: Office;
}

export default function AdminOfficeInfoForms() {
  const { language, t } = useLanguage();
  const sidebarSide = language === 'ar' ? 'right' : 'left';
  const dir = language === 'ar' ? 'rtl' : 'ltr';
  const [searchQuery, setSearchQuery] = useState("");

  const { data: forms, isLoading } = useQuery<OfficeInfoFormRecord[]>({
    queryKey: ['/api/admin/office-info-forms'],
  });

  const filteredForms = forms?.filter(form => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    const officeName = form.office?.tradeNameAr || form.office?.tradeNameEn || '';
    return officeName.toLowerCase().includes(searchLower) ||
           form.officeId.toString().includes(searchLower);
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === 'ar' ? 'ar-JO' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full" dir={dir}>
        <AdminSidebar side={sidebarSide} />
        <SidebarInset className="flex flex-col">
          <header className="flex h-14 items-center gap-2 border-b px-4">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex-1">
              <h1 className="font-semibold">
                {t("officeInfoForms.officeInfoForms")}
              </h1>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4">
            {isLoading ? (
              <LoadingPage />
            ) : !forms || forms.length === 0 ? (
              <EmptyState
                icon={FileText}
                title={t("officeInfoForms.noForms")}
                description={t("officeInfoForms.noOfficeInfoFormsHave")}
              />
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          {t("officeInfoForms.submittedOfficeInfoForms")}
                        </CardTitle>
                        <CardDescription>
                          {language === 'ar' 
                            ? `${forms.length} نموذج مقدم` 
                            : `${forms.length} forms submitted`}
                        </CardDescription>
                      </div>
                      <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder={t("officeInfoForms.searchOffices")}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9"
                          data-testid="input-search-forms"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3" data-testid="list-office-forms">
                      {filteredForms?.map((form) => (
                        <div
                          key={form.id}
                          className="flex items-center justify-between gap-4 p-4 border rounded-md"
                          data-testid={`row-form-${form.id}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                              <Building className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate" data-testid={`text-office-name-${form.id}`}>
                                {form.office?.tradeNameAr || form.office?.tradeNameEn || `Office #${form.officeId}`}
                              </p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span data-testid={`text-date-${form.id}`}>{formatDate(form.submittedAt)}</span>
                                <Badge variant="secondary" className="text-xs" data-testid={`badge-status-${form.id}`}>
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  {t("officeInfoForms.submitted")}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <Link href={`/admin/offices/${form.officeId}`}>
                            <Button variant="outline" size="sm" data-testid={`button-view-${form.id}`}>
                              <Eye className="h-4 w-4 mr-1" />
                              {t("officeInfoForms.view")}
                            </Button>
                          </Link>
                        </div>
                      ))}
                      {filteredForms?.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                          {t("officeInfoForms.noResultsFound")}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
