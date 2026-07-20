import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { SkeletonCardGrid, SkeletonTable } from '../../components/ui/Skeleton';
import { 
  Users, 
  Plus, 
  Trash2, 
  UserPlus, 
  Crown, 
  Loader2, 
  X,
  UserMinus,
  Mail,
  ShieldAlert,
  Search,
  Eye
} from 'lucide-react';

interface Team {
  id: string;
  name: string;
  description: string;
  workspace_id: string;
  member_ids: string[];
  lead_ids?: string[];
  team_lead_id: string | null;
}

interface Member {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

export default function Teams() {
  const { user, workspace } = useAuthStore();
  const navigate = useNavigate();
  const isOwner = user?.role === 'owner';

  const [activeTab, setActiveTab] = useState<'teams' | 'members'>('teams');
  
  // Teams State
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Team Member Management States
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [actionUserId, setActionUserId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Directory Members State
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteTeamId, setInviteTeamId] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  // Pagination State
  const [teamsPage, setTeamsPage] = useState(1);
  const [membersPage, setMembersPage] = useState(1);

  // Role modification state
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [newRole, setNewRole] = useState('member');
  const [newStatus, setNewStatus] = useState('active');
  const [updateLoading, setUpdateLoading] = useState(false);

  // Custom Deletion Confirmation State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: 'team' | 'member' | 'remove_member';
    id: string;
    name: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  // Reset pagination on filter or search changes
  useEffect(() => {
    setMembersPage(1);
  }, [searchTerm, selectedTeamFilter]);

  useEffect(() => {
    setTeamsPage(1);
  }, [activeTab]);

  const fetchTeams = async () => {
    try {
      const response = await api.get('/teams');
      setTeams(response.data);
    } catch (err) {
      console.error('Failed to load teams:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    if (!workspace?.id) return;
    setMembersLoading(true);
    try {
      const response = await api.get(`/workspaces/${workspace.id}/members`);
      setMembers(response.data);
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => {
    if (workspace?.id) {
      fetchTeams();
      fetchMembers();
    }
  }, [workspace?.id]);

  useEffect(() => {
    if (workspace?.id) {
      fetchTeams();
      fetchMembers();
    }
  }, [activeTab, workspace?.id]);

  const handleCreateTeam = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreateLoading(true);
    try {
      await api.post('/teams', { name, description });
      toast.success(`Team "${name}" created successfully!`);
      setName('');
      setDescription('');
      setShowCreateModal(false);
      fetchTeams();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create team.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteTeam = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    setDeleteConfirmation({
      type: 'team',
      id: teamId,
      name: team.name,
      onConfirm: async () => {
        try {
          await api.delete(`/teams/${teamId}`);
          toast.success(`Team "${team.name}" has been deleted.`);
          fetchTeams();
        } catch (err: any) {
          toast.error(err.response?.data?.detail || 'Failed to delete team.');
        }
      }
    });
  };

  const handleAddMember = async () => {
    if (!selectedTeamId || !actionUserId.trim()) return;
    setActionLoading(true);
    try {
      await api.post(`/teams/${selectedTeamId}/members`, { user_id: actionUserId });
      toast.success('Member successfully added to team!');
      setActionUserId('');
      fetchTeams();
      fetchMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to add member.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignLead = async () => {
    if (!selectedTeamId || !actionUserId.trim()) return;
    setActionLoading(true);
    try {
      await api.post(`/teams/${selectedTeamId}/lead`, { team_lead_id: actionUserId });
      toast.success('Team lead successfully assigned!');
      setActionUserId('');
      fetchTeams();
      fetchMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to assign team lead.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = (teamId: string, memberId: string) => {
    const mInfo = members.find(m => m.id === memberId);
    const memberName = mInfo?.full_name || `ID: ${memberId}`;

    setDeleteConfirmation({
      type: 'remove_member',
      id: memberId,
      name: memberName,
      onConfirm: async () => {
        try {
          await api.post(`/teams/${teamId}/members/remove`, { user_id: memberId });
          toast.success('Member removed from team.');
          fetchTeams();
          fetchMembers();
        } catch (err: any) {
          toast.error(err.response?.data?.detail || 'Failed to remove member.');
        }
      }
    });
  };

  const handleDeleteMember = (memberId: string, fullName: string) => {
    if (!workspace?.id) return;
    setDeleteConfirmation({
      type: 'member',
      id: memberId,
      name: fullName,
      onConfirm: async () => {
        try {
          await api.delete(`/workspaces/${workspace.id}/members/${memberId}`);
          toast.success(`Member "${fullName}" has been removed from workspace.`);
          fetchMembers();
        } catch (err: any) {
          toast.error(err.response?.data?.detail || 'Failed to remove member.');
        }
      }
    });
  };

  const handleInviteMember = async (e: FormEvent) => {
    e.preventDefault();
    if (!workspace?.id || !inviteEmail.trim() || !inviteName.trim()) return;
    setInviteLoading(true);
    try {
      await api.post(`/workspaces/${workspace.id}/invitations`, {
        email: inviteEmail,
        full_name: inviteName,
        role: inviteRole,
        team_id: inviteTeamId || null
      });
      toast.success(`Invitation link generated and saved for "${inviteName}"!`);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('member');
      setInviteTeamId('');
      setShowInviteModal(false);
      fetchMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to invite member.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleUpdateRole = async (e: FormEvent) => {
    e.preventDefault();
    if (!workspace?.id || !editingMember) return;
    setUpdateLoading(true);
    try {
      await api.patch(`/workspaces/${workspace.id}/members/${editingMember.id}/role`, {
        role: newRole,
        status: newStatus
      });
      toast.success('Member permissions updated successfully!');
      setEditingMember(null);
      fetchMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update member.');
    } finally {
      setUpdateLoading(false);
    }
  };

  const getSelectedTeam = () => teams.find(t => t.id === selectedTeamId);

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Workspace Directory</h2>
          <p className="text-gray-500 text-sm mt-1">
            Manage teams, add workspace members, send secure invites, and configure authorization roles.
          </p>
        </div>
        
        {isOwner && (
          <div className="flex gap-2">
            {activeTab === 'teams' ? (
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 10px 15px -3px rgba(111, 78, 55, 0.25)' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-brand-700 to-brand-800 hover:from-brand-800 hover:to-brand-900 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md flex items-center gap-1.5 transition-all text-sm shrink-0 cursor-pointer border border-brand-600/30"
              >
                <Plus className="h-4.5 w-4.5" />
                Create Team
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 10px 15px -3px rgba(111, 78, 55, 0.25)' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowInviteModal(true)}
                className="bg-gradient-to-r from-brand-700 to-brand-800 hover:from-brand-800 hover:to-brand-900 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md flex items-center gap-1.5 transition-all text-sm shrink-0 cursor-pointer border border-brand-600/30"
              >
                <UserPlus className="h-4.5 w-4.5" />
                Invite Member
              </motion.button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 relative">
        <button
          onClick={() => setActiveTab('teams')}
          className={`pb-3 text-sm font-semibold px-4 transition-all uppercase tracking-wider relative cursor-pointer ${
            activeTab === 'teams' 
              ? 'text-brand-800' 
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          Teams & Squads
          {activeTab === 'teams' && (
            <motion.div
              layoutId="teamTabUnderline"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-700 rounded-full"
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            />
          )}
        </button>
        {user?.role === 'owner' && (
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-3 text-sm font-semibold px-4 transition-all uppercase tracking-wider relative cursor-pointer ${
              activeTab === 'members' 
                ? 'text-brand-800' 
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            All Members ({activeTab === 'members' ? members.length : '...'})
            {activeTab === 'members' && (
              <motion.div
                layoutId="teamTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-700 rounded-full"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
            )}
          </button>
        )}
      </div>

      {/* ======================= TAB 1: TEAMS ======================= */}
      {activeTab === 'teams' && (
        <>
          {loading ? (
            <SkeletonCardGrid count={6} />
          ) : teams.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card text-center p-12 border border-gray-200/80 rounded-3xl"
            >
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="font-bold text-gray-800 text-lg">No teams found</h3>
              <p className="text-gray-500 text-xs mt-1 max-w-sm mx-auto">
                Get started by creating your first workspace team. Teams isolate knowledge boards and message channels.
              </p>
            </motion.div>
          ) : (
            <div className="space-y-6">
              <motion.div 
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
                }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {teams.slice((teamsPage - 1) * 9, teamsPage * 9).map((team) => (
                  <motion.div 
                    key={team.id}
                    variants={{
                      hidden: { opacity: 0, y: 15 },
                      visible: { opacity: 1, y: 0 }
                    }}
                    whileHover={{ y: -6, scale: 1.015, boxShadow: '0 20px 30px -10px rgba(111, 78, 55, 0.15)' }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:border-brand-400 transition-all group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-2xl group-hover:bg-brand-500/15 transition-all pointer-events-none" />

                    <div className="space-y-3 relative z-10">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border border-brand-100/60 shadow-2xs group-hover:bg-brand-100 transition-colors">
                          {team.member_ids.length} members
                        </span>
                        {isOwner && (
                          <motion.button
                            whileHover={{ scale: 1.2, rotate: 12 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTeam(team.id);
                            }}
                            className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer p-1 rounded-lg hover:bg-red-50"
                            title="Delete Team"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </motion.button>
                        )}
                      </div>

                      <div className="space-y-1">
                        <h3
                          onClick={() => navigate(`/dashboard/teams/${team.id}`)}
                          className="font-extrabold text-gray-900 text-lg leading-tight group-hover:text-brand-700 transition-colors cursor-pointer"
                        >
                          {team.name}
                        </h3>
                        <p className="text-gray-500 text-xs leading-relaxed line-clamp-2 font-normal">
                          {team.description || 'No description provided.'}
                        </p>
                      </div>

                      <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-100 space-y-1.5 group-hover:bg-slate-100/60 transition-colors">
                        <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">Team Leads</p>
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {(() => {
                            const leads = team.lead_ids || [];
                            const allLeads = [...(team.team_lead_id ? [team.team_lead_id] : []), ...leads];
                            const uniqueLeads = Array.from(new Set(allLeads));

                            if (uniqueLeads.length === 0) {
                              return <span className="text-xs text-gray-400 italic">Unassigned</span>;
                            }

                            return uniqueLeads.map((id) => {
                              const leadName = members.find((m) => m.id === id)?.full_name || `ID: ${id.slice(-6)}`;
                              const isCurrentUser = id === user?.id;
                              return (
                                <span key={id} className="flex items-center gap-1">
                                  <span className="text-xs font-bold text-gray-800">{leadName}</span>
                                  {isCurrentUser && (
                                    <span className="bg-brand-50 text-brand-700 border border-brand-200 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide">You</span>
                                  )}
                                </span>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    </div>

                    <div className="pt-5 mt-5 border-t border-slate-100 flex items-center gap-2 relative z-10">
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => navigate(`/dashboard/teams/${team.id}`)}
                        className="flex-1 bg-brand-700 hover:bg-brand-800 text-white font-semibold py-2.5 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-brand-700/20"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Click to Open
                      </motion.button>

                      {user?.role === 'owner' && (
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => {
                            setSelectedTeamId(team.id);
                            setShowManageModal(true);
                          }}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-semibold py-2.5 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Users className="h-3.5 w-3.5" />
                          Manage Members
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Teams Pagination Controls */}
              {Math.ceil(teams.length / 9) > 1 && (
                <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-6">
                  <button
                    onClick={() => setTeamsPage(prev => Math.max(prev - 1, 1))}
                    disabled={teamsPage === 1}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-gray-500 font-medium">
                    Page {teamsPage} of {Math.ceil(teams.length / 9)}
                  </span>
                  <button
                    onClick={() => setTeamsPage(prev => Math.min(prev + 1, Math.ceil(teams.length / 9)))}
                    disabled={teamsPage === Math.ceil(teams.length / 9)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ======================= TAB 2: MEMBERS ======================= */}
      {activeTab === 'members' && user?.role === 'owner' && (
        <>
          {membersLoading ? (
            <SkeletonTable rows={6} />
          ) : members.length === 0 ? (
            <div className="text-center py-20 bg-gray-50/50 rounded-2xl border text-gray-400 text-xs">
              No members found in this workspace directory.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Search Bar & Group Filter */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative flex-1 max-w-md w-full">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by Name, User ID, or Group..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-brand-700 transition-all text-xs"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Search className="h-4 w-4" />
                  </div>
                </div>

                <div className="w-full sm:w-48">
                  <select
                    value={selectedTeamFilter}
                    onChange={(e) => setSelectedTeamFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-brand-700 transition-all text-xs cursor-pointer font-medium text-gray-700"
                  >
                    <option value="all">All Groups / Teams</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      <th className="py-4 px-6">Name</th>
                      <th className="py-4 px-6">Email</th>
                      <th className="py-4 px-6">Allotted Groups</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6">Joined Date</th>
                      {isOwner && <th className="py-4 px-6 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                    {(() => {
                      const filteredMembers = members.filter((member) => {
                        const query = searchTerm.toLowerCase();
                        const matchesSearch =
                          member.full_name?.toLowerCase().includes(query) ||
                          member.id?.toLowerCase().includes(query) ||
                          teams.some((t) => t.member_ids.includes(member.id) && t.name.toLowerCase().includes(query));

                        if (selectedTeamFilter === 'all') return matchesSearch;

                        const memberTeams = teams.filter((t) => t.member_ids.includes(member.id) || member.role === 'owner');
                        const matchesTeam = memberTeams.some((t) => t.id === selectedTeamFilter);

                        return matchesSearch && matchesTeam;
                      });

                      const sliceStart = (membersPage - 1) * 10;
                      const paginatedMems = filteredMembers.slice(sliceStart, sliceStart + 10);

                      return paginatedMems.map((member) => (
                        <tr key={member.id} className="hover:bg-gray-50/30">
                          <td className="py-4 px-6 font-semibold text-gray-900">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-gray-900">{member.full_name}</p>
                                {member.id === user?.id && (
                                  <span className="bg-brand-50 text-brand-700 border border-brand-200 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide">You</span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400 font-mono">ID: {member.id}</p>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-gray-500">{member.email}</td>
                          <td className="py-4 px-6">
                            <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                              {(() => {
                                const allotted = teams.filter((t) => t.member_ids.includes(member.id));
                                const isGlobalOwner = member.role === 'owner';
                                
                                if (isGlobalOwner) {
                                  return (
                                    <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-lg font-semibold text-[9px] uppercase tracking-wide">
                                      All Groups (Owner)
                                    </span>
                                  );
                                }
                                
                                if (allotted.length === 0) {
                                  return <span className="text-gray-400 italic text-[10px]">Unassigned</span>;
                                }
                                
                                return allotted.map((t) => {
                                  const isTeamLead = t.lead_ids?.includes(member.id) || t.team_lead_id === member.id;
                                  return (
                                    <span
                                      key={t.id}
                                      className={`px-2 py-0.5 rounded-lg font-semibold text-[9px] uppercase tracking-wide border ${
                                        isTeamLead
                                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                          : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                      }`}
                                    >
                                      {t.name} {isTeamLead && '★'}
                                    </span>
                                  );
                                });
                              })()}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wide ${
                              member.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              member.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {member.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-gray-400">
                            {new Date(member.created_at).toLocaleDateString()}
                          </td>
                          {isOwner && (
                            <td className="py-4 px-6 text-right">
                              {member.role !== 'owner' && (
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => handleDeleteMember(member.id, member.full_name)}
                                    className="text-red-700 hover:text-red-800 font-semibold inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Members Pagination Controls */}
              {(() => {
                const filteredMembers = members.filter((member) => {
                  const query = searchTerm.toLowerCase();
                  const matchesSearch =
                    member.full_name?.toLowerCase().includes(query) ||
                    member.id?.toLowerCase().includes(query) ||
                    teams.some((t) => t.member_ids.includes(member.id) && t.name.toLowerCase().includes(query));

                  if (selectedTeamFilter === 'all') return matchesSearch;

                  const memberTeams = teams.filter((t) => t.member_ids.includes(member.id) || member.role === 'owner');
                  const matchesTeam = memberTeams.some((t) => t.id === selectedTeamFilter);

                  return matchesSearch && matchesTeam;
                });
                const totalMemPages = Math.ceil(filteredMembers.length / 10);
                if (totalMemPages <= 1) return null;
                return (
                  <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-6">
                    <button
                      onClick={() => setMembersPage(prev => Math.max(prev - 1, 1))}
                      disabled={membersPage === 1}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-gray-500 font-medium">
                      Page {membersPage} of {totalMemPages}
                    </span>
                    <button
                      onClick={() => setMembersPage(prev => Math.min(prev + 1, totalMemPages))}
                      disabled={membersPage === totalMemPages}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}

      {/* CREATE TEAM MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-brand-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full bg-white p-6 border shadow-2xl relative animate-slide-up">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="font-bold text-gray-900 text-xl mb-4">Create New Team</h3>
            
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Team Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Engineering / Sales"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-brand-700 transition-all text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the department, responsibility, or project namespace."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-brand-700 transition-all text-sm resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={createLoading}
                className="w-full bg-brand-700 hover:bg-brand-800 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-1 transition-all text-sm cursor-pointer"
              >
                {createLoading ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Team'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE TEAM MEMBERS MODAL */}
      {showManageModal && selectedTeamId && (
        <div className="fixed inset-0 bg-brand-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-lg w-full bg-white p-6 border shadow-2xl relative animate-slide-up max-h-[85vh] flex flex-col">
            <button
              onClick={() => {
                setShowManageModal(false);
                setSelectedTeamId(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="font-bold text-gray-900 text-xl mb-1">
              Manage {getSelectedTeam()?.name}
            </h3>
            <p className="text-xs text-gray-500 mb-4">{getSelectedTeam()?.description}</p>

            {/* Member List */}
            <div className="flex-1 overflow-y-auto mb-6 pr-1 space-y-2.5 border-y border-gray-100 py-4 min-h-[150px]">
              <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Team Members ({((getSelectedTeam()?.member_ids.filter(id => id !== members.find(m => m.role === 'owner')?.id).length || 0) + (members.find(m => m.role === 'owner') ? 1 : 0))})
              </h4>
              
              <div className="space-y-2">
                {/* Default Workspace Owner/Admin */}
                {(() => {
                  const ownerMember = members.find((m) => m.role === 'owner');
                  if (!ownerMember) return null;
                  return (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/40 border border-amber-100/60 text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{ownerMember.full_name} (Admin)</span>
                          {ownerMember.id === user?.id && (
                            <span className="bg-brand-50 text-brand-700 border border-brand-200 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide">You</span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 font-mono">ID: {ownerMember.id}</p>
                      </div>
                      <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-lg text-[9px] uppercase tracking-wider flex items-center gap-0.5 border border-amber-200">
                        <ShieldAlert className="h-3 w-3" />
                        Owner
                      </span>
                    </div>
                  );
                })()}

                {/* Team Members List */}
                {(() => {
                  const ownerMember = members.find((m) => m.role === 'owner');
                  const teamMembers = getSelectedTeam()?.member_ids.filter((id) => id !== ownerMember?.id) || [];
                  
                  if (teamMembers.length === 0) {
                    return (
                      <p className="text-xs text-gray-400 italic py-2">No other members assigned to this team.</p>
                    );
                  }

                  return teamMembers.map((memberId) => {
                    const mInfo = members.find((m) => m.id === memberId);
                    const isLead = getSelectedTeam()?.lead_ids?.includes(memberId) || getSelectedTeam()?.team_lead_id === memberId;
                    
                    return (
                      <div key={memberId} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-800">
                              {mInfo?.full_name || 'Unknown Member'}
                            </span>
                            {memberId === user?.id && (
                              <span className="bg-brand-50 text-brand-700 border border-brand-200 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide">You</span>
                            )}
                            {isLead && (
                              <span className="bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider flex items-center gap-0.5 border border-indigo-100">
                                <Crown className="h-3 w-3" />
                                Lead
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-400 font-mono">ID: {memberId}</p>
                        </div>
                        
                        {isOwner && (
                          <div className="flex items-center gap-1.5">
                            {/* Promote / Demote Button */}
                            <button
                              onClick={async () => {
                                try {
                                  if (isLead) {
                                    await api.post(`/teams/${selectedTeamId}/lead/remove`, { team_lead_id: memberId });
                                    toast.success('Member demoted from Lead.');
                                  } else {
                                    await api.post(`/teams/${selectedTeamId}/lead`, { team_lead_id: memberId });
                                    toast.success('Member promoted to Lead.');
                                  }
                                  fetchTeams();
                                  fetchMembers();
                                } catch (err: any) {
                                  toast.error(err.response?.data?.detail || 'Action failed.');
                                }
                              }}
                              className={`px-2 py-1 rounded-lg border font-semibold flex items-center gap-1 transition-all cursor-pointer text-[10px] ${
                                isLead
                                  ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                                  : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                              }`}
                              title={isLead ? 'Demote to Member' : 'Promote to Lead'}
                            >
                              <Crown className="h-3 w-3" />
                              {isLead ? 'Demote' : 'Promote'}
                            </button>

                            <button
                              onClick={() => handleRemoveMember(selectedTeamId, memberId)}
                              className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                              title="Remove from team"
                            >
                              <UserMinus className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Owner action console */}
            {isOwner && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                  Owner Actions
                </h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] text-gray-500 font-medium mb-1">
                      User ID to Add / Set Lead
                    </label>
                    <input
                      type="text"
                      value={actionUserId}
                      onChange={(e) => setActionUserId(e.target.value)}
                      placeholder="e.g. 6698dc96a5b00fb13197a..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-brand-700 transition-all text-xs"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleAddMember}
                      disabled={actionLoading || !actionUserId.trim()}
                      className="flex-1 bg-brand-700 hover:bg-brand-800 text-white font-semibold py-2 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Add Member
                    </button>
                    <button
                      onClick={handleAssignLead}
                      disabled={actionLoading || !actionUserId.trim()}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                    >
                      <Crown className="h-3.5 w-3.5" />
                      Set Team Lead
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* INVITE MEMBER MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-brand-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full bg-white p-6 border shadow-2xl relative animate-slide-up">
            <button
              onClick={() => setShowInviteModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="font-bold text-gray-900 text-xl mb-4 flex items-center gap-1.5">
              <Mail className="h-5 w-5 text-brand-700" />
              Invite Workspace Member
            </h3>

            <form onSubmit={handleInviteMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-brand-700 transition-all text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="john@company.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-brand-700 transition-all text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Initial Team / Group
                </label>
                <select
                  value={inviteTeamId}
                  onChange={(e) => setInviteTeamId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-brand-700 transition-all text-xs"
                >
                  <option value="">No Team Assigned</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={inviteLoading}
                className="w-full bg-brand-700 hover:bg-brand-800 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-1 transition-all text-sm cursor-pointer"
              >
                {inviteLoading ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    Sending Invite...
                  </>
                ) : (
                  'Send Indefinite Invite Link'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODIFY ACCESS MODAL */}
      {editingMember && (
        <div className="fixed inset-0 bg-brand-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full bg-white p-6 border shadow-2xl relative animate-slide-up">
            <button
              onClick={() => setEditingMember(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="font-bold text-gray-900 text-xl mb-1 flex items-center gap-1.5">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              Modify Access Settings
            </h3>
            <p className="text-xs text-gray-500 mb-4">Editing member permission metrics: {editingMember.full_name}</p>

            <form onSubmit={handleUpdateRole} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  System Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-brand-700 transition-all text-xs"
                >
                  <option value="member">Member (Employee)</option>
                  <option value="lead">Team Lead</option>
                  <option value="owner">Owner (Admin)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Account Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-brand-700 transition-all text-xs"
                >
                  <option value="active">Active (Full Access)</option>
                  <option value="inactive">Inactive (Access Suspended)</option>
                  <option value="pending">Pending Invite Verification</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={updateLoading}
                className="w-full bg-brand-700 hover:bg-brand-800 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-1 transition-all text-sm cursor-pointer"
              >
                {updateLoading ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    Updating Member...
                  </>
                ) : (
                  'Update Member Settings'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-brand-950/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full bg-white p-6 border border-red-100 shadow-2xl relative animate-slide-up rounded-2xl">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="bg-red-50 p-2.5 rounded-xl">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">
                {deleteConfirmation.type === 'remove_member' ? 'Confirm Removal' : 'Confirm Deletion'}
              </h3>
            </div>
            
            <p className="text-xs text-gray-600 mb-6 leading-relaxed">
              {deleteConfirmation.type === 'remove_member' ? (
                <>
                  Are you sure you want to remove <strong className="text-gray-950 font-semibold">"{deleteConfirmation.name}"</strong> from this team?
                </>
              ) : (
                <>
                  Are you sure you want to delete <strong className="text-gray-950 font-semibold">"{deleteConfirmation.name}"</strong>? 
                  {deleteConfirmation.type === 'team' 
                    ? ' All document associations and chats for this team will be permanently unlinked.' 
                    : ' This will revoke all their workspace access rights and remove them from all assigned teams.'}
                </>
              )}
               This action cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const onConfirm = deleteConfirmation.onConfirm;
                  setDeleteConfirmation(null);
                  await onConfirm();
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer shadow-md shadow-red-100"
              >
                {deleteConfirmation.type === 'remove_member' ? 'Confirm Remove' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
