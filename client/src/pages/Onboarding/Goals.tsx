import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { 
  ArrowLeft, 
  ArrowRight,
  Scale, 
  Heart, 
  Brain, 
  Battery,
  Apple,
  Dumbbell,
  Clock,
  Trophy,
  ChevronLeft,
  ChevronRight 
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

// Update carousel items in Goals.tsx to match Vision.tsx
const carouselItems = [
  {
    image: "/assets/pexels-roseleon-3225889.jpg",
    title: "Welcome to Nutri AI",
    description: "Your personal AI-powered nutrition companion. Let's begin your journey to better health.",
  },
  {
    image: "/assets/pexels-bemistermister-3490348.jpg",
    title: "Personalized Fitness",
    description: "Get customized workout plans and nutritional insights tailored to your unique needs.",
  },
  {
    image: "/assets/pexels-eduardo-romero-817034-1886487.jpg",
    title: "Track Your Progress",
    description: "Monitor your fitness journey with advanced tracking and real-time feedback.",
  },
];

interface Goal {
  id: string;
  icon: typeof Scale;
  title: string;
  description: string;
  color: string;
  badges?: string[];
}

const goals: Goal[] = [
    {
      id: "weight-management",
      icon: Scale,
      title: "Weight Management",
      description: "Set and achieve your ideal weight through personalized nutrition",
      color: "#0CC5BA",
      badges: ["Popular", "AI-Powered"]
    },
    {
      id: "muscle-building",
      icon: Dumbbell,
      title: "Build Muscle",
      description: "Gain lean muscle mass with targeted nutrition plans",
      color: "#3B82F6",
      badges: ["Trending"]
    },
    {
      id: "nutrition-tracking",
      icon: Apple,
      title: "Better Nutrition",
      description: "Track and optimize your daily nutritional intake",
      color: "#10B981",
      badges: ["Essential"]
    },
    {
      id: "energy-levels",
      icon: Battery,
      title: "Boost Energy",
      description: "Maintain high energy levels throughout your day",
      color: "#F59E0B"
    },
    {
      id: "meal-planning",
      icon: Clock,
      title: "Meal Planning",
      description: "Get personalized meal plans and recipe suggestions",
      color: "#EC4899",
      badges: ["AI-Powered"]
    },
    {
      id: "fitness-goals",
      icon: Trophy,
      title: "Fitness Goals",
      description: "Track and achieve your specific fitness milestones",
      color: "#8B5CF6"
    }
  ];

export default function Goals() {
  const [, setLocation] = useLocation();
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [showWelcome, setShowWelcome] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % carouselItems.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + carouselItems.length) % carouselItems.length);
  };

  const toggleGoal = (goalId: string) => {
    setSelectedGoals(prev => 
      prev.includes(goalId)
        ? prev.filter(id => id !== goalId)
        : [...prev, goalId]
    );
  };

  if (showWelcome) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="h-screen bg-white flex flex-col overflow-hidden"
      >
        {/* Image Carousel */}
        <div className="relative flex-1">
          <motion.div
            initial={false}
            animate={{ x: `-${currentSlide * 100}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="flex h-full absolute inset-0"
          >
            {carouselItems.map((item, index) => (
              <div
                key={index}
                className="relative w-full h-full flex-shrink-0"
                style={{ overflow: 'hidden' }}
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="absolute bottom-0 left-0 right-0 p-8 text-white"
                >
                  <h1 className="text-4xl font-bold mb-4">{item.title}</h1>
                  <p className="text-lg opacity-90">{item.description}</p>
                </motion.div>
              </div>
            ))}
          </motion.div>

          {/* Navigation buttons */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 backdrop-blur-lg text-white hover:bg-white/30 transition-colors z-10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 backdrop-blur-lg text-white hover:bg-white/30 transition-colors z-10"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Dots indicator */}
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {carouselItems.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  currentSlide === index ? "bg-white" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>

        {/* CTA section */}
        <div className="p-6 bg-gradient-to-t from-black/10 to-transparent relative z-10">
          <Button
            onClick={() => setShowWelcome(false)}
            className="w-full h-14 bg-gradient-to-r from-[#0CC5BA] to-blue-500 text-white rounded-xl text-lg font-medium hover:opacity-90 transition-opacity"
          >
            Get Started
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <p className="text-center text-sm text-gray-400 mt-4">
            Takes only 2 minutes to setup
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-screen bg-gradient-to-br from-[#0CC5BA]/5 to-blue-500/5 overflow-hidden"
    >
      {/* Header */}
      <header className="sticky top-0 backdrop-blur-xl bg-white/70 border-b border-white/20 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowWelcome(true)}
              className="-ml-2 p-2 rounded-xl hover:bg-white/40 transition-colors"
            >
              <ArrowLeft className="h-6 w-6" />
            </motion.button>
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="h-1 bg-gradient-to-r from-[#0CC5BA] to-blue-500 rounded-full w-24"
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 py-6">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="space-y-2"
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#0CC5BA] to-blue-500 bg-clip-text text-transparent">
            What are your health goals?
          </h1>
          <p className="text-gray-500">
            Select the goals that matter most to you. Our AI will personalize your experience.
          </p>
        </motion.div>

        {/* Goals Grid */}
        <motion.div 
          variants={{
            show: {
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
          initial="hidden"
          animate="show"
          className="mt-8 grid grid-cols-1 gap-4"
        >
          {goals.map((goal) => {
            const isSelected = selectedGoals.includes(goal.id);
            const Icon = goal.icon;

            return (
              <motion.button
                key={goal.id}
                variants={{
                  hidden: { y: 20, opacity: 0 },
                  show: { y: 0, opacity: 1 }
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleGoal(goal.id)}
                className="relative w-full"
              >
                <div className={`p-4 rounded-2xl border ${
                  isSelected 
                    ? 'border-[#0CC5BA] bg-[#0CC5BA]/5' 
                    : 'border-white/20 bg-white/50'
                } backdrop-blur-lg transition-all duration-300`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center
                      ${isSelected ? 'bg-[#0CC5BA]/10' : 'bg-gray-50'}`}
                    >
                      <Icon 
                        className={`w-6 h-6 ${
                          isSelected ? 'text-[#0CC5BA]' : 'text-gray-400'
                        }`} 
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-medium ${
                          isSelected ? 'text-[#0CC5BA]' : 'text-gray-900'
                        }`}>
                          {goal.title}
                        </h3>
                        {goal.badges?.map((badge) => (
                          <Badge
                            key={badge}
                            variant="secondary"
                            className="text-xs bg-[#0CC5BA]/10 text-[#0CC5BA] border-none"
                          >
                            {badge}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {goal.description}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Next Button */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <Button
            className={`w-full h-14 text-lg rounded-2xl transition-all duration-300 ${
              selectedGoals.length > 0
                ? 'bg-gradient-to-r from-[#0CC5BA] to-blue-500 hover:opacity-90'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            disabled={selectedGoals.length === 0}
            onClick={() => setLocation("/onboarding/quiz")}
          >
            Continue
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}