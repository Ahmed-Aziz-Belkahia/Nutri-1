import { useLocation, Link } from "wouter";
import React, { useState } from 'react';
import { 
  IoHomeOutline, 
  IoHome, 
  IoReaderOutline, 
  IoReader, 
  IoStatsChartOutline, 
  IoStatsChart,
  IoAddCircle,
  IoSparkles,
  IoNutrition
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
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

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
      {/* Glassmorphism container */}
      <div className="relative">
        {/* Gradient border effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 blur-xl" />
        
        {/* Main glass container */}
        <div className="relative mx-2 mb-2 rounded-3xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-white/20 shadow-2xl shadow-black/10">
          {/* Inner glow effect */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
          
          <div className="relative px-4 py-3">
            <div className="flex justify-around items-center">
              {/* Navigation Items */}
              {navItems.map((item) => {
                const isItemActive = isActive(item.path);
                const Icon = isItemActive ? item.activeIcon : item.icon;
                
                return (
                  <Link key={item.path} href={item.path}>
                    <motion.div
                      className="relative flex flex-col items-center cursor-pointer group"
                      data-tutorial={item.testId}
                      onHoverStart={() => setHoveredItem(item.path)}
                      onHoverEnd={() => setHoveredItem(null)}
                      whileTap={{ scale: 0.95 }}
                    >
                      {/* Active indicator backdrop */}
                      <AnimatePresence>
                        {isItemActive && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ duration: 0.3, type: "spring" }}
                            className="absolute inset-0 -m-2 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 blur-md"
                          />
                        )}
                      </AnimatePresence>

                      {/* Icon container */}
                      <motion.div
                        className="relative p-2 rounded-xl transition-all duration-300"
                        animate={{
                          y: isItemActive ? -2 : 0,
                        }}
                      >
                        {/* Hover glow effect */}
                        <AnimatePresence>
                          {hoveredItem === item.path && !isItemActive && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 0.3 }}
                              exit={{ scale: 0, opacity: 0 }}
                              className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-400 blur-md"
                            />
                          )}
                        </AnimatePresence>

                        <Icon 
                          className={`
                            w-6 h-6 relative z-10 transition-all duration-300
                            ${isItemActive 
                              ? 'text-cyan-600 dark:text-cyan-400 drop-shadow-lg' 
                              : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                            }
                          `}
                        />
                        
                        {/* Sparkle effect for active items */}
                        {isItemActive && (
                          <motion.div
                            initial={{ scale: 0, rotate: 0 }}
                            animate={{ 
                              scale: [0, 1, 0],
                              rotate: [0, 180, 360],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              repeatDelay: 3
                            }}
                            className="absolute top-0 right-0"
                          >
                            <IoSparkles className="w-3 h-3 text-yellow-400" />
                          </motion.div>
                        )}
                      </motion.div>

                      {/* Label */}
                      <AnimatePresence>
                        {(isItemActive || hoveredItem === item.path) && (
                          <motion.span
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            transition={{ duration: 0.2 }}
                            className={`
                              text-xs mt-1 font-medium
                              ${isItemActive 
                                ? 'text-cyan-600 dark:text-cyan-400' 
                                : 'text-gray-600 dark:text-gray-400'
                              }
                            `}
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </Link>
                );
              })}

              {/* Floating Add Button */}
              <Link href="/add-food">
                <motion.div
                  className="relative -mt-4"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  data-testid="add-food-button"
                  data-tutorial="add-food-button"
                >
                  {/* Pulsing ring animation */}
                  <motion.div
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 0, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                  
                  {/* Main button with gradient */}
                  <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500 shadow-xl shadow-cyan-500/30 flex items-center justify-center group overflow-hidden">
                    {/* Inner shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-white/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Rotating gradient background */}
                    <motion.div
                      className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400 via-transparent to-purple-400"
                      animate={{
                        rotate: 360,
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                      style={{ opacity: 0.3 }}
                    />
                    
                    {/* Icon */}
                    <motion.div
                      animate={{
                        rotate: location === "/add-food" ? 45 : 0,
                      }}
                      transition={{ duration: 0.3, type: "spring" }}
                      className="relative z-10"
                    >
                      <IoAddCircle className="w-8 h-8 text-white drop-shadow-lg" />
                    </motion.div>

                    {/* Food icon overlay */}
                    <motion.div
                      className="absolute"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{
                        scale: location === "/add-food" ? 1 : 0,
                        opacity: location === "/add-food" ? 1 : 0,
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <IoNutrition className="w-5 h-5 text-white/90" />
                    </motion.div>
                  </div>

                  {/* Label for add button */}
                  <AnimatePresence>
                    {location === "/add-food" && (
                      <motion.span
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-xs font-medium text-cyan-600 dark:text-cyan-400 whitespace-nowrap"
                      >
                        Add Food
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}