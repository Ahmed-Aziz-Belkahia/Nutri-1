import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Shield } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function SecurityPage() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation(['common']);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement password change logic
  };

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
    hidden: { x: -20, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 10
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gradient-to-br from-[#0CC5BA]/5 to-blue-500/5"
    >
      <header className="sticky top-0 backdrop-blur-xl bg-white/70 border-b border-white/20 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setLocation("/settings")} 
              className="-ml-2 p-2 rounded-xl hover:bg-white/40 transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </motion.button>
            <div className="flex items-center ml-2">
              <Shield className="h-5 w-5 text-[#0CC5BA] mr-2" />
              <h1 className="text-xl font-medium bg-gradient-to-r from-[#0CC5BA] to-blue-500 bg-clip-text text-transparent">
                {t('common:security.title')}
              </h1>
            </div>
          </div>
        </div>
      </header>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-4 py-6"
      >
        <motion.form 
          onSubmit={handlePasswordChange} 
          className="space-y-4"
          variants={itemVariants}
        >
          <div className="p-4 rounded-2xl bg-white/50 backdrop-blur-lg border border-white/20 shadow-sm space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-900">{t('common:security.currentPassword')}</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1 bg-white/70 border-white/20"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-900">{t('common:security.newPassword')}</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 bg-white/70 border-white/20"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-900">{t('common:security.confirmNewPassword')}</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 bg-white/70 border-white/20"
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-[#0CC5BA] to-blue-500 text-white hover:opacity-90"
          >
            {t('common:security.changePasswordButton')}
          </Button>
        </motion.form>

        <motion.div 
          variants={containerVariants} 
          className="mt-8 space-y-4"
        >
          <motion.div variants={itemVariants}>
            <Button 
              variant="outline" 
              className="w-full bg-white/50 backdrop-blur-lg border-white/20"
              onClick={() => {/* TODO: Implement 2FA setup */}}
            >
              {t('common:security.setup2FA')}
            </Button>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Button 
              variant="outline" 
              className="w-full text-red-500 hover:text-red-600 bg-white/50 backdrop-blur-lg border-white/20"
              onClick={() => {/* TODO: Implement account deletion */}}
            >
              {t('common:security.deleteAccount')}
            </Button>
          </motion.div>
        </motion.div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 p-4 rounded-2xl bg-gradient-to-br from-[#0CC5BA]/10 to-blue-500/10 border border-white/20 backdrop-blur-md"
        >
          <p className="text-sm text-gray-600 leading-relaxed">
            {t('common:security.infoCard')}
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}