import {
  LayoutDashboard, Car, Users, MapPin, LogOut, Headphones,
  UserCircle, Truck, ClipboardList, Activity, Shield
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, roles: ['ROLE_CUSTOMER', 'ROLE_DRIVER', 'ROLE_DISPATCHER', 'ROLE_ADMIN'] },
  { title: 'Book a Ride', url: '/rides/new', icon: MapPin, roles: ['ROLE_CUSTOMER'] },
  { title: 'My Rides', url: '/rides', icon: Car, roles: ['ROLE_CUSTOMER'] },
  { title: 'Incoming Rides', url: '/driver/rides', icon: ClipboardList, roles: ['ROLE_DRIVER'] },
  { title: 'City-to-City Booking', url: '/dispatch/rides', icon: Headphones, roles: ['ROLE_DISPATCHER'] },
  { title: 'Create City Booking', url: '/dispatch/rides/new', icon: MapPin, roles: ['ROLE_DISPATCHER'] },
  { title: 'All Rides', url: '/admin/rides', icon: Car, roles: ['ROLE_ADMIN'] },
  { title: 'Drivers', url: '/admin/drivers', icon: UserCircle, roles: ['ROLE_ADMIN'] },
  { title: 'Dispatchers', url: '/admin/dispatchers', icon: Headphones, roles: ['ROLE_ADMIN'] },
  { title: 'Vehicles', url: '/admin/vehicles', icon: Truck, roles: ['ROLE_ADMIN'] },
  { title: 'Customers', url: '/admin/customers', icon: Users, roles: ['ROLE_ADMIN'] },
  { title: 'Activity Log', url: '/admin/activity', icon: Activity, roles: ['ROLE_ADMIN'] },
];

const roleLabel: Record<UserRole, string> = {
  ROLE_CUSTOMER: 'Customer',
  ROLE_DRIVER: 'Driver',
  ROLE_DISPATCHER: 'Dispatcher',
  ROLE_ADMIN: 'Administrator',
};

export function AppSidebar() {
  const { user, logout } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const filteredItems = navItems.filter(item => user && item.roles.includes(user.role));

  return (
    <Sidebar collapsible="icon" className="border-r-0 bg-sidebar">
      <SidebarContent className="bg-sidebar">
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-accent">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          {!collapsed && <span className="text-base font-bold text-sidebar-accent-foreground">RideFlow</span>}
        </div>

        {/* Role indicator */}
        {!collapsed && user && (
          <div className="border-b border-sidebar-border px-4 py-3">
            <p className="truncate text-xs font-medium text-sidebar-foreground">{user.email}</p>
            <p className="text-[10px] uppercase tracking-wider text-primary">{roleLabel[user.role]}</p>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/60">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map(item => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/dashboard' || item.url === '/rides' || item.url === '/dispatch/rides'}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors [color:hsl(var(--sidebar-fg))]"
                      activeClassName="font-medium [color:hsl(var(--sidebar-fg-active))] [background-color:hsl(var(--sidebar-border))]"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border bg-sidebar">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:opacity-80"
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Sign Out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
