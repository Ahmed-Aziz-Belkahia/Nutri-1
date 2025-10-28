import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { 
  X, ChevronLeft, ChevronRight, Pause, Play, 
  Check, Timer as TimerIcon, Volume2, VolumeX, 
  Maximize2, Minimize2, AlertCircle,
  Clock, Flame, Users, List, Settings
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useRecipeById } from '@/hooks/queries/useRecipes';

interface Timer {
  id: string;
  duration: number;
  remaining: number;
  label: string;
  isActive: boolean;
}

interface CookingSession {
  recipeId: number;
  currentStep: number;
  totalSteps: number;
  startTime: Date;
  timers: Timer[];
  completedSteps: Set<number>;
  isPaused: boolean;
  elapsedTime: number;
}

interface Recipe {
  id: number;
  name: string;
  imageUrl?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  ingredients: string | any[];
  instructions: string | string[];
  nutritionInfo?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export default function CookingMode() {
  const { id } = useParams();
  const [location, navigate] = useLocation();
  const isFoodLog = location.includes('/food-log/');
  const [session, setSession] = useState<CookingSession | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);
  const sessionTimerRef = useRef<NodeJS.Timeout>();
  const timerUpdateRef = useRef<NodeJS.Timeout>();
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Fetch recipe using custom hook
  const { data: recipe, isLoading } = useRecipeById(Number(id), isFoodLog);
  const recipeData = recipe as any;

  // Parse instructions
  const instructions: string[] = (() => {
    if (!recipeData?.instructions) return [];
    
    if (typeof recipeData.instructions === 'string') {
      try {
        const parsed = JSON.parse(recipeData.instructions);
        return Array.isArray(parsed) ? parsed : [recipeData.instructions];
      } catch {
        return recipeData.instructions.split('\n').filter((i: any) => i.trim()).map((i: any) => i.trim().replace(/^\d+\.\s*/, ''));
      }
    }
    return Array.isArray(recipeData.instructions) ? recipeData.instructions : [];
  })();

  // Parse ingredients
  const ingredients: any[] = (() => {
    if (!recipeData?.ingredients) return [];
    
    if (typeof recipeData.ingredients === 'string') {
      try {
        return JSON.parse(recipeData.ingredients);
      } catch {
        return recipeData.ingredients.split(',').map((i: any) => ({
          name: i.trim(),
          quantity: '',
          unit: ''
        }));
      }
    }
    return recipeData.ingredients;
  })();

  // Initialize session
  useEffect(() => {
    if (recipeData && !session) {
      setSession({
        recipeId: recipeData.id,
        currentStep: 0,
        totalSteps: instructions.length,
        startTime: new Date(),
        timers: [],
        completedSteps: new Set(),
        isPaused: false,
        elapsedTime: 0
      });
    }
  }, [recipe, session, instructions.length]);

  // Session timer (tracks elapsed time)
  useEffect(() => {
    if (session && !session.isPaused) {
      sessionTimerRef.current = setInterval(() => {
        setSession(prev => prev ? { ...prev, elapsedTime: prev.elapsedTime + 1 } : null);
      }, 1000);
    } else {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    }

    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    };
  }, [session?.isPaused]);

  // Timer updates
  useEffect(() => {
    if (session && session.timers.length > 0 && !session.isPaused) {
      timerUpdateRef.current = setInterval(() => {
        setSession(prev => {
          if (!prev) return null;

          const updatedTimers = prev.timers.map(timer => {
            if (!timer.isActive || timer.remaining <= 0) return timer;

            const newRemaining = timer.remaining - 1;
            
            // Timer completed
            if (newRemaining === 0) {
              playTimerAlert();
              showNotification('Timer Complete!', timer.label);
              return { ...timer, remaining: 0, isActive: false };
            }

            return { ...timer, remaining: newRemaining };
          });

          return { ...prev, timers: updatedTimers };
        });
      }, 1000);
    } else {
      if (timerUpdateRef.current) {
        clearInterval(timerUpdateRef.current);
      }
    }

    return () => {
      if (timerUpdateRef.current) {
        clearInterval(timerUpdateRef.current);
      }
    };
  }, [session?.timers.length, session?.isPaused]);

  // Text-to-speech
  useEffect(() => {
    if (voiceEnabled && session && instructions[session.currentStep]) {
      speakText(instructions[session.currentStep]);
    }

    return () => {
      if (speechSynthesisRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, [session?.currentStep, voiceEnabled]);

  // Prevent screen sleep
  useEffect(() => {
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      try {
        // Only request wake lock if page is visible and supported
        if ('wakeLock' in navigator && document.visibilityState === 'visible') {
          wakeLock = await (navigator as any).wakeLock.request('screen');
          console.log('Wake lock acquired');
        }
      } catch (err) {
        // Silently fail - wake lock is a nice-to-have feature
        console.log('Wake lock not available:', err);
      }
    };

    // Request wake lock when page becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, []);

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      speechSynthesisRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  const playTimerAlert = () => {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ8MU6nl7q1aHgY7k9nyzn4pBSd7yfDcjkAKEl+16+ypWhwKSKDh8bllHAU2jtbz0YU2Bh9tv+7mnFQQDVWs5u+zYSAFPJPY88l8JwUme8rx3I5ACxFftuvuqVscCkig4fG5ZRwFNo7W89GFNgYfbb/u5pxUEA1VrObvs2EgBTyT2PPJfCcFJnvK8dyOQAsRX7br7qlbHApIoOHxuWUcBTaO1vPRhTYGH22/7uacVBANVazm77NhIAU8k9jzyXwnBSZ7yvHcjkALEV+26+6pWxwKSKDh8bllHAU2jtbz0YU2Bh9tv+7mnFQQDVWs5u+zYSAFPJPY88l8JwUme8rx3I5ACxFftuvuqVscCkig4fG5ZRwFNo7W89GFNgYfbb/u5pxUEA1VrObvs2EgBTyT2PPJfCcFJnvK8dyOQAsRX7br7qlbHApIoOHxuWUcBTaO1vPRhTYGH22/7uacVBANVazm77NhIAU8k9jzyXwnBSZ7yvHcjkALEV+26+6pWxwKSKDh8bllHAU2jtbz0YU2Bh9tv+7mnFQQDVWs5u+zYSAFPJPY88l8JwUme8rx3I5ACxFftuvuqVscCkig4fG5ZRwFNo7W89GFNgYfbb/u5pxUEA1VrObvs2EgBTyT2PPJfCcFJnvK8dyOQAsRX7br7qlbHApIoOHxuWUcBTaO1vPRhTYGH22/7uacVBANVazm77NhIAU8k9jzyXwnBSZ7yvHcjkALEV+26+6pWxwKSKDh8bllHAU2jtbz0YU2Bh9tv+7mnFQQDVWs5u+zYSAFPJPY88l8JwUme8rx3I5ACxFftuvuqVscCkig4fG5ZRwFNo7W89GFNgYfbb/u5pxUEA1VrObvs2EgBTyT2PPJfCcFJnvK8dyOQAsRX7br7qlbHApIoOHxuWUcBTaO1vPRhTYGH22/7uacVBANVazm77NhIAU8k9jzyXwnBSZ7yvHcjkALEV+26+6pWxwKSKDh8bllHAU=');
    audio.play().catch(() => {});
  };

  const showNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/icon.png' });
    }
  };

  const nextStep = () => {
    if (!session) return;

    // Check if this is the last step - complete immediately
    if (session.currentStep === session.totalSteps - 1) {
      // Stop all timers and pause
      setSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          timers: prev.timers.map(t => ({ ...t, isActive: false })),
          isPaused: true
        };
      });
      
      // Show completion immediately
      handleCompletion();
      if (voiceEnabled) {
        speakText("Congratulations! You've completed the recipe!");
      }
      return;
    }

    // Move to next step
    setSession(prev => {
      if (!prev) return null;
      const newStep = prev.currentStep + 1;
      const newCompleted = new Set(prev.completedSteps);
      newCompleted.add(prev.currentStep);

      return {
        ...prev,
        currentStep: newStep,
        completedSteps: newCompleted
      };
    });

    // Speak the next instruction if voice is enabled
    if (voiceEnabled && instructions[session.currentStep + 1]) {
      speakText(instructions[session.currentStep + 1]);
    }
  };

  const previousStep = () => {
    if (!session || session.currentStep <= 0) return;

    setSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        currentStep: prev.currentStep - 1
      };
    });
  };

  const togglePause = () => {
    setSession(prev => {
      if (!prev) return null;
      
      if (!prev.isPaused && voiceEnabled) {
        window.speechSynthesis.cancel();
      }

      return {
        ...prev,
        isPaused: !prev.isPaused
      };
    });
  };

  const addTimer = (minutes: number, label: string) => {
    if (!session) return;

    const newTimer: Timer = {
      id: Date.now().toString(),
      duration: minutes * 60,
      remaining: minutes * 60,
      label,
      isActive: true
    };

    setSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        timers: [...prev.timers, newTimer]
      };
    });
  };

  const removeTimer = (timerId: string) => {
    setSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        timers: prev.timers.filter(t => t.id !== timerId)
      };
    });
  };

  const toggleTimer = (timerId: string) => {
    setSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        timers: prev.timers.map(t => 
          t.id === timerId ? { ...t, isActive: !t.isActive } : t
        )
      };
    });
  };

  const handleCompletion = () => {
    setShowCompletion(true);
    
    // Multi-burst confetti celebration
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    // Continuous confetti bursts
    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      // Left side burst
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      
      // Right side burst
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    // Big center burst
    setTimeout(() => {
      confetti({
        particleCount: 200,
        spread: 120,
        origin: { y: 0.6 },
        colors: ['#26A8FF', '#1A8FE6', '#10B981', '#F59E0B', '#EF4444']
      });
    }, 100);

    // Speak completion
    if (voiceEnabled) {
      speakText('Congratulations! You have completed the recipe!');
    }
  };

  const handleExit = () => {
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    if (timerUpdateRef.current) clearInterval(timerUpdateRef.current);
    if (speechSynthesisRef.current) window.speechSynthesis.cancel();
    navigate(isFoodLog ? `/recipes/food-log/${id}` : `/recipes/${id}`);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStepType = (stepText: string): 'prep' | 'cook' | 'critical' | 'normal' => {
    if (!stepText) return 'normal';
    const lower = stepText.toLowerCase();
    if (lower.includes('careful') || lower.includes('watch') || lower.includes('don\'t')) return 'critical';
    if (lower.includes('heat') || lower.includes('cook') || lower.includes('boil') || lower.includes('fry')) return 'cook';
    if (lower.includes('chop') || lower.includes('cut') || lower.includes('dice') || lower.includes('slice')) return 'prep';
    return 'normal';
  };

  const getStepColor = (type: string) => {
    switch (type) {
      case 'prep': return 'border-green-500 bg-green-50';
      case 'cook': return 'border-blue-500 bg-blue-50';
      case 'critical': return 'border-orange-500 bg-orange-50';
      default: return 'border-gray-300 bg-white';
    }
  };

  // Extract timer from step text
  const extractTimerFromStep = (stepText: string) => {
    const timeRegex = /(\d+)\s*(minute|min|minutes|mins|second|sec|seconds|secs)/gi;
    const matches = stepText.match(timeRegex);
    if (matches && matches.length > 0) {
      const match = matches[0];
      const number = parseInt(match.match(/\d+/)?.[0] || '0');
      const unit = match.toLowerCase().includes('sec') ? 'seconds' : 'minutes';
      return { time: number, unit, text: match };
    }
    return null;
  };

  if (isLoading || !recipe || !session) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#26A8FF]"></div>
      </div>
    );
  }

  const progress = ((session.currentStep + 1) / session.totalSteps) * 100;
  const currentInstruction = instructions[session.currentStep] || '';
  const stepType = getStepType(currentInstruction);
  const timerInfo = extractTimerFromStep(currentInstruction);

  // Completion Screen
  if (showCompletion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-10 left-10 w-32 h-32 bg-green-200 rounded-full opacity-20 animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }}></div>
          <div className="absolute top-20 right-20 w-24 h-24 bg-blue-200 rounded-full opacity-20 animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '2.5s' }}></div>
          <div className="absolute bottom-20 left-20 w-28 h-28 bg-purple-200 rounded-full opacity-20 animate-bounce" style={{ animationDelay: '1s', animationDuration: '2s' }}></div>
          <div className="absolute bottom-10 right-10 w-36 h-36 bg-yellow-200 rounded-full opacity-20 animate-bounce" style={{ animationDelay: '1.5s', animationDuration: '3.5s' }}></div>
        </div>

        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center relative z-10 animate-[slideUp_0.5s_ease-out]">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 animate-[fadeIn_0.6s_ease-out_0.2s_both]">
            🎉 Congratulations!
          </h1>
          <p className="text-lg text-gray-600 mb-6 animate-[fadeIn_0.6s_ease-out_0.4s_both]">
            You've successfully completed:
          </p>
          
          {recipeData.imageUrl && (
            <div className="mb-4 animate-[fadeIn_0.6s_ease-out_0.5s_both]">
              <img 
                src={recipeData.imageUrl} 
                alt={recipeData.name}
                className="w-full h-48 object-cover rounded-2xl shadow-lg"
              />
            </div>
          )}
          
          <h2 className="text-xl font-bold text-gray-800 mb-6 animate-[fadeIn_0.6s_ease-out_0.6s_both]">
            {recipeData.name}
          </h2>
          
          <div className="grid grid-cols-3 gap-4 mb-8 animate-[fadeIn_0.6s_ease-out_0.7s_both]">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 transform hover:scale-105 transition-transform">
              <Clock className="w-6 h-6 text-[#26A8FF] mx-auto mb-2" />
              <p className="text-xs text-gray-500">Time</p>
              <p className="text-lg font-bold text-gray-900">{formatTime(session.elapsedTime)}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 transform hover:scale-105 transition-transform">
              <Flame className="w-6 h-6 text-orange-500 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Calories</p>
              <p className="text-lg font-bold text-gray-900">{recipeData.nutritionInfo?.calories || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 transform hover:scale-105 transition-transform">
              <Users className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Servings</p>
              <p className="text-lg font-bold text-gray-900">{recipeData.servings || 1}</p>
            </div>
          </div>
          
          <div className="space-y-3 animate-[fadeIn_0.6s_ease-out_0.8s_both]">
            <button
              onClick={() => {
                setSession({
                  recipeId: recipeData.id,
                  currentStep: 0,
                  totalSteps: instructions.length,
                  startTime: new Date(),
                  timers: [],
                  completedSteps: new Set(),
                  isPaused: false,
                  elapsedTime: 0
                });
                setShowCompletion(false);
              }}
              className="w-full py-4 bg-gradient-to-r from-[#26A8FF] to-[#1A8FE6] text-white rounded-xl font-semibold hover:shadow-xl transform hover:scale-105 transition-all"
            >
              Cook Again
            </button>
            <button
              onClick={handleExit}
              className="w-full py-4 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all"
            >
              ← Back to Recipe
            </button>
          </div>
        </div>

        {/* Add custom animations */}
        <style>{`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(50px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes scaleIn {
            from {
              transform: scale(0);
            }
            to {
              transform: scale(1);
            }
          }
          
          @keyframes checkmark {
            0% {
              transform: scale(0) rotate(-45deg);
            }
            50% {
              transform: scale(1.2) rotate(10deg);
            }
            100% {
              transform: scale(1) rotate(0deg);
            }
          }
          
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowExitConfirm(true)}
              className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-lg truncate max-w-xs">{recipeData.name}</h1>
              <p className="text-sm text-gray-400">
                Step {session.currentStep + 1} of {session.totalSteps}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors"
            >
              {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleFullscreen}
              className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="max-w-4xl mx-auto mt-4">
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#26A8FF] to-[#1A8FE6] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>{Math.round(progress)}% complete</span>
            <span>{formatTime(session.elapsedTime)} elapsed</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto">
          {/* Current Step */}
          <div className={`border-l-4 ${getStepColor(stepType)} rounded-2xl p-8 mb-6 shadow-xl`}>
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-[#26A8FF] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold">{session.currentStep + 1}</span>
              </div>
              <div className="flex-1">
                {stepType === 'critical' && (
                  <div className="flex items-center gap-2 text-orange-600 mb-2">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm font-semibold">Important Step</span>
                  </div>
                )}
                <p className="text-2xl leading-relaxed text-gray-900">
                  {currentInstruction}
                </p>
              </div>
            </div>

            {/* Quick Timer Button */}
            {timerInfo && (
              <button
                onClick={() => addTimer(
                  timerInfo.unit === 'minutes' ? timerInfo.time : timerInfo.time / 60,
                  `Step ${session.currentStep + 1} - ${timerInfo.text}`
                )}
                className="mt-4 px-4 py-2 bg-[#26A8FF] text-white rounded-lg flex items-center gap-2 hover:bg-[#1A8FE6] transition-colors"
              >
                <TimerIcon className="w-4 h-4" />
                Start {timerInfo.text} timer
              </button>
            )}
          </div>

          {/* Active Timers */}
          {session.timers.length > 0 && (
            <div className="bg-gray-800 rounded-2xl p-6 mb-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <TimerIcon className="w-5 h-5" />
                Active Timers
              </h3>
              <div className="space-y-3">
                {session.timers.map(timer => (
                  <div key={timer.id} className="bg-gray-700 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{timer.label}</p>
                      <p className={`text-2xl font-bold ${timer.remaining <= 10 ? 'text-red-400 animate-pulse' : 'text-[#26A8FF]'}`}>
                        {formatTime(timer.remaining)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleTimer(timer.id)}
                        className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center hover:bg-gray-500 transition-colors"
                      >
                        {timer.isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => removeTimer(timer.id)}
                        className="w-10 h-10 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center hover:bg-red-500/30 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ingredients Panel */}
          {showIngredients && (
            <div className="bg-gray-800 rounded-2xl p-6 mb-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <List className="w-5 h-5" />
                Ingredients
              </h3>
              <div className="space-y-2">
                {ingredients.map((ingredient, index) => (
                  <div key={index} className="flex items-center gap-3 py-2 px-3 bg-gray-700 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-[#26A8FF]" />
                    <span className="text-sm">
                      {typeof ingredient === 'string' ? ingredient : ingredient.name}
                      {typeof ingredient !== 'string' && ingredient.quantity && (
                        <span className="text-gray-400 ml-2">
                          {ingredient.quantity} {ingredient.unit}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Quick Actions */}
          <div className="flex justify-center gap-4 mb-4">
            <button
              onClick={() => setShowIngredients(!showIngredients)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                showIngredients ? 'bg-[#26A8FF] text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <List className="w-4 h-4 inline mr-2" />
              Ingredients
            </button>
            <button
              onClick={() => {
                const minutes = prompt('Enter timer duration (minutes):');
                if (minutes) {
                  addTimer(parseInt(minutes), `Custom - ${minutes} min`);
                }
              }}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-colors"
            >
              <TimerIcon className="w-4 h-4 inline mr-2" />
              Add Timer
            </button>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={previousStep}
              disabled={session.currentStep === 0}
              className="flex-1 py-4 bg-gray-700 rounded-xl font-semibold hover:bg-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <ChevronLeft className="w-5 h-5" />
              Previous
            </button>

            <button
              onClick={togglePause}
              className="w-16 h-16 bg-[#26A8FF] rounded-full flex items-center justify-center hover:bg-[#1A8FE6] transition-colors shadow-lg"
            >
              {session.isPaused ? <Play className="w-8 h-8" /> : <Pause className="w-8 h-8" />}
            </button>

            <button
              onClick={nextStep}
              className="flex-1 py-4 bg-[#26A8FF] rounded-xl font-semibold hover:bg-[#1A8FE6] transition-colors flex items-center justify-center gap-2"
            >
              {session.currentStep === session.totalSteps - 1 ? (
                <>
                  <Check className="w-5 h-5" />
                  Complete
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold mb-2">Exit Cooking Mode?</h3>
            <p className="text-gray-400 mb-6">Your progress will be lost if you exit now.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-3 bg-gray-700 rounded-xl font-semibold hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExit}
                className="flex-1 py-3 bg-red-500 rounded-xl font-semibold hover:bg-red-600 transition-colors"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
