import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const questions = [
  {
    id: "meal-type",
    title: "What type of meal would you like to create?",
    description: "Choose the category that best fits your recipe",
    options: [
      { value: "breakfast", label: "Breakfast" },
      { value: "lunch", label: "Lunch" },
      { value: "dinner", label: "Dinner" },
      { value: "snack", label: "Snack" },
      { value: "dessert", label: "Dessert" }
    ]
  },
  {
    id: "difficulty",
    title: "Preferred Recipe Difficulty",
    description: "We'll personalize recipe suggestions accordingly",
    options: [
      { value: "easy", label: "Easy Recipes", description: "Simple, quick-to-make dishes" },
      { value: "medium", label: "Medium Difficulty", description: "Balanced complexity and effort" },
      { value: "hard", label: "Challenging", description: "Complex recipes for skilled cooks" }
    ]
  },
  {
    id: "diet-preference",
    title: "What dietary preferences should be considered?",
    description: "Select any specific dietary requirements",
    options: [
      { value: "vegetarian", label: "Vegetarian" },
      { value: "vegan", label: "Vegan" },
      { value: "gluten-free", label: "Gluten-Free" },
      { value: "dairy-free", label: "Dairy-Free" },
      { value: "none", label: "No Restrictions" }
    ]
  },
  {
    id: "cooking-time",
    title: "How much time do you have for cooking?",
    description: "Choose your preferred preparation time",
    options: [
      { value: "quick", label: "Quick (15-30 mins)" },
      { value: "medium", label: "Medium (30-60 mins)" },
      { value: "long", label: "Long (60+ mins)" }
    ]
  },
  {
    id: "skill-level",
    title: "What's your cooking skill level?",
    description: "Be honest! This helps us suggest appropriate recipes",
    options: [
      { value: "beginner", label: "Beginner" },
      { value: "intermediate", label: "Intermediate" },
      { value: "advanced", label: "Advanced" }
    ]
  },
  {
    id: "main-ingredient",
    title: "What's your preferred main ingredient?",
    description: "Choose the primary ingredient you'd like to cook with",
    options: [
      { value: "chicken", label: "Chicken" },
      { value: "fish", label: "Fish" },
      { value: "beef", label: "Beef" },
      { value: "vegetables", label: "Vegetables" },
      { value: "grains", label: "Grains" }
    ]
  }
];

export default function CreateRecipe() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const handleAnswer = (answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questions[currentQuestion].id]: answer
    }));

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      toast({
        title: "Quiz completed!",
        description: "Generating personalized recipe suggestions...",
        duration: 3000,
      });
      window.opener?.postMessage({ type: 'QUIZ_COMPLETED', answers }, '*');
      window.close();
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    } else {
      window.close();
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[500px] mx-auto px-6">
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-500 hover:text-gray-900 -ml-2 mt-6"
          onClick={handleBack}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="mt-12 mb-8"
        >
          <div className="flex flex-col items-center text-center mb-16">
            <motion.div 
              className="w-[72px] h-[72px] bg-[#0CC5BA] rounded-[20px] flex items-center justify-center mb-8"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Rocket className="w-10 h-10 text-white" />
            </motion.div>
            <motion.h1 
              className="text-[28px] font-medium text-gray-900 mb-3"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {questions[currentQuestion].title}
            </motion.h1>
            <motion.p 
              className="text-gray-500 text-base"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {questions[currentQuestion].description}
            </motion.p>
          </div>

          <div className="space-y-2">
            {questions[currentQuestion].options.map((option, index) => (
              <motion.div
                key={option.value}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.1 }}
              >
                <button
                  onClick={() => handleAnswer(option.value)}
                  className="w-full text-left py-4 px-4 rounded-xl bg-white hover:bg-gray-50 transition-colors duration-200"
                >
                  <span className="text-base text-gray-900">
                    {option.label}
                  </span>
                </button>
              </motion.div>
            ))}
          </div>

          <div className="text-sm text-gray-400 text-center mt-16">
            {currentQuestion + 1} of {questions.length}
          </div>
        </motion.div>
      </div>
    </div>
  );
}