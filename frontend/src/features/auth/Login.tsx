import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { api } from '../../lib/api';
import { Sparkles, Loader2, ArrowRight, Building, ArrowLeft, WifiOff, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { SignIn, useAuth, useUser } from '@clerk/clerk-react';

const onboardingSchema = zod.object({
  workspace_name: zod.string().min(2, 'Workspace name must be at least 2 characters'),
  workspace_slug: zod
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and hyphens'),
});

type OnboardingFormValues = zod.infer<typeof onboardingSchema>;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Clerk hooks
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user: clerkUser } = useUser();

  // Onboarding UI state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Dev Offline Fallback state
  const [showDevFallback, setShowDevFallback] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
  });

  const watchWorkspaceName = watch('workspace_name');

  // Auto-generate slug from workspace name
  useEffect(() => {
    if (watchWorkspaceName) {
      const generatedSlug = watchWorkspaceName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setValue('workspace_slug', generatedSlug, { shouldValidate: true });
    }
  }, [watchWorkspaceName, setValue]);

  // Dev fallback timer (triggers if Clerk fails to load in 4 seconds)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isLoaded) {
        setShowDevFallback(true);
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [isLoaded]);

  // Sync Clerk session with backend
  useEffect(() => {
    const syncUser = async () => {
      // Determine if we should attempt sync (either real Clerk session or Dev Mode)
      const shouldSync = (isLoaded && isSignedIn) || isDevMode;

      if (shouldSync && !isAuthenticated && !syncing && !showOnboarding && !errorMsg) {
        setSyncing(true);
        setErrorMsg('');
        try {
          const token = isDevMode ? "mock_clerk_token" : await getToken();
          if (!token) return;

          const response = await api.post('/auth/clerk', { token });
          const data = response.data;
          
          if (data.registered) {
            const resData = data.token;
            setAuth(
              {
                id: resData.user_id,
                email: resData.email,
                full_name: resData.full_name,
                role: resData.role,
                status: 'active',
                workspace_id: resData.workspace_id,
              },
              resData.access_token,
              {
                id: resData.workspace_id,
                name: resData.workspace_name,
                slug: resData.workspace_slug,
                settings: resData.workspace_settings || {},
              }
            );
            navigate('/dashboard');
          } else {
            // Need onboarding workspace setup
            setShowOnboarding(true);
          }
        } catch (err: any) {
          setErrorMsg(err.response?.data?.detail || 'Failed to authenticate with backend.');
        } finally {
          setSyncing(false);
        }
      }
    };
    syncUser();
  }, [isLoaded, isSignedIn, isAuthenticated, syncing, showOnboarding, errorMsg, isDevMode, getToken, setAuth, navigate]);

  // Onboarding submit
  const onOnboardSubmit = async (data: OnboardingFormValues) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const token = isDevMode ? "mock_clerk_token" : await getToken();
      if (!token) throw new Error('Clerk session token not found.');

      const response = await api.post('/auth/clerk/signup', {
        token,
        workspace_name: data.workspace_name,
        workspace_slug: data.workspace_slug,
      });
      const resData = response.data;
      setAuth(
        {
          id: resData.user_id,
          email: resData.email,
          full_name: resData.full_name,
          role: resData.role,
          status: 'active',
          workspace_id: resData.workspace_id,
        },
        resData.access_token,
        {
          id: resData.workspace_id,
          name: resData.workspace_name,
          slug: resData.workspace_slug,
          settings: resData.workspace_settings || {},
        }
      );
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to create workspace.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableDevMode = () => {
    setIsDevMode(true);
    setErrorMsg('');
  };

  const activeUser = isDevMode
    ? { fullName: "Local Developer", emailAddresses: [{ emailAddress: "clerk_user@acme.com" }] }
    : clerkUser;

  // Onboarding view
  if (showOnboarding && activeUser) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-gradient-to-tr from-brand-100 via-white to-coffee-light">
        <div className="max-w-md w-full animate-fade-in">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="bg-brand-700 p-2 rounded-lg flex items-center justify-center shadow-md">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-900">Nurevo</span>
          </div>

          <div className="glass-card p-8 border border-white/50 relative bg-white rounded-2xl shadow-xl">
            <button
              onClick={() => {
                setShowOnboarding(false);
                setIsDevMode(false);
              }}
              className="absolute left-6 top-6 text-gray-500 hover:text-gray-900 flex items-center gap-1 text-xs"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            <div className="text-center mb-6 mt-4">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Create Workspace</h2>
              <p className="text-gray-500 text-xs mt-1">
                Welcome, <span className="font-semibold text-brand-700">{activeUser.fullName || 'User'}</span>! Please set up a workspace to complete your registration.
              </p>
            </div>

            {errorMsg && (
              <div className="w-full bg-red-50 text-red-700 border-l-4 border-red-500 p-3 rounded-r-lg mb-4 text-xs flex flex-col gap-2">
                <span>{errorMsg}</span>
                <button
                  onClick={() => setErrorMsg('')}
                  className="self-start text-[10px] bg-red-100 hover:bg-red-200 text-red-800 font-bold px-2 py-1 rounded transition-all"
                >
                  Retry Synchronization
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit(onOnboardSubmit)} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Company / Organization Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    {...register('workspace_name')}
                    placeholder="Acme Corp"
                    className={`w-full pl-11 pr-4 py-2.5 rounded-xl border ${
                      errors.workspace_name ? 'border-red-400' : 'border-gray-200'
                    } bg-white focus:outline-none focus:ring-2 focus:ring-brand-700/10 transition-all`}
                  />
                  <Building className="absolute left-4 top-3.5 h-4 w-4 text-gray-400" />
                </div>
                {errors.workspace_name && (
                  <p className="text-xs text-red-500 mt-1">{errors.workspace_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Workspace URL Slug
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-gray-400 text-sm select-none">nurevo.com/</span>
                  <input
                    type="text"
                    {...register('workspace_slug')}
                    placeholder="acme"
                    className={`w-full pl-[98px] pr-4 py-2.5 rounded-xl border ${
                      errors.workspace_slug ? 'border-red-400' : 'border-gray-200'
                    } bg-white focus:outline-none focus:ring-2 focus:ring-brand-700/10 transition-all text-sm`}
                  />
                </div>
                {errors.workspace_slug && (
                  <p className="text-xs text-red-500 mt-1">{errors.workspace_slug.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-700 hover:bg-brand-800 text-white font-semibold py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Setting Up...
                  </>
                ) : (
                  <>
                    Create Workspace
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Loading view with Developer Fallback Mode option
  if (!isLoaded && !isDevMode) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-gradient-to-tr from-brand-100 via-white to-coffee-light">
        <div className="max-w-md w-full text-center flex flex-col items-center">
          <Loader2 className="h-10 w-10 text-brand-700 animate-spin mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-1">Loading Clerk Authentication...</h3>
          <p className="text-gray-500 text-xs max-w-xs mb-6">
            Waiting for Clerk script to download and initialize from Clerk's servers.
          </p>

          {showDevFallback && (
            <div className="glass-card p-6 border border-yellow-250 bg-yellow-50/50 rounded-2xl shadow-lg w-full animate-fade-in">
              <div className="flex justify-center mb-3">
                <WifiOff className="h-8 w-8 text-yellow-700" />
              </div>
              <h4 className="text-sm font-bold text-yellow-900 mb-1">Are you offline?</h4>
              <p className="text-xs text-yellow-800 mb-4 leading-relaxed">
                Clerk is taking longer than usual to load. You can bypass the remote server and authenticate in Local Developer Mode using a mock session token.
              </p>
              <button
                onClick={handleEnableDevMode}
                className="w-full bg-yellow-700 hover:bg-yellow-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <ShieldAlert className="h-4 w-4" />
                Enable Local Developer Mode
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Standard login view
  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-gradient-to-tr from-brand-100 via-white to-coffee-light">
      <div className="max-w-md w-full animate-fade-in flex flex-col items-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="bg-brand-700 p-2 rounded-lg flex items-center justify-center shadow-md">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-gray-900">Nurevo</span>
        </div>

        {errorMsg && (
          <div className="w-full bg-red-50 text-red-700 border-l-4 border-red-500 p-3 rounded-r-lg mb-4 text-xs flex flex-col gap-2">
            <span>{errorMsg}</span>
            <button
              onClick={() => setErrorMsg('')}
              className="self-start text-[10px] bg-red-100 hover:bg-red-200 text-red-800 font-bold px-2 py-1 rounded transition-all"
            >
              Retry Synchronization
            </button>
          </div>
        )}

        {(syncing || isDevMode) && (
          <div className="w-full bg-brand-50 text-brand-800 border-l-4 border-brand-500 p-3 rounded-r-lg mb-4 text-xs flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-brand-700" />
            {isDevMode ? "Logging in using local mock credentials..." : "Synchronizing Clerk session with Nurevo database..."}
          </div>
        )}

        {!isDevMode && !isSignedIn && (
          <SignIn
            signUpUrl="/auth/signup"
            fallbackRedirectUrl="/auth/login"
            forceRedirectUrl="/auth/login"
            appearance={{
              variables: {
                colorPrimary: '#854d0e',
              },
              elements: {
                cardBox: 'w-full max-w-md shadow-xl border border-gray-100 rounded-2xl overflow-hidden',
                headerTitle: 'text-2xl font-bold tracking-tight text-gray-900',
                headerSubtitle: 'text-gray-500 text-xs mt-1',
                footerActionLink: 'text-brand-700 font-bold hover:underline hover:text-brand-800',
              },
            }}
          />
        )}
      </div>
    </div>
  );
}
