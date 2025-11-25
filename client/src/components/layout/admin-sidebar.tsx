import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Building,
  FileCheck,
  LogOut,
  Shield,
  History,
} from "lucide-react";
import logoImage from "@assets/logo-0 (1)_1764114456004.png";

const adminMenuItems = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Offices",
    url: "/admin/offices",
    icon: Building,
  },
  {
    title: "Renewals",
    url: "/admin/renewals",
    icon: FileCheck,
  },
  {
    title: "Audit Logs",
    url: "/admin/audit-logs",
    icon: History,
  },
];

export function AdminSidebar() {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-3 px-2 py-3">
          <img 
            src={logoImage} 
            alt="JSTA Logo" 
            className="h-10 w-auto object-contain"
            data-testid="img-admin-logo"
          />
          <div className="flex flex-col">
            <span className="font-semibold text-sm">JSTA Portal</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Admin Panel
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url || (item.url !== "/admin" && location.startsWith(item.url))}
                  >
                    <Link href={item.url} data-testid={`nav-${item.title.toLowerCase()}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t">
        <div className="flex items-center gap-3 px-2 py-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {user?.email ? getInitials(user.email) : "AD"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col truncate">
            <span className="truncate text-sm font-medium">{user?.email}</span>
            <span className="text-xs text-muted-foreground">Administrator</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="shrink-0"
            data-testid="button-sidebar-logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
