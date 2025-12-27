import { useEffect, useRef, useState } from 'react';
import { Icons } from '../icons';
import UserAccountDropdown from './UserAccountDropdown';
import type { User } from '../../types/dashboard';

export type PageId = 'dashboard' | 'api-keys' | 'alerts' | 'logs' | 'team' | 'rate-limits';

type NavItemConfig = {
  id: PageId;
  icon: () => JSX.Element;
  label: string;
  badge?: { value: number; color: string } | null;
};

const NavItem = ({ icon: Icon, label, active, onClick, badge }: { icon: () => JSX.Element; label: string; active: boolean; onClick: () => void; badge?: { value: number; color: string } | null }) => (
  <button
    type="button"
    onClick={onClick}
    aria-current={active ? 'page' : undefined}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
               ${active ? 'bg-white/[0.08] text-white' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'}`}
  >
    <Icon />
    <span className="flex-1 text-left text-sm font-medium">{label}</span>
    {badge && (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${badge.color}`}>
        {badge.value}
      </span>
    )}
  </button>
);

const Sidebar = ({
  isOpen,
  onToggle,
  currentPage,
  onPageChange,
  user,
  unreadAlerts,
  isDark,
  onThemeToggle,
  readOnly = false,
}: {
  isOpen: boolean;
  onToggle: () => void;
  currentPage: PageId;
  onPageChange: (page: PageId) => void;
  user: User;
  unreadAlerts: number;
  isDark: boolean;
  onThemeToggle: () => void;
  readOnly?: boolean;
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const userButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node) && userButtonRef.current && !userButtonRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems: NavItemConfig[] = readOnly
    ? [{ id: 'dashboard', icon: Icons.Dashboard, label: 'Dashboard' }]
    : [
      { id: 'dashboard', icon: Icons.Dashboard, label: 'Dashboard' },
      { id: 'api-keys', icon: Icons.Key, label: 'API Keys' },
      { id: 'alerts', icon: Icons.Bell, label: 'Alerts', badge: unreadAlerts > 0 ? { value: unreadAlerts, color: 'bg-red-500/20 text-red-400' } : null },
      { id: 'logs', icon: Icons.Logs, label: 'Usage Logs' },
      { id: 'team', icon: Icons.Team, label: 'Team' },
      { id: 'rate-limits', icon: Icons.Gauge, label: 'Rate Limits' },
    ];

  const handleLogout = async () => {
    setUserMenuOpen(false);
    try {
      await fetch('/api/logout', { method: 'POST' });
    } finally {
      window.location.href = '/login';
    }
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={onToggle} />}

      <button type="button" onClick={onToggle} aria-label="Toggle sidebar" aria-controls="sidebar" className="fixed top-4 left-4 z-[60] p-2 rounded-lg hover:bg-white/[0.06] text-slate-500 hover:text-white transition-colors focus-ring">
        <Icons.SidebarClose />
      </button>

      <aside id="sidebar" className={`fixed top-0 left-0 h-full z-50 transition-all duration-300 ease-out-expo ${isOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full'} bg-slate-950/95 backdrop-blur-xl border-r border-white/[0.06]`}>
        <div className={`h-full flex flex-col ${isOpen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}>
          <div className="h-14 border-b border-white/[0.06]" />

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-hide" aria-label="Primary">
            {navItems.map((item) => (
              <NavItem key={item.id} {...item} active={currentPage === item.id} onClick={() => onPageChange(item.id)} />
            ))}
          </nav>

          <div className="px-3 py-2 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onThemeToggle}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all duration-200 focus-ring"
              aria-label="Toggle theme"
            >
              {isDark ? <Icons.Sun /> : <Icons.Moon />}
              <span className="text-sm font-medium">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
          </div>

          <div className="relative p-3 border-t border-white/[0.06]">
            {readOnly ? (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] text-slate-300 text-sm">
                <Icons.Info />
                Shared view
              </div>
            ) : (
              <>
                <UserAccountDropdown user={user} isOpen={userMenuOpen} dropdownRef={userMenuRef} onLogout={handleLogout} />
                <button
                  type="button"
                  ref={userButtonRef}
                  onClick={() => setUserMenuOpen((open) => !open)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${userMenuOpen ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'}`}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm font-semibold text-white shadow-lg shadow-orange-500/20">
                    {user.initials}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-medium text-white truncate">{user.name}</div>
                    <div className="text-xs text-slate-500">{user.plan}</div>
                  </div>
                  <Icons.ChevronUpDown />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
