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
  return (
    <header className="header">
      {/* NutriAI Logo */}
      <div 
        className="cursor-pointer flex items-center gap-3" 
        onClick={() => window.location.href = '/'}
        role="button"
        aria-label="Go to home"
      >
        <img 
          src="/logo.png" 
          alt="NutriAI" 
          className="w-10 h-10 object-contain"
        />
        <span className="text-lg font-semibold text-slate-800">Welcome to NutriAI</span>
      </div>
      {/* Spacer to center the logo area or push menu to the right */}
      <div className="flex-1" />
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
