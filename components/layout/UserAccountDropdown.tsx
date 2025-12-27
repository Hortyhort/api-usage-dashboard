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
    <div ref={dropdownRef} className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-xl border border-claude-border shadow-claude-lg animate-scale-in origin-bottom-left overflow-hidden z-50" role="menu">
      <div className="py-1.5">
        {menuItems.map((item, i) => {
          if (item.type === 'header') return <div key={i} className="px-4 py-2.5"><div className="text-sm text-claude-text font-medium truncate">{item.email}</div></div>;
          if (item.type === 'divider') return <div key={i} className="my-1.5 border-t border-claude-border" />;
          if ('icon' in item) {
            return (
              <button key={i} type="button" onClick={item.onClick} className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-claude-text-muted hover:text-claude-text hover:bg-claude-beige transition-colors" role="menuitem">
                <item.icon />
                <span className="flex-1 text-left">{item.label}</span>
                {item.shortcut && <span className="text-xs text-claude-text-muted font-medium"><span className="text-claude-text-muted mr-0.5">&#8984;</span>{item.shortcut}</span>}
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
