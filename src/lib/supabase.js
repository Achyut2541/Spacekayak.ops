// ═══════════════════════════════════════════════════════════════════════════
// Supabase Client — REST-based (no SDK dependency)
// ═══════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

// ── Auth helpers ─────────────────────────────────────────────────────────

export const supabaseAuth = {
  signIn: async (email, password) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { data: null, error: data.error_description || data.msg || 'Login failed' };
      return { data, error: null };
    } catch {
      return { data: null, error: 'Network error — could not reach auth server' };
    }
  },

  signOut: async (token) => {
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, Authorization: `Bearer ${token}` },
      });
    } catch {
      // Ignore logout errors
    }
  },

  getUser: async (token) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { 'apikey': SUPABASE_KEY, Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  recover: async (email) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) return { error: 'Failed to send reset email' };
      return { error: null };
    } catch {
      return { error: 'Network error — could not reach auth server' };
    }
  },

  signUp: async (email, password) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { data: null, error: data.error_description || data.msg || 'Sign up failed' };
      return { data, error: null };
    } catch {
      return { data: null, error: 'Network error — could not reach auth server' };
    }
  },
};

// ── Minimal REST client ──────────────────────────────────────────────────

export const supabase = {
  from: (table) => ({
    select: () => ({
      then: async (resolve) => {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
          headers: { 'apikey': SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        });
        const data = res.ok ? await res.json() : [];
        resolve({ data, error: res.ok ? null : 'Error loading' });
      },
    }),
    upsert: (record) => ({
      select: () => ({
        then: async (resolve) => {
          await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              Prefer: 'return=representation,resolution=merge-duplicates',
            },
            body: JSON.stringify(record),
          });
          resolve({ data: [record], error: null });
        },
      }),
    }),
    delete: () => ({
      eq: (col, val) => ({
        then: async (resolve) => {
          await fetch(`${SUPABASE_URL}/rest/v1/${table}?${col}=eq.${val}`, {
            method: 'DELETE',
            headers: { 'apikey': SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
          });
          resolve({ error: null });
        },
      }),
    }),
  }),
};
