import { useEffect, useState, type FormEvent } from 'react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
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
  Edit2
} from 'lucide-react';

interface Team {
  id: string;
  name: string;
  description: string;
  workspace_id: string;
  member_ids: string[];
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
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteTeamId, setInviteTeamId] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  // Role modification state
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [newRole, setNewRole] = useState('member');
  const [newStatus, setNewStatus] = useState('active');
  const [updateLoading, setUpdateLoading] = useState(false);

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
    fetchTeams();
  }, []);

  useEffect(() => {
    if (activeTab === 'members') {
      fetchMembers();
    }
  }, [activeTab]);

  const handleCreateTeam = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreateLoading(true);
    try {
      await api.post('/teams', { name, description });
      setName('');
      setDescription('');
      setShowCreateModal(false);
      fetchTeams();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create team.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team? All document associations and chats will be unlinked.')) {
      return;
    }
    try {
      await api.delete(`/teams/${teamId}`);
      fetchTeams();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete team.');
    }
  };

  const handleAddMember = async () => {
    if (!selectedTeamId || !actionUserId.trim()) return;
    setActionLoading(true);
    try {
      await api.post(`/teams/${selectedTeamId}/members`, { user_id: actionUserId });
      setActionUserId('');
      fetchTeams();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to add member.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignLead = async () => {
    if (!selectedTeamId || !actionUserId.trim()) return;
    setActionLoading(true);
    try {
      await api.post(`/teams/${selectedTeamId}/lead`, { team_lead_id: actionUserId });
      setActionUserId('');
      fetchTeams();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to assign team lead.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (teamId: string, memberId: string) => {
    try {
      await api.post(`/teams/${teamId}/members/remove`, { user_id: memberId });
      fetchTeams();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to remove member.');
    }
  };

  const handleDeleteMember = async (memberId: string, fullName: string) => {
    if (!workspace?.id) return;
    if (!confirm(`Are you sure you want to delete ${fullName} from the workspace? This will revoke all their access rights and remove them from all squads.`)) {
      return;
    }
    try {
      await api.delete(`/workspaces/${workspace.id}/members/${memberId}`);
      fetchMembers();
      alert('Member successfully removed from workspace.');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to remove member.');
    }
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
      setInviteEmail('');
      setInviteName('');
      setInviteRole('member');
      setInviteTeamId('');
      setShowInviteModal(false);
      fetchMembers();
      alert('Invitation sent successfully!');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to invite member.');
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
      setEditingMember(null);
      fetchMembers();
      alert('Member updated successfully!');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update member.');
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
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-brand-700 hover:bg-brand-800 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md flex items-center gap-1.5 transition-all text-sm shrink-0 cursor-pointer"
              >
                <Plus className="h-4.5 w-4.5" />
                Create Team
              </button>
            ) : (
              <button
                onClick={() => setShowInviteModal(true)}
                className="bg-brand-700 hover:bg-brand-800 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md flex items-center gap-1.5 transition-all text-sm shrink-0 cursor-pointer"
              >
                <UserPlus className="h-4.5 w-4.5" />
                Invite Member
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('teams')}
          className={`pb-3 text-sm font-semibold border-b-2 px-4 transition-all uppercase tracking-wider ${
            activeTab === 'teams' 
              ? 'border-brand-700 text-brand-700' 
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Teams & Squads
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`pb-3 text-sm font-semibold border-b-2 px-4 transition-all uppercase tracking-wider ${
            activeTab === 'members' 
              ? 'border-brand-700 text-brand-700' 
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          All Members ({activeTab === 'members' ? members.length : '...'})
        </button>
      </div>

      {/* ======================= TAB 1: TEAMS ======================= */}
      {activeTab === 'teams' && (
        <>
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-10 w-10 text-brand-700 animate-spin" />
            </div>
          ) : teams.length === 0 ? (
            <div className="glass-card text-center p-12 border border-gray-200">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="font-bold text-gray-800 text-lg">No teams found</h3>
              <p className="text-gray-500 text-xs mt-1 max-w-sm mx-auto">
                Get started by creating your first workspace team. Teams isolate knowledge boards and message channels.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team) => (
                <div key={team.id} className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        {team.member_ids.length} members
                      </span>
                      {isOwner && (
                        <button
                          onClick={() => handleDeleteTeam(team.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                          title="Delete Team"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-bold text-gray-900 text-lg leading-tight">{team.name}</h3>
                      <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">
                        {team.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-1.5">
                      <p className="text-[9px] text-gray-400 uppercase tracking-widest font-semibold">Team Lead</p>
                      <p className="text-xs font-bold text-gray-700 truncate">
                        {team.team_lead_id ? `User ID: ${team.team_lead_id}` : 'Unassigned'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-5 mt-5 border-t border-gray-100 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedTeamId(team.id);
                        setShowManageModal(true);
                      }}
                      className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 font-semibold py-2 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Users className="h-3.5 w-3.5" />
                      Manage Members
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ======================= TAB 2: MEMBERS ======================= */}
      {activeTab === 'members' && (
        <>
          {membersLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-10 w-10 text-brand-700 animate-spin" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-20 bg-gray-50/50 rounded-2xl border text-gray-400 text-xs">
              No members found in this workspace directory.
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    <th className="py-4 px-6">Name</th>
                    <th className="py-4 px-6">Email</th>
                    <th className="py-4 px-6">Role</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Joined Date</th>
                    {isOwner && <th className="py-4 px-6 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50/30">
                      <td className="py-4 px-6 font-semibold text-gray-900">{member.full_name}</td>
                      <td className="py-4 px-6 text-gray-500">{member.email}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wide ${
                          member.role === 'owner' ? 'bg-amber-100 text-amber-800' :
                          member.role === 'lead' ? 'bg-indigo-100 text-indigo-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {member.role}
                        </span>
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
                                onClick={() => {
                                  setEditingMember(member);
                                  setNewRole(member.role);
                                  setNewStatus(member.status);
                                }}
                                className="text-brand-700 hover:text-brand-800 font-semibold inline-flex items-center gap-1 bg-brand-50 hover:bg-brand-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit2 className="h-3 w-3" />
                                Modify Access
                              </button>
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
                  ))}
                </tbody>
              </table>
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
              <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                Team Members ({getSelectedTeam()?.member_ids.length || 0})
              </h4>
              
              {getSelectedTeam()?.member_ids.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No members assigned to this team.</p>
              ) : (
                getSelectedTeam()?.member_ids.map((memberId) => {
                  const isLead = getSelectedTeam()?.team_lead_id === memberId;
                  return (
                    <div key={memberId} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800">User ID: {memberId}</span>
                        {isLead && (
                          <span className="bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider flex items-center gap-0.5">
                            <Crown className="h-3 w-3" />
                            Lead
                          </span>
                        )}
                      </div>
                      {isOwner && (
                        <button
                          onClick={() => handleRemoveMember(selectedTeamId, memberId)}
                          className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                          title="Remove from team"
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                    Authorization Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-brand-700 transition-all text-xs"
                  >
                    <option value="member">Member (Employee)</option>
                    <option value="lead">Team Lead</option>
                  </select>
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
    </div>
  );
}
