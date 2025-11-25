import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Info } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";

interface VisionBoardData {
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  bmr?: number;
  tdee?: number;
  calorieAdjustment?: number;
  timeline: Array<{
    week: number;
    weight: number;
    goal: string;
    energy: number;
  }>;
  motivation: {
    title: string;
    tips: string[];
    inspiration: string;
  };
  personalData: {
    age: number;
    gender: string;
    currentWeight: number;
    goalWeight: number;
    height: number;
    activityLevel: string;
    weightGoal: string;
    perfectGoal: string;
  };
}

export default function VisionBoard() {
  const [visionBoardData, setVisionBoardData] = useState<VisionBoardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showFormulaExplanation, setShowFormulaExplanation] = useState(false);
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    fetchVisionBoard();
  }, []);

  const fetchVisionBoard = async () => {
    try {
      const response = await fetch('/api/vision-board', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        if (response.status === 404) {
          toast({
            variant: "destructive",
            title: "Profil niekompletny",
            description: "Przejdź przez proces konfiguracji najpierw.",
          });
          setLocation("/onboarding");
          return;
        }
        throw new Error('Failed to fetch vision board');
      }

      const data = await response.json();
      setVisionBoardData(data.visionBoard);
    } catch (error) {
      console.error('Error fetching vision board:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load vision board.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    setLocation("/dashboard");
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-gradient-to-br from-[#0CC5BA]/20 via-purple-500/10 to-blue-500/20 flex items-center justify-center overflow-hidden">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-16 h-16 border-4 border-[#0CC5BA] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t('common:visionBoard.loading')}</p>
        </motion.div>
      </div>
    );
  }

  if (!visionBoardData) {
    return (
      <div className="h-screen bg-gradient-to-br from-[#0CC5BA]/20 via-purple-500/10 to-blue-500/20 flex items-center justify-center overflow-hidden">
        <Card className="p-6 text-center">
          <p className="text-gray-600 mb-4">{t('common:visionBoard.failed')}</p>
          <Button onClick={() => setLocation("/dashboard")}>
            {t('common:visionBoard.goToDashboard')}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-[#0CC5BA]/20 via-purple-500/10 to-blue-500/20 p-2 flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-[500px] relative">
        <Card className="backdrop-blur-xl bg-white/90 border-0 shadow-2xl shadow-[#0CC5BA]/10 rounded-[40px] overflow-hidden">
          {/* Progress header */}
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-sm font-medium"
              >
                {t('common:visionBoard.step')} 12 {t('common:visionBoard.of')} 13
              </motion.div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center"
              >
                <span className="text-white font-bold text-lg">12</span>
              </motion.div>
            </div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-2xl font-bold"
            >
              {t('common:visionBoard.title')}
            </motion.h1>
            {/* Progress dots */}
            <div className="flex items-center gap-2 mt-4">
              {Array.from({ length: 13 }, (_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i < 12 ? 'bg-white' : 'bg-white/30'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="p-8">
            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-8"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {t('common:visionBoard.title')}
              </h2>
              <p className="text-gray-600 text-sm">
                {t('common:visionBoard.sections.personalInfo')}
              </p>
            </motion.div>

            {/* Daily Macros Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-8"
            >
              <Card className="p-6 bg-gray-50 border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-[#0CC5BA]"></div>
                  <h3 className="font-semibold text-gray-900">
                    {t('common:visionBoard.sections.macros')}
                  </h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-500 mb-1">
                      {visionBoardData.macros.calories}
                    </div>
                    <div className="text-sm text-gray-600">{t('common:visionBoard.labels.calories')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-500 mb-1">
                      {visionBoardData.macros.protein}g
                    </div>
                    <div className="text-sm text-gray-600">{t('common:visionBoard.labels.protein')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-500 mb-1">
                      {visionBoardData.macros.carbs}g
                    </div>
                    <div className="text-sm text-gray-600">{t('common:visionBoard.labels.carbs')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-600 mb-1">
                      {visionBoardData.macros.fat}g
                    </div>
                    <div className="text-sm text-gray-600">{t('common:visionBoard.labels.fat')}</div>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Motivation Section */}
            {visionBoardData.motivation && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-8"
              >
                <Card className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <h3 className="font-semibold text-gray-900">
                      {visionBoardData.motivation.title}
                    </h3>
                  </div>
                  <p className="text-gray-700 mb-4 italic">
                    {visionBoardData.motivation.inspiration}
                  </p>
                  {visionBoardData.motivation.tips && (
                    <div className="space-y-2">
                      {visionBoardData.motivation.tips.map((tip: string, index: number) => (
                        <div key={index} className="flex items-start gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-400 mt-2 flex-shrink-0"></div>
                          <p className="text-sm text-gray-600">{tip}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </motion.div>
            )}

            {/* Formula Explanation Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mb-8"
            >
              <button
                onClick={() => setShowFormulaExplanation(!showFormulaExplanation)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-500" />
                  <span className="font-semibold text-gray-900">
                    Jak obliczamy Twoje dzienne zapotrzebowanie?
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
                          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            1. BMR (Podstawowa Przemiana Materii)
                          </h4>
                          <p className="text-sm text-gray-600 mb-2">
                            Używamy wzorów WHO/FAO/UNU, które są najbardziej dokładne:
                          </p>
                          {visionBoardData?.personalData.gender === 'male' ? (
                            <div className="bg-blue-50 p-3 rounded-lg text-sm">
                              {visionBoardData?.personalData.age >= 18 && visionBoardData?.personalData.age <= 29 && (
                                <p className="font-mono">BMR = (15.057 × {visionBoardData?.personalData.currentWeight}kg) + (1.004 × {visionBoardData?.personalData.height}cm) + 705</p>
                              )}
                              {visionBoardData?.personalData.age >= 30 && visionBoardData?.personalData.age <= 59 && (
                                <p className="font-mono">BMR = (11.472 × {visionBoardData?.personalData.currentWeight}kg) + (8.73 × {visionBoardData?.personalData.height}cm) + 873</p>
                              )}
                              {visionBoardData?.personalData.age >= 60 && (
                                <p className="font-mono">BMR = (11.711 × {visionBoardData?.personalData.currentWeight}kg) + (5.878 × {visionBoardData?.personalData.height}cm) + 587</p>
                              )}
                              <p className="mt-2 font-semibold">= {visionBoardData?.bmr} kcal/dzień</p>
                            </div>
                          ) : (
                            <div className="bg-pink-50 p-3 rounded-lg text-sm">
                              {visionBoardData?.personalData.age >= 18 && visionBoardData?.personalData.age <= 29 && (
                                <p className="font-mono">BMR = (14.818 × {visionBoardData?.personalData.currentWeight}kg) + (4.65 × {visionBoardData?.personalData.height}cm) + 486</p>
                              )}
                              {visionBoardData?.personalData.age >= 30 && visionBoardData?.personalData.age <= 59 && (
                                <p className="font-mono">BMR = (8.126 × {visionBoardData?.personalData.currentWeight}kg) + (8.45 × {visionBoardData?.personalData.height}cm) + 845</p>
                              )}
                              {visionBoardData?.personalData.age >= 60 && (
                                <p className="font-mono">BMR = (9.082 × {visionBoardData?.personalData.currentWeight}kg) + (6.588 × {visionBoardData?.personalData.height}cm) + 658</p>
                              )}
                              <p className="mt-2 font-semibold">= {visionBoardData?.bmr} kcal/dzień</p>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            To energia potrzebna Twojemu organizmowi w całkowitym spoczynku.
                          </p>
                        </div>

                        {/* TDEE Section */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            2. TDEE (Całkowite Dzienne Wydatkowanie Energii)
                          </h4>
                          <p className="text-sm text-gray-600 mb-2">
                            BMR × współczynnik aktywności fizycznej:
                          </p>
                          <div className="bg-green-50 p-3 rounded-lg text-sm">
                            <p className="font-mono">
                              TDEE = {visionBoardData?.bmr} × {
                                visionBoardData?.personalData.activityLevel === 'sedentary' ? '1.2 (siedzący tryb życia)' :
                                visionBoardData?.personalData.activityLevel === 'light' ? '1.375 (lekka aktywność)' :
                                visionBoardData?.personalData.activityLevel === 'moderate' ? '1.55 (umiarkowana aktywność)' :
                                visionBoardData?.personalData.activityLevel === 'active' ? '1.725 (aktywny tryb życia)' :
                                '1.9 (bardzo aktywny)'
                              }
                            </p>
                            <p className="mt-2 font-semibold">= {visionBoardData?.tdee} kcal/dzień</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            To energia, którą spalasz każdego dnia z uwzględnieniem aktywności.
                          </p>
                        </div>

                        {/* Goal Adjustment */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                            3. Dostosowanie do Twojego Celu
                          </h4>
                          <div className="bg-orange-50 p-3 rounded-lg text-sm">
                            {visionBoardData?.personalData.weightGoal === 'loss' && (
                              <>
                                <p>Cel: <strong>Utrata wagi</strong></p>
                                <p className="font-mono mt-2">
                                  Dzienne kalorie = {visionBoardData?.tdee} - 500 kcal
                                </p>
                                <p className="text-xs text-gray-600 mt-2">
                                  Deficyt 500 kcal/dzień = ~0.5 kg utraty wagi tygodniowo
                                </p>
                              </>
                            )}
                            {visionBoardData?.personalData.weightGoal === 'gain' && (
                              <>
                                <p>Cel: <strong>Przyrost masy</strong></p>
                                <p className="font-mono mt-2">
                                  Dzienne kalorie = {visionBoardData?.tdee} + 300 kcal
                                </p>
                                <p className="text-xs text-gray-600 mt-2">
                                  Nadwyżka 300 kcal/dzień dla zdrowego przyrostu masy
                                </p>
                              </>
                            )}
                            {visionBoardData?.personalData.weightGoal === 'maintain' && (
                              <>
                                <p>Cel: <strong>Utrzymanie wagi</strong></p>
                                <p className="font-mono mt-2">
                                  Dzienne kalorie = {visionBoardData?.tdee} kcal
                                </p>
                                <p className="text-xs text-gray-600 mt-2">
                                  Równowaga energetyczna dla utrzymania obecnej wagi
                                </p>
                              </>
                            )}
                            <p className="mt-3 font-semibold text-orange-600">
                              = {visionBoardData?.macros.calories} kcal/dzień
                            </p>
                          </div>
                        </div>

                        {/* Macronutrients */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                            4. Rozkład Makroskładników
                          </h4>
                          <p className="text-sm text-gray-600 mb-2">
                            Optymalne proporcje dla Twojego celu:
                          </p>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                              <span className="text-sm">Białko (25-30%)</span>
                              <span className="font-semibold text-blue-600">{visionBoardData?.macros.protein}g</span>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                              <span className="text-sm">Węglowodany (35-45%)</span>
                              <span className="font-semibold text-green-600">{visionBoardData?.macros.carbs}g</span>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                              <span className="text-sm">Tłuszcze (30-35%)</span>
                              <span className="font-semibold text-yellow-600">{visionBoardData?.macros.fat}g</span>
                            </div>
                          </div>
                        </div>

                        {/* Source Reference */}
                        <div className="pt-4 border-t border-gray-200">
                          <p className="text-xs text-gray-500">
                            <strong>Źródło:</strong> WHO/FAO/UNU Expert Consultation on Energy and Protein Requirements (2004)
                          </p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Navigation buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-between"
            >
              <Button
                variant="ghost"
                onClick={() => setLocation("/onboarding-completion")}
                className="flex items-center gap-2 text-gray-600"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('common:simpleMealQuiz.actions.back')}
              </Button>
              
              <Button
                onClick={handleContinue}
                className="bg-gradient-to-r from-[#0CC5BA] to-blue-500 text-white px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                {t('common:visionBoard.buttons.continue')}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>
        </Card>
      </div>
    </div>
  );
}