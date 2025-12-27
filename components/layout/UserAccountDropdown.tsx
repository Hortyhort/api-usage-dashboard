import type { RefObject } from 'react';
import { Icons } from '../icons';
import type { User } from '../../types/dashboard';

type MenuActionItem = {
  icon: () => JSX.Element;
  label: string;
  shortcut?: string;
  hasSubmenu?: boolean;
  onClick?: () => void;
};

type MenuItem =
  | { type: 'header'; email: string }
  | { type: 'divider' }
  | ({ type?: undefined } & MenuActionItem);

const UserAccountDropdown = ({ user, isOpen, dropdownRef, onLogout }: { user: User; isOpen: boolean; dropdownRef: RefObject<HTMLDivElement>; onLogout?: () => void }) => {
  if (!isOpen) return null;

  const menuItems: MenuItem[] = [
    { type: 'header', email: user.email },
    { type: 'divider' },
    { icon: Icons.Settings, label: 'Settings', shortcut: ',' },
    { icon: Icons.Language, label: 'Language', hasSubmenu: true },
    { icon: Icons.Help, label: 'Get help' },
    { type: 'divider' },
    { icon: Icons.Plans, label: 'View all plans' },
    { icon: Icons.Gift, label: 'Gift Claude' },
    { icon: Icons.Info, label: 'Learn more', hasSubmenu: true },
    { type: 'divider' },
    { icon: Icons.Logout, label: 'Log out', onClick: onLogout },
  ];

  return (
    <div ref={dropdownRef} className="absolute bottom-full left-0 mb-2 w-64 glass-card rounded-xl border border-white/10 shadow-2xl shadow-black/50 animate-scale-in origin-bottom-left overflow-hidden z-50" role="menu">
      <div className="py-1.5">
        {menuItems.map((item, i) => {
          if (item.type === 'header') return <div key={i} className="px-4 py-2.5"><div className="text-sm text-slate-300 font-medium truncate">{item.email}</div></div>;
          if (item.type === 'divider') return <div key={i} className="my-1.5 border-t border-white/[0.06]" />;
          if ('icon' in item) {
            return (
              <button key={i} type="button" onClick={item.onClick} className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors" role="menuitem">
                <item.icon />
                <span className="flex-1 text-left">{item.label}</span>
                {item.shortcut && <span className="text-xs text-slate-500 font-medium"><span className="text-slate-600 mr-0.5">&#8984;</span>{item.shortcut}</span>}
                {item.hasSubmenu && <Icons.ChevronRight />}
              </button>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
};

export default UserAccountDropdown;
