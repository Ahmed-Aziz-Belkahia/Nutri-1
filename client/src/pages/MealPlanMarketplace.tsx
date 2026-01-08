import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import BaseLayout from "@/components/layouts/BaseLayout";
import MealPlanMarketCard from "@/components/marketplace/MealPlanMarketCard";
import MarketplaceFilters from "@/components/marketplace/MarketplaceFilters";
import PlanDetailModal from "@/components/marketplace/PlanDetailModal";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  SlidersHorizontal, 
  MapPin, 
  Plus, 
  Sparkles,
  TrendingUp,
  Globe,
  Heart,
  ChefHat,
  ArrowRight,
  Star,
  X
} from "lucide-react";
import { 
  demoMealPlans, 
  MarketplaceMealPlan,
  sortOptions,
  priceRanges 
} from "@/data/marketplaceDemoData";

type TabType = "explore" | "local" | "my-plans" | "favorites";

export default function MealPlanMarketplace() {
  const { t } = useTranslation(['common']);
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>("explore");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSort, setSelectedSort] = useState("popular");
  const [selectedPlan, setSelectedPlan] = useState<MarketplaceMealPlan | null>(null);
  const [savedPlans, setSavedPlans] = useState<number[]>([]);
  const [userLocation] = useState("Warsaw, Poland");
  
  const [filters, setFilters] = useState({
    cuisine: "All Cuisines",
    dietary: [] as string[],
    priceRange: priceRanges[0],
    location: "All Locations",
    difficulty: "All"
  });

  // Filter and sort plans
  const filteredPlans = useMemo(() => {
    let plans = [...demoMealPlans];
    
    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      plans = plans.filter(p => 
        p.title.toLowerCase().includes(query) ||
        p.cuisine.toLowerCase().includes(query) ||
        p.author.name.toLowerCase().includes(query) ||
        p.location.city.toLowerCase().includes(query) ||
        p.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Tab filter
    if (activeTab === "local") {
      plans = plans.filter(p => p.location.city === "Warsaw");
    } else if (activeTab === "favorites") {
      plans = plans.filter(p => savedPlans.includes(p.id));
    }
    
    // Cuisine filter
    if (filters.cuisine !== "All Cuisines") {
      plans = plans.filter(p => p.cuisine === filters.cuisine);
    }
    
    // Dietary filter
    if (filters.dietary.length > 0) {
      plans = plans.filter(p => 
        filters.dietary.some(diet => 
          p.dietary.includes(diet) || p.tags.includes(diet)
        )
      );
    }
    
    // Price filter
    if (filters.priceRange.label !== "All Prices") {
      plans = plans.filter(p => {
        const price = p.price === "free" ? 0 : p.price;
        return price >= filters.priceRange.min && price <= filters.priceRange.max;
      });
    }
    
    // Difficulty filter
    if (filters.difficulty !== "All") {
      plans = plans.filter(p => p.stats.difficulty === filters.difficulty);
    }
    
    // Location filter
    if (filters.location !== "All Locations" && filters.location !== "Near Me") {
      const city = filters.location.split(",")[0].trim();
      plans = plans.filter(p => p.location.city === city);
    }
    
    // Sort
    switch (selectedSort) {
      case "rating":
        plans.sort((a, b) => b.rating - a.rating);
        break;
      case "newest":
        plans.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "price_asc":
        plans.sort((a, b) => {
          const priceA = a.price === "free" ? 0 : a.price;
          const priceB = b.price === "free" ? 0 : b.price;
          return priceA - priceB;
        });
        break;
      case "price_desc":
        plans.sort((a, b) => {
          const priceA = a.price === "free" ? 0 : a.price;
          const priceB = b.price === "free" ? 0 : b.price;
          return priceB - priceA;
        });
        break;
      default: // popular
        plans.sort((a, b) => b.purchaseCount - a.purchaseCount);
    }
    
    return plans;
  }, [demoMealPlans, searchQuery, activeTab, filters, selectedSort, savedPlans]);

  // Featured plans
  const featuredPlans = demoMealPlans.filter(p => p.featured);
  const trendingPlans = demoMealPlans.filter(p => p.trending);

  const toggleSave = (planId: number) => {
    setSavedPlans(prev => 
      prev.includes(planId) 
        ? prev.filter(id => id !== planId)
        : [...prev, planId]
    );
  };

  const activeFiltersCount = 
    (filters.cuisine !== "All Cuisines" ? 1 : 0) +
    filters.dietary.length +
    (filters.priceRange.label !== "All Prices" ? 1 : 0) +
    (filters.difficulty !== "All" ? 1 : 0) +
    (filters.location !== "All Locations" ? 1 : 0);

  return (
    <BaseLayout>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <div className="flex items-center justify-between mb-1">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">Meal Plan Marketplace</h1>
              <span className="px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-bold rounded-full uppercase tracking-wide animate-pulse">
                Beta
              </span>
            </div>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {userLocation}
            </p>
          </div>
          <Button
            onClick={() => setLocation("/meal-plan-marketplace/create")}
            className="bg-gradient-to-r from-[#0E95A7] to-[#26A8FF] text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-lg shadow-[#0E95A7]/30"
          >
            <Plus className="w-4 h-4 mr-1" />
            Create
          </Button>
        </div>
      </motion.div>

      {/* Search & Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-2 mb-4"
      >
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search plans, cuisines, chefs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0E95A7]/20 focus:border-[#0E95A7]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center"
            >
              <X className="w-3 h-3 text-gray-500" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(true)}
          className={`relative px-3 py-2.5 rounded-xl flex items-center gap-1.5 transition-all ${
            activeFiltersCount > 0
              ? "bg-gradient-to-r from-[#0E95A7] to-[#26A8FF] text-white"
              : "bg-white border border-gray-200 text-gray-600"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="text-xs font-medium">Filters</span>
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 -mx-1 px-1 scrollbar-hide">
        {[
          { id: "explore", label: "Explore", icon: Globe },
          { id: "local", label: "Local Picks", icon: MapPin },
          { id: "my-plans", label: "My Plans", icon: ChefHat },
          { id: "favorites", label: "Saved", icon: Heart }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "bg-gradient-to-r from-[#0E95A7] to-[#26A8FF] text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            {tab.id === "favorites" && savedPlans.length > 0 && (
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                activeTab === tab.id ? "bg-white/20 text-white" : "bg-gray-300 text-gray-600"
              }`}>
                {savedPlans.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Sort Bar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-500">
          {filteredPlans.length} meal plan{filteredPlans.length !== 1 ? "s" : ""} found
        </p>
        <select
          value={selectedSort}
          onChange={(e) => setSelectedSort(e.target.value)}
          className="text-xs text-gray-600 bg-transparent font-medium focus:outline-none cursor-pointer"
        >
          {sortOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Featured Section (only on Explore tab with no search) */}
      {activeTab === "explore" && !searchQuery && activeFiltersCount === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6"
        >
          {/* Featured Banner */}
          <div className="relative bg-gradient-to-r from-[#0E95A7] to-[#26A8FF] rounded-2xl p-4 mb-4 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl" />
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="w-4 h-4 text-white" />
                <span className="text-white/80 text-xs font-medium">Featured This Week</span>
              </div>
              <h3 className="text-white font-bold text-lg mb-1">{featuredPlans[0]?.title}</h3>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-300 fill-amber-300" />
                  <span className="text-white text-xs">{featuredPlans[0]?.rating}</span>
                </div>
                <span className="text-white/60 text-xs">•</span>
                <span className="text-white/80 text-xs">{featuredPlans[0]?.cuisine} Cuisine</span>
              </div>
              <button 
                onClick={() => setSelectedPlan(featuredPlans[0])}
                className="bg-white text-[#0E95A7] px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                View Plan <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Trending Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-orange-500" />
                <h3 className="text-sm font-bold text-gray-900">Trending Now</h3>
              </div>
              <button className="text-xs text-[#0E95A7] font-medium">See all</button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
              {trendingPlans.slice(0, 4).map((plan) => (
                <motion.div
                  key={plan.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedPlan(plan)}
                  className="flex-shrink-0 w-36 bg-white rounded-xl border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                >
                  <img 
                    src={plan.coverImage} 
                    alt={plan.title}
                    className="w-full h-20 object-cover"
                  />
                  <div className="p-2">
                    <p className="text-[10px] text-[#0E95A7] font-medium">{plan.cuisine}</p>
                    <p className="text-xs font-semibold text-gray-900 line-clamp-1">{plan.title}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                      <span className="text-[10px] text-gray-600">{plan.rating}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Results Grid */}
      <AnimatePresence mode="wait">
        {filteredPlans.length > 0 ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 gap-3 pb-6"
          >
            {filteredPlans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <MealPlanMarketCard
                  plan={plan}
                  onClick={() => setSelectedPlan(plan)}
                  onSave={() => toggleSave(plan.id)}
                  isSaved={savedPlans.includes(plan.id)}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-12"
          >
            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ChefHat className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-gray-900 font-bold mb-1">No plans found</h3>
            <p className="text-gray-500 text-sm mb-4">
              {activeTab === "favorites" 
                ? "Save some plans to see them here"
                : "Try adjusting your filters"}
            </p>
            {activeFiltersCount > 0 && (
              <Button
                onClick={() => setFilters({
                  cuisine: "All Cuisines",
                  dietary: [],
                  priceRange: priceRanges[0],
                  location: "All Locations",
                  difficulty: "All"
                })}
                variant="outline"
                className="text-sm"
              >
                Clear all filters
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters Modal */}
      <MarketplaceFilters
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onFilterChange={setFilters}
      />

      {/* Plan Detail Modal */}
      <PlanDetailModal
        plan={selectedPlan}
        isOpen={!!selectedPlan}
        onClose={() => setSelectedPlan(null)}
        isSaved={selectedPlan ? savedPlans.includes(selectedPlan.id) : false}
        onSave={() => selectedPlan && toggleSave(selectedPlan.id)}
      />
    </BaseLayout>
  );
}
