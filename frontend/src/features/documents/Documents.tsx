import { useEffect, useState, type ChangeEvent } from 'react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { 
  FileText, 
  Upload, 
  Check, 
  X, 
  Trash2, 
  Download, 
  Eye, 
  EyeOff,
  Plus, 
  Search, 
  Clock, 
  Paperclip,
  ShieldAlert,
  Users
} from 'lucide-react';

interface Document {
  id: string;
  title: string;
  description: string;
  content: string;
  tags: string[];
  attachment_url: string | null;
  status: string;
  workspace_id: string;
  team_id: string | null;
  author_id: string;
  author_name?: string | null;
  approved_by?: string | null;
  approved_by_name?: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}

interface Team {
  id: string;
  name: string;
  lead_ids?: string[];
  team_lead_id?: string | null;
}

export default function Documents() {
  const { user } = useAuthStore();
  const isApprover = user?.role === 'owner' || user?.role === 'lead';

  const canApproveDoc = (doc: Document | null) => {
    if (!doc) return false;
    if (user?.role === 'owner') return true;
    if (user?.role === 'lead') {
      if (!doc.team_id) return false;
      const team = teams.find(t => t.id === doc.team_id);
      if (!team) return false;
      const leads = team.lead_ids || [];
      return (team.team_lead_id === user.id) || leads.includes(user.id);
    }
    return false;
  };

  const [documents, setDocuments] = useState<Document[]>([]);
  const [hiddenDocs, setHiddenDocs] = useState<Document[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'browse' | 'pending' | 'approvals' | 'all' | 'hidden'>('browse');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Upload/Create Form State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [teamId, setTeamId] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // Detail View State
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  // Custom Deletion Confirmation State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    id: string;
    name: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  const fetchTeams = async () => {
    try {
      const response = await api.get('/teams');
      setTeams(response.data);
    } catch (err) {
      console.error('Failed to load teams:', err);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await api.get('/documents');
      setDocuments(response.data);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHiddenDocuments = async () => {
    if (user?.role !== 'owner') return;
    try {
      const response = await api.get('/documents/hidden');
      setHiddenDocs(response.data);
    } catch (err) {
      console.error('Failed to load hidden documents:', err);
    }
  };

  useEffect(() => {
    fetchTeams();
    fetchDocuments();
    if (user?.role === 'owner') {
      fetchHiddenDocuments();
    }
  }, [user]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAttachmentFile(e.target.files[0]);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setCreateLoading(true);
    try {
      let attachmentUrl = null;

      // 1. Upload file if selected
      if (attachmentFile) {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', attachmentFile);

        const uploadRes = await api.post('/documents/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        attachmentUrl = uploadRes.data.url;
        setUploading(false);
      }

      // 2. Create the document metadata
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      await api.post('/documents', {
        title,
        description,
        content,
        tags,
        team_id: teamId || null,
        attachment_url: attachmentUrl
      });

      toast.success(`Document "${title}" published successfully!`);
      // Reset state
      setTitle('');
      setDescription('');
      setContent('');
      setTeamId('');
      setTagsInput('');
      setAttachmentFile(null);
      setShowUploadModal(false);
      
      fetchDocuments();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to publish document.');
    } finally {
      setCreateLoading(false);
      setUploading(false);
    }
  };

  const handleApprove = async (docId: string) => {
    try {
      await api.post(`/documents/${docId}/approve`);
      toast.success('Document approved successfully!');
      fetchDocuments();
      if (selectedDoc?.id === docId) {
        setSelectedDoc(prev => prev ? { ...prev, status: 'approved' } : null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to approve document.');
    }
  };

  const handleReject = async (docId: string) => {
    try {
      await api.post(`/documents/${docId}/reject`);
      toast.success('Document rejected and returned to draft.');
      fetchDocuments();
      if (selectedDoc?.id === docId) {
        setSelectedDoc(prev => prev ? { ...prev, status: 'rejected' } : null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to reject document.');
    }
  };

  const handleDelete = async (docId: string) => {
    const doc = documents.find(d => d.id === docId) || hiddenDocs.find(d => d.id === docId);
    if (!doc) return;
    setDeleteConfirmation({
      id: docId,
      name: doc.title,
      onConfirm: async () => {
        try {
          await api.delete(`/documents/${docId}`);
          toast.success(`Document "${doc.title}" has been deleted.`);
          setSelectedDoc(null);
          fetchDocuments();
          if (user?.role === 'owner') {
            fetchHiddenDocuments();
          }
        } catch (err: any) {
          toast.error(err.response?.data?.detail || 'Failed to delete document.');
        }
      }
    });
  };

  const handleHide = async (docId: string) => {
    try {
      await api.patch(`/documents/${docId}/hide`);
      toast.success('Document hidden successfully!');
      fetchDocuments();
      if (user?.role === 'owner') {
        fetchHiddenDocuments();
      }
      setSelectedDoc(null);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to hide document.');
    }
  };

  const handleUnhide = async (docId: string) => {
    try {
      await api.patch(`/documents/${docId}/unhide`);
      toast.success('Document restored/unhidden successfully!');
      fetchDocuments();
      if (user?.role === 'owner') {
        fetchHiddenDocuments();
      }
      setSelectedDoc(null);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to restore document.');
    }
  };

  // Filter lists
  const filteredDocs = (() => {
    const docsToFilter = activeTab === 'hidden' ? hiddenDocs : documents;
    return docsToFilter.filter(doc => {
      const matchesSearch = 
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      if (activeTab === 'browse') {
        if (user?.role === 'owner' || user?.role === 'lead') {
          return matchesSearch && doc.status === 'approved' && doc.approved_by === user?.id;
        }
        return matchesSearch && doc.status === 'approved';
      } else if (activeTab === 'pending') {
        return matchesSearch && doc.author_id === user?.id;
      } else if (activeTab === 'approvals') {
        return matchesSearch && doc.status === 'pending_approval' && canApproveDoc(doc) && doc.author_id !== user?.id;
      } else if (activeTab === 'all') {
        return matchesSearch;
      } else {
        return matchesSearch;
      }
    });
  })();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Documents Repository</h2>
          <p className="text-xs text-gray-500">Secure knowledge-base and file sharing environment.</p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-brand-700 hover:bg-brand-800 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-brand-700/10 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4.5 w-4.5" />
          Create / Upload Document
        </button>
      </div>

      {/* Navigation tabs + Search box */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-2">
        <div className="flex gap-4">
          <button
            onClick={() => {
              setActiveTab('browse');
              setSelectedDoc(null);
            }}
            className={`pb-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'browse'
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Approved Base ({
              (user?.role === 'owner' || user?.role === 'lead')
                ? documents.filter(d => d.status === 'approved' && d.approved_by === user?.id).length
                : documents.filter(d => d.status === 'approved').length
            })
          </button>
          
          <button
            onClick={() => {
              setActiveTab('pending');
              setSelectedDoc(null);
            }}
            className={`pb-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            My Submissions ({documents.filter(d => d.author_id === user?.id).length})
          </button>

          {isApprover && (
            <button
              onClick={() => {
                setActiveTab('approvals');
                setSelectedDoc(null);
              }}
              className={`pb-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'approvals'
                  ? 'border-brand-700 text-brand-700'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              Approval Requests ({documents.filter(d => d.status === 'pending_approval' && canApproveDoc(d) && d.author_id !== user?.id).length})
              {documents.filter(d => d.status === 'pending_approval' && canApproveDoc(d) && d.author_id !== user?.id).length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              )}
            </button>
          )}

          {user?.role === 'owner' && (
            <>
              <button
                onClick={() => {
                  setActiveTab('all');
                  setSelectedDoc(null);
                }}
                className={`pb-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'all'
                    ? 'border-brand-700 text-brand-700'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                All Documents ({documents.length})
              </button>

              <button
                onClick={() => {
                  setActiveTab('hidden');
                  setSelectedDoc(null);
                }}
                className={`pb-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'hidden'
                    ? 'border-brand-700 text-brand-700'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                Hidden Documents ({hiddenDocs.length})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Core Split Layout */}
      {loading ? (
        <div className="py-20 text-center text-xs text-gray-400">Loading documents directory...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left panel: List */}
          <div className="lg:col-span-7 space-y-4">
            {filteredDocs.length === 0 ? (
              <div className="text-center py-20 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 text-xs text-gray-400">
                No documents found matching this filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredDocs.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer bg-white text-left ${
                      selectedDoc?.id === doc.id
                        ? 'border-brand-600 shadow-sm ring-1 ring-brand-500/25'
                        : 'border-gray-200/80 hover:border-brand-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-gray-900 text-sm truncate">{doc.title}</h4>
                          {doc.team_id ? (
                            <span className="text-[9px] bg-brand-50 text-brand-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-brand-100/50">
                              {teams.find(t => t.id === doc.team_id)?.name || 'Team'}
                            </span>
                          ) : (
                            <span className="text-[9px] bg-gray-50 text-gray-600 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-gray-200">
                              Workspace-Wide
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2">{doc.description}</p>
                      </div>
                      
                      <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        doc.status === 'approved' 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {doc.status.replace('_', ' ')}
                      </span>
                    </div>

                    {doc.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {doc.tags.map((tag) => (
                          <span key={tag} className="text-[9px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Upload and Approval Meta Info */}
                    <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] text-gray-500">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-gray-400 font-medium">Uploaded by:</span>
                        <span className="font-semibold text-gray-700 truncate">{doc.author_name || 'Workspace Member'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-gray-400 font-medium">Approved by:</span>
                        <span className="font-semibold text-gray-700 truncate">
                          {doc.status === 'approved' ? (doc.approved_by_name || 'Workspace Administrator') : '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 col-span-2">
                        <span className="text-gray-400 font-medium">Upload time:</span>
                        <span className="font-semibold text-gray-700">
                          {new Date(doc.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-4 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        Uploaded {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        {doc.view_count} views
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right panel: Details view */}
          <div className="lg:col-span-5">
            {selectedDoc ? (
              <div className="glass-card p-6 bg-white border border-gray-200 sticky top-6 space-y-6 text-left">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold bg-brand-50 text-brand-800 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Document Detail
                    </span>
                    <h3 className="font-extrabold text-gray-950 text-base">{selectedDoc.title}</h3>
                  </div>

                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                    activeTab === 'hidden'
                      ? 'bg-red-50 text-red-800 border border-red-200'
                      : selectedDoc.status === 'approved' 
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    {activeTab === 'hidden' ? 'hidden' : selectedDoc.status}
                  </span>
                </div>

                <div className="space-y-4">
                  {selectedDoc.team_id && (
                    <div>
                      <h5 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Assigned Group</h5>
                      <span className="inline-flex items-center gap-1.5 mt-1 px-3 py-1 rounded-xl bg-brand-50 text-brand-800 text-xs font-semibold border border-brand-100/50">
                        <Users className="h-3.5 w-3.5 text-brand-650" />
                        {teams.find(t => t.id === selectedDoc.team_id)?.name || 'Unknown Group'}
                      </span>
                    </div>
                  )}

                  <div>
                    <h5 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Description</h5>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">{selectedDoc.description}</p>
                  </div>

                  <div>
                    <h5 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Content Body</h5>
                    <div className="text-xs text-gray-700 bg-gray-50/50 p-4 rounded-xl border border-gray-100 mt-1 whitespace-pre-wrap font-sans leading-relaxed min-h-[150px]">
                      {selectedDoc.content}
                    </div>
                  </div>

                  {selectedDoc.attachment_url && (
                    <div className="border border-brand-100 rounded-xl p-3 bg-brand-50/10 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-xs text-gray-600 min-w-0">
                        <Paperclip className="h-4.5 w-4.5 text-brand-700 shrink-0" />
                        <span className="font-semibold truncate">Attachment Download Link</span>
                      </div>
                      
                      <a
                        href={selectedDoc.attachment_url.startsWith('/') 
                          ? `${api.defaults.baseURL?.replace('/api/v1', '')}${selectedDoc.attachment_url}`
                          : selectedDoc.attachment_url
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="bg-brand-700 hover:bg-brand-800 text-white p-2 rounded-lg transition-colors inline-flex items-center justify-center shrink-0 cursor-pointer"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Operations */}
                <div className="border-t border-gray-100 pt-4 flex flex-wrap gap-2 items-center justify-between">
                  <div className="flex gap-2">
                    {/* Approval triggers */}
                    {activeTab !== 'hidden' && canApproveDoc(selectedDoc) && selectedDoc.status === 'pending_approval' && (
                      <>
                        <button
                          onClick={() => handleApprove(selectedDoc.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Check className="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(selectedDoc.id)}
                          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                          Reject
                        </button>
                      </>
                    )}

                    {/* Hide Document Trigger */}
                    {activeTab !== 'hidden' && user?.role === 'owner' && (
                      <button
                        onClick={() => handleHide(selectedDoc.id)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1 transition-all border border-gray-200 cursor-pointer"
                        title="Hide from user view"
                      >
                        <EyeOff className="h-4 w-4" />
                        Hide Document
                      </button>
                    )}

                    {/* Unhide Document Trigger */}
                    {activeTab === 'hidden' && user?.role === 'owner' && (
                      <button
                        onClick={() => handleUnhide(selectedDoc.id)}
                        className="bg-brand-600 hover:bg-brand-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Eye className="h-4 w-4" />
                        Restore / Unhide
                      </button>
                    )}
                  </div>

                  {/* Delete triggers */}
                  {(user?.role === 'owner' || selectedDoc.author_id === user?.id) && (
                    <button
                      onClick={() => handleDelete(selectedDoc.id)}
                      className="bg-transparent hover:bg-red-50 text-red-600 font-semibold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1 transition-all border border-red-200/50 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Document
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-10 border border-gray-200 bg-white rounded-2xl text-center text-xs text-gray-400 sticky top-6">
                <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                Select a document from the register list to view details, inspect content, download secure attachments, or trigger RBAC approvals.
              </div>
            )}
          </div>

        </div>
      )}

      {/* CREATE / UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden animate-slide-up text-left">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Upload className="h-5 w-5 text-brand-700" />
                Publish/Upload Workspace Document
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. API Integration Guide"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
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
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Assign to Team / Squad
                  </label>
                  <select
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                  >
                    <option value="">Public to entire Workspace</option>
                    {teams.map((t) => (
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
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
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
                    <div className="flex text-xs text-gray-600">
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
                    {attachmentFile && (
                      <p className="text-xs font-bold text-brand-700 flex items-center justify-center gap-1 mt-2">
                        <Paperclip className="h-3.5 w-3.5" />
                        {attachmentFile.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="bg-transparent hover:bg-gray-100 text-gray-700 font-semibold py-2 px-4 rounded-xl text-xs border border-gray-200 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading || uploading}
                  className="bg-brand-700 hover:bg-brand-800 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-all shadow-md shadow-brand-700/10 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {(createLoading || uploading) && <Clock className="h-3.5 w-3.5 animate-spin" />}
                  {createLoading ? 'Publishing...' : 'Publish Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-brand-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full bg-white p-6 border border-red-100 shadow-2xl relative animate-slide-up rounded-2xl">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="bg-red-50 p-2.5 rounded-xl">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">Confirm Deletion</h3>
            </div>
            
            <p className="text-xs text-gray-600 mb-6 leading-relaxed">
              Are you sure you want to delete the document <strong className="text-gray-950 font-semibold">"{deleteConfirmation.name}"</strong>? 
              This will permanently remove the document record and unlink all associated squad files. This action cannot be undone.
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
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
