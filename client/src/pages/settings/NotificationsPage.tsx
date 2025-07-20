import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, Bell } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function NotificationsPage() {
  const [, setLocation] = useLocation();
  const [dailyReminder, setDailyReminder] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [goalUpdates, setGoalUpdates] = useState(true);

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
      className="min-h-screen bg-gradient-to-br from-white to-gray-50"
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
              <Bell className="h-5 w-5 text-[#0CC5BA] mr-2" />
              <h1 className="text-xl font-medium bg-gradient-to-r from-[#0CC5BA] to-blue-500 bg-clip-text text-transparent">
                Notifications
              </h1>
            </div>
          </div>
        </div>
      </header>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-4 py-6 space-y-6"
      >
        <motion.div 
          variants={itemVariants}
          className="p-4 rounded-2xl bg-white/50 backdrop-blur-lg border border-white/20 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-base font-medium">Daily Reminder</div>
              <div className="text-sm text-gray-500">Get daily reminders to log your meals</div>
            </div>
            <Switch
              checked={dailyReminder}
              onCheckedChange={setDailyReminder}
              className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-[#0CC5BA] data-[state=checked]:to-blue-500"
            />
          </div>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          className="p-4 rounded-2xl bg-white/50 backdrop-blur-lg border border-white/20 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-base font-medium">Weekly Report</div>
              <div className="text-sm text-gray-500">Receive weekly progress summary</div>
            </div>
            <Switch
              checked={weeklyReport}
              onCheckedChange={setWeeklyReport}
              className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-[#0CC5BA] data-[state=checked]:to-blue-500"
            />
          </div>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          className="p-4 rounded-2xl bg-white/50 backdrop-blur-lg border border-white/20 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-base font-medium">Goal Updates</div>
              <div className="text-sm text-gray-500">Get notified when you reach your goals</div>
            </div>
            <Switch
              checked={goalUpdates}
              onCheckedChange={setGoalUpdates}
              className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-[#0CC5BA] data-[state=checked]:to-blue-500"
            />
          </div>
        </motion.div>

        {/* Floating Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 p-4 rounded-2xl bg-gradient-to-br from-[#0CC5BA]/10 to-blue-500/10 border border-white/20 backdrop-blur-md"
        >
          <p className="text-sm text-gray-600 leading-relaxed">
            Customize your notification preferences to stay on track with your health goals. 
            We'll only send you the updates that matter most to you.
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}