import { motion } from "framer-motion";
import { BarChart, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function ProgressCard() {
  return (
    <Card className="p-4 rounded-2xl border-[#0CC5BA]/10 bg-gradient-to-br from-[#0CC5BA]/5 to-blue-500/5 backdrop-blur-xl hover:shadow-sm hover:shadow-[#0CC5BA]/10 transition-all duration-300">
      <div className="flex items-center gap-3">
        <motion.div
          whileHover={{ scale: 1.05, rotate: 5 }}
          transition={{ duration: 0.5 }}
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0CC5BA] to-blue-500 flex items-center justify-center shadow-md shadow-[#0CC5BA]/10"
        >
          <BarChart className="w-5 h-5 text-white" />
        </motion.div>
        <div>
          <motion.div 
            initial={{ y: -5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-xl font-bold bg-gradient-to-br from-[#0CC5BA] to-blue-500 bg-clip-text text-transparent"
          >
            Progress Tracking
          </motion.div>
          <motion.div 
            initial={{ y: 5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-sm text-gray-500"
          >
            Monitor your nutrition journey
          </motion.div>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-3 text-xs text-gray-600 bg-white/50 p-2.5 rounded-xl flex items-center gap-1.5"
      >
        <Activity className="w-3.5 h-3.5 text-[#0CC5BA]" />
        Track your daily nutrition for better health insights
      </motion.div>
    </Card>
  );
}