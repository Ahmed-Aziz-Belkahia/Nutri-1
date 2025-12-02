import { useTranslation } from 'react-i18next';

interface User {
  profileImage?: string;
  name?: string;
  username?: string;
  email?: string;
}

interface ProfileHeaderProps {
  user: User | null;
  onMenuClick: () => void;
}

export default function ProfileHeader({ user, onMenuClick }: ProfileHeaderProps) {
  const { t } = useTranslation();
  
  return (
    <header className="header">
      {/* NutriAI Logo */}
      <div 
        className="cursor-pointer w-12 h-12 flex items-center justify-center" 
        onClick={() => window.location.href = '/'}
        role="button"
        aria-label="Go to home"
      >
        <img 
          src="/logo.png" 
          alt="NutriAI" 
          className="w-full h-full object-contain"
        />
      </div>
      <div className="profile-info">
        <p className="profile-greeting">{t('common:profileHeader.welcomeTo', 'Welcome to')}</p>
        <p className="profile-name font-bold text-[#0CC5BA]">NutriAI</p>
      </div>
      <button 
        className="notification-button"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>
    </header>
  );
}
