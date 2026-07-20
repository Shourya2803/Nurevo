import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Lenis from 'lenis';
import {
  FileText,
  Sparkles,
  Shield,
  Zap,
  Cpu,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Globe,
  Lock,
  Star,
  Check
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

import BackgroundMeshCanvas from './BackgroundMeshCanvas';
import HeroCanvas from './HeroCanvas';
import Feature3DCanvas from './Feature3DCanvas';
import AIBrainCanvas from './AIBrainCanvas';

// Framer Motion Scroll-Driven Animation Variants
const fadeInUp = {
  initial: { opacity: 0, y: 40, filter: 'blur(8px)' },
  whileInView: { opacity: 1, y: 0, filter: 'blur(0px)' },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] as [number, number, number, number] }
};

const staggerContainer = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true, margin: '-60px' },
  transition: { staggerChildren: 0.12, delayChildren: 0.1 }
};

export default function LandingPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [activeWorkflowStep, setActiveWorkflowStep] = useState(0);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeFeatureCategory, setActiveFeatureCategory] = useState<'all' | 'ai' | 'collab' | 'security'>('all');

  // Initialize Lenis smooth scroll
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  const handleLaunch = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/auth/login');
    }
  };

  const workflowSteps = [
    {
      step: '01',
      title: 'Multi-Format Ingestion',
      desc: 'Seamlessly upload PDFs, Office documents, images, ZIP files, and markdown notes directly to secure cloud storage.',
      icon: FileText,
      tag: 'Automatic Processing'
    },
    {
      step: '02',
      title: 'Neural OCR & Vector Extraction',
      desc: 'Nurevo AI extracts textual data, structural tables, and metadata, generating dense vector embeddings in milliseconds.',
      icon: Cpu,
      tag: 'AI Embeddings'
    },
    {
      step: '03',
      title: 'RBAC Squad Categorization',
      desc: 'Assign target roles, squad permissions, and workspace security levels automatically upon document upload.',
      icon: Shield,
      tag: 'Role Protection'
    },
    {
      step: '04',
      title: 'Workspace Broadcasts & Search',
      desc: 'Broadcast critical updates to target teams with rich-text notifications, interactive polls, and instant semantic RAG query.',
      icon: Zap,
      tag: 'Real-time Intelligence'
    }
  ];

  const features = [
    {
      id: '01',
      type: 'ocr' as const,
      category: 'ai' as const,
      title: 'Neural OCR & Vision Extraction',
      description: 'Extract handwritten notes, tabular data, and scanned PDFs with 99.9% accuracy using deep neural vision models.',
      badge: 'Vision AI',
      metric: '99.9% Accuracy'
    },
    {
      id: '02',
      type: 'search' as const,
      category: 'ai' as const,
      title: 'Instant Semantic RAG Search',
      description: 'Search across millions of workspace documents in 0.4 seconds. Query with natural language questions.',
      badge: 'RAG Vector Index',
      metric: '0.4s Latency'
    },
    {
      id: '03',
      type: 'workflow' as const,
      category: 'collab' as const,
      title: 'Automated Squad Workflows',
      description: 'Trigger approvals, broadcasts, and notification digests automatically when new documents are published.',
      badge: 'Automation',
      metric: 'Instant Sync'
    },
    {
      id: '04',
      type: 'version' as const,
      category: 'collab' as const,
      title: 'Immutable Version Lineage',
      description: 'Track document revisions, author changes, and complete audit history with cryptographic versioning.',
      badge: 'Audit Trail',
      metric: 'Full History'
    },
    {
      id: '05',
      type: 'security' as const,
      category: 'security' as const,
      title: 'Bank-Grade Vault Security',
      description: 'Multi-tenant database isolation, AES-256 bit encryption at rest, and strict RBAC policy enforcement.',
      badge: 'Enterprise Security',
      metric: 'AES-256 Bit'
    },
    {
      id: '06',
      type: 'cloud' as const,
      category: 'security' as const,
      title: 'Multi-Region Cloud Sync',
      description: 'Blazing-fast global content distribution powered by Supabase Storage and distributed cloud infrastructure.',
      badge: '99.99% Uptime',
      metric: 'Global Edge'
    }
  ];

  const filteredFeatures = features.filter((f) => {
    if (activeFeatureCategory === 'all') return true;
    return f.category === activeFeatureCategory;
  });

  const testimonials = [
    {
      quote: 'Nurevo transformed our engineering documentation workflow. Our team finds critical technical specs in seconds instead of hours.',
      name: 'Alexander Wright',
      role: 'VP of Engineering',
      company: 'Vercel Ecosystem',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    },
    {
      quote: 'The AI search and automated squad broadcast features are unmatched. It feels like Notion, Stripe, and OpenAI combined.',
      name: 'Elena Rostova',
      role: 'Head of Product',
      company: 'Linear Labs',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80'
    },
    {
      quote: 'Bank-grade RBAC isolation gave our legal compliance team 100% confidence to store confidential corporate contracts.',
      name: 'Marcus Vance',
      role: 'Chief Information Officer',
      company: 'FinTech Global',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
    }
  ];

  const faqs = [
    {
      q: 'How does Nurevo AI search documents so fast?',
      a: 'Nurevo converts uploaded documents into high-dimensional vector embeddings upon ingestion. When you search, our vector engine performs instant semantic similarity matching across millions of vectors in under 0.4 seconds.'
    },
    {
      q: 'Is my company data used to train public AI models?',
      a: 'Absolutely not. All workspace documents, embeddings, and chat contexts are completely isolated to your tenant environment. We adhere to strict zero-retention and non-training compliance policies.'
    },
    {
      q: 'What document file types are supported?',
      a: 'Nurevo supports PDFs, Microsoft Office files (DOCX, XLSX, PPTX), plain text, markdown, CSV, images (JPEG, PNG, WebP), and ZIP archives up to 50MB per file.'
    },
    {
      q: 'Can I restrict document access to specific teams or roles?',
      a: 'Yes. Nurevo features multi-level RBAC (Owner, Lead, Member) alongside target squad filtering. You can publish documents exclusively to designated engineering, sales, or management teams.'
    },
    {
      q: 'How does the document approval workflow function?',
      a: 'Members can submit documents in "Pending Approval" state. Workspace Leads or Owners receive instant notifications to review, approve, or reject submissions before they go live workspace-wide.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 via-white to-amber-100/30 text-slate-800 font-sans selection:bg-brand-500/20 selection:text-brand-900 relative overflow-x-hidden">
      {/* 3D Global Animated Background Mesh */}
      <BackgroundMeshCanvas />

      {/* FIXED GLASS HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/85 border-b border-amber-900/10 shadow-xs transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-brand-900 via-brand-700 to-amber-600 p-0.5 shadow-md shadow-brand-900/15">
              <div className="h-full w-full bg-white rounded-[14px] flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-brand-700 animate-pulse" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight text-brand-950">
                NUREVO
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-brand-700">
                Document OS
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600">
            <a href="#features" className="hover:text-brand-900 transition-colors">Features</a>
            <a href="#workflow" className="hover:text-brand-900 transition-colors">Workflow</a>
            <a href="#ai-engine" className="hover:text-brand-900 transition-colors">AI Engine</a>
            <a href="#security" className="hover:text-brand-900 transition-colors">Security</a>
            <a href="#pricing" className="hover:text-brand-900 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-brand-900 transition-colors">FAQ</a>
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/auth/login')}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-brand-900 hover:bg-slate-100 transition-all cursor-pointer"
            >
              Sign In
            </button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLaunch}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-900 via-brand-700 to-brand-600 hover:from-brand-800 hover:to-brand-500 text-white shadow-md shadow-brand-950/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <span>{isAuthenticated ? 'Go to Dashboard' : 'Launch Platform'}</span>
              <ArrowRight className="h-4 w-4" />
            </motion.button>
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-24 space-y-32">
        {/* ======================================================
            HERO SECTION (SCROLL ANIMATED)
           ====================================================== */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center min-h-[calc(100vh-80px)]">
          {/* Left Column: Heading & CTAs */}
          <motion.div
            initial={{ opacity: 0, x: -40, filter: 'blur(8px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="lg:col-span-7 space-y-8"
          >
            {/* Glowing Warm Pill */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-brand-100/80 border border-brand-200 text-xs font-semibold text-brand-900 backdrop-blur-md shadow-xs">
              <span className="flex h-2 w-2 rounded-full bg-brand-600 animate-ping" />
              <span>Nurevo 3.0 Platform Release</span>
              <span className="text-slate-400">•</span>
              <span className="text-brand-700 font-bold">AI Document Intelligence</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] text-brand-950">
              Manage Every Document with{' '}
              <span className="bg-gradient-to-r from-brand-900 via-brand-700 to-amber-700 bg-clip-text text-transparent">
                AI Precision
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
              Transform unstructured contracts, technical specs, and team knowledge into instant semantic insights. Enforce bank-grade RBAC, automated squad broadcasts, and zero-latency search.
            </p>

            {/* CTA Group */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleLaunch}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-900 via-brand-800 to-brand-700 hover:from-brand-800 hover:to-brand-600 text-white font-extrabold text-sm shadow-xl shadow-brand-950/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span>Start Free Workspace Trial</span>
                <ArrowRight className="h-4 w-4" />
              </motion.button>

              <a
                href="#dashboard-preview"
                className="px-8 py-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-sm shadow-xs backdrop-blur-md flex items-center justify-center gap-2 cursor-pointer transition-all text-center"
              >
                <span>Explore Live Product Demo</span>
              </a>
            </div>

            {/* Social Proof Badges */}
            <div className="pt-6 border-t border-slate-200/80 space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                TRUSTED BY LEADING SaaS & ENTERPRISE TEAMS
              </p>
              <div className="flex items-center gap-8 text-slate-500 font-extrabold text-sm opacity-80 flex-wrap">
                <span>VERCEL</span>
                <span>LINEAR</span>
                <span>NOTION</span>
                <span>STRIPE</span>
                <span>OPENAI</span>
                <span>RAMP</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: 3D Interactive Ecosystem Canvas */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="lg:col-span-5 relative"
          >
            <div className="absolute inset-0 bg-brand-200/30 rounded-3xl blur-3xl pointer-events-none" />
            <HeroCanvas />
          </motion.div>
        </section>

        {/* SECTION DIVIDER */}
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="h-px bg-gradient-to-r from-transparent via-brand-300/60 to-transparent" />
        </div>

        {/* ======================================================
            6-CARD FEATURE GRID (SCROLL-REVEALED)
           ====================================================== */}
        <motion.section
          id="features"
          {...fadeInUp}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12"
        >
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-100 border border-brand-200 text-xs font-bold text-brand-900">
              <Sparkles className="h-3.5 w-3.5 text-brand-700 animate-spin" />
              <span>REVOLUTIONARY CAPABILITIES</span>
            </div>
            <h3 className="text-3xl sm:text-5xl font-extrabold text-brand-950 tracking-tight">
              Built for High-Velocity Modern Workspaces
            </h3>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Every component is engineered for speed, privacy, and seamless team collaboration across the document lifecycle.
            </p>

            {/* Interactive Category Filter Pills */}
            <div className="flex items-center justify-center gap-2 pt-4 flex-wrap">
              {[
                { id: 'all', label: 'All Capabilities' },
                { id: 'ai', label: 'AI & Vision' },
                { id: 'collab', label: 'Squad Collaboration' },
                { id: 'security', label: 'Vault & Security' }
              ].map((tab) => {
                const active = activeFeatureCategory === tab.id;
                return (
                  <motion.button
                    key={tab.id}
                    whileHover={{ scale: 1.05, y: -1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveFeatureCategory(tab.id as any)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      active
                        ? 'bg-brand-900 text-white shadow-md shadow-brand-950/20 ring-1 ring-brand-700'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {tab.label}
                  </motion.button>
                );
              })}
            </div>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {filteredFeatures.map((feat) => (
                <motion.div
                  key={feat.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  whileHover={{ y: -6 }}
                  className="bg-white/90 backdrop-blur-xl border border-amber-900/10 hover:border-brand-400 rounded-3xl p-6 space-y-4 group transition-all duration-300 relative overflow-hidden shadow-sm hover:shadow-xl hover:shadow-brand-950/10 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-brand-700 tracking-wider font-mono">
                      {feat.id}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-brand-100 text-brand-900 border border-brand-200">
                      {feat.badge}
                    </span>
                  </div>

                  {/* 3D Mini Scene */}
                  <Feature3DCanvas type={feat.type} />

                  <div className="space-y-2">
                    <h4 className="text-lg font-bold text-slate-900 group-hover:text-brand-800 transition-colors">
                      {feat.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {feat.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span className="text-brand-800 font-bold">{feat.metric}</span>
                    <span className="group-hover:translate-x-1 transition-transform text-brand-700 flex items-center gap-1 font-bold">
                      Explore Spec <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </motion.section>

        {/* ======================================================
            WORKFLOW STEP TIMELINE (SCROLL-REVEALED)
           ====================================================== */}
        <motion.section
          id="workflow"
          {...fadeInUp}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12"
        >
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-brand-700">
              END-TO-END AUTOMATION
            </h2>
            <h3 className="text-3xl sm:text-5xl font-extrabold text-brand-950 tracking-tight">
              How Nurevo Powers Your Document Pipeline
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Steps Selection List */}
            <div className="lg:col-span-5 space-y-4">
              {workflowSteps.map((s, idx) => {
                const Icon = s.icon;
                const isActive = activeWorkflowStep === idx;
                return (
                  <motion.div
                    key={idx}
                    onClick={() => setActiveWorkflowStep(idx)}
                    whileHover={{ scale: 1.02 }}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
                      isActive
                        ? 'bg-white border-brand-500 shadow-md ring-2 ring-brand-500/10'
                        : 'bg-white/60 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-3 rounded-xl ${isActive ? 'bg-brand-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-brand-700">{s.step}</span>
                        <h4 className="text-sm font-bold text-slate-900">{s.title}</h4>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{s.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Step Interactive Visual Display */}
            <div className="lg:col-span-7 bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-8 space-y-6 relative overflow-hidden min-h-[380px] flex flex-col justify-center shadow-lg">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <FileText className="h-48 w-48 text-brand-700" />
              </div>

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-100 border border-brand-200 text-xs font-bold text-brand-900 w-fit">
                <span>{workflowSteps[activeWorkflowStep].tag}</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {workflowSteps[activeWorkflowStep].title}
              </h3>

              <p className="text-sm text-slate-600 leading-relaxed max-w-lg">
                {workflowSteps[activeWorkflowStep].desc}
              </p>

              <div className="pt-4 flex items-center gap-6 text-xs text-slate-600 font-semibold border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Zero Data Leakage</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Automated RBAC Guards</span>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ======================================================
            LIVE DASHBOARD PREVIEW (SCROLL-REVEALED)
           ====================================================== */}
        <motion.section
          id="dashboard-preview"
          {...fadeInUp}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8"
        >
          <div className="text-center space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-brand-700">
              UNMATCHED UX & VISUAL PARITY
            </h2>
            <h3 className="text-3xl sm:text-5xl font-extrabold text-brand-950 tracking-tight">
              Designed for Speed, Polish, & Precision
            </h3>
          </div>

          <div className="bg-white/95 backdrop-blur-2xl border border-slate-200 rounded-3xl p-4 sm:p-8 shadow-xl space-y-8 relative overflow-hidden">
            {/* Header bar of preview mockup */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-amber-400" />
                  <div className="h-3 w-3 rounded-full bg-emerald-400" />
                </div>
                <span className="text-xs font-bold text-slate-500">app.nurevo.io/dashboard</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live Workspace Active
                </span>
              </div>
            </div>

            {/* Stat Counters Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-brand-50/50 border border-brand-100 rounded-2xl p-4">
                <span className="text-xs text-slate-500 font-semibold">Indexed Documents</span>
                <p className="text-2xl font-black text-brand-950 mt-1">10.4M+</p>
              </div>
              <div className="bg-brand-50/50 border border-brand-100 rounded-2xl p-4">
                <span className="text-xs text-slate-500 font-semibold">OCR Vision Accuracy</span>
                <p className="text-2xl font-black text-brand-800 mt-1">99.99%</p>
              </div>
              <div className="bg-brand-50/50 border border-brand-100 rounded-2xl p-4">
                <span className="text-xs text-slate-500 font-semibold">Vector Query Latency</span>
                <p className="text-2xl font-black text-amber-700 mt-1">0.4s</p>
              </div>
              <div className="bg-brand-50/50 border border-brand-100 rounded-2xl p-4">
                <span className="text-xs text-slate-500 font-semibold">RBAC Isolation</span>
                <p className="text-2xl font-black text-emerald-700 mt-1">100%</p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ======================================================
            AI ENGINE SECTION (SCROLL-REVEALED)
           ====================================================== */}
        <motion.section
          id="ai-engine"
          {...fadeInUp}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center"
        >
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs font-extrabold uppercase tracking-widest text-brand-700">
              NUREVO NEURAL ENGINE
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-brand-950 tracking-tight">
              An AI Core Built for Contextual Comprehension
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Unlike generic search, Nurevo’s neural brain parses semantic relationships across PDFs, spreadsheets, and broadcasts. It extracts exact clause references, synthesizes executive summaries, and alerts target squads instantaneously.
            </p>
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
                <CheckCircle2 className="h-5 w-5 text-brand-700 shrink-0" />
                <span>RAG Vector Search across 100,000+ files simultaneously</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
                <CheckCircle2 className="h-5 w-5 text-brand-700 shrink-0" />
                <span>Automatic sentiment analysis & priority alert tagging</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
                <CheckCircle2 className="h-5 w-5 text-brand-700 shrink-0" />
                <span>Multi-language translation and tabular extraction</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 relative">
            <div className="bg-white/90 backdrop-blur-xl border border-slate-200 rounded-3xl p-6 relative overflow-hidden shadow-md">
              <AIBrainCanvas />
            </div>
          </div>
        </motion.section>

        {/* ======================================================
            BANK-GRADE SECURITY SECTION (SCROLL-REVEALED)
           ====================================================== */}
        <motion.section
          id="security"
          {...fadeInUp}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8"
        >
          <div className="bg-gradient-to-r from-brand-950 via-brand-900 to-brand-950 text-white rounded-3xl p-8 sm:p-12 space-y-8 relative overflow-hidden shadow-xl">
            <div className="max-w-2xl space-y-4">
              <span className="text-xs font-extrabold uppercase tracking-widest text-amber-400">
                BANK-GRADE GUARANTEE
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Enterprise Multi-Tenant Vault Security
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Your workspace documents are encrypted using AES-256 bit encryption at rest and TLS 1.3 in transit. Multi-tenant database policies ensure 0% cross-workspace leakage.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-white/10">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Lock className="h-4 w-4 text-amber-400" /> SOC2 Type II Certified
                </h4>
                <p className="text-xs text-slate-400">Audited operational security standards.</p>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Shield className="h-4 w-4 text-amber-400" /> Multi-Tenant Isolation
                </h4>
                <p className="text-xs text-slate-400">Strict database level workspace policy.</p>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Globe className="h-4 w-4 text-amber-400" /> GDPR & HIPAA Ready
                </h4>
                <p className="text-xs text-slate-400">Complete data sovereignty compliance.</p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ======================================================
            TESTIMONIALS (SCROLL-REVEALED)
           ====================================================== */}
        <motion.section
          {...fadeInUp}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12"
        >
          <div className="text-center space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-brand-700">
              CUSTOMER TESTIMONIALS
            </h2>
            <h3 className="text-3xl sm:text-5xl font-extrabold text-brand-950 tracking-tight">
              Loved by Engineering & Product Teams
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -6 }}
                className="bg-white/90 backdrop-blur-xl border border-slate-200 rounded-3xl p-6 space-y-6 flex flex-col justify-between shadow-sm hover:shadow-lg transition-all"
              >
                <div className="space-y-3">
                  <div className="flex gap-1 text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                    "{t.quote}"
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <img src={t.avatar} alt={t.name} className="h-10 w-10 rounded-full object-cover border border-brand-300" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{t.name}</h4>
                    <p className="text-[11px] text-slate-500">{t.role} • {t.company}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ======================================================
            PRICING TIERS (SCROLL-REVEALED)
           ====================================================== */}
        <motion.section
          id="pricing"
          {...fadeInUp}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12"
        >
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-brand-700">
              TRANSPARENT PRICING
            </h2>
            <h3 className="text-3xl sm:text-5xl font-extrabold text-brand-950 tracking-tight">
              Simple Plans for Workspaces of Any Size
            </h3>

            {/* Monthly / Annual Billing Toggle */}
            <div className="inline-flex items-center p-1 bg-slate-100 border border-slate-200 rounded-xl">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  billingCycle === 'monthly' ? 'bg-brand-900 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  billingCycle === 'annual' ? 'bg-brand-900 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                Annual (Save 20%)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {/* Starter Tier */}
            <div className="bg-white/90 backdrop-blur-xl border border-slate-200 rounded-3xl p-8 space-y-6 flex flex-col justify-between shadow-sm">
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Starter</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900">$0</span>
                  <span className="text-xs text-slate-500">/ forever free</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">Perfect for small project teams getting started.</p>
                <div className="space-y-2.5 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs text-slate-700">
                    <Check className="h-4 w-4 text-emerald-600" /> Up to 5 Squad Members
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700">
                    <Check className="h-4 w-4 text-emerald-600" /> 100 Documents & Scans
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700">
                    <Check className="h-4 w-4 text-emerald-600" /> Basic AI Search
                  </div>
                </div>
              </div>
              <button
                onClick={handleLaunch}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Get Started Free
              </button>
            </div>

            {/* Pro Tier (Popular) */}
            <div className="bg-gradient-to-b from-brand-950 to-brand-900 text-white border-2 border-brand-600 rounded-3xl p-8 space-y-6 flex flex-col justify-between relative shadow-xl">
              <div className="absolute -top-3.5 right-6 px-3 py-1 bg-amber-500 text-brand-950 font-extrabold text-[10px] uppercase rounded-full shadow-xs">
                MOST POPULAR
              </div>
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Pro Workspace</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">
                    {billingCycle === 'monthly' ? '$29' : '$23'}
                  </span>
                  <span className="text-xs text-slate-300">/ user / mo</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">Advanced AI intelligence and team broadcasts.</p>
                <div className="space-y-2.5 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2 text-xs text-slate-200">
                    <Check className="h-4 w-4 text-amber-400" /> Unlimited Squad Members
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-200">
                    <Check className="h-4 w-4 text-amber-400" /> Unlimited Documents & Vector Storage
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-200">
                    <Check className="h-4 w-4 text-amber-400" /> Priority Broadcasts & Interactive Polls
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-200">
                    <Check className="h-4 w-4 text-amber-400" /> Advanced Neural RAG Engine
                  </div>
                </div>
              </div>
              <button
                onClick={handleLaunch}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-brand-950 font-extrabold rounded-xl text-xs transition-all shadow-md cursor-pointer"
              >
                Start Pro 14-Day Free Trial
              </button>
            </div>

            {/* Enterprise Tier */}
            <div className="bg-white/90 backdrop-blur-xl border border-slate-200 rounded-3xl p-8 space-y-6 flex flex-col justify-between shadow-sm">
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Enterprise</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900">Custom</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">Dedicated VPC, custom SLA, and custom AI models.</p>
                <div className="space-y-2.5 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs text-slate-700">
                    <Check className="h-4 w-4 text-emerald-600" /> Dedicated Cloud Cluster
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700">
                    <Check className="h-4 w-4 text-emerald-600" /> Custom LLM & Embedding Models
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700">
                    <Check className="h-4 w-4 text-emerald-600" /> 24/7 Dedicated Support & SLA
                  </div>
                </div>
              </div>
              <button
                onClick={handleLaunch}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Contact Enterprise Sales
              </button>
            </div>
          </div>
        </motion.section>

        {/* ======================================================
            FAQ ACCORDION (SCROLL-REVEALED)
           ====================================================== */}
        <motion.section
          id="faq"
          {...fadeInUp}
          className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8"
        >
          <div className="text-center space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-brand-700">
              FREQUENTLY ASKED QUESTIONS
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-brand-950 tracking-tight">
              Everything You Need to Know
            </h3>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-white/90 backdrop-blur-xl border border-slate-200 rounded-2xl overflow-hidden transition-all shadow-xs"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left font-bold text-sm text-slate-900 flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`h-4 w-4 text-brand-700 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3"
                      >
                        {faq.a}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* ======================================================
            FINAL CTA PORTAL (SCROLL-REVEALED)
           ====================================================== */}
        <motion.section
          {...fadeInUp}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20"
        >
          <div className="bg-gradient-to-tr from-brand-950 via-brand-900 to-brand-800 text-white rounded-3xl p-10 sm:p-16 text-center space-y-8 relative overflow-hidden shadow-2xl">
            <div className="max-w-2xl mx-auto space-y-4 relative z-10">
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                Ready to Transform Your Workspace Documents?
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Join thousands of teams utilizing Nurevo AI for automated ingestion, bank-grade RBAC security, and workspace broadcasts.
              </p>
              <div className="pt-4 flex justify-center">
                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={handleLaunch}
                  className="px-10 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-brand-950 font-black text-sm shadow-xl cursor-pointer flex items-center gap-2"
                >
                  <span>Launch Nurevo Platform Now</span>
                  <ArrowRight className="h-4 w-4" />
                </motion.button>
              </div>
            </div>
          </div>
        </motion.section>
      </main>

      {/* MINIMAL FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500 font-semibold">
          <div className="flex items-center gap-2 text-slate-700">
            <Sparkles className="h-4 w-4 text-brand-700" />
            <span>© 2026 Nurevo SaaS Inc. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> All Systems Operational
            </span>
            <a href="#features" className="hover:text-slate-900">Privacy Policy</a>
            <a href="#security" className="hover:text-slate-900">Security Vault</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
