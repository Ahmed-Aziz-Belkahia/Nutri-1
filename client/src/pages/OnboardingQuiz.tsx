import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Camera, Upload, User, Target, Heart, Zap, Clock, Star, CalendarDays, Calendar, TrendingDown } from 'lucide-react';

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
  height: 0,
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

  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9
  };

  let bmr;
  if (data.gender === 'male') {
    bmr = 88.362 + (13.397 * data.weight) + (4.799 * data.height) - (5.677 * data.age);
  } else {
    bmr = 447.593 + (9.247 * data.weight) + (3.098 * data.height) - (4.330 * data.age);
  }

  const tdee = bmr * (activityMultipliers[data.activityLevel as keyof typeof activityMultipliers] || 1.2);

  const goalAdjustments = {
    loss: -500,
    maintain: 0,
    gain: 500
  };

  return Math.round(tdee + (goalAdjustments[data.weightGoal as keyof typeof goalAdjustments] || 0));
};

export default function OnboardingQuiz() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<OnboardingData>(initialFormData);
  const [visionBoardPage, setVisionBoardPage] = useState(0);
  const [visionBoardData, setVisionBoardData] = useState<any>(null);
  const [isGeneratingVisionBoard, setIsGeneratingVisionBoard] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Simple translation function for English
  const t = (key: string) => {
    const translations: Record<string, string> = {
      'back': 'Back',
      'next': 'Next',
      'complete': 'Complete',
      'saving': 'Saving...'
    };
    return translations[key] || key;
  };

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

  const generateVisionBoard = async () => {
    // Use goals to generate motivation
    const description = formData.perfectGoal.length > 0 ? `I want to achieve: ${formData.perfectGoal.join(', ')}` : 
       formData.customGoal || 'I want to improve my health and well-being';

    setIsGeneratingVisionBoard(true);
    try {
      const response = await fetch('/api/generate-motivation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dreamDescription: description,
          goals: formData.perfectGoal,
          customGoal: formData.customGoal,
          currentWeight: formData.weight,
          goalWeight: formData.goalWeight
        })
      });

      if (response.ok) {
        const data = await response.json();
        setVisionBoardData(data);
        setVisionBoardPage(1);
      }
    } catch (error) {
      console.error('Error generating vision board:', error);
    } finally {
      setIsGeneratingVisionBoard(false);
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: OnboardingData) => {
      const formDataToSend = new FormData();
      
      // Calculate nutrition values
      const age = data.age;
      const weight = data.weight;
      const goalWeight = data.goalWeight;
      const height = data.height;
      
      // Calculate daily calories and macros
      const bmr = data.gender === 'male' 
        ? 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
        : 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
      
      const activityMultiplier = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
        extra: 1.9
      }[data.activityLevel] || 1.2;
      
      const tdee = bmr * activityMultiplier;
      const dailyCalories = data.weightGoal === 'loss' ? tdee - 500 : 
                           data.weightGoal === 'gain' ? tdee + 500 : tdee;
      
      // Create profile data matching the backend expectation
      const profileData = {
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
    if (step === 7 && !isGeneratingVisionBoard) {
      generateVisionBoard();
      setStep(8);
    } else if (step === 8 && visionBoardPage < 2) {
      setVisionBoardPage(prev => prev + 1);
    } else if (step === 8 && visionBoardPage === 2) {
      mutation.mutate(formData);
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
      case 8: return visionBoardPage === 0 && isGeneratingVisionBoard;
      default: return false;
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 relative overflow-hidden">
      {/* Modern Glassmorphic Background */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-purple-300/20 to-blue-300/20 filter blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-blue-300/15 to-purple-300/15 filter blur-3xl translate-y-1/3 -translate-x-1/3" />
      <div className="absolute top-1/2 left-1/4 w-[350px] h-[350px] rounded-full bg-gradient-to-br from-purple-200/10 to-pink-200/10 filter blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-gradient-to-tl from-blue-200/10 to-purple-200/10 filter blur-3xl" />
      
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className={`absolute w-1.5 h-1.5 rounded-full bg-purple-400/10`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [-20, 20, -20],
              x: [-10, 10, -10],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 4 + Math.random() * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 2,
            }}
          />
        ))}
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
                  {step === 0 ? 'What is your main goal?' :
                   step === 1 ? 'Choose your gender' :
                   step === 2 ? 'How old are you?' :
                   step === 3 ? 'What is your height?' :
                   step === 4 ? 'How much do you weigh?' :
                   step === 5 ? 'What is your goal weight?' :
                   step === 6 ? 'What is your activity level?' :
                   step === 7 ? 'Add profile picture' :
                   step === 8 ? 'Your vision board' : 'Congratulations!'}
                </h2>
                <p className="text-gray-600 text-sm">
                  {step === 0 ? 'Choose what matters most to you' :
                   step === 1 ? 'Helps us better tailor your plan' :
                   step === 2 ? 'We need this to calculate calories' :
                   step === 3 ? 'Enter height in centimeters' :
                   step === 4 ? 'Current weight in kilograms' :
                   step === 5 ? 'What weight are you aiming for?' :
                   step === 6 ? 'How often do you exercise?' :
                   step === 7 ? 'Add your photo (optional)' :
                   step === 8 ? 'Your personalized plan' : 'Your profile is ready!'}
                </p>
              </div>

              {/* Content area */}
              <div className="">
                {/* Step 0: Perfect Goal - Green Glassmorphic Design */}
                {step === 0 && (
                  <div className="space-y-8">
                    {/* Glassmorphic Card Container */}
                    <div className="relative">
                      {/* Background decorative elements - Green theme */}
                      <div className="absolute -top-20 -left-20 w-40 h-40 bg-green-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                      <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-emerald-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                      
                      {/* Main glassmorphic card */}
                      <div className="backdrop-blur-xl bg-white/40 rounded-3xl p-8 shadow-2xl border border-white/20">
                        <div className="space-y-4">
                          {[
                            { value: 'weight_loss', label: 'Weight Loss', desc: 'Reach your ideal weight' },
                            { value: 'muscle_gain', label: 'Build Muscle', desc: 'Gain strength and mass' },
                            { value: 'health_improve', label: 'Improve Health', desc: 'Feel better overall' },
                            { value: 'other', label: 'Other', desc: 'Custom goal' }
                          ].map((goal) => (
                            <motion.div
                              key={goal.value}
                              whileHover={{ scale: 1.01, y: -2 }}
                              whileTap={{ scale: 0.99 }}
                              className={`relative backdrop-blur-xl rounded-xl p-5 cursor-pointer transition-all duration-300 ${
                                formData.perfectGoal.length === 1 && formData.perfectGoal[0] === goal.value
                                  ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 shadow-xl ring-2 ring-green-400 ring-offset-2 border border-white/40' 
                                  : 'bg-white/30 hover:bg-white/50 shadow-lg hover:shadow-xl border border-white/20'
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
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                                  formData.perfectGoal.length === 1 && formData.perfectGoal[0] === goal.value
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 border-transparent' 
                                    : 'border-gray-300 bg-white/50'
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
                                      ? 'text-green-700' 
                                      : 'text-gray-900'
                                  }`}>{goal.label}</h3>
                                  <p className="text-sm text-gray-600">{goal.desc}</p>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                          
                          {/* Custom goal input - Green glassmorphic style */}
                          {formData.perfectGoal.length === 1 && formData.perfectGoal[0] === 'other' && (
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 0 }}
                              transition={{ duration: 0.4, ease: "easeOut" }}
                              className="mt-6"
                            >
                              <div className="backdrop-blur-xl bg-white/50 rounded-xl p-5 shadow-xl border border-white/30">
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                  Please specify your goal
                                </label>
                                <input
                                  type="text"
                                  placeholder="Enter your custom goal..."
                                  value={formData.customGoal || ''}
                                  onChange={(e) => setFormData(prev => ({ ...prev, customGoal: e.target.value }))}
                                  className="w-full p-4 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-xl focus:border-green-400 focus:ring-2 focus:ring-green-100 focus:outline-none transition-all duration-300 placeholder:text-gray-400"
                                  autoFocus
                                />
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 1: Gender */}
                {step === 1 && (
                  <div className="space-y-4">
                    <RadioGroup 
                      value={formData.gender} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value as any }))}
                    >
                      {[
                        { value: 'male', label: 'Male', icon: '' },
                        { value: 'female', label: 'Female', icon: '' }
                      ].map((gender) => (
                        <motion.div
                          key={gender.value}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`flex items-center space-x-3 p-3 border-2 rounded-xl cursor-pointer transition-all duration-300 ${
                            formData.gender === gender.value 
                              ? 'border-purple-400 bg-gradient-to-r from-purple-50 to-purple-100 shadow-lg' 
                              : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                          }`}
                          onClick={() => setFormData(prev => ({ ...prev, gender: gender.value as any }))}
                        >
                          <RadioGroupItem value={gender.value} id={gender.value} />
                          <div className="text-2xl">{gender.icon}</div>
                          <Label htmlFor={gender.value} className="font-semibold cursor-pointer">
                            {gender.label}
                          </Label>
                        </motion.div>
                      ))}
                    </RadioGroup>
                  </div>
                )}

                {/* Step 2: Age - Modern Glassmorphism Style */}
                {step === 2 && (
                  <div className="space-y-8">
                    {/* Glassmorphic Card Container */}
                    <div className="relative">
                      {/* Background decorative elements */}
                      <div className="absolute -top-20 -left-20 w-40 h-40 bg-green-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                      <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-emerald-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                      
                      {/* Main glassmorphic card */}
                      <div className="backdrop-blur-xl bg-white/40 rounded-3xl p-8 shadow-2xl border border-white/20">
                        {/* Age display with glassmorphic effect */}
                        <div className="flex flex-col items-center mb-8">
                          <div className="backdrop-blur-md bg-white/60 rounded-2xl p-6 shadow-lg border border-white/30 mb-4">
                            <div className="text-6xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                              {formData.age || 25}
                            </div>
                          </div>
                          <p className="text-gray-600 font-medium">years old</p>
                        </div>
                        
                        {/* Modern slider with glassmorphism */}
                        <div className="space-y-4">
                          <div className="relative">
                            <input
                              type="range"
                              min="13"
                              max="80"
                              value={formData.age || 25}
                              onChange={(e) => setFormData(prev => ({ ...prev, age: parseInt(e.target.value) }))}
                              className="w-full h-3 bg-gradient-to-r from-green-200/50 to-emerald-200/50 rounded-full outline-none opacity-80 transition-opacity hover:opacity-100 appearance-none cursor-pointer backdrop-blur-sm"
                              style={{
                                background: `linear-gradient(to right, rgba(34, 197, 94, 0.3) 0%, rgba(34, 197, 94, 0.3) ${((formData.age || 25) - 13) / (80 - 13) * 100}%, rgba(209, 250, 229, 0.3) ${((formData.age || 25) - 13) / (80 - 13) * 100}%, rgba(209, 250, 229, 0.3) 100%)`
                              }}
                            />
                            {/* Custom slider thumb styling via CSS */}
                            <style>{`
                              input[type="range"]::-webkit-slider-thumb {
                                appearance: none;
                                width: 24px;
                                height: 24px;
                                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                                border: 3px solid rgba(255, 255, 255, 0.8);
                                border-radius: 50%;
                                cursor: pointer;
                                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
                                transition: all 0.3s ease;
                              }
                              input[type="range"]::-webkit-slider-thumb:hover {
                                transform: scale(1.2);
                                box-shadow: 0 6px 20px rgba(16, 185, 129, 0.6);
                              }
                              input[type="range"]::-moz-range-thumb {
                                width: 24px;
                                height: 24px;
                                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                                border: 3px solid rgba(255, 255, 255, 0.8);
                                border-radius: 50%;
                                cursor: pointer;
                                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
                                transition: all 0.3s ease;
                              }
                              input[type="range"]::-moz-range-thumb:hover {
                                transform: scale(1.2);
                                box-shadow: 0 6px 20px rgba(16, 185, 129, 0.6);
                              }
                            `}</style>
                          </div>
                          
                          {/* Age range labels */}
                          <div className="flex justify-between text-sm text-gray-500 px-1">
                            <span>13</span>
                            <span>80</span>
                          </div>
                        </div>
                        
                        {/* Quick select buttons with glassmorphism */}
                        <div className="mt-8 grid grid-cols-4 gap-3">
                          {[18, 25, 35, 45].map((age) => (
                            <motion.button
                              key={age}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setFormData(prev => ({ ...prev, age }))}
                              className={`backdrop-blur-sm py-3 px-4 rounded-xl border transition-all duration-300 ${
                                formData.age === age
                                  ? 'bg-gradient-to-r from-green-500/80 to-emerald-500/80 text-white border-white/40 shadow-lg'
                                  : 'bg-white/30 hover:bg-white/50 border-white/20 text-gray-700'
                              }`}
                            >
                              <span className="font-semibold">{age}</span>
                            </motion.button>
                          ))}
                        </div>
                        
                        {/* Manual input option */}
                        <div className="mt-6 flex justify-center">
                          <input
                            type="number"
                            value={formData.age || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              const age = value ? parseInt(value, 10) : 0;
                              if (age >= 13 && age <= 80) {
                                setFormData(prev => ({ ...prev, age }));
                              }
                            }}
                            className="backdrop-blur-sm bg-white/50 border border-white/30 rounded-xl px-4 py-2 text-center w-24 focus:outline-none focus:ring-2 focus:ring-green-400/50 focus:border-transparent transition-all duration-300"
                            min="13"
                            max="80"
                            placeholder="Age"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Height - Ruler Scroller Style */}
                {step === 3 && (
                  <div className="space-y-8">
                    {/* Glassmorphic Card Container */}
                    <div className="relative">
                      {/* Background decorative elements */}
                      <div className="absolute -top-20 -left-20 w-40 h-40 bg-teal-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                      <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-cyan-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                      
                      {/* Main glassmorphic card */}
                      <div className="backdrop-blur-xl bg-white/40 rounded-3xl p-8 shadow-2xl border border-white/20">
                        {/* Height display with glassmorphic effect */}
                        <div className="flex flex-col items-center mb-8">
                          <div className="backdrop-blur-md bg-white/60 rounded-2xl p-6 shadow-lg border border-white/30 mb-4">
                            <div className="text-6xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                              {formData.height || 170}
                            </div>
                          </div>
                          <p className="text-gray-600 font-medium">cm</p>
                        </div>
                        
                        {/* Ruler Scroller Container */}
                        <div className="relative">
                          {/* Selection indicator */}
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                            <div className="w-1 h-20 bg-gradient-to-b from-teal-500 to-cyan-500 shadow-lg"></div>
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-teal-500"></div>
                          </div>
                          
                          {/* Ruler container with horizontal scroll */}
                          <div 
                            className="relative overflow-x-auto no-scrollbar rounded-xl backdrop-blur-sm bg-white/20 border border-white/30 p-4"
                            ref={(scrollContainer) => {
                              if (scrollContainer && !scrollContainer.dataset.initialized) {
                                scrollContainer.dataset.initialized = 'true';
                                
                                // Initial scroll position
                                const targetHeight = formData.height || 170;
                                const scrollPosition = (targetHeight - 100) * 10;
                                setTimeout(() => {
                                  scrollContainer.scrollLeft = scrollPosition;
                                }, 0);
                                
                                // Variables for drag functionality
                                let isDown = false;
                                let startX = 0;
                                let scrollLeft = 0;
                                
                                // Mouse events
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
                                  const walk = (x - startX) * 1.5; // Scroll speed multiplier
                                  scrollContainer.scrollLeft = scrollLeft - walk;
                                });
                                
                                // Touch events for mobile
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
                                
                                // Scroll event listener for height updates
                                scrollContainer.addEventListener('scroll', () => {
                                  const scrollLeft = scrollContainer.scrollLeft;
                                  const pixelsPerCm = 10;
                                  const containerWidth = scrollContainer.clientWidth;
                                  const centerOffset = containerWidth / 2;
                                  const adjustedScrollLeft = scrollLeft + centerOffset - (1500); // 1500px is half of total width (3000px)
                                  const height = Math.round(100 + adjustedScrollLeft / pixelsPerCm);
                                  const clampedHeight = Math.max(100, Math.min(250, height));
                                  setFormData(prev => ({ ...prev, height: clampedHeight }));
                                });
                              }
                            }}
                            style={{ cursor: 'grab' }}
                          >
                            <div 
                              className="flex items-end h-16 select-none"
                              style={{ width: '3000px', paddingLeft: '50%', paddingRight: '50%' }}
                            >
                              {/* Generate ruler marks */}
                              {Array.from({ length: 151 }, (_, i) => i + 100).map((cm) => (
                                <div key={cm} className="flex flex-col items-center" style={{ minWidth: '10px' }}>
                                  {cm % 10 === 0 ? (
                                    <>
                                      <div className="w-0.5 h-12 bg-gray-700/60"></div>
                                      <span className="text-xs text-gray-700 mt-1 font-semibold">{cm}</span>
                                    </>
                                  ) : cm % 5 === 0 ? (
                                    <>
                                      <div className="w-0.5 h-8 bg-gray-600/40"></div>
                                      <span className="text-xs text-gray-600 mt-1">{cm}</span>
                                    </>
                                  ) : (
                                    <div className="w-0.5 h-4 bg-gray-500/30"></div>
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
                        
                        {/* Quick select buttons */}
                        <div className="mt-8 grid grid-cols-4 gap-3">
                          {[150, 165, 175, 185].map((height) => (
                            <motion.button
                              key={height}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                setFormData(prev => ({ ...prev, height }));
                                // Scroll to selected height
                                const ruler = document.querySelector('[style*="width: 3000px"]') as HTMLElement;
                                if (ruler && ruler.parentElement) {
                                  const pixelsPerCm = 10;
                                  const scrollPosition = (height - 100) * pixelsPerCm - ruler.parentElement.clientWidth / 2;
                                  ruler.parentElement.scrollTo({ left: scrollPosition, behavior: 'smooth' });
                                }
                              }}
                              className={`backdrop-blur-sm py-3 px-4 rounded-xl border transition-all duration-300 ${
                                formData.height === height
                                  ? 'bg-gradient-to-r from-teal-500/80 to-cyan-500/80 text-white border-white/40 shadow-lg'
                                  : 'bg-white/30 hover:bg-white/50 border-white/20 text-gray-700'
                              }`}
                            >
                              <span className="font-semibold">{height}</span>
                              <span className="text-xs ml-1">cm</span>
                            </motion.button>
                          ))}
                        </div>
                        
                        {/* Manual input option */}
                        <div className="mt-6 flex justify-center">
                          <input
                            type="number"
                            value={formData.height || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              const height = value ? parseInt(value, 10) : 0;
                              if (height >= 100 && height <= 250) {
                                setFormData(prev => ({ ...prev, height }));
                                // Scroll to entered height
                                const ruler = document.querySelector('[style*="width: 3000px"]') as HTMLElement;
                                if (ruler && ruler.parentElement) {
                                  const pixelsPerCm = 10;
                                  const scrollPosition = (height - 100) * pixelsPerCm - ruler.parentElement.clientWidth / 2;
                                  ruler.parentElement.scrollTo({ left: scrollPosition, behavior: 'smooth' });
                                }
                              }
                            }}
                            className="backdrop-blur-sm bg-white/50 border border-white/30 rounded-xl px-4 py-2 text-center w-24 focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-transparent transition-all duration-300"
                            min="100"
                            max="250"
                            placeholder="Height"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Current Weight - Scale Style */}
                {step === 4 && (
                  <div className="space-y-8">
                    {/* Glassmorphic Card Container */}
                    <div className="relative">
                      {/* Background decorative elements */}
                      <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                      <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-indigo-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                      
                      {/* Main glassmorphic card */}
                      <div className="backdrop-blur-xl bg-white/40 rounded-3xl p-8 shadow-2xl border border-white/20">
                        {/* Weight display with scale-like design */}
                        <div className="flex flex-col items-center mb-8">
                          {/* Scale display */}
                          <div className="relative">
                            <div className="backdrop-blur-md bg-white/60 rounded-full p-8 shadow-lg border border-white/30 mb-4">
                              <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                {formData.weight || 70}
                              </div>
                              <div className="text-center text-gray-600 font-medium mt-1">kg</div>
                            </div>
                            {/* Scale decorative elements */}
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-blue-300/50 to-indigo-300/50 rounded-full"></div>
                          </div>
                        </div>
                        
                        {/* Weight Scale Scroller Container */}
                        <div className="relative">
                          {/* Selection indicator (scale needle) */}
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                            <div className="w-0.5 h-16 bg-gradient-to-b from-blue-500 to-indigo-500 shadow-lg"></div>
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full shadow-lg"></div>
                          </div>
                          
                          {/* Scale container with horizontal scroll */}
                          <div 
                            className="relative overflow-x-auto no-scrollbar rounded-xl backdrop-blur-sm bg-gradient-to-b from-white/20 to-white/10 border border-white/30 p-4"
                            ref={(scrollContainer) => {
                              if (scrollContainer && !scrollContainer.dataset.initialized) {
                                scrollContainer.dataset.initialized = 'true';
                                
                                // Initial scroll position
                                const targetWeight = formData.weight || 70;
                                const scrollPosition = (targetWeight - 30) * 20; // 20px per kg
                                setTimeout(() => {
                                  scrollContainer.scrollLeft = scrollPosition;
                                }, 0);
                                
                                // Variables for drag functionality
                                let isDown = false;
                                let startX = 0;
                                let scrollLeft = 0;
                                
                                // Mouse events
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
                                
                                // Touch events for mobile
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
                                
                                // Scroll event listener for weight updates
                                scrollContainer.addEventListener('scroll', () => {
                                  const scrollLeft = scrollContainer.scrollLeft;
                                  const pixelsPerKg = 20;
                                  const weight = Math.round(30 + scrollLeft / pixelsPerKg);
                                  const clampedWeight = Math.max(30, Math.min(200, weight));
                                  setFormData(prev => ({ ...prev, weight: clampedWeight }));
                                });
                              }
                            }}
                            style={{ cursor: 'grab' }}
                          >
                            <div 
                              className="flex items-end h-14 select-none"
                              style={{ width: '3400px', paddingLeft: '50%', paddingRight: '50%' }}
                            >
                              {/* Generate scale marks */}
                              {Array.from({ length: 171 }, (_, i) => i + 30).map((kg) => (
                                <div key={kg} className="flex flex-col items-center justify-end" style={{ minWidth: '20px' }}>
                                  {kg % 10 === 0 ? (
                                    <>
                                      <div className="w-1 h-10 bg-gradient-to-b from-gray-700/60 to-gray-600/40 rounded-full"></div>
                                      <span className="text-xs text-gray-700 mt-1 font-bold">{kg}</span>
                                    </>
                                  ) : kg % 5 === 0 ? (
                                    <>
                                      <div className="w-0.5 h-7 bg-gray-600/40 rounded-full"></div>
                                      <span className="text-xs text-gray-600 mt-1">{kg}</span>
                                    </>
                                  ) : (
                                    <div className="w-0.5 h-4 bg-gray-500/30 rounded-full"></div>
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
                        
                        {/* Quick select weight buttons */}
                        <div className="mt-8 grid grid-cols-4 gap-3">
                          {[50, 60, 70, 80].map((weight) => (
                            <motion.button
                              key={weight}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                setFormData(prev => ({ ...prev, weight }));
                                // Scroll to selected weight
                                const scale = document.querySelector('[style*="width: 3400px"]') as HTMLElement;
                                if (scale && scale.parentElement) {
                                  const pixelsPerKg = 20;
                                  const scrollPosition = (weight - 30) * pixelsPerKg;
                                  scale.parentElement.scrollTo({ left: scrollPosition, behavior: 'smooth' });
                                }
                              }}
                              className={`backdrop-blur-sm py-3 px-4 rounded-xl border transition-all duration-300 ${
                                formData.weight === weight
                                  ? 'bg-gradient-to-r from-blue-500/80 to-indigo-500/80 text-white border-white/40 shadow-lg'
                                  : 'bg-white/30 hover:bg-white/50 border-white/20 text-gray-700'
                              }`}
                            >
                              <span className="font-semibold">{weight}</span>
                              <span className="text-xs ml-1">kg</span>
                            </motion.button>
                          ))}
                        </div>
                        
                        {/* Manual input option */}
                        <div className="mt-6 flex justify-center">
                          <input
                            type="number"
                            value={formData.weight || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              const weight = value ? parseInt(value, 10) : 0;
                              if (weight >= 30 && weight <= 200) {
                                setFormData(prev => ({ ...prev, weight }));
                                // Scroll to entered weight
                                const scale = document.querySelector('[style*="width: 3400px"]') as HTMLElement;
                                if (scale && scale.parentElement) {
                                  const pixelsPerKg = 20;
                                  const scrollPosition = (weight - 30) * pixelsPerKg;
                                  scale.parentElement.scrollTo({ left: scrollPosition, behavior: 'smooth' });
                                }
                              }
                            }}
                            className="backdrop-blur-sm bg-white/50 border border-white/30 rounded-xl px-4 py-2 text-center w-24 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent transition-all duration-300"
                            min="30"
                            max="200"
                            placeholder="Weight"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 5: Goal Weight - Scale Style */}
                {step === 5 && (
                  <div className="space-y-8">
                    {/* Glassmorphic Card Container */}
                    <div className="relative">
                      {/* Background decorative elements */}
                      <div className="absolute -top-20 -left-20 w-40 h-40 bg-amber-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                      <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-orange-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                      
                      {/* Main glassmorphic card */}
                      <div className="backdrop-blur-xl bg-white/40 rounded-3xl p-8 shadow-2xl border border-white/20">
                        {/* Goal Weight display with scale-like design */}
                        <div className="flex flex-col items-center mb-8">
                          {/* Scale display with target icon */}
                          <div className="relative">
                            <div className="backdrop-blur-md bg-white/60 rounded-full p-8 shadow-lg border border-white/30 mb-4">
                              <div className="text-5xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                                {formData.goalWeight || 65}
                              </div>
                              <div className="text-center text-gray-600 font-medium mt-1">kg</div>
                            </div>
                            {/* Target decorative elements */}
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-amber-300/50 to-orange-300/50 rounded-full"></div>
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-400 rounded-full flex items-center justify-center">
                              <Target className="w-3 h-3 text-white" />
                            </div>
                          </div>
                        </div>
                        
                        {/* Goal Weight Scale Scroller Container */}
                        <div className="relative">
                          {/* Selection indicator (scale needle) */}
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                            <div className="w-0.5 h-16 bg-gradient-to-b from-amber-500 to-orange-500 shadow-lg"></div>
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-3 bg-amber-500 rounded-full shadow-lg"></div>
                          </div>
                          
                          {/* Scale container with horizontal scroll */}
                          <div 
                            className="relative overflow-x-auto no-scrollbar rounded-xl backdrop-blur-sm bg-gradient-to-b from-white/20 to-white/10 border border-white/30 p-4"
                            ref={(scrollContainer) => {
                              if (scrollContainer && !scrollContainer.dataset.initialized) {
                                scrollContainer.dataset.initialized = 'true';
                                
                                // Initial scroll position
                                const targetGoalWeight = formData.goalWeight || 65;
                                const scrollPosition = (targetGoalWeight - 30) * 20; // 20px per kg
                                setTimeout(() => {
                                  scrollContainer.scrollLeft = scrollPosition;
                                }, 0);
                                
                                // Variables for drag functionality
                                let isDown = false;
                                let startX = 0;
                                let scrollLeft = 0;
                                
                                // Mouse events
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
                                
                                // Touch events for mobile
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
                                
                                // Scroll event listener for goal weight updates
                                scrollContainer.addEventListener('scroll', () => {
                                  const scrollLeft = scrollContainer.scrollLeft;
                                  const pixelsPerKg = 20;
                                  const goalWeight = Math.round(30 + scrollLeft / pixelsPerKg);
                                  const clampedGoalWeight = Math.max(30, Math.min(200, goalWeight));
                                  setFormData(prev => ({ ...prev, goalWeight: clampedGoalWeight }));
                                });
                              }
                            }}
                            style={{ cursor: 'grab' }}
                          >
                            <div 
                              className="flex items-end h-14 select-none"
                              style={{ width: '3400px', paddingLeft: '50%', paddingRight: '50%' }}
                            >
                              {/* Generate scale marks with goal-oriented styling */}
                              {Array.from({ length: 171 }, (_, i) => i + 30).map((kg) => (
                                <div key={kg} className="flex flex-col items-center justify-end" style={{ minWidth: '20px' }}>
                                  {kg % 10 === 0 ? (
                                    <>
                                      <div className="w-1 h-10 bg-gradient-to-b from-gray-700/60 to-gray-600/40 rounded-full"></div>
                                      <span className="text-xs text-gray-700 mt-1 font-bold">{kg}</span>
                                    </>
                                  ) : kg % 5 === 0 ? (
                                    <>
                                      <div className="w-0.5 h-7 bg-gray-600/40 rounded-full"></div>
                                      <span className="text-xs text-gray-600 mt-1">{kg}</span>
                                    </>
                                  ) : (
                                    <div className="w-0.5 h-4 bg-gray-500/30 rounded-full"></div>
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
                        
                        {/* Quick select goal weight buttons */}
                        <div className="mt-8 grid grid-cols-4 gap-3">
                          {[55, 65, 75, 85].map((goalWeight) => (
                            <motion.button
                              key={goalWeight}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                setFormData(prev => ({ ...prev, goalWeight }));
                                // Scroll to selected goal weight
                                const scale = document.querySelector('[style*="width: 3400px"]') as HTMLElement;
                                if (scale && scale.parentElement) {
                                  const pixelsPerKg = 20;
                                  const scrollPosition = (goalWeight - 30) * pixelsPerKg;
                                  scale.parentElement.scrollTo({ left: scrollPosition, behavior: 'smooth' });
                                }
                              }}
                              className={`backdrop-blur-sm py-3 px-4 rounded-xl border transition-all duration-300 ${
                                formData.goalWeight === goalWeight
                                  ? 'bg-gradient-to-r from-amber-500/80 to-orange-500/80 text-white border-white/40 shadow-lg'
                                  : 'bg-white/30 hover:bg-white/50 border-white/20 text-gray-700'
                              }`}
                            >
                              <span className="font-semibold">{goalWeight}</span>
                              <span className="text-xs ml-1">kg</span>
                            </motion.button>
                          ))}
                        </div>
                        
                        {/* Manual input option */}
                        <div className="mt-6 flex justify-center">
                          <input
                            type="number"
                            value={formData.goalWeight || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              const goalWeight = value ? parseInt(value, 10) : 0;
                              if (goalWeight >= 30 && goalWeight <= 200) {
                                setFormData(prev => ({ ...prev, goalWeight }));
                                // Scroll to entered goal weight
                                const scale = document.querySelector('[style*="width: 3400px"]') as HTMLElement;
                                if (scale && scale.parentElement) {
                                  const pixelsPerKg = 20;
                                  const scrollPosition = (goalWeight - 30) * pixelsPerKg;
                                  scale.parentElement.scrollTo({ left: scrollPosition, behavior: 'smooth' });
                                }
                              }
                            }}
                            className="backdrop-blur-sm bg-white/50 border border-white/30 rounded-xl px-4 py-2 text-center w-24 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-transparent transition-all duration-300"
                            min="30"
                            max="200"
                            placeholder="Goal"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 6: Activity Level - Interactive Slider */}
                {step === 6 && (
                  <div className="space-y-8">
                    {/* Glassmorphic Card Container */}
                    <div className="relative">
                      {/* Background decorative elements - Green theme */}
                      <div className="absolute -top-20 -left-20 w-40 h-40 bg-green-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                      <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-emerald-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                      
                      {/* Main glassmorphic card */}
                      <div className="backdrop-blur-xl bg-white/40 rounded-3xl p-8 shadow-2xl border border-white/20">
                        
                        {/* Activity Level Cards - 3 options */}
                        <div className="grid grid-cols-3 gap-4">
                          {[
                            { value: 'sedentary', label: 'Low', days: '0-2 days/week' },
                            { value: 'moderate', label: 'Moderate', days: '3-5 days/week' },
                            { value: 'active', label: 'High', days: '6-7 days/week' }
                          ].map((activity) => (
                            <motion.button
                              key={activity.value}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setFormData(prev => ({ ...prev, activityLevel: activity.value }))}
                              className={`backdrop-blur-sm p-4 rounded-xl border-2 transition-all duration-300 ${
                                formData.activityLevel === activity.value
                                  ? 'bg-gradient-to-b from-green-500/80 to-emerald-500/80 text-white border-white/60 shadow-lg'
                                  : 'bg-white/30 hover:bg-white/50 border-gray-300/40 text-gray-700 hover:border-gray-400/60'
                              }`}
                            >
                              <div className="text-lg font-semibold">{activity.label}</div>
                              <div className="text-xs opacity-80 mt-2">{activity.days}</div>
                            </motion.button>
                          ))}
                        </div>
                        
                        {/* Enhanced Calorie Multiplier Display */}
                        <div className="mt-8">
                          <div className="backdrop-blur-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-2xl p-6 border border-white/30 shadow-xl">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center">
                                <h3 className="text-sm font-semibold text-gray-700">Daily Calorie Boost</h3>
                              </div>
                              <div className="backdrop-blur-md bg-white/60 rounded-full px-3 py-1">
                                <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
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
                            <div className="relative h-4 bg-white/30 rounded-full overflow-hidden mb-3">
                              <div 
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500 ease-out"
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
                              <span className="font-semibold text-green-700">
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
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 7: Profile Picture - Green Glassmorphism */}
                {step === 7 && (
                  <div className="space-y-8">
                    {/* Glassmorphic Card Container */}
                    <div className="relative">
                      {/* Background decorative elements - Green theme */}
                      <div className="absolute -top-20 -left-20 w-40 h-40 bg-green-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                      <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-emerald-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                      
                      {/* Main glassmorphic card */}
                      <div className="backdrop-blur-xl bg-white/40 rounded-3xl p-8 shadow-2xl border border-white/20">
                        <div className="text-center">
                          {/* Profile Picture Container */}
                          <div className="mx-auto h-40 w-40 relative mb-6">
                            {/* Gradient border effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full p-1">
                              <div className="h-full w-full bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center overflow-hidden">
                                {formData.profileImage ? (
                                  <img 
                                    src={URL.createObjectURL(formData.profileImage)} 
                                    alt="Profile" 
                                    className="w-full h-full rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="flex flex-col items-center">
                                    <User className="w-16 h-16 text-green-500 mb-2" />
                                    <span className="text-xs text-gray-600">No photo yet</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Decorative dots */}
                            <div className="absolute -top-2 -right-2 w-4 h-4 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full animate-pulse"></div>
                            <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-gradient-to-br from-emerald-400 to-green-400 rounded-full animate-pulse delay-75"></div>
                          </div>
                          
                          {/* File input */}
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setFormData(prev => ({ ...prev, profileImage: file }));
                              }
                            }}
                            className="hidden"
                            id="profile-image"
                          />
                          
                          {/* Upload button with glassmorphism */}
                          <Label
                            htmlFor="profile-image"
                            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-green-500/80 to-emerald-500/80 text-white rounded-xl hover:from-green-600/80 hover:to-emerald-600/80 cursor-pointer transition-all duration-300 backdrop-blur-md border border-white/30 shadow-lg"
                          >
                            <Camera className="w-5 h-5 mr-2" />
                            <span className="font-semibold">
                              {formData.profileImage ? 'Change Photo' : 'Choose Photo'}
                            </span>
                          </Label>
                          
                          {/* Status indicator */}
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-4"
                          >
                            <div className="backdrop-blur-md bg-white/50 rounded-xl px-4 py-2 inline-block border border-white/30">
                              <p className="text-sm text-gray-600">
                                {formData.profileImage ? (
                                  <span className="text-green-600 font-medium">Photo selected</span>
                                ) : (
                                  'Optional - you can skip this step'
                                )}
                              </p>
                            </div>
                          </motion.div>
                          
                          {/* Benefits of adding photo */}
                          <div className="mt-8 grid grid-cols-3 gap-3">
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
                                className="backdrop-blur-sm bg-white/30 rounded-xl p-4 border border-white/20"
                              >
                                <div className="text-xs font-semibold text-gray-700">{benefit.text}</div>
                                <div className="text-xs text-gray-600">{benefit.desc}</div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 8: Vision Board - Completely Revamped */}
                {step === 8 && (
                  <div className="space-y-8">
                    {/* Glassmorphic Card Container */}
                    <div className="relative">
                      {/* Background decorative elements - Green theme */}
                      <div className="absolute -top-20 -left-20 w-40 h-40 bg-green-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                      <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-emerald-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                      
                      {/* Main glassmorphic card */}
                      <div className="backdrop-blur-xl bg-white/40 rounded-3xl p-8 shadow-2xl border border-white/20">
                        {/* Page Indicators - Green theme */}
                        <div className="flex justify-center space-x-3 mb-8">
                          {[1, 2].map((page) => (
                            <motion.div
                              key={page}
                              initial={{ scale: 0.8 }}
                              animate={{ scale: visionBoardPage >= page ? 1 : 0.8 }}
                              className={`w-10 h-2 rounded-full transition-all duration-300 ${
                                visionBoardPage >= page 
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg' 
                                  : 'bg-gray-300/50'
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
                            <div className="backdrop-blur-md bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-2xl p-6 border border-white/30">
                              <div className="text-center mb-6">
                                <motion.div 
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: 0.2, type: "spring" }}
                                  className="text-5xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2"
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
                                    color: 'from-blue-500 to-cyan-500',
                                    bgColor: 'bg-blue-50',
                                    borderColor: 'border-blue-200'
                                  },
                                  { 
                                    label: 'Carbs', 
                                    value: Math.round(calculateCalories(formData) * 0.45 / 4),
                                    color: 'from-amber-500 to-orange-500',
                                    bgColor: 'bg-amber-50',
                                    borderColor: 'border-amber-200'
                                  },
                                  { 
                                    label: 'Fats', 
                                    value: Math.round(calculateCalories(formData) * 0.25 / 9),
                                    color: 'from-purple-500 to-pink-500',
                                    bgColor: 'bg-purple-50',
                                    borderColor: 'border-purple-200'
                                  }
                                ].map((macro, index) => (
                                  <motion.div
                                    key={macro.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 + index * 0.1 }}
                                    className={`backdrop-blur-sm bg-white/50 rounded-xl p-3 border ${macro.borderColor}`}
                                  >
                                    <div className={`text-2xl font-bold bg-gradient-to-r ${macro.color} bg-clip-text text-transparent`}>
                                      {macro.value}g
                                    </div>
                                    <div className="text-xs text-gray-600 font-medium">{macro.label}</div>
                                  </motion.div>
                                ))}
                              </div>
                            </div>

                            {/* Visual Goal Progress Preview */}
                            <motion.div 
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.5 }}
                              className="backdrop-blur-sm bg-white/30 rounded-xl p-4 border border-white/20"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm text-gray-600">Current</div>
                                  <div className="text-xl font-bold text-gray-800">{formData.weight} kg</div>
                                </div>
                                <div className="flex-1 mx-6">
                                  <div className="relative h-2 bg-gray-200/50 rounded-full overflow-hidden">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: "70%" }}
                                      transition={{ delay: 0.7, duration: 1 }}
                                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <div className="text-sm text-gray-600">Goal</div>
                                  <div className="text-xl font-bold text-green-600">{formData.goalWeight} kg</div>
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
                                  {/* Timeline Visualization - Revamped */}
                                  {formData.weightGoal !== 'maintain' && (
                                    <div className="backdrop-blur-md bg-gradient-to-br from-white/40 to-white/20 rounded-2xl p-6 border border-white/40 shadow-xl">
                                      <h3 className="text-center text-lg font-semibold text-gray-700 mb-6">Your Success Journey</h3>
                                      
                                      {/* Time Display Cards - Redesigned */}
                                      <div className="grid grid-cols-3 gap-3 mb-6">
                                        {/* Weeks Card */}
                                        <motion.div 
                                          initial={{ opacity: 0, y: 20 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: 0.3 }}
                                          className="relative overflow-hidden"
                                        >
                                          <div className="backdrop-blur-sm bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-2xl p-4 border border-green-200/50">
                                            <div className="flex items-center justify-center mb-2">
                                              <CalendarDays className="w-5 h-5 text-green-600" />
                                            </div>
                                            <div className="text-center">
                                              <div className="text-2xl font-bold text-gray-800">
                                                {timeline.weeks}
                                              </div>
                                              <div className="text-xs text-gray-600 font-medium">weeks</div>
                                            </div>
                                            {/* Decorative gradient */}
                                            <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-gradient-to-br from-green-400/20 to-transparent rounded-full blur-xl" />
                                          </div>
                                        </motion.div>
                                        
                                        {/* OR Divider */}
                                        <motion.div 
                                          initial={{ scale: 0 }}
                                          animate={{ scale: 1 }}
                                          transition={{ delay: 0.4 }}
                                          className="flex items-center justify-center"
                                        >
                                          <div className="text-xs text-gray-400 font-medium px-2 py-1 bg-white/50 backdrop-blur-sm rounded-full">or</div>
                                        </motion.div>
                                        
                                        {/* Months Card */}
                                        <motion.div 
                                          initial={{ opacity: 0, y: 20 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: 0.5 }}
                                          className="relative overflow-hidden"
                                        >
                                          <div className="backdrop-blur-sm bg-gradient-to-br from-teal-500/10 to-cyan-500/10 rounded-2xl p-4 border border-teal-200/50">
                                            <div className="flex items-center justify-center mb-2">
                                              <Calendar className="w-5 h-5 text-teal-600" />
                                            </div>
                                            <div className="text-center">
                                              <div className="text-2xl font-bold text-gray-800">
                                                {timeline.months}
                                              </div>
                                              <div className="text-xs text-gray-600 font-medium">months</div>
                                            </div>
                                            {/* Decorative gradient */}
                                            <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-gradient-to-br from-teal-400/20 to-transparent rounded-full blur-xl" />
                                          </div>
                                        </motion.div>
                                      </div>

                                      {/* Progress Rate - Enhanced */}
                                      <motion.div 
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.6 }}
                                        className="backdrop-blur-sm bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-xl p-4 border border-purple-200/50"
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <TrendingDown className="w-4 h-4 text-purple-600" />
                                            <span className="text-sm text-gray-700 font-medium">Weekly Progress</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-lg font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                                              {Math.abs(timeline.weeklyProgress).toFixed(1)}
                                            </span>
                                            <span className="text-sm text-gray-600">kg/week</span>
                                          </div>
                                        </div>
                                        
                                        {/* Visual Progress Bar */}
                                        <div className="mt-3 h-2 bg-gray-200/50 rounded-full overflow-hidden">
                                          <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(Math.abs(timeline.weeklyProgress) * 100, 100)}%` }}
                                            transition={{ delay: 0.8, duration: 1 }}
                                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                                          />
                                        </div>
                                      </motion.div>
                                    </div>
                                  )}

                                  {/* Motivational Call to Action */}
                                  <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6 }}
                                    className="backdrop-blur-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl p-6 border border-white/40 text-center"
                                  >
                                    
                                    <h3 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                                      You're All Set!
                                    </h3>
                                    <p className="text-gray-600 text-sm">
                                      Your personalized nutrition journey begins now
                                    </p>
                                  </motion.div>
                                </>
                              );
                            })()}
                          </motion.div>
                        )}

                        {/* Loading State - Green theme */}
                        {visionBoardPage === 0 && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center space-y-6 py-8"
                          >
                            <div className="relative w-24 h-24 mx-auto">
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full opacity-20"
                              />
                              <motion.div
                                animate={{ rotate: -360 }}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full opacity-30"
                              />
                              <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="absolute inset-4 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full flex items-center justify-center"
                              >
                                <Target className="w-8 h-8 text-white" />
                              </motion.div>
                            </div>
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                              Preparing Your Vision Board
                            </h2>
                            <p className="text-sm text-gray-600">Calculating your personalized nutrition plan...</p>
                          </motion.div>
                        )}
                      </div>
                    </div>
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
                      disabled={step === 8 && visionBoardPage === 0}
                      className="flex items-center text-gray-600 hover:text-gray-800 hover:bg-white/50 backdrop-blur-sm px-6 py-3 rounded-2xl transition-all duration-300"
                    >
                      <span className="mr-2 text-lg">←</span>
                      Back
                    </Button>
                  )}

                  <Button
                    onClick={handleNext}
                    disabled={isNextDisabled() || mutation.isPending}
                    className="backdrop-blur-xl bg-gradient-to-r from-green-500/80 to-emerald-500/80 text-white px-8 py-4 rounded-2xl text-base font-semibold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 min-w-fit whitespace-nowrap border border-white/20 hover:from-green-600/80 hover:to-emerald-600/80"
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