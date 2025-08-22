import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  Sparkles, 
  BarChart3, 
  Camera, 
  Utensils,
  Zap,
  Target,
  ChevronRight
} from "lucide-react";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  
  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };

  const features = [
    {
      icon: Camera,
      title: "AI Food Recognition",
      description: "Snap a photo and instantly get nutritional info"
    },
    {
      icon: Utensils,
      title: "Smart Meal Plans",
      description: "Personalized plans that adapt to your goals"
    },
    {
      icon: BarChart3,
      title: "Track Progress",
      description: "Visual insights into your nutrition journey"
    },
    {
      icon: Target,
      title: "Achieve Goals",
      description: "Science-backed approach to reach your targets"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white overflow-hidden relative">
      {/* Subtle background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-cyan-100/30 to-teal-100/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-blue-100/30 to-cyan-100/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-teal-50/20 to-cyan-50/20 rounded-full blur-3xl" />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-12">
        
        {/* Hero Section */}
        <motion.div
          initial="hidden"
          animate="visible"
          className="text-center max-w-3xl mx-auto mb-16"
        >
          {/* Logo/App Icon */}
          <motion.div 
            variants={fadeIn}
            className="mb-8 inline-flex items-center justify-center"
          >
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-[#0CC5BA] to-[#00BCD6] rounded-3xl flex items-center justify-center shadow-2xl shadow-teal-500/25">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-[#0CC5BA] to-[#00BCD6] rounded-3xl blur-xl opacity-50" />
            </div>
          </motion.div>

          {/* App Name */}
          <motion.h1 
            variants={fadeInUp}
            className="text-6xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent"
          >
            NutriAI
          </motion.h1>

          {/* Tagline */}
          <motion.p 
            variants={fadeInUp}
            className="text-xl md:text-2xl text-gray-600 mb-12 font-light"
          >
            Your AI-Powered Nutrition Companion
          </motion.p>

          {/* CTA Button */}
          <motion.div
            variants={fadeInUp}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={() => setLocation("/auth?tab=signup")}
              className="bg-gradient-to-r from-[#0CC5BA] to-[#00BCD6] hover:from-[#0CC5BA]/90 hover:to-[#00BCD6]/90 text-white text-lg font-medium px-10 py-7 rounded-2xl shadow-xl shadow-teal-500/25 transition-all duration-300 group"
            >
              <span className="mr-2">Let's get started</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>

          {/* Sign in link */}
          <motion.p
            variants={fadeInUp}
            className="mt-6 text-gray-500"
          >
            Already have an account?{" "}
            <button
              onClick={() => setLocation("/auth?tab=login")}
              className="text-[#0CC5BA] hover:text-[#0CC5BA]/80 font-medium transition-colors"
            >
              Sign in
            </button>
          </motion.p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.1, delayChildren: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto w-full"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              className="relative group"
            >
              {/* Glass card */}
              <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex flex-col items-center text-center space-y-3">
                  {/* Icon */}
                  <div className="w-12 h-12 bg-gradient-to-br from-[#0CC5BA]/10 to-[#00BCD6]/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <feature.icon className="w-6 h-6 text-[#0CC5BA]" />
                  </div>
                  
                  {/* Title */}
                  <h3 className="font-semibold text-gray-800 text-sm">
                    {feature.title}
                  </h3>
                  
                  {/* Description */}
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom decoration */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="flex space-x-1">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 bg-gradient-to-br from-[#0CC5BA] to-[#00BCD6] rounded-full animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </motion.div>
      </div>

    </div>
  );
}