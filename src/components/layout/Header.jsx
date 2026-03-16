import { X, ChevronDown, AlertCircle, Menu } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from '../ui';

export default function Header({ onMenuToggle }) {
  const { searchQuery, setSearchQuery, viewingAs, setViewingAs } = useUI();
  const { slackToast, accountManagers, allTeamNames, getUserRole, canViewAs } = useData();
  const { currentUser, setCurrentUser, logout } = useAuth();

  return (
    <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-stone-200/60">
      <div className="max-w-[1400px] mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Mobile menu button */}
          {onMenuToggle && (
            <button onClick={onMenuToggle} className="lg:hidden p-1.5 hover:bg-stone-100 rounded-lg mr-2">
              <Menu className="w-5 h-5 text-stone-600" />
            </button>
          )}

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-black tracking-tight">F</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-stone-900 tracking-tight">Fermi</h1>
              {viewingAs && (
                <div className="text-xs text-orange-600 font-medium font-mono">
                  Viewing as {viewingAs} ·{' '}
                  <button onClick={() => setViewingAs(null)} className="ml-1 underline hover:text-orange-700">Exit</button>
                </div>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="hidden sm:block flex-1 max-w-md mx-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Search projects, tasks, people..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-4 py-1.5 pl-9 text-sm bg-stone-50 border border-stone-200 rounded-[5px] focus:border-indigo-500 focus:outline-none focus:bg-white transition-colors placeholder-stone-400"
              />
              <div className="absolute left-3 top-2.5 text-stone-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-xs text-stone-400 font-mono font-medium tabular-nums tracking-wide">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>

            {/* Slack toast */}
            {slackToast && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] text-xs font-medium font-mono transition-all ${
                slackToast === 'sent'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {slackToast === 'sent' ? 'Sent to Slack' : (
                  <><AlertCircle className="w-3.5 h-3.5" /> Slack failed</>
                )}
              </div>
            )}

            {/* Logout */}
            <button
              onClick={logout}
              title="Sign out"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-[5px] border border-stone-200 hover:border-red-200 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>

            {/* Profile dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-stone-100 rounded-[5px] transition-colors border border-stone-200">
                <Avatar name={currentUser} />
                <div className="text-left">
                  <div className="text-sm font-semibold text-stone-900">{currentUser}</div>
                  <div className="text-xs text-stone-500 font-mono">
                    {getUserRole(currentUser) === 'admin' ? 'Admin' : getUserRole(currentUser) === 'am' ? 'Account Manager' : getUserRole(currentUser) === 'leadership' ? 'Leadership' : 'Team Member'}
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-stone-500" />
              </button>

              <div className="absolute right-0 mt-2 w-56 bg-white border border-stone-200 rounded-[6px] shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="py-2">
                  {canViewAs(currentUser) && (
                    <>
                      <div className="px-4 py-2 gravity-label">Switch Profile</div>
                      {accountManagers.map(am => (
                        <button
                          key={am}
                          onClick={() => setCurrentUser(am)}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-stone-100 ${currentUser === am ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-stone-700'}`}
                        >
                          {am} {getUserRole(am) === 'admin' && '(Admin)'}
                        </button>
                      ))}
                      <div className="border-t border-stone-200 my-2" />
                      <div className="px-4 py-2 gravity-label">View As</div>
                      {allTeamNames.filter(m => !accountManagers.includes(m)).map(member => (
                        <button
                          key={member}
                          onClick={() => setViewingAs(member)}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-stone-100 ${viewingAs === member ? 'bg-orange-50 text-orange-700 font-semibold' : 'text-stone-700'}`}
                        >
                          {member}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
