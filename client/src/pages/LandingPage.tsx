import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  
  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.6, -0.05, 0.01, 0.99]
      }
    }
  };

  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: {
        duration: 1,
        ease: "easeOut"
      }
    }
  };

  const scaleIn = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.6, -0.05, 0.01, 0.99]
      }
    }
  };

  return (
    <div className="min-h-screen bg-white overflow-hidden relative flex flex-col">
      {/* Subtle gradient background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-gray-50/50 to-white" />
        {/* Soft gradient orbs */}
        <div className="absolute -top-[40%] -right-[20%] w-[80%] h-[80%] bg-gradient-to-br from-cyan-100/40 via-teal-100/30 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-[40%] -left-[20%] w-[80%] h-[80%] bg-gradient-to-tr from-teal-100/40 via-cyan-100/30 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Main content - centered vertically */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 py-16">
        
        {/* App Icon */}
        <motion.div 
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          className="mb-12"
        >
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-[#0CC5BA] to-[#00BCD6] rounded-[28px] flex items-center justify-center shadow-2xl shadow-teal-500/20">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0CC5BA] to-[#00BCD6] rounded-[28px] blur-2xl opacity-40" />
          </div>
        </motion.div>

        {/* App Name */}
        <motion.h1 
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="text-7xl font-bold mb-3 bg-gradient-to-b from-gray-900 to-gray-700 bg-clip-text text-transparent tracking-tight"
        >
          NutriAI
        </motion.h1>

        {/* Tagline */}
        <motion.p 
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
          className="text-xl text-gray-500 mb-16 font-light text-center max-w-xs"
        >
          Your personal AI nutrition coach in your pocket
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2 }}
          className="flex flex-col w-full max-w-xs space-y-3"
        >
          {/* Primary CTA */}
          <Button
            onClick={() => setLocation("/auth?tab=signup")}
            className="w-full bg-gradient-to-r from-[#0CC5BA] to-[#00BCD6] hover:opacity-90 text-white text-lg font-semibold py-7 rounded-2xl shadow-lg shadow-teal-500/20 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Get Started
          </Button>

          {/* Secondary CTA */}
          <Button
            onClick={() => setLocation("/auth?tab=login")}
            variant="ghost"
            className="w-full text-gray-600 hover:text-gray-900 text-base font-medium py-6 rounded-2xl transition-all duration-300"
          >
            I already have an account
          </Button>
        </motion.div>
      </div>

      {/* Bottom section with subtle branding */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
        className="relative z-10 pb-12 text-center"
      >
        <div className="flex items-center justify-center space-x-2 text-xs text-gray-400">
          <div className="w-1 h-1 bg-gray-300 rounded-full" />
          <span>Powered by AI</span>
          <div className="w-1 h-1 bg-gray-300 rounded-full" />
        </div>
      </motion.div>

      {/* Decorative dots animation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 1 }}
        className="absolute bottom-20 left-1/2 -translate-x-1/2"
      >
        <div className="flex space-x-1.5">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 bg-gradient-to-br from-[#0CC5BA] to-[#00BCD6] rounded-full"
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.3,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}