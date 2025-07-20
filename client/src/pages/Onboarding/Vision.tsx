import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const carouselItems = [
  {
    image: "attached_assets/pexels-chetanvlad-1769626.jpg",
    title: "Transform Your Fitness Journey",
    description: "Start your path to a healthier lifestyle with personalized workout tracking and nutrition guidance.",
  },
  {
    image: "attached_assets/pexels-glebkrs-2628207.jpg",
    title: "Track Your Nutrition",
    description: "Monitor your daily intake with our smart food tracking system and make informed dietary choices.",
  },
  {
    image: "attached_assets/pexels-thelazyartist-1289118.jpg",
    title: "Achieve Your Goals",
    description: "From workout plans to protein tracking, we've got all the tools you need to reach your fitness goals.",
  },
];

export default function Vision() {
  const [, setLocation] = useLocation();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselItems.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-white overflow-hidden"
    >
      {/* Main content */}
      <div className="relative h-screen">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="relative h-full"
          >
            <img
              src={carouselItems[currentSlide].image}
              alt={carouselItems[currentSlide].title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-white/50 via-white/80 to-white" />
          </motion.div>
        </div>

        {/* Content */}
        <div className="relative h-full flex flex-col justify-end px-6 pb-12">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <h1 className="text-4xl font-bold text-gray-900">
              {carouselItems[currentSlide].title}
            </h1>
            <p className="text-lg text-gray-600">
              {carouselItems[currentSlide].description}
            </p>

            {/* Dots indicator - Below text */}
            <div className="flex justify-center gap-2">
              {carouselItems.map((_, idx) => (
                <motion.button
                  key={idx}
                  initial={false}
                  animate={{
                    scale: currentSlide === idx ? 1 : 0.8,
                    opacity: currentSlide === idx ? 1 : 0.5,
                  }}
                  onClick={() => setCurrentSlide(idx)}
                  className={`w-2 h-2 rounded-full bg-gray-800 transition-all duration-300 ${
                    currentSlide === idx ? 'w-6' : ''
                  }`}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="space-y-4">
              <Button
                onClick={() => setLocation("/auth?tab=signup")}
                className="w-full h-14 bg-[#0CC5BA] text-white rounded-2xl text-lg font-medium shadow-md hover:opacity-90 transition-opacity"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              <Button
                onClick={() => setLocation("/auth")}
                variant="outline"
                className="w-full h-14 text-lg bg-transparent text-gray-800 border-2 border-gray-200 hover:bg-gray-100 transition-colors rounded-2xl"
              >
                Already have an account? Sign In
              </Button>

              <p className="text-center text-sm text-gray-500">
                Takes only 2 minutes to setup
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}