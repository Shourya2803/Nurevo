import { useEffect, useState, type ChangeEvent } from 'react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { SkeletonDocumentList } from '../../components/ui/Skeleton';
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
  Users,
  BookOpen,
  ExternalLink,
  Sparkles,
  FileCode
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

  // Detail View & Fullscreen Modal State
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [fullscreenDoc, setFullscreenDoc] = useState<Document | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFullscreenDoc(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    if (!title.trim()) {
      toast.error('Document Title is required!');
      return;
    }
    if (!description.trim()) {
      toast.error('Short Description is required!');
      return;
    }
    if (!content.trim()) {
      toast.error('Content Body is required!');
      return;
    }
    if (!teamId.trim()) {
      toast.error('Please assign the document to a Team / Squad!');
      return;
    }
    if (!tagsInput.trim()) {
      toast.error('Tags are required!');
      return;
    }
    if (!attachmentFile) {
      toast.error('Secure File Attachment is required!');
      return;
    }

    setCreateLoading(true);
    try {
      let attachmentUrl = null;

      // 1. Upload file
      setUploading(true);
      const formData = new FormData();
      formData.append('file', attachmentFile);

      const uploadRes = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      attachmentUrl = uploadRes.data.url;
      setUploading(false);

      // 2. Create the document metadata
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      await api.post('/documents', {
        title,
        description,
        content,
        tags,
        team_id: teamId,
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

  useEffect(() => {
    if (filteredDocs.length > 0 && (!selectedDoc || !filteredDocs.some(d => d.id === selectedDoc.id))) {
      setSelectedDoc(filteredDocs[0]);
    }
  }, [filteredDocs.length, activeTab]);

  const getAttachmentUrl = (doc: Document | null) => {
    if (!doc || !doc.attachment_url) return null;
    const baseUrl = api.defaults.baseURL || 'http://localhost:8000/api/v1';
    const token = useAuthStore.getState().token || '';
    return `${baseUrl}/documents/${doc.id}/attachment?token=${token}`;
  };

  const getDownloadFilename = (doc: Document | null) => {
    if (!doc) return 'Document.pdf';
    let ext = '.pdf';
    if (doc.attachment_url) {
      const cleanPath = doc.attachment_url.split('?')[0];
      const match = cleanPath.match(/\.([a-zA-Z0-9]+)$/);
      if (match) {
        ext = `.${match[1].toLowerCase()}`;
      }
    }
    const safeTitle = doc.title
      ? doc.title.trim().replace(/[/\\?%*:|"<>]/g, '_')
      : 'Document';

    return safeTitle.toLowerCase().endsWith(ext) ? safeTitle : `${safeTitle}${ext}`;
  };

  const handleDownload = async (doc: Document | null) => {
    if (!doc) return;
    const url = getAttachmentUrl(doc);
    if (!url) return;
    try {
      toast.info("Preparing secure file download...");
      const response = await fetch(url);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = getDownloadFilename(doc);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast.success(`Downloaded: ${getDownloadFilename(doc)}`);
    } catch (err) {
      console.error('Download error:', err);
      window.open(url, '_blank');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 text-left"
    >
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Documents Repository</h2>
          <p className="text-xs text-gray-500">Secure knowledge-base and file sharing environment.</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05, boxShadow: '0 10px 15px -3px rgba(111, 78, 55, 0.25)' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowUploadModal(true)}
          className="bg-gradient-to-r from-brand-700 to-brand-800 hover:from-brand-800 hover:to-brand-900 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-brand-700/10 cursor-pointer self-start sm:self-auto border border-brand-600/30"
        >
          <Plus className="h-4.5 w-4.5" />
          Create / Upload Document
        </motion.button>
      </div>

      {/* Navigation tabs + Search box */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-2 relative">
        <div className="flex gap-4 relative overflow-x-auto pb-1 scrollbar-none whitespace-nowrap">
          <button
            onClick={() => {
              setActiveTab('browse');
              setSelectedDoc(null);
            }}
            className={`pb-2.5 text-xs font-semibold uppercase tracking-wider transition-all relative cursor-pointer ${
              activeTab === 'browse'
                ? 'text-brand-800'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Approved Base ({
              (user?.role === 'owner' || user?.role === 'lead')
                ? documents.filter(d => d.status === 'approved' && d.approved_by === user?.id).length
                : documents.filter(d => d.status === 'approved').length
            })
            {activeTab === 'browse' && (
              <motion.div
                layoutId="docTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-700 rounded-full"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
            )}
          </button>
          
          <button
            onClick={() => {
              setActiveTab('pending');
              setSelectedDoc(null);
            }}
            className={`pb-2.5 text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 relative cursor-pointer ${
              activeTab === 'pending'
                ? 'text-brand-800'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            My Submissions ({documents.filter(d => d.author_id === user?.id).length})
            {activeTab === 'pending' && (
              <motion.div
                layoutId="docTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-700 rounded-full"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
            )}
          </button>

          {isApprover && (
            <button
              onClick={() => {
                setActiveTab('approvals');
                setSelectedDoc(null);
              }}
              className={`pb-2.5 text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 relative cursor-pointer ${
                activeTab === 'approvals'
                  ? 'text-brand-800'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Approval Requests ({documents.filter(d => d.status === 'pending_approval' && canApproveDoc(d) && d.author_id !== user?.id).length})
              {documents.filter(d => d.status === 'pending_approval' && canApproveDoc(d) && d.author_id !== user?.id).length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              )}
              {activeTab === 'approvals' && (
                <motion.div
                  layoutId="docTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-700 rounded-full"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
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
                className={`pb-2.5 text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 relative cursor-pointer ${
                  activeTab === 'all'
                    ? 'text-brand-800'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                All Documents ({documents.length})
                {activeTab === 'all' && (
                  <motion.div
                    layoutId="docTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-700 rounded-full"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
              </button>

              <button
                onClick={() => {
                  setActiveTab('hidden');
                  setSelectedDoc(null);
                }}
                className={`pb-2.5 text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 relative cursor-pointer ${
                  activeTab === 'hidden'
                    ? 'text-brand-800'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Hidden Documents ({hiddenDocs.length})
                {activeTab === 'hidden' && (
                  <motion.div
                    layoutId="docTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-700 rounded-full"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Core Split Layout */}
      {loading ? (
        <SkeletonDocumentList />
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
                {filteredDocs.map((doc) => {
                  const isSelected = selectedDoc?.id === doc.id;
                  const hasAttachment = Boolean(doc.attachment_url);
                  const isPdf = doc.attachment_url?.toLowerCase().endsWith('.pdf');

                  return (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -4, scale: 1.01, boxShadow: '0 20px 30px -10px rgba(111, 78, 55, 0.15)' }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => setSelectedDoc(doc)}
                      className={`p-5 rounded-3xl border transition-all cursor-pointer bg-white text-left shadow-sm group relative overflow-hidden ${
                        isSelected
                          ? 'border-brand-600 shadow-xl ring-2 ring-brand-500/20 bg-gradient-to-br from-brand-50/30 to-white'
                          : 'border-slate-200/90 hover:border-brand-400 hover:shadow-lg'
                      }`}
                    >
                      {/* Selected Indicator Bar */}
                      {isSelected && (
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-brand-700 rounded-l-full" />
                      )}

                      <div className="flex items-start justify-between gap-3 relative z-10 pl-1">
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className={`p-1.5 rounded-xl shrink-0 ${isSelected ? 'bg-brand-100 text-brand-800' : 'bg-slate-100 text-slate-600 group-hover:bg-brand-50 group-hover:text-brand-700'} transition-colors`}>
                              {isPdf ? <FileText className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                            </div>
                            <h4 className="font-extrabold text-gray-900 text-base group-hover:text-brand-700 transition-colors truncate">{doc.title}</h4>
                            
                            {doc.team_id ? (
                              <span className="text-[9px] bg-brand-50 text-brand-700 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-brand-100/60 shadow-2xs">
                                {teams.find(t => t.id === doc.team_id)?.name || 'Team'}
                              </span>
                            ) : (
                              <span className="text-[9px] bg-slate-100 text-slate-600 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-slate-200">
                                Workspace-Wide
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed font-normal">{doc.description}</p>
                        </div>
                        
                        <span className={`shrink-0 text-[9px] px-2.5 py-1 rounded-full font-extrabold uppercase border tracking-wider shadow-2xs ${
                          doc.status === 'approved' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {doc.status.replace('_', ' ')}
                        </span>
                      </div>

                      {doc.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3 relative z-10 pl-1">
                          {doc.tags.map((tag) => (
                            <span key={tag} className="text-[9px] bg-slate-100/80 text-slate-600 font-semibold px-2 py-0.5 rounded-md border border-slate-200/60">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Upload and Approval Meta Info */}
                      <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-gray-500 relative z-10 pl-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-gray-400 font-medium">Uploaded by:</span>
                          <span className="font-bold text-gray-800 truncate">{doc.author_name || 'Workspace Member'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-gray-400 font-medium">Approved by:</span>
                          <span className="font-bold text-gray-800 truncate">
                            {doc.status === 'approved' ? (doc.approved_by_name || 'Workspace Administrator') : '—'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 mt-3 text-[10px] text-gray-400 relative z-10 pl-1">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-brand-600" />
                          Uploaded {new Date(doc.created_at).toLocaleDateString()}
                        </span>

                        {hasAttachment && (
                          <span className="flex items-center gap-1 font-bold text-brand-700 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-md">
                            <Paperclip className="h-3 w-3" /> Attachment Available
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right panel: Details & Live Document Previewer */}
          <div className="lg:col-span-5">
            {selectedDoc ? (
              <motion.div 
                key={selectedDoc.id}
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="glass-card p-6 bg-white border border-slate-200/90 rounded-3xl sticky top-6 space-y-6 text-left shadow-xl max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-thin"
              >
                {/* Header Badge & Title */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-4 gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-extrabold bg-brand-50 text-brand-800 border border-brand-100/80 px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-brand-600" />
                        Live Reader & Inspector
                      </span>
                    </div>
                    <h3 className="font-extrabold text-gray-950 text-xl leading-snug">{selectedDoc.title}</h3>
                  </div>

                  <span className={`text-[9px] px-2.5 py-1 rounded-full font-extrabold uppercase tracking-wider shrink-0 shadow-2xs border ${
                    activeTab === 'hidden'
                      ? 'bg-red-50 text-red-800 border-red-200'
                      : selectedDoc.status === 'approved' 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {activeTab === 'hidden' ? 'Hidden' : selectedDoc.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="space-y-5">
                  {/* Metadata Grid */}
                  <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Uploader</span>
                      <span className="font-bold text-slate-800 truncate block mt-0.5">{selectedDoc.author_name || 'Workspace Member'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Approver</span>
                      <span className="font-bold text-slate-800 truncate block mt-0.5">
                        {selectedDoc.status === 'approved' ? (selectedDoc.approved_by_name || 'Workspace Admin') : 'Pending Approval'}
                      </span>
                    </div>
                    {selectedDoc.team_id && (
                      <div className="col-span-2 border-t border-slate-200/60 pt-2 mt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Assigned Group</span>
                        <span className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-lg bg-brand-50 text-brand-800 text-xs font-bold border border-brand-100/60">
                          <Users className="h-3.5 w-3.5 text-brand-650" />
                          {teams.find(t => t.id === selectedDoc.team_id)?.name || 'Unknown Group'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {selectedDoc.description && (
                    <div>
                      <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Description Summary</h5>
                      <p className="text-xs text-slate-600 leading-relaxed font-normal bg-white p-3 rounded-xl border border-slate-100">{selectedDoc.description}</p>
                    </div>
                  )}

                  {/* Document Reader Container */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-brand-600" />
                        Document Content Body
                      </h5>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {selectedDoc.content ? `${Math.ceil(selectedDoc.content.split(/\s+/).length / 200)} min read` : ''}
                      </span>
                    </div>
                    <div className="bg-gradient-to-b from-white to-slate-50/50 p-4 rounded-2xl border border-slate-200/90 shadow-xs text-xs text-slate-800 font-sans leading-relaxed whitespace-pre-wrap min-h-[140px] max-h-72 overflow-y-auto scrollbar-thin">
                      {selectedDoc.content || <span className="text-slate-400 italic">No text content provided for this document record.</span>}
                    </div>
                  </div>

                  {/* Live Attachment Reader / Previewer */}
                  {selectedDoc.attachment_url && (
                    <div className="space-y-3 pt-1 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <h5 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                          <Paperclip className="h-3.5 w-3.5 text-brand-600" />
                          Live Attachment Previewer
                        </h5>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setFullscreenDoc(selectedDoc)}
                            className="text-[10px] font-bold text-brand-700 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 border border-brand-200/60 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <ExternalLink className="h-3 w-3" /> Fullscreen
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownload(selectedDoc)}
                            className="text-[10px] font-bold text-white bg-brand-700 hover:bg-brand-800 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                          >
                            <Download className="h-3 w-3" /> Download File
                          </button>
                        </div>
                      </div>

                      {/* PDF or Media Embed Container */}
                      {selectedDoc.attachment_url.split('?')[0].toLowerCase().endsWith('.pdf') ? (
                        <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-inner relative">
                          <iframe 
                            src={`${getAttachmentUrl(selectedDoc)}#toolbar=0`} 
                            className="w-full h-80 sm:h-96 border-none" 
                            title="PDF Document Live Preview"
                          />
                        </div>
                      ) : (selectedDoc.attachment_url.split('?')[0].match(/\.(jpeg|jpg|png|webp|gif|svg)$/i)) ? (
                        <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 p-2 flex items-center justify-center shadow-inner">
                          <img 
                            src={getAttachmentUrl(selectedDoc)!} 
                            alt="Attachment Preview" 
                            className="max-h-80 w-auto object-contain rounded-xl shadow-md"
                          />
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 text-brand-700 shrink-0" />
                            <span className="font-bold truncate">{getDownloadFilename(selectedDoc)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Operations & RBAC Triggers */}
                <div className="border-t border-slate-100 pt-4 flex flex-wrap gap-2 items-center justify-between">
                  <div className="flex gap-2">
                    {/* Approval triggers */}
                    {activeTab !== 'hidden' && canApproveDoc(selectedDoc) && selectedDoc.status === 'pending_approval' && (
                      <>
                        <button
                          onClick={() => handleApprove(selectedDoc.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1.5 px-3 rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                        >
                          <Check className="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(selectedDoc.id)}
                          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-1.5 px-3 rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer shadow-xs"
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
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-1.5 px-3 rounded-xl text-xs flex items-center gap-1 transition-all border border-slate-200 cursor-pointer"
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
                        className="bg-brand-600 hover:bg-brand-700 text-white font-semibold py-1.5 px-3 rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer"
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
              </motion.div>
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
                  Short Description <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Summarize the purpose of this file..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Content Body <span className="text-red-500 font-bold">*</span>
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Draft your main document content or instructions here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Assign to Team / Squad <span className="text-red-500 font-bold">*</span>
                  </label>
                  <select
                    required
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                  >
                    <option value="" disabled>Select Team / Squad *</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Tags (comma separated) <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. dev, backend, schema"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Secure File Attachment <span className="text-red-500 font-bold">*</span></span>
                  {attachmentFile && <span className="text-[10px] font-semibold text-emerald-600">Attached ✓</span>}
                </label>
                <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border border-dashed rounded-xl transition-colors ${attachmentFile ? 'border-brand-500 bg-brand-50/30' : 'border-gray-200 bg-gray-50/50'}`}>
                  <div className="space-y-1 text-center">
                    <Upload className={`mx-auto h-8 w-8 ${attachmentFile ? 'text-brand-600' : 'text-gray-400'}`} />
                    <div className="flex text-xs text-gray-600">
                      <label className="relative cursor-pointer bg-transparent rounded-md font-semibold text-brand-700 hover:text-brand-800">
                        <span>Select file *</span>
                        <input
                          type="file"
                          required={!attachmentFile}
                          onChange={handleFileChange}
                          className="sr-only"
                        />
                      </label>
                      <p className="pl-1 text-gray-500">or drag and drop</p>
                    </div>
                    <p className="text-[10px] text-gray-400">PDF, PNG, JPG, ZIP up to 10MB</p>
                    {attachmentFile && (
                      <p className="text-xs font-bold text-brand-700 flex items-center justify-center gap-1 mt-2 bg-white px-3 py-1 rounded-lg border border-brand-200 shadow-2xs">
                        <Paperclip className="h-3.5 w-3.5 text-brand-600" />
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

      {/* IN-APP FULLSCREEN DOCUMENT READER MODAL */}
      <AnimatePresence>
        {fullscreenDoc && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex flex-col p-4 sm:p-6 text-left"
          >
            {/* Header Bar with Document Title */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800 text-white shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-brand-600 text-white shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] bg-brand-500/20 text-brand-300 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-brand-500/30">
                      Fullscreen Reader
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-white truncate max-w-xl mt-0.5">{fullscreenDoc.title}</h3>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {fullscreenDoc.attachment_url && (
                  <button
                    type="button"
                    onClick={() => handleDownload(fullscreenDoc)}
                    className="text-xs font-bold text-white bg-brand-700 hover:bg-brand-800 px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-md cursor-pointer"
                  >
                    <Download className="h-4 w-4" /> Download File
                  </button>
                )}
                <button
                  onClick={() => setFullscreenDoc(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label="Close Fullscreen View"
                  title="Close (Esc)"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Main Fullscreen Reader Content Container */}
            <div className="flex-1 min-h-0 bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative flex flex-col">
              {fullscreenDoc.attachment_url ? (
                fullscreenDoc.attachment_url.split('?')[0].toLowerCase().endsWith('.pdf') ? (
                  <iframe 
                    src={`${getAttachmentUrl(fullscreenDoc)}#toolbar=0`} 
                    className="w-full h-full border-none" 
                    title={fullscreenDoc.title}
                  />
                ) : (fullscreenDoc.attachment_url.split('?')[0].match(/\.(jpeg|jpg|png|webp|gif|svg)$/i)) ? (
                  <div className="w-full h-full flex items-center justify-center p-4 bg-slate-950">
                    <img 
                      src={getAttachmentUrl(fullscreenDoc)!} 
                      alt={fullscreenDoc.title} 
                      className="max-h-full max-w-full object-contain rounded-xl shadow-2xl"
                    />
                  </div>
                ) : (
                  <div className="p-8 text-white max-w-3xl mx-auto overflow-y-auto space-y-4">
                    <h2 className="text-2xl font-bold">{fullscreenDoc.title}</h2>
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{fullscreenDoc.content}</p>
                  </div>
                )
              ) : (
                <div className="p-8 text-white max-w-3xl mx-auto overflow-y-auto space-y-4">
                  <h2 className="text-2xl font-bold">{fullscreenDoc.title}</h2>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{fullscreenDoc.content}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
