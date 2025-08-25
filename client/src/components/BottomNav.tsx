import { useLocation, Link } from "wouter";
import React from 'react';
import { 
  IoHomeOutline, 
  IoHome, 
  IoReaderOutline, 
  IoReader, 
  IoStatsChartOutline, 
  IoStatsChart,
  IoAddCircleOutline
} from "react-icons/io5";
import { motion } from 'framer-motion';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  activeIcon: React.ElementType;
  testId?: string;
}

const navItems: NavItem[] = [
  {
    path: "/dashboard",
    label: "Home",
    icon: IoHomeOutline,
    activeIcon: IoHome,
    testId: "home-nav"
  },
  {
    path: "/recipes",
    label: "Recipes",
    icon: IoReaderOutline,
    activeIcon: IoReader,
    testId: "recipes-nav"
  },
  {
    path: "/progress",
    label: "Progress",
    icon: IoStatsChartOutline,
    activeIcon: IoStatsChart,
    testId: "progress-nav"
  }
];

export default function BottomNav() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === "/progress") {
      return location === "/progress" || location === "/progress-new";
    }
    return location === path;
  };

  // Calculate position for the bump - adjusted for 4 items with equal spacing
  const getBumpPosition = () => {
    const homeActive = isActive("/dashboard");
    const recipesActive = isActive("/recipes");
    const progressActive = isActive("/progress");
    const addActive = location === "/add-food";
    
    // Positions for 4 items with justify-around
    if (homeActive) return "12.5%";     // First item
    if (recipesActive) return "37.5%";   // Second item
    if (progressActive) return "62.5%";  // Third item
    if (addActive) return "87.5%";       // Fourth item
    return null;
  };

  const bumpPosition = getBumpPosition();

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ 
        position: 'fixed',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      <div className="relative mx-3 mb-2">
        {/* Circular bump that integrates with navbar */}
        {bumpPosition && (
          <>
            {/* Connection piece to blend circle with navbar */}
            <motion.div
              className="absolute h-8 w-20 bg-white/60 dark:bg-gray-900/60 backdrop-blur-2xl"
              style={{ 
                left: bumpPosition,
                transform: 'translateX(-50%)',
                bottom: '20px',
                zIndex: 5,
                maskImage: 'linear-gradient(to top, white, transparent)'
              }}
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: 1,
                left: bumpPosition 
              }}
              transition={{ 
                type: "spring",
                stiffness: 500,
                damping: 30
              }}
            />
            
            {/* Main circle bump with enhanced glass effect */}
            <motion.div
              className="absolute w-16 h-16 rounded-full shadow-2xl overflow-hidden"
              style={{ 
                left: bumpPosition,
                transform: 'translateX(-50%)',
                bottom: '8px',
                zIndex: 0,
                background: 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }}
              initial={{ scale: 0 }}
              animate={{ 
                scale: 1,
                left: bumpPosition 
              }}
              transition={{ 
                type: "spring",
                stiffness: 500,
                damping: 30
              }}
            >
              {/* Gradient overlay for depth */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10" />
              
              {/* Inner shine effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/20" />
              
              {/* Colored accent based on active item */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 to-blue-400/10" />
            </motion.div>
          </>
        )}
        
        {/* Main navbar container with enhanced glassmorphism */}
        <div className="relative" style={{ zIndex: 10 }}>
          {/* Background bar with stronger glass effect */}
          <div 
            className="relative rounded-2xl shadow-2xl overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.6)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}
          >
            {/* Multiple gradient layers for depth */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-purple-500/5 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent pointer-events-none" />
            
            <div className="relative px-2 py-2">
              <div className="flex justify-around items-center">
                {/* Navigation Items */}
                {navItems.map((item) => {
                  const isItemActive = isActive(item.path);
                  const Icon = isItemActive ? item.activeIcon : item.icon;
                  
                  return (
                    <Link key={item.path} href={item.path}>
                      <motion.div
                        className="relative flex items-center justify-center cursor-pointer w-12 h-12"
                        data-tutorial={item.testId}
                        whileTap={{ scale: 0.9 }}
                      >
                        {/* Icon */}
                        <motion.div
                          className="relative flex items-center justify-center"
                          animate={{
                            y: isItemActive ? -8 : 0,
                            scale: isItemActive ? 1.15 : 1,
                          }}
                          transition={{ 
                            type: "spring",
                            stiffness: 500,
                            damping: 25
                          }}
                        >
                          <Icon 
                            className={`
                              w-6 h-6 transition-all duration-300
                              ${isItemActive 
                                ? 'text-cyan-600 dark:text-cyan-400 drop-shadow-lg filter drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]' 
                                : 'text-gray-600 dark:text-gray-400'
                              }
                            `}
                          />
                        </motion.div>
                      </motion.div>
                    </Link>
                  );
                })}

                {/* Add Button */}
                <Link href="/add-food">
                  <motion.div
                    className="relative flex items-center justify-center cursor-pointer w-12 h-12"
                    whileTap={{ scale: 0.9 }}
                    data-testid="add-food-button"
                    data-tutorial="add-food-button"
                  >
                    {/* Add icon */}
                    <motion.div
                      className="relative flex items-center justify-center"
                      animate={{
                        y: location === "/add-food" ? -8 : 0,
                        scale: location === "/add-food" ? 1.15 : 1,
                        rotate: location === "/add-food" ? 45 : 0,
                      }}
                      transition={{ 
                        type: "spring",
                        stiffness: 500,
                        damping: 25
                      }}
                    >
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 overflow-hidden
                        ${location === "/add-food" 
                          ? 'shadow-lg shadow-purple-500/30' 
                          : 'shadow-md shadow-cyan-500/20'
                        }
                      `}
                      style={{
                        background: location === "/add-food" 
                          ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.8), rgba(236, 72, 153, 0.8))'
                          : 'linear-gradient(135deg, rgba(6, 182, 212, 0.8), rgba(59, 130, 246, 0.8))',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.3)'
                      }}>
                        {/* Glass shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent" />
                        
                        {location === "/add-food" ? (
                          <span className="text-white text-2xl font-light relative z-10">×</span>
                        ) : (
                          <IoAddCircleOutline className="w-6 h-6 text-white relative z-10" />
                        )}
                      </div>
                    </motion.div>
                  </motion.div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}