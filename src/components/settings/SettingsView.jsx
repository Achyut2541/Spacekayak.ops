import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Link2, Unlink } from 'lucide-react';
import { isConfigured } from '../../lib/basecamp';

export default function SettingsView({ syncEngine }) {
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [syncResult, setSyncResult] = useState(null);

  useEffect(() => {
    setConnected(isConfigured());
  }, []);

  const handleSync = async () => {
    if (!syncEngine) return;
    setSyncing(true);
    setSyncError(null);
    const result = await syncEngine.sync();
    setSyncing(false);
    if (result.success) {
      setLastSync(result.lastSync);
      setSyncResult('Sync completed successfully');
      setTimeout(() => setSyncResult(null), 3000);
    } else {
      setSyncError(result.error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-light text-gray-900 font-serif tracking-tight">Settings</h2>
        <p className="text-gray-500 mt-1 text-sm">Configure integrations and sync</p>
      </div>

      {/* Basecamp Integration */}
      <div className="bg-stone-100 border border-stone-200 rounded-[6px] overflow-hidden">
        <div className="p-5 border-b border-stone-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-black">BC</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Basecamp</h3>
                <p className="text-xs text-gray-500 font-mono">Project management sync</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {connected ? (
                <span className="flex items-center gap-1.5 text-xs font-mono font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                  <CheckCircle className="w-3.5 h-3.5" /> Connected
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-mono font-medium text-stone-500 bg-stone-50 px-3 py-1.5 rounded-full border border-stone-200">
                  <Unlink className="w-3.5 h-3.5" /> Not configured
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {!connected && (
            <div className="bg-amber-50 border border-amber-200 rounded-[5px] p-4">
              <p className="text-sm text-amber-800 font-medium mb-2">Configuration Required</p>
              <p className="text-xs text-amber-700 font-mono">
                Add these environment variables to connect Basecamp:
              </p>
              <pre className="mt-2 text-xs bg-white border border-amber-200 rounded p-3 font-mono text-amber-900 overflow-x-auto">
{`VITE_BASECAMP_ACCOUNT_ID=your_account_id
VITE_BASECAMP_TOKEN=your_api_token`}
              </pre>
            </div>
          )}

          {connected && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <div className="gravity-label mb-1">Last Sync</div>
                  <div className="text-sm text-gray-700 font-mono">
                    {lastSync ? lastSync.toLocaleString() : 'Never'}
                  </div>
                </div>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-mono font-medium uppercase tracking-wider rounded-[5px] hover:opacity-85 disabled:opacity-50 transition-opacity"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>

              {syncError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-[5px]">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span className="text-sm text-red-700 font-mono">{syncError}</span>
                </div>
              )}

              {syncResult && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-[5px]">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span className="text-sm text-emerald-700 font-mono">{syncResult}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* App Info */}
      <div className="bg-stone-100 border border-stone-200 rounded-[6px] p-5">
        <div className="gravity-label mb-3">About</div>
        <div className="space-y-2 text-sm text-gray-600 font-mono">
          <div className="flex justify-between">
            <span>Version</span>
            <span className="text-gray-900 font-medium">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span>Stack</span>
            <span className="text-gray-900 font-medium">React 19 + Vite + Tailwind 4</span>
          </div>
          <div className="flex justify-between">
            <span>Design System</span>
            <span className="text-gray-900 font-medium">Gravity</span>
          </div>
        </div>
      </div>
    </div>
  );
}
