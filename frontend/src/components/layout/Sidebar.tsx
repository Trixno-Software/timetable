'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  GraduationCap,
  Users,
  BookOpen,
  Calendar,
  Clock,
  ClipboardList,
  FileSpreadsheet,
  Download,
  History,
  Settings,
  LogOut,
  Building,
  CalendarDays,
  UserCog,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore, hasRole, canManageSchools, canManageBranches } from '@/lib/store';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRole?: string;
}

const navigation: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Schools', href: '/schools', icon: Building2, requiredRole: 'super_admin' },
  { title: 'Branches', href: '/branches', icon: Building, requiredRole: 'school_admin' },
  { title: 'Users', href: '/users', icon: UserCog, requiredRole: 'branch_admin' },
  { title: 'Sessions', href: '/sessions', icon: CalendarDays, requiredRole: 'branch_admin' },
  { title: 'Grades', href: '/grades', icon: GraduationCap, requiredRole: 'coordinator' },
  { title: 'Sections', href: '/sections', icon: Users, requiredRole: 'coordinator' },
  { title: 'Subjects', href: '/subjects', icon: BookOpen, requiredRole: 'coordinator' },
  { title: 'Teachers', href: '/teachers', icon: Users, requiredRole: 'coordinator' },
  { title: 'Period Templates', href: '/period-templates', icon: Clock, requiredRole: 'coordinator' },
  { title: 'Assignments', href: '/assignments', icon: ClipboardList, requiredRole: 'coordinator' },
  { title: 'Timetables', href: '/timetables', icon: Calendar, requiredRole: 'teacher' },
  { title: 'Substitutions', href: '/substitutions', icon: FileSpreadsheet, requiredRole: 'coordinator' },
  { title: 'Exports', href: '/exports', icon: Download, requiredRole: 'teacher' },
  { title: 'Audit Logs', href: '/audit', icon: History, requiredRole: 'auditor' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = () => {
    clearAuth();
    window.location.href = '/login';
  };

  const filteredNavigation = navigation.filter((item) => {
    if (!item.requiredRole) return true;
    if (!user) return false;
    return hasRole(user.role, item.requiredRole as any);
  });

  return (
    <div className="flex h-screen w-64 flex-col bg-gray-900 text-white">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-gray-800">
        <h1 className="text-xl font-bold">Timetable</h1>
      </div>

      {/* User info */}
      {user && (
        <div className="border-b border-gray-800 p-4">
          <p className="font-medium truncate">{user.full_name}</p>
          <p className="text-sm text-gray-400 truncate">{user.email}</p>
          <span className="mt-1 inline-block rounded bg-primary-600 px-2 py-0.5 text-xs">
            {user.role.replace('_', ' ')}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom section */}
      <div className="border-t border-gray-800 p-4">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
        >
          <Settings className="h-5 w-5" />
          Settings
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </div>
  );
}
