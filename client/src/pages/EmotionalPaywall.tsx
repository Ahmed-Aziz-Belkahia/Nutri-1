import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, Lock, Sparkles, CheckCircle, 
  Star, Calendar, BarChart2, Heart, Crown, 
  Trophy, Zap, ChevronRight, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useUser } from "@/hooks/use-user";

// Mock data for demonstrating the nutrition blueprint
const mockNutritionBlueprint = {
  calorieGoal: 2200,
  proteinGoal: 110,
  carbsGoal: 220,
  fatGoal: 73,
  mealTypes: ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
  sampleMeals: [
    'Kale and Spinach Protein Smoothie',
    'Grilled Chicken with Quinoa Bowl',
    'Salmon with Roasted Vegetables'
  ],
  dailySchedule: [
    { time: '7:30 AM', meal: 'Breakfast' },
    { time: '10:30 AM', meal: 'Snack' },
    { time: '1:00 PM', meal: 'Lunch' },
    { time: '4:00 PM', meal: 'Snack' },
    { time: '7:00 PM', meal: 'Dinner' }
  ]
};

// Pricing plans data
const pricingPlans = [
  {
    name: "Pro Annual",
    price: "$79.99",
    period: "per year",
    savings: "Save 33%",
    features: [
      "AI-Powered Food Recognition",
      "Personalized Meal Plans",
      "Progress Analytics",
      "Premium Recipes Library",
      "24/7 Support Access"
    ],
    isPopular: true
  },
  {
    name: "Pro Monthly",
    price: "$9.99",
    period: "per month",
    features: [
      "AI-Powered Food Recognition",
      "Personalized Meal Plans",
      "Progress Analytics",
      "Premium Recipes Library"
    ],
    isPopular: false
  }
];

export default function EmotionalPaywall() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user } = useUser();
  
  // State for animated elements
  const [activeTab, setActiveTab] = useState('plan');
  const [showLimitedTimeOffer, setShowLimitedTimeOffer] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(pricingPlans[0].name);
  
  // Countdown timer for limited time offer
  const [countdown, setCountdown] = useState({
    minutes: 15,
    seconds: 0
  });

  // Handle countdown timer
  useEffect(() => {
    // Show the limited time banner after 3 seconds for dramatic effect
    const showTimer = setTimeout(() => {
      setShowLimitedTimeOffer(true);
    }, 3000);

    // Start the countdown
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev.seconds === 0) {
          if (prev.minutes === 0) {
            clearInterval(timer);
            return prev;
          }
          return { minutes: prev.minutes - 1, seconds: 59 };
        }
        return { ...prev, seconds: prev.seconds - 1 };
      });
    }, 1000);

    return () => {
      clearTimeout(showTimer);
      clearInterval(timer);
    };
  }, []);

  // Format time for countdown display
  const formatTime = (time: number) => {
    return time < 10 ? `0${time}` : time;
  };

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.6 } }
  };

  const slideUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  // Handle continue to dashboard (skips payment for now)
  const handleContinue = () => {
    toast({
      title: "Welcome to Your Nutritional Journey",
      description: "Your personalized plan is now ready.",
    });
    // For now, we'll just redirect to the dashboard
    setLocation('/dashboard');
  };

  // Handle subscription 
  const handleSubscribe = () => {
    // This would normally process payment, but for now just redirect
    handleContinue();
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-950 to-gray-900 text-white overflow-hidden">
      {/* Dynamic background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated gradient orbs */}
        <motion.div
          animate={{
            opacity: [0.1, 0.2, 0.1],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-[10%] right-[15%] w-[40vw] h-[40vw] rounded-full bg-[#00BCD6]/20 blur-[120px]"
        />
        <motion.div
          animate={{
            opacity: [0.1, 0.2, 0.1],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, delay: 1 }}
          className="absolute bottom-[10%] left-[10%] w-[35vw] h-[35vw] rounded-full bg-[#A541FF]/20 blur-[120px]"
        />
      </div>

      {/* Header with logo */}
      <header className="relative z-10 pt-8 pb-4">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="h-6 w-6 text-[#00BCD6]" />
            <span className="text-xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#00BCD6] to-[#A541FF]">
              NutriAI
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 container max-w-6xl mx-auto px-4 pb-16">
        {/* Main content */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="max-w-4xl mx-auto text-center mb-8"
        >
          <motion.div variants={fadeIn} className="mb-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-sm text-[#00BCD6]">
              <Crown className="h-3.5 w-3.5 mr-2" />
              Your Personalized Results
            </span>
          </motion.div>
          
          <motion.h1 variants={slideUp} className="text-4xl md:text-5xl font-black mb-6">
            Your Personalized
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-[#00BCD6] to-[#A541FF]">
              Nutrition Blueprint
            </span>
            Is Ready
          </motion.h1>
          
          <motion.p variants={slideUp} className="text-xl text-white/70 mb-8 max-w-3xl mx-auto">
            We've analyzed your unique profile and created something extraordinary - 
            nutrition that speaks your body's language.
          </motion.p>
        </motion.div>

        {/* Blueprint Card with Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="bg-gray-800/50 backdrop-blur-md rounded-3xl overflow-hidden border border-white/10 shadow-xl mb-12"
        >
          {/* Tab Navigation */}
          <div className="flex border-b border-white/10">
            {['plan', 'timeline', 'analysis'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-4 px-6 text-center transition-all duration-300 ${
                  activeTab === tab
                    ? 'bg-white/10 text-white font-bold'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                {tab === 'plan' && 'Custom Meal Plan'}
                {tab === 'timeline' && 'Transformation Timeline'}
                {tab === 'analysis' && 'Body-Responsive Analysis'}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-8 min-h-[400px]">
            <AnimatePresence mode="wait">
              {/* Plan Tab */}
              {activeTab === 'plan' && (
                <motion.div
                  key="plan"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full"
                >
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold mb-2">Your Custom Meal Algorithm</h3>
                    <p className="text-white/70">
                      Tailored specifically to your body's unique needs and your taste preferences.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Macros Card - Left Side */}
                    <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-sm">
                      <h4 className="text-lg font-bold mb-4 flex items-center">
                        <Heart className="h-5 w-5 mr-2 text-[#00BCD6]" />
                        Your Optimal Daily Nutrition
                      </h4>
                      
                      {/* Calorie target with blur overlay */}
                      <div className="mb-6 relative">
                        <div className="flex items-end">
                          <div className="text-4xl font-bold text-white">
                            {mockNutritionBlueprint.calorieGoal}
                          </div>
                          <div className="text-lg text-white/70 ml-1 mb-1">kcal</div>
                        </div>
                        <div className="text-sm text-white/60">Daily calorie target</div>
                        
                        {/* Blur overlay that partially reveals */}
                        <div className="absolute inset-0 bg-gray-800/80 backdrop-blur-sm flex items-center justify-center">
                          <Lock className="h-5 w-5 text-white/70 mr-2" />
                          <span className="text-white/70 font-medium">Unlock to view</span>
                        </div>
                      </div>
                      
                      {/* Macros with blur overlay */}
                      <div className="grid grid-cols-3 gap-4 relative">
                        {[
                          { name: 'Protein', value: `${mockNutritionBlueprint.proteinGoal}g`, color: 'bg-[#00BCD6]' },
                          { name: 'Carbs', value: `${mockNutritionBlueprint.carbsGoal}g`, color: 'bg-[#A541FF]' },
                          { name: 'Fat', value: `${mockNutritionBlueprint.fatGoal}g`, color: 'bg-[#F59E0B]' }
                        ].map((macro, i) => (
                          <div key={i} className="text-center">
                            <div className={`h-2 ${macro.color} rounded-full mb-2`}></div>
                            <div className="text-xl font-bold">{macro.value}</div>
                            <div className="text-sm text-white/60">{macro.name}</div>
                          </div>
                        ))}
                        
                        {/* Blur overlay that partially reveals */}
                        <div className="absolute inset-0 bg-gray-800/60 backdrop-blur-sm flex items-center justify-center">
                          <Lock className="h-5 w-5 text-white/70 mr-2" />
                          <span className="text-white/70 font-medium">Personalized for you</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Sample Meal Plan - Right Side */}
                    <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-sm">
                      <h4 className="text-lg font-bold mb-4 flex items-center">
                        <Calendar className="h-5 w-5 mr-2 text-[#A541FF]" />
                        Your Ideal Meal Schedule
                      </h4>
                      
                      <div className="space-y-4 relative">
                        {mockNutritionBlueprint.dailySchedule.map((item, i) => (
                          <div key={i} className="flex items-center">
                            <div className="text-white/60 w-24">{item.time}</div>
                            <div className="flex-1 h-px bg-white/10 mx-3"></div>
                            <div className="text-white font-medium">{item.meal}</div>
                          </div>
                        ))}
                        
                        {/* Blur overlay with gradient fade */}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-800/70 to-gray-800/90 backdrop-blur-sm flex flex-col items-center justify-end p-6">
                          <Lock className="h-6 w-6 text-white/70 mb-2" />
                          <span className="text-white/90 font-medium text-center">
                            Unlock to see your complete personalized meal schedule
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Sample Meal Preview */}
                  <div className="mt-8 rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-sm">
                    <h4 className="text-lg font-bold mb-4 flex items-center">
                      <Sparkles className="h-5 w-5 mr-2 text-[#F59E0B]" />
                      Sample Meals From Your Plan
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
                      {mockNutritionBlueprint.sampleMeals.map((meal, i) => (
                        <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10">
                          <div className="h-24 rounded-lg bg-gradient-to-r from-gray-700 to-gray-600 mb-3"></div>
                          <div className="font-medium">{meal}</div>
                        </div>
                      ))}
                      
                      {/* Blur overlay that reveals a glimpse */}
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-800/90 via-gray-800/50 to-transparent backdrop-blur-sm flex flex-col items-center justify-end p-6">
                        <Button
                          className="mb-6 bg-white/10 hover:bg-white/20 border border-white/20 text-white"
                          onClick={() => setActiveTab('timeline')}
                        >
                          Preview More <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              
              {/* Timeline Tab */}
              {activeTab === 'timeline' && (
                <motion.div
                  key="timeline"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full"
                >
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold mb-2">Your Transformation Timeline</h3>
                    <p className="text-white/70">
                      We've mapped your unique journey with personalized milestones.
                    </p>
                  </div>
                  
                  <div className="relative">
                    {/* Timeline visualization */}
                    <div className="relative ml-6 pl-8 border-l-2 border-white/20">
                      {[
                        { 
                          week: 'Week 1-2', 
                          title: 'Adaptation Phase', 
                          description: 'Your body begins responding to optimized nutrition',
                          achievements: ['Increased energy levels', 'Better sleep quality', 'Reduced cravings']
                        },
                        { 
                          week: 'Week 3-4', 
                          title: 'Momentum Building', 
                          description: 'Your metabolism adjusts to your new nutrition pattern',
                          achievements: ['Noticeable mood improvement', 'First visible changes', 'Consistent energy']
                        },
                        { 
                          week: 'Week 5-8', 
                          title: 'Transformation Zone', 
                          description: 'Where the most significant changes begin to appear',
                          achievements: ['Significant progress toward goal', 'Established new habits', 'Increased vitality']
                        }
                      ].map((period, i) => (
                        <div key={i} className="mb-10 relative">
                          {/* Timeline node */}
                          <div className="absolute -left-[42px] top-0 w-6 h-6 rounded-full bg-gradient-to-r from-[#00BCD6] to-[#A541FF] flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          </div>
                          
                          <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                            <div className="text-sm text-[#00BCD6] font-bold mb-1">{period.week}</div>
                            <h4 className="text-xl font-bold mb-2">{period.title}</h4>
                            <p className="text-white/70 mb-4">{period.description}</p>
                            
                            <div className="space-y-2">
                              {period.achievements.map((achievement, j) => (
                                <div key={j} className="flex items-center">
                                  <CheckCircle className="h-4 w-4 text-[#00BCD6] mr-2 flex-shrink-0" />
                                  <span className="text-white/80">{achievement}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Blur overlay that partially reveals timeline */}
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-800/95 via-gray-800/50 to-transparent backdrop-blur-sm flex flex-col items-center justify-end p-8">
                      <Lock className="h-6 w-6 text-white/70 mb-2" />
                      <span className="text-white/90 font-medium text-center mb-4">
                        Unlock to see your complete transformation timeline
                      </span>
                      <Button
                        className="bg-white/10 hover:bg-white/20 border border-white/20 text-white"
                        onClick={() => setActiveTab('analysis')}
                      >
                        See Body Analysis <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
              
              {/* Analysis Tab */}
              {activeTab === 'analysis' && (
                <motion.div
                  key="analysis"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full"
                >
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold mb-2">Your Body-Responsive Analysis</h3>
                    <p className="text-white/70">
                      How your unique body responds to different nutrients and energy patterns.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Energy Flow Analysis */}
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                      <h4 className="text-lg font-bold mb-4 flex items-center">
                        <Zap className="h-5 w-5 mr-2 text-[#F59E0B]" />
                        Energy Flow Analysis
                      </h4>
                      
                      <div className="relative h-[200px]">
                        {/* Energy graph visualization */}
                        <svg className="w-full h-full" viewBox="0 0 300 150">
                          <defs>
                            <linearGradient id="energyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#00BCD6" />
                              <stop offset="100%" stopColor="#A541FF" />
                            </linearGradient>
                          </defs>
                          
                          {/* Time markers */}
                          <line x1="0" y1="140" x2="300" y2="140" stroke="rgba(255,255,255,0.2)" />
                          
                          {/* Energy curve */}
                          <path 
                            d="M0,120 C30,100 60,80 90,90 C120,100 150,60 180,40 C210,20 240,30 270,50 C300,70 300,100 300,120" 
                            fill="none" 
                            stroke="url(#energyGradient)" 
                            strokeWidth="3"
                          />
                          
                          {/* Fill under curve */}
                          <path 
                            d="M0,120 C30,100 60,80 90,90 C120,100 150,60 180,40 C210,20 240,30 270,50 C300,70 300,100 300,120 L300,140 L0,140 Z" 
                            fill="url(#energyGradient)"
                            fillOpacity="0.1"
                          />
                        </svg>
                        
                        {/* Blur overlay */}
                        <div className="absolute inset-0 bg-gray-800/70 backdrop-blur-sm flex items-center justify-center">
                          <Lock className="h-5 w-5 text-white/70 mr-2" />
                          <span className="text-white/70 font-medium">Unlock your energy profile</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Nutritional DNA Profile */}
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                      <h4 className="text-lg font-bold mb-4 flex items-center">
                        <BarChart2 className="h-5 w-5 mr-2 text-[#A541FF]" />
                        Nutritional DNA Profile
                      </h4>
                      
                      <div className="space-y-4 relative">
                        {/* Nutrient response bars */}
                        {['Protein Optimization', 'Carbohydrate Response', 'Fat Utilization', 'Micronutrient Balance'].map((nutrient, i) => (
                          <div key={i} className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-sm">{nutrient}</span>
                              <span className="text-sm text-white/70">Personalized</span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full bg-gradient-to-r from-[#00BCD6] to-[#A541FF]"
                                style={{ width: `${65 + i * 5}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Blur overlay */}
                        <div className="absolute inset-0 bg-gray-800/70 backdrop-blur-sm flex items-center justify-center">
                          <Lock className="h-5 w-5 text-white/70 mr-2" />
                          <span className="text-white/70 font-medium">Unlock your nutritional profile</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Success Projection */}
                  <div className="mt-8 bg-white/5 rounded-2xl p-6 border border-white/10">
                    <h4 className="text-lg font-bold mb-4 flex items-center">
                      <Trophy className="h-5 w-5 mr-2 text-[#F59E0B]" />
                      Your Success Projection
                    </h4>
                    
                    <div className="relative">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#00BCD6] to-[#A541FF] flex items-center justify-center text-white font-bold mr-3">
                            {user?.email?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="font-bold">Your Personalized Journey</div>
                            <div className="text-sm text-white/70">Based on your unique profile</div>
                          </div>
                        </div>
                        
                        <div className="rounded-full bg-white/10 px-3 py-1 text-sm">
                          98% Success Rate
                        </div>
                      </div>
                      
                      {/* Success projection timeline */}
                      <div className="h-16 bg-white/5 rounded-xl relative overflow-hidden">
                        <div className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-[#00BCD6]/20 to-[#A541FF]/20 border-r border-white/20 flex items-center justify-center">
                          <span className="text-xs text-white/70">Now</span>
                        </div>
                        <div className="absolute inset-y-0 left-1/4 w-1/4 bg-gradient-to-r from-[#A541FF]/20 to-[#F59E0B]/20 border-r border-white/20 flex items-center justify-center">
                          <span className="text-xs text-white/70">30 Days</span>
                        </div>
                        <div className="absolute inset-y-0 left-2/4 w-1/4 bg-gradient-to-r from-[#F59E0B]/20 to-[#00BCD6]/20 border-r border-white/20 flex items-center justify-center">
                          <span className="text-xs text-white/70">60 Days</span>
                        </div>
                        <div className="absolute inset-y-0 left-3/4 w-1/4 bg-gradient-to-r from-[#00BCD6]/20 to-[#00BCD6]/30 flex items-center justify-center">
                          <span className="text-xs text-white/70">90 Days</span>
                        </div>
                        
                        {/* Achievement point markers */}
                        <div className="absolute top-1/2 left-[30%] w-4 h-4 rounded-full bg-white transform -translate-y-1/2 shadow-lg shadow-[#00BCD6]/50 z-10"></div>
                        <div className="absolute top-1/2 left-[60%] w-4 h-4 rounded-full bg-white transform -translate-y-1/2 shadow-lg shadow-[#A541FF]/50 z-10"></div>
                        <div className="absolute top-1/2 left-[90%] w-4 h-4 rounded-full bg-white transform -translate-y-1/2 shadow-lg shadow-[#F59E0B]/50 z-10"></div>
                        
                        {/* Progress line */}
                        <div className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-[#00BCD6] via-[#A541FF] to-[#F59E0B] transform -translate-y-1/2 w-full"></div>
                      </div>
                      
                      {/* Blur overlay */}
                      <div className="absolute inset-0 bg-gray-800/70 backdrop-blur-sm flex items-center justify-center">
                        <Lock className="h-5 w-5 text-white/70 mr-2" />
                        <span className="text-white/70 font-medium">Unlock your success timeline</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Value Proposition Cards */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
        >
          {[
            {
              icon: <Heart className="h-6 w-6 text-[#00BCD6]" />,
              title: "Custom Meal Algorithm",
              description: "Personalized nutrition that adapts to your body's unique needs",
              color: "from-[#00BCD6]/20 to-transparent"
            },
            {
              icon: <Zap className="h-6 w-6 text-[#A541FF]" />,
              title: "Body-Responsive Nutrition",
              description: "Meals that evolve with your progress and changing needs",
              color: "from-[#A541FF]/20 to-transparent"
            },
            {
              icon: <BarChart2 className="h-6 w-6 text-[#F59E0B]" />,
              title: "Transformation Timeline",
              description: "Clear milestones that celebrate your progress at every step",
              color: "from-[#F59E0B]/20 to-transparent"
            }
          ].map((card, i) => (
            <motion.div
              key={i}
              variants={slideUp}
              className="bg-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-sm relative overflow-hidden"
            >
              <div className={`absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b ${card.color}`}></div>
              <div className="relative z-10">
                <div className="p-3 bg-white/10 rounded-full inline-block mb-4">
                  {card.icon}
                </div>
                <h3 className="text-xl font-bold mb-2">{card.title}</h3>
                <p className="text-white/70">{card.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Testimonials Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="max-w-3xl mx-auto mb-12 bg-white/5 rounded-2xl p-8 border border-white/10 backdrop-blur-sm"
        >
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold mb-2">Real Transformation Stories</h3>
            <p className="text-white/70">
              Join thousands who have discovered their body's wisdom through NutriAI
            </p>
          </div>
          
          <div className="relative">
            <div className="flex items-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#00BCD6] to-[#A541FF] flex items-center justify-center text-white text-2xl font-bold mr-4">
                P
              </div>
              <div>
                <div className="italic text-white/90 mb-2">
                  "This isn't just another diet. This is finally understanding what my body needs."
                </div>
                <div className="flex items-center">
                  <span className="font-bold">Pavel</span>
                  <span className="mx-2">•</span>
                  <span className="text-white/70">Achieved ideal weight in 90 days</span>
                </div>
              </div>
            </div>
            
            {/* Success indicators */}
            <div className="flex items-center justify-between mt-6 text-sm text-white/70">
              <div>98% of users report significant results</div>
              <div className="flex">
                <Star className="h-4 w-4 text-[#F59E0B] fill-[#F59E0B]" />
                <Star className="h-4 w-4 text-[#F59E0B] fill-[#F59E0B]" />
                <Star className="h-4 w-4 text-[#F59E0B] fill-[#F59E0B]" />
                <Star className="h-4 w-4 text-[#F59E0B] fill-[#F59E0B]" />
                <Star className="h-4 w-4 text-[#F59E0B] fill-[#F59E0B]" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Pricing Plans */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="max-w-4xl mx-auto mb-8"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black mb-4">
              Unlock Your Personalized
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#00BCD6] to-[#A541FF]"> Nutrition Blueprint</span>
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {pricingPlans.map((plan, i) => (
              <div 
                key={i}
                className={`
                  rounded-3xl overflow-hidden backdrop-blur-md
                  ${plan.isPopular 
                    ? 'bg-gradient-to-b from-[#00BCD6]/20 via-[#A541FF]/10 to-transparent border-2 border-[#00BCD6]/50' 
                    : 'bg-white/5 border border-white/10'
                  }
                `}
              >
                {plan.isPopular && (
                  <div className="bg-gradient-to-r from-[#00BCD6] to-[#A541FF] py-2 px-4 text-center">
                    <span className="text-white font-medium">Most Popular Choice</span>
                  </div>
                )}
                
                <div className="p-8">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  
                  <div className="flex items-end mb-6">
                    <span className="text-4xl font-black">{plan.price}</span>
                    <span className="text-white/70 ml-2 mb-1">{plan.period}</span>
                  </div>
                  
                  {plan.savings && (
                    <div className="inline-block bg-white/10 rounded-full px-3 py-1 text-sm font-medium text-white mb-6">
                      {plan.savings}
                    </div>
                  )}
                  
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-start">
                        <CheckCircle className={`h-5 w-5 mr-3 flex-shrink-0 ${plan.isPopular ? 'text-[#00BCD6]' : 'text-white/70'}`} />
                        <span className="text-white/90">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button
                    className={`w-full py-6 ${
                      plan.isPopular
                        ? 'bg-gradient-to-r from-[#00BCD6] to-[#A541FF] hover:opacity-90 text-white'
                        : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                    }`}
                    onClick={() => {
                      setSelectedPlan(plan.name);
                      handleSubscribe();
                    }}
                  >
                    {plan.isPopular ? 'Unlock Your Blueprint' : 'Get Started'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
        
        {/* Skip for now button */}
        <div className="text-center mb-8">
          <Button
            variant="link"
            className="text-white/60 hover:text-white"
            onClick={handleContinue}
          >
            Skip for now
          </Button>
        </div>

        {/* Limited time offer banner - animated entrance */}
        <AnimatePresence>
          {showLimitedTimeOffer && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-[#00BCD6] to-[#A541FF] py-4 z-50"
            >
              <div className="container max-w-6xl mx-auto px-4">
                <div className="flex flex-col md:flex-row items-center justify-between">
                  <div className="flex items-center mb-4 md:mb-0">
                    <Clock className="h-6 w-6 text-white mr-3" />
                    <div>
                      <div className="text-white font-bold">Special Launch Offer</div>
                      <div className="text-white/80 text-sm">
                        Your personalized blueprint is optimized for your current state
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="mr-4">
                      <div className="text-white/80 text-sm">Offer ends in:</div>
                      <div className="text-white font-bold">
                        {formatTime(countdown.minutes)}:{formatTime(countdown.seconds)}
                      </div>
                    </div>
                    
                    <Button 
                      className="bg-white text-gray-900 hover:bg-gray-100 px-6"
                      onClick={() => {
                        setSelectedPlan(pricingPlans[0].name);
                        handleSubscribe();
                      }}
                    >
                      Unlock Now
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}