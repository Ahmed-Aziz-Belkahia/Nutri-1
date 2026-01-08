import { motion } from "framer-motion";
import { 
  MapPin, 
  Star, 
  Clock, 
  Users, 
  Flame,
  Heart,
  ChefHat,
  BadgeCheck,
  TrendingUp,
  Sparkles
} from "lucide-react";
import { MarketplaceMealPlan } from "@/data/marketplaceDemoData";

interface MealPlanMarketCardProps {
  plan: MarketplaceMealPlan;
  onClick: () => void;
  onSave: () => void;
  isSaved: boolean;
}

export default function MealPlanMarketCard({ 
  plan, 
  onClick, 
  onSave, 
  isSaved 
}: MealPlanMarketCardProps) {
  const getLevelColor = (level: string) => {
    switch (level) {
      case "platinum": return "from-purple-400 to-purple-600";
      case "gold": return "from-amber-400 to-amber-600";
      case "silver": return "from-gray-300 to-gray-500";
      default: return "from-orange-300 to-orange-500";
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "platinum": return "👑";
      case "gold": return "🥇";
      case "silver": return "🥈";
      default: return "🥉";
    }
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg hover:border-[#0E95A7]/20 transition-all cursor-pointer group"
      onClick={onClick}
    >
      {/* Cover Image */}
      <div className="relative h-40 overflow-hidden">
        <img 
          src={plan.coverImage} 
          alt={plan.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          {plan.featured && (
            <span className="px-2 py-0.5 bg-gradient-to-r from-[#0E95A7] to-[#26A8FF] text-white text-[10px] font-bold rounded-full flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              Featured
            </span>
          )}
          {plan.trending && (
            <span className="px-2 py-0.5 bg-gradient-to-r from-orange-400 to-red-500 text-white text-[10px] font-bold rounded-full flex items-center gap-1">
              <TrendingUp className="w-2.5 h-2.5" />
              Trending
            </span>
          )}
        </div>
        
        {/* Save Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSave();
          }}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all ${
            isSaved 
              ? "bg-red-500 text-white" 
              : "bg-white/80 text-gray-600 hover:bg-white hover:text-red-500"
          }`}
        >
          <Heart className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
        </button>
        
        {/* Price Tag */}
        <div className="absolute bottom-2 right-2">
          {plan.price === "free" ? (
            <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
              FREE
            </span>
          ) : (
            <div className="flex items-center gap-1">
              {plan.originalPrice && (
                <span className="px-2 py-0.5 bg-white/60 backdrop-blur-md text-gray-500 text-[10px] font-medium rounded-full line-through">
                  ${plan.originalPrice}
                </span>
              )}
              <span className="px-3 py-1 bg-white/90 backdrop-blur-md text-gray-900 text-xs font-bold rounded-full">
                ${plan.price}
              </span>
            </div>
          )}
        </div>
        
        {/* Location Badge */}
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-white/80 backdrop-blur-md rounded-full flex items-center gap-1">
          <span className="text-sm">{plan.location.countryCode === "PL" ? "🇵🇱" : 
            plan.location.countryCode === "GR" ? "🇬🇷" : 
            plan.location.countryCode === "JP" ? "🇯🇵" : 
            plan.location.countryCode === "US" ? "🇺🇸" : 
            plan.location.countryCode === "MA" ? "🇲🇦" : 
            plan.location.countryCode === "IT" ? "🇮🇹" : 
            plan.location.countryCode === "TH" ? "🇹🇭" : 
            plan.location.countryCode === "MX" ? "🇲🇽" : 
            plan.location.countryCode === "IN" ? "🇮🇳" : 
            plan.location.countryCode === "FR" ? "🇫🇷" : 
            plan.location.countryCode === "KR" ? "🇰🇷" : 
            plan.location.countryCode === "BR" ? "🇧🇷" : "🌍"}</span>
          <span className="text-[10px] font-medium text-gray-700">{plan.location.city}</span>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-3.5">
        {/* Author */}
        <div className="flex items-center gap-2 mb-2">
          <div className="relative">
            <img 
              src={plan.author.avatar} 
              alt={plan.author.name}
              className="w-6 h-6 rounded-full object-cover border border-gray-200"
            />
            {plan.author.verified && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#0E95A7] rounded-full flex items-center justify-center border border-white">
                <BadgeCheck className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-gray-600 truncate flex items-center gap-1">
              {plan.author.name}
              <span className="text-[10px]">{getLevelBadge(plan.author.level)}</span>
            </p>
          </div>
          <div className="flex items-center gap-0.5 bg-amber-50 px-1.5 py-0.5 rounded-md">
            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span className="text-[11px] font-bold text-amber-700">{plan.rating}</span>
            <span className="text-[10px] text-amber-500">({plan.reviewCount})</span>
          </div>
        </div>
        
        {/* Title */}
        <h3 className="text-sm font-bold text-gray-900 leading-tight mb-1.5 line-clamp-2 group-hover:text-[#0E95A7] transition-colors">
          {plan.title}
        </h3>
        
        {/* Cuisine Tag */}
        <div className="flex items-center gap-1 mb-2">
          <ChefHat className="w-3 h-3 text-[#0E95A7]" />
          <span className="text-[10px] font-medium text-[#0E95A7]">{plan.cuisine} Cuisine</span>
        </div>
        
        {/* Stats Row */}
        <div className="flex items-center gap-3 mb-2.5">
          <div className="flex items-center gap-1 text-gray-500">
            <Flame className="w-3 h-3 text-orange-400" />
            <span className="text-[10px]">{plan.stats.avgCalories} cal</span>
          </div>
          <div className="flex items-center gap-1 text-gray-500">
            <Clock className="w-3 h-3 text-blue-400" />
            <span className="text-[10px]">{plan.stats.prepTime}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-500">
            <Users className="w-3 h-3 text-purple-400" />
            <span className="text-[10px]">{plan.purchaseCount > 1000 ? `${(plan.purchaseCount/1000).toFixed(1)}k` : plan.purchaseCount}</span>
          </div>
        </div>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {plan.tags.slice(0, 3).map((tag, idx) => (
            <span 
              key={idx}
              className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[9px] font-medium rounded"
            >
              {tag}
            </span>
          ))}
          {plan.tags.length > 3 && (
            <span className="px-1.5 py-0.5 text-gray-400 text-[9px]">
              +{plan.tags.length - 3}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
