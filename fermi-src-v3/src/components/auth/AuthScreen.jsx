import { useState } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function AuthScreen() {
  const { login, signup, resetPassword } = useAuth();

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'

  // Sign-in state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Sign-up state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [signupError, setSignupError] = useState('');
  const [signingUp, setSigningUp] = useState(false);
  const [signupDone, setSignupDone] = useState(false);

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState(null); // { text, isError } | null

  const inputClass = "w-full px-4 py-2.5 text-sm border border-stone-200 rounded-[5px] focus:border-indigo-500 focus:outline-none transition-all bg-white";

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

  const handleSignup = async () => {
    if (!signupEmail || !signupPassword || !signupConfirm) return;
    if (!signupEmail.endsWith('@spacekayak.xyz')) {
      setSignupError('Only @spacekayak.xyz email addresses are allowed');
      return;
    }
    if (signupPassword.length < 8) {
      setSignupError('Password must be at least 8 characters');
      return;
    }
    if (signupPassword !== signupConfirm) {
      setSignupError('Passwords do not match');
      return;
    }
    setSignupError('');
    setSigningUp(true);
    const { error, needsConfirmation } = await signup(signupEmail, signupPassword);
    if (error) {
      setSignupError(typeof error === 'string' ? error : error.message || 'Sign-up failed');
    } else if (needsConfirmation) {
      setSignupDone(true);
    }
    // if no confirmation needed, AuthContext sets isLoggedIn → app auto-navigates
    setSigningUp(false);
  };

  const switchMode = (m) => {
    setMode(m);
    setLoginError('');
    setSignupError('');
    setShowForgotPassword(false);
    setResetMessage('');
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center font-sans">
      <div className="w-full max-w-[380px]">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-[8px] flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-lg font-bold">F</span>
          </div>
          <h1 className="text-[1.8rem] font-light text-stone-900 font-serif tracking-tight">Fermi</h1>
          <p className="text-sm text-stone-400 mt-1 font-mono tracking-wide">
            {mode === 'signup' ? 'Create your account' : 'Sign in to your workspace'}
          </p>
        </div>

        {/* Tab toggle */}
        <div className="flex bg-stone-100 border border-stone-200 rounded-[8px] p-1 mb-4">
          <button
            onClick={() => switchMode('signin')}
            className={`flex-1 py-2 text-sm font-mono font-medium rounded-[5px] transition-all ${
              mode === 'signin'
                ? 'bg-white text-stone-900 shadow-sm border border-stone-200'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            Sign in
          </button>
          <button
            onClick={() => switchMode('signup')}
            className={`flex-1 py-2 text-sm font-mono font-medium rounded-[5px] transition-all ${
              mode === 'signup'
                ? 'bg-white text-stone-900 shadow-sm border border-stone-200'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            Sign up
          </button>
        </div>

        {/* Form container */}
        <div className="bg-stone-100 rounded-[8px] border border-stone-200 p-8">

          {/* ── SIGN IN ── */}
          {mode === 'signin' && (
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
                {loggingIn
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Signing in…</>
                  : 'Sign in'}
              </button>

              <button
                type="button"
                onClick={() => setShowForgotPassword(!showForgotPassword)}
                className="w-full text-center text-xs text-stone-400 hover:text-indigo-600 mt-1 font-mono transition-colors"
              >
                Forgot password?
              </button>

              {showForgotPassword && (
                <div className="mt-1 p-3 bg-white border border-stone-200 rounded-[5px] space-y-2">
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
                      setResetMessage(result.error ? { text: result.error, isError: true } : { text: 'Check your email for a reset link.', isError: false });
                    }}
                    disabled={!resetEmail}
                    className="w-full py-2 px-4 bg-stone-800 text-white text-sm font-mono font-medium rounded-[5px] hover:opacity-85 disabled:opacity-40 transition-opacity"
                  >
                    Send Reset Link
                  </button>
                  {resetMessage && (
                    <p className={`text-xs font-mono ${resetMessage.isError ? 'text-red-600' : 'text-green-700'}`}>{resetMessage.text}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── SIGN UP ── */}
          {mode === 'signup' && !signupDone && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-medium text-stone-500 mb-1.5 uppercase tracking-wider">Work Email</label>
                <input
                  type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)}
                  placeholder="you@spacekayak.xyz"
                  className={inputClass}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-mono font-medium text-stone-500 mb-1.5 uppercase tracking-wider">Password</label>
                <input
                  type="password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSignup()}
                  placeholder="At least 8 characters"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-mono font-medium text-stone-500 mb-1.5 uppercase tracking-wider">Confirm Password</label>
                <input
                  type="password" value={signupConfirm} onChange={e => setSignupConfirm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSignup()}
                  placeholder="••••••••"
                  className={inputClass}
                />
              </div>

              {signupError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-[5px]">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span className="text-sm text-red-700">{signupError}</span>
                </div>
              )}

              <button
                onClick={handleSignup}
                disabled={signingUp || !signupEmail || !signupPassword || !signupConfirm}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:opacity-85 disabled:opacity-40 text-white text-sm font-mono font-medium uppercase tracking-wider rounded-[5px] transition-opacity flex items-center justify-center gap-2"
              >
                {signingUp
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating account…</>
                  : 'Create account'}
              </button>

              <p className="text-xs text-stone-400 font-mono text-center leading-relaxed">
                Only @spacekayak.xyz addresses are allowed. Your account will be activated by an admin.
              </p>
            </div>
          )}

          {/* ── SIGN UP SUCCESS ── */}
          {mode === 'signup' && signupDone && (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 bg-green-50 border border-green-200 rounded-[8px] flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <div className="text-base font-medium text-stone-900 mb-1">Check your inbox</div>
                <p className="text-sm text-stone-500 font-mono leading-relaxed">
                  We sent a confirmation link to <span className="font-semibold text-stone-700">{signupEmail}</span>. Click it to activate your account.
                </p>
              </div>
              <button
                onClick={() => switchMode('signin')}
                className="w-full py-2.5 px-4 border border-stone-200 text-stone-600 text-sm font-mono font-medium rounded-[5px] hover:bg-stone-50 transition-colors"
              >
                Back to sign in
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-stone-400 mt-6 font-mono tracking-wide">
          Fermi Operations · Internal use only
        </p>
      </div>
    </div>
  );
}
