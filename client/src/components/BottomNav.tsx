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
import { motion, AnimatePresence } from 'framer-motion';

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
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ 
        position: 'fixed',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      {/* Glassmorphism container - shorter height */}
      <div className="relative mx-3 mb-2">
        {/* Main glass container */}
        <div className="relative rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border border-white/20 shadow-xl">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-purple-500/5 pointer-events-none" />
          
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
                      {/* Floating circle for active item - properly centered */}
                      <AnimatePresence>
                        {isItemActive && (
                          <>
                            {/* Background circle that extends beyond navbar */}
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              transition={{ 
                                type: "spring",
                                stiffness: 500,
                                damping: 25
                              }}
                              className="absolute w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/30"
                              style={{ 
                                top: '-12px',
                                left: '50%',
                                transform: 'translateX(-50%)'
                              }}
                            />
                            {/* Inner white circle */}
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              transition={{ 
                                type: "spring",
                                stiffness: 500,
                                damping: 25,
                                delay: 0.05
                              }}
                              className="absolute w-12 h-12 rounded-full bg-white dark:bg-gray-900"
                              style={{ 
                                top: '-8px',
                                left: '50%',
                                transform: 'translateX(-50%)'
                              }}
                            />
                          </>
                        )}
                      </AnimatePresence>

                      {/* Icon container */}
                      <motion.div
                        className="relative z-10 flex items-center justify-center"
                        animate={{
                          y: isItemActive ? -8 : 0,
                        }}
                        transition={{ 
                          type: "spring",
                          stiffness: 500,
                          damping: 25
                        }}
                      >
                        <Icon 
                          className={`
                            w-6 h-6 transition-colors duration-200
                            ${isItemActive 
                              ? 'text-cyan-600 dark:text-cyan-400' 
                              : 'text-gray-500 dark:text-gray-400'
                            }
                          `}
                        />
                      </motion.div>
                    </motion.div>
                  </Link>
                );
              })}

              {/* Add Button - Compact design */}
              <Link href="/add-food">
                <motion.div
                  className="relative flex items-center justify-center cursor-pointer w-12 h-12"
                  whileTap={{ scale: 0.9 }}
                  data-testid="add-food-button"
                  data-tutorial="add-food-button"
                >
                  {/* Active state for add button */}
                  <AnimatePresence>
                    {location === "/add-food" && (
                      <>
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{ 
                            type: "spring",
                            stiffness: 500,
                            damping: 25
                          }}
                          className="absolute w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30"
                          style={{ 
                            top: '-12px',
                            left: '50%',
                            transform: 'translateX(-50%)'
                          }}
                        />
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{ 
                            type: "spring",
                            stiffness: 500,
                            damping: 25,
                            delay: 0.05
                          }}
                          className="absolute w-12 h-12 rounded-full bg-white dark:bg-gray-900"
                          style={{ 
                            top: '-8px',
                            left: '50%',
                            transform: 'translateX(-50%)'
                          }}
                        />
                      </>
                    )}
                  </AnimatePresence>

                  {/* Add icon */}
                  <motion.div
                    className="relative z-10 flex items-center justify-center"
                    animate={{
                      y: location === "/add-food" ? -8 : 0,
                      rotate: location === "/add-food" ? 45 : 0,
                    }}
                    transition={{ 
                      type: "spring",
                      stiffness: 500,
                      damping: 25
                    }}
                  >
                    {location === "/add-food" ? (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <span className="text-white text-2xl font-light">×</span>
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-md">
                        <IoAddCircleOutline className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}