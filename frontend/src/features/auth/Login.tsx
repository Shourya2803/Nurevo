import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { api } from '../../lib/api';
import { Sparkles, Mail, Loader2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const loginSchema = zod.object({
  email: zod.string().email('Invalid email address'),
});

type LoginFormValues = zod.infer<typeof loginSchema>;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    setErrorMsg('');
    try {
      await api.post('/auth/login', data);
      setSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'No active account associated with this email.');
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
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Check Your Email</h2>
          <p className="text-gray-600 mb-6 text-sm leading-relaxed">
            We sent a secure magic sign-in link to your email. Click it to log in.
          </p>
          <button
            onClick={() => setSuccess(false)}
            className="text-brand-700 hover:text-brand-900 text-sm font-semibold inline-flex items-center gap-1 transition-colors"
          >
            Request another link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-gradient-to-tr from-brand-100 via-white to-coffee-light">
      <div className="max-w-md w-full animate-fade-in">
        {/* Logo and Brand */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="bg-brand-700 p-2 rounded-lg flex items-center justify-center shadow-md">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-gray-900">Nurevo</span>
        </div>

        {/* Card wrapper */}
        <div className="glass-card p-8 border border-white/50">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Sign In</h2>
            <p className="text-gray-500 text-xs mt-1">
              Enter your email, and we'll send you a password-less magic sign-in link.
            </p>
          </div>

          {errorMsg && (
            <div className="bg-red-50 text-red-700 border-l-4 border-red-500 p-3 rounded-r-lg mb-4 text-xs">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Work Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  {...register('email')}
                  placeholder="alex@company.com"
                  className={`w-full pl-11 pr-4 py-2.5 rounded-xl border ${
                    errors.email ? 'border-red-400' : 'border-gray-200'
                  } bg-white focus:outline-none focus:ring-2 focus:ring-brand-700/10 transition-all`}
                />
                <Mail className="absolute left-4 top-3.5 h-4 w-4 text-gray-400" />
              </div>
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
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
                  Sending Link...
                </>
              ) : (
                <>
                  Send Magic Link
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-600 mt-6">
            New to Nurevo?{' '}
            <Link to="/" className="text-brand-700 font-bold hover:underline">
              Create a workspace
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
