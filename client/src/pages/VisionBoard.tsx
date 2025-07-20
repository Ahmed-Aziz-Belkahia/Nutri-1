import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";

interface VisionBoardData {
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
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
        title: "Błąd",
        description: "Nie udało się wczytać tablicy wizji.",
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
          <p className="text-gray-600">Ładowanie tablicy wizji...</p>
        </motion.div>
      </div>
    );
  }

  if (!visionBoardData) {
    return (
      <div className="h-screen bg-gradient-to-br from-[#0CC5BA]/20 via-purple-500/10 to-blue-500/20 flex items-center justify-center overflow-hidden">
        <Card className="p-6 text-center">
          <p className="text-gray-600 mb-4">Nie udało się wczytać tablicy wizji.</p>
          <Button onClick={() => setLocation("/dashboard")}>
            Przejdź do pulpitu
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
                KROK 12 Z 13
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
              Twoja ścieżka do celu
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
                Twoja Tablica Wizji
              </h2>
              <p className="text-gray-600 text-sm">
                Spersonalizowany plan żywieniowy dla Twoich celów
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
                    Twoje Dzienne Makroskładniki
                  </h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-500 mb-1">
                      {visionBoardData.macros.calories}
                    </div>
                    <div className="text-sm text-gray-600">Kalorie</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-500 mb-1">
                      {visionBoardData.macros.protein}g
                    </div>
                    <div className="text-sm text-gray-600">Białko</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-500 mb-1">
                      {visionBoardData.macros.carbs}g
                    </div>
                    <div className="text-sm text-gray-600">Węglowodany</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-600 mb-1">
                      {visionBoardData.macros.fat}g
                    </div>
                    <div className="text-sm text-gray-600">Tłuszcze</div>
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
                Wstecz
              </Button>
              
              <Button
                onClick={handleContinue}
                className="bg-gradient-to-r from-[#0CC5BA] to-blue-500 text-white px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                Rozpocznij!
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>
        </Card>
      </div>
    </div>
  );
}