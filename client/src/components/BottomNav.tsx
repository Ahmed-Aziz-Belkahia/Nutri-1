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

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ 
        position: 'fixed',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      <div className="relative mx-3 mb-2">
        {/* Main navbar container with glassmorphism */}
        <div className="relative overflow-visible">
          {/* Background bar */}
          <div className="relative rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border border-white/20 shadow-xl">
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
                        {/* Circular bump that's part of the navbar */}
                        {isItemActive && (
                          <motion.div
                            className="absolute -top-6 w-16 h-16 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border border-white/20 shadow-xl"
                            initial={{ scale: 0, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0, y: 20 }}
                            transition={{ 
                              type: "spring",
                              stiffness: 500,
                              damping: 25
                            }}
                          >
                            {/* Inner gradient */}
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/10 to-blue-500/10" />
                            
                            {/* Bottom connectors to make it look integrated */}
                            <div className="absolute bottom-0 left-2 right-2 h-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg -mb-1" />
                          </motion.div>
                        )}

                        {/* Icon */}
                        <motion.div
                          className="relative z-10 flex items-center justify-center"
                          animate={{
                            y: isItemActive ? -6 : 0,
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
                    className="relative flex items-center justify-center cursor-pointer w-12 h-12"
                    whileTap={{ scale: 0.9 }}
                    data-testid="add-food-button"
                    data-tutorial="add-food-button"
                  >
                    {/* Circular bump for add button when active */}
                    {location === "/add-food" && (
                      <motion.div
                        className="absolute -top-6 w-16 h-16 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border border-white/20 shadow-xl"
                        initial={{ scale: 0, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0, y: 20 }}
                        transition={{ 
                          type: "spring",
                          stiffness: 500,
                          damping: 25
                        }}
                      >
                        {/* Inner gradient */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/10 to-pink-500/10" />
                        
                        {/* Bottom connectors */}
                        <div className="absolute bottom-0 left-2 right-2 h-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg -mb-1" />
                      </motion.div>
                    )}

                    {/* Add icon */}
                    <motion.div
                      className="relative z-10 flex items-center justify-center"
                      animate={{
                        y: location === "/add-food" ? -6 : 0,
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
                        w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all duration-300
                        ${location === "/add-food" 
                          ? 'bg-gradient-to-br from-purple-500 to-pink-500' 
                          : 'bg-gradient-to-br from-cyan-500 to-blue-500'
                        }
                      `}>
                        {location === "/add-food" ? (
                          <span className="text-white text-2xl font-light">×</span>
                        ) : (
                          <IoAddCircleOutline className="w-6 h-6 text-white" />
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