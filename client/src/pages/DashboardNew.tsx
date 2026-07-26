import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import BaseLayout from "@/components/layouts/BaseLayout";
import CalendarSelector from "@/components/dashboard/CalendarSelector";
import MacroCard from "@/components/dashboard/MacroCard";
import MealsSection from "@/components/dashboard/MealsSection";
import { useFoodLogsByDate, useDailyTotals } from "@/hooks/queries/useFoodLogs";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useQueryClient } from "@tanstack/react-query";
import { createInvalidator } from "@/lib/queryUtils";
import { queryKeys } from "@/lib/queryKeys";
import { useFoodLog } from "@/hooks/use-food-log";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle, Sparkles } from "lucide-react";
import { analyzeFoodImage } from "@/lib/vision";

// Helper function to get all days from the last 3 months + next 7 days
function getLast3MonthsPlus7Days() {
  const today = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = [];
  
  // Generate days for the last 90 days (approximately 3 months)
  for (let i = 89; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    
    days.push({
      date,
      dayName: dayNames[date.getDay()],
      dayNumber: date.getDate(),
      isToday: date.toDateString() === today.toDateString(),
      formattedDate: format(date, 'yyyy-MM-dd')
    });
  }
  
  // Add next 7 days after today
  for (let i = 1; i <= 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    days.push({
      date,
      dayName: dayNames[date.getDay()],
      dayNumber: date.getDate(),
      isToday: false,
      formattedDate: format(date, 'yyyy-MM-dd')
    });
  }
  
  return days;
}

export default function DashboardNew() {
  const { t } = useTranslation(['common']);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  
  // Convert selectedDate string to Date object for useFoodLog hook
  const selectedDateObj = useMemo(() => new Date(`${selectedDate}T12:00:00`), [selectedDate]);
  const { addFood } = useFoodLog(selectedDateObj);
  const [allDays] = useState(getLast3MonthsPlus7Days());
  const [currentMacroIndex, setCurrentMacroIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isProcessingManualFood, setIsProcessingManualFood] = useState(false);
  const [isAnalyzingFood, setIsAnalyzingFood] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [processingComplete, setProcessingComplete] = useState(false);

  // Fetch user profile for calorie goals (from WHO formula in onboarding)
  const { data: userProfile } = useUserProfile();

  // Fetch food logs for selected date using custom hook
  const { data: foodLogsData, isLoading: logsLoading } = useFoodLogsByDate(selectedDate);
  const foodLogs = foodLogsData?.logs || [];

  // Fetch daily totals for selected date using custom hook
  const { data: dailyTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 } } = useDailyTotals(selectedDate);

  // Debug log for selected date changes
  useEffect(() => {
    console.log('[DASHBOARD] Selected date changed to:', selectedDate);
  }, [selectedDate]);

  // Process pending manual food entry
  useEffect(() => {
    const processPendingManualFood = async () => {
      const pendingData = localStorage.getItem('pendingManualFood');
      if (!pendingData) return;

      try {
        setIsProcessingManualFood(true);
        setProcessingStep(t('common:dashboardNew.processing.preparing'));
        
        const foodData = JSON.parse(pendingData);
        console.log('[DASHBOARD] Processing pending manual food:', foodData);

        // Simulate progress steps
        setTimeout(() => setProcessingStep(t('common:dashboardNew.processing.adding')), 500);
        setTimeout(() => setProcessingStep(t('common:dashboardNew.processing.updating')), 1000);

        // Add the food to the log
        const result = await addFood(foodData);
        console.log('[DASHBOARD] Food added successfully:', result);

        setProcessingStep(t('common:dashboardNew.processing.complete'));
        setProcessingComplete(true);

        // Clear the pending data immediately
        localStorage.removeItem('pendingManualFood');

        // Force immediate refetch of food logs using the correct query keys
        console.log('[DASHBOARD] Refetching food logs for date:', selectedDate);
        
        await queryClient.refetchQueries({ 
          queryKey: ['food-logs', 'date', selectedDate],
          type: 'active',
          exact: true
        });

        await queryClient.refetchQueries({ 
          queryKey: ['food-logs', 'totals', selectedDate],
          type: 'active',
          exact: true
        });

        // Also invalidate all food logs to be safe
        await queryClient.invalidateQueries({ 
          queryKey: ['food-logs'],
          refetchType: 'active'
        });

        // Invalidate recent food logs for recipes page
        await queryClient.invalidateQueries({ 
          queryKey: ['/api/food-logs/recent-all'],
          refetchType: 'active'
        });

        console.log('[DASHBOARD] Queries refreshed, showing success message');

        toast({
          title: t('common:dashboardNew.success.title'),
          description: t('common:dashboardNew.success.addedFood', { name: foodData.name }),
        });

        // Hide the processing screen after showing success
        setTimeout(() => {
          setIsProcessingManualFood(false);
          setProcessingComplete(false);
        }, 1500);

      } catch (error) {
        console.error('[DASHBOARD] Error processing manual food:', error);
        
        toast({
          variant: "destructive",
          title: t('common:dashboardNew.error.title'),
          description: error instanceof Error ? error.message : t('common:dashboardNew.error.failedToAdd'),
        });

        localStorage.removeItem('pendingManualFood');
        setIsProcessingManualFood(false);
        setProcessingComplete(false);
      }
    };

    processPendingManualFood();
  }, []); // Only run once on mount

  // Process pending AI food image analysis
  useEffect(() => {
    const processPendingAIImage = async () => {
      const imageData = localStorage.getItem('pendingFoodImage');
      const pendingName = localStorage.getItem('pendingFoodName');
      
      if (!imageData) return;

      try {
        console.log('[DASHBOARD] Detected pending AI food image, starting analysis...');
        setIsAnalyzingFood(true);
        setProcessingStep(t('common:dashboardNew.processing.analyzing'));
        
        // Step 1: Analyze image with Vision API
        const analysisResult = await analyzeFoodImage(imageData);
        console.log('[DASHBOARD] AI analysis complete:', analysisResult);
        
        setProcessingStep(t('common:dashboardNew.processing.adding'));
        
        // Step 2: Add to food log
        const logResult = await addFood({
          ...analysisResult,
          isEstimate: true,
          image: imageData // Store image locally if supported or just keep for this session
        });
        
        console.log('[DASHBOARD] AI food log added successfully:', logResult);
        setProcessingStep(t('common:dashboardNew.processing.complete'));
        setProcessingComplete(true);
        
        // Clear storage
        localStorage.removeItem('pendingFoodImage');
        localStorage.removeItem('pendingFoodName');
        
        // Invalidate queries
        await queryClient.invalidateQueries({ queryKey: queryKeys.foodLogs.byDate(selectedDate) });
        await queryClient.invalidateQueries({ queryKey: queryKeys.foodLogs.totals(selectedDate) });
        
        toast({
          title: t('common:dashboardNew.success.aiTitle'),
          description: t('common:dashboardNew.success.addedFood', { name: analysisResult.name }),
        });

        setTimeout(() => {
          setIsAnalyzingFood(false);
          setProcessingComplete(false);
        }, 2000);

      } catch (error) {
        console.error('[DASHBOARD] AI Analysis Error:', error);
        localStorage.removeItem('pendingFoodImage');
        localStorage.removeItem('pendingFoodName');
        
        toast({
          variant: "destructive",
          title: t('common:dashboardNew.error.aiTitle'),
          description: error instanceof Error ? error.message : t('common:dashboardNew.error.failedToAnalyze'),
        });
        
        setIsAnalyzingFood(false);
        setProcessingComplete(false);
      }
    };

    processPendingAIImage();
  }, []); // Only run once on mount

  // Auto-scroll carousel every 5 seconds
  useEffect(() => {
    if (isPaused) return;

    const autoScrollInterval = setInterval(() => {
      setCurrentMacroIndex((prev) => (prev === 3 ? 0 : prev + 1)); // 4 macros (0-3)
    }, 5000);

    return () => clearInterval(autoScrollInterval);
  }, [isPaused]);

  // Scroll to today's date on mount
  useEffect(() => {
    const todayIndex = allDays.findIndex(day => day.isToday);
    if (todayIndex !== -1) {
      const scrollContainer = document.querySelector('.day-selector-scroll');
      if (scrollContainer) {
        const dayButton = scrollContainer.children[todayIndex] as HTMLElement;
        if (dayButton) {
          // Center the today button
          const containerWidth = scrollContainer.clientWidth;
          const buttonOffset = dayButton.offsetLeft;
          const buttonWidth = dayButton.offsetWidth;
          scrollContainer.scrollLeft = buttonOffset - (containerWidth / 2) + (buttonWidth / 2);
        }
      }
    }
  }, [allDays]);

  const handleDayClick = (formattedDate: string) => {
    setSelectedDate(formattedDate);
  };

  const handlePreviousMacro = () => {
    setIsPaused(true);
    setCurrentMacroIndex((prev) => (prev === 0 ? 3 : prev - 1)); // 4 macros (0-3)
  };

  const handleNextMacro = () => {
    setIsPaused(true);
    setCurrentMacroIndex((prev) => (prev === 3 ? 0 : prev + 1)); // 4 macros (0-3)
  };

  const handleDotClick = (index: number) => {
    setIsPaused(true);
    setCurrentMacroIndex(index);
  };

  return (
    <BaseLayout>
      {/* Manual & AI Food Processing Screen */}
      {(isProcessingManualFood || isAnalyzingFood) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#0E95A7] via-[#1E6F7D] to-[#0D8495]"
        >
          <div className="text-center px-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-24 h-24 mx-auto mb-6 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center relative"
            >
              {processingComplete ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <CheckCircle className="w-12 h-12 text-white" />
                </motion.div>
              ) : isAnalyzingFood ? (
                <div className="relative">
                  <Loader2 className="w-12 h-12 text-white animate-spin" />
                  <motion.div
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 1, 0.5]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Sparkles className="w-6 h-6 text-yellow-300" />
                  </motion.div>
                </div>
              ) : (
                <Loader2 className="w-12 h-12 text-white animate-spin" />
              )}
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-bold text-white mb-4"
            >
              {processingComplete 
                ? t('common:dashboardNew.processing.added') 
                : isAnalyzingFood 
                  ? t('common:dashboardNew.processing.aiCooking')
                  : t('common:dashboardNew.processing.processing')}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-white/90 text-lg"
            >
              {processingStep}
            </motion.p>

            {/* Progress dots */}
            {!processingComplete && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex justify-center gap-2 mt-8"
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                    className="w-2 h-2 bg-white rounded-full"
                  />
                ))}
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      <CalendarSelector 
        allDays={allDays}
        selectedDate={selectedDate}
        onDateSelect={handleDayClick}
      />

      <MacroCard 
        dailyTotals={dailyTotals}
        currentCardIndex={currentMacroIndex}
        onPrevious={handlePreviousMacro}
        onNext={handleNextMacro}
        onDotClick={handleDotClick}
        userProfile={userProfile}
      />

      <MealsSection
        foodLogs={foodLogs}
        isLoading={logsLoading}
      />
    </BaseLayout>
  );
}