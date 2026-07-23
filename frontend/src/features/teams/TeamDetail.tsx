import { useEffect, useState, type ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { SkeletonCardGrid } from '../../components/ui/Skeleton';
import {
  ArrowLeft, Users, Crown, ShieldAlert, FileText, Upload,
  Search, Loader2, Trash2, CheckCircle, XCircle,
  EyeOff, Clock, Tag, X, Download, Paperclip
} from 'lucide-react';

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  workspace_role: string;
  team_role: 'owner' | 'lead' | 'member';
  status: string;
}

interface TeamDoc {
  id: string;
  title: string;
  description: string;
  content: string;
  tags: string[];
  attachment_url: string | null;
  status: string;
  author_id: string;
  author_name: string;
  view_count: number;
  created_at: string;
}

interface Team {
  id: string;
  name: string;
  description: string;
  member_ids: string[];
  lead_ids: string[];
  team_lead_id: string | null;
}

const formatError = (err: any, fallback: string): string => {
  const detail = err.response?.data?.detail;
  if (!detail) return err.message || fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((e: any) => `${e.loc.join('.')}: ${e.msg}`).join(', ');
  }
  return fallback;
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:             { label: 'Draft',           color: 'bg-gray-100 text-gray-600 border-gray-200' },
  pending_team_lead: { label: 'Pending Lead',     color: 'bg-amber-50 text-amber-700 border-amber-200' },
  pending_admin:     { label: 'Pending Admin',    color: 'bg-indigo-50 text-indigo-700 border-indigo-250' },
  approved:          { label: 'Approved',        color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected:          { label: 'Rejected',        color: 'bg-rose-50 text-rose-650 border-rose-205' },
};

export default function TeamDetail() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isOwner = user?.role === 'owner';

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [docs, setDocs] = useState<TeamDoc[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [docsLoading, setDocsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');

  // Pagination for docs
  const [docsPage, setDocsPage] = useState(1);

  // Upload modal form
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadContent, setUploadContent] = useState('');
  const [uploadTeamId, setUploadTeamId] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Doc detail modal
  const [selectedDoc, setSelectedDoc] = useState<TeamDoc | null>(null);

  // Delete confirmation
  const [confirmDoc, setConfirmDoc] = useState<TeamDoc | null>(null);

  const isTeamLead = (team?.team_lead_id === user?.id || team?.lead_ids?.includes(user?.id || '')) ?? false;
  const canApproveDoc = (doc: TeamDoc | null) => {
    if (!doc) return false;
    if (doc.status !== 'pending_team_lead' && doc.status !== 'pending_admin') return false;
    if (isOwner) return true;
    if (isTeamLead) {
      return doc.status === 'pending_team_lead';
    }
    return false;
  };

  const fetchAll = async () => {
    if (!teamId) return;
    try {
      const [teamRes, membersRes, teamsRes] = await Promise.all([
        api.get(`/teams/${teamId}`),
        api.get(`/teams/${teamId}/members-detail`),
        api.get('/teams'),
      ]);
      setTeam(teamRes.data);
      setAllTeams(teamsRes.data);
      // Sort: current user first, then owner, then leads, then members
      const sorted = (membersRes.data as TeamMember[]).sort((a, b) => {
        if (a.id === user?.id) return -1;
        if (b.id === user?.id) return 1;
        const order = { owner: 0, lead: 1, member: 2 };
        return order[a.team_role] - order[b.team_role];
      });
      setMembers(sorted);
    } catch {
      toast.error('Failed to load team.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocs = async () => {
    if (!teamId) return;
    setDocsLoading(true);
    try {
      const res = await api.get(`/teams/${teamId}/documents`);
      setDocs(res.data);
    } catch {
      toast.error('Failed to load documents.');
    } finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    fetchDocs();
  }, [teamId]);

  useEffect(() => {
    if (teamId) {
      setUploadTeamId(teamId);
    }
  }, [teamId, showUpload]);

  // Reset doc pagination when filters change
  useEffect(() => {
    setDocsPage(1);
  }, [search]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim() || !uploadContent.trim()) {
      toast.error('Title and content are required.');
      return;
    }
    setUploading(true);
    try {
      let attachmentUrl: string | null = null;
      if (uploadFile) {
        const formData = new FormData();
        formData.append('file', uploadFile);
        const upRes = await api.post('/documents/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        attachmentUrl = upRes.data.url;
      }
      await api.post('/documents', {
        title: uploadTitle,
        description: uploadDesc,
        content: uploadContent,
        tags: uploadTags.split(',').map((t) => t.trim()).filter(Boolean),
        attachment_url: attachmentUrl,
        team_id: uploadTeamId || null,
      });
      toast.success(`Document "${uploadTitle}" published successfully!`);
      setShowUpload(false);
      setUploadTitle(''); setUploadDesc(''); setUploadContent('');
      setUploadTags(''); setUploadFile(null);
      fetchDocs();
    } catch (err: any) {
      toast.error(formatError(err, 'Upload failed.'));
    } finally {
      setUploading(false);
    }
  };

  const handleApprove = async (docId: string) => {
    try {
      await api.post(`/documents/${docId}/approve`);
      toast.success('Document approved.');
      fetchDocs();
      setSelectedDoc(null);
    } catch (err: any) {
      toast.error(formatError(err, 'Failed to approve.'));
    }
  };

  const handleReject = async (docId: string) => {
    try {
      await api.post(`/documents/${docId}/reject`);
      toast.success('Document rejected.');
      fetchDocs();
      setSelectedDoc(null);
    } catch (err: any) {
      toast.error(formatError(err, 'Failed to reject.'));
    }
  };

  const handleHide = async (docId: string) => {
    try {
      await api.patch(`/documents/${docId}/hide`);
      toast.success('Document hidden.');
      setDocs((prev) => prev.filter((d) => d.id !== docId));
      setSelectedDoc(null);
    } catch (err: any) {
      toast.error(formatError(err, 'Failed to hide.'));
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      await api.delete(`/documents/${docId}`);
      toast.success('Document deleted.');
      setDocs((prev) => prev.filter((d) => d.id !== docId));
      setConfirmDoc(null);
      setSelectedDoc(null);
    } catch (err: any) {
      toast.error(formatError(err, 'Failed to delete.'));
    }
  };

  const filteredDocs = docs.filter((d) => {
    const q = search.toLowerCase();
    return d.title?.toLowerCase().includes(q) ||
      d.author_name?.toLowerCase().includes(q) ||
      d.tags?.some((t) => t.toLowerCase().includes(q));
  });

  const docsPerPage = 10;
  const totalDocsPages = Math.ceil(filteredDocs.length / docsPerPage);
  const paginatedDocs = filteredDocs.slice((docsPage - 1) * docsPerPage, docsPage * docsPerPage);

  const roleBadge = (role: string) => {
    if (role === 'owner') return <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold uppercase"><ShieldAlert className="h-2.5 w-2.5" />Owner</span>;
    if (role === 'lead') return <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[9px] font-bold uppercase"><Crown className="h-2.5 w-2.5" />Lead</span>;
    return <span className="px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 border border-gray-200 text-[9px] font-bold uppercase">Member</span>;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-brand-700" />
    </div>
  );

  if (!team) return (
    <div className="text-center py-20 text-gray-400">Team not found.</div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col lg:flex-row gap-6 h-full text-left"
    >
      {/* ── LEFT SIDEBAR: Members ── */}
      <aside className="w-full lg:w-64 shrink-0 space-y-4">
        <motion.button
          whileHover={{ x: -3 }}
          onClick={() => navigate('/dashboard/teams')}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-700 font-semibold transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Teams
        </motion.button>

        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm space-y-4">
          <div>
            <h2 className="font-extrabold text-gray-900 text-base leading-tight">{team.name}</h2>
            <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">{team.description}</p>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            <Users className="h-3.5 w-3.5 text-brand-700" />
            <span className="font-bold text-gray-800">{members.length}</span> active members
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-2">
            <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">Members</p>
            {/* Scrollable member list container */}
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1.5 scrollbar-thin">
              {members.map((m) => {
                const isMe = m.id === user?.id;
                return (
                  <motion.div 
                    key={m.id}
                    whileHover={{ x: 4, backgroundColor: isMe ? 'rgba(254, 243, 199, 0.5)' : 'rgba(248, 250, 252, 1)' }}
                    className={`flex items-start gap-2.5 p-2 rounded-2xl transition-all ${isMe ? 'bg-brand-50 border border-brand-100' : 'hover:bg-slate-50'}`}
                  >
                    <div className={`h-7 w-7 rounded-xl flex items-center justify-center text-xs font-extrabold shrink-0 shadow-2xs ${
                      m.team_role === 'owner' ? 'bg-amber-100 text-amber-800' :
                      m.team_role === 'lead'  ? 'bg-indigo-100 text-indigo-800' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {m.full_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-xs font-bold text-gray-800 truncate">{m.full_name}</span>
                        {isMe && <span className="text-[9px] font-bold text-brand-700 bg-brand-50 border border-brand-200 px-1 rounded">You</span>}
                      </div>
                      <div className="mt-0.5">{roleBadge(m.team_role)}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </aside>

      {/* ── RIGHT MAIN: Documents ── */}
      <div className="flex-1 min-w-0 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{team.name} — Documents</h1>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">{filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''} stored</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 10px 15px -3px rgba(111, 78, 55, 0.25)' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-brand-700 to-brand-800 hover:from-brand-800 hover:to-brand-900 text-white font-semibold py-2.5 px-4 rounded-xl text-sm shadow-md transition-all cursor-pointer border border-brand-600/30"
          >
            <Upload className="h-4 w-4" /> Upload Document
          </motion.button>
        </div>

        {/* Search */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, author, tag..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200/90 rounded-2xl bg-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-600 transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* Documents Grid */}
        {docsLoading ? (
          <SkeletonCardGrid count={6} />
        ) : filteredDocs.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm"
          >
            <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-bold">No documents yet</p>
            <p className="text-xs text-gray-400 mt-1">Upload the first document for this team.</p>
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
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
            >
              {paginatedDocs.map((doc) => {
                const s = STATUS_CONFIG[doc.status] || STATUS_CONFIG.draft;
                return (
                  <motion.div
                    key={doc.id}
                    variants={{
                      hidden: { opacity: 0, y: 15 },
                      visible: { opacity: 1, y: 0 }
                    }}
                    whileHover={{ y: -6, scale: 1.02, boxShadow: '0 20px 30px -10px rgba(111, 78, 55, 0.15)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedDoc(doc)}
                    className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm hover:border-brand-400 transition-all cursor-pointer group space-y-3 relative overflow-hidden flex flex-col justify-between"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/5 rounded-full blur-xl group-hover:bg-brand-500/15 transition-all pointer-events-none" />

                    <div className="space-y-3 relative z-10">
                      <div className="flex items-start justify-between gap-2">
                        <div className="h-9 w-9 rounded-2xl bg-brand-50 flex items-center justify-center shrink-0 group-hover:bg-brand-100 transition-colors shadow-2xs">
                          <FileText className="h-4.5 w-4.5 text-brand-700" />
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border shadow-2xs ${s.color}`}>
                          {s.label}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-extrabold text-gray-900 text-sm leading-snug line-clamp-2 group-hover:text-brand-700 transition-colors">{doc.title}</h3>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">{doc.description}</p>
                      </div>

                      {doc.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {doc.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[9px] font-semibold border border-slate-200/60">#{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 relative z-10">
                      <span className="text-[10px] text-gray-400 font-medium">by {doc.author_name}</span>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Docs Pagination Controls */}
            {totalDocsPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-150 pt-4 mt-6">
                <button
                  onClick={() => setDocsPage((prev) => Math.max(prev - 1, 1))}
                  disabled={docsPage === 1}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                >
                  Previous
                </button>
                <span className="text-xs text-gray-500 font-medium">
                  Page {docsPage} of {totalDocsPages}
                </span>
                <button
                  onClick={() => setDocsPage((prev) => Math.min(prev + 1, totalDocsPages))}
                  disabled={docsPage === totalDocsPages}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── UPLOAD MODAL ── */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden animate-slide-up text-left">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Upload className="h-5 w-5 text-brand-700" />
                Publish/Upload Workspace Document
              </h3>
              <button
                onClick={() => setShowUpload(false)}
                className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. API Integration Guide"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Short Description
                </label>
                <input
                  type="text"
                  placeholder="Summarize the purpose of this file..."
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Content Body *
                </label>
                <textarea
                  required
                  rows={6}
                  placeholder="Draft your main document content or instructions here..."
                  value={uploadContent}
                  onChange={(e) => setUploadContent(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Assign to Team / Squad
                  </label>
                  <select
                    value={uploadTeamId}
                    onChange={(e) => setUploadTeamId(e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                  >
                    <option value="">Public to entire Workspace</option>
                    {allTeams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. dev, backend, schema"
                    value={uploadTags}
                    onChange={(e) => setUploadTags(e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Secure File Attachment
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-8 w-8 text-gray-400" />
                    <div className="flex text-xs text-gray-600 justify-center">
                      <label className="relative cursor-pointer bg-transparent rounded-md font-semibold text-brand-700 hover:text-brand-800">
                        <span>Select file</span>
                        <input
                          type="file"
                          onChange={handleFileChange}
                          className="sr-only"
                        />
                      </label>
                      <p className="pl-1 text-gray-500">or drag and drop</p>
                    </div>
                    <p className="text-[10px] text-gray-400">PDF, PNG, JPG, ZIP up to 10MB</p>
                    {uploadFile && (
                      <p className="text-xs font-bold text-brand-700 flex items-center justify-center gap-1 mt-2">
                        <Paperclip className="h-3.5 w-3.5" />
                        {uploadFile.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowUpload(false)}
                  className="bg-transparent hover:bg-gray-100 text-gray-700 font-semibold py-2 px-4 rounded-xl text-xs border border-gray-200 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="bg-brand-700 hover:bg-brand-800 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-all shadow-md shadow-brand-700/10 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {uploading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {uploading ? 'Publishing...' : 'Publish Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DOC DETAIL MODAL ── */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col animate-slide-up">
            <div className="flex items-start justify-between p-6 border-b border-gray-100">
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${(STATUS_CONFIG[selectedDoc.status] || STATUS_CONFIG.draft).color}`}>
                    {(STATUS_CONFIG[selectedDoc.status] || STATUS_CONFIG.draft).label}
                  </span>
                </div>
                <h2 className="font-bold text-gray-900 text-xl leading-snug">{selectedDoc.title}</h2>
                <p className="text-xs text-gray-400 mt-1">by {selectedDoc.author_name}</p>
              </div>
              <button onClick={() => setSelectedDoc(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer shrink-0"><X className="h-5 w-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedDoc.description && <p className="text-sm text-gray-500 italic">{selectedDoc.description}</p>}
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap text-sm border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                {selectedDoc.content}
              </div>
              {selectedDoc.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedDoc.tags.map((t) => <span key={t} className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg text-[10px] font-medium flex items-center gap-0.5"><Tag className="h-2.5 w-2.5" />{t}</span>)}
                </div>
              )}
              {selectedDoc.attachment_url && (
                <a 
                  href={`${api.defaults.baseURL || 'http://localhost:8000/api/v1'}/documents/${selectedDoc.id}/attachment?token=${useAuthStore.getState().token || ''}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-2 text-brand-700 hover:text-brand-800 font-semibold text-sm bg-brand-50 border border-brand-100 rounded-xl px-4 py-2.5 transition-colors"
                >
                  <Download className="h-4 w-4" /> View / Download Attachment
                </a>
              )}
            </div>

            {/* Action Bar */}
            <div className="p-4 border-t border-gray-100 flex flex-wrap gap-2">
              {canApproveDoc(selectedDoc) && (
                <>
                  <button onClick={() => handleApprove(selectedDoc.id)} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer">
                    <CheckCircle className="h-3.5 w-3.5" /> Approve
                  </button>
                  <button onClick={() => handleReject(selectedDoc.id)} className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer">
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </button>
                </>
              )}
              {isOwner && (
                <>
                  <button onClick={() => handleHide(selectedDoc.id)} className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer">
                    <EyeOff className="h-3.5 w-3.5" /> Hide
                  </button>
                  <button onClick={() => setConfirmDoc(selectedDoc)} className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 font-semibold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </>
              )}
              {selectedDoc.created_at && (
                <span className="ml-auto flex items-center gap-1 text-[10px] text-gray-400">
                  <Clock className="h-3 w-3" /> {new Date(selectedDoc.created_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM ── */}
      {confirmDoc && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up border border-red-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-50 p-2.5 rounded-xl"><ShieldAlert className="h-6 w-6 text-red-600" /></div>
              <h3 className="font-bold text-gray-900 text-lg">Delete Document</h3>
            </div>
            <p className="text-xs text-gray-600 mb-6 leading-relaxed">
              Are you sure you want to permanently delete <strong>"{confirmDoc.title}"</strong>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDoc(null)} className="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-xs hover:bg-gray-50 transition-colors cursor-pointer">Cancel</button>
              <button onClick={() => handleDelete(confirmDoc.id)} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl text-xs shadow-md transition-colors cursor-pointer">Confirm Delete</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
