import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from '../context/AuthContext';

export interface Profile {
  id: string;
  role: 'user' | 'admin';
}

export function useProfile() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        setProfile((data as Profile | null) ?? null);
        setLoading(false);
      });
  }, [userId]);

  return {
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
  };
}
