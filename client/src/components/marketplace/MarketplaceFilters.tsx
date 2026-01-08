import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  MapPin, 
  SlidersHorizontal,
  ChevronDown,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cuisineOptions, dietaryOptions, priceRanges } from "@/data/marketplaceDemoData";

interface MarketplaceFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  filters: {
    cuisine: string;
    dietary: string[];
    priceRange: typeof priceRanges[0];
    location: string;
    difficulty: string;
  };
  onFilterChange: (filters: any) => void;
}

export default function MarketplaceFilters({ 
  isOpen, 
  onClose, 
  filters, 
  onFilterChange 
}: MarketplaceFiltersProps) {
  const [localFilters, setLocalFilters] = useState(filters);
  const [expandedSection, setExpandedSection] = useState<string | null>("cuisine");

  const difficulties = ["All", "Beginner", "Intermediate", "Chef"];
  const locations = ["All Locations", "Near Me", "Warsaw, Poland", "Athens, Greece", "Tokyo, Japan", "New York, USA", "Rome, Italy", "Paris, France"];

  const handleApply = () => {
    onFilterChange(localFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters = {
      cuisine: "All Cuisines",
      dietary: [],
      priceRange: priceRanges[0],
      location: "All Locations",
      difficulty: "All"
    };
    setLocalFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  const toggleDietary = (diet: string) => {
    setLocalFilters(prev => ({
      ...prev,
      dietary: prev.dietary.includes(diet)
        ? prev.dietary.filter(d => d !== diet)
        : [...prev.dietary, diet]
    }));
  };

  const FilterSection = ({ 
    title, 
    id, 
    children 
  }: { 
    title: string; 
    id: string; 
    children: React.ReactNode 
  }) => (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setExpandedSection(expandedSection === id ? null : id)}
        className="w-full flex items-center justify-between py-3 px-4"
      >
        <span className="text-sm font-semibold text-gray-900">{title}</span>
        <motion.div
          animate={{ rotate: expandedSection === id ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </motion.div>
      </button>
      <AnimatePresence>
        {expandedSection === id && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

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
            className="fixed inset-0 bg-black/40 z-40"
          />
          
          {/* Filter Panel - Slide from bottom on mobile */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 max-h-[85vh] overflow-hidden flex flex-col"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            
            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-[#0E95A7]" />
                <h2 className="text-lg font-bold text-gray-900">Filters</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                >
                  Reset
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
            
            {/* Filter Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Location */}
              <FilterSection title="📍 Location" id="location">
                <div className="flex flex-wrap gap-2">
                  {locations.map((loc) => (
                    <button
                      key={loc}
                      onClick={() => setLocalFilters(prev => ({ ...prev, location: loc }))}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        localFilters.location === loc
                          ? "bg-gradient-to-r from-[#0E95A7] to-[#26A8FF] text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </FilterSection>
              
              {/* Cuisine */}
              <FilterSection title="🍽️ Cuisine" id="cuisine">
                <div className="flex flex-wrap gap-2">
                  {cuisineOptions.map((cuisine) => (
                    <button
                      key={cuisine}
                      onClick={() => setLocalFilters(prev => ({ ...prev, cuisine }))}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        localFilters.cuisine === cuisine
                          ? "bg-gradient-to-r from-[#0E95A7] to-[#26A8FF] text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {cuisine}
                    </button>
                  ))}
                </div>
              </FilterSection>
              
              {/* Dietary */}
              <FilterSection title="🥗 Dietary Preferences" id="dietary">
                <div className="flex flex-wrap gap-2">
                  {dietaryOptions.map((diet) => (
                    <button
                      key={diet}
                      onClick={() => toggleDietary(diet)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                        localFilters.dietary.includes(diet)
                          ? "bg-gradient-to-r from-[#0E95A7] to-[#26A8FF] text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {localFilters.dietary.includes(diet) && (
                        <Check className="w-3 h-3" />
                      )}
                      {diet}
                    </button>
                  ))}
                </div>
              </FilterSection>
              
              {/* Price */}
              <FilterSection title="💰 Price Range" id="price">
                <div className="flex flex-wrap gap-2">
                  {priceRanges.map((range) => (
                    <button
                      key={range.label}
                      onClick={() => setLocalFilters(prev => ({ ...prev, priceRange: range }))}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        localFilters.priceRange.label === range.label
                          ? "bg-gradient-to-r from-[#0E95A7] to-[#26A8FF] text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </FilterSection>
              
              {/* Difficulty */}
              <FilterSection title="👨‍🍳 Difficulty" id="difficulty">
                <div className="flex flex-wrap gap-2">
                  {difficulties.map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setLocalFilters(prev => ({ ...prev, difficulty: diff }))}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        localFilters.difficulty === diff
                          ? "bg-gradient-to-r from-[#0E95A7] to-[#26A8FF] text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </FilterSection>
            </div>
            
            {/* Apply Button */}
            <div className="p-4 border-t border-gray-100 bg-white">
              <Button
                onClick={handleApply}
                className="w-full bg-gradient-to-r from-[#0E95A7] to-[#26A8FF] hover:from-[#0E95A7]/90 hover:to-[#26A8FF]/90 text-white py-4 rounded-xl font-semibold text-sm shadow-lg shadow-[#0E95A7]/30"
              >
                Apply Filters
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
