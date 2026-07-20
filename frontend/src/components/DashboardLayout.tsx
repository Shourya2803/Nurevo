import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useClerk } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  Sparkles,
  LayoutDashboard,
  Users2,
  Settings as SettingsIcon,
  LogOut,
  User,
  ShieldCheck,
  FileText,
  Megaphone,
  ChevronDown,
  Bell,
  Building2,
  Menu,
  X
} from 'lucide-react';

export default function DashboardLayout() {
  const { user, workspace, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useClerk();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    logout();
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Teams', path: '/dashboard/teams', icon: Users2 },
    { name: 'Documents', path: '/dashboard/documents', icon: FileText },
    { name: 'Announcements', path: '/dashboard/announcements', icon: Megaphone },
    { name: 'Settings', path: '/dashboard/settings', icon: SettingsIcon },
  ];

  return (
    <div className="h-screen flex overflow-hidden bg-slate-50/80 relative">
      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileNavOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Panel (Responsive Drawer on Mobile, Fixed Sidebar on Desktop) */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-brand-950 text-white flex flex-col justify-between p-5 shrink-0 shadow-2xl transition-transform duration-300 md:translate-x-0 md:static md:z-20 h-screen overflow-hidden border-r border-brand-900/50 ${
        mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Background glow decoration */}
        <div className="absolute -top-20 -left-20 w-56 h-56 bg-brand-700/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-56 h-56 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-8 relative z-10">
          {/* Logo and Brand */}
          <div className="flex items-center justify-between pb-5 border-b border-brand-900/80">
            <Link 
              to="/dashboard" 
              onClick={() => setMobileNavOpen(false)}
              className="flex items-center gap-3 group"
            >
              <motion.div 
                whileHover={{ rotate: 12, scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-tr from-brand-700 to-brand-500 p-2.5 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-700/30 border border-brand-400/20"
              >
                <Sparkles className="h-5 w-5 text-white" />
              </motion.div>
              <div className="flex flex-col text-left">
                <span className="font-extrabold text-xl leading-none tracking-tight text-white group-hover:text-brand-200 transition-colors">
                  Nurevo
                </span>
                <span className="text-[10px] text-brand-300/80 mt-1 uppercase tracking-widest font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Enterprise Hub
                </span>
              </div>
            </Link>

            {/* Mobile Close Button */}
            <button
              onClick={() => setMobileNavOpen(false)}
              className="md:hidden p-1.5 text-brand-300 hover:text-white rounded-xl hover:bg-brand-900/60"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2 text-left">
            {navItems
              .filter((item) => !(item.name === 'Settings' && user?.role === 'member'))
              .map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link 
                    key={item.path} 
                    to={item.path} 
                    onClick={() => setMobileNavOpen(false)}
                    className="relative block"
                  >
                    <motion.div
                      whileHover={{ x: 3 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all relative ${
                        isActive
                          ? 'text-white bg-gradient-to-r from-brand-700 to-brand-800 shadow-md shadow-brand-700/25 border border-brand-600/30'
                          : 'text-brand-300 hover:text-white hover:bg-brand-900/40'
                      }`}
                    >
                      <Icon className={`h-5 w-5 shrink-0 transition-transform ${isActive ? 'text-brand-200 scale-110' : 'text-brand-400'}`} />
                      <span>{item.name}</span>

                      {isActive && (
                        <motion.div
                          layoutId="activeSideNav"
                          className="absolute right-2 w-1.5 h-5 bg-brand-300 rounded-full"
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                      )}
                    </motion.div>
                  </Link>
                );
              })}
          </nav>
        </div>

        {/* Sidebar Footer User Section */}
        <div className="space-y-4 pt-4 border-t border-brand-900/80 relative z-10 text-left">
          <div className="p-3 rounded-2xl bg-brand-900/40 border border-brand-800/40 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-700 to-brand-900 flex items-center justify-center text-white font-extrabold border border-brand-600/40 shadow-inner shrink-0">
                {user?.full_name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold truncate text-white">
                  {user?.full_name}
                </span>
                <span className="text-[9px] text-brand-300 uppercase tracking-wider flex items-center gap-1 mt-0.5 font-bold">
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                  {user?.role}
                </span>
              </div>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-red-200 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </motion.button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header navbar */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between shrink-0 sticky top-0 z-10 shadow-xs">
          <div className="flex items-center gap-3">
            {/* Hamburger Button for Mobile */}
            <button
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Open Navigation Menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 bg-brand-50/80 border border-brand-200/60 px-3 py-1.5 rounded-full shadow-2xs">
              <Building2 className="h-3.5 w-3.5 text-brand-700 shrink-0" />
              <span className="text-xs font-bold text-brand-900 truncate max-w-[120px] sm:max-w-none">
                {workspace?.name}
              </span>
            </div>
            <span className="text-slate-300 text-xs hidden sm:inline-block">/</span>
            <span className="text-xs text-slate-500 font-medium tracking-tight bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/60 hidden sm:inline-block truncate">
              {workspace?.slug}.nurevo.com
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Quick Notification Bell */}
            <motion.button 
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-xl text-slate-400 hover:text-brand-700 hover:bg-brand-50 transition-colors relative cursor-pointer"
            >
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-600" />
            </motion.button>

            <div className="h-5 w-px bg-slate-200" />

            {/* Profile Menu Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100/80 transition-colors cursor-pointer"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-slate-900 leading-tight">{user?.full_name}</p>
                  <p className="text-[10px] text-slate-500 font-medium">{user?.email}</p>
                </div>
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center shadow-2xs text-brand-800 font-bold text-sm shrink-0">
                  {user?.full_name?.[0]?.toUpperCase() || <User className="h-4 w-4 text-slate-600" />}
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 text-left"
                  >
                    <div className="p-3 border-b border-slate-100 mb-1">
                      <p className="text-xs font-bold text-slate-900">{user?.full_name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                      <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider bg-brand-50 text-brand-700 px-2 py-0.5 rounded-md">
                        Role: {user?.role}
                      </span>
                    </div>

                    <Link
                      to="/dashboard/settings"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-brand-700 transition-colors"
                    >
                      <SettingsIcon className="h-4 w-4" />
                      Workspace Settings
                    </Link>

                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 transition-colors mt-1"
                    >
                      <LogOut className="h-4 w-4" />
                      Log Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
