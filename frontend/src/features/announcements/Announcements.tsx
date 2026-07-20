import { useState, useEffect, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import {
  Megaphone,
  Pin,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Video,
  CheckCircle2,
  Search,
  BarChart2,
  ShieldAlert,
  AlertTriangle,
  Info,
  X,
  Loader2,
  Upload,
  Send,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface PollOption {
  id: string;
  text: string;
  votes: string[];
}

interface Poll {
  question: string;
  options: PollOption[];
}

interface EventDetails {
  date: string;
  time: string;
  location: string;
  meet_url?: string;
}

interface Announcement {
  id: string;
  workspace_id: string;
  author_id: string;
  author_name: string;
  title: string;
  content: string;
  cover_image?: string;
  priority: 'critical' | 'important' | 'normal' | 'info';
  audience: 'everyone' | 'team' | 'role';
  target_team_id?: string;
  target_role?: string;
  is_pinned: boolean;
  is_hidden: boolean;
  template_type?: string;
  attachments?: { filename: string; url: string }[];
  reactions?: Record<string, string[]>;
  acknowledged_by?: string[];
  poll?: Poll;
  event_details?: EventDetails;
  expires_at?: string;
  scheduled_at?: string;
  created_at: string;
}

interface Team {
  id: string;
  name: string;
}

const TEMPLATES = [
  {
    id: 'holiday',
    name: 'Holiday / Office Off',
    icon: '🎄',
    priority: 'info',
    title: 'Office Closed for Upcoming Holiday',
    cover_image: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=1200&q=80',
    content: 'Please note that our office will be closed on the upcoming holiday. Emergency contacts will remain available on Slack for critical issues.',
  },
  {
    id: 'meeting',
    name: 'All-Hands Sync',
    icon: '📅',
    priority: 'normal',
    title: 'Quarterly All-Hands Strategy Sync',
    cover_image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
    content: 'Join us for our quarterly review meeting. We will discuss upcoming product milestones, customer growth metrics, and Q4 roadmap.',
  },
  {
    id: 'deployment',
    name: 'Release Update',
    icon: '🚀',
    priority: 'important',
    title: 'Production Release Notes v2.5',
    cover_image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    content: 'We have deployed release v2.5 to production featuring speed optimizations, updated UI components, and enhanced secure document proxy.',
  },
  {
    id: 'maintenance',
    name: 'Scheduled Maintenance',
    icon: '🛠️',
    priority: 'critical',
    title: 'Scheduled Maintenance Window',
    cover_image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
    content: 'Planned database infrastructure upgrade. Platform will be in read-only mode for 30 minutes tonight at 11:00 PM EST.',
  },
  {
    id: 'policy',
    name: 'Policy & Security',
    icon: '🔒',
    priority: 'critical',
    title: 'Updated Security & Access Policy',
    cover_image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80',
    content: 'Please review our updated information security standards. All squad members are required to acknowledge reading this document.',
  }
];

export default function Announcements() {
  const { user, workspace } = useAuthStore();
  const isOwner = user?.role === 'owner';

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pinned' | 'critical' | 'events' | 'polls'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; title: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Expanded Content Truncation State
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'critical' | 'important' | 'normal' | 'info'>('normal');
  const [audience, setAudience] = useState<'everyone' | 'team' | 'role'>('everyone');
  const [targetTeamId, setTargetTeamId] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [coverImage, setCoverImage] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);

  // Optional Poll State in Modal
  const [enablePoll, setEnablePoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['Option A', 'Option B']);

  // Optional Event Details State in Modal
  const [enableEvent, setEnableEvent] = useState(false);
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventMeetUrl, setEventMeetUrl] = useState('');

  useEffect(() => {
    fetchAnnouncements();
    fetchTeams();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get('/announcements');
      setAnnouncements(res.data);
    } catch (err: any) {
      toast.error('Failed to load announcements.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    if (!workspace?.id) return;
    try {
      const res = await api.get(`/teams?workspace_id=${workspace.id}`);
      setTeams(res.data);
    } catch (err) {
      console.error('Failed to fetch teams:', err);
    }
  };

  const handleCoverFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('File must be an image format (JPG, PNG, WebP, GIF, SVG)!');
      e.target.value = '';
      return;
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      toast.error('Cover image size must not exceed 5MB!');
      e.target.value = '';
      return;
    }

    setUploadingCover(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/announcements/upload-cover', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setCoverImage(res.data.url);
      toast.success('Cover image uploaded to Supabase!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to upload cover image.');
    } finally {
      setUploadingCover(false);
      e.target.value = '';
    }
  };

  const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
    setTitle(tpl.title);
    setContent(tpl.content);
    setPriority(tpl.priority as any);
    setCoverImage(tpl.cover_image);
    toast.success(`Applied template: "${tpl.name}"`);
  };

  const handleCreateAnnouncement = async (e: FormEvent) => {
    e.preventDefault();
    if (!isOwner) {
      toast.error('Only Workspace Owners can publish announcements!');
      return;
    }
    if (!title.trim()) {
      toast.error('Announcement Title is required!');
      return;
    }
    if (!priority) {
      toast.error('Priority level is required!');
      return;
    }
    if (!audience) {
      toast.error('Audience selection is required!');
      return;
    }
    if (audience === 'team' && !targetTeamId) {
      toast.error('Target Squad selection is required!');
      return;
    }
    if (!coverImage.trim()) {
      toast.error('Banner Cover Image is required! Please upload or provide an image link.');
      return;
    }
    if (!content.trim()) {
      toast.error('Content Body is required!');
      return;
    }

    setCreateLoading(true);
    try {
      let pollData = undefined;
      if (enablePoll && pollQuestion.trim()) {
        pollData = {
          question: pollQuestion,
          options: pollOptions.filter(o => o.trim()).map((text, idx) => ({
            id: `opt_${idx}_${Date.now()}`,
            text: text.trim()
          }))
        };
      }

      let eventData = undefined;
      if (enableEvent && (eventDate || eventTime || eventLocation)) {
        eventData = {
          date: eventDate,
          time: eventTime,
          location: eventLocation,
          meet_url: eventMeetUrl
        };
      }

      await api.post('/announcements', {
        title,
        content,
        priority,
        audience,
        target_team_id: audience === 'team' ? targetTeamId : null,
        is_pinned: isPinned,
        cover_image: coverImage.trim() || null,
        poll: pollData,
        event_details: eventData
      });

      toast.success('Announcement published successfully!');
      // Reset form
      setTitle('');
      setContent('');
      setPriority('normal');
      setAudience('everyone');
      setTargetTeamId('');
      setIsPinned(false);
      setCoverImage('');
      setEnablePoll(false);
      setPollQuestion('');
      setPollOptions(['Option A', 'Option B']);
      setEnableEvent(false);
      setEventDate('');
      setEventTime('');
      setEventLocation('');
      setEventMeetUrl('');
      setShowCreateModal(false);
      fetchAnnouncements();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to publish announcement.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleTogglePin = async (id: string) => {
    try {
      const res = await api.post(`/announcements/${id}/pin`);
      toast.success(res.data.is_pinned ? 'Announcement pinned to top!' : 'Announcement unpinned.');
      fetchAnnouncements();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Action failed.');
    }
  };

  const handleToggleHide = async (id: string) => {
    try {
      const res = await api.post(`/announcements/${id}/hide`);
      toast.success(res.data.is_hidden ? 'Announcement hidden from members.' : 'Announcement is now visible.');
      fetchAnnouncements();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Action failed.');
    }
  };

  const toggleExpandItem = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const confirmDeleteAnnouncement = async () => {
    if (!deleteConfirmation) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/announcements/${deleteConfirmation.id}`);
      toast.success('Announcement deleted successfully.');
      setDeleteConfirmation(null);
      fetchAnnouncements();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete announcement.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleReaction = async (id: string, emoji: string) => {
    try {
      await api.post(`/announcements/${id}/react`, { emoji });
      fetchAnnouncements();
    } catch (err: any) {
      toast.error('Failed to update reaction.');
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await api.post(`/announcements/${id}/acknowledge`);
      toast.success('Acknowledgment recorded!');
      fetchAnnouncements();
    } catch (err: any) {
      toast.error('Failed to record acknowledgment.');
    }
  };

  const handleVotePoll = async (id: string, optionId: string) => {
    try {
      await api.post(`/announcements/${id}/vote`, { option_id: optionId });
      toast.success('Vote submitted!');
      fetchAnnouncements();
    } catch (err: any) {
      toast.error('Failed to record vote.');
    }
  };

  const generateGoogleCalendarUrl = (ev: EventDetails, title: string) => {
    const text = encodeURIComponent(title);
    const details = encodeURIComponent(`Meeting Link: ${ev.meet_url || 'N/A'}`);
    const location = encodeURIComponent(ev.location || 'Online');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}&location=${location}`;
  };

  // Filtered List
  const filteredAnnouncements = announcements.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.author_name.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'pinned') return a.is_pinned;
    if (activeTab === 'critical') return a.priority === 'critical';
    if (activeTab === 'events') return !!a.event_details;
    if (activeTab === 'polls') return !!a.poll;
    return true;
  });

  const priorityStyles = {
    critical: {
      badge: 'bg-red-50 text-red-700 border-red-200',
      icon: <ShieldAlert className="h-3.5 w-3.5 text-red-600" />,
      dot: 'Critical'
    },
    important: {
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />,
      dot: 'Important'
    },
    normal: {
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />,
      dot: 'Normal'
    },
    info: {
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: <Info className="h-3.5 w-3.5 text-blue-600" />,
      dot: 'Information'
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-12"
    >
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-950 via-brand-900 to-slate-900 p-6 sm:p-8 text-white shadow-2xl border border-brand-800/60">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-800/80 border border-brand-700/60 text-brand-200 text-xs font-semibold">
              <Megaphone className="h-3.5 w-3.5 text-brand-400" />
              <span>Workspace Communications Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl text-white font-extrabold tracking-tight">
              Announcements & Broadcasts
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Stay aligned with organization-wide policies, release notes, all-hands events, and priority broadcasts.
            </p>
          </div>

          {isOwner ? (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold py-3 px-6 rounded-2xl shadow-xl shadow-brand-950/40 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-xs shrink-0"
            >
              <Plus className="h-4.5 w-4.5" />
              <span>Publish New Announcement</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-xs text-slate-200">
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              <span>Owner Broadcast Privileges Only</span>
            </div>
          )}
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'All Updates', icon: Megaphone },
            { id: 'pinned', label: 'Pinned Top', icon: Pin },
            { id: 'critical', label: 'Critical Alert', icon: ShieldAlert },
            { id: 'events', label: 'Events & Meetings', icon: Calendar },
            { id: 'polls', label: 'Live Polls', icon: BarChart2 }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${active
                    ? 'bg-brand-950 text-white shadow-md shadow-brand-950/20 ring-1 ring-brand-700'
                    : 'bg-white hover:bg-slate-100 hover:text-slate-900 text-slate-600 border border-slate-200/80 shadow-2xs'
                  }`}
              >
                <Icon className={`h-3.5 w-3.5 transition-colors ${active ? 'text-brand-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-700 transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* ANNOUNCEMENT FEED GRID */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/4" />
              <div className="h-6 bg-slate-200 rounded w-3/4" />
              <div className="h-16 bg-slate-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-brand-50 text-brand-700 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Megaphone className="h-8 w-8" />
          </div>
          <h3 className="font-bold text-slate-900 text-lg">No Announcements Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery ? 'No updates matched your search query.' : 'There are no active broadcasts in this filter right now.'}
          </p>
          {isOwner && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 bg-brand-700 hover:bg-brand-800 text-white font-semibold py-2.5 px-4 rounded-xl text-xs cursor-pointer shadow-md transition-colors"
            >
              <Plus className="h-4 w-4" /> Create First Broadcast
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredAnnouncements.map((item) => {
            const pStyle = priorityStyles[item.priority] || priorityStyles.normal;
            const isAcknowledged = item.acknowledged_by?.includes(user?.id || '');
            const ackCount = item.acknowledged_by?.length || 0;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className={`bg-white rounded-3xl border overflow-hidden transition-all duration-300 shadow-sm hover:shadow-xl hover:border-brand-300/80 group relative ${item.is_pinned
                    ? 'border-brand-300 ring-2 ring-brand-500/10'
                    : 'border-slate-200/80'
                  } ${item.is_hidden ? 'opacity-60 bg-slate-50/70' : ''}`}
              >
                {/* COVER IMAGE BANNER */}
                {item.cover_image && (
                  <div className="h-44 sm:h-52 w-full overflow-hidden relative">
                    <img
                      src={item.cover_image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                  </div>
                )}

                <div className="p-6 sm:p-7 space-y-5">
                  {/* TOP META BAR */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.is_pinned && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 text-white font-bold text-[11px] shadow-2xs">
                          <Pin className="h-3 w-3 fill-current" /> Pinned Top
                        </span>
                      )}

                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${pStyle.badge}`}>
                        {pStyle.icon}
                        <span>{pStyle.dot}</span>
                      </span>

                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200/60">
                        Audience: <strong className="capitalize text-slate-900">{item.audience}</strong>
                      </span>

                      {item.is_hidden && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 text-[11px] font-semibold">
                          <EyeOff className="h-3 w-3" /> Hidden from Members
                        </span>
                      )}
                    </div>

                    {/* ADMIN ACTIONS DROPDOWN */}
                    {isOwner && (
                      <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200/70">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleTogglePin(item.id)}
                          title={item.is_pinned ? 'Unpin' : 'Pin to Top'}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${item.is_pinned ? 'bg-amber-100 text-amber-700' : 'hover:bg-slate-200 text-slate-600'
                            }`}
                        >
                          <Pin className="h-3.5 w-3.5" />
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleToggleHide(item.id)}
                          title={item.is_hidden ? 'Make Visible' : 'Hide from Members'}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${item.is_hidden ? 'bg-slate-200 text-slate-800' : 'hover:bg-slate-200 text-slate-600'
                            }`}
                        >
                          {item.is_hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setDeleteConfirmation({ id: item.id, title: item.title })}
                          title="Delete Announcement"
                          className="p-1.5 rounded-lg hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </motion.button>
                      </div>
                    )}
                  </div>

                  {/* TITLE & AUTHOR */}
                  <div className="space-y-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
                      {item.title}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{item.author_name}</span>
                      <span>•</span>
                      <span>{new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>

                  {/* CONTENT BODY WITH 50-WORD TRUNCATION */}
                  {(() => {
                    const words = item.content.trim().split(/\s+/);
                    const isLong = words.length > 50;
                    const isExpanded = expandedItems[item.id];
                    const displayContent = isLong && !isExpanded
                      ? words.slice(0, 50).join(' ') + '...'
                      : item.content;

                    return (
                      <div className="space-y-2">
                        <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line border-l-2 border-brand-200 pl-4 py-0.5">
                          {displayContent}
                        </div>

                        {isLong && (
                          <div className="pl-4">
                            <button
                              type="button"
                              onClick={() => toggleExpandItem(item.id)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:text-brand-800 transition-colors cursor-pointer"
                            >
                              <span>{isExpanded ? 'Show Less' : 'Read More'}</span>
                              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* EVENT ANNOUNCEMENT CARD */}
                  {item.event_details && (
                    <div className="bg-gradient-to-r from-brand-50 to-slate-50 border border-brand-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-brand-900 uppercase tracking-wider">
                          <Calendar className="h-4 w-4 text-brand-700" /> Event Schedule & Location
                        </div>
                        <a
                          href={generateGoogleCalendarUrl(item.event_details, item.title)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 bg-white hover:bg-brand-50 text-brand-700 border border-brand-200 font-semibold px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer shadow-2xs"
                        >
                          <Calendar className="h-3.5 w-3.5" /> Add to Google Calendar
                        </a>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        {item.event_details.date && (
                          <div className="flex items-center gap-2 text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200/60">
                            <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                            <span className="font-semibold">{item.event_details.date}</span>
                          </div>
                        )}
                        {item.event_details.time && (
                          <div className="flex items-center gap-2 text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200/60">
                            <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                            <span className="font-semibold">{item.event_details.time}</span>
                          </div>
                        )}
                        {item.event_details.location && (
                          <div className="flex items-center gap-2 text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200/60">
                            <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                            <span className="font-semibold truncate">{item.event_details.location}</span>
                          </div>
                        )}
                        {item.event_details.meet_url && (
                          <a
                            href={item.event_details.meet_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 text-brand-700 font-bold bg-white p-2.5 rounded-xl border border-brand-200 hover:bg-brand-50 transition-colors truncate"
                          >
                            <Video className="h-4 w-4 text-brand-600 shrink-0" />
                            <span className="truncate">Join Video Meeting</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* POLL CARD */}
                  {item.poll && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                        <BarChart2 className="h-4 w-4 text-brand-700" /> Interactive Poll: {item.poll.question}
                      </div>

                      <div className="space-y-2.5">
                        {(() => {
                          const totalVotes = item.poll.options.reduce((sum, opt) => sum + (opt.votes?.length || 0), 0);
                          return item.poll.options.map((opt) => {
                            const voteCount = opt.votes?.length || 0;
                            const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                            const hasVoted = opt.votes?.includes(user?.id || '');

                            return (
                              <button
                                key={opt.id}
                                onClick={() => handleVotePoll(item.id, opt.id)}
                                className={`w-full text-left p-3 rounded-xl border transition-all relative overflow-hidden cursor-pointer ${hasVoted
                                    ? 'border-brand-600 bg-brand-50/40 ring-1 ring-brand-500/30'
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                  }`}
                              >
                                {/* Progress Fill */}
                                <div
                                  className="absolute top-0 left-0 bottom-0 bg-brand-200/50 transition-all duration-500 pointer-events-none"
                                  style={{ width: `${percentage}%` }}
                                />
                                <div className="relative z-10 flex items-center justify-between text-xs">
                                  <span className="font-semibold text-slate-800 flex items-center gap-2">
                                    {hasVoted && <CheckCircle2 className="h-3.5 w-3.5 text-brand-600 shrink-0" />}
                                    {opt.text}
                                  </span>
                                  <span className="font-bold text-slate-600">
                                    {percentage}% ({voteCount})
                                  </span>
                                </div>
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}

                  {/* ACKNOWLEDGMENT & METRICS BAR */}
                  <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                    {/* Acknowledge Button */}
                    <div className="flex items-center gap-3">
                      <motion.button
                        whileHover={{ scale: 1.04, y: -1 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => handleAcknowledge(item.id)}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${isAcknowledged
                            ? 'bg-emerald-600 text-white shadow-emerald-600/20 hover:bg-emerald-700'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                          }`}
                      >
                        <CheckCircle2 className={`h-4 w-4 ${isAcknowledged ? 'text-white' : 'text-slate-500'}`} />
                        <span>{isAcknowledged ? 'Acknowledged ✓' : 'I Have Read This'}</span>
                      </motion.button>

                      {isOwner && (
                        <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/60">
                          {ackCount} Acknowledged
                        </span>
                      )}
                    </div>

                    {/* EMOJI REACTIONS BAR */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                      {['👍', '❤️', '🎉', '👏', '😄'].map((emoji) => {
                        const userList = item.reactions?.[emoji] || [];
                        const count = userList.length;
                        const userReacted = userList.includes(user?.id || '');

                        return (
                          <motion.button
                            key={emoji}
                            whileHover={{ scale: 1.2, y: -2 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleReaction(item.id, emoji)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${userReacted
                                ? 'bg-brand-50 text-brand-800 border-brand-300 shadow-xs'
                                : 'bg-white hover:bg-slate-100 hover:border-slate-300 text-slate-600 border-slate-200'
                              }`}
                          >
                            <span>{emoji}</span>
                            {count > 0 && <span>{count}</span>}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* CREATE ANNOUNCEMENT MODAL (OWNER / ADMIN ONLY) */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white max-w-2xl w-full rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-brand-950 to-slate-900 p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-brand-600 text-white">
                    <Megaphone className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Broadcast New Announcement</h3>
                    <p className="text-xs text-slate-300">Owner & Admin Exclusive Communication Portal</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateAnnouncement} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                {/* PRESET TEMPLATES */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Quick Templates (Click to apply)
                  </label>
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => applyTemplate(tpl)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-brand-50 hover:text-brand-800 text-slate-700 text-xs font-semibold border border-slate-200 transition-all cursor-pointer whitespace-nowrap"
                      >
                        <span>{tpl.icon}</span>
                        <span>{tpl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* TITLE */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Announcement Title <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Q3 Company Strategy & All-Hands Meeting"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-700 transition-all"
                  />
                </div>

                {/* PRIORITY & AUDIENCE GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Priority Level <span className="text-red-500 font-bold">*</span>
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-700"
                    >
                      <option value="normal">🟢 Normal</option>
                      <option value="important">🟠 Important</option>
                      <option value="critical">🔴 Critical</option>
                      <option value="info">🔵 Information</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Audience Selection <span className="text-red-500 font-bold">*</span>
                    </label>
                    <select
                      value={audience}
                      onChange={(e) => setAudience(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-700"
                    >
                      <option value="everyone">Everyone (Entire Workspace)</option>
                      <option value="team">Specific Squad / Team</option>
                    </select>
                  </div>
                </div>

                {/* TARGET TEAM IF AUDIENCE === TEAM */}
                {audience === 'team' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Select Target Squad <span className="text-red-500 font-bold">*</span>
                    </label>
                    <select
                      required
                      value={targetTeamId}
                      onChange={(e) => setTargetTeamId(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-700"
                    >
                      <option value="" disabled>Select Squad...</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* COVER IMAGE FILE UPLOAD & PREVIEW */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Banner Cover Photo <span className="text-red-500 font-bold">*</span> (Max 5MB • Image Files Only)
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="url"
                      required
                      placeholder="https://images.unsplash.com/photo-..."
                      value={coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-700"
                    />
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors shrink-0">
                      {uploadingCover ? (
                        <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
                      ) : (
                        <Upload className="h-4 w-4 text-slate-600" />
                      )}
                      <span>{uploadingCover ? 'Uploading...' : 'Upload File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverFileUpload}
                        disabled={uploadingCover}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* CONTENT BODY */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Content Body <span className="text-red-500 font-bold">*</span>
                  </label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Draft the announcement details, policy notes, or release summary..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-700 resize-none"
                  />
                </div>

                {/* PIN TO TOP TOGGLE */}
                <div className="flex items-center gap-2 bg-amber-50/60 p-3 rounded-2xl border border-amber-200/80">
                  <input
                    type="checkbox"
                    id="pinCheckbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <label htmlFor="pinCheckbox" className="text-xs font-bold text-amber-900 cursor-pointer flex items-center gap-1.5">
                    <Pin className="h-4 w-4 text-amber-600" />
                    Pin this announcement to top of workspace feed
                  </label>
                </div>

                {/* OPTIONAL EVENT SCHEDULER SECTION */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-brand-600" /> Attach Calendar Event & Meeting Link
                    </label>
                    <input
                      type="checkbox"
                      checked={enableEvent}
                      onChange={(e) => setEnableEvent(e.target.checked)}
                      className="h-4 w-4 text-brand-600 rounded cursor-pointer"
                    />
                  </div>

                  {enableEvent && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      <input
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                      />
                      <input
                        type="time"
                        value={eventTime}
                        onChange={(e) => setEventTime(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Location / Room e.g. Main Hall"
                        value={eventLocation}
                        onChange={(e) => setEventLocation(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                      />
                      <input
                        type="url"
                        placeholder="Google Meet Link (https://meet.google.com/...)"
                        value={eventMeetUrl}
                        onChange={(e) => setEventMeetUrl(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                      />
                    </div>
                  )}
                </div>

                {/* OPTIONAL POLL BUILDER SECTION */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <BarChart2 className="h-4 w-4 text-brand-600" /> Create Live Member Poll
                    </label>
                    <input
                      type="checkbox"
                      checked={enablePoll}
                      onChange={(e) => setEnablePoll(e.target.checked)}
                      className="h-4 w-4 text-brand-600 rounded cursor-pointer"
                    />
                  </div>

                  {enablePoll && (
                    <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      <input
                        type="text"
                        placeholder="Poll Question e.g. Where should we host the meetup?"
                        value={pollQuestion}
                        onChange={(e) => setPollQuestion(e.target.value)}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                      />

                      <div className="space-y-2">
                        {pollOptions.map((opt, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder={`Option ${idx + 1}`}
                              value={opt}
                              onChange={(e) => {
                                const next = [...pollOptions];
                                next[idx] = e.target.value;
                                setPollOptions(next);
                              }}
                              className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white"
                            />
                            {pollOptions.length > 2 && (
                              <button
                                type="button"
                                onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => setPollOptions([...pollOptions, `Option ${pollOptions.length + 1}`])}
                          className="text-xs font-bold text-brand-700 hover:text-brand-800 flex items-center gap-1 cursor-pointer pt-1"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add Choice
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* MODAL ACTIONS */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="px-6 py-2.5 bg-brand-700 hover:bg-brand-800 text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer flex items-center gap-2"
                  >
                    {createLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Publish Announcement
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deleteConfirmation && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white max-w-md w-full rounded-3xl p-6 border border-red-100 shadow-2xl space-y-5"
            >
              <div className="flex items-center gap-3.5">
                <div className="bg-red-100/80 p-3 rounded-2xl text-red-600 shrink-0">
                  <Trash2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg">Delete Announcement?</h3>
                  <p className="text-xs text-slate-500 font-medium">Permanent Action Warning</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                Are you sure you want to delete <strong className="text-slate-900 font-bold">"{deleteConfirmation.title}"</strong>? This will permanently remove this broadcast, its poll results, and member acknowledgments from the workspace.
              </p>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmation(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer border border-slate-200/80"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={confirmDeleteAnnouncement}
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md shadow-red-600/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {deleteLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      <span>Yes, Delete</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
