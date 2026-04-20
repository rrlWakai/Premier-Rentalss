import { useState } from 'react';
import { Mail, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface InviteUserFormProps {
  isAdmin: boolean;
}

export default function InviteUserForm({ isAdmin }: InviteUserFormProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <div
        className="flex items-center gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm"
        style={{ fontFamily: 'Jost, sans-serif' }}
      >
        <AlertCircle size={16} strokeWidth={1.5} />
        Unauthorized: only admins can invite users.
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setError('Not authenticated. Please sign in and try again.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/invite-user', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Failed to send invite.');
      } else {
        setSuccess(true);
        setEmail('');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-[#ede8df] p-5">
      <h3
        className="font-medium text-[#1a1a1a] mb-1"
        style={{ fontFamily: 'Jost, sans-serif' }}
      >
        Invite User via Email
      </h3>
      <p
        className="text-xs text-[#8a8a7a] mb-4"
        style={{ fontFamily: 'Jost, sans-serif' }}
      >
        The user will receive a secure invite link to set their own password.
        Their account will be created with the <strong>user</strong> role.
      </p>

      {success && (
        <div
          className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs"
          style={{ fontFamily: 'Jost, sans-serif' }}
        >
          <CheckCircle size={14} strokeWidth={1.5} />
          Invite sent! The user will receive an email with a sign-up link.
        </div>
      )}

      {error && (
        <div
          className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs"
          style={{ fontFamily: 'Jost, sans-serif' }}
        >
          <AlertCircle size={14} strokeWidth={1.5} />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Mail
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8a7a]"
            strokeWidth={1.5}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="user@example.com"
            disabled={loading}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#ede8df] rounded outline-none focus:border-[#c9a96e] transition-colors disabled:opacity-50"
            style={{ fontFamily: 'Jost, sans-serif' }}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !email}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#c9a96e] text-white rounded text-sm hover:bg-[#b09460] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ fontFamily: 'Jost, sans-serif' }}
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send size={14} strokeWidth={1.5} />
          )}
          {loading ? 'Sending…' : 'Send Invite'}
        </button>
      </form>
    </div>
  );
}
