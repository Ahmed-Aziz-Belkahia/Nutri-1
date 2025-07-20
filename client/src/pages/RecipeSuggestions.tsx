import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, Loader2, PlayCircle, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import Webcam from "react-webcam";
import { useLocation, Link } from "wouter";
import Navigation from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast"; 

// Common recipes data - This would normally come from an API
const commonRecipes = [
  {
    id: 1,
    name: "Mediterranean Salad",
    description: "Fresh vegetables with olive oil and feta cheese",
    emoji: "🥗",
    bgColor: "bg-green-50"
  },
  {
    id: 2,
    name: "Berry Smoothie Bowl",
    description: "Mixed berries, banana, and granola topping",
    emoji: "🍓",
    bgColor: "bg-purple-50"
  },
  {
    id: 3,
    name: "Avocado Toast",
    description: "Whole grain bread with mashed avocado and egg",
    emoji: "🥑",
    bgColor: "bg-[#E8F8F7]"
  },
  {
    id: 4,
    name: "Vegetable Stir Fry",
    description: "Mixed vegetables with tofu in light sauce",
    emoji: "🥘",
    bgColor: "bg-amber-50"
  }
];

export default function RecipeSuggestions() {
  const [showCamera, setShowCamera] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestedRecipes, setSuggestedRecipes] = useState<typeof commonRecipes>([]);
  const webcamRef = useRef<Webcam>(null);
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  // Function to capture image and generate recipe suggestions
  const captureImage = async () => {
    if (!webcamRef.current) return;
    
    setIsAnalyzing(true);
    
    try {
      // Take screenshot using webcam
      const imageSrc = webcamRef.current.getScreenshot();
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock recipe suggestions response
      const newRecipes = [
        {
          id: 101,
          name: "Fresh Garden Salad",
          description: "Light salad with leafy greens and vegetables",
          emoji: "🥗",
          bgColor: "bg-green-50"
        },
        {
          id: 102,
          name: "Vegetable Medley",
          description: "Roasted seasonal vegetables with herbs",
          emoji: "🥦",
          bgColor: "bg-[#E8F8F7]"
        }
      ];
      
      setSuggestedRecipes(newRecipes);
      
      // Success notification
      toast({
        title: "Analysis Complete",
        description: "We've found recipes based on your ingredients!",
      });
      
    } catch (error) {
      console.error('Error analyzing image:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to analyze image",
      });
    } finally {
      setIsAnalyzing(false);
      setShowCamera(false);
    }
  };

  // Camera View Component
  const renderCameraView = () => {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="pt-[60px] relative h-screen"
        >
          <div className="relative overflow-hidden h-full w-full">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={{
                facingMode: "environment",
                aspectRatio: 16/9,
                width: { min: 1280, ideal: 1920 },
                height: { min: 720, ideal: 1080 }
              }}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "100%",
                height: "auto"
              }}
              className="w-full h-auto"
            />
          </div>

          <motion.div 
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="relative w-72 h-72">
                <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-white/80 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-white/80 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-white/80 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-white/80 rounded-br-lg" />

                <motion.div 
                  className="absolute inset-x-8 h-0.5 bg-gradient-to-r from-transparent via-white/80 to-transparent"
                  animate={{
                    y: [-140, 140, -140],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="absolute bottom-16 inset-x-0 flex items-center justify-center"
          >
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
              disabled={isAnalyzing}
              onClick={captureImage}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center ${
                isAnalyzing 
                  ? 'bg-white/50' 
                  : 'bg-white hover:bg-white/90'
              } disabled:opacity-50 border-[6px] border-white/20 shadow-lg transition-colors`}
            >
              {isAnalyzing ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Loader2 className="h-8 w-8 animate-spin text-black/70" />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Camera className="h-8 w-8 text-black/70" />
                </motion.div>
              )}

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-sm text-white/90"
              >
                {isAnalyzing ? 'Analyzing...' : 'Tap to capture'}
              </motion.div>
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[430px] mx-auto relative min-h-screen flex flex-col">
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sticky top-0 bg-white/80 backdrop-blur-lg border-b border-zinc-100/80 z-10"
        >
          <div className="px-5 py-4">
            <div className="space-y-2">
              <motion.h1 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="text-lg font-semibold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent"
              >
                Hi, Good morning
              </motion.h1>
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-6"
              >
                <Link href="/">
                  <span className={`text-sm cursor-pointer transition-all ${
                    location === '/' 
                      ? 'font-semibold text-gray-900' 
                      : 'text-gray-400 hover:text-gray-600 hover:translate-x-0.5'
                  }`}>
                    Home
                  </span>
                </Link>
                <Link href="/recipes">
                  <span className={`text-sm cursor-pointer transition-all ${
                    location === '/recipes' 
                      ? 'font-semibold text-gray-900' 
                      : 'text-gray-400 hover:text-gray-600 hover:translate-x-0.5'
                  }`}>
                    Recipes
                  </span>
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.header>

        <div className="flex-1 px-4 pb-16">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card 
              className="group p-4 rounded-2xl bg-gradient-to-br from-[#E8F8F7] to-[#F0FFFE] border-0 mb-3 mt-2 cursor-pointer hover:shadow-lg transition-all duration-300"
              onClick={() => setShowCamera(true)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-medium mb-0.5 group-hover:text-[#0CC5BA] transition-colors">
                    Create Your Recipe
                  </h3>
                  <p className="text-sm text-gray-600">
                    Scan your ingredients and we'll suggest healthy meals
                  </p>
                </div>
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <PlayCircle className="w-12 h-12 text-[#0CC5BA] group-hover:text-[#0AB3A9] transition-colors" />
                </motion.div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                {suggestedRecipes.length > 0 ? 'Suggested Recipes' : 'TOP 100'}
              </h2>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-[#0CC5BA] hover:text-[#0AB3A9] -mr-2 group"
              >
                View all 
                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(suggestedRecipes.length > 0 ? suggestedRecipes : commonRecipes).map((recipe, index) => (
                <motion.div
                  key={recipe.id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 * index }}
                  onClick={() => setLocation(`/recipe/${recipe.id}`)}
                >
                  <Card className="overflow-hidden rounded-xl border-0 hover:shadow-lg transition-all duration-300 cursor-pointer group">
                    <div className={`aspect-square ${recipe.bgColor || 'bg-[#E8F8F7]'} relative p-4 flex items-center justify-center group-hover:scale-[1.02] transition-transform duration-300`}>
                      <span className="text-4xl transform group-hover:scale-110 transition-transform duration-300">
                        {recipe.emoji || '🥗'}
                      </span>
                    </div>
                    <div className="p-2.5">
                      <h3 className="font-medium text-sm leading-snug group-hover:text-[#0CC5BA] transition-colors">
                        {recipe.name}
                      </h3>
                      <p className="text-xs text-gray-500 whitespace-pre-line mt-0.5 leading-relaxed">
                        {recipe.description}
                      </p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <Navigation />
      </div>

      {showCamera && renderCameraView()}
    </div>
  );
}