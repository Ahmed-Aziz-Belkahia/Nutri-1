import { useState, useEffect, useRef } from "react";
import { ChevronUp, ChevronDown, TrendingDown, TrendingUp, Minus, Scale, Target, Flame, CheckCircle, X } from "lucide-react";
import { useWeightLogs } from '@/hooks/use-weight-logs';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { calculateDailyCalories, calculateMacros } from "@/lib/nutrition";
import { motion, AnimatePresence } from "framer-motion";

interface WeeklyWeightCheckInProps {
  onClose?: () => void;
}

export default function WeeklyWeightCheckIn({ onClose }: WeeklyWeightCheckInProps) {
  const { t } = useTranslation(['common']);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [weight, setWeight] = useState(70);
  const [step, setStep] = useState<'input' | 'progress' | 'recalculating' | 'complete'>('input');
  const { weightLogs, addWeightLog, isAddingWeight } = useWeightLogs();
  const { data: userProfile, refetch: refetchProfile } = useUserProfile();
  const { toast } = useToast();
  const hasCheckedRef = useRef(false);

  // Check if a weekly check-in is needed (only once on mount)
  useEffect(() => {
    // Only run this check once when weightLogs are first loaded
    if (hasCheckedRef.current || !weightLogs) return;
    
    const checkWeeklyNeed = () => {
      const now = new Date();
      
      // Only show on Sundays (day 0)
      if (now.getDay() !== 0) {
        return;
      }
      
      // Check if already shown/dismissed this Sunday
      const lastShownSunday = localStorage.getItem('weightCheckInLastSunday');
      const thisSunday = now.toISOString().split('T')[0]; // Today's date in YYYY-MM-DD
      
      if (lastShownSunday === thisSunday) {
        return; // Already shown this Sunday
      }
      
      if (weightLogs.length === 0) {
        // No logs yet, prompt for first entry
        setIsDialogOpen(true);
        return;
      }

      // Sort logs by date descending
      const sortedLogs = [...weightLogs].sort((a, b) => 
        new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()
      );
      
      const lastLog = sortedLogs[0];
      const lastLogDate = new Date(lastLog.loggedAt);
      const daysSinceLastLog = Math.floor((now.getTime() - lastLogDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Prompt for weekly check-in (7+ days since last log)
      if (daysSinceLastLog >= 7) {
        setIsDialogOpen(true);
      }
    };

    // Mark as checked so we don't re-run
    hasCheckedRef.current = true;
    
    // Small delay to prevent immediate popup
    const timer = setTimeout(checkWeeklyNeed, 2000);
    return () => clearTimeout(timer);
  }, [weightLogs]);

  // Initialize weight from profile or last log
  useEffect(() => {
    if (userProfile?.currentWeight) {
      setWeight(parseFloat(userProfile.currentWeight.toString()));
    } else if (weightLogs.length > 0) {
      setWeight(weightLogs[0].weight);
    }
  }, [userProfile, weightLogs]);

  const handleDismiss = () => {
    // Mark this Sunday as shown so it won't show again until next Sunday
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('weightCheckInLastSunday', today);
    setIsDialogOpen(false);
    onClose?.();
  };

  const getWeightChange = () => {
    if (weightLogs.length < 2) return null;
    
    const sortedLogs = [...weightLogs].sort((a, b) => 
      new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()
    );
    
    const previousWeight = sortedLogs[1]?.weight || sortedLogs[0].weight;
    const currentWeight = weight;
    const change = currentWeight - previousWeight;
    
    return {
      value: Math.abs(change).toFixed(1),
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      raw: change
    };
  };

  const recalculateCalories = async () => {
    if (!userProfile) return null;

    const age = userProfile.age || 25;
    const height = parseFloat(userProfile.height?.toString() || '170');
    const activityLevel = userProfile.activityLevel || 'moderate';
    const weightGoal = userProfile.weightGoal || 'maintain';
    const gender = userProfile.gender || 'male';
    
    // Determine goal type from weightGoal
    let goalType: 'maintain' | 'lose' | 'gain' = 'maintain';
    if (weightGoal === 'loss') goalType = 'lose';
    else if (weightGoal === 'gain') goalType = 'gain';
    
    const newCalories = calculateDailyCalories(
      age,
      weight,
      height,
      activityLevel,
      goalType,
      gender === 'male'
    );
    
    const newMacros = calculateMacros(newCalories, goalType);
    
    return {
      calories: newCalories,
      protein: newMacros.protein,
      carbs: newMacros.carbs,
      fat: newMacros.fat
    };
  };

  const handleSubmit = async () => {
    try {
      setStep('progress');
      
      // Add weight log
      await addWeightLog({ weight: parseFloat(weight.toFixed(1)) });
      
      // Show progress animation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setStep('recalculating');
      
      // Recalculate calories based on new weight
      const newNutrition = await recalculateCalories();
      
      if (newNutrition) {
        // Update user profile with new calorie goals
        const response = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            weight: weight,
            caloriesGoal: newNutrition.calories,
            proteinGoal: Math.round((newNutrition.protein * 4 / newNutrition.calories) * 100),
            carbsGoal: Math.round((newNutrition.carbs * 4 / newNutrition.calories) * 100),
            fatGoal: Math.round((newNutrition.fat * 9 / newNutrition.calories) * 100),
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to update profile');
        }
        
        await refetchProfile();
      }
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setStep('complete');
      
      // Auto close after showing success
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setIsDialogOpen(false);
      setStep('input');
      onClose?.();
      
      toast({
        title: t('common:weightCheckIn.success.title', 'Progress Updated!'),
        description: t('common:weightCheckIn.success.description', 'Your calories have been recalculated based on your new weight.'),
        duration: 5000,
      });
      
    } catch (error) {
      console.error('Failed to update weight:', error);
      setStep('input');
      toast({
        variant: "destructive",
        title: t('common:weightCheckIn.error.title', 'Error'),
        description: t('common:weightCheckIn.error.description', 'Failed to update weight. Please try again.'),
      });
    }
  };

  const weightChange = getWeightChange();
  const goalWeight = userProfile?.goalWeight ? parseFloat(userProfile.goalWeight.toString()) : 65;
  const distanceToGoal = Math.abs(weight - goalWeight).toFixed(1);
  const isGaining = userProfile?.weightGoal === 'gain';

  if (!isDialogOpen) return null;

  return (
    <AnimatePresence>
      {isDialogOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={handleDismiss}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="card bg-white w-full max-w-[400px] overflow-hidden pointer-events-auto relative">
              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors z-10"
                disabled={step !== 'input'}
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>

              <AnimatePresence mode="wait">
                {step === 'input' && (
                  <motion.div
                    key="input"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-6"
                  >
                    {/* Header */}
                    <div className="text-center mb-6">
                      <div className="mx-auto w-20 h-20 bg-gradient-to-br from-[#0CC5BA] to-[#0AA59C] rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                        <Scale className="w-10 h-10 text-white" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900">
                        {t('common:weightCheckIn.title', 'Weekly Weight Check-In')}
                      </h2>
                      <p className="text-gray-500 text-sm mt-1">
                        {t('common:weightCheckIn.description', 'Track your progress and we\'ll adjust your calories automatically')}
                      </p>
                    </div>
                    
                    <div className="space-y-6">
                      {/* Weight Input */}
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-100">
                        <label className="text-sm text-gray-500 block mb-3 text-center font-medium">
                          {t('common:weightCheckIn.currentWeight', 'Current Weight')}
                        </label>
                        <div className="flex items-center justify-center gap-4">
                          <button
                            className="h-12 w-12 rounded-full border-2 border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center transition-all shadow-sm hover:shadow disabled:opacity-50"
                            onClick={() => setWeight(prev => parseFloat((Math.max(30, prev - 0.5)).toFixed(1)))}
                            disabled={isAddingWeight || weight <= 30}
                          >
                            <ChevronDown className="w-6 h-6 text-gray-600" />
                          </button>
                          <div className="relative">
                            <input
                              type="number"
                              value={weight.toFixed(1)}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (!isNaN(value) && value > 0) {
                                  setWeight(value);
                                }
                              }}
                              className="w-28 h-16 text-center text-3xl font-bold border-2 border-gray-200 rounded-2xl bg-white focus:border-[#0CC5BA] focus:ring-2 focus:ring-[#0CC5BA]/20 outline-none transition-all shadow-sm"
                              step="0.1"
                              min="30"
                              max="300"
                              disabled={isAddingWeight}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">kg</span>
                          </div>
                          <button
                            className="h-12 w-12 rounded-full border-2 border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center transition-all shadow-sm hover:shadow disabled:opacity-50"
                            onClick={() => setWeight(prev => parseFloat((prev + 0.5).toFixed(1)))}
                            disabled={isAddingWeight}
                          >
                            <ChevronUp className="w-6 h-6 text-gray-600" />
                          </button>
                        </div>
                      </div>

                      {/* Progress Indicator */}
                      {weightChange && (
                        <div className="flex items-center justify-center gap-2 text-sm">
                          {weightChange.direction === 'down' ? (
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${isGaining ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
                              <TrendingDown className="w-4 h-4" />
                              <span className="font-medium">{weightChange.value} kg since last check-in</span>
                            </div>
                          ) : weightChange.direction === 'up' ? (
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${isGaining ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                              <TrendingUp className="w-4 h-4" />
                              <span className="font-medium">+{weightChange.value} kg since last check-in</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 text-gray-500">
                              <Minus className="w-4 h-4" />
                              <span className="font-medium">No change</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Goal Progress */}
                      <div className="flex items-center justify-between text-sm px-3 py-3 bg-[#0CC5BA]/5 rounded-xl border border-[#0CC5BA]/10">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-[#0CC5BA]" />
                          <span className="text-gray-700 font-medium">Goal: {goalWeight} kg</span>
                        </div>
                        <span className="text-[#0CC5BA] font-semibold">{distanceToGoal} kg to go</span>
                      </div>
                    </div>
                    
                    {/* Footer Buttons */}
                    <div className="mt-6 flex gap-3">
                      <button
                        onClick={handleDismiss}
                        className="flex-1 rounded-xl h-12 border-2 border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium transition-all"
                        disabled={isAddingWeight}
                      >
                        {t('common:weightCheckIn.remindLater', 'Remind Me Later')}
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={isAddingWeight}
                        className="flex-1 rounded-xl h-12 bg-gradient-to-r from-[#0CC5BA] to-[#0AA59C] hover:shadow-lg hover:shadow-[#0CC5BA]/25 text-white font-medium transition-all disabled:opacity-50"
                      >
                        {t('common:weightCheckIn.updateWeight', 'Update Weight')}
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 'progress' && (
                  <motion.div
                    key="progress"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="p-10 text-center"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="mx-auto w-20 h-20 bg-gradient-to-br from-[#0CC5BA] to-[#0AA59C] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-[#0CC5BA]/25"
                    >
                      <Scale className="w-10 h-10 text-white" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {t('common:weightCheckIn.savingProgress', 'Saving Your Progress...')}
                    </h3>
                    <p className="text-gray-500">
                      {t('common:weightCheckIn.analyzingData', 'Analyzing your weight data')}
                    </p>
                  </motion.div>
                )}

                {step === 'recalculating' && (
                  <motion.div
                    key="recalculating"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="p-10 text-center"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="mx-auto w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-orange-500/25"
                    >
                      <Flame className="w-10 h-10 text-white" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {t('common:weightCheckIn.recalculating', 'Recalculating Calories...')}
                    </h3>
                    <p className="text-gray-500">
                      {t('common:weightCheckIn.optimizing', 'Optimizing your nutrition plan')}
                    </p>
                  </motion.div>
                )}

                {step === 'complete' && (
                  <motion.div
                    key="complete"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="p-10 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 10 }}
                      className="mx-auto w-20 h-20 bg-gradient-to-br from-green-400 to-green-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-green-500/25"
                    >
                      <CheckCircle className="w-10 h-10 text-white" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {t('common:weightCheckIn.allDone', 'All Done!')}
                    </h3>
                    <p className="text-gray-500">
                      {t('common:weightCheckIn.updatedSuccessfully', 'Your goals have been updated')}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
