import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "../hooks/use-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { calculateDailyCalories, calculateMacros } from "../lib/nutrition";
import { ArrowLeft, ChevronUp, ChevronDown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useLocation } from "wouter";
import HeightWeightInput from '@/components/HeightWeightInput';
import { NumberWheel } from "@/components/NumberWheel";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import OnboardingCompletion from "./OnboardingCompletion";

type WeightGoal = "gain" | "lose" | "maintain";

type Step = {
  id: number;
  question: string;
  description?: string;
  type: "gender" | "age" | "height_weight" | "weight_goal" | "goal_weight" | "activity" | "experience" | "completion";
};

const steps: Step[] = [
  {
    id: 1,
    question: "What is your gender?",
    description: "We'll personalize your experience based on your gender",
    type: "gender",
  },
  {
    id: 2,
    question: "How old are you?",
    description: "Your age helps us determine your nutritional needs",
    type: "age",
  },
  {
    id: 3,
    question: "Height & Weight",
    description: "This will be used to calibrate your custom plan.",
    type: "height_weight",
  },
  {
    id: 4,
    question: "How many workouts do you do per week?",
    description: "This will be used to calibrate your custom plan.",
    type: "activity",
  },
  {
    id: 5,
    question: "What's your weight goal?",
    description: "Tell us what you want to achieve",
    type: "weight_goal",
  },
  {
    id: 6,
    question: "Your Goal Weight",
    description: "This will be used to calibrate your custom plan.",
    type: "goal_weight",
  },
  {
    id: 7,
    question: "Have you tried other calorie tracking apps?",
    type: "experience",
  },
  {
    id: 8,
    question: "Complete Your Profile",
    description: "Add your profile picture and review your personalized plan",
    type: "completion",
  }
];

export default function Onboarding() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    gender: "",
    age: "25",
    heightFt: "5",
    heightIn: "8",
    height: "173", // for metric
    weight: "",
    weightGoal: "" as WeightGoal,
    goalWeight: "",
    activityLevel: "",
    experience: "",
    unitPreference: "imperial",
  });

  const handleNext = async () => {
    if (currentStep === steps.length - 1) {
      // Move to completion step
      setCurrentStep(currentStep + 1);
    } else if (currentStep === steps.length) {
      // This is handled by OnboardingCompletion component
      return;
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const currentStepData = steps[currentStep - 1];

  // If we're on the completion step, render the completion component
  if (currentStep === 8) {
    let height;
    if (formData.unitPreference === "imperial") {
      height = (parseFloat(formData.heightFt) * 12 + parseFloat(formData.heightIn)) * 2.54;
    } else {
      height = parseFloat(formData.height);
    }

    return (
      <OnboardingCompletion
        formData={{
          age: formData.age,
          gender: formData.gender,
          height: height.toString(),
          weight: formData.weight,
          goalWeight: formData.goalWeight,
          weightGoal: formData.weightGoal,
          activityLevel: formData.activityLevel,
        }}
      />
    );
  }

  const isCurrentStepValid = () => {
    switch (currentStepData.type) {
      case "gender":
        return !!formData.gender;
      case "age":
        return !!formData.age && !isNaN(Number(formData.age));
      case "height_weight":
        return !!formData.weight;
      case "weight_goal":
        return !!formData.weightGoal;
      case "goal_weight":
        return !!formData.goalWeight && !isNaN(Number(formData.goalWeight)) && Number(formData.goalWeight) > 0;
      case "activity":
        return !!formData.activityLevel;
      case "experience":
        return !!formData.experience;
      case "completion":
        return true; // Always valid, handled by completion component
      default:
        return false;
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
          <motion.div
            className="h-1 bg-gradient-to-r from-[#0CC5BA] via-purple-500 to-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${(currentStep / steps.length) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />

          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-2">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm font-medium text-[#0CC5BA]"
                >
                  Step {currentStep} of {steps.length}
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-3xl font-bold bg-gradient-to-r from-[#0CC5BA] via-purple-500 to-blue-500 bg-clip-text text-transparent"
                >
                  {currentStepData.question}
                </motion.h2>
                {currentStepData.description && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-gray-600"
                  >
                    {currentStepData.description}
                  </motion.p>
                )}
              </div>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#0CC5BA] to-blue-500 flex items-center justify-center text-white font-bold text-xl shadow-lg"
              >
                {currentStep}
              </motion.div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div className="space-y-6">
                  {currentStepData.type === "gender" && (
                    <div className="space-y-4">
                      {["male", "female", "other"].map((gender) => (
                        <motion.button
                          key={gender}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`w-full p-6 rounded-2xl border-2 transition-all duration-300 ${
                            formData.gender === gender
                              ? 'border-[#0CC5BA] bg-[#0CC5BA]/5'
                              : 'border-transparent bg-white/50 hover:bg-white'
                          }`}
                          onClick={() => setFormData({ ...formData, gender })}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              formData.gender === gender ? 'bg-[#0CC5BA]/10' : 'bg-gray-50'
                            }`}>
                              {gender === 'male' ? '👨' : gender === 'female' ? '👩' : '🧑'}
                            </div>
                            <span className="text-lg font-medium capitalize">
                              {gender}
                            </span>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                  {currentStepData.type === "experience" && (
                    <div className="space-y-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full p-4 justify-start rounded-xl border ${
                          formData.experience === "no" ? "bg-gray-900 text-white hover:bg-gray-800 border-transparent" : "hover:bg-gray-50 border-gray-200"
                        }`}
                        onClick={() => setFormData({ ...formData, experience: "no" })}
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-2xl">👎</div>
                          <div className="text-base font-medium">No</div>
                        </div>
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full p-4 justify-start rounded-xl border ${
                          formData.experience === "yes" ? "bg-gray-900 text-white hover:bg-gray-800 border-transparent" : "hover:bg-gray-50 border-gray-200"
                        }`}
                        onClick={() => setFormData({ ...formData, experience: "yes" })}
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-2xl">👍</div>
                          <div className="text-base font-medium">Yes</div>
                        </div>
                      </motion.button>
                    </div>
                  )}
                  {currentStepData.type === "age" && (
                    <div className="relative">
                      <NumberWheel
                        value={parseInt(formData.age) || 25}
                        onChange={(value) => setFormData({ ...formData, age: value.toString() })}
                        min={13}
                        max={100}
                        unit=""
                      />
                    </div>
                  )}
                  {currentStepData.type === "height_weight" && (
                    <HeightWeightInput
                      onHeightChange={({ ft, in: inches }) => {
                        setFormData(prev => ({
                          ...prev,
                          heightFt: (ft ?? 5).toString(),
                          heightIn: (inches ?? 8).toString()
                        }));
                      }}
                      onWeightChange={(weight) => {
                        setFormData(prev => ({
                          ...prev,
                          weight: weight.toString()
                        }));
                      }}
                    />
                  )}
                  {currentStepData.type === "goal_weight" && (
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <button
                          className={`px-4 py-2 rounded-full text-sm font-medium ${
                            formData.unitPreference === "imperial"
                              ? "bg-black text-white"
                              : "text-gray-500"
                          }`}
                          onClick={() => setFormData({ ...formData, unitPreference: "imperial" })}
                        >
                          Imperial
                        </button>
                        <button
                          className={`px-4 py-2 rounded-full text-sm font-medium ${
                            formData.unitPreference === "metric"
                              ? "bg-black text-white"
                              : "text-gray-500"
                          }`}
                          onClick={() => setFormData({ ...formData, unitPreference: "metric" })}
                        >
                          Metric
                        </button>
                      </div>

                      <div className="border rounded-xl bg-white p-4">
                        <div className="flex flex-col items-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full h-10 hover:bg-gray-50"
                            onClick={() => {
                              const currentWeight = parseInt(formData.goalWeight) || 150;
                              const increment = formData.unitPreference === "imperial" ? 1 : 0.5;
                              const newWeight = (currentWeight + increment).toString();
                              setFormData({ ...formData, goalWeight: newWeight });
                            }}
                          >
                            <ChevronUp className="h-5 w-5" />
                          </Button>
                          <div className="py-3 text-center">
                            <span className="text-3xl font-medium">
                              {formData.goalWeight || (formData.unitPreference === "imperial" ? "150" : "68")}
                            </span>
                            <span className="text-sm text-gray-500 ml-2">
                              {formData.unitPreference === "imperial" ? "lb" : "kg"}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full h-10 hover:bg-gray-50"
                            onClick={() => {
                              const currentWeight = parseInt(formData.goalWeight) || 150;
                              const decrement = formData.unitPreference === "imperial" ? 1 : 0.5;
                              const newWeight = Math.max(0, currentWeight - decrement).toString();
                              setFormData({ ...formData, goalWeight: newWeight });
                            }}
                          >
                            <ChevronDown className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  {currentStepData.type === "weight_goal" && (
                    <div className="space-y-3">
                      {[
                        {
                          value: "lose" as WeightGoal,
                          label: t('onboarding.questions.weightGoal.options.loss.label'),
                          description: t('onboarding.questions.weightGoal.options.loss.description'),
                          icon: <TrendingDown className="h-6 w-6" />
                        },
                        {
                          value: "maintain" as WeightGoal,
                          label: t('onboarding.questions.weightGoal.options.maintain.label'),
                          description: t('onboarding.questions.weightGoal.options.maintain.description'),
                          icon: <Minus className="h-6 w-6" />
                        },
                        {
                          value: "gain" as WeightGoal,
                          label: t('onboarding.questions.weightGoal.options.gain.label'),
                          description: t('onboarding.questions.weightGoal.options.gain.description'),
                          icon: <TrendingUp className="h-6 w-6" />
                        }
                      ].map((goal) => (
                        <motion.button
                          key={goal.value}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`w-full p-4 justify-start rounded-xl border ${
                            formData.weightGoal === goal.value
                              ? "bg-gray-900 text-white hover:bg-gray-800 border-transparent"
                              : "hover:bg-gray-50 border-gray-200"
                          }`}
                          onClick={() => setFormData({ ...formData, weightGoal: goal.value })}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`${formData.weightGoal === goal.value ? "text-white" : "text-gray-500"}`}>
                              {goal.icon}
                            </div>
                            <div className="flex flex-col items-start gap-0.5">
                              <span className="text-base font-medium">{goal.label}</span>
                              {goal.description && goal.description.trim() !== "" && (
                                <span className={`text-sm ${
                                  formData.weightGoal === goal.value ? "text-gray-200" : "text-gray-500"
                                }`}>
                                  {goal.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                  {currentStepData.type === "activity" && (
                    <div className="space-y-3">
                      {[
                        {
                          value: "0-2",
                          label: t('onboarding.questions.activityLevel.options.light.label') || "Light Activity (0-2 days/week)",
                          description: t('onboarding.questions.activityLevel.options.light.description') || "Mostly sedentary with occasional light exercise",
                          icon: "•"
                        },
                        {
                          value: "3-5",
                          label: t('onboarding.questions.activityLevel.options.moderate.label') || "Moderate Activity (3-5 days/week)",
                          description: t('onboarding.questions.activityLevel.options.moderate.description') || "Regular exercise or physical job",
                          icon: "••"
                        },
                        {
                          value: "6+",
                          label: t('onboarding.questions.activityLevel.options.active.label') || "Very Active (6+ days/week)",
                          description: t('onboarding.questions.activityLevel.options.active.description') || "Intense daily training or physical labor",
                          icon: "•••"
                        }
                      ].map((level) => (
                        <motion.button
                          key={level.value}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`w-full p-4 justify-start rounded-xl border ${
                            formData.activityLevel === level.value ? "bg-gray-900 text-white hover:bg-gray-800 border-transparent" : "hover:bg-gray-50 border-gray-200"
                          }`}
                          onClick={() => setFormData({ ...formData, activityLevel: level.value })}
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-2xl">{level.icon}</div>
                            <div className="flex flex-col items-start gap-0.5">
                              <span className="text-base font-medium">{level.label}</span>
                              {level.description && level.description.trim() !== "" && (
                                <span className={`text-sm ${
                                  formData.activityLevel === level.value ? "text-gray-200" : "text-gray-500"
                                }`}>
                                  {level.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-between pt-6 border-t border-gray-100">
                  <Button
                    variant="ghost"
                    onClick={handleBack}
                    disabled={currentStep === 1}
                    className="h-14 px-6 hover:bg-[#0CC5BA]/5 rounded-xl"
                  >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    {t('common.back') || "Back"}
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!isCurrentStepValid()}
                    className="h-14 px-6 bg-gradient-to-r from-[#0CC5BA] via-purple-500 to-blue-500 text-white hover:opacity-90 rounded-xl"
                  >
                    {currentStep === steps.length 
                      ? t('onboarding.completeSetup') || "Complete Setup" 
                      : t('common.continue') || "Continue"}
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </Card>
      </div>
    </div>
  );
}