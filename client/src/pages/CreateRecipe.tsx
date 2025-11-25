import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from 'react-i18next';

const getQuestions = (t: any) => [
  {
    id: "meal-type",
    title: t('common:createRecipe.questions.mealType.title'),
    description: t('common:createRecipe.questions.mealType.description'),
    options: [
      { value: "breakfast", label: t('common:createRecipe.questions.mealType.options.breakfast') },
      { value: "lunch", label: t('common:createRecipe.questions.mealType.options.lunch') },
      { value: "dinner", label: t('common:createRecipe.questions.mealType.options.dinner') },
      { value: "snack", label: t('common:createRecipe.questions.mealType.options.snack') },
      { value: "dessert", label: t('common:createRecipe.questions.mealType.options.dessert') }
    ]
  },
  {
    id: "difficulty",
    title: t('common:createRecipe.questions.difficulty.title'),
    description: t('common:createRecipe.questions.difficulty.description'),
    options: [
      { value: "easy", label: t('common:createRecipe.questions.difficulty.options.easy.label'), description: t('common:createRecipe.questions.difficulty.options.easy.description') },
      { value: "medium", label: t('common:createRecipe.questions.difficulty.options.medium.label'), description: t('common:createRecipe.questions.difficulty.options.medium.description') },
      { value: "hard", label: t('common:createRecipe.questions.difficulty.options.hard.label'), description: t('common:createRecipe.questions.difficulty.options.hard.description') }
    ]
  },
  {
    id: "diet-preference",
    title: t('common:createRecipe.questions.dietPreference.title'),
    description: t('common:createRecipe.questions.dietPreference.description'),
    options: [
      { value: "vegetarian", label: t('common:createRecipe.questions.dietPreference.options.vegetarian') },
      { value: "vegan", label: t('common:createRecipe.questions.dietPreference.options.vegan') },
      { value: "gluten-free", label: t('common:createRecipe.questions.dietPreference.options.glutenFree') },
      { value: "dairy-free", label: t('common:createRecipe.questions.dietPreference.options.dairyFree') },
      { value: "none", label: t('common:createRecipe.questions.dietPreference.options.none') }
    ]
  },
  {
    id: "cooking-time",
    title: t('common:createRecipe.questions.cookingTime.title'),
    description: t('common:createRecipe.questions.cookingTime.description'),
    options: [
      { value: "quick", label: t('common:createRecipe.questions.cookingTime.options.quick') },
      { value: "medium", label: t('common:createRecipe.questions.cookingTime.options.medium') },
      { value: "long", label: t('common:createRecipe.questions.cookingTime.options.long') }
    ]
  },
  {
    id: "skill-level",
    title: t('common:createRecipe.questions.skillLevel.title'),
    description: t('common:createRecipe.questions.skillLevel.description'),
    options: [
      { value: "beginner", label: t('common:createRecipe.questions.skillLevel.options.beginner') },
      { value: "intermediate", label: t('common:createRecipe.questions.skillLevel.options.intermediate') },
      { value: "advanced", label: t('common:createRecipe.questions.skillLevel.options.advanced') }
    ]
  },
  {
    id: "main-ingredient",
    title: t('common:createRecipe.questions.mainIngredient.title'),
    description: t('common:createRecipe.questions.mainIngredient.description'),
    options: [
      { value: "chicken", label: t('common:createRecipe.questions.mainIngredient.options.chicken') },
      { value: "fish", label: t('common:createRecipe.questions.mainIngredient.options.fish') },
      { value: "beef", label: t('common:createRecipe.questions.mainIngredient.options.beef') },
      { value: "vegetables", label: t('common:createRecipe.questions.mainIngredient.options.vegetables') },
      { value: "grains", label: t('common:createRecipe.questions.mainIngredient.options.grains') }
    ]
  }
];

export default function CreateRecipe() {
  const { t } = useTranslation(['common']);
  const questions = getQuestions(t);
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
        title: t('common:createRecipe.toast.quizCompleted'),
        description: t('common:createRecipe.toast.generatingRecipes'),
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
          {t('common:createRecipe.back')}
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
            {currentQuestion + 1} {t('common:createRecipe.of')} {questions.length}
          </div>
        </motion.div>
      </div>
    </div>
  );
}