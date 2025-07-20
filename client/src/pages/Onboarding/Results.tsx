import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight, Star, Shield, Zap } from "lucide-react";
import { useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";


const pricingPlans = [
  {
    name: "Pro Annual",
    price: "$79.99",
    period: "per year",
    savings: "Save 33%",
    features: [
      "AI-Powered Food Recognition",
      "Personalized Meal Plans",
      "Progress Analytics",
      "Premium Recipes Library",
      "24/7 Support Access"
    ],
    isPopular: true
  },
  {
    name: "Pro Monthly",
    price: "$9.99",
    period: "per month",
    features: [
      "AI-Powered Food Recognition",
      "Personalized Meal Plans",
      "Progress Analytics",
      "Premium Recipes Library"
    ],
    isPopular: false
  }
];

const testimonials = [
  {
    text: "Nutri AI completely transformed my relationship with food. The AI scanning makes tracking effortless!",
    author: "Emily R.",
    achievement: "Lost 45 lbs in 6 months"
  },
  {
    text: "As a busy professional, this app is a game-changer. The meal planning feature saves me hours every week.",
    author: "Michael S.",
    achievement: "Achieved fitness goals in 3 months"
  }
];

export default function Results() {
  const [answers, setAnswers] = useState<Record<string, string> | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showScanningDemo, setShowScanningDemo] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const storedAnswers = localStorage.getItem('quizAnswers');
    if (storedAnswers) {
      const parsedAnswers = JSON.parse(storedAnswers);
      setAnswers(parsedAnswers);
      setShowScanningDemo(parsedAnswers.scanning_demo === 'show_demo');
    }
  }, []);

  if (!answers) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (formData.password !== formData.confirmPassword) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Passwords do not match"
        });
        return;
      }

      if (formData.password.length < 6) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Password must be at least 6 characters"
        });
        return;
      }

      const result = await register({
        email: formData.email,
        password: formData.password,
        profile: {
          height: 170, // Default height value
          currentWeight: answers.current_weight === 'under_130' ? 130 : 
                       answers.current_weight === '130_160' ? 145 :
                       answers.current_weight === '160_190' ? 175 : 190,
          goalWeight: answers.current_weight === 'under_130' ? 125 : 
                       answers.current_weight === '130_160' ? 140 :
                       answers.current_weight === '160_190' ? 170 : 185,
          activityLevel: answers.activity as "sedentary" | "light" | "moderate" | "very_active",
          weightGoal: answers.goal === 'weight_loss' ? 'loss' :
                       answers.goal === 'muscle_gain' ? 'gain' : 'maintain',
          calorieGoal: 2000,
          proteinGoal: 150,
          carbsGoal: 200,
          fatGoal: 65,
        }
      });

      if (!result.ok) {
        toast({
          variant: "destructive",
          title: "Registration failed",
          description: result.error
        });
        return;
      }

      setShowPricing(true);
      toast({
        title: "Account created successfully!",
        description: "Let's get you started with the perfect plan."
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error.message || "An unexpected error occurred"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (showScanningDemo) {
    setShowScanningDemo(false);
  }

  if (showPricing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0CC5BA]/5 to-blue-500/5 flex flex-col">
        <div className="flex-1 px-6 py-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 rounded-full bg-[#0CC5BA]/20 flex items-center justify-center mb-8 mx-auto"
          >
            <Zap className="w-12 h-12 text-[#0CC5BA]" />
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#0CC5BA] to-blue-500 bg-clip-text text-transparent mb-4">
              Choose Your Plan
            </h1>
            <p className="text-gray-600">
              Start your transformation journey today with our premium features
            </p>
          </motion.div>

          <div className="grid gap-6 max-w-md mx-auto">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`
                  relative p-6 rounded-2xl border ${
                    plan.isPopular
                      ? 'border-[#0CC5BA] bg-[#0CC5BA]/5'
                      : 'border-gray-200 bg-white'
                  }
                `}
                onClick={() => setSelectedPlan(plan.name)}
              >
                {plan.isPopular && (
                  <span className="absolute -top-3 left-6 bg-[#0CC5BA] text-white text-xs px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                )}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                    <div className="flex items-baseline mt-2">
                      <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                      <span className="ml-2 text-gray-500">{plan.period}</span>
                    </div>
                    {plan.savings && (
                      <span className="text-[#0CC5BA] text-sm font-medium mt-1 block">
                        {plan.savings}
                      </span>
                    )}
                  </div>
                  {selectedPlan === plan.name && (
                    <div className="w-6 h-6 rounded-full bg-[#0CC5BA] flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <ul className="space-y-4">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-[#0CC5BA]" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8 max-w-md mx-auto"
          >
            <Button
              disabled={!selectedPlan}
              className="w-full h-14 bg-gradient-to-r from-[#0CC5BA] to-blue-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
              onClick={() => {
                localStorage.removeItem('quizAnswers');
                setLocation("/dashboard");
              }}
            >
              Start {selectedPlan?.split(" ")[0]} Plan
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>

          {/* Testimonials */}
          <div className="mt-12 space-y-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="bg-white rounded-xl p-4 border border-gray-200"
              >
                <div className="flex items-center gap-2 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 italic text-sm mb-2">"{testimonial.text}"</p>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{testimonial.author}</p>
                  <p className="text-[#0CC5BA] text-xs">{testimonial.achievement}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0CC5BA]/5 to-blue-500/5 flex flex-col">
      <div className="flex-1 px-6 py-12 flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-20 h-20 rounded-full bg-[#0CC5BA]/20 flex items-center justify-center mb-8"
        >
          <CheckCircle2 className="w-12 h-12 text-[#0CC5BA]" />
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-4xl font-bold text-center bg-gradient-to-r from-[#0CC5BA] to-blue-500 bg-clip-text text-transparent mb-4"
        >
          You're in the Right Place!
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-gray-600 text-center mb-8"
        >
          Based on your answers, we've crafted a personalized plan just for you
        </motion.p>

        {/* Testimonials before registration */}
        {!showAuth && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="w-full max-w-md space-y-6 mb-8"
          >
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 italic text-sm mb-2">"{testimonial.text}"</p>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{testimonial.author}</p>
                  <p className="text-[#0CC5BA] text-xs">{testimonial.achievement}</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {!showAuth ? (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="w-full max-w-md space-y-4"
          >
            <Button 
              onClick={() => setShowAuth(true)}
              className="w-full h-14 bg-gradient-to-r from-[#0CC5BA] to-blue-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              Create Your Account
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        ) : (
          <motion.form
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full max-w-md space-y-4"
            onSubmit={handleSubmit}
          >
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="h-14 rounded-xl bg-white border border-gray-200"
              placeholder="Email"
              required
            />

            <Input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="h-14 rounded-xl bg-white border border-gray-200"
              placeholder="Password"
              required
            />

            <Input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className="h-14 rounded-xl bg-white border border-gray-200"
              placeholder="Confirm Password"
              required
            />

            <Button 
              type="submit"
              disabled={isLoading}
              className="w-full h-14 bg-gradient-to-r from-[#0CC5BA] to-blue-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>

            <Button 
              type="button"
              variant="ghost"
              onClick={() => setShowAuth(false)}
              className="w-full h-14 rounded-xl font-medium"
            >
              Back
            </Button>
          </motion.form>
        )}
      </div>
    </div>
  );
}