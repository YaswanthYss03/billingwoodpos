'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { hasPageAccess, getDefaultPageForRole } from './permissions';
import toast from 'react-hot-toast';

/**
 * Hook to check if current user has permission to access the current page
 * Redirects to appropriate page if access is denied
 */
export function usePagePermission() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user || !pathname) return;

    // Skip check for login page
    if (pathname === '/login') return;

    const hasAccess = hasPageAccess(user.role, pathname);

    if (!hasAccess) {
      toast.error('You do not have permission to access this page');
      const defaultPage = getDefaultPageForRole(user.role as any);
      router.push(defaultPage);
    }
  }, [user, pathname, router]);

  return {
    hasAccess: user ? hasPageAccess(user.role, pathname || '') : false,
    user,
  };
}
