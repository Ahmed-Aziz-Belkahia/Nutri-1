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
  // Extract username from email (first half before @)
  const displayName = user?.name || user?.username || (user?.email ? user.email.split('@')[0] : 'User');
  
  return (
    <header className="header">
      <div 
        className="profile-avatar cursor-pointer" 
        onClick={() => window.location.href = '/profile'}
        role="button"
        aria-label="Go to profile"
      >
        {user?.profileImage ? (
          <img 
            src={user.profileImage} 
            alt={displayName} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-lg">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="profile-info">
        <p className="profile-greeting">Welcome back</p>
        <p className="profile-name">{displayName}</p>
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
