import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
import { motion } from 'framer-motion';
import {
  Building,
  Users,
  Shield,
  Crown,
  UserCheck,
  Compass,
  ArrowRight,
  PlusCircle,
  HelpCircle,
  FileText,
  ChevronRight,
  Settings,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SkeletonMetrics, SkeletonCardGrid } from '../../components/ui/Skeleton';

interface Team {
  id: string;
  name: string;
  description: string;
  member_ids: string[];
  team_lead_id: string | null;
}

export default function Dashboard() {
  const { user, workspace } = useAuthStore();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await api.get('/teams');
        setTeams(response.data);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeams();
  }, []);

  const role = user?.role || 'member';

  // Calculations for stats
  const totalTeams = teams.length;
  const leadTeams = teams.filter(t => t.team_lead_id === user?.id);
  const memberTeams = teams.filter(t => t.member_ids.includes(user?.id || ''));

  const containerVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8 text-left"
    >
      {/* 1. Welcoming Banner */}
      <motion.div
        variants={itemVariants}
        className="bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden border border-brand-800/40"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-600/20 rounded-full blur-3xl pointer-events-none transform translate-x-12 -translate-y-12 animate-pulse-glow" />
        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-bold tracking-wider uppercase">
              {role === 'owner' && <Crown className="h-3.5 w-3.5 text-amber-400" />}
              {role === 'lead' && <UserCheck className="h-3.5 w-3.5 text-indigo-300" />}
              {role === 'member' && <Compass className="h-3.5 w-3.5 text-emerald-300" />}
              <span>{role === 'owner' ? 'Workspace Admin Console' : role === 'lead' ? 'Team Leadership Hub' : 'Member Workspace'}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Welcome <span className="bg-gradient-to-r from-white via-brand-100 to-brand-200 bg-clip-text text-transparent">{user?.full_name}</span>!
            </h1>

            <p className="text-brand-200/90 text-sm max-w-xl leading-relaxed font-normal">
              Managing enterprise security & team operations for <strong className="text-white font-semibold">{workspace?.name}</strong>. Tenant domain: <code className="bg-brand-900/80 border border-brand-700/50 px-2.5 py-0.5 rounded-md text-xs font-mono text-brand-100">{workspace?.slug}.nurevo.com</code>
            </p>
          </div>

          <div className="shrink-0 flex flex-wrap gap-3">
            {role === 'owner' && (
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Link
                  to="/dashboard/settings"
                  className="bg-white/10 hover:bg-white/20 text-white font-semibold py-2.5 px-4 rounded-xl border border-white/15 text-xs flex items-center gap-2 transition-all backdrop-blur-sm shadow-md"
                >
                  <Settings className="h-4 w-4 text-brand-200" />
                  Settings
                </Link>
              </motion.div>
            )}
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              <Link
                to="/dashboard/teams"
                className="bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center gap-2 transition-all shadow-xl shadow-brand-900/40 border border-brand-500/30"
              >
                Colleague Directory
                <ChevronRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* 2. SKELETON OR ROLE-BASED DASHBOARD CONTENT */}
      {loading ? (
        <div className="space-y-8">
          <SkeletonMetrics />
          <SkeletonCardGrid count={3} />
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* OWNER (ADMIN) DASHBOARD */}
          {/* ========================================================================= */}
          {role === 'owner' && (
            <motion.div variants={itemVariants} className="space-y-8">
              {/* Admin Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div
                  whileHover={{ y: -4, scale: 1.01 }}
                  className="p-6 rounded-2xl border border-slate-200/80 bg-white shadow-sm hover:shadow-xl hover:border-brand-300 transition-all flex items-center justify-between group"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Active Teams</p>
                    <p className="text-3xl font-extrabold text-slate-900 group-hover:text-brand-700 transition-colors">{totalTeams}</p>
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <Zap className="h-3 w-3" /> Fully Synced
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-brand-50 text-brand-700 border border-brand-100 group-hover:scale-110 transition-transform shadow-xs">
                    <Users className="h-6 w-6" />
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ y: -4, scale: 1.01 }}
                  className="p-6 rounded-2xl border border-slate-200/80 bg-white shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all flex items-center justify-between group"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registration Policy</p>
                    <p className="text-sm font-extrabold text-slate-800 truncate mt-1 max-w-[200px]">
                      {workspace?.settings?.allowed_domains?.length
                        ? workspace.settings.allowed_domains.join(', ')
                        : 'Open Domain Access'}
                    </p>
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <Shield className="h-3 w-3" /> Domain Enforcement
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 group-hover:scale-110 transition-transform shadow-xs">
                    <Shield className="h-6 w-6" />
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ y: -4, scale: 1.01 }}
                  className="p-6 rounded-2xl border border-slate-200/80 bg-white shadow-sm hover:shadow-xl hover:border-amber-300 transition-all flex items-center justify-between group"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Admin User ID</p>
                    <p className="text-xs font-mono font-bold text-slate-700 bg-slate-100/80 px-2 py-1 rounded-lg border border-slate-200/80 mt-1 truncate max-w-[180px]">
                      {user?.id}
                    </p>
                    <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                      <Crown className="h-3 w-3" /> Full Root Admin
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-50 text-amber-700 border border-amber-100 group-hover:scale-110 transition-transform shadow-xs">
                    <Crown className="h-6 w-6" />
                  </div>
                </motion.div>
              </div>

              {/* Admin Dashboard Core Consoles */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Administration actions */}
                <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                    <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2.5">
                      <Building className="h-5 w-5 text-brand-700" />
                      Workspace Administrative Controls
                    </h3>
                    <span className="text-xs text-brand-700 font-semibold bg-brand-50 px-2.5 py-1 rounded-full border border-brand-100">
                      Owner Privileges
                    </span>
                  </div>

                  <div className="space-y-5">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      As the Workspace Owner, you possess master privileges to manage squad security, invite workspace members, enforce domain registration constraints, and manage sensitive assets.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <motion.div
                        whileHover={{ y: -2 }}
                        className="border border-slate-200/90 rounded-2xl p-5 space-y-2.5 bg-slate-50/50 hover:bg-white hover:border-brand-300 hover:shadow-md transition-all"
                      >
                        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-brand-100 text-brand-700">
                            <PlusCircle className="h-4 w-4" />
                          </div>
                          Manage Isolated Squads
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Partition team members into isolated namespaces with delegated leads.
                        </p>
                        <Link to="/dashboard/teams" className="text-brand-700 text-xs font-bold hover:underline inline-flex items-center gap-1 mt-2">
                          Go to Squads <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </motion.div>

                      <motion.div
                        whileHover={{ y: -2 }}
                        className="border border-slate-200/90 rounded-2xl p-5 space-y-2.5 bg-slate-50/50 hover:bg-white hover:border-brand-300 hover:shadow-md transition-all"
                      >
                        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-brand-100 text-brand-700">
                            <Settings className="h-4 w-4" />
                          </div>
                          Branding & Security Rules
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Restrict sign-up domains, configure API keys, and update workspace details.
                        </p>
                        <Link to="/dashboard/settings" className="text-brand-700 text-xs font-bold hover:underline inline-flex items-center gap-1 mt-2">
                          Open Settings <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </motion.div>
                    </div>
                  </div>
                </div>

                {/* Security Status Box */}
                <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                    <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                      <Shield className="h-5 w-5 text-emerald-600" />
                      Security Audit
                    </h3>
                  </div>
                  <ul className="space-y-4 text-xs text-slate-600 font-medium">
                    <li className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>Supabase RBAC rules enforced</span>
                    </li>
                    <li className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>Multi-tenant isolation active</span>
                    </li>
                    <li className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>Encrypted Document Buckets</span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* LEAD DASHBOARD */}
          {/* ========================================================================= */}
          {role === 'lead' && (
            <motion.div variants={itemVariants} className="space-y-8">
              {/* Lead Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div whileHover={{ y: -4, scale: 1.01 }} className="p-6 rounded-2xl border border-indigo-100 bg-white shadow-sm flex items-center justify-between transition-all hover:shadow-xl">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Teams Managed</p>
                    <p className="text-3xl font-extrabold text-slate-900">{leadTeams.length}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                    <Crown className="h-6 w-6" />
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -4, scale: 1.01 }} className="p-6 rounded-2xl border border-emerald-100 bg-white shadow-sm flex items-center justify-between transition-all hover:shadow-xl">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Squad Enrolments</p>
                    <p className="text-3xl font-extrabold text-slate-900">{memberTeams.length}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <Users className="h-6 w-6" />
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -4, scale: 1.01 }} className="p-6 rounded-2xl border border-amber-100 bg-white shadow-sm flex items-center justify-between transition-all hover:shadow-xl">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lead Member ID</p>
                    <p className="text-xs font-mono font-bold text-slate-700 bg-slate-100 p-1.5 rounded-lg border border-slate-200 mt-1 truncate max-w-[180px]">
                      {user?.id}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-50 text-amber-700 border border-amber-100">
                    <UserCheck className="h-6 w-6" />
                  </div>
                </motion.div>
              </div>

              {/* Lead Dashboard Core Consoles */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                    <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-indigo-700" />
                      Team Leadership Portal
                    </h3>
                  </div>

                  <div className="space-y-5">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      You are designated as a <strong className="text-slate-900">Team Lead</strong>. You have authoring, approval, and document review privileges for your squad.
                    </p>

                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Teams Managed By You:</h4>
                      {leadTeams.length === 0 ? (
                        <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/60 text-xs text-amber-800">
                          You are not currently assigned as lead for any squad. Contact workspace admin to assign lead roles.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {leadTeams.map((team) => (
                            <motion.div key={team.id} whileHover={{ y: -2 }} className="border border-slate-200/80 rounded-2xl p-4 hover:border-indigo-300 transition-all bg-slate-50/50">
                              <h5 className="font-bold text-slate-900 text-sm truncate">{team.name}</h5>
                              <p className="text-xs text-slate-500 mt-1 line-clamp-1">{team.description}</p>
                              <div className="flex items-center justify-between mt-3">
                                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full border border-indigo-100">
                                  {team.member_ids.length} members
                                </span>
                                <Link to={`/dashboard/teams/${team.id}`} className="text-xs text-brand-700 font-bold hover:underline">
                                  Open Team
                                </Link>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                    <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                      <HelpCircle className="h-5 w-5 text-indigo-700" />
                      Lead Privileges
                    </h3>
                  </div>
                  <ul className="space-y-4 text-xs text-slate-600 font-medium">
                    <li className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0" />
                      <span>Review & Approve Document Submissions</span>
                    </li>
                    <li className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0" />
                      <span>Manage squad member directory</span>
                    </li>
                    <li className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0" />
                      <span>Publish private team knowledge base</span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* MEMBER DASHBOARD */}
          {/* ========================================================================= */}
          {role === 'member' && (
            <motion.div variants={itemVariants} className="space-y-8">
              {/* Member Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div whileHover={{ y: -4, scale: 1.01 }} className="p-6 rounded-2xl border border-indigo-100 bg-white shadow-sm flex items-center justify-between transition-all hover:shadow-xl">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Enrolled Teams</p>
                    <p className="text-3xl font-extrabold text-slate-900">{memberTeams.length}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                    <Users className="h-6 w-6" />
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -4, scale: 1.01 }} className="p-6 rounded-2xl border border-emerald-100 bg-white shadow-sm flex items-center justify-between transition-all hover:shadow-xl">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tenant ID</p>
                    <p className="text-xs font-mono font-bold text-slate-700 bg-slate-100 p-1.5 rounded-lg border border-slate-200 mt-1 truncate max-w-[180px]">
                      {workspace?.id}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <Building className="h-6 w-6" />
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -4, scale: 1.01 }} className="p-6 rounded-2xl border border-amber-100 bg-white shadow-sm flex items-center justify-between transition-all hover:shadow-xl">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account ID</p>
                    <p className="text-xs font-mono font-bold text-slate-700 bg-slate-100 p-1 rounded-lg border border-slate-200 mt-1 truncate max-w-[180px]">
                      {user?.id}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-50 text-amber-700 border border-amber-100">
                    <Compass className="h-6 w-6" />
                  </div>
                </motion.div>
              </div>

              {/* Member Dashboard Core Consoles */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                    <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                      <Compass className="h-5 w-5 text-emerald-600" />
                      Member Workspace Portal
                    </h3>
                  </div>

                  <div className="space-y-5">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      You are a registered <strong className="text-slate-900">Workspace Member</strong>. Access approved knowledge resources, upload draft documents, and view assigned squads.
                    </p>

                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Your Enrolled Teams:</h4>
                      {memberTeams.length === 0 ? (
                        <div className="p-4 rounded-2xl bg-slate-50 border text-xs text-slate-500 italic">
                          You are not enrolled in any squad yet. Ask workspace admin to assign you to a squad.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {memberTeams.map((team) => (
                            <motion.div key={team.id} whileHover={{ y: -2 }} className="border border-slate-200/80 rounded-2xl p-4 hover:border-emerald-300 transition-all bg-slate-50/50">
                              <h5 className="font-bold text-slate-900 text-sm truncate">{team.name}</h5>
                              <p className="text-xs text-slate-500 mt-1 line-clamp-1">{team.description}</p>
                              <div className="flex items-center justify-between mt-3 text-xs">
                                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2.5 py-0.5 rounded-full border border-emerald-100">
                                  Enrolled Member
                                </span>
                                <span className="text-slate-400 font-medium">
                                  {team.member_ids.length} members
                                </span>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                    <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-emerald-600" />
                      Quick Resources
                    </h3>
                  </div>
                  <ul className="space-y-4 text-xs text-slate-600 font-medium">
                    <li className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>Browse Public Knowledge Base</span>
                    </li>
                    <li className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>Submit Document Proposals</span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
