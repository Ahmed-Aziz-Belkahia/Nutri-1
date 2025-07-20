import { motion } from "framer-motion";
import { useState } from "react";
import { ArrowLeft, Sparkles, Activity, Scale, Target, Heart, Brain, Rocket } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface QuestionBase {
  id: string;
  question: string;
  subtext?: string;
  progress: number;
  type: "welcome" | "assessment" | "reflection" | "info" | "commitment" | "payment" | "slider";
}

interface OptionQuestion extends QuestionBase {
  type: "welcome" | "assessment" | "reflection" | "info" | "commitment" | "payment";
  options: Array<{
    text: string;
    value: string;
    subtext?: string;
    icon?: React.ReactNode;
  }>;
}

interface SliderQuestion extends QuestionBase {
  type: "slider";
  sliderConfig: {
    min: number;
    max: number;
    step: number;
    defaultValue: number;
    label: string;
    unit?: string;
  };
}

type Question = OptionQuestion | SliderQuestion;

const questions: Question[] = [
  {
    id: "welcome",
    question: "Transform Your\nHealth Journey",
    subtext: "Your personal AI nutrition coach for\na healthier lifestyle",
    progress: 2,
    type: "welcome",
    options: [
      {
        text: "Start Your Journey",
        value: "begin"
      }
    ]
  },
  {
    id: "cooking_experience",
    question: "What's your cooking experience?",
    progress: 15,
    type: "assessment",
    subtext: "This helps us suggest recipes at your comfort level",
    options: [
      { text: "Beginner", value: "beginner", subtext: "Learning the basics" },
      { text: "Intermediate", value: "intermediate", subtext: "Comfortable with most recipes" },
      { text: "Advanced", value: "advanced", subtext: "Experienced home cook" },
      { text: "Professional", value: "professional", subtext: "Professional cooking background" }
    ]
  },
  {
    id: "recipe_difficulty",
    question: "Preferred Recipe Difficulty",
    progress: 30,
    type: "assessment",
    subtext: "We'll personalize recipe suggestions accordingly",
    options: [
      { text: "Easy Recipes", value: "easy", subtext: "Simple, quick-to-make dishes" },
      { text: "Medium Difficulty", value: "medium", subtext: "Balanced complexity and effort" },
      { text: "Challenging", value: "hard", subtext: "Complex recipes for skilled cooks" }
    ]
  },
  {
    id: "cooking_time",
    question: "How much time can you spend cooking?",
    progress: 45,
    type: "assessment",
    subtext: "We'll suggest recipes that fit your schedule",
    options: [
      { text: "15-30 minutes", value: "quick", subtext: "Quick and easy meals" },
      { text: "30-60 minutes", value: "medium", subtext: "Standard cooking time" },
      { text: "60+ minutes", value: "long", subtext: "Elaborate recipes" }
    ]
  },
  {
    id: "meal_preferences",
    question: "What types of meals do you prefer?",
    progress: 60,
    type: "assessment",
    subtext: "Select your preferred cooking style",
    options: [
      { text: "One-Pot Meals", value: "one_pot", subtext: "Simple preparation and cleanup" },
      { text: "Batch Cooking", value: "batch", subtext: "Cook once, eat multiple times" },
      { text: "Fresh Daily", value: "fresh", subtext: "Cook fresh meals daily" },
      { text: "Meal Prep", value: "prep", subtext: "Prepare ingredients in advance" }
    ]
  },
  {
    id: "weight",
    question: "Current Weight",
    progress: 75,
    type: "slider",
    subtext: "This helps us calculate your personalized plan",
    sliderConfig: {
      min: 40,
      max: 120,
      step: 0.1,
      defaultValue: 80,
      label: "Weight",
      unit: "kg"
    }
  },
  {
    id: "goal_weight",
    question: "Target Weight",
    progress: 90,
    type: "slider",
    subtext: "Where would you like to be?",
    sliderConfig: {
      min: 40,
      max: 120,
      step: 0.1,
      defaultValue: 80,
      label: "Target Weight",
      unit: "kg"
    }
  },
  {
    id: "activity_level",
    question: "Activity Level",
    progress: 105,
    type: "slider",
    subtext: "How active are you on a daily basis?",
    sliderConfig: {
      min: 1,
      max: 5,
      step: 1,
      defaultValue: 3,
      label: "Activity Level",
      unit: "level"
    }
  },
  {
    id: "current_habits",
    question: "Tell us about your current lifestyle",
    progress: 120,
    type: "reflection",
    subtext: "Understanding where you are helps us create your perfect plan",
    options: [
      { text: "Always On The Go", value: "busy", subtext: "Busy schedule, need quick solutions" },
      { text: "Health Conscious", value: "health", subtext: "Already making healthy choices" },
      { text: "Starting Fresh", value: "beginner", subtext: "Ready for a new beginning" },
      { text: "Need Guidance", value: "guidance", subtext: "Looking for expert support" }
    ]
  },
  {
    id: "biggest_struggle",
    question: "What's your biggest challenge?",
    progress: 135,
    type: "reflection",
    subtext: "We'll help you overcome these obstacles",
    options: [
      { text: "Emotional Eating", value: "emotional", subtext: "Eating driven by feelings" },
      { text: "No Time to Cook", value: "time", subtext: "Need quick, healthy options" },
      { text: "Sweet Cravings", value: "cravings", subtext: "Hard to resist sweets" },
      { text: "Portion Control", value: "portions", subtext: "Unsure about serving sizes" }
    ]
  },
  {
    id: "motivation",
    question: "What drives you?",
    progress: 150,
    type: "reflection",
    subtext: "Your 'why' is what will keep you going",
    options: [
      { text: "Better Health", value: "health", subtext: "Live longer, feel stronger" },
      { text: "More Energy", value: "energy", subtext: "Power through your day" },
      { text: "Self Confidence", value: "confidence", subtext: "Feel great in your skin" },
      { text: "Role Model", value: "inspiration", subtext: "Inspire others" }
    ]
  },
  {
    id: "vision",
    type: "info",
    question: "Your Future Self",
    progress: 165,
    options: [
      { text: "Make It Reality", value: "continue" }
    ]
  },
  {
    id: "support_preference",
    question: "How would you like to be supported?",
    progress: 180,
    type: "assessment",
    options: [
      { text: "Daily Check-ins", value: "daily", subtext: "Regular progress tracking" },
      { text: "Weekly Planning", value: "weekly", subtext: "Flexible meal scheduling" },
      { text: "AI Guidance", value: "ai", subtext: "Smart, personalized tips" },
      { text: "Community", value: "community", subtext: "Connect with others" }
    ]
  },
  {
    id: "commitment",
    type: "commitment",
    question: "Your Promise to Yourself",
    subtext: "Today marks the beginning of your transformation",
    progress: 195,
    options: [
      { text: "Begin My Journey", value: "commit" }
    ]
  },
  {
    id: "payment",
    type: "payment",
    question: "Start Your Transformation Today",
    subtext: "Get full access to premium features",
    progress: 200,
    options: [
      {
        text: "Start Now",
        value: "premium",
        subtext: "Begin your journey",
      }
    ]
  }
];

export default function TransformationQuiz() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [, setLocation] = useLocation();

  const currentQuestion = questions[currentQuestionIndex];

  const handleAnswer = (answer: string | number) => {
    const newAnswers = {
      ...answers,
      [currentQuestion.id]: answer
    };
    setAnswers(newAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      localStorage.setItem('quizAnswers', JSON.stringify(newAnswers));
      setLocation("/auth");
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  // Helper function to get the appropriate icon for each question type
  const getQuestionIcon = () => {
    switch (currentQuestion.id) {
      case "welcome":
        return <Sparkles className="w-10 h-10 text-white" />;
      case "weight":
        return <Scale className="w-10 h-10 text-white" />;
      case "goal_weight":
        return <Target className="w-10 h-10 text-white" />;
      case "activity_level":
        return <Activity className="w-10 h-10 text-white" />;
      case "current_habits":
        return <Heart className="w-10 h-10 text-white" />;
      case "biggest_struggle":
        return <Brain className="w-10 h-10 text-white" />;
      case "motivation":
        return <Rocket className="w-10 h-10 text-white" />;
      case "vision":
        return <Rocket className="w-10 h-10 text-white" />;
      case "support_preference":
        return <Rocket className="w-10 h-10 text-white" />;
      case "commitment":
        return <Rocket className="w-10 h-10 text-white" />;
      case "payment":
        return <Rocket className="w-10 h-10 text-white" />;
      case "cooking_experience":
        return <Rocket className="w-10 h-10 text-white" />;
      case "recipe_difficulty":
        return <Rocket className="w-10 h-10 text-white" />;
      case "cooking_time":
        return <Rocket className="w-10 h-10 text-white" />;
      case "meal_preferences":
        return <Rocket className="w-10 h-10 text-white" />;
      default:
        return <Rocket className="w-10 h-10 text-white" />;
    }
  };

  return (
    <motion.div
      className="h-screen bg-[#FCFCFC] overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Background Gradient */}
      <motion.div
        className="fixed inset-0 bg-gradient-to-br from-[#0CC5BA]/10 via-blue-500/5 to-transparent pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />

      <div className="relative max-w-[500px] mx-auto px-6 pt-20">
        {currentQuestionIndex > 0 && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={handleBack}
            className="fixed top-6 left-6 z-20 text-[#0CC5BA] hover:text-[#0AB3A9] transition-colors p-2"
          >
            <ArrowLeft className="h-6 w-6" />
          </motion.button>
        )}

        <div className="h-screen flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center w-full"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="w-20 h-20 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-[#0CC5BA] to-blue-500 flex items-center justify-center shadow-lg shadow-[#0CC5BA]/20"
            >
              {getQuestionIcon()}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl font-bold bg-gradient-to-br from-[#0CC5BA] via-[#0CBACC] to-[#0C9CCC] bg-clip-text text-transparent leading-tight mb-4 whitespace-pre-line"
            >
              {currentQuestion.question}
            </motion.h1>

            {currentQuestion.subtext && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-xl text-gray-600 mb-12 whitespace-pre-line"
              >
                {currentQuestion.subtext}
              </motion.p>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-4"
            >
              {currentQuestion.type === "welcome" && (
                <Button
                  className="w-full h-14 bg-gradient-to-r from-[#0CC5BA] to-[#0CBACC] hover:opacity-90 text-white rounded-2xl text-lg font-medium shadow-lg shadow-[#0CC5BA]/20 transition-all duration-300"
                  onClick={() => handleAnswer("begin")}
                >
                  Start Your Journey
                  <ArrowLeft className="ml-2 h-5 w-5" />
                </Button>
              )}

              {currentQuestion.type === "slider" && (
                <div className="space-y-8">
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium text-gray-700">
                        {(currentQuestion as SliderQuestion).sliderConfig.label}
                      </span>
                      <span className="text-lg font-medium text-[#0CC5BA]">
                        {(currentQuestion as SliderQuestion).sliderConfig.defaultValue}
                        {(currentQuestion as SliderQuestion).sliderConfig.unit}
                      </span>
                    </div>
                    <Slider
                      defaultValue={[(currentQuestion as SliderQuestion).sliderConfig.defaultValue]}
                      min={(currentQuestion as SliderQuestion).sliderConfig.min}
                      max={(currentQuestion as SliderQuestion).sliderConfig.max}
                      step={(currentQuestion as SliderQuestion).sliderConfig.step}
                      onValueChange={(value) => handleAnswer(value[0])}
                      className="w-full"
                    />
                  </div>
                  <Button
                    className="w-full h-14 bg-gradient-to-r from-[#0CC5BA] to-[#0CBACC] hover:opacity-90 text-white rounded-2xl text-lg font-medium shadow-lg shadow-[#0CC5BA]/20 transition-all duration-300"
                    onClick={() => handleAnswer((currentQuestion as SliderQuestion).sliderConfig.defaultValue)}
                  >
                    Continue
                  </Button>
                </div>
              )}

              {(currentQuestion as OptionQuestion).options &&
                currentQuestion.type !== "welcome" &&
                currentQuestion.type !== "slider" && (
                  <div className="space-y-3">
                    {(currentQuestion as OptionQuestion).options.map((option, index) => (
                      <motion.button
                        key={option.value}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => handleAnswer(option.value)}
                        className={`
                          group w-full p-6 rounded-2xl text-left transition-all duration-300
                          border-2 shadow-sm hover:shadow-md text-lg
                          relative overflow-hidden
                          ${answers[currentQuestion.id] === option.value
                            ? 'bg-gradient-to-r from-[#0CC5BA] to-[#0CBACC] text-white border-transparent shadow-lg shadow-[#0CC5BA]/20'
                            : 'bg-white hover:bg-[#F0FFFE] border-[#E8F8F7] hover:border-[#0CC5BA]'
                          }
                        `}
                      >
                        <div className="flex-1">
                          <div className="font-medium">
                            {option.text}
                          </div>
                          {option.subtext && (
                            <div className={`text-sm mt-1 ${
                              answers[currentQuestion.id] === option.value ? 'text-white/90' : 'text-gray-500'
                            }`}>
                              {option.subtext}
                            </div>
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              {currentQuestion.type === "commitment" && (
                <div className="space-y-6">
                  <div className="flex flex-col items-center justify-center">
                    <p className="text-gray-600 text-sm mb-2">Sign your name to begin</p>
                    {/*canvas removed for brevity*/}
                  </div>
                  <div className="space-y-3">
                    <p className="text-gray-600 text-xs text-center">
                      Your signature symbolizes your commitment to your health journey
                    </p>
                    <Button
                      className="w-full h-14 bg-gradient-to-r from-[#0CC5BA] to-[#0CBACC] hover:opacity-90 text-white rounded-2xl text-lg font-medium shadow-lg shadow-[#0CC5BA]/20 transition-all duration-300"
                      onClick={() => handleAnswer("commit")}
                    >
                      Continue My Journey
                    </Button>
                  </div>
                </div>
              )}

              {currentQuestion.type === "payment" && (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl p-6 shadow-md border border-[#E8F8F7]">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">Premium Plan</h3>
                        <p className="text-sm text-gray-500">Cancel anytime</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-[#0CC5BA]">$29.99</div>
                        <div className="text-sm text-gray-500">/month</div>
                      </div>
                    </div>

                    <div className="space-y-4 mb-6">
                      {/*payment button removed for brevity*/}
                    </div>

                    <Button
                      className="w-full h-14 bg-gradient-to-r from-[#0CC5BA] to-[#0AB3A9] hover:opacity-90 text-white rounded-2xl text-lg font-medium shadow-lg shadow-[#0CC5BA]/20 flex items-center justify-center gap-3"
                      onClick={() => handleAnswer("signup")}
                    >
                      {/* CreditCard className="w-5 h-5" */}
                      Create Account
                    </Button>

                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-500">
                        Next: Create your account to start your transformation journey
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#F0FFFE] rounded-xl p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      {/* Zap className="w-4 h-4 text-[#0CC5BA]" */}
                      <span>Join thousands of successful transformations</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center text-sm text-gray-500 mt-8"
            >
              {currentQuestionIndex + 1} of {questions.length}
            </motion.p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}