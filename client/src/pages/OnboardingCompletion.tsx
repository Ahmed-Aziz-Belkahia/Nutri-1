import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, ArrowRight, TrendingDown, Calendar, Target, Flame, Info, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { calculateDailyCalories, calculateMacros } from "@/lib/nutrition";

interface OnboardingCompletionProps {
  formData: {
    age: string;
    gender: string;
    height: string;
    weight: string;
    goalWeight: string;
    weightGoal: string;
    activityLevel: string;
  };
}

export default function OnboardingCompletion({ formData }: OnboardingCompletionProps) {
  const { t } = useTranslation(['common']);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showFormulaExplanation, setShowFormulaExplanation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useUser();

  // Calculate macros and timeline based on user data
  const age = parseInt(formData.age);
  const weight = parseFloat(formData.weight);
  const goalWeight = parseFloat(formData.goalWeight);
  const height = parseFloat(formData.height);
  const isMale = formData.gender === "male";

  const dailyCalories = calculateDailyCalories(
    age,
    weight,
    height,
    formData.activityLevel,
    formData.weightGoal as "maintain" | "lose" | "gain",
    isMale  // Pass the gender parameter
  );

  // Calculate BMR and TDEE for explanation
  const calculateBMR = (age: number, weight: number, height: number, isMale: boolean): number => {
    // Mifflin-St Jeor: BMR = (10 × weight) + (6.25 × height) - (5 × age) + s
    // s = +5 for males, -161 for females
    const baseCalories = 10 * weight + 6.25 * height - 5 * age;
    return isMale ? baseCalories + 5 : baseCalories - 161;
  };

  const activityMultipliers: { [key: string]: number } = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9
  };

  const bmr = Math.round(calculateBMR(age, weight, height, isMale));
  const activityMultiplier = activityMultipliers[formData.activityLevel] || 1.2;
  const tdee = Math.round(bmr * activityMultiplier);

  const macros = calculateMacros(dailyCalories);
  
  // Calculate timeline: 0.5kg per week weight change
  const weightDifference = Math.abs(weight - goalWeight);
  const weeksToGoal = Math.ceil(weightDifference / 0.5);
  const getGoalText = () => {
    if (formData.weightGoal === "loss") return t('common:onboardingCompletion.goalText.lose');
    if (formData.weightGoal === "gain") return t('common:onboardingCompletion.goalText.gain');
    return t('common:onboardingCompletion.goalText.maintain');
  };
  const goalText = getGoalText();

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/user/profile-image', {
        method: 'POST',
        body: formData,
      });

        if (!response.ok) {
          throw new Error(t('common:onboardingCompletion.toast.uploadFailed'));
        }      const result = await response.json();
      setProfileImage(result.imageUrl);
      
      toast({
        title: t('common:onboardingCompletion.toast.profileUploaded'),
        description: t('common:onboardingCompletion.toast.photoSaved'),
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: t('common:onboardingCompletion.toast.uploadFailed'),
        description: t('common:onboardingCompletion.toast.tryAgain'),
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Upload file
      handleImageUpload(file);
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      // Create FormData for the complete-onboarding endpoint
      const formDataToSend = new FormData();
      
      const profileData = {
        height,
        weight,
        goalWeight,
        weightGoal: formData.weightGoal,
        activityLevel: formData.activityLevel,
        calorieGoal: dailyCalories,
        proteinGoal: macros.protein,
        carbsGoal: macros.carbs,
        fatGoal: macros.fat,
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

      formDataToSend.append('profile', JSON.stringify(profileData));

      const response = await fetch('/api/register/complete-onboarding', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        throw new Error(t('common:onboardingCompletion.toast.configError'));
      }

      toast({
        title: t('common:onboardingCompletion.toast.profileCompleted'),
        description: t('common:onboardingCompletion.toast.planReady'),
      });

      setLocation("/vision-board");
    } catch (error) {
      console.error('Completion error:', error);
      toast({
        variant: "destructive",
        title: t('common:onboardingCompletion.toast.configError'),
        description: t('common:onboardingCompletion.toast.tryAgain'),
      });
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-[#0CC5BA]/20 via-purple-500/10 to-blue-500/20 p-2 flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#0CC5BA]/20 rounded-full filter blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full filter blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="w-full max-w-[500px] relative">
        <Card className="backdrop-blur-xl bg-white/70 border-0 shadow-2xl shadow-[#0CC5BA]/10 rounded-[40px] overflow-hidden">
          {/* Progress bar - Step 8 of 8 */}
          <div className="h-1 bg-gradient-to-r from-[#0CC5BA] via-purple-500 to-blue-500" />

          <div className="p-6">
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-[#0CC5BA] to-blue-500 flex items-center justify-center mb-4 mx-auto"
              >
                <span className="text-white font-bold text-lg">{t('common:onboardingCompletion.stepNumber')}</span>
              </motion.div>
              <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-2xl font-bold bg-gradient-to-r from-[#0CC5BA] to-blue-500 bg-clip-text text-transparent mb-2"
              >
                {t('common:onboardingCompletion.title')}
              </motion.h1>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-gray-600 text-sm"
              >
                {t('common:onboardingCompletion.subtitle')}
              </motion.p>
            </div>

            {/* Profile Picture Upload */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <div 
                className="relative w-32 h-32 mx-auto mb-4 rounded-full border-4 border-dashed border-[#0CC5BA]/30 flex items-center justify-center cursor-pointer hover:border-[#0CC5BA]/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {profileImage ? (
                  <img 
                    src={profileImage} 
                    alt="Profile" 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="text-center">
                    <Upload className="w-8 h-8 text-[#0CC5BA] mx-auto mb-2" />
                    <span className="text-xs text-gray-500">{t('common:onboardingCompletion.uploadText')}</span>
                  </div>
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <p className="text-center text-xs text-gray-500">
                {t('common:onboardingCompletion.profileImageDescription')}
              </p>
            </motion.div>

            {/* Daily Calorie Needs */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mb-6"
            >
              <div className="text-center mb-4">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-3">
                  <Flame className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('common:onboardingCompletion.calorieNeedTitle')}
                </h3>
                <p className="text-sm text-gray-600">
                  {t('common:onboardingCompletion.calorieNeedSubtitle')}
                </p>
              </div>

              <Card className="bg-orange-50 border-orange-200 p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                    <Flame className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {t('common:onboardingCompletion.yourRequirement')}
                  </span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {dailyCalories.toLocaleString()}
                  <span className="text-sm font-normal text-gray-600 ml-1">kcal</span>
                </div>
                <p className="text-xs text-gray-600">{t('common:onboardingCompletion.perDay')}</p>
              </Card>
            </motion.div>

            {/* Timeline */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mb-8"
            >
              <Card className="bg-blue-50 border-blue-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="w-6 h-6 text-blue-500" />
                  <div>
                    <h4 className="font-semibold text-gray-900">{t('common:onboardingCompletion.timelineTitle')}</h4>
                    <p className="text-sm text-gray-600">{t('common:onboardingCompletion.timelineSubtitle')}</p>
                  </div>
                </div>
                
                <div className="text-center mb-4">
                  <p className="text-sm text-gray-600">
                    {t('common:onboardingCompletion.atCurrentPace')}
                  </p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{weight}kg</div>
                    <div className="text-xs text-gray-500">{t('common:onboardingCompletion.currentWeight')}</div>
                  </div>
                  
                  <div className="flex-1 mx-4">
                    <div className="flex items-center justify-center gap-2">
                      <TrendingDown className="w-5 h-5 text-blue-500" />
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">{weeksToGoal} {t('common:onboardingCompletion.weeks')}</div>
                        <div className="text-xs text-gray-500">{t('common:onboardingCompletion.toGoal')}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#0CC5BA]">{goalWeight}kg</div>
                    <div className="text-xs text-gray-500">{t('common:onboardingCompletion.goal')}</div>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Macros breakdown */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mb-8"
            >
              <div className="grid grid-cols-3 gap-3">
                <Card className="p-4 text-center bg-green-50 border-green-200">
                  <div className="text-lg font-bold text-green-700">{macros.protein}g</div>
                  <div className="text-xs text-gray-600">{t('common:onboardingCompletion.macros.protein')}</div>
                </Card>
                <Card className="p-4 text-center bg-yellow-50 border-yellow-200">
                  <div className="text-lg font-bold text-yellow-700">{macros.carbs}g</div>
                  <div className="text-xs text-gray-600">{t('common:onboardingCompletion.macros.carbs')}</div>
                </Card>
                <Card className="p-4 text-center bg-purple-50 border-purple-200">
                  <div className="text-lg font-bold text-purple-700">{macros.fat}g</div>
                  <div className="text-xs text-gray-600">{t('common:onboardingCompletion.macros.fat')}</div>
                </Card>
              </div>
            </motion.div>

            {/* Formula Explanation Dropdown */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mb-8"
            >
              <button
                onClick={() => setShowFormulaExplanation(!showFormulaExplanation)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-500" />
                  <span className="font-semibold text-gray-900 text-sm">
                    {t('common:onboardingCompletion.formulaTitle')}
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
                    <Card className="mt-2 p-6 bg-white border-gray-200">
                      <div className="space-y-4">
                        {/* BMR Section */}
                        <div>
                            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            1. {t('common:onboardingCompletion.bmrTitle')}
                          </h4>
                          <p className="text-xs text-gray-600 mb-2">
                            {t('common:onboardingCompletion.bmrDescription')}
                          </p>
                          <div className={`${isMale ? 'bg-blue-50' : 'bg-pink-50'} p-3 rounded-lg text-xs`}>
                            <p className="font-mono text-[10px]">
                              BMR = (10 × {weight}kg) + (6.25 × {height}cm) - (5 × {age}) {isMale ? '+ 5' : '- 161'}
                            </p>
                            <p className={`mt-2 font-semibold ${isMale ? 'text-blue-600' : 'text-pink-600'}`}>= {bmr} kcal/day</p>
                          </div>
                        </div>

                        {/* TDEE Section */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            2. {t('common:onboardingCompletion.tdeeTitle')}
                          </h4>
                          <p className="text-xs text-gray-600 mb-2">
                            {t('common:onboardingCompletion.tdeeDescription')}
                          </p>
                          <div className="bg-green-50 p-3 rounded-lg text-xs">
                            <p className="font-mono text-[10px]">
                              TDEE = {bmr} × {activityMultiplier} ({
                                formData.activityLevel === 'sedentary' ? t('common:onboardingCompletion.formula.tdee.activityLevels.sedentary') :
                                formData.activityLevel === 'light' ? t('common:onboardingCompletion.formula.tdee.activityLevels.light') :
                                formData.activityLevel === 'moderate' ? t('common:onboardingCompletion.formula.tdee.activityLevels.moderate') :
                                formData.activityLevel === 'active' ? t('common:onboardingCompletion.formula.tdee.activityLevels.active') :
                                t('common:onboardingCompletion.formula.tdee.activityLevels.veryActive')
                              })
                            </p>
                            <p className="mt-2 font-semibold text-green-600">= {tdee} kcal/day</p>
                          </div>
                        </div>

                        {/* Goal Adjustment */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                            3. {t('common:onboardingCompletion.goalAdjustmentTitle')}
                          </h4>
                          <div className="bg-orange-50 p-3 rounded-lg text-xs">
                            {formData.weightGoal === 'loss' && (
                              <>
                                <p>Goal: <strong>{t('common:onboardingCompletion.goalText.lose')}</strong></p>
                                <p className="font-mono text-[10px] mt-2">
                                  Daily calories = {tdee} - 500 kcal
                                </p>
                                <p className="text-[10px] text-gray-600 mt-1">
                                  {t('common:onboardingCompletion.lossDescription')}
                                </p>
                              </>
                            )}
                            {formData.weightGoal === 'gain' && (
                              <>
                                <p>Goal: <strong>{t('common:onboardingCompletion.goalText.gain')}</strong></p>
                                <p className="font-mono text-[10px] mt-2">
                                  Daily calories = {tdee} + 300 kcal
                                </p>
                                <p className="text-[10px] text-gray-600 mt-1">
                                  {t('common:onboardingCompletion.gainDescription')}
                                </p>
                              </>
                            )}
                            {formData.weightGoal === 'maintain' && (
                              <>
                                <p>Goal: <strong>{t('common:onboardingCompletion.goalText.maintain')}</strong></p>
                                <p className="font-mono text-[10px] mt-2">
                                  Daily calories = {tdee} kcal
                                </p>
                                <p className="text-[10px] text-gray-600 mt-1">
                                  {t('common:onboardingCompletion.maintainDescription')}
                                </p>
                              </>
                            )}
                            <p className="mt-3 font-semibold text-orange-600">
                              = {dailyCalories} kcal/day
                            </p>
                          </div>
                        </div>

                        {/* Source Reference */}
                        <div className="pt-3 border-t border-gray-200">
                          <p className="text-[10px] text-gray-500">
                            <strong>{t('common:onboardingCompletion.sourceLabel')}</strong> {t('common:onboardingCompletion.sourceText')}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Let's get it done button */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <Button
                onClick={handleComplete}
                disabled={isCompleting}
                className="w-full h-14 bg-gradient-to-r from-[#0CC5BA] to-blue-500 text-white rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity"
              >
                {isCompleting ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {t('common:onboardingCompletion.buttons.complete')}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        </Card>
      </div>
    </div>
  );
}