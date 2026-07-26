import { ReactNode, useState } from "react";
import { useUser } from "@/hooks/use-user";
import Navbar from "@/components/Navbar";
import ProfileHeader from "@/components/dashboard/ProfileHeader";
import MobileMenu from "@/components/dashboard/MobileMenu";
import PullToRefresh from "@/components/PullToRefresh";

interface BaseLayoutProps {
  children: ReactNode;
  onRefresh?: () => Promise<void>;
  showHeader?: boolean;
  className?: string;
}

export default function BaseLayout({ 
  children, 
  onRefresh,
  showHeader = true,
  className = ""
}: BaseLayoutProps) {
  const { user } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMenuClosing, setIsMenuClosing] = useState(false);

  const handleCloseMenu = () => {
    setIsMenuClosing(true);
    setTimeout(() => {
      setIsMenuOpen(false);
      setIsMenuClosing(false);
    }, 300);
  };

  const content = (
    <div className="gradient-bg min-h-screen pb-24">
      <div className="max-w-md mx-auto">
        {showHeader && (
          <div className="px-5">
            <ProfileHeader 
              user={user as any} 
              onMenuClick={() => setIsMenuOpen(!isMenuOpen)} 
            />
          </div>
        )}

        <MobileMenu 
          isOpen={isMenuOpen} 
          isClosing={isMenuClosing} 
          onClose={handleCloseMenu} 
        />

        <div className={`px-5 ${className}`}>
          {children}
        </div>

        <Navbar />
      </div>
    </div>
  );

  if (onRefresh) {
    return (
      <PullToRefresh onRefresh={onRefresh}>
        {content}
      </PullToRefresh>
    );
  }

  return content;
}
