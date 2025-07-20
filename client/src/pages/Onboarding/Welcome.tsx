import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowRight } from "lucide-react";

export default function Welcome() {
  const [, setLocation] = useLocation();

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gradient-to-br from-[#0CC5BA]/5 to-blue-500/5 flex flex-col"
    >
      {/* Neural Interface Header */}
      <div className="h-1/2 relative overflow-hidden">
        {/* Animated background patterns */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(12,197,186,0.15)_0%,transparent_70%)]"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:100%_4px]" />
        </div>

        {/* Logo Animation */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="relative">
            <motion.div
              className="absolute -inset-4 rounded-full bg-[#0CC5BA]/20"
              animate={{
                scale: [1, 1.2],
                opacity: [0.5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear",
              }}
            />
            <span className="text-7xl">🥗</span>
          </div>
        </motion.div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pb-8 flex flex-col justify-end">
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-4xl font-bold bg-gradient-to-r from-[#0CC5BA] to-blue-500 bg-clip-text text-transparent"
        >
          Welcome to Nutri AI
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-4 text-lg text-gray-600"
        >
          Your personal AI-powered nutrition companion. Let's begin your journey to better health.
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="mt-8"
        >
          <Button
            className="w-full h-14 text-lg rounded-2xl bg-gradient-to-r from-[#0CC5BA] to-blue-500 hover:opacity-90 transition-opacity"
            onClick={() => setLocation("/quiz")}
          >
            Get Started
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </motion.div>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.3 }}
          className="mt-4 text-sm text-center text-gray-500"
        >
          Takes only 2 minutes to setup
        </motion.p>
      </div>
    </motion.div>
  );
}