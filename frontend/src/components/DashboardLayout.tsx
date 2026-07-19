
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useClerk } from '@clerk/clerk-react';
import {
  Sparkles,
  LayoutDashboard,
  Users2,
  Settings as SettingsIcon,
  LogOut,
  User,
  ShieldCheck,
  FileText
} from 'lucide-react';

export default function DashboardLayout() {
  const { user, workspace, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useClerk();

  const handleLogout = async () => {
    await signOut();
    logout();
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Teams', path: '/dashboard/teams', icon: Users2 },
    { name: 'Documents', path: '/dashboard/documents', icon: FileText },
    { name: 'Settings', path: '/dashboard/settings', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen flex bg-gray-50/50">
      {/* Sidebar Panel */}
      <aside className="w-64 bg-brand-950 text-white flex flex-col justify-between p-6 shrink-0 shadow-xl relative z-10">
        <div className="space-y-8">
          {/* Logo and Brand */}
          <div className="flex items-center gap-2.5 pb-4 border-b border-brand-900">
            <div className="bg-brand-700 p-2 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="h-5 w-5 text-brand-100" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-none tracking-tight">Nurevo</span>
              <span className="text-[10px] text-brand-300 mt-1 uppercase tracking-widest font-semibold">
                SaaS Portal
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive
                      ? 'bg-brand-700 text-white shadow-md shadow-brand-700/10'
                      : 'text-brand-300 hover:text-white hover:bg-brand-900/50'
                    }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer User Section */}
        <div className="space-y-4 pt-4 border-t border-brand-900">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-800 flex items-center justify-center text-brand-100 font-bold border border-brand-700">
              {user?.full_name[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold truncate text-white">
                {user?.full_name}
              </span>
              <span className="text-[10px] text-brand-300 uppercase tracking-wider flex items-center gap-0.5 mt-0.5">
                <ShieldCheck className="h-3 w-3" />
                {user?.role}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold text-brand-300 hover:text-red-200 hover:bg-red-950/20 transition-all"
          >
            <LogOut className="h-5 w-5 text-brand-300" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header navbar */}
        <header className="h-16 bg-white border-b border-gray-200/80 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs bg-brand-100 text-brand-800 font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              {workspace?.name}
            </span>
            <span className="text-gray-300 text-xs">|</span>
            <span className="text-xs text-gray-500 font-medium tracking-tight">
              {workspace?.slug}.nurevo.com
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-bold text-gray-900">{user?.full_name}</p>
              <p className="text-[9px] text-gray-500 font-medium">{user?.email}</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
              <User className="h-4 w-4 text-gray-600" />
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
