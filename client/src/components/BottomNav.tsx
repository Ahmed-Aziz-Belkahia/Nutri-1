import { useLocation, Link } from "wouter";
import React from 'react';
import { 
  IoHomeOutline, 
  IoHome, 
  IoReaderOutline, 
  IoReader, 
  IoStatsChartOutline, 
  IoStatsChart
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

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-[9999] bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-gray-200 dark:border-gray-700 shadow-2xl"
      style={{ 
        paddingBottom: 'env(safe-area-inset-bottom)',
        position: 'fixed',
        bottom: '0',
        left: '0',
        right: '0',
        width: '100%'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-purple-500/5 pointer-events-none" />
      
      <div className="relative">
        <div className="px-4 py-3">
          <div className="flex justify-around items-center">
              {/* Navigation Items */}
              {navItems.map((item) => {
                const isItemActive = isActive(item.path);
                const Icon = isItemActive ? item.activeIcon : item.icon;
                
                return (
                  <Link key={item.path} href={item.path}>
                    <motion.div
                      className={`
                        relative flex items-center justify-center cursor-pointer w-12 h-12 rounded-xl
                        transition-all duration-300
                        ${isItemActive 
                          ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border border-white/20 shadow-lg' 
                          : ''
                        }
                      `}
                      data-tutorial={item.testId}
                      whileTap={{ scale: 0.9 }}
                    >
                      {/* Icon */}
                      <motion.div
                        className="relative flex items-center justify-center"
                        animate={{
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
                              ? 'text-cyan-600 dark:text-cyan-400 drop-shadow-lg' 
                              : 'text-gray-500 dark:text-gray-400'
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
                  className={`
                    relative flex items-center justify-center cursor-pointer w-12 h-12 rounded-xl
                    transition-all duration-300
                    ${location === "/add-food"
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg' 
                      : 'bg-gradient-to-r from-cyan-500 to-cyan-600'
                    }
                  `}
                  whileTap={{ scale: 0.9 }}
                  data-testid="add-food-button"
                  data-tutorial="add-food-button"
                >
                  <span className="text-white text-2xl font-light">
                    {location === "/add-food" ? '×' : '+'}
                  </span>
                </motion.div>
              </Link>
            </div>
          </div>
      </div>
    </nav>
  );
}