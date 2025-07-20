import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  
  // Simple animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="h-screen w-screen fixed inset-0 overflow-hidden">
      {/* Background image of a woman with healthy food */}
      <div 
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{ 
          backgroundImage: "url('/img/woman-healthy-eating.png')",
          filter: "brightness(0.95)"
        }}
      />
      
      {/* Dark overlay with app color tint */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0CC5BA]/30 to-[#00BCD6]/20 z-10" />
      
      {/* Content */}
      <div className="relative z-20 container mx-auto px-4 h-full flex items-center justify-end">
        <motion.div
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.15 }}
          className="max-w-lg bg-black/25 p-8 rounded-xl backdrop-blur-sm"
        >
          <motion.h1 
            variants={fadeInUp}
            className="text-5xl md:text-6xl font-bold text-white mb-4"
          >
            NutriAI
          </motion.h1>
          
          <motion.div
            variants={fadeInUp}
            className="h-1.5 w-24 bg-gradient-to-r from-[#0CC5BA] to-[#00BCD6] rounded-full mb-6"
          />
          
          <motion.p 
            variants={fadeInUp}
            className="text-xl text-white/90 mb-8"
          >
            Twój osobisty trener AI ds. żywienia. Śledź kalorie, otrzymuj spersonalizowane plany posiłków i osiągaj cele fitness szybciej.
          </motion.p>
          
          <motion.div variants={fadeInUp}>
            <Button
              className="bg-gradient-to-r from-[#0CC5BA] to-[#00BCD6] hover:opacity-90 text-white font-medium rounded-lg py-6 px-8 text-lg"
              onClick={() => setLocation("/auth?tab=signup")}
            >
              Zacznij teraz
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}