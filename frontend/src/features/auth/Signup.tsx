import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { api } from '../../lib/api';
import { Sparkles, Mail, Building, Globe, Loader2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const signupSchema = zod.object({
  full_name: zod.string().min(2, 'Name must be at least 2 characters'),
  email: zod.string().email('Invalid email address'),
  workspace_name: zod.string().min(2, 'Workspace name must be at least 2 characters'),
  workspace_slug: zod
    .string()
    .min(2, 'Subdomain slug must be at least 2 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
});

type SignupFormValues = zod.infer<typeof signupSchema>;

export default function Signup() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormValues) => {
    setLoading(true);
    setErrorMsg('');
    try {
      await api.post('/auth/signup', data);
      setSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'An error occurred during sign up.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-gradient-to-tr from-brand-100 via-white to-coffee-light">
        <div className="glass-card max-w-md w-full p-8 text-center border-t-4 border-brand-700 animate-slide-up">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-brand-100 text-brand-700 mb-6">
            <Mail className="h-8 w-8" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Check Your Inbox</h2>
          <p className="text-gray-600 mb-6 text-sm leading-relaxed">
            We sent a secure single-use magic login link to your email. Click the link to activate your workspace and complete setup.
          </p>
          <div className="bg-brand-50 rounded-xl p-4 border border-brand-200/50 mb-6 text-left">
            <h4 className="text-xs font-semibold text-brand-900 uppercase tracking-wider mb-1">Onboarding tip</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Magic links are valid for 15 minutes. Check your spam folder if the email doesn't appear shortly.
            </p>
          </div>
          <button
            onClick={() => setSuccess(false)}
            className="text-brand-700 hover:text-brand-900 text-sm font-semibold inline-flex items-center gap-1 transition-colors"
          >
            Go back to Sign Up
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-white">
      {/* Left Branding Panel */}
      <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-brand-950 to-brand-900 p-12 flex-col justify-between text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-700 rounded-full filter blur-[150px] opacity-20 transform translate-x-20 -translate-y-20"></div>
        
        <div className="relative z-10 flex items-center gap-2">
          <div className="bg-brand-700 p-2.5 rounded-xl flex items-center justify-center shadow-lg shadow-brand-700/20">
            <Sparkles className="h-6 w-6 text-brand-100" />
          </div>
          <span className="font-bold text-2xl tracking-tight">Nurevo</span>
        </div>

        <div className="relative z-10 my-auto max-w-sm">
          <h1 className="text-4xl font-bold leading-tight mb-4 text-white">
            Enterprise Knowledge Management.
          </h1>
          <p className="text-brand-200 text-base leading-relaxed">
            Unify documents, team conversations, and workspace tools under one fully isolated, secure SaaS workspace.
          </p>
        </div>

        <div className="relative z-10 border-t border-brand-800 pt-6">
          <p className="text-xs text-brand-300">
            &copy; 2026 Nurevo Inc. Enterprise Grade Security Guaranteed.
          </p>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="col-span-12 lg:col-span-7 flex justify-center items-center p-8 bg-gradient-to-tr from-brand-50 via-white to-brand-100">
        <div className="max-w-md w-full animate-fade-in">
          <div className="text-center lg:text-left mb-8">
            <h2 className="text-4xl font-bold text-gray-900 tracking-tight">Create Workspace</h2>
            <p className="text-gray-500 mt-2 text-sm">
              Ready to collaborate? Let's claim your workspace subdomain slug.
            </p>
          </div>

          {errorMsg && (
            <div className="bg-red-50 text-red-700 border-l-4 border-red-500 p-4 rounded-r-xl mb-6 text-sm">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <input
                type="text"
                {...register('full_name')}
                placeholder="Alex Developer"
                className={`w-full px-4 py-3 rounded-xl border ${
                  errors.full_name ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:border-brand-700'
                } bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-700/10 transition-all`}
              />
              {errors.full_name && (
                <p className="text-xs text-red-500 mt-1">{errors.full_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Work Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  {...register('email')}
                  placeholder="alex@company.com"
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border ${
                    errors.email ? 'border-red-400' : 'border-gray-200'
                  } bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-700/10 transition-all`}
                />
                <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              </div>
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Company Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    {...register('workspace_name')}
                    placeholder="Acme Corp"
                    className={`w-full pl-11 pr-4 py-3 rounded-xl border ${
                      errors.workspace_name ? 'border-red-400' : 'border-gray-200'
                    } bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-700/10 transition-all`}
                  />
                  <Building className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                </div>
                {errors.workspace_name && (
                  <p className="text-xs text-red-500 mt-1">{errors.workspace_name.message}</p>
                )}
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Workspace Slug
                </label>
                <div className="relative">
                  <input
                    type="text"
                    {...register('workspace_slug')}
                    placeholder="acme"
                    className={`w-full pl-11 pr-4 py-3 rounded-xl border ${
                      errors.workspace_slug ? 'border-red-400' : 'border-gray-200'
                    } bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-700/10 transition-all`}
                  />
                  <Globe className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                </div>
                {errors.workspace_slug && (
                  <p className="text-xs text-red-500 mt-1">{errors.workspace_slug.message}</p>
                )}
              </div>
            </div>

            <div className="text-xs text-gray-500 leading-relaxed">
              Your workspace URL: <strong className="text-brand-900">http://localhost:5173/slug-check</strong> (replace with your slug).
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-700 hover:bg-brand-800 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-brand-700/10 hover:shadow-brand-700/20 active:transform active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creating Workspace...
                </>
              ) : (
                <>
                  Get Started for Free
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-8">
            Already have an active workspace?{' '}
            <Link to="/auth/login" className="text-brand-700 font-bold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
