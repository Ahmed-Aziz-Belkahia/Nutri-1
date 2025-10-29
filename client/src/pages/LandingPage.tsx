import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Sparkles, ChefHat, Calendar, TrendingUp, Heart, Zap, Apple } from "lucide-react";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  
  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.6, -0.05, 0.01, 0.99]
      }
    }
  };

  const scaleIn = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { 
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.6, -0.05, 0.01, 0.99]
      }
    }
  };

  const features = [
    {
      icon: ChefHat,
      title: "AI Meal Plans",
      description: "Personalized weekly plans for your goals"
    },
    {
      icon: Calendar,
      title: "Smart Tracking",
      description: "Track calories, macros, and progress effortlessly"
    },
    {
      icon: Apple,
      title: "Recipe Library",
      description: "Thousands of healthy recipes at your fingertips"
    }
  ];

  return (
    <div className="min-h-screen gradient-bg overflow-hidden relative flex flex-col">
      {/* Main content - centered vertically */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-md mx-auto w-full">
        
        {/* App Icon */}
        <motion.div 
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          className="mb-8"
        >
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-[#0CC5BA] to-[#26A8FF] rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-10 h-10 text-white" strokeWidth={2.5} />
            </div>
          </div>
        </motion.div>

        {/* App Name & Tagline */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="text-center mb-8"
        >
          <h1 className="text-5xl font-bold mb-3 text-gray-900">
            NutriAI
          </h1>
          <p className="text-lg text-gray-700 font-medium">
            Your AI Nutrition Coach
          </p>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
          className="w-full space-y-3 mb-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
            >
              <Card className="bg-white/95 backdrop-blur-sm border-none shadow-lg p-4">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#0CC5BA]/10 to-[#26A8FF]/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-6 h-6 text-[#26A8FF]" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.5 }}
          className="w-full space-y-3"
        >
          {/* Primary CTA */}
          <Button
            onClick={() => setLocation("/auth?tab=signup")}
            className="w-full bg-white hover:bg-white/90 text-[#26A8FF] text-base font-semibold py-6 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Get Started Free
          </Button>

          {/* Secondary CTA */}
          <Button
            onClick={() => setLocation("/auth?tab=login")}
            variant="ghost"
            className="w-full text-gray-900 hover:bg-white/10 text-base font-medium py-6 rounded-xl transition-all duration-300"
          >
            Sign In
          </Button>
        </motion.div>

        {/* Stats/Social Proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="mt-8 text-center"
        >
          <div className="flex items-center justify-center space-x-6 text-gray-600 text-sm">
            <div className="flex items-center space-x-1">
              <Heart className="w-4 h-4" fill="currentColor" />
              <span>AI Powered</span>
            </div>
            <div className="w-1 h-1 bg-gray-400 rounded-full" />
            <div className="flex items-center space-x-1">
              <Zap className="w-4 h-4" />
              <span>Fast & Easy</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}