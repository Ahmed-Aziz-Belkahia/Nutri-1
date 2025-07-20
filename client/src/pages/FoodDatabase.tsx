import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlayCircle, ChevronRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import Navigation from "../components/Navigation";
import { motion } from "framer-motion";

export default function FoodDatabase() {
  const [, setLocation] = useLocation();
  const [location] = useLocation();

  const commonRecipes = [
    {
      id: 1,
      name: "Green Salad",
      description: "Fresh romaine lettuce\nClassic Greek style",
      bgColor: "bg-[#E8F8F7]",
      emoji: "🥗"
    },
    {
      id: 2,
      name: "Thai salad",
      description: "Green papaya salad\nAuthentic Thai spices",
      bgColor: "bg-[#FCE8E8]",
      emoji: "🥘"
    },
    {
      id: 3,
      name: "Chicken salad",
      description: "Grilled chicken breast\nCrisp mixed greens",
      bgColor: "bg-[#E8F8F7]",
      emoji: "🥙"
    },
    {
      id: 4,
      name: "Tuna salad",
      description: "Fresh tuna\nMediterranean style",
      bgColor: "bg-[#FCE8E8]",
      emoji: "🐟"
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Container for the entire content */}
      <div className="max-w-[430px] mx-auto relative min-h-screen flex flex-col">
        {/* Header */}
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

        {/* Main content */}
        <div className="flex-1 px-4 pb-16">
          {/* Create Recipe Card */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="group p-4 rounded-2xl bg-gradient-to-br from-[#E8F8F7] to-[#F0FFFE] border-0 mb-3 mt-2 cursor-pointer hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-medium mb-0.5 group-hover:text-[#0CC5BA] transition-colors">
                    Create Your Own Recipe
                  </h3>
                  <p className="text-sm text-gray-600">
                    Collect your favorite recipes
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

          {/* TOP 100 Section */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                TOP 100
              </h2>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-[#0CC5BA] hover:text-[#0AB3A9] -mr-2 group"
              >
                See all 
                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {commonRecipes.map((recipe, index) => (
                <motion.div
                  key={recipe.id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <Card className="overflow-hidden rounded-xl border-0 hover:shadow-lg transition-all duration-300 cursor-pointer group">
                    <div className={`aspect-square ${recipe.bgColor} relative p-4 flex items-center justify-center group-hover:scale-[1.02] transition-transform duration-300`}>
                      <span className="text-4xl transform group-hover:scale-110 transition-transform duration-300">
                        {recipe.emoji}
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

        {/* Navigation */}
        <Navigation />
      </div>
    </div>
  );
}