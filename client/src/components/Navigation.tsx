import { Home, Scale, Plus, BarChart } from "lucide-react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";

export default function Navigation() {
  const [location] = useLocation();

  const navItems = [
    { icon: Home, path: "/dashboard", label: "Home" },
    { icon: Scale, path: "/logs", label: "Logs" },
    { icon: Plus, path: "/add", label: "Add" },
    { icon: BarChart, path: "/analytics", label: "Analytics" }
  ];

  return (
    <motion.div 
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50"
    >
      <div className="relative mx-6 mb-6">
        {/* Glassmorphic container with light gradient */}
        <div className="absolute inset-0 bg-white/90 backdrop-blur-xl rounded-full shadow-lg border border-gray-100 overflow-hidden">
          {/* Subtle animated gradient overlay */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-[#0CC5BA]/5 via-[#0CC5BA]/10 to-[#0CC5BA]/5"
            animate={{
              x: ['0%', '100%', '0%'],
            }}
            transition={{
              duration: 15,
              ease: "linear",
              repeat: Infinity,
            }}
          />
          {/* Extra subtle top highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#0CC5BA]/0 via-[#0CC5BA]/30 to-[#0CC5BA]/0" />
        </div>

        {/* Navigation content */}
        <div className="relative flex justify-between items-center px-16 py-6">
          {navItems.map((item) => {
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative"
                >
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300
                    ${isActive 
                      ? 'bg-[#0CC5BA]/10' 
                      : 'hover:bg-[#0CC5BA]/5'}`}
                  >
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 rounded-full bg-[#0CC5BA]/5"
                        animate={{
                          opacity: [0.3, 0.5, 0.3],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    )}

                    <item.icon
                      className={`h-7 w-7 relative z-10 transition-all duration-300 ${
                        isActive 
                          ? 'text-[#0CC5BA]' 
                          : 'text-gray-400 hover:text-[#0CC5BA]'
                      }`}
                    />
                  </div>

                  {isActive && (
                    <motion.div
                      layoutId="navIndicator"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#0CC5BA]
                        before:absolute before:inset-0 before:rounded-full 
                        before:bg-[#0CC5BA]/30 before:animate-ping"
                      transition={{ 
                        type: "spring", 
                        bounce: 0.2, 
                        duration: 0.6 
                      }}
                    />
                  )}
                </motion.button>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Safe area padding for iOS */}
      <div className="h-[env(safe-area-inset-bottom,0px)]" />
    </motion.div>
  );
}