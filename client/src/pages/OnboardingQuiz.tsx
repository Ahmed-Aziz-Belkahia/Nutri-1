import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { OnboardingLanguageSelector } from '@/components/OnboardingLanguageSelector';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Camera, Upload, User, Target, Heart, Zap, Clock, Star, CalendarDays, Calendar, TrendingDown, TrendingUp, Minus, Info, ChevronDown, ChevronUp } from 'lucide-react';

type OnboardingData = {
  perfectGoal: ('weight_loss' | 'muscle_gain' | 'energy_boost' | 'health_improve' | 'confidence_boost' | 'lifestyle_change' | 'other')[];
  customGoal?: string;
  gender: 'male' | 'female' | '';
  age: number;
  height: number;
  weight: number;
  goalWeight: number;
  weightGoal: 'loss' | 'maintain' | 'gain' | '';
  activityLevel: string;
  dietaryRestrictions: string[];
  allergies: string[];
  mealBudget: 'low' | 'medium' | 'high';
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  preferredLanguage: 'en' | 'pl';
  profileImage?: File;
  energyPattern: 'morning' | 'afternoon' | 'evening' | 'consistent' | 'fluctuating';
  flavorPreference: 'savory' | 'spicy' | 'sweet' | 'fresh';
  firstVictory: 'energy' | 'sleep' | 'appearance' | 'clarity';
  motivationLevel?: 'high' | 'medium' | 'low';
  nutritionGoals?: string[];
  extractedData?: {
    hasAge: boolean;
    hasGender: boolean;
    hasWeight: boolean;
    hasGoalWeight: boolean;
    hasHeight: boolean;
    hasGoal: boolean;
  };
};

const initialFormData: OnboardingData = {
  perfectGoal: [],
  customGoal: '',
  gender: '',
  age: 0,
  height: 170,
  weight: 0,
  goalWeight: 0,
  weightGoal: '',
  activityLevel: '',
  dietaryRestrictions: [],
  allergies: [],
  mealBudget: 'medium',
  experienceLevel: 'beginner',
  preferredLanguage: 'pl',
  energyPattern: 'consistent',
  flavorPreference: 'fresh',
  firstVictory: 'energy',
  motivationLevel: 'high',
  nutritionGoals: []
};

const calculateCalories = (data: OnboardingData) => {
  if (!data.age || !data.height || !data.weight || !data.gender || !data.activityLevel) {
    return 2000;
  }

  // Standard activity multipliers
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9
  };

  // Mifflin-St Jeor BMR formula (most commonly used)
  const age = data.age;
  const weight = data.weight;
  const height = data.height;
  
  // BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age) + s
  // s = +5 for males, -161 for females
  const baseCalories = 10 * weight + 6.25 * height - 5 * age;
  const bmr = data.gender === 'male' ? baseCalories + 5 : baseCalories - 161;

  const tdee = bmr * (activityMultipliers[data.activityLevel as keyof typeof activityMultipliers] || 1.55);

  // Standard calorie adjustments
  const goalAdjustments = {
    loss: -500,    // 500 kcal deficit for ~0.5kg/week loss
    maintain: 0,
    gain: 300      // 300 kcal surplus for healthy mass gain
  };

  return Math.round(tdee + (goalAdjustments[data.weightGoal as keyof typeof goalAdjustments] || 0));
};

export default function OnboardingQuiz() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<OnboardingData>(initialFormData);
  const [visionBoardPage, setVisionBoardPage] = useState(0);
  const [showFormulaExplanation, setShowFormulaExplanation] = useState(false);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Refs for scrollable pickers
  const heightScrollRef = useRef<HTMLDivElement | null>(null);
  const weightScrollRef = useRef<HTMLDivElement | null>(null);
  const goalWeightScrollRef = useRef<HTMLDivElement | null>(null);
  
  // Calibration constants and refs (use refs so changes reflect without remount)
  const WEIGHT_CAL = -10;
  const GOAL_WEIGHT_CAL = -10;
  const weightCALRef = useRef<number>(WEIGHT_CAL);
  const goalWeightCALRef = useRef<number>(GOAL_WEIGHT_CAL);
  weightCALRef.current = WEIGHT_CAL;
  goalWeightCALRef.current = GOAL_WEIGHT_CAL;

  const calculateTimeline = () => {
    if (formData.weightGoal === 'maintain') {
      return { weeks: 0, months: 0, weeklyProgress: 0 };
    }

    const weightDifference = Math.abs(formData.goalWeight - formData.weight);
    const weeklyProgress = formData.weightGoal === 'loss' ? -0.5 : 0.5;
    const weeks = Math.ceil(weightDifference / Math.abs(weeklyProgress));
    const months = Math.round(weeks / 4.33);

    return { weeks, months, weeklyProgress };
  };

  const mutation = useMutation({
    mutationFn: async (data: OnboardingData) => {
      const formDataToSend = new FormData();
      
      // Calculate nutrition values using Mifflin-St Jeor formula
      const age = data.age;
      const weight = data.weight;
      const goalWeight = data.goalWeight;
      const height = data.height;
      
      // Mifflin-St Jeor BMR calculation
      // BMR = (10 × weight) + (6.25 × height) - (5 × age) + s
      // s = +5 for males, -161 for females
      const baseCalories = 10 * weight + 6.25 * height - 5 * age;
      const bmr = data.gender === 'male' ? baseCalories + 5 : baseCalories - 161;
      
      const activityMultiplier = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
        very_active: 1.9
      }[data.activityLevel] || 1.55;
      
      const tdee = bmr * activityMultiplier;
      
      // Standard calorie adjustments
      const dailyCalories = data.weightGoal === 'loss' ? tdee - 500 : 
                           data.weightGoal === 'gain' ? tdee + 300 : tdee;
      
      // Create profile data matching the backend expectation
      const profileData = {
        age: data.age,
        gender: data.gender,
        height: height,
        weight: weight,
        goalWeight: goalWeight,
        weightGoal: data.weightGoal,
        activityLevel: data.activityLevel,
        calorieGoal: Math.round(dailyCalories),
        proteinGoal: Math.round(dailyCalories * 0.3 / 4), // 30% of calories from protein
        carbsGoal: Math.round(dailyCalories * 0.4 / 4),   // 40% of calories from carbs
        fatGoal: Math.round(dailyCalories * 0.3 / 9),     // 30% of calories from fat
        dietaryRestrictions: [],
        allergies: [],
        mealBudget: "medium",
        experienceLevel: "beginner",
        preferredLanguage: "pl",
        energyPattern: "morning",
        flavorPreference: "savory",
        firstVictory: "energy",
        motivationLevel: "medium",
        nutritionGoals: []
      };
      
      // Add profile data as JSON string
      formDataToSend.append('profile', JSON.stringify(profileData));
      
      // Add profile image if exists
      if (data.profileImage && data.profileImage instanceof File) {
        formDataToSend.append('profileImage', data.profileImage);
      }

      const response = await fetch('/api/register/complete-onboarding', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Onboarding completion failed:', errorData);
        throw new Error('Failed to complete onboarding');
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log('Onboarding completed successfully, redirecting to dashboard...');
      toast({
        title: 'Profile created!',
        description: 'Your profile has been successfully created.',
      });
      
      // Invalidate user query to refresh auth state with updated onboarding status
      queryClient.invalidateQueries({ queryKey: ["user"] });
      
      // Set flag to show tutorial overlay on dashboard
      localStorage.setItem('justCompletedOnboarding', 'true');
      
      // Use setTimeout to ensure the toast is shown before navigation
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    },
    onError: (error: Error) => {
      console.error('Onboarding completion error:', error);
      toast({
        title: 'Error',
        description: 'There was a problem saving your profile. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleNext = () => {
    if (step === 7) {
      // Go directly to plan display (no loading needed)
      setVisionBoardPage(1);
      setStep(8);
    } else if (step === 8 && visionBoardPage < 2) {
      setVisionBoardPage(prev => prev + 1);
    } else if (step === 8 && visionBoardPage === 2) {
      // Store onboarding data in sessionStorage for after auth
      sessionStorage.setItem('pendingOnboardingData', JSON.stringify(formData));
      navigate('/auth?tab=signup');
    } else {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (step === 8 && visionBoardPage > 0) {
      setVisionBoardPage(prev => prev - 1);
    } else if (step > 0) {
      setStep(prev => prev - 1);
    }
  };

  const isNextDisabled = () => {
    switch (step) {
      case 0: return formData.perfectGoal.length === 0 && !formData.customGoal?.trim();
      case 1: return !formData.gender;
      case 2: return !formData.age || formData.age < 10;
      case 3: return !formData.height || formData.height < 100;
      case 4: return !formData.weight || formData.weight < 30;
      case 5: return !formData.goalWeight || formData.goalWeight < 30;
      case 6: return !formData.activityLevel;
      case 7: return false;
      case 8: return false; // Always allow navigation on vision board pages
      default: return false;
    }
  };

  return (
    <div className="h-screen gradient-bg relative overflow-hidden">
      {/* Language selector at top right */}
      <div className="absolute top-4 right-4 z-50">
        <OnboardingLanguageSelector />
      </div>
      <div className="max-w-[600px] mx-auto relative z-10 p-4 h-screen flex items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.4, type: "spring", stiffness: 100 }}
            className="w-full"
          >
            <div className="w-full">
              {/* Minimalist header */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  {step === 0 ? t('common:onboardingQuiz.steps.goal.title') :
                   step === 1 ? t('common:onboardingQuiz.steps.gender.title') :
                   step === 2 ? t('common:onboardingQuiz.steps.age.title') :
                   step === 3 ? t('common:onboardingQuiz.steps.height.title') :
                   step === 4 ? t('common:onboardingQuiz.steps.weight.title') :
                   step === 5 ? t('common:onboardingQuiz.steps.goalWeight.title') :
                   step === 6 ? t('common:onboardingQuiz.steps.activityLevel.title') :
                   step === 7 ? t('common:onboardingQuiz.steps.profilePicture.title') :
                   step === 8 ? t('common:onboardingQuiz.steps.visionBoard.title') : t('common:onboardingQuiz.steps.completion.title')}
                </h2>
                <p className="text-gray-600 text-sm">
                  {step === 0 ? t('common:onboardingQuiz.steps.goal.subtitle') :
                   step === 1 ? t('common:onboardingQuiz.steps.gender.subtitle') :
                   step === 2 ? t('common:onboardingQuiz.steps.age.subtitle') :
                   step === 3 ? t('common:onboardingQuiz.steps.height.subtitle') :
                   step === 4 ? t('common:onboardingQuiz.steps.weight.subtitle') :
                   step === 5 ? t('common:onboardingQuiz.steps.goalWeight.subtitle') :
                   step === 6 ? t('common:onboardingQuiz.steps.activityLevel.subtitle') :
                   step === 7 ? t('common:onboardingQuiz.steps.profilePicture.subtitle') :
                   step === 8 ? t('common:onboardingQuiz.steps.visionBoard.subtitle') : t('common:onboardingQuiz.steps.completion.subtitle')}
                </p>
              </div>

              {/* Content area */}
              <div className="">
                {/* Step 0: Perfect Goal - Updated Design System */}
                {step === 0 && (
                  <div className="space-y-4">
                    {[
                      { value: 'weight_loss', label: t('common:onboardingQuiz.steps.goal.options.weightLoss.label'), desc: t('common:onboardingQuiz.steps.goal.options.weightLoss.desc') },
                      { value: 'muscle_gain', label: t('common:onboardingQuiz.steps.goal.options.muscleGain.label'), desc: t('common:onboardingQuiz.steps.goal.options.muscleGain.desc') },
                      { value: 'health_improve', label: t('common:onboardingQuiz.steps.goal.options.healthImprove.label'), desc: t('common:onboardingQuiz.steps.goal.options.healthImprove.desc') },
                      { value: 'other', label: t('common:onboardingQuiz.steps.goal.options.other.label'), desc: t('common:onboardingQuiz.steps.goal.options.other.desc') }
                    ].map((goal) => (
                      <motion.div
                        key={goal.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`backdrop-blur-sm rounded-xl p-5 cursor-pointer transition-all duration-200 ${
                          formData.perfectGoal.length === 1 && formData.perfectGoal[0] === goal.value
                            ? 'bg-gradient-to-r from-[#0CC5BA]/10 to-[#26A8FF]/10 border-2 border-[#26A8FF] shadow-lg' 
                            : 'bg-white/95 border-2 border-gray-200 hover:border-[#26A8FF]/50 hover:shadow-md'
                        }`}
                        onClick={() => {
                          setFormData(prev => ({ 
                            ...prev, 
                            perfectGoal: [goal.value as any],
                            customGoal: goal.value === 'other' ? prev.customGoal : ''
                          }));
                        }}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                            formData.perfectGoal.length === 1 && formData.perfectGoal[0] === goal.value
                              ? 'bg-[#26A8FF] border-[#26A8FF]' 
                              : 'border-gray-300 bg-white'
                          }`}>
                            {formData.perfectGoal.length === 1 && formData.perfectGoal[0] === goal.value && (
                              <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-2.5 h-2.5 bg-white rounded-full"
                              />
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className={`text-lg font-semibold mb-1 ${
                              formData.perfectGoal.length === 1 && formData.perfectGoal[0] === goal.value
                                ? 'text-gray-900' 
                                : 'text-gray-900'
                            }`}>{goal.label}</h3>
                            <p className="text-sm text-gray-600">{goal.desc}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    
                    {/* Custom goal input */}
                    {formData.perfectGoal.length === 1 && formData.perfectGoal[0] === 'other' && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-4"
                      >
                        <div className="bg-white/95 backdrop-blur-sm rounded-xl p-5 shadow-md border border-gray-200">
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            {t('common:onboardingQuiz.steps.goal.customGoalLabel')}
                          </label>
                          <input
                            type="text"
                            placeholder={t('common:onboardingQuiz.steps.goal.customGoalPlaceholder')}
                            value={formData.customGoal || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, customGoal: e.target.value }))}
                            className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:border-[#26A8FF] focus:ring-2 focus:ring-[#26A8FF]/20 focus:outline-none transition-all placeholder:text-gray-400"
                            autoFocus
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Step 1: Gender - Modern Card Design */}
                {step === 1 && (
                  <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
                    {[
                      { 
                        value: 'male', 
                        label: t('common:onboardingQuiz.steps.gender.male'),
                        icon: (
                          <svg viewBox="0 0 32 32" fill="none" className="w-12 h-12">
                            <circle cx="13" cy="16" r="7" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                            <line x1="18" y1="11" x2="26" y2="3" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                            <line x1="26" y1="3" x2="26" y2="9" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                            <line x1="26" y1="3" x2="20" y2="3" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                          </svg>
                        )
                      },
                      { 
                        value: 'female', 
                        label: t('common:onboardingQuiz.steps.gender.female'),
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12">
                            <circle cx="12" cy="8" r="5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                            <path d="M12 13v8M9 18h6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )
                      }
                    ].map((gender) => (
                      <motion.button
                        key={gender.value}
                        type="button"
                        whileHover={{ y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        className={`relative rounded-2xl p-8 transition-all duration-300 group ${
                          formData.gender === gender.value 
                            ? 'bg-gradient-to-br from-[#0CC5BA] to-[#26A8FF] shadow-2xl shadow-[#26A8FF]/30' 
                            : 'bg-white/95 backdrop-blur-sm shadow-lg hover:shadow-xl border border-gray-200'
                        }`}
                        onClick={() => setFormData(prev => ({ ...prev, gender: gender.value as any }))}
                      >
                        {/* Icon */}
                        <div className={`flex justify-center mb-4 transition-all duration-300 ${
                          formData.gender === gender.value 
                            ? 'text-white scale-110' 
                            : 'text-[#26A8FF] group-hover:scale-110'
                        }`}>
                          {gender.icon}
                        </div>
                        
                        {/* Label */}
                        <div className={`text-lg font-semibold text-center transition-colors ${
                          formData.gender === gender.value 
                            ? 'text-white' 
                            : 'text-gray-900'
                        }`}>
                          {gender.label}
                        </div>
                        
                        {/* Selected Indicator */}
                        {formData.gender === gender.value && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-3 right-3 w-6 h-6 bg-white rounded-full flex items-center justify-center"
                          >
                            <svg className="w-4 h-4 text-[#26A8FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </motion.div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                )}

                {/* Step 2: Age - Modern Clean Design */}
                {step === 2 && (
                  <div className="space-y-6">
                    {/* Age Display */}
                    <div className="flex justify-center">
                      <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-12 py-8 shadow-lg border border-gray-200">
                        <div className="text-7xl font-bold bg-gradient-to-r from-[#0CC5BA] to-[#26A8FF] bg-clip-text text-transparent text-center">
                          {formData.age || 25}
                        </div>
                        <p className="text-gray-600 font-medium text-center mt-2">years old</p>
                      </div>
                    </div>
                    
                    {/* Slider Card */}
                    <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-gray-200">
                      <input
                        type="range"
                        min="13"
                        max="80"
                        value={formData.age || 25}
                        onChange={(e) => setFormData(prev => ({ ...prev, age: parseInt(e.target.value) }))}
                        className="w-full h-2 bg-gray-200 rounded-full outline-none cursor-pointer appearance-none slider-age"
                      />
                      <style>{`
                        .slider-age::-webkit-slider-thumb {
                          appearance: none;
                          width: 24px;
                          height: 24px;
                          background: linear-gradient(135deg, #0CC5BA 0%, #26A8FF 100%);
                          border: 3px solid white;
                          border-radius: 50%;
                          cursor: pointer;
                          box-shadow: 0 4px 12px rgba(38, 168, 255, 0.4);
                          transition: all 0.2s ease;
                        }
                        .slider-age::-webkit-slider-thumb:hover {
                          transform: scale(1.15);
                          box-shadow: 0 6px 16px rgba(38, 168, 255, 0.5);
                        }
                        .slider-age::-moz-range-thumb {
                          width: 24px;
                          height: 24px;
                          background: linear-gradient(135deg, #0CC5BA 0%, #26A8FF 100%);
                          border: 3px solid white;
                          border-radius: 50%;
                          cursor: pointer;
                          box-shadow: 0 4px 12px rgba(38, 168, 255, 0.4);
                          transition: all 0.2s ease;
                        }
                        .slider-age::-moz-range-thumb:hover {
                          transform: scale(1.15);
                          box-shadow: 0 6px 16px rgba(38, 168, 255, 0.5);
                        }
                      `}</style>
                      
                      {/* Min/Max Labels */}
                      <div className="flex justify-between mt-4 text-sm text-gray-500 font-medium">
                        <span>13</span>
                        <span>80</span>
                      </div>
                    </div>
                    
                    {/* Quick Select Buttons */}
                    <div className="grid grid-cols-4 gap-3">
                      {[18, 25, 35, 45].map((age) => (
                        <motion.button
                          key={age}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setFormData(prev => ({ ...prev, age }))}
                          className={`py-3 px-4 rounded-xl border-2 transition-all duration-200 font-semibold ${
                            formData.age === age
                              ? 'bg-gradient-to-r from-[#0CC5BA] to-[#26A8FF] text-white border-transparent shadow-lg'
                              : 'bg-white/95 backdrop-blur-sm border-gray-200 text-gray-700 hover:border-[#26A8FF]/50 hover:shadow-md'
                          }`}
                        >
                          {age}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 3: Height - Modern Ruler Design */}
                {step === 3 && (
                  <div className="space-y-6">
                    {/* Height Display */}
                    <div className="flex justify-center">
                      <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-12 py-8 shadow-lg border border-gray-200">
                        <div className="text-7xl font-bold bg-gradient-to-r from-[#0CC5BA] to-[#26A8FF] bg-clip-text text-transparent text-center">
                          {formData.height || 170}
                        </div>
                        <p className="text-gray-600 font-medium text-center mt-2">cm</p>
                      </div>
                    </div>
                    
                    {/* Ruler Card */}
                    <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200">
                      <div className="relative">
                        {/* Center Indicator Arrow */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                          <div className="w-1 h-16 bg-gradient-to-b from-[#0CC5BA] to-[#26A8FF] shadow-lg"></div>
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-[#0CC5BA]"></div>
                        </div>
                        
                        {/* Ruler Container */}
                        <div 
                          className="relative overflow-x-auto no-scrollbar rounded-xl bg-gradient-to-b from-gray-50 to-white p-4 border border-gray-200"
                          ref={(scrollContainer) => {
                            if (!scrollContainer) return;
                            heightScrollRef.current = scrollContainer;
                            if (!scrollContainer.dataset.initialized) {
                              scrollContainer.dataset.initialized = 'true';
                              const pixelsPerCm = 10;
                              const CAL = -4;

                              const init = () => {
                                const targetHeight = formData.height || 170;
                                const scrollPosition = (targetHeight - 100) * pixelsPerCm - CAL;
                                scrollContainer.scrollLeft = scrollPosition;
                              };
                              setTimeout(init, 0);

                              let isDown = false;
                              let startX = 0;
                              let startScrollLeft = 0;

                              scrollContainer.addEventListener('mousedown', (e) => {
                                isDown = true;
                                scrollContainer.style.cursor = 'grabbing';
                                startX = e.pageX - scrollContainer.offsetLeft;
                                startScrollLeft = scrollContainer.scrollLeft;
                                e.preventDefault();
                              });

                              scrollContainer.addEventListener('mouseleave', () => {
                                isDown = false;
                                scrollContainer.style.cursor = 'grab';
                              });

                              scrollContainer.addEventListener('mouseup', () => {
                                isDown = false;
                                scrollContainer.style.cursor = 'grab';
                              });

                              scrollContainer.addEventListener('mousemove', (e) => {
                                if (!isDown) return;
                                e.preventDefault();
                                const x = e.pageX - scrollContainer.offsetLeft;
                                const walk = (x - startX) * 1.5;
                                scrollContainer.scrollLeft = startScrollLeft - walk;
                              });

                              let touchStartX = 0;
                              let touchScrollLeft = 0;

                              scrollContainer.addEventListener('touchstart', (e) => {
                                touchStartX = e.touches[0].pageX - scrollContainer.offsetLeft;
                                touchScrollLeft = scrollContainer.scrollLeft;
                              });

                              scrollContainer.addEventListener('touchmove', (e) => {
                                const x = e.touches[0].pageX - scrollContainer.offsetLeft;
                                const walk = (x - touchStartX) * 1.5;
                                scrollContainer.scrollLeft = touchScrollLeft - walk;
                              });

                              let scrollTicking = false;
                              scrollContainer.addEventListener('scroll', () => {
                                if (!scrollTicking) {
                                  requestAnimationFrame(() => {
                                    const scrollLeft = scrollContainer.scrollLeft;
                                    const height = Math.round(100 + (scrollLeft + CAL) / pixelsPerCm);
                                    const clampedHeight = Math.max(100, Math.min(250, height));
                                    setFormData(prev => ({ ...prev, height: clampedHeight }));
                                    scrollTicking = false;
                                  });
                                  scrollTicking = true;
                                }
                              });
                            }
                          }}
                          style={{ cursor: 'grab' }}
                        >
                          <div 
                            className="flex items-end h-16 select-none"
                            style={{ width: '1510px', paddingLeft: '50%', paddingRight: '50%' }}
                          >
                            {/* Ruler Marks */}
                            {Array.from({ length: 151 }, (_, i) => i + 100).map((cm) => (
                              <div key={cm} className="flex flex-col items-center" style={{ minWidth: '10px' }}>
                                {cm % 10 === 0 ? (
                                  <>
                                    <div className="w-0.5 h-12 bg-[#26A8FF]"></div>
                                    <span className="text-xs text-gray-900 mt-1 font-bold">{cm}</span>
                                  </>
                                ) : cm % 5 === 0 ? (
                                  <>
                                    <div className="w-0.5 h-8 bg-[#0CC5BA]/60"></div>
                                    <span className="text-[10px] text-gray-600 mt-1">{cm}</span>
                                  </>
                                ) : (
                                  <div className="w-0.5 h-4 bg-gray-400"></div>
                                )}
                              </div>
                            ))}
                          </div>
                          
                          <style>{`
                            .no-scrollbar::-webkit-scrollbar {
                              display: none;
                            }
                            .no-scrollbar {
                              -ms-overflow-style: none;
                              scrollbar-width: none;
                            }
                          `}</style>
                        </div>
                      </div>
                    </div>
                    
                    {/* Quick Select Buttons */}
                    <div className="grid grid-cols-4 gap-3">
                      {[150, 165, 175, 185].map((height) => (
                        <motion.button
                          key={height}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, height }));
                            const scroller = heightScrollRef.current;
                            if (scroller) {
                              const pixelsPerCm = 10;
                              const CAL = -4;
                              const scrollPosition = (height - 100) * pixelsPerCm - CAL;
                              scroller.scrollTo({ left: scrollPosition, behavior: 'smooth' });
                            }
                          }}
                          className={`py-3 px-4 rounded-xl border-2 transition-all duration-200 font-semibold ${
                            formData.height === height
                              ? 'bg-gradient-to-r from-[#0CC5BA] to-[#26A8FF] text-white border-transparent shadow-lg'
                              : 'bg-white/95 backdrop-blur-sm border-gray-200 text-gray-700 hover:border-[#26A8FF]/50 hover:shadow-md'
                          }`}
                        >
                          {height}
                          <span className="text-xs ml-1 opacity-80">cm</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 4: Current Weight - Scale Style */}
                {step === 4 && (
                  <div className="space-y-6">
                    {/* Weight Display */}
                    <div className="flex justify-center">
                      <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-12 py-8 shadow-lg border border-gray-200">
                        <div className="text-7xl font-bold bg-gradient-to-r from-[#0CC5BA] to-[#26A8FF] bg-clip-text text-transparent text-center">
                          {formData.weight || 70}
                        </div>
                        <p className="text-gray-600 font-medium text-center mt-2">kg</p>
                      </div>
                    </div>
                    
                    {/* Scale Card */}
                    <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200">
                      <div className="relative">
                        {/* Center Indicator Arrow */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                          <div className="w-1 h-16 bg-gradient-to-b from-[#0CC5BA] to-[#26A8FF] shadow-lg"></div>
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-[#0CC5BA]"></div>
                        </div>
                        
                        {/* Scale Container */}
                        <div 
                          className="relative overflow-x-auto no-scrollbar rounded-xl bg-gradient-to-b from-gray-50 to-white p-4 border border-gray-200"
                          ref={(scrollContainer) => {
                            if (!scrollContainer) return;
                            weightScrollRef.current = scrollContainer;
                            if (!scrollContainer.dataset.initialized) {
                              scrollContainer.dataset.initialized = 'true';
                              const CAL = weightCALRef.current;

                              const targetWeight = formData.weight || 70;
                              const scrollPosition = (targetWeight - 30) * 20 - CAL;
                              setTimeout(() => {
                                scrollContainer.scrollLeft = scrollPosition;
                              }, 0);
                              
                              let isDown = false;
                              let startX = 0;
                              let scrollLeft = 0;
                              
                              scrollContainer.addEventListener('mousedown', (e) => {
                                isDown = true;
                                scrollContainer.style.cursor = 'grabbing';
                                startX = e.pageX - scrollContainer.offsetLeft;
                                scrollLeft = scrollContainer.scrollLeft;
                                e.preventDefault();
                              });
                              
                              scrollContainer.addEventListener('mouseleave', () => {
                                isDown = false;
                                scrollContainer.style.cursor = 'grab';
                              });
                              
                              scrollContainer.addEventListener('mouseup', () => {
                                isDown = false;
                                scrollContainer.style.cursor = 'grab';
                              });
                              
                              scrollContainer.addEventListener('mousemove', (e) => {
                                if (!isDown) return;
                                e.preventDefault();
                                const x = e.pageX - scrollContainer.offsetLeft;
                                const walk = (x - startX) * 1.5;
                                scrollContainer.scrollLeft = scrollLeft - walk;
                              });
                              
                              let touchStartX = 0;
                              let touchScrollLeft = 0;
                              
                              scrollContainer.addEventListener('touchstart', (e) => {
                                touchStartX = e.touches[0].pageX - scrollContainer.offsetLeft;
                                touchScrollLeft = scrollContainer.scrollLeft;
                              });
                              
                              scrollContainer.addEventListener('touchmove', (e) => {
                                const x = e.touches[0].pageX - scrollContainer.offsetLeft;
                                const walk = (x - touchStartX) * 1.5;
                                scrollContainer.scrollLeft = touchScrollLeft - walk;
                              });
                              
                              let weightScrollTicking = false;
                              scrollContainer.addEventListener('scroll', () => {
                                if (!weightScrollTicking) {
                                  requestAnimationFrame(() => {
                                    const scrollLeft = scrollContainer.scrollLeft;
                                    const pixelsPerKg = 20;
                                    const weight = Math.round(30 + (scrollLeft + weightCALRef.current) / pixelsPerKg);
                                    const clampedWeight = Math.max(30, Math.min(200, weight));
                                    setFormData(prev => ({ ...prev, weight: clampedWeight }));
                                    weightScrollTicking = false;
                                  });
                                  weightScrollTicking = true;
                                }
                              });
                            }
                          }}
                          style={{ cursor: 'grab' }}
                        >
                          <div 
                            className="flex items-end h-16 select-none"
                            style={{ width: '3400px', paddingLeft: '50%', paddingRight: '50%' }}
                          >
                            {/* Scale Marks */}
                            {Array.from({ length: 171 }, (_, i) => i + 30).map((kg) => (
                              <div key={kg} className="flex flex-col items-center justify-end" style={{ minWidth: '20px' }}>
                                {kg % 10 === 0 ? (
                                  <>
                                    <div className="w-0.5 h-12 bg-[#26A8FF]"></div>
                                    <span className="text-xs text-gray-900 mt-1 font-bold">{kg}</span>
                                  </>
                                ) : kg % 5 === 0 ? (
                                  <>
                                    <div className="w-0.5 h-8 bg-[#0CC5BA]/60"></div>
                                    <span className="text-[10px] text-gray-600 mt-1">{kg}</span>
                                  </>
                                ) : (
                                  <div className="w-0.5 h-4 bg-gray-400"></div>
                                )}
                              </div>
                            ))}
                          </div>
                          
                          <style>{`
                            .no-scrollbar::-webkit-scrollbar {
                              display: none;
                            }
                            .no-scrollbar {
                              -ms-overflow-style: none;
                              scrollbar-width: none;
                            }
                          `}</style>
                        </div>
                      </div>
                    </div>
                    
                    {/* Quick Select Buttons */}
                    <div className="grid grid-cols-4 gap-3">
                      {[50, 60, 70, 80].map((weight) => (
                        <motion.button
                          key={weight}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, weight }));
                            const scroller = weightScrollRef.current;
                            if (scroller) {
                              const pixelsPerKg = 20;
                              const CAL = weightCALRef.current;
                              const scrollPosition = (weight - 30) * pixelsPerKg - CAL;
                              scroller.scrollTo({ left: scrollPosition, behavior: 'smooth' });
                            }
                          }}
                          className={`py-3 px-4 rounded-xl border-2 transition-all duration-200 font-semibold ${
                            formData.weight === weight
                              ? 'bg-gradient-to-r from-[#0CC5BA] to-[#26A8FF] text-white border-transparent shadow-lg'
                              : 'bg-white/95 backdrop-blur-sm border-gray-200 text-gray-700 hover:border-[#26A8FF]/50 hover:shadow-md'
                          }`}
                        >
                          {weight}
                          <span className="text-xs ml-1 opacity-80">kg</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 5: Goal Weight - Scale Style */}
                {step === 5 && (
                  <div className="space-y-6">
                    {/* Goal Weight Display */}
                    <div className="flex justify-center">
                      <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-12 py-8 shadow-lg border border-gray-200 relative">
                        <div className="text-7xl font-bold bg-gradient-to-r from-[#0CC5BA] to-[#26A8FF] bg-clip-text text-transparent text-center">
                          {formData.goalWeight || 65}
                        </div>
                        <p className="text-gray-600 font-medium text-center mt-2">kg</p>
                        {/* Target icon */}
                        <div className="absolute -top-3 -right-3 w-10 h-10 bg-gradient-to-br from-[#0CC5BA] to-[#26A8FF] rounded-full flex items-center justify-center shadow-lg">
                          <Target className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Scale Card */}
                    <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200">
                      <div className="relative">
                        {/* Center Indicator Arrow */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                          <div className="w-1 h-16 bg-gradient-to-b from-[#0CC5BA] to-[#26A8FF] shadow-lg"></div>
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-[#0CC5BA]"></div>
                        </div>
                        
                        {/* Scale Container */}
                        <div 
                          className="relative overflow-x-auto no-scrollbar rounded-xl bg-gradient-to-b from-gray-50 to-white p-4 border border-gray-200"
                          ref={(scrollContainer) => {
                            if (!scrollContainer) return;
                            goalWeightScrollRef.current = scrollContainer;
                            if (!scrollContainer.dataset.initialized) {
                              scrollContainer.dataset.initialized = 'true';
                              const CAL = goalWeightCALRef.current;

                              const targetGoalWeight = formData.goalWeight || 65;
                              const scrollPosition = (targetGoalWeight - 30) * 20 - CAL;
                              setTimeout(() => {
                                scrollContainer.scrollLeft = scrollPosition;
                              }, 0);
                              
                              let isDown = false;
                              let startX = 0;
                              let scrollLeft = 0;
                              
                              scrollContainer.addEventListener('mousedown', (e) => {
                                isDown = true;
                                scrollContainer.style.cursor = 'grabbing';
                                startX = e.pageX - scrollContainer.offsetLeft;
                                scrollLeft = scrollContainer.scrollLeft;
                                e.preventDefault();
                              });
                              
                              scrollContainer.addEventListener('mouseleave', () => {
                                isDown = false;
                                scrollContainer.style.cursor = 'grab';
                              });
                              
                              scrollContainer.addEventListener('mouseup', () => {
                                isDown = false;
                                scrollContainer.style.cursor = 'grab';
                              });
                              
                              scrollContainer.addEventListener('mousemove', (e) => {
                                if (!isDown) return;
                                e.preventDefault();
                                const x = e.pageX - scrollContainer.offsetLeft;
                                const walk = (x - startX) * 1.5;
                                scrollContainer.scrollLeft = scrollLeft - walk;
                              });
                              
                              let touchStartX = 0;
                              let touchScrollLeft = 0;
                              
                              scrollContainer.addEventListener('touchstart', (e) => {
                                touchStartX = e.touches[0].pageX - scrollContainer.offsetLeft;
                                touchScrollLeft = scrollContainer.scrollLeft;
                              });
                              
                              scrollContainer.addEventListener('touchmove', (e) => {
                                const x = e.touches[0].pageX - scrollContainer.offsetLeft;
                                const walk = (x - touchStartX) * 1.5;
                                scrollContainer.scrollLeft = touchScrollLeft - walk;
                              });
                              
                              let goalWeightScrollTicking = false;
                              scrollContainer.addEventListener('scroll', () => {
                                if (!goalWeightScrollTicking) {
                                  requestAnimationFrame(() => {
                                    const scrollLeft = scrollContainer.scrollLeft;
                                    const pixelsPerKg = 20;
                                    const goalWeight = Math.round(30 + (scrollLeft + goalWeightCALRef.current) / pixelsPerKg);
                                    const clampedGoalWeight = Math.max(30, Math.min(200, goalWeight));
                                    setFormData(prev => ({ ...prev, goalWeight: clampedGoalWeight }));
                                    goalWeightScrollTicking = false;
                                  });
                                  goalWeightScrollTicking = true;
                                }
                              });
                            }
                          }}
                          style={{ cursor: 'grab' }}
                        >
                          <div 
                            className="flex items-end h-16 select-none"
                            style={{ width: '3400px', paddingLeft: '50%', paddingRight: '50%' }}
                          >
                            {/* Scale Marks */}
                            {Array.from({ length: 171 }, (_, i) => i + 30).map((kg) => (
                              <div key={kg} className="flex flex-col items-center justify-end" style={{ minWidth: '20px' }}>
                                {kg % 10 === 0 ? (
                                  <>
                                    <div className="w-0.5 h-12 bg-[#26A8FF]"></div>
                                    <span className="text-xs text-gray-900 mt-1 font-bold">{kg}</span>
                                  </>
                                ) : kg % 5 === 0 ? (
                                  <>
                                    <div className="w-0.5 h-8 bg-[#0CC5BA]/60"></div>
                                    <span className="text-[10px] text-gray-600 mt-1">{kg}</span>
                                  </>
                                ) : (
                                  <div className="w-0.5 h-4 bg-gray-400"></div>
                                )}
                              </div>
                            ))}
                          </div>
                          
                          <style>{`
                            .no-scrollbar::-webkit-scrollbar {
                              display: none;
                            }
                            .no-scrollbar {
                              -ms-overflow-style: none;
                              scrollbar-width: none;
                            }
                          `}</style>
                        </div>
                      </div>
                    </div>
                    
                    {/* Quick Select Buttons */}
                    <div className="grid grid-cols-4 gap-3">
                      {[55, 65, 75, 85].map((goalWeight) => (
                        <motion.button
                          key={goalWeight}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, goalWeight }));
                            const scroller = goalWeightScrollRef.current;
                            if (scroller) {
                              const pixelsPerKg = 20;
                              const CAL = goalWeightCALRef.current;
                              const scrollPosition = (goalWeight - 30) * pixelsPerKg - CAL;
                              scroller.scrollTo({ left: scrollPosition, behavior: 'smooth' });
                            }
                          }}
                          className={`py-3 px-4 rounded-xl border-2 transition-all duration-200 font-semibold ${
                            formData.goalWeight === goalWeight
                              ? 'bg-gradient-to-r from-[#0CC5BA] to-[#26A8FF] text-white border-transparent shadow-lg'
                              : 'bg-white/95 backdrop-blur-sm border-gray-200 text-gray-700 hover:border-[#26A8FF]/50 hover:shadow-md'
                          }`}
                        >
                          {goalWeight}
                          <span className="text-xs ml-1 opacity-80">kg</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Step 6: Activity Level - Interactive Slider */}
                {step === 6 && (
                  <div className="space-y-6">
                    {/* Activity Level Cards */}
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { value: 'sedentary', label: 'Low', days: '0-2 days/week' },
                        { value: 'moderate', label: 'Mid', days: '3-5 days/week' },
                        { value: 'active', label: 'High', days: '6-7 days/week' }
                      ].map((activity) => (
                        <motion.button
                          key={activity.value}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setFormData(prev => ({ ...prev, activityLevel: activity.value }))}
                          className={`bg-white/95 backdrop-blur-sm rounded-xl border-2 transition-all duration-200 p-4 relative overflow-hidden ${
                            formData.activityLevel === activity.value
                              ? 'border-transparent shadow-lg'
                              : 'border-gray-200 hover:border-[#26A8FF]/50 hover:shadow-md'
                          }`}
                        >
                          {/* Gradient background for selected */}
                          {formData.activityLevel === activity.value && (
                            <div className="absolute inset-0 bg-gradient-to-b from-[#0CC5BA] to-[#26A8FF] -z-10"></div>
                          )}
                          
                          <div className={`transition-colors ${
                            formData.activityLevel === activity.value ? 'text-white' : 'text-gray-700'
                          }`}>
                            <div className="font-bold" style={{ fontSize: '0.875rem' }}>{activity.label}</div>
                            <div className={`mt-1 leading-tight ${
                              formData.activityLevel === activity.value ? 'text-white/90' : 'text-gray-600'
                            }`} style={{ fontSize: '0.625rem' }}>
                              {activity.days}
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                    
                    {/* Calorie Multiplier Display */}
                    <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-semibold text-gray-700">Daily Calorie Boost</h3>
                        <div className="bg-gradient-to-r from-[#0CC5BA] to-[#26A8FF] rounded-full px-3 py-1.5">
                          <span className="text-lg font-bold text-white">
                            {(() => {
                              const multipliers = {
                                sedentary: '+20%',
                                moderate: '+55%',
                                active: '+72%'
                              };
                              return multipliers[formData.activityLevel as keyof typeof multipliers] || '+55%';
                            })()}
                          </span>
                        </div>
                      </div>
                      
                      {/* Visual Progress Bar */}
                      <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden mb-3">
                        <div 
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#0CC5BA] to-[#26A8FF] rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: (() => {
                              const widths = {
                                sedentary: '33%',
                                moderate: '66%',
                                active: '100%'
                              };
                              return widths[formData.activityLevel as keyof typeof widths] || '66%';
                            })()
                          }}
                        >
                          <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                        </div>
                      </div>
                      
                      {/* Example Calorie Calculation */}
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600">Base: ~2000 kcal</span>
                        <span className="font-semibold bg-gradient-to-r from-[#0CC5BA] to-[#26A8FF] bg-clip-text text-transparent">
                          Total: ~{(() => {
                            const totals = {
                              sedentary: '2400',
                              moderate: '3100',
                              active: '3450'
                            };
                            return totals[formData.activityLevel as keyof typeof totals] || '3100';
                          })()} kcal/day
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 7: Profile Picture - Modern Design */}
                {step === 7 && (
                  <div className="space-y-6">
                    {/* Profile Picture Container */}
                    <div className="flex justify-center">
                      <div className="relative">
                        {/* Main Picture Circle */}
                        <div className="h-48 w-48 relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-[#0CC5BA] to-[#26A8FF] rounded-full p-1">
                            <div className="h-full w-full bg-white rounded-full flex items-center justify-center overflow-hidden">
                              {profileImagePreview ? (
                                <img 
                                  src={profileImagePreview} 
                                  alt="Profile" 
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <div className="flex flex-col items-center text-gray-400">
                                  <User className="w-20 h-20 mb-2" />
                                  <span className="text-xs">No photo</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Camera Badge */}
                          <div className="absolute -bottom-2 -right-2 w-14 h-14 bg-gradient-to-br from-[#0CC5BA] to-[#26A8FF] rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                            <Camera className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Upload Button Card */}
                    <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Create preview URL for the image
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setProfileImagePreview(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                            
                            // Store the file in form data
                            setFormData(prev => ({ ...prev, profileImage: file }));
                          }
                        }}
                        className="hidden"
                        id="profile-image"
                      />
                      
                      <Label
                        htmlFor="profile-image"
                        className="flex items-center justify-center w-full px-6 py-4 bg-gradient-to-r from-[#0CC5BA] to-[#26A8FF] text-white rounded-xl hover:shadow-lg cursor-pointer transition-all duration-200 font-semibold"
                      >
                        <Camera className="w-5 h-5 mr-2" />
                        <span>{formData.profileImage ? 'Change Photo' : 'Choose Photo'}</span>
                      </Label>
                      
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-4 text-center"
                      >
                        <p className="text-sm text-gray-600">
                          {formData.profileImage ? (
                            <span className="text-[#0CC5BA] font-medium">✓ Photo selected</span>
                          ) : (
                            'Optional - you can skip this step'
                          )}
                        </p>
                      </motion.div>
                    </div>
                    
                    {/* Benefits Grid */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { text: 'Personalized', desc: 'Experience' },
                        { text: 'Stay', desc: 'Motivated' },
                        { text: 'Track', desc: 'Progress' }
                      ].map((benefit, index) => (
                        <motion.div 
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="bg-white/95 backdrop-blur-sm rounded-xl p-4 border border-gray-200 text-center"
                        >
                          <div className="text-xs font-semibold text-gray-700">{benefit.text}</div>
                          <div className="text-xs text-gray-600">{benefit.desc}</div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 8: Vision Board - Modern Design */}
                {step === 8 && (
                  <div className="space-y-6">
                    {/* Page Indicators */}
                    <div className="flex justify-center space-x-3">
                      {[1, 2].map((page) => (
                        <motion.div
                          key={page}
                          initial={{ scale: 0.8 }}
                          animate={{ scale: visionBoardPage >= page ? 1 : 0.8 }}
                          className={`w-10 h-2 rounded-full transition-all duration-300 ${
                            visionBoardPage >= page 
                              ? 'bg-gradient-to-r from-[#0CC5BA] to-[#26A8FF] shadow-lg' 
                              : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Page 1: Your Personalized Plan */}
                    {visionBoardPage === 1 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, type: "spring" }}
                        className="space-y-6"
                      >
                        {/* Calorie Goal Card */}
                        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200">
                          <div className="text-center mb-6">
                            <motion.div 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.2, type: "spring" }}
                              className="text-5xl font-bold bg-gradient-to-r from-[#0CC5BA] to-[#26A8FF] bg-clip-text text-transparent mb-2"
                            >
                              {calculateCalories(formData)}
                            </motion.div>
                            <p className="text-sm text-gray-600 font-medium">Daily Calories</p>
                          </div>

                          {/* Macro Distribution */}
                          <div className="grid grid-cols-3 gap-4">
                            {[
                              { 
                                label: 'Protein', 
                                value: Math.round(calculateCalories(formData) * 0.3 / 4),
                                color: 'from-blue-500 to-cyan-500'
                              },
                              { 
                                label: 'Carbs', 
                                value: Math.round(calculateCalories(formData) * 0.4 / 4),
                                color: 'from-amber-500 to-orange-500'
                              },
                              { 
                                label: 'Fats', 
                                value: Math.round(calculateCalories(formData) * 0.3 / 9),
                                color: 'from-purple-500 to-pink-500'
                              }
                            ].map((macro, index) => (
                              <motion.div
                                key={macro.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 + index * 0.1 }}
                                className="bg-gray-50 rounded-xl p-3 border border-gray-200"
                              >
                                <div className={`text-2xl font-bold bg-gradient-to-r ${macro.color} bg-clip-text text-transparent`}>
                                  {macro.value}g
                                </div>
                                <div className="text-xs text-gray-600 font-medium">{macro.label}</div>
                              </motion.div>
                            ))}
                          </div>
                        </div>

                        {/* Formula Explanation Dropdown */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6 }}
                        >
                          <button
                            onClick={() => setShowFormulaExplanation(!showFormulaExplanation)}
                            className="w-full flex items-center justify-between p-4 bg-white/95 backdrop-blur-sm rounded-xl hover:bg-gray-50 transition-colors border border-gray-200"
                          >
                            <div className="flex items-center gap-2">
                              <Info className="w-5 h-5 text-[#26A8FF]" />
                              <span className="font-semibold text-gray-900 text-sm">
                                How we calculated your daily needs
                              </span>
                            </div>
                            {showFormulaExplanation ? (
                              <ChevronUp className="w-5 h-5 text-gray-600" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-600" />
                            )}
                          </button>
                          
                          <AnimatePresence>
                            {showFormulaExplanation && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-2 p-6 bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg">
                                  <div className="space-y-4">
                                    {/* BMR Section */}
                                    <div>
                                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm">
                                        <div className="w-2 h-2 rounded-full bg-[#26A8FF]"></div>
                                        1. BMR (Basal Metabolic Rate)
                                      </h4>
                                      <p className="text-xs text-gray-600 mb-2">
                                        Using Mifflin-St Jeor equation (most widely used):
                                      </p>
                                      {(() => {
                                        const isMale = formData.gender === 'male';
                                        const age = formData.age;
                                        const weight = formData.weight;
                                        const height = formData.height;
                                        
                                        // Mifflin-St Jeor: BMR = (10 × weight) + (6.25 × height) - (5 × age) + s
                                        const baseCalories = 10 * weight + 6.25 * height - 5 * age;
                                        const bmr = isMale ? baseCalories + 5 : baseCalories - 161;
                                        
                                        return (
                                          <div className={`${isMale ? 'bg-blue-50' : 'bg-pink-50'} p-3 rounded-lg text-xs`}>
                                            <p className="font-mono text-[10px]">
                                              BMR = (10 × {weight}kg) + (6.25 × {height}cm) - (5 × {age}) {isMale ? '+ 5' : '- 161'}
                                            </p>
                                            <p className={`mt-2 font-semibold ${isMale ? 'text-blue-600' : 'text-pink-600'}`}>
                                              = {Math.round(bmr)} kcal/day
                                            </p>
                                          </div>
                                        );
                                      })()}
                                    </div>

                                    {/* TDEE Section */}
                                    <div>
                                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        2. TDEE (Total Daily Energy Expenditure)
                                      </h4>
                                      <p className="text-xs text-gray-600 mb-2">
                                        BMR × activity factor:
                                      </p>
                                      {(() => {
                                        const activityMultipliers: { [key: string]: number } = {
                                          sedentary: 1.2,
                                          light: 1.375,
                                          moderate: 1.55,
                                          active: 1.725,
                                          very_active: 1.9
                                        };
                                        const activityLabels: { [key: string]: string } = {
                                          sedentary: 'sedentary lifestyle',
                                          light: 'light activity',
                                          moderate: 'moderate activity',
                                          active: 'active lifestyle',
                                          very_active: 'very active'
                                        };
                                        
                                        const isMale = formData.gender === 'male';
                                        const age = formData.age;
                                        const weight = formData.weight;
                                        const height = formData.height;
                                        let bmr = 0;
                                        
                                        if (isMale) {
                                          if (age >= 18 && age <= 29) bmr = (15.057 * weight) + (1.004 * height) + 705;
                                          else if (age >= 30 && age <= 59) bmr = (11.472 * weight) + (8.73 * height) + 873;
                                          else if (age >= 60) bmr = (11.711 * weight) + (5.878 * height) + 587;
                                          else bmr = (15.057 * weight) + (1.004 * height) + 705;
                                        } else {
                                          if (age >= 18 && age <= 29) bmr = (14.818 * weight) + (4.65 * height) + 486;
                                          else if (age >= 30 && age <= 59) bmr = (8.126 * weight) + (8.45 * height) + 845;
                                          else if (age >= 60) bmr = (9.082 * weight) + (6.588 * height) + 658;
                                          else bmr = (14.818 * weight) + (4.65 * height) + 486;
                                        }
                                        
                                        const multiplier = activityMultipliers[formData.activityLevel] || 1.55;
                                        const tdee = Math.round(bmr * multiplier);
                                        
                                        return (
                                          <div className="bg-green-50 p-3 rounded-lg text-xs">
                                            <p className="font-mono text-[10px]">
                                              TDEE = {Math.round(bmr)} × {multiplier} ({activityLabels[formData.activityLevel] || 'moderate activity'})
                                            </p>
                                            <p className="mt-2 font-semibold text-green-600">= {tdee} kcal/day</p>
                                          </div>
                                        );
                                      })()}
                                    </div>

                                    {/* Goal Adjustment */}
                                    <div>
                                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm">
                                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                        3. Adjusted for Your Goal
                                      </h4>
                                      <div className="bg-orange-50 p-3 rounded-lg text-xs">
                                        {formData.weightGoal === 'loss' && (
                                          <>
                                            <p>Goal: <strong>Weight Loss</strong></p>
                                            <p className="font-mono text-[10px] mt-2">
                                              Daily calories = TDEE - 500 kcal
                                            </p>
                                            <p className="text-[10px] text-gray-600 mt-1">
                                              500 kcal deficit/day = ~0.5 kg loss per week
                                            </p>
                                          </>
                                        )}
                                        {formData.weightGoal === 'gain' && (
                                          <>
                                            <p>Goal: <strong>Weight Gain</strong></p>
                                            <p className="font-mono text-[10px] mt-2">
                                              Daily calories = TDEE + 300 kcal
                                            </p>
                                            <p className="text-[10px] text-gray-600 mt-1">
                                              300 kcal surplus/day for healthy mass gain
                                            </p>
                                          </>
                                        )}
                                        {formData.weightGoal === 'maintain' && (
                                          <>
                                            <p>Goal: <strong>Maintain Weight</strong></p>
                                            <p className="font-mono text-[10px] mt-2">
                                              Daily calories = TDEE
                                            </p>
                                            <p className="text-[10px] text-gray-600 mt-1">
                                              Energy balance for weight maintenance
                                            </p>
                                          </>
                                        )}
                                        <p className="mt-3 font-semibold text-orange-600">
                                          = {calculateCalories(formData)} kcal/day
                                        </p>
                                      </div>
                                    </div>

                                    {/* Source Reference */}
                                    <div className="pt-3 border-t border-gray-200">
                                      <p className="text-[10px] text-gray-500">
                                        <strong>Source:</strong> Mifflin-St Jeor Equation - American Dietetic Association (2005)
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>

                        {/* Visual Goal Progress Preview */}
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 }}
                          className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200"
                        >
                          {/* Goal Type Header */}
                          <div className="flex items-center justify-center gap-2 mb-4">
                            {formData.weightGoal === 'loss' && (
                              <>
                                <TrendingDown className="w-5 h-5 text-[#0CC5BA]" />
                                <span className="text-sm font-semibold text-gray-700">Weight Loss Journey</span>
                              </>
                            )}
                            {formData.weightGoal === 'gain' && (
                              <>
                                <TrendingUp className="w-5 h-5 text-[#26A8FF]" />
                                <span className="text-sm font-semibold text-gray-700">Weight Gain Journey</span>
                              </>
                            )}
                            {formData.weightGoal === 'maintain' && (
                              <>
                                <Minus className="w-5 h-5 text-purple-500" />
                                <span className="text-sm font-semibold text-gray-700">Weight Maintenance</span>
                              </>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm text-gray-600">Current</div>
                              <div className="text-xl font-bold text-gray-800">{formData.weight} kg</div>
                            </div>
                            <div className="flex-1 mx-6">
                              {/* Progress visualization based on goal type */}
                              {formData.weightGoal === 'loss' && (
                                <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: "100%" }}
                                    animate={{ width: "30%" }}
                                    transition={{ delay: 0.7, duration: 1.5 }}
                                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#0CC5BA] to-[#26A8FF] rounded-full"
                                  />
                                </div>
                              )}
                              {formData.weightGoal === 'gain' && (
                                <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: "30%" }}
                                    animate={{ width: "100%" }}
                                    transition={{ delay: 0.7, duration: 1.5 }}
                                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#26A8FF] to-[#0CC5BA] rounded-full"
                                  />
                                </div>
                              )}
                              {formData.weightGoal === 'maintain' && (
                                <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: "50%" }}
                                    animate={{ width: "50%" }}
                                    transition={{ delay: 0.7, duration: 1 }}
                                    className="absolute inset-y-0 left-1/4 bg-gradient-to-r from-purple-400 to-purple-500 rounded-full"
                                  />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="text-sm text-gray-600">Goal</div>
                              <div className={`text-xl font-bold bg-gradient-to-r ${formData.weightGoal === 'maintain' ? 'from-purple-500 to-purple-600' : 'from-[#0CC5BA] to-[#26A8FF]'} bg-clip-text text-transparent`}>{formData.goalWeight} kg</div>
                            </div>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}

                    {/* Page 2: Your Success Timeline */}
                    {visionBoardPage === 2 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, type: "spring" }}
                        className="space-y-6"
                      >
                        {(() => {
                          const timeline = calculateTimeline();
                          
                          return (
                            <>
                              {/* Timeline Visualization */}
                              {formData.weightGoal !== 'maintain' && (
                                <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200">
                                  <div className="flex items-center justify-center gap-2 mb-6">
                                    {formData.weightGoal === 'loss' ? (
                                      <TrendingDown className="w-5 h-5 text-[#0CC5BA]" />
                                    ) : (
                                      <TrendingUp className="w-5 h-5 text-[#26A8FF]" />
                                    )}
                                    <h3 className="text-lg font-semibold text-gray-700">
                                      {formData.weightGoal === 'loss' ? 'Your Weight Loss Timeline' : 'Your Weight Gain Timeline'}
                                    </h3>
                                  </div>
                                  
                                  {/* Time Display Cards */}
                                  <div className="grid grid-cols-3 gap-3 mb-6">
                                    {/* Weeks Card */}
                                    <motion.div 
                                      initial={{ opacity: 0, y: 20 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: 0.3 }}
                                      className="bg-gradient-to-br from-[#0CC5BA]/10 to-[#26A8FF]/10 rounded-2xl p-4 border border-gray-200"
                                    >
                                      <div className="flex items-center justify-center mb-2">
                                        <CalendarDays className="w-5 h-5 text-[#26A8FF]" />
                                      </div>
                                      <div className="text-center">
                                        <div className="text-2xl font-bold text-gray-800">
                                          {timeline.weeks}
                                        </div>
                                        <div className="text-xs text-gray-600 font-medium">weeks</div>
                                      </div>
                                    </motion.div>
                                    
                                    {/* OR Divider */}
                                    <motion.div 
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      transition={{ delay: 0.4 }}
                                      className="flex items-center justify-center"
                                    >
                                      <div className="text-xs text-gray-400 font-medium px-2 py-1 bg-gray-100 rounded-full">or</div>
                                    </motion.div>
                                    
                                    {/* Months Card */}
                                    <motion.div 
                                      initial={{ opacity: 0, y: 20 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: 0.5 }}
                                      className="bg-gradient-to-br from-[#0CC5BA]/10 to-[#26A8FF]/10 rounded-2xl p-4 border border-gray-200"
                                    >
                                      <div className="flex items-center justify-center mb-2">
                                        <Calendar className="w-5 h-5 text-[#0CC5BA]" />
                                      </div>
                                      <div className="text-center">
                                        <div className="text-2xl font-bold text-gray-800">
                                          {timeline.months}
                                        </div>
                                        <div className="text-xs text-gray-600 font-medium">months</div>
                                      </div>
                                    </motion.div>
                                  </div>

                                  {/* Progress Rate */}
                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.6 }}
                                    className={`rounded-xl p-4 border ${formData.weightGoal === 'loss' ? 'bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-200' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'}`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        {formData.weightGoal === 'loss' ? (
                                          <TrendingDown className="w-4 h-4 text-teal-600" />
                                        ) : (
                                          <TrendingUp className="w-4 h-4 text-blue-600" />
                                        )}
                                        <span className="text-sm text-gray-700 font-medium">
                                          {formData.weightGoal === 'loss' ? 'Weekly Weight Loss' : 'Weekly Weight Gain'}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className={`text-lg font-bold bg-gradient-to-r ${formData.weightGoal === 'loss' ? 'from-teal-600 to-cyan-600' : 'from-blue-600 to-indigo-600'} bg-clip-text text-transparent`}>
                                          {formData.weightGoal === 'loss' ? '-' : '+'}{Math.abs(timeline.weeklyProgress).toFixed(1)}
                                        </span>
                                        <span className="text-sm text-gray-600">kg/week</span>
                                      </div>
                                    </div>
                                    
                                    {/* Visual Progress Bar */}
                                    <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(Math.abs(timeline.weeklyProgress) * 100, 100)}%` }}
                                        transition={{ delay: 0.8, duration: 1 }}
                                        className={`h-full ${formData.weightGoal === 'loss' ? 'bg-gradient-to-r from-teal-500 to-cyan-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`}
                                      />
                                    </div>
                                  </motion.div>
                                </div>
                              )}

                              {/* Maintain Weight Timeline */}
                              {formData.weightGoal === 'maintain' && (
                                <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200">
                                  <div className="flex items-center justify-center gap-2 mb-6">
                                    <Minus className="w-5 h-5 text-purple-500" />
                                    <h3 className="text-lg font-semibold text-gray-700">Maintaining Your Weight</h3>
                                  </div>
                                  
                                  <div className="text-center space-y-4">
                                    <motion.div 
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      transition={{ delay: 0.3, type: "spring" }}
                                      className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 border-2 border-purple-300"
                                    >
                                      <span className="text-2xl font-bold text-purple-600">{formData.weight} kg</span>
                                    </motion.div>
                                    <p className="text-sm text-gray-600">
                                      Your goal is to maintain your current weight of <strong>{formData.weight} kg</strong>.
                                      We'll help you stay balanced with the right nutrition plan.
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Motivational Call to Action */}
                              <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                                className={`rounded-2xl p-6 shadow-lg text-center ${
                                  formData.weightGoal === 'loss' ? 'bg-gradient-to-br from-[#0CC5BA] to-teal-500' :
                                  formData.weightGoal === 'gain' ? 'bg-gradient-to-br from-[#26A8FF] to-blue-600' :
                                  'bg-gradient-to-br from-purple-500 to-indigo-500'
                                }`}
                              >
                                <h3 className="text-2xl font-bold text-white mb-2">
                                  {formData.weightGoal === 'loss' ? 'Ready to Lose Weight!' :
                                   formData.weightGoal === 'gain' ? 'Ready to Build Mass!' :
                                   'Ready to Stay Balanced!'}
                                </h3>
                                <p className="text-white/90 text-sm">
                                  {formData.weightGoal === 'loss' ? 'Your weight loss journey begins now' :
                                   formData.weightGoal === 'gain' ? 'Your muscle building journey begins now' :
                                   'Your balanced nutrition journey begins now'}
                                </p>
                              </motion.div>
                            </>
                          );
                        })()}
                      </motion.div>
                    )}

                    {/* Loading State - Removed, no longer needed */}
                  </div>
                )}
              </div>

              {/* Navigation buttons */}
              <div className="mt-12">
                <div className={`flex ${step === 0 ? 'justify-center' : 'justify-between'} items-center`}>
                  {step !== 0 && (
                    <Button
                      variant="ghost"
                      onClick={handleBack}
                      className="flex items-center text-gray-600 hover:text-gray-800 hover:bg-white/50 backdrop-blur-sm px-6 py-3 rounded-2xl transition-all duration-300"
                    >
                      <span className="mr-2 text-lg">←</span>
                      Back
                    </Button>
                  )}

                  <Button
                    onClick={handleNext}
                    disabled={isNextDisabled() || mutation.isPending}
                    className="backdrop-blur-xl bg-gradient-to-r from-[#0CC5BA] to-[#26A8FF] text-white px-8 py-4 rounded-2xl text-base font-semibold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 min-w-fit whitespace-nowrap border border-white/20 hover:from-[#0BB5AA] hover:to-[#1E96EE]"
                  >
                    {mutation.isPending ? (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Saving...
                      </div>
                    ) : (
                      step === 8 && visionBoardPage === 2 ? 'Start!' :
                      step === 8 && visionBoardPage > 0 ? 'Next' :
                      step === 8 && visionBoardPage === 0 ? 'Next' :
                      step === 7 ? 'Next' :
                      'Next'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}