import { Drawer } from 'vaul';
import { useAuth } from '@/hooks/use-auth';

interface MobileMenuProps {
  isOpen: boolean;
  isClosing: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, isClosing, onClose }: MobileMenuProps) {
  const { logout } = useAuth();
  
  const handleNavigation = (url: string) => {
    onClose();
    setTimeout(() => window.location.href = url, 300);
  };

  const handleLogout = async () => {
    onClose();
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/50 z-[9998]" />
        <Drawer.Content className="bg-white flex flex-col rounded-t-[24px] h-fit fixed bottom-0 left-0 right-0 z-[9999] max-w-[430px] mx-auto">
          {/* Handle bar */}
          <div className="mx-auto w-10 h-1 flex-shrink-0 rounded-full bg-gray-300 mt-6 mb-6" />
          
          {/* Menu items */}
          <div className="px-6 pb-6">
            <MenuButton
              icon={<UserIcon />}
              label="Profile"
              onClick={() => handleNavigation('/profile')}
            />

            <MenuButton
              icon={<ClipboardIcon />}
              label="Generate New Meal Plan"
              onClick={() => handleNavigation('/meal-planning-quiz')}
            />

            <div className="h-px bg-gray-200 my-4" />

            <MenuButton
              icon={<LogoutIcon />}
              label="Logout"
              onClick={handleLogout}
              isLogout
            />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

interface MenuButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isLogout?: boolean;
}

function MenuButton({ icon, label, onClick, isLogout }: MenuButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '16px',
        border: 'none',
        background: 'none',
        textAlign: 'left',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        fontSize: '16px',
        color: isLogout ? '#EF4444' : '#1E293B',
        borderRadius: '12px',
        transition: 'background-color 0.2s'
      }}
      onTouchStart={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
      onTouchEnd={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
    >
      <div style={{ 
        width: '40px', 
        height: '40px', 
        borderRadius: '50%', 
        backgroundColor: isLogout ? '#FEE2E2' : '#E8F5FF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {icon}
      </div>
      <span style={{ fontWeight: 500 }}>{label}</span>
    </button>
  );
}

function UserIcon() {
  return (
    <svg className="w-5 h-5" style={{ color: '#26A8FF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-5 h-5" style={{ color: '#26A8FF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg className="w-5 h-5" style={{ color: '#26A8FF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg className="w-5 h-5" style={{ color: '#EF4444' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}
