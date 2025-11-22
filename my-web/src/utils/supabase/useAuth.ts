'use client';

import { useState, useEffect, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from './client';
import { sanitizeEmail, isValidEmail, validatePassword } from './validators';

interface SignUpData { email: string; password: string; fullName?: string }
interface SignInData { email: string; password: string }
interface AuthError { message: string; field?: string }

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!alive) return;
      if (error) console.error('getSession error:', error);
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      if (!alive) return;
      setSession(s ?? null);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe?.();
      // @ts-expect-error legacy signature
      sub?.unsubscribe?.();
    };
  }, []);

  const signUp = useCallback(async (payload: SignUpData) => {
    setAuthLoading(true);
    try {
      const email = sanitizeEmail(payload.email);
      if (!isValidEmail(email)) return { success: false, error: { message: 'Invalid email format', field: 'email' } as AuthError };

      const pwErr = validatePassword(payload.password);
      if (pwErr) return { success: false, error: pwErr as AuthError };

      const { error } = await supabase.auth.signUp({
        email,
        password: payload.password,
        options: {
          data: { full_name: payload.fullName || '' },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('already') || msg.includes('exists') || msg.includes('registered'))
          return { success: false, error: { field: 'email', message: 'This email is already registered. Try logging in instead.' } as AuthError };
        return { success: false, error: { message: error.message } as AuthError };
      }
      return { success: true };
    } catch {
      return { success: false, error: { message: 'Unexpected error during sign up' } as AuthError };
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const signIn = useCallback(async (payload: SignInData) => {
    setAuthLoading(true);
    try {
      const email = sanitizeEmail(payload.email);
      if (!isValidEmail(email)) return { success: false, error: { message: 'Invalid email format', field: 'email' } as AuthError };
      if (!payload.password) return { success: false, error: { message: 'Password is required', field: 'password' } as AuthError };

      const { error } = await supabase.auth.signInWithPassword({ email, password: payload.password });
      if (error) return { success: false, error: { message: 'Invalid email or password' } as AuthError };
      return { success: true };
    } catch {
      return { success: false, error: { message: 'Unexpected error during sign in' } as AuthError };
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          // queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      if (error) return { success: false, error: { message: 'Error signing in with Google' } as AuthError };
      return { success: true };
    } catch {
      return { success: false, error: { message: 'Unexpected error during Google sign in' } as AuthError };
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) return { success: false, error: { message: 'Error signing out' } as AuthError };
      return { success: true };
    } catch {
      return { success: false, error: { message: 'Unexpected error during sign out' } as AuthError };
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (emailRaw: string) => {
    setAuthLoading(true);
    try {
      const email = sanitizeEmail(emailRaw);
      if (!isValidEmail(email)) return { success: false, error: { message: 'Invalid email format', field: 'email' } as AuthError };

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) return { success: false, error: { message: error.message } as AuthError };
      return { success: true };
    } catch {
      return { success: false, error: { message: 'Unexpected error during password reset' } as AuthError };
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (updates: { full_name?: string; avatar_url?: string }) => {
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: updates });
      if (error) return { success: false, error: { message: error.message } as AuthError };
      return { success: true };
    } catch {
      return { success: false, error: { message: 'Unexpected error during profile update' } as AuthError };
    } finally {
      setAuthLoading(false);
    }
  }, []);

  return {
    user,
    session,
    loading,
    authLoading,
    isAuthenticated: !!user,
    isAdmin: user?.user_metadata?.role === 'admin',
    userEmail: user?.email,
    userName: user?.user_metadata?.full_name as string | undefined,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updateProfile,
  };
}
