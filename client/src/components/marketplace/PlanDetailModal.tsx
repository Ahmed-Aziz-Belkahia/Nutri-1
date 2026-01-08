import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Star, 
  MapPin, 
  Clock,
  Flame,
  Users,
  Heart,
  Share2,
  ChefHat,
  BadgeCheck,
  ShoppingBag,
  Play,
  Calendar,
  Target,
  Award,
  MessageCircle,
  ChevronRight,
  Check,
  Coffee,
  Sun,
  Moon,
  Apple
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketplaceMealPlan } from "@/data/marketplaceDemoData";

interface PlanDetailModalProps {
  plan: MarketplaceMealPlan | null;
  isOpen: boolean;
  onClose: () => void;
  isSaved: boolean;
  onSave: () => void;
}

const mealIcons: Record<string, any> = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Moon,
  snack: Apple
};

const mealColors: Record<string, string> = {
  breakfast: "from-amber-400 to-orange-500",
  lunch: "from-yellow-400 to-amber-500",
  dinner: "from-indigo-400 to-purple-500",
  snack: "from-green-400 to-emerald-500"
};

export default function PlanDetailModal({ 
  plan, 
  isOpen, 
  onClose, 
  isSaved, 
  onSave 
}: PlanDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "sample" | "reviews">("overview");

  if (!plan) return null;

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "platinum": return { emoji: "👑", label: "Platinum Chef", color: "bg-purple-100 text-purple-700" };
      case "gold": return { emoji: "🥇", label: "Gold Chef", color: "bg-amber-100 text-amber-700" };
      case "silver": return { emoji: "🥈", label: "Silver Chef", color: "bg-gray-100 text-gray-700" };
      default: return { emoji: "🥉", label: "Rising Chef", color: "bg-orange-100 text-orange-700" };
    }
  };

  const levelBadge = getLevelBadge(plan.author.level);

  // Demo reviews
  const demoReviews = [
    {
      id: 1,
      author: "Sarah M.",
      avatar: "https://randomuser.me/api/portraits/women/21.jpg",
      rating: 5,
      date: "2 days ago",
      text: "Absolutely loved this meal plan! The recipes were easy to follow and the ingredients were readily available at my local store."
    },
    {
      id: 2,
      author: "Mike T.",
      avatar: "https://randomuser.me/api/portraits/men/18.jpg",
      rating: 4,
      date: "1 week ago",
      text: "Great variety of meals. Would have liked more snack options but overall very satisfied with my purchase."
    },
    {
      id: 3,
      author: "Anna K.",
      avatar: "https://randomuser.me/api/portraits/women/45.jpg",
      rating: 5,
      date: "2 weeks ago",
      text: "This is exactly what I was looking for! Authentic flavors and the prep guides are super helpful."
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />
          
          {/* Modal - Full screen on mobile */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-0 bg-white z-50 overflow-hidden flex flex-col"
          >
            {/* Header Image */}
            <div className="relative h-56 flex-shrink-0">
              <img 
                src={plan.coverImage} 
                alt={plan.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 left-4 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg"
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>
              
              {/* Action Buttons */}
              <div className="absolute top-4 right-4 flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSave();
                  }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all ${
                    isSaved 
                      ? "bg-red-500 text-white" 
                      : "bg-white/90 text-gray-600"
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`} />
                </button>
                <button
                  className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center"
                >
                  <Share2 className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              
              {/* Price & Location */}
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-white" />
                  <span className="text-white text-sm font-medium">
                    {plan.location.city}, {plan.location.country}
                  </span>
                </div>
                <div>
                  {plan.price === "free" ? (
                    <span className="px-4 py-2 bg-green-500 text-white text-sm font-bold rounded-full shadow-lg">
                      FREE
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      {plan.originalPrice && (
                        <span className="text-white/70 text-sm line-through">
                          ${plan.originalPrice}
                        </span>
                      )}
                      <span className="px-4 py-2 bg-white text-gray-900 text-sm font-bold rounded-full shadow-lg">
                        ${plan.price}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                {/* Title & Author */}
                <div className="mb-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <ChefHat className="w-4 h-4 text-[#0E95A7]" />
                    <span className="text-xs font-medium text-[#0E95A7]">{plan.cuisine} Cuisine</span>
                  </div>
                  <h1 className="text-xl font-bold text-gray-900 mb-3">{plan.title}</h1>
                  
                  {/* Author Card */}
                  <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    <div className="relative">
                      <img 
                        src={plan.author.avatar} 
                        alt={plan.author.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                      />
                      {plan.author.verified && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#0E95A7] rounded-full flex items-center justify-center border-2 border-white">
                          <BadgeCheck className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{plan.author.name}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${levelBadge.color}`}>
                          {levelBadge.emoji} {levelBadge.label}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          Responds {plan.author.responseTime}
                        </span>
                      </div>
                    </div>
                    <button className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100">
                      <MessageCircle className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
                
                {/* Stats */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  <div className="bg-orange-50 rounded-xl p-2.5 text-center">
                    <Flame className="w-4 h-4 text-orange-500 mx-auto mb-1" />
                    <p className="text-sm font-bold text-gray-900">{plan.stats.avgCalories}</p>
                    <p className="text-[9px] text-gray-500">cal/day</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-2.5 text-center">
                    <Calendar className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                    <p className="text-sm font-bold text-gray-900">{plan.stats.duration}</p>
                    <p className="text-[9px] text-gray-500">days</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-2.5 text-center">
                    <Clock className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                    <p className="text-sm font-bold text-gray-900">{plan.stats.prepTime.split("/")[0]}</p>
                    <p className="text-[9px] text-gray-500">prep/day</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-2.5 text-center">
                    <Users className="w-4 h-4 text-green-500 mx-auto mb-1" />
                    <p className="text-sm font-bold text-gray-900">{plan.purchaseCount > 1000 ? `${(plan.purchaseCount/1000).toFixed(1)}k` : plan.purchaseCount}</p>
                    <p className="text-[9px] text-gray-500">users</p>
                  </div>
                </div>
                
                {/* Rating Bar */}
                <div className="flex items-center justify-between bg-amber-50 rounded-xl px-4 py-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`w-4 h-4 ${star <= Math.round(plan.rating) ? "text-amber-500 fill-amber-500" : "text-gray-200"}`} 
                        />
                      ))}
                    </div>
                    <span className="text-sm font-bold text-amber-700">{plan.rating}</span>
                  </div>
                  <span className="text-xs text-amber-600">{plan.reviewCount} reviews</span>
                </div>
                
                {/* Tabs */}
                <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
                  {(["overview", "sample", "reviews"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                        activeTab === tab
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-500"
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
                
                {/* Tab Content */}
                <AnimatePresence mode="wait">
                  {activeTab === "overview" && (
                    <motion.div
                      key="overview"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-4"
                    >
                      {/* Description */}
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-2">About This Plan</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">{plan.description}</p>
                      </div>
                      
                      {/* Highlights */}
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-2">What's Included</h3>
                        <div className="space-y-2">
                          {plan.highlights.map((highlight, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <div className="w-5 h-5 bg-gradient-to-r from-[#0E95A7] to-[#26A8FF] rounded-full flex items-center justify-center flex-shrink-0">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                              <span className="text-sm text-gray-700">{highlight}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Tags */}
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-2">Tags</h3>
                        <div className="flex flex-wrap gap-2">
                          {plan.tags.map((tag, idx) => (
                            <span 
                              key={idx}
                              className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {/* Macros */}
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-2">Daily Nutrition (Avg)</h3>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <p className="text-lg font-bold text-gray-900">{plan.stats.avgCalories}</p>
                            <p className="text-[10px] text-gray-500">Calories</p>
                          </div>
                          <div className="text-center p-3 bg-blue-50 rounded-xl">
                            <p className="text-lg font-bold text-blue-600">{plan.stats.avgProtein}g</p>
                            <p className="text-[10px] text-blue-500">Protein</p>
                          </div>
                          <div className="text-center p-3 bg-amber-50 rounded-xl">
                            <p className="text-lg font-bold text-amber-600">{plan.stats.avgCarbs}g</p>
                            <p className="text-[10px] text-amber-500">Carbs</p>
                          </div>
                          <div className="text-center p-3 bg-purple-50 rounded-xl">
                            <p className="text-lg font-bold text-purple-600">{plan.stats.avgFat}g</p>
                            <p className="text-[10px] text-purple-500">Fat</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  {activeTab === "sample" && (
                    <motion.div
                      key="sample"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-gray-900">Day 1 Preview</h3>
                        <span className="text-xs text-gray-400">
                          {Object.values(plan.sampleDay).reduce((sum, meal) => sum + (meal?.calories || 0), 0)} cal total
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        {Object.entries(plan.sampleDay).map(([type, meal]) => {
                          if (!meal) return null;
                          const Icon = mealIcons[type] || Coffee;
                          const gradient = mealColors[type] || "from-gray-400 to-gray-500";
                          
                          return (
                            <div 
                              key={type}
                              className="flex items-center gap-3 bg-gray-50 rounded-xl p-3"
                            >
                              <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center flex-shrink-0`}>
                                <Icon className="w-5 h-5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                                  {type}
                                </p>
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                  {meal.name}
                                </p>
                                <p className="text-xs text-orange-500 font-medium">
                                  {meal.calories} cal
                                </p>
                              </div>
                              <img 
                                src={meal.image} 
                                alt={meal.name}
                                className="w-14 h-14 rounded-lg object-cover"
                              />
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="bg-gradient-to-r from-[#0E95A7]/10 to-[#26A8FF]/10 rounded-xl p-4 text-center">
                        <p className="text-xs text-gray-600 mb-2">
                          This is just Day 1 of {plan.stats.duration}
                        </p>
                        <p className="text-sm font-semibold text-[#0E95A7]">
                          Get the full plan with {plan.stats.duration * plan.stats.mealsPerDay} recipes
                        </p>
                      </div>
                    </motion.div>
                  )}
                  
                  {activeTab === "reviews" && (
                    <motion.div
                      key="reviews"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-4"
                    >
                      {/* Rating Summary */}
                      <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                        <div className="text-center">
                          <p className="text-3xl font-bold text-gray-900">{plan.rating}</p>
                          <div className="flex items-center gap-0.5 justify-center my-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star 
                                key={star} 
                                className={`w-3 h-3 ${star <= Math.round(plan.rating) ? "text-amber-500 fill-amber-500" : "text-gray-200"}`} 
                              />
                            ))}
                          </div>
                          <p className="text-xs text-gray-500">{plan.reviewCount} reviews</p>
                        </div>
                        <div className="flex-1 ml-6 space-y-1">
                          {[5, 4, 3, 2, 1].map((rating) => (
                            <div key={rating} className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-500 w-2">{rating}</span>
                              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-amber-400 rounded-full"
                                  style={{ 
                                    width: `${rating === 5 ? 70 : rating === 4 ? 20 : rating === 3 ? 8 : 2}%` 
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Reviews List */}
                      <div className="space-y-3">
                        {demoReviews.map((review) => (
                          <div key={review.id} className="bg-gray-50 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <img 
                                src={review.avatar}
                                alt={review.author}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-900">{review.author}</p>
                                <p className="text-[10px] text-gray-400">{review.date}</p>
                              </div>
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star 
                                    key={star} 
                                    className={`w-3 h-3 ${star <= review.rating ? "text-amber-500 fill-amber-500" : "text-gray-200"}`} 
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">{review.text}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            
            {/* Bottom CTA */}
            <div className="p-4 border-t border-gray-100 bg-white flex-shrink-0">
              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-gradient-to-r from-[#0E95A7] to-[#26A8FF] hover:from-[#0E95A7]/90 hover:to-[#26A8FF]/90 text-white py-4 rounded-xl font-semibold text-sm shadow-lg shadow-[#0E95A7]/30"
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  {plan.price === "free" ? "Get Free Plan" : `Get Plan - $${plan.price}`}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
