import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileSpreadsheet,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types/assessment';
import { UserAvatar } from './DiagramStimulus';

interface NavItem {
  label: string;
  path: string;
  icon: React.FC<{ className?: string }>;
  roles: UserRole[];
}

const MAIN_NAV_ITEMS: NavItem[] = [
  {
    label: 'Beranda',
    path: '/dashboard',
    icon: LayoutDashboard,
    roles: ['superadmin', 'org_admin', 'instructor', 'participant'],
  },
  {
    label: 'Kegiatan Asesmen',
    path: '/activities',
    icon: ClipboardCheck,
    roles: ['superadmin', 'org_admin', 'instructor', 'participant'],
  },
  {
    label: 'Bank Soal',
    path: '/question-bank',
    icon: BookOpen,
    roles: ['superadmin', 'org_admin', 'instructor'],
  },
  {
    label: 'Peserta',
    path: '/participants',
    icon: Users,
    roles: ['superadmin', 'org_admin', 'instructor'],
  },
  {
    label: 'Kelompok atau Kelas',
    path: '/groups',
    icon: FolderKanban,
    roles: ['superadmin', 'org_admin', 'instructor'],
  },
  {
    label: 'Hasil dan Analitik',
    path: '/results',
    icon: BarChart3,
    roles: ['superadmin', 'org_admin', 'instructor', 'participant'],
  },
  {
    label: 'Laporan',
    path: '/reports',
    icon: FileSpreadsheet,
    roles: ['superadmin', 'org_admin', 'instructor'],
  },
  {
    label: 'Pengaturan',
    path: '/settings',
    icon: Settings,
    roles: ['superadmin', 'org_admin', 'instructor', 'participant'],
  },
];

const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    label: 'Pengguna & Hak Akses',
    path: '/admin/users',
    icon: UserCheck,
    roles: ['superadmin', 'org_admin'],
  },
  {
    label: 'Organisasi',
    path: '/admin/organizations',
    icon: Building2,
    roles: ['superadmin'],
  },
  {
    label: 'Audit Log Sistem',
    path: '/admin/audit-logs',
    icon: ShieldCheck,
    roles: ['superadmin', 'org_admin'],
  },
];

export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Superadmin',
  org_admin: 'Admin Organisasi',
  instructor: 'Instruktur',
  participant: 'Peserta',
};

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    currentUser,
    notifications,
    toasts,
    dismissToast,
    globalSearch,
    setGlobalSearch,
    switchRoleDemo,
    logout,
    markAllNotificationsRead,
  } = useApp();

  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const visibleMainNav = MAIN_NAV_ITEMS.filter((item) =>
    item.roles.includes(currentUser.role)
  );
  const visibleAdminNav = ADMIN_NAV_ITEMS.filter((item) =>
    item.roles.includes(currentUser.role)
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const isActivePath = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard' || location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const handleGlobalSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (location.pathname !== '/activities' && location.pathname !== '/question-bank') {
      navigate('/activities');
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F8F9F7] text-[#111C2D]">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`no-print fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-[#E2E8F0] transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full'
        } ${collapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#E2E8F0]">
          <Link
            to="/dashboard"
            className="flex items-center gap-2.5 text-[#111C2D] font-display font-bold tracking-tight whitespace-nowrap shrink-0"
          >
            <div className="w-9 h-9 rounded-lg bg-[#4A7C59] text-white flex items-center justify-center font-bold text-base shrink-0">
              A
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-base leading-tight font-bold text-[#111C2D]">
                  ASESMEN-ASKIA
                </span>
                <span className="text-[11px] font-normal text-slate-500">
                  Satu Platform, Semua Asesmen
                </span>
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 text-slate-500 hover:text-slate-800 lg:hidden"
            aria-label="Tutup navigasi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6" aria-label="Menu Utama">
          <div className="space-y-1">
            {!collapsed && (
              <div className="px-3 pb-1.5 text-[11px] font-medium text-slate-400">
                Menu Utama
              </div>
            )}
            {visibleMainNav.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#EEF4F0] text-[#3D6849] font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-[#111C2D]'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#4A7C59]' : 'text-slate-500'}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>

          {visibleAdminNav.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-[#E2E8F0]">
              {!collapsed && (
                <div className="px-3 pb-1.5 text-[11px] font-medium text-slate-400">
                  Tata Kelola &amp; Admin
                </div>
              )}
              {visibleAdminNav.map((item) => {
                const Icon = item.icon;
                const active = isActivePath(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[#EEF4F0] text-[#3D6849] font-semibold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-[#111C2D]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#4A7C59]' : 'text-slate-500'}`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        {/* Sidebar Footer: Collapse button */}
        <div className="p-3 border-t border-[#E2E8F0] hidden lg:flex items-center justify-between">
          {!collapsed && (
            <span className="text-xs text-slate-500 truncate px-2">
              {currentUser.organizationName.replace(' [DATA DEMO]', '')}
            </span>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-[#111C2D] transition-colors ml-auto"
            aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="no-print h-16 bg-white border-b border-[#E2E8F0] px-4 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          {/* Left: Mobile Menu Trigger + Global Search */}
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Buka menu navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>

            <form onSubmit={handleGlobalSearchSubmit} className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Cari kegiatan asesmen, bank soal, atau kode akses..."
                aria-label="Kolom pencarian global"
                className="w-full pl-9 pr-4 py-1.5 text-sm bg-[#F8F9F7] border border-[#E2E8F0] rounded-lg text-[#111C2D] placeholder:text-slate-400 focus:outline-none focus:border-[#4A7C59] focus:bg-white transition-colors"
              />
            </form>
          </div>

          {/* Right: Role Switcher (Demo RBAC), Notifications, Profile */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Role Selector for testing all 4 required RBAC roles */}
            <div className="hidden md:flex items-center gap-1 bg-[#F8F9F7] p-1 rounded-lg border border-[#E2E8F0]">
              {(
                [
                  { role: 'instructor', label: 'Instruktur' },
                  { role: 'participant', label: 'Peserta' },
                  { role: 'org_admin', label: 'Admin Org' },
                  { role: 'superadmin', label: 'Superadmin' },
                ] as { role: UserRole; label: string }[]
              ).map((r) => (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => switchRoleDemo(r.role)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    currentUser.role === r.role
                      ? 'bg-[#4A7C59] text-white'
                      : 'text-slate-600 hover:text-[#111C2D]'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Notification Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((o) => !o);
                  setProfileMenuOpen(false);
                }}
                aria-label="Notifikasi"
                className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#D97706] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-[#E2E8F0] shadow-lg p-4 z-50">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                    <span className="text-sm font-semibold text-[#111C2D]">Notifikasi</span>
                    <button
                      type="button"
                      onClick={markAllNotificationsRead}
                      className="text-xs text-[#4A7C59] hover:underline"
                    >
                      Tandai semua dibaca
                    </button>
                  </div>
                  <div className="divide-y divide-[#E2E8F0] max-h-64 overflow-y-auto">
                    {notifications.map((n) => (
                      <div key={n.id} className="py-3 text-xs space-y-1">
                        <div className="font-semibold text-[#111C2D]">{n.title}</div>
                        <p className="text-slate-600 leading-relaxed">{n.message}</p>
                        {n.linkTo && (
                          <button
                            type="button"
                            onClick={() => {
                              setNotifOpen(false);
                              navigate(n.linkTo!);
                            }}
                            className="text-[#4A7C59] font-medium hover:underline pt-1"
                          >
                            Buka Halaman →
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen((o) => !o);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2.5 pl-2 pr-1 py-1 rounded-lg hover:bg-slate-100 transition-colors text-left"
              >
                <UserAvatar name={currentUser.fullName} avatarUrl={currentUser.avatarUrl} size="sm" />
                <div className="hidden sm:block">
                  <div className="text-xs font-semibold text-[#111C2D] leading-tight truncate max-w-[140px]">
                    {currentUser.fullName}
                  </div>
                  <div className="text-[11px] text-slate-500 leading-tight">
                    {ROLE_LABELS[currentUser.role]}
                  </div>
                </div>
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl border border-[#E2E8F0] shadow-lg py-2 z-50">
                  <div className="px-4 py-2.5 border-b border-[#E2E8F0]">
                    <div className="text-xs font-semibold text-[#111C2D]">{currentUser.fullName}</div>
                    <div className="text-xs text-slate-500 truncate">{currentUser.email}</div>
                    <div className="text-[11px] text-[#4A7C59] font-medium mt-1">
                      Peran: {ROLE_LABELS[currentUser.role]}
                    </div>
                  </div>
                  <div className="py-1">
                    <Link
                      to="/profile"
                      onClick={() => setProfileMenuOpen(false)}
                      className="block px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      Profil Akun
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setProfileMenuOpen(false)}
                      className="block px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      Pengaturan &amp; Keamanan
                    </Link>
                    <Link
                      to="/login"
                      onClick={() => setProfileMenuOpen(false)}
                      className="block px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      Ganti Akun / Halaman Login
                    </Link>
                  </div>
                  <div className="border-t border-[#E2E8F0] pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        logout();
                        navigate('/login');
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-[#DC2626] hover:bg-red-50 flex items-center gap-2 font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Keluar (Logout)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>

        {/* Quiet Footer */}
        <footer className="no-print py-4 px-8 border-t border-[#E2E8F0] text-xs text-slate-500 flex flex-wrap items-center justify-between gap-4 bg-white">
          <div>
            ASESMEN-ASKIA — Platform Asesmen Digital Universal · Satu Platform, Semua Asesmen
          </div>
          <div className="flex items-center gap-4">
            <Link to="/join/POST-BIO-26" className="hover:text-[#111C2D] transition-colors">
              Akses Cepat Kode Ujian
            </Link>
            <span>·</span>
            <Link to="/results" className="hover:text-[#111C2D] transition-colors">
              Analitik Pretest &amp; Posttest
            </Link>
          </div>
        </footer>
      </div>

      {/* Toast Notification Stack */}
      {toasts.length > 0 && (
        <div className="no-print fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-md flex items-start justify-between gap-3"
              role="status"
            >
              <div className="space-y-0.5">
                <div
                  className={`text-xs font-semibold ${
                    t.type === 'success'
                      ? 'text-[#16A34A]'
                      : t.type === 'warning'
                      ? 'text-[#D97706]'
                      : 'text-[#DC2626]'
                  }`}
                >
                  {t.type === 'success' ? 'Berhasil' : t.type === 'warning' ? 'Perhatian' : 'Kesalahan'} — {t.title}
                </div>
                {t.detail && <p className="text-xs text-slate-600">{t.detail}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                className="text-slate-400 hover:text-slate-700 text-xs"
                aria-label="Tutup notifikasi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
