import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Header from './Header';
import Sidebar from './Sidebar';

export default function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white font-sans">
      <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex gap-6">
          {/* Mobile sidebar overlay */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
              <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl overflow-y-auto">
                <div className="flex items-center justify-end p-3">
                  <button onClick={() => setSidebarOpen(false)} className="p-1.5 hover:bg-stone-100 rounded-lg">
                    <X className="w-5 h-5 text-stone-500" />
                  </button>
                </div>
                <Sidebar onNavigate={() => setSidebarOpen(false)} />
              </div>
            </div>
          )}
          {/* Desktop sidebar */}
          <div className="hidden lg:block">
            <Sidebar />
          </div>
          <div className="flex-1 min-w-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
