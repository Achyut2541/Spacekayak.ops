import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function AuthScreen() {
  const { login, resetPassword } = useAuth();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) return;
    if (!loginEmail.endsWith('@spacekayak.xyz')) {
      setLoginError('Only @spacekayak.xyz email addresses are allowed');
      return;
    }
    setLoginError('');
    setLoggingIn(true);
    const { error } = await login(loginEmail, loginPassword);
    if (error) setLoginError(typeof error === 'string' ? error : error.message || 'Login failed');
    setLoggingIn(false);
  };

  const inputClass = "w-full px-4 py-2.5 text-sm border border-stone-200 rounded-[5px] focus:border-indigo-500 focus:outline-none transition-all bg-white";

  return (
    <div className="min-h-screen bg-white flex items-center justify-center font-sans">
      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-lg font-bold">F</span>
          </div>
          <h1 className="text-[1.8rem] font-light text-stone-900 font-serif tracking-tight">Fermi</h1>
          <p className="text-sm text-stone-400 mt-1 font-mono tracking-wide">
            Sign in to your workspace
          </p>
        </div>

        {/* Form */}
        <div className="bg-stone-100 rounded-xl border border-stone-200 p-8">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-medium text-stone-500 mb-1.5 uppercase tracking-wider">Email</label>
              <input
                type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="you@spacekayak.xyz"
                className={inputClass}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-mono font-medium text-stone-500 mb-1.5 uppercase tracking-wider">Password</label>
              <input
                type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••"
                className={inputClass}
              />
            </div>
            {loginError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-[5px]">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="text-sm text-red-700">{loginError}</span>
              </div>
            )}
            <button
              onClick={handleLogin}
              disabled={loggingIn || !loginEmail || !loginPassword}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:opacity-85 disabled:opacity-40 text-white text-sm font-mono font-medium uppercase tracking-wider rounded-[5px] transition-opacity flex items-center justify-center gap-2"
            >
              {loggingIn ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Signing in…</>
              ) : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={() => setShowForgotPassword(!showForgotPassword)}
              className="w-full text-center text-xs text-stone-400 hover:text-indigo-600 mt-3 font-mono transition-colors"
            >
              Forgot password?
            </button>
            {showForgotPassword && (
              <div className="mt-3 p-3 bg-white border border-stone-200 rounded-[5px] space-y-2">
                <input
                  type="email"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  placeholder="you@spacekayak.xyz"
                  className={inputClass}
                />
                <button
                  onClick={async () => {
                    if (!resetEmail) return;
                    if (!resetEmail.endsWith('@spacekayak.xyz')) {
                      setResetMessage('Only @spacekayak.xyz emails are allowed');
                      return;
                    }
                    const result = await resetPassword(resetEmail);
                    setResetMessage(result.error || 'Check your email for a reset link.');
                  }}
                  disabled={!resetEmail}
                  className="w-full py-2 px-4 bg-stone-800 text-white text-sm font-mono font-medium rounded-[5px] hover:opacity-85 disabled:opacity-40 transition-opacity"
                >
                  Send Reset Link
                </button>
                {resetMessage && <p className="text-xs text-stone-500 font-mono">{resetMessage}</p>}
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-stone-400 mt-6 font-mono tracking-wide">
          Fermi Operations · Internal use only
        </p>
      </div>
    </div>
  );
}
