import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  ArrowRight,
  Check,
  X,
  Camera,
  MapPin,
  ChefHat,
  Sparkles,
  Clock,
  Flame,
  Plus,
  Trash2,
  GripVertical,
  Upload,
  DollarSign,
  Globe,
  Lock,
  Eye,
  Coffee,
  Sun,
  Moon,
  Apple,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cuisineOptions, dietaryOptions } from "@/data/marketplaceDemoData";

// Step definitions
const STEPS = [
  { id: 1, title: "Basics", subtitle: "Plan details" },
  { id: 2, title: "Dietary", subtitle: "Nutrition info" },
  { id: 3, title: "Schedule", subtitle: "Build meals" },
  { id: 4, title: "Publish", subtitle: "Pricing & visibility" }
];

interface MealItem {
  id: string;
  name: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prepTime: number;
  ingredients: string[];
  instructions: string[];
  image?: string;
}

interface DayPlan {
  id: string;
  dayNumber: number;
  meals: MealItem[];
}

const mealTypeConfig = {
  breakfast: { icon: Coffee, label: "Breakfast", color: "from-amber-400 to-orange-500" },
  lunch: { icon: Sun, label: "Lunch", color: "from-yellow-400 to-amber-500" },
  dinner: { icon: Moon, label: "Dinner", color: "from-indigo-400 to-purple-500" },
  snack: { icon: Apple, label: "Snack", color: "from-green-400 to-emerald-500" }
};

export default function CreateMealPlan() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 1: Basics
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cuisine, setCuisine] = useState("Polish");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [duration, setDuration] = useState(7);

  // Step 2: Dietary
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [avgCalories, setAvgCalories] = useState(2000);
  const [avgProtein, setAvgProtein] = useState(75);
  const [avgCarbs, setAvgCarbs] = useState(220);
  const [avgFat, setAvgFat] = useState(80);
  const [difficulty, setDifficulty] = useState<"Beginner" | "Intermediate" | "Chef">("Beginner");
  const [prepTime, setPrepTime] = useState("30-45 min");

  // Step 3: Schedule
  const [dayPlans, setDayPlans] = useState<DayPlan[]>([
    { id: "1", dayNumber: 1, meals: [] }
  ]);
  const [editingMeal, setEditingMeal] = useState<{ dayId: string; meal: MealItem | null } | null>(null);

  // Step 4: Publishing
  const [pricingType, setPricingType] = useState<"free" | "paid">("free");
  const [price, setPrice] = useState(9.99);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [highlights, setHighlights] = useState<string[]>([""]);

  // Validation
  const isStep1Valid = title.length >= 3 && description.length >= 10 && city && country;
  const isStep2Valid = avgCalories > 0;
  const isStep3Valid = dayPlans.some(day => day.meals.length > 0);
  const isStep4Valid = highlights.filter(h => h.trim()).length >= 1;

  const canProceed = () => {
    switch (currentStep) {
      case 1: return isStep1Valid;
      case 2: return isStep2Valid;
      case 3: return isStep3Valid;
      case 4: return isStep4Valid;
      default: return true;
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    } else {
      setLocation("/meal-plan-marketplace");
    }
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccess(true);
    }, 1500);
  };

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleDietary = (diet: string) => {
    setSelectedDietary(prev =>
      prev.includes(diet) ? prev.filter(d => d !== diet) : [...prev, diet]
    );
  };

  const addDay = () => {
    const newDayNumber = dayPlans.length + 1;
    setDayPlans(prev => [
      ...prev,
      { id: String(Date.now()), dayNumber: newDayNumber, meals: [] }
    ]);
  };

  const removeDay = (dayId: string) => {
    setDayPlans(prev => prev.filter(d => d.id !== dayId).map((d, i) => ({ ...d, dayNumber: i + 1 })));
  };

  const addMealToDay = (dayId: string, mealType: MealItem["mealType"]) => {
    const newMeal: MealItem = {
      id: String(Date.now()),
      name: "",
      mealType,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      prepTime: 15,
      ingredients: [],
      instructions: []
    };
    setEditingMeal({ dayId, meal: newMeal });
  };

  const saveMeal = (dayId: string, meal: MealItem) => {
    setDayPlans(prev => prev.map(day => {
      if (day.id !== dayId) return day;
      const existingIndex = day.meals.findIndex(m => m.id === meal.id);
      if (existingIndex >= 0) {
        const newMeals = [...day.meals];
        newMeals[existingIndex] = meal;
        return { ...day, meals: newMeals };
      }
      return { ...day, meals: [...day.meals, meal] };
    }));
    setEditingMeal(null);
  };

  const removeMeal = (dayId: string, mealId: string) => {
    setDayPlans(prev => prev.map(day => {
      if (day.id !== dayId) return day;
      return { ...day, meals: day.meals.filter(m => m.id !== mealId) };
    }));
  };

  const addHighlight = () => {
    if (highlights.length < 6) {
      setHighlights(prev => [...prev, ""]);
    }
  };

  const updateHighlight = (index: number, value: string) => {
    setHighlights(prev => prev.map((h, i) => i === index ? value : h));
  };

  const removeHighlight = (index: number) => {
    setHighlights(prev => prev.filter((_, i) => i !== index));
  };

  // Success Screen
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/30"
          >
            <CheckCircle2 className="w-12 h-12 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Plan Published!</h1>
          <p className="text-gray-500 mb-6">Your meal plan is now live on the marketplace</p>
          <div className="space-y-3">
            <Button
              onClick={() => setLocation("/meal-plan-marketplace")}
              className="w-full bg-gradient-to-r from-[#0E95A7] to-[#26A8FF] text-white py-4 rounded-xl font-semibold"
            >
              View in Marketplace
            </Button>
            <Button
              onClick={() => {
                setShowSuccess(false);
                setCurrentStep(1);
                // Reset form
                setTitle("");
                setDescription("");
                setCoverImage(null);
                setDayPlans([{ id: "1", dayNumber: 1, meals: [] }]);
              }}
              variant="outline"
              className="w-full py-4 rounded-xl font-semibold"
            >
              Create Another Plan
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={handleBack}
            className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="text-center">
            <h1 className="text-sm font-bold text-gray-900">Create Meal Plan</h1>
            <p className="text-[10px] text-gray-400">Step {currentStep} of 4</p>
          </div>
          <button
            onClick={() => setLocation("/meal-plan-marketplace")}
            className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-4 pb-3">
          <div className="flex gap-1.5">
            {STEPS.map((step) => (
              <div key={step.id} className="flex-1">
                <div
                  className={`h-1 rounded-full transition-all ${
                    step.id <= currentStep
                      ? "bg-gradient-to-r from-[#0E95A7] to-[#26A8FF]"
                      : "bg-gray-200"
                  }`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {STEPS.map((step) => (
              <div key={step.id} className={`text-center ${step.id === currentStep ? "opacity-100" : "opacity-40"}`}>
                <p className="text-[10px] font-semibold text-gray-700">{step.title}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pb-32">
        <AnimatePresence mode="wait">
          {/* Step 1: Basics */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Basic Details</h2>
                <p className="text-sm text-gray-500">Tell us about your meal plan</p>
              </div>

              {/* Cover Image */}
              <div>
                <label className="text-sm font-semibold text-gray-900 mb-2 block">Cover Image</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div
                  onClick={handleImageUpload}
                  className={`relative h-40 rounded-2xl border-2 border-dashed overflow-hidden cursor-pointer transition-all ${
                    coverImage ? "border-[#0E95A7]" : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  {coverImage ? (
                    <>
                      <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Camera className="w-8 h-8 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                      <Upload className="w-8 h-8 mb-2" />
                      <p className="text-sm font-medium">Upload cover image</p>
                      <p className="text-xs">Tap to browse</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-sm font-semibold text-gray-900 mb-2 block">Plan Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Traditional Polish Winter Warmers"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0E95A7]/20 focus:border-[#0E95A7]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-semibold text-gray-900 mb-2 block">Description *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what makes your meal plan special..."
                  rows={3}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0E95A7]/20 focus:border-[#0E95A7] resize-none"
                />
              </div>

              {/* Cuisine */}
              <div>
                <label className="text-sm font-semibold text-gray-900 mb-2 block">Cuisine Type</label>
                <div className="flex flex-wrap gap-2">
                  {cuisineOptions.slice(1).map((c) => (
                    <button
                      key={c}
                      onClick={() => setCuisine(c)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        cuisine === c
                          ? "bg-gradient-to-r from-[#0E95A7] to-[#26A8FF] text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-900 mb-2 block">City *</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Warsaw"
                      className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0E95A7]/20 focus:border-[#0E95A7]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-900 mb-2 block">Country *</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Poland"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0E95A7]/20 focus:border-[#0E95A7]"
                  />
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="text-sm font-semibold text-gray-900 mb-2 block">Plan Duration</label>
                <div className="flex gap-2">
                  {[3, 7, 14, 30].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                        duration === d
                          ? "bg-gradient-to-r from-[#0E95A7] to-[#26A8FF] text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {d} days
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Dietary */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Dietary Information</h2>
                <p className="text-sm text-gray-500">Set nutritional details and preferences</p>
              </div>

              {/* Dietary Preferences */}
              <div>
                <label className="text-sm font-semibold text-gray-900 mb-2 block">Dietary Tags</label>
                <div className="flex flex-wrap gap-2">
                  {dietaryOptions.map((diet) => (
                    <button
                      key={diet}
                      onClick={() => toggleDietary(diet)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                        selectedDietary.includes(diet)
                          ? "bg-gradient-to-r from-[#0E95A7] to-[#26A8FF] text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {selectedDietary.includes(diet) && <Check className="w-3 h-3" />}
                      {diet}
                    </button>
                  ))}
                </div>
              </div>

              {/* Average Daily Nutrition */}
              <div>
                <label className="text-sm font-semibold text-gray-900 mb-3 block">Average Daily Nutrition</label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-orange-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Flame className="w-4 h-4 text-orange-500" />
                      <span className="text-xs font-medium text-orange-700">Calories</span>
                    </div>
                    <input
                      type="number"
                      value={avgCalories}
                      onChange={(e) => setAvgCalories(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg text-sm font-semibold text-center"
                    />
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">P</span>
                      <span className="text-xs font-medium text-blue-700">Protein (g)</span>
                    </div>
                    <input
                      type="number"
                      value={avgProtein}
                      onChange={(e) => setAvgProtein(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm font-semibold text-center"
                    />
                  </div>
                  <div className="bg-amber-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">C</span>
                      <span className="text-xs font-medium text-amber-700">Carbs (g)</span>
                    </div>
                    <input
                      type="number"
                      value={avgCarbs}
                      onChange={(e) => setAvgCarbs(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm font-semibold text-center"
                    />
                  </div>
                  <div className="bg-purple-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">F</span>
                      <span className="text-xs font-medium text-purple-700">Fat (g)</span>
                    </div>
                    <input
                      type="number"
                      value={avgFat}
                      onChange={(e) => setAvgFat(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm font-semibold text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <label className="text-sm font-semibold text-gray-900 mb-2 block">Difficulty Level</label>
                <div className="flex gap-2">
                  {(["Beginner", "Intermediate", "Chef"] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                        difficulty === d
                          ? "bg-gradient-to-r from-[#0E95A7] to-[#26A8FF] text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {d === "Beginner" ? "🥄" : d === "Intermediate" ? "🍳" : "👨‍🍳"} {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prep Time */}
              <div>
                <label className="text-sm font-semibold text-gray-900 mb-2 block">Average Prep Time/Day</label>
                <div className="flex gap-2">
                  {["15-30 min", "30-45 min", "45-60 min", "60+ min"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setPrepTime(t)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all ${
                        prepTime === t
                          ? "bg-gradient-to-r from-[#0E95A7] to-[#26A8FF] text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Schedule */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Build Your Schedule</h2>
                <p className="text-sm text-gray-500">Add meals for each day</p>
              </div>

              {/* Days */}
              <div className="space-y-3">
                {dayPlans.map((day) => (
                  <div key={day.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    {/* Day Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#0E95A7] to-[#26A8FF] rounded-lg flex items-center justify-center text-white font-bold text-sm">
                          {day.dayNumber}
                        </div>
                        <span className="text-sm font-semibold text-gray-900">Day {day.dayNumber}</span>
                        <span className="text-xs text-gray-400">({day.meals.length} meals)</span>
                      </div>
                      {dayPlans.length > 1 && (
                        <button
                          onClick={() => removeDay(day.id)}
                          className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-200"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Meals */}
                    <div className="p-3 space-y-2">
                      {day.meals.map((meal) => {
                        const config = mealTypeConfig[meal.mealType];
                        const Icon = config.icon;
                        return (
                          <div
                            key={meal.id}
                            className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                          >
                            <div className={`w-10 h-10 bg-gradient-to-br ${config.color} rounded-lg flex items-center justify-center`}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] uppercase font-bold text-gray-400">{config.label}</p>
                              <p className="text-sm font-semibold text-gray-900 truncate">{meal.name || "Unnamed meal"}</p>
                              <p className="text-xs text-orange-500">{meal.calories} cal</p>
                            </div>
                            <button
                              onClick={() => setEditingMeal({ dayId: day.id, meal })}
                              className="text-xs text-[#0E95A7] font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => removeMeal(day.id, meal.id)}
                              className="w-7 h-7 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}

                      {/* Add Meal Buttons */}
                      <div className="flex gap-2 flex-wrap pt-2">
                        {(Object.keys(mealTypeConfig) as Array<keyof typeof mealTypeConfig>).map((type) => {
                          const config = mealTypeConfig[type];
                          const Icon = config.icon;
                          const alreadyHas = day.meals.some(m => m.mealType === type && type !== "snack");
                          if (alreadyHas && type !== "snack") return null;
                          return (
                            <button
                              key={type}
                              onClick={() => addMealToDay(day.id, type)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-600 transition-all"
                            >
                              <Icon className="w-3.5 h-3.5" />
                              Add {config.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Day Button */}
              {dayPlans.length < duration && (
                <button
                  onClick={addDay}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-500 hover:border-[#0E95A7] hover:text-[#0E95A7] transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Day {dayPlans.length + 1}
                </button>
              )}

              {/* Quick Fill Info */}
              <div className="bg-blue-50 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700">
                  You can add more days later. For now, add at least one meal to continue.
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 4: Publishing */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Publish Your Plan</h2>
                <p className="text-sm text-gray-500">Set pricing and visibility</p>
              </div>

              {/* Pricing */}
              <div>
                <label className="text-sm font-semibold text-gray-900 mb-2 block">Pricing</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPricingType("free")}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      pricingType === "free"
                        ? "border-[#0E95A7] bg-[#0E95A7]/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Globe className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900">Free</p>
                    <p className="text-xs text-gray-500">Share with everyone</p>
                  </button>
                  <button
                    onClick={() => setPricingType("paid")}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      pricingType === "paid"
                        ? "border-[#0E95A7] bg-[#0E95A7]/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <DollarSign className="w-5 h-5 text-amber-600" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900">Paid</p>
                    <p className="text-xs text-gray-500">Earn from your plan</p>
                  </button>
                </div>

                {pricingType === "paid" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-3"
                  >
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Set your price (USD)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        step="0.01"
                        value={price}
                        onChange={(e) => setPrice(Number(e.target.value))}
                        className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0E95A7]/20 focus:border-[#0E95A7]"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">You'll receive 80% of each sale</p>
                  </motion.div>
                )}
              </div>

              {/* Visibility */}
              <div>
                <label className="text-sm font-semibold text-gray-900 mb-2 block">Visibility</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setVisibility("public")}
                    className={`p-3 rounded-xl border-2 flex items-center gap-3 transition-all ${
                      visibility === "public"
                        ? "border-[#0E95A7] bg-[#0E95A7]/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Eye className="w-5 h-5 text-gray-600" />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-900">Public</p>
                      <p className="text-[10px] text-gray-500">Anyone can find it</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setVisibility("private")}
                    className={`p-3 rounded-xl border-2 flex items-center gap-3 transition-all ${
                      visibility === "private"
                        ? "border-[#0E95A7] bg-[#0E95A7]/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Lock className="w-5 h-5 text-gray-600" />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-900">Private</p>
                      <p className="text-[10px] text-gray-500">Only via link</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Highlights */}
              <div>
                <label className="text-sm font-semibold text-gray-900 mb-2 block">
                  Plan Highlights
                  <span className="text-xs font-normal text-gray-400 ml-1">(What's included)</span>
                </label>
                <div className="space-y-2">
                  {highlights.map((h, idx) => (
                    <div key={idx} className="flex gap-2">
                      <div className="w-6 h-6 bg-gradient-to-r from-[#0E95A7] to-[#26A8FF] rounded-full flex items-center justify-center flex-shrink-0 mt-2">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <input
                        type="text"
                        value={h}
                        onChange={(e) => updateHighlight(idx, e.target.value)}
                        placeholder="e.g., 21 authentic recipes included"
                        className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0E95A7]/20 focus:border-[#0E95A7]"
                      />
                      {highlights.length > 1 && (
                        <button
                          onClick={() => removeHighlight(idx)}
                          className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 mt-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {highlights.length < 6 && (
                  <button
                    onClick={addHighlight}
                    className="text-xs text-[#0E95A7] font-medium mt-2 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add another highlight
                  </button>
                )}
              </div>

              {/* Preview Card */}
              <div>
                <label className="text-sm font-semibold text-gray-900 mb-2 block">Preview</label>
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="h-24 bg-gradient-to-br from-[#0E95A7]/20 to-[#26A8FF]/20 relative">
                    {coverImage && (
                      <img src={coverImage} alt="Preview" className="w-full h-full object-cover" />
                    )}
                    {pricingType === "free" ? (
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full">FREE</span>
                    ) : (
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-white text-gray-900 text-[10px] font-bold rounded-full">${price}</span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] text-[#0E95A7] font-medium">{cuisine} Cuisine</p>
                    <p className="text-sm font-bold text-gray-900">{title || "Your Plan Title"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span className="text-[10px] text-gray-500">{city || "City"}, {country || "Country"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-50">
        <div className="flex gap-3">
          <Button
            onClick={handleBack}
            variant="outline"
            className="flex-1 py-4 rounded-xl font-semibold"
          >
            {currentStep === 1 ? "Cancel" : "Back"}
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed() || isSubmitting}
            className="flex-1 bg-gradient-to-r from-[#0E95A7] to-[#26A8FF] text-white py-4 rounded-xl font-semibold disabled:opacity-50 shadow-lg shadow-[#0E95A7]/30"
          >
            {isSubmitting ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
              />
            ) : currentStep === 4 ? (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Publish Plan
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Meal Editor Modal */}
      <AnimatePresence>
        {editingMeal && (
          <MealEditorModal
            meal={editingMeal.meal}
            onSave={(meal) => saveMeal(editingMeal.dayId, meal)}
            onClose={() => setEditingMeal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Meal Editor Modal Component
function MealEditorModal({ 
  meal, 
  onSave, 
  onClose 
}: { 
  meal: MealItem | null; 
  onSave: (meal: MealItem) => void; 
  onClose: () => void;
}) {
  const [name, setName] = useState(meal?.name || "");
  const [calories, setCalories] = useState(meal?.calories || 0);
  const [protein, setProtein] = useState(meal?.protein || 0);
  const [carbs, setCarbs] = useState(meal?.carbs || 0);
  const [fat, setFat] = useState(meal?.fat || 0);
  const [prepTime, setPrepTime] = useState(meal?.prepTime || 15);
  const [ingredients, setIngredients] = useState<string>(meal?.ingredients.join("\n") || "");
  const [instructions, setInstructions] = useState<string>(meal?.instructions.join("\n") || "");

  const handleSave = () => {
    if (!meal) return;
    onSave({
      ...meal,
      name,
      calories,
      protein,
      carbs,
      fat,
      prepTime,
      ingredients: ingredients.split("\n").filter(i => i.trim()),
      instructions: instructions.split("\n").filter(i => i.trim())
    });
  };

  const config = meal ? mealTypeConfig[meal.mealType] : null;
  const Icon = config?.icon || Coffee;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 z-50"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {config && (
              <div className={`w-10 h-10 bg-gradient-to-br ${config.color} rounded-xl flex items-center justify-center`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {meal?.name ? "Edit" : "Add"} {config?.label}
              </h2>
              <p className="text-xs text-gray-400">Fill in the meal details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="text-sm font-semibold text-gray-900 mb-1 block">Meal Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Grilled Chicken Salad"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0E95A7]/20 focus:border-[#0E95A7]"
            />
          </div>

          {/* Nutrition */}
          <div>
            <label className="text-sm font-semibold text-gray-900 mb-2 block">Nutrition</label>
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center">
                <input
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(Number(e.target.value))}
                  className="w-full px-2 py-2 bg-orange-50 border border-orange-200 rounded-lg text-sm font-semibold text-center"
                />
                <p className="text-[10px] text-gray-500 mt-1">Calories</p>
              </div>
              <div className="text-center">
                <input
                  type="number"
                  value={protein}
                  onChange={(e) => setProtein(Number(e.target.value))}
                  className="w-full px-2 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm font-semibold text-center"
                />
                <p className="text-[10px] text-gray-500 mt-1">Protein</p>
              </div>
              <div className="text-center">
                <input
                  type="number"
                  value={carbs}
                  onChange={(e) => setCarbs(Number(e.target.value))}
                  className="w-full px-2 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm font-semibold text-center"
                />
                <p className="text-[10px] text-gray-500 mt-1">Carbs</p>
              </div>
              <div className="text-center">
                <input
                  type="number"
                  value={fat}
                  onChange={(e) => setFat(Number(e.target.value))}
                  className="w-full px-2 py-2 bg-purple-50 border border-purple-200 rounded-lg text-sm font-semibold text-center"
                />
                <p className="text-[10px] text-gray-500 mt-1">Fat</p>
              </div>
            </div>
          </div>

          {/* Prep Time */}
          <div>
            <label className="text-sm font-semibold text-gray-900 mb-1 block">Prep Time (minutes)</label>
            <input
              type="number"
              value={prepTime}
              onChange={(e) => setPrepTime(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0E95A7]/20 focus:border-[#0E95A7]"
            />
          </div>

          {/* Ingredients */}
          <div>
            <label className="text-sm font-semibold text-gray-900 mb-1 block">Ingredients</label>
            <p className="text-[10px] text-gray-400 mb-2">One ingredient per line</p>
            <textarea
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              placeholder="200g chicken breast&#10;1 cup mixed greens&#10;1/2 avocado"
              rows={4}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0E95A7]/20 focus:border-[#0E95A7] resize-none"
            />
          </div>

          {/* Instructions */}
          <div>
            <label className="text-sm font-semibold text-gray-900 mb-1 block">Instructions</label>
            <p className="text-[10px] text-gray-400 mb-2">One step per line</p>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Grill chicken for 6 minutes each side&#10;Chop vegetables&#10;Combine and serve"
              rows={4}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0E95A7]/20 focus:border-[#0E95A7] resize-none"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="p-4 border-t border-gray-100">
          <Button
            onClick={handleSave}
            disabled={!name.trim()}
            className="w-full bg-gradient-to-r from-[#0E95A7] to-[#26A8FF] text-white py-4 rounded-xl font-semibold disabled:opacity-50 shadow-lg shadow-[#0E95A7]/30"
          >
            <Check className="w-4 h-4 mr-2" />
            Save Meal
          </Button>
        </div>
      </motion.div>
    </>
  );
}
