import Header from './Header';
import Sidebar from './Sidebar';

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-white font-sans">
      <Header />
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="flex gap-6">
          <Sidebar />
          <div className="flex-1 min-w-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
