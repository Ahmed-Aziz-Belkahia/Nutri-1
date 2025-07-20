import { Button } from "@/components/ui/button";
import { ChevronLeft, HelpCircle, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

export default function HelpPage() {
  const [, setLocation] = useLocation();

  const helpItems = [
    {
      title: "Getting Started",
      description: "Learn the basics of using Nutri AI",
      link: "#"
    },
    {
      title: "Tracking Meals",
      description: "How to log and track your meals effectively",
      link: "#"
    },
    {
      title: "Progress Tracking",
      description: "Understanding your progress metrics",
      link: "#"
    },
    {
      title: "FAQ",
      description: "Frequently asked questions",
      link: "#"
    },
    {
      title: "Contact Support",
      description: "Get help from our support team",
      link: "#"
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
              <HelpCircle className="h-5 w-5 text-[#0CC5BA] mr-2" />
              <h1 className="text-xl font-medium bg-gradient-to-r from-[#0CC5BA] to-blue-500 bg-clip-text text-transparent">
                Help & Support
              </h1>
            </div>
          </div>
        </div>
      </header>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-4 py-6 space-y-4"
      >
        {helpItems.map((item) => (
          <motion.a
            key={item.title}
            variants={itemVariants}
            href={item.link}
            className="block p-4 rounded-2xl bg-white/50 backdrop-blur-lg border border-white/20 hover:bg-white/60 transition-all duration-300 group"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-medium text-gray-900 group-hover:text-[#0CC5BA] transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
              <ExternalLink className="h-5 w-5 text-gray-400 group-hover:text-[#0CC5BA] group-hover:translate-x-1 transition-all" />
            </div>
          </motion.a>
        ))}

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 p-4 rounded-2xl bg-gradient-to-br from-[#0CC5BA]/10 to-blue-500/10 border border-white/20 backdrop-blur-md"
        >
          <p className="text-sm text-gray-600 leading-relaxed">
            Can't find what you're looking for? Contact our support team and we'll get back to you as soon as possible.
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}