'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { useTenantConfig } from '@/lib/useTenantConfig';
import { PAGE_PERMISSIONS } from '@/lib/permissions';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  TrendingUp,
  Users,
  LogOut,
  TicketCheck,
  Settings,
  Info,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FolderOpen,
} from 'lucide-react';

const iconMap: Record<string, any> = {
  '/dashboard': LayoutDashboard,
  '/categories': FolderOpen,
  '/items': Package,
  '/pos': ShoppingCart,
  '/orders': ClipboardList,
  '/kot': TicketCheck,
  '/inventory': FileText,
  '/reports': TrendingUp,
  '/users': Users,
  '/settings': Settings,
  '/about': Info,
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, tenant } = useAuthStore();
  const { kotEnabled, canConfigureKOT } = useTenantConfig();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Initialize from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar_collapsed');
      return saved === 'true';
    }
    return false;
  });

  // Persist sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', isCollapsed.toString());
  }, [isCollapsed]);

  // Build navigation dynamically based on user role and business settings
  const navigation = PAGE_PERMISSIONS
    .filter(page => {
      // Check if user has required role
      if (!user || !page.roles.includes(user.role as any)) {
        return false;
      }

      // Filter KOT based on business settings
      if (page.path === '/kot' && !kotEnabled) {
        return false;
      }

      // Filter Settings based on business type (only for businesses that can configure KOT)
      if (page.path === '/settings' && !canConfigureKOT) {
        return false;
      }

      return true;
    })
    .map(page => ({
      name: page.name,
      href: page.path,
      icon: iconMap[page.path] || LayoutDashboard,
    }));

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div 
        className={`bg-white shadow-lg transition-all duration-300 ease-in-out relative ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 z-50 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>

        <div className="flex h-16 items-center justify-center border-b">
          {isCollapsed ? (
            <h1 className="text-xl font-bold text-blue-600">POS</h1>
          ) : (
            <h1 className="text-xl font-bold text-blue-600">POS System</h1>
          )}
        </div>

        {/* Business Info */}
        {tenant && !isCollapsed && (
          <div className="px-4 py-3 border-b flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {tenant.businessType}
            </span>
            {canConfigureKOT && kotEnabled && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                KOT
              </span>
            )}
          </div>
        )}

        <nav className="flex-1 space-y-1 px-2 py-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-3 text-sm font-medium rounded-lg transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                title={isCollapsed ? item.name : ''}
              >
                <Icon className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'}`} />
                {!isCollapsed && item.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-4">
          {!isCollapsed ? (
            <>
              <div className="mb-3 px-4">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex w-full items-center px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="mr-3 h-5 w-5" />
                Logout
              </button>
            </>
          ) : (
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center px-2 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </div>
    </div>
  );
}
