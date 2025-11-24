import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Bell, Lock, Shield, HelpCircle, Info, LogOut, FileText, BookOpen, MessageCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/hooks/use-user";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import PullToRefresh from "@/components/PullToRefresh";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";

export default function Settings() {
  const [, setLocation] = useLocation();
  const { logout, user } = useUser(); // Added user to destructured object

  // Pull to refresh setup
  const handleRefresh = usePullToRefresh([
    ['/api/user/profile']
  ]);

  const { t } = useTranslation(['common']);

  const handleLogout = async () => {
    try {
      await logout();
      // Use window.location for direct navigation to auth page
      window.location.href = '/auth';
      toast({
        title: t('common:settings.logoutSuccess'),
        description: t('common:settings.logoutSuccessDesc'),
      });
    } catch (error) {
      toast({
        title: t('common:settings.logoutError'),
        description: t('common:settings.logoutErrorDesc'),
        variant: "destructive",
      });
    }
  };

  const settingsItems = [
    {
      icon: <FileText className="w-5 h-5" />,
      label: t('common:settings.privacyPolicy'),
      onClick: () => setLocation('/privacy'),
      description: t('common:settings.privacyPolicyDesc'),
      color: "#0CC5BA"
    },
    {
      icon: <LogOut className="w-5 h-5" />,
      label: t('common:settings.logout'),
      onClick: handleLogout,
      description: t('common:settings.logoutDesc'),
      color: "#FF0000"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 10
      }
    }
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen bg-gradient-to-br from-white to-gray-50"
      >
      {/* Glassmorphic Header */}
      <header className="sticky top-0 backdrop-blur-xl bg-white/70 border-b border-white/20 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setLocation("/")} 
              className="-ml-2 p-2 rounded-xl hover:bg-white/40 transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </motion.button>
            <h1 className="text-xl font-medium ml-2 bg-gradient-to-r from-[#0CC5BA] to-blue-500 bg-clip-text text-transparent">
              {t('common:settings.title')}
            </h1>
          </div>
        </div>
      </header>

      <div className="px-4 py-6">
        {/* Profile Section with 3D Animation */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ 
            type: "spring",
            stiffness: 100,
            damping: 20,
            delay: 0.1 
          }}
          className="flex flex-col items-center mb-12 relative"
        >
          {/* Background Gradient Circle */}
          <div className="absolute -top-10 w-64 h-64 bg-gradient-to-r from-[#0CC5BA]/10 to-blue-500/10 rounded-full blur-3xl" />

          {/* Profile Picture Container */}
          <motion.div 
            whileHover={{ scale: 1.05, rotateY: 10 }}
            className="relative w-28 h-28 rounded-2xl bg-gradient-to-br from-[#0CC5BA] to-blue-500 p-[2px] shadow-lg transform-gpu"
          >
            <div className="w-full h-full bg-white rounded-2xl flex items-center justify-center overflow-hidden">
              <motion.span 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-5xl"
              >
                👤
              </motion.span>
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center mt-4 relative z-10"
          >
            <h2 className="text-2xl font-semibold bg-gradient-to-r from-[#0CC5BA] to-blue-500 bg-clip-text text-transparent">
              {user?.email?.split('@')[0] || t('common:settings.userPlaceholder')}
            </h2>
            <p className="text-gray-500 mt-1">{user?.email || t('common:settings.noEmailAvailable')}</p>
          </motion.div>
        </motion.div>

        {/* Settings Menu with Advanced Animations */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {settingsItems.map((item, index) => (
            <motion.div
              key={item.label}
              variants={itemVariants}
              whileHover={{ scale: 1.02, translateX: 8 }}
              whileTap={{ scale: 0.98 }}
            >
              <button onClick={item.onClick} className="w-full p-4 rounded-2xl bg-white/50 backdrop-blur-lg border border-white/20 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ 
                        background: `linear-gradient(135deg, ${item.color}20, ${item.color}40)`,
                      }}
                    >
                      <div className="text-red-500 transition-colors">
                        {item.icon}
                      </div>
                    </div>
                    <div className="text-left">
                      <span className="font-medium text-red-500">
                        {item.label}
                      </span>
                      <p className="text-sm text-gray-500 mt-0.5">{item.description}</p>
                    </div>
                  </div>
                </div>
              </button>
            </motion.div>
          ))}
        </motion.div>
      </div>
      </motion.div>
    </PullToRefresh>
  );
}