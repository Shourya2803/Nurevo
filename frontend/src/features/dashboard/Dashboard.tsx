import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
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
  Settings
} from 'lucide-react';
import { Link } from 'react-router-dom';

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

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. Welcoming Banner */}
      <div className="bg-gradient-to-r from-brand-950 to-brand-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-brand-700 rounded-full filter blur-[100px] opacity-20 transform translate-x-12 -translate-y-12"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] bg-brand-800 text-brand-100 font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
              {role === 'owner' && <Crown className="h-3 w-3 text-amber-400" />}
              {role === 'lead' && <UserCheck className="h-3 w-3 text-indigo-400" />}
              {role === 'member' && <Compass className="h-3 w-3 text-emerald-400" />}
              {role === 'owner' ? 'Workspace Owner / Admin' : role === 'lead' ? 'Team Lead Portal' : 'Workspace Member Portal'}
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white my-2">
              Welcome back, {user?.full_name}!
            </h1>
            <p className="text-brand-200 text-sm max-w-xl leading-relaxed">
              Managing secure workflows for <strong className="text-white">{workspace?.name}</strong>. Your tenant slug subdomain is <code className="bg-brand-900 px-2 py-0.5 rounded text-xs">{workspace?.slug}</code>.
            </p>
          </div>
          
          <div className="shrink-0 flex gap-3">
            {role === 'owner' && (
              <Link 
                to="/dashboard/settings" 
                className="bg-white/10 hover:bg-white/20 text-white font-semibold py-2.5 px-4 rounded-xl border border-white/10 text-xs flex items-center gap-1.5 transition-all"
              >
                Configure Settings
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            <Link 
              to="/dashboard/teams" 
              className="bg-brand-700 hover:bg-brand-800 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-brand-700/20"
            >
              Colleague Directory
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* 2. ROLE-BASED DASHBOARDS */}
      
      {/* ========================================================================= */}
      {/* OWNER (ADMIN) DASHBOARD */}
      {/* ========================================================================= */}
      {role === 'owner' && (
        <div className="space-y-8">
          {/* Admin Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border border-indigo-100 bg-white shadow-sm flex items-center justify-between transition-all hover:shadow-md">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Teams</p>
                <p className="text-3xl font-extrabold text-gray-900">{loading ? '...' : totalTeams}</p>
              </div>
              <div className="p-4 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Users className="h-6 w-6" />
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-emerald-100 bg-white shadow-sm flex items-center justify-between transition-all hover:shadow-md">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sign Up Restrictions</p>
                <p className="text-sm font-bold text-emerald-800 truncate mt-2">
                  {workspace?.settings?.allowed_domains?.length 
                    ? `${workspace.settings.allowed_domains.join(', ')}` 
                    : 'Any domain domain allowed'}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Shield className="h-6 w-6" />
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-amber-100 bg-white shadow-sm flex items-center justify-between transition-all hover:shadow-md">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Your Member ID</p>
                <p className="text-xs font-mono text-gray-600 bg-gray-50 p-1 rounded border mt-2 truncate w-44">
                  {user?.id}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                <Crown className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Admin Dashboard Core Consoles */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Administration actions */}
            <div className="lg:col-span-8 glass-card p-6 bg-white border border-gray-200/80">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <Building className="h-5 w-5 text-brand-700" />
                  Workspace Administration Console
                </h3>
              </div>
              
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  As the **Workspace Owner**, you are the exclusive administrator. You control settings,allowed register domains, brand styles, and have cascading permission to delete teams.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="border border-gray-200/80 rounded-xl p-4 space-y-2 hover:border-brand-300 transition-colors bg-brand-50/10">
                    <h4 className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                      <PlusCircle className="h-4.5 w-4.5 text-brand-700" />
                      Create Isolated Teams
                    </h4>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Partition your workspace directories by creating custom squads.
                    </p>
                    <Link to="/dashboard/teams" className="text-brand-700 text-xs font-semibold hover:underline inline-flex items-center gap-0.5 mt-2">
                      Go to Teams <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>

                  <div className="border border-gray-200/80 rounded-xl p-4 space-y-2 hover:border-brand-300 transition-colors bg-brand-50/10">
                    <h4 className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                      <Settings className="h-4.5 w-4.5 text-brand-700" />
                      Branding & Security
                    </h4>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Restrict register domains or configure the company brand palette.
                    </p>
                    <Link to="/dashboard/settings" className="text-brand-700 text-xs font-semibold hover:underline inline-flex items-center gap-0.5 mt-2">
                      Manage Settings <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* General audit log check */}
            <div className="lg:col-span-4 glass-card p-6 bg-white border border-gray-200/80">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-brand-700" />
                  Security Enforcements
                </h3>
              </div>
              <ul className="space-y-4 text-xs text-gray-600">
                <li className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  <span>Supabase Secure Private buckets active.</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  <span>Magic links secure email validation required.</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  <span>Workspace tenant boundary fully isolated.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LEAD DASHBOARD */}
      {/* ========================================================================= */}
      {role === 'lead' && (
        <div className="space-y-8">
          {/* Lead Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border border-indigo-100 bg-white shadow-sm flex items-center justify-between transition-all hover:shadow-md">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Teams Led By You</p>
                <p className="text-3xl font-extrabold text-gray-900">{loading ? '...' : leadTeams.length}</p>
              </div>
              <div className="p-4 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Crown className="h-6 w-6" />
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-emerald-100 bg-white shadow-sm flex items-center justify-between transition-all hover:shadow-md">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Teams Enrolled</p>
                <p className="text-3xl font-extrabold text-gray-900">{loading ? '...' : memberTeams.length}</p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Users className="h-6 w-6" />
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-amber-100 bg-white shadow-sm flex items-center justify-between transition-all hover:shadow-md">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Your Leader ID</p>
                <p className="text-xs font-mono text-gray-600 bg-gray-50 p-1 rounded border mt-2 truncate w-44">
                  {user?.id}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                <UserCheck className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Lead Dashboard Core Consoles */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Leadership tasks */}
            <div className="lg:col-span-8 glass-card p-6 bg-white border border-gray-200/80">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-indigo-700" />
                  Team Leadership Portal
                </h3>
              </div>
              
              <div className="space-y-5">
                <p className="text-sm text-gray-600">
                  You are designated as a **Team Lead**. You have permissions to author, modify, and review documents restricted to the teams you manage.
                </p>

                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Teams Managed By You:</h4>
                  {loading ? (
                    <p className="text-xs text-gray-400">Loading your teams...</p>
                  ) : leadTeams.length === 0 ? (
                    <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/60 text-xs text-amber-800">
                      You are not currently designated as a Team Lead for any squads. Ask the Workspace Owner to assign you.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {leadTeams.map((team) => (
                        <div key={team.id} className="border border-gray-200/80 rounded-xl p-4 hover:border-indigo-300 transition-all bg-gray-50/50">
                          <h5 className="font-bold text-gray-950 text-sm truncate">{team.name}</h5>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{team.description}</p>
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded">
                              {team.member_ids.length} members
                            </span>
                            <Link to="/dashboard/teams" className="text-xs text-brand-700 font-semibold hover:underline">
                              Manage Member Directory
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick reference guide */}
            <div className="lg:col-span-4 glass-card p-6 bg-white border border-gray-200/80">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-indigo-700" />
                  Lead Privileges
                </h3>
              </div>
              <ul className="space-y-4 text-xs text-gray-600">
                <li className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                  <span>Create/publish team documents.</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                  <span>Approve team member requests.</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                  <span>Access private team discussions.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MEMBER (EMPLOYEE) DASHBOARD */}
      {/* ========================================================================= */}
      {role === 'member' && (
        <div className="space-y-8">
          {/* Member Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border border-indigo-100 bg-white shadow-sm flex items-center justify-between transition-all hover:shadow-md">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Your Enrolled Teams</p>
                <p className="text-3xl font-extrabold text-gray-900">{loading ? '...' : memberTeams.length}</p>
              </div>
              <div className="p-4 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Users className="h-6 w-6" />
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-emerald-100 bg-white shadow-sm flex items-center justify-between transition-all hover:shadow-md">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Workspace Tenant ID</p>
                <p className="text-xs font-mono text-gray-700 bg-gray-50 p-1.5 rounded border mt-2 truncate w-44">
                  {workspace?.id}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Building className="h-6 w-6" />
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-amber-100 bg-white shadow-sm flex items-center justify-between transition-all hover:shadow-md">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Your Account ID</p>
                <p className="text-xs font-mono text-gray-600 bg-gray-50 p-1 rounded border mt-2 truncate w-44">
                  {user?.id}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                <Compass className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Member Dashboard Core Consoles */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Employee hub */}
            <div className="lg:col-span-8 glass-card p-6 bg-white border border-gray-200/80">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <Compass className="h-5 w-5 text-emerald-700" />
                  Employee Workspace Portal
                </h3>
              </div>
              
              <div className="space-y-5">
                <p className="text-sm text-gray-600">
                  You are a registered **Member** of this workspace. You can access public knowledge bases, create draft proposals, and collaborate with your assigned teams.
                </p>

                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Your Teams:</h4>
                  {loading ? (
                    <p className="text-xs text-gray-400">Loading your teams...</p>
                  ) : memberTeams.length === 0 ? (
                    <div className="p-4 rounded-xl bg-gray-50 border text-xs text-gray-500 italic">
                      You are not currently enrolled in any teams. Contact the Workspace Owner to assign you to a squad.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {memberTeams.map((team) => (
                        <div key={team.id} className="border border-gray-200/80 rounded-xl p-4 hover:border-emerald-300 transition-all bg-gray-50/50">
                          <h5 className="font-bold text-gray-950 text-sm truncate">{team.name}</h5>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{team.description}</p>
                          <div className="flex items-center justify-between mt-3 text-xs">
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded">
                              Enrolled
                            </span>
                            <span className="text-gray-400">
                              {team.member_ids.length} members
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick reference guide */}
            <div className="lg:col-span-4 glass-card p-6 bg-white border border-gray-200/80">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-700" />
                  Your Privileges
                </h3>
              </div>
              <ul className="space-y-4 text-xs text-gray-600">
                <li className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  <span>Browse public workspace boards.</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  <span>Submit draft documents.</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  <span>Send direct chat messages.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
