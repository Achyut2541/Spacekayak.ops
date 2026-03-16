import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabaseAuth } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authToken, setAuthToken] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState('Achyut');

  useEffect(() => {
    const restore = async () => {
      const token = localStorage.getItem('sk_auth_token');
      const email = localStorage.getItem('sk_auth_email');
      if (token && email) {
        try {
          const user = await supabaseAuth.getUser(token);
          if (user?.email) {
            setAuthToken(token);
            setIsLoggedIn(true);
          } else {
            localStorage.removeItem('sk_auth_token');
            localStorage.removeItem('sk_auth_email');
          }
        } catch {
          /* stay logged out */
        }
      }
      setAuthChecked(true);
    };
    restore();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data, error } = await supabaseAuth.signIn(email, password);
    if (error) return { error };
    setAuthToken(data.access_token);
    setIsLoggedIn(true);
    localStorage.setItem('sk_auth_token', data.access_token);
    localStorage.setItem('sk_auth_email', email);
    return { error: null };
  }, []);

  const signup = useCallback(async (email, password) => {
    const { data, error } = await supabaseAuth.signUp(email, password);
    if (error) return { error };
    if (data?.access_token) {
      setAuthToken(data.access_token);
      setIsLoggedIn(true);
      localStorage.setItem('sk_auth_token', data.access_token);
      localStorage.setItem('sk_auth_email', email);
    }
    return { error: null, needsConfirmation: !data?.access_token };
  }, []);

  const resetPassword = useCallback(async (email) => {
    const { error } = await supabaseAuth.recover(email);
    if (error) return { error };
    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    if (authToken) await supabaseAuth.signOut(authToken);
    setAuthToken(null);
    setIsLoggedIn(false);
    setCurrentUser('Achyut');
    localStorage.removeItem('sk_auth_token');
    localStorage.removeItem('sk_auth_email');
  }, [authToken]);

  return (
    <AuthContext.Provider value={{
      authToken, isLoggedIn, authChecked,
      currentUser, setCurrentUser,
      login, signup, logout, resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
