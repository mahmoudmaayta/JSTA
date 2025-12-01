import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import { LoadingPage } from "@/components/ui/loading-spinner";

import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import RegistrationSuccessPage from "@/pages/registration-success";
import NotFound from "@/pages/not-found";

import OfficeDashboard from "@/pages/office/dashboard";
import OfficeDocuments from "@/pages/office/documents";
import OfficeRenewals from "@/pages/office/renewals";
import OfficeRenewalDetail from "@/pages/office/renewal-detail";
import OfficeRenewal2026 from "@/pages/office/renewal-2026";
import OfficeProfile from "@/pages/office/profile";
import StaffForm2026 from "@/pages/office/staff-form-2026";
import CommitmentForm2026 from "@/pages/office/commitment-form-2026";

import AdminDashboard from "@/pages/admin/dashboard";
import AdminOffices from "@/pages/admin/offices";
import AdminOfficeDetail from "@/pages/admin/office-detail";
import AdminRenewals from "@/pages/admin/renewals";
import AdminRenewalDetail from "@/pages/admin/renewal-detail";
import AdminAuditLogs from "@/pages/admin/audit-logs";
import AdminStaffDashboard from "@/pages/admin/staff-dashboard";

function ProtectedRoute({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode; 
  allowedRoles: ('ADMIN' | 'OFFICE')[];
}) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <LoadingPage message="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (user && !allowedRoles.includes(user.role)) {
    if (user.role === 'ADMIN') {
      return <Redirect to="/admin" />;
    }
    return <Redirect to="/office/dashboard" />;
  }

  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <LoadingPage message="Loading..." />;
  }

  if (isAuthenticated && user) {
    if (user.role === 'ADMIN') {
      return <Redirect to="/admin" />;
    }
    return <Redirect to="/office/dashboard" />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        <PublicOnlyRoute>
          <LandingPage />
        </PublicOnlyRoute>
      </Route>
      
      <Route path="/login">
        <PublicOnlyRoute>
          <LoginPage />
        </PublicOnlyRoute>
      </Route>
      
      <Route path="/register">
        <PublicOnlyRoute>
          <RegisterPage />
        </PublicOnlyRoute>
      </Route>
      
      <Route path="/registration-success">
        <RegistrationSuccessPage />
      </Route>

      <Route path="/office/dashboard">
        <ProtectedRoute allowedRoles={['OFFICE']}>
          <OfficeDashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/office/documents">
        <ProtectedRoute allowedRoles={['OFFICE']}>
          <OfficeDocuments />
        </ProtectedRoute>
      </Route>
      
      <Route path="/office/renewals">
        <ProtectedRoute allowedRoles={['OFFICE']}>
          <OfficeRenewals />
        </ProtectedRoute>
      </Route>
      
      <Route path="/office/renewals/:id">
        <ProtectedRoute allowedRoles={['OFFICE']}>
          <OfficeRenewalDetail />
        </ProtectedRoute>
      </Route>
      
      <Route path="/office/renewals-2026/:id">
        <ProtectedRoute allowedRoles={['OFFICE']}>
          <OfficeRenewal2026 />
        </ProtectedRoute>
      </Route>
      
      <Route path="/office/profile">
        <ProtectedRoute allowedRoles={['OFFICE']}>
          <OfficeProfile />
        </ProtectedRoute>
      </Route>
      
      <Route path="/office/staff-form-2026">
        <ProtectedRoute allowedRoles={['OFFICE']}>
          <StaffForm2026 />
        </ProtectedRoute>
      </Route>
      
      <Route path="/office/commitment-form-2026">
        <ProtectedRoute allowedRoles={['OFFICE']}>
          <CommitmentForm2026 />
        </ProtectedRoute>
      </Route>

      <Route path="/admin">
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <AdminDashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin/offices">
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <AdminOffices />
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin/offices/:id">
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <AdminOfficeDetail />
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin/renewals">
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <AdminRenewals />
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin/renewals/:id">
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <AdminRenewalDetail />
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin/audit-logs">
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <AdminAuditLogs />
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin/staff">
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <AdminStaffDashboard />
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
