import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { LoadingPage } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/lib/i18n";
import type { Office } from "@shared/schema";
import { Search, Eye, FolderOpen, Building2, Plane, Download } from "lucide-react";

export default function AdminOffices() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [membershipFilter, setMembershipFilter] = useState<string>("all");
  const [renewalYearFilter, setRenewalYearFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [fileNoQuery, setFileNoQuery] = useState("");
  const { t, language } = useLanguage();
  const sidebarSide = language === 'ar' ? 'right' : 'left';

  const { data: offices, isLoading } = useQuery<Office[]>({
    queryKey: ["/api/admin/offices"],
  });

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const licenseCategories = [
    { value: "A", label: "A" },
    { value: "B", label: "B" },
    { value: "C", label: "C" },
    { value: "D", label: "D" },
    { value: "A+B", label: "A+B" },
    { value: "A+B+C", label: "A+B+C" },
    { value: "A+B+C+D", label: "A+B+C+D" },
  ];

  const cities = [
    { value: "عمان", label: language === 'ar' ? "عمان" : "Amman" },
    { value: "اربد", label: language === 'ar' ? "اربد" : "Irbid" },
    { value: "الزرقاء", label: language === 'ar' ? "الزرقاء" : "Zarqa" },
    { value: "العقبة", label: language === 'ar' ? "العقبة" : "Aqaba" },
    { value: "السلط", label: language === 'ar' ? "السلط" : "Salt" },
    { value: "المفرق", label: language === 'ar' ? "المفرق" : "Mafraq" },
  ];

  // Helper function to determine if office is active (renewed in 2025)
  const isOfficeActive = (office: Office) => office.lastRenewalYear === 2025;
  
  const filteredOffices = offices?.filter((office) => {
    // Status filter based on 2025 renewal
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "ACTIVE" && isOfficeActive(office)) ||
      (statusFilter === "INACTIVE" && !isOfficeActive(office));
    const matchesCategory = categoryFilter === "all" || office.licenseCategory === categoryFilter;
    const matchesCity = cityFilter === "all" || office.mainCity === cityFilter;
    const matchesMembership = membershipFilter === "all" || 
      (membershipFilter === "iata" && office.isIata) || 
      (membershipFilter === "uftaa" && office.isUftaa) ||
      (membershipFilter === "asta" && office.isAsta) ||
      (membershipFilter === "wto" && office.isWto) ||
      (membershipFilter === "any" && (office.isIata || office.isUftaa || office.isAsta || office.isWto)) ||
      (membershipFilter === "none" && !office.isIata && !office.isUftaa && !office.isAsta && !office.isWto);
    const matchesRenewalYear = renewalYearFilter === "all" || 
      (office.lastRenewalYear?.toString() === renewalYearFilter);
    const matchesFileNo = !fileNoQuery || 
      office.registrationNumber?.toLowerCase().includes(fileNoQuery.toLowerCase());
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      office.tradeNameAr?.toLowerCase().includes(searchLower) ||
      office.tradeNameEn?.toLowerCase().includes(searchLower) ||
      office.legalNameAr?.toLowerCase().includes(searchLower) ||
      office.registrationNumber?.toLowerCase().includes(searchLower) ||
      office.mainEmail?.toLowerCase().includes(searchLower) ||
      office.iataNumber?.toLowerCase().includes(searchLower);
    return matchesStatus && matchesCategory && matchesCity && matchesMembership && matchesRenewalYear && matchesFileNo && matchesSearch;
  }) || [];

  const renewalYears = offices ? Array.from(new Set(offices.map(o => o.lastRenewalYear).filter(Boolean))).sort((a, b) => (b || 0) - (a || 0)) : [];

  const exportToCSV = () => {
    if (!filteredOffices.length) return;
    
    const headers = [
      'Registration Number',
      'Trade Name (Arabic)',
      'Trade Name (English)',
      'License Category',
      'City',
      'Email',
      'Phone',
      'IATA Number',
      'Last Renewal Year',
      'Status'
    ];
    
    const csvContent = [
      headers.join(','),
      ...filteredOffices.map(office => [
        office.registrationNumber || '',
        `"${(office.tradeNameAr || '').replace(/"/g, '""')}"`,
        `"${(office.tradeNameEn || '').replace(/"/g, '""')}"`,
        office.licenseCategory || '',
        office.mainCity || '',
        office.mainEmail || '',
        office.phone || '',
        office.iataNumber || '',
        office.lastRenewalYear || '',
        isOfficeActive(office) ? 'Active' : 'Inactive'
      ].join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `offices_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const totalCount = offices?.length || 0;
  // Active offices = those with 2025 renewal
  const activeCount = offices?.filter(o => isOfficeActive(o)).length || 0;
  const inactiveCount = totalCount - activeCount;
  const iataCount = offices?.filter(o => o.isIata).length || 0;

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <AdminSidebar key={`sidebar-${language}`} side={sidebarSide} />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold">{t("admin.offices")}</h1>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6">
            {isLoading ? (
              <LoadingPage message={t("adminOffices.loading")} />
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">{t("adminOffices.title")}</h2>
                    <p className="text-muted-foreground">
                      {t("admin.manageOffices")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <Building2 className="h-3 w-3" />
                      {totalCount} {language === 'ar' ? 'مكتب' : 'Offices'}
                    </Badge>
                    <Badge variant="outline" className="gap-1 text-green-600">
                      {activeCount} {language === 'ar' ? 'نشط' : 'Active'}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <Plane className="h-3 w-3" />
                      {iataCount} IATA
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportToCSV}
                      disabled={filteredOffices.length === 0}
                      data-testid="button-export-csv"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'تصدير CSV' : 'Export CSV'}
                    </Button>
                  </div>
                </div>

                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3" />
                          <Input
                            placeholder={language === 'ar' ? 'بحث بالاسم أو البريد الإلكتروني...' : 'Search by name or email...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 rtl:pl-3 rtl:pr-9"
                            data-testid="input-search"
                          />
                        </div>
                        <div className="relative sm:w-48">
                          <FolderOpen className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3" />
                          <Input
                            placeholder={language === 'ar' ? 'رقم الملف...' : 'File No...'}
                            value={fileNoQuery}
                            onChange={(e) => setFileNoQuery(e.target.value)}
                            className="pl-9 rtl:pl-3 rtl:pr-9"
                            data-testid="input-file-no"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue placeholder={t("admin.filterByStatus")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t("admin.allStatuses")}</SelectItem>
                            <SelectItem value="ACTIVE">{language === 'ar' ? `فعال (${activeCount})` : `Active (${activeCount})`}</SelectItem>
                            <SelectItem value="INACTIVE">{language === 'ar' ? `غير فعال (${inactiveCount})` : `Inactive (${inactiveCount})`}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder={language === 'ar' ? 'الفئة' : 'Category'} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{language === 'ar' ? 'جميع الفئات' : 'All Categories'}</SelectItem>
                            {licenseCategories.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {language === 'ar' ? `فئة ${cat.label}` : `Category ${cat.label}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={cityFilter} onValueChange={setCityFilter}>
                          <SelectTrigger data-testid="select-city">
                            <SelectValue placeholder={language === 'ar' ? 'المدينة' : 'City'} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{language === 'ar' ? 'جميع المدن' : 'All Cities'}</SelectItem>
                            {cities.map((city) => (
                              <SelectItem key={city.value} value={city.value}>
                                {city.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={renewalYearFilter} onValueChange={setRenewalYearFilter}>
                          <SelectTrigger data-testid="select-renewal-year">
                            <SelectValue placeholder={language === 'ar' ? 'سنة التجديد' : 'Renewal Year'} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{language === 'ar' ? 'كل السنوات' : 'All Years'}</SelectItem>
                            {renewalYears.map((year) => (
                              <SelectItem key={year} value={year!.toString()}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={membershipFilter} onValueChange={setMembershipFilter}>
                          <SelectTrigger data-testid="select-membership">
                            <SelectValue placeholder={language === 'ar' ? 'العضويات' : 'Memberships'} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{language === 'ar' ? 'الكل' : 'All'}</SelectItem>
                            <SelectItem value="any">{language === 'ar' ? 'أي عضوية' : 'Any Membership'}</SelectItem>
                            <SelectItem value="iata">IATA</SelectItem>
                            <SelectItem value="uftaa">UFTAA</SelectItem>
                            <SelectItem value="asta">ASTA</SelectItem>
                            <SelectItem value="wto">WTO</SelectItem>
                            <SelectItem value="none">{language === 'ar' ? 'بدون عضوية' : 'No Membership'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 text-sm text-muted-foreground">
                      {language === 'ar' 
                        ? `عرض ${filteredOffices.length} من ${totalCount} مكتب`
                        : `Showing ${filteredOffices.length} of ${totalCount} offices`}
                    </div>
                    {filteredOffices.length > 0 ? (
                      <div className="rounded-lg border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[100px]">{language === 'ar' ? 'رقم الملف' : 'File No.'}</TableHead>
                              <TableHead>{language === 'ar' ? 'الاسم التجاري' : 'Trade Name'}</TableHead>
                              <TableHead className="w-[60px] text-center">{language === 'ar' ? 'الفئة' : 'Cat.'}</TableHead>
                              <TableHead className="hidden md:table-cell">{language === 'ar' ? 'المدينة' : 'City'}</TableHead>
                              <TableHead className="hidden lg:table-cell">{language === 'ar' ? 'العضويات الدولية' : 'Memberships'}</TableHead>
                              <TableHead className="hidden xl:table-cell">{language === 'ar' ? 'آخر تجديد' : 'Last Renewal'}</TableHead>
                              <TableHead>{t("adminOffices.status")}</TableHead>
                              <TableHead className="text-right">{t("adminOffices.actions")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredOffices.slice(0, 25).map((office) => (
                              <TableRow key={office.id}>
                                <TableCell className="font-mono text-sm">
                                  {office.registrationNumber || office.id}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{office.tradeNameAr}</p>
                                    {office.tradeNameEn && (
                                      <p className="text-xs text-muted-foreground">{office.tradeNameEn}</p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  {office.licenseCategory ? (
                                    <Badge variant="outline" className="text-xs">
                                      {office.licenseCategory}
                                    </Badge>
                                  ) : '-'}
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                  {office.mainCity || "-"}
                                </TableCell>
                                <TableCell className="hidden lg:table-cell">
                                  <div className="flex flex-wrap gap-1">
                                    {office.isIata && (
                                      <Badge variant="outline" className="text-xs">IATA</Badge>
                                    )}
                                    {office.isUftaa && (
                                      <Badge variant="outline" className="text-xs">UFTAA</Badge>
                                    )}
                                    {office.isAsta && (
                                      <Badge variant="outline" className="text-xs">ASTA</Badge>
                                    )}
                                    {office.isWto && (
                                      <Badge variant="outline" className="text-xs">WTO</Badge>
                                    )}
                                    {!office.isIata && !office.isUftaa && !office.isAsta && !office.isWto && (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="hidden xl:table-cell">
                                  {office.lastRenewalYear || "-"}
                                </TableCell>
                                <TableCell>
                                  <StatusBadge status={isOfficeActive(office) ? "ACTIVE" : "INACTIVE"} size="sm" />
                                </TableCell>
                                <TableCell className="text-right">
                                  <Link href={`/admin/offices/${office.id}`}>
                                    <Button variant="ghost" size="sm" className="gap-1" data-testid={`button-view-${office.id}`}>
                                      <Eye className="h-4 w-4" />
                                      {t("common.view")}
                                    </Button>
                                  </Link>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <EmptyState
                        icon={FolderOpen}
                        title={t("adminOffices.noOffices")}
                        description={
                          searchQuery || fileNoQuery || statusFilter !== "all" || categoryFilter !== "all"
                            ? t("adminOffices.noMatchingOffices")
                            : t("adminOffices.noRegisteredOffices")
                        }
                      />
                    )}
                    {filteredOffices.length > 25 && (
                      <div className="mt-4 text-center text-sm text-muted-foreground">
                        {language === 'ar' 
                          ? `عرض أول 25 نتيجة. استخدم الفلاتر لتضييق البحث.`
                          : `Showing first 25 results. Use filters to narrow down.`}
                      </div>
                    )}
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
