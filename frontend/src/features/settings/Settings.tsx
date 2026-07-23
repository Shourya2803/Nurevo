import { useState, type FormEvent } from 'react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
import { motion } from 'framer-motion';
import { 
  Settings as SettingsIcon, 
  Check, 
  Loader2, 
  ShieldCheck, 
  Globe 
} from 'lucide-react';

export default function Settings() {
  const { user, workspace, updateWorkspaceSettings } = useAuthStore();
  const isOwner = user?.role === 'owner';

  const [workspaceName, setWorkspaceName] = useState(workspace?.name || '');
  const primaryColor = workspace?.settings?.primary_color || '#6f4e37';
  const [allowedDomains, setAllowedDomains] = useState(
    workspace?.settings?.allowed_domains?.join(', ') || ''
  );
  
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;
    
    setSaving(true);
    setSuccess(false);
    setErrorMsg('');

    // Parse domains back to string array
    const domainsArray = allowedDomains
      .split(',')
      .map((d: string) => d.trim().toLowerCase())
      .filter((d: string) => d.length > 0);

    const payload = {
      name: workspaceName,
      settings: {
        ...workspace?.settings,
        primary_color: primaryColor,
        allowed_domains: domainsArray,
      },
    };

    try {
      await api.put(`/workspaces/${workspace?.id}/settings`, payload);
      // Update local Zustand store
      updateWorkspaceSettings(payload.settings);
      setSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-2xl mx-auto space-y-6 text-left"
    >
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Workspace Settings</h2>
        <p className="text-gray-500 text-sm mt-1">
          Configure security, company branding, and core subdomain setups.
        </p>
      </div>

      <div className="glass-card bg-white border border-gray-200/80 p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
          <SettingsIcon className="h-5 w-5 text-brand-700" />
          <h3 className="font-bold text-gray-900 text-lg">General Settings</h3>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-700 border-l-4 border-red-500 p-3 rounded-r-lg mb-4 text-xs">
            {errorMsg}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-700 border-l-4 border-green-500 p-3 rounded-r-lg mb-4 text-xs flex items-center gap-1.5 font-semibold">
            <Check className="h-4 w-4" />
            Workspace settings saved successfully!
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Workspace Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Workspace Name
            </label>
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              disabled={!isOwner}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-700/10 focus:border-brand-700 transition-all text-sm disabled:bg-gray-50"
              required
            />
          </div>

          {/* Subdomain Slug */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Workspace Slug (Read-only)
            </label>
            <div className="relative">
              <input
                type="text"
                value={workspace?.slug || ''}
                disabled
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Contact support if you need to migrate your workspace slug subdomain.
            </p>
          </div>

          {/* Registration restrictions */}
          <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 space-y-4">
            <h4 className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
              <Globe className="h-4.5 w-4.5 text-brand-700" />
              Allowed Domains
            </h4>
            <div>
              <label className="block text-[11px] text-gray-600 font-medium mb-2">
                Restrict access by domain (comma separated)
              </label>
              <input
                type="text"
                value={allowedDomains}
                onChange={(e) => setAllowedDomains(e.target.value)}
                disabled={!isOwner}
                placeholder="e.g. google.com, apple.com"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-700/10 focus:border-brand-700 transition-all text-sm disabled:bg-gray-50"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Leave empty to allow invitations for any email domain provider.
              </p>
            </div>
          </div>

          {isOwner ? (
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-brand-700 hover:bg-brand-800 text-white font-semibold py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving Settings...
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2 p-3.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>
                You are currently viewing settings as a **{user?.role}**. Only the **Workspace Owner** is authorized to apply updates.
              </span>
            </div>
          )}
        </form>
      </div>
    </motion.div>
  );
}
