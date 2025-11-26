import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User, Menu, X } from "lucide-react";
import { useState } from "react";
import logoImage from "@assets/logo-0 (1)_1764114456004.png";

export function Header() {
  const { user, logout, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useTranslation();

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const getDashboardLink = () => {
    if (user?.role === "ADMIN") return "/admin";
    return "/office/dashboard";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <img 
            src={logoImage} 
            alt="JSTA Logo" 
            className="h-9 w-auto object-contain"
            data-testid="img-header-logo"
          />
          <span className="hidden font-semibold sm:inline-block">
            JSTA Portal
          </span>
        </Link>

        {isAuthenticated ? (
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link href={getDashboardLink()}>
              <Button variant="ghost" size="sm" data-testid="link-dashboard">
                {t("navigation.dashboard")}
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full"
                  data-testid="button-user-menu"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {user?.email ? getInitials(user.email) : "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium text-sm ltr">{user?.email}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {user?.role?.toLowerCase()} {t("auth.login")}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={getDashboardLink()} className="w-full cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    {t("navigation.dashboard")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                  data-testid="button-logout"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("auth.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <div className="hidden sm:flex sm:gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" data-testid="link-login">
                  {t("auth.login")}
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" data-testid="link-register">
                  {t("auth.register")}
                </Button>
              </Link>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        )}
      </div>

      {mobileMenuOpen && !isAuthenticated && (
        <div className="border-t sm:hidden">
          <div className="container mx-auto flex flex-col gap-2 p-4">
            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start" data-testid="mobile-link-login">
                {t("auth.login")}
              </Button>
            </Link>
            <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full" data-testid="mobile-link-register">
                {t("auth.register")}
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
