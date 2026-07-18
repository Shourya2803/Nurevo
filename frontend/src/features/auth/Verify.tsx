import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { Loader2, ShieldAlert, CheckCircle, ArrowRight } from 'lucide-react';

export default function Verify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [errorMsg, setErrorMsg] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setStatus('failed');
        setErrorMsg('Invalid URL. Access token is missing.');
        return;
      }

      try {
        const response = await api.get(`/auth/verify?token=${token}`);
        const data = response.data;
        
        // Populate the auth store
        setAuth(
          {
            id: data.user_id,
            email: data.email,
            full_name: data.full_name || 'Active User',
            role: data.role,
            status: 'active',
            workspace_id: data.workspace_id,
          },
          data.access_token,
          {
            id: data.workspace_id,
            name: data.workspace_name,
            slug: data.workspace_slug,
            settings: data.workspace_settings || {},
          }
        );
        
        setStatus('success');
        
        // Wait a short moment to display success micro-animation, then route
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } catch (err: any) {
        setStatus('failed');
        setErrorMsg(err.response?.data?.detail || 'Verification failed. The token may be expired or already used.');
      }
    };

    verifyToken();
  }, [token, setAuth, navigate]);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-gradient-to-tr from-brand-100 via-white to-coffee-light">
      <div className="glass-card max-w-md w-full p-8 text-center border-t-4 border-brand-700 animate-slide-up shadow-xl">
        {status === 'verifying' && (
          <div className="space-y-4 py-6">
            <Loader2 className="h-10 w-10 text-brand-700 animate-spin mx-auto" />
            <h3 className="text-xl font-bold text-gray-900">Verifying Magic Link</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Securing connection and initializing tenant workspace. Please wait...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4 py-6">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 text-green-700 animate-pulse-subtle">
              <CheckCircle className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Success!</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Authentication successful. Redirecting you to your dashboard...
            </p>
          </div>
        )}

        {status === 'failed' && (
          <div className="space-y-4 py-6">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 text-red-700">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Authentication Failed</h3>
            <p className="text-red-600 text-xs bg-red-50 p-3 rounded-lg leading-relaxed">
              {errorMsg}
            </p>
            <div className="pt-4 flex flex-col gap-3">
              <button
                onClick={() => navigate('/auth/login')}
                className="w-full bg-brand-700 hover:bg-brand-800 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-1 transition-all"
              >
                Go to Sign In
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigate('/')}
                className="text-xs text-gray-500 hover:text-brand-700 hover:underline transition-colors"
              >
                Create a new workspace
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
