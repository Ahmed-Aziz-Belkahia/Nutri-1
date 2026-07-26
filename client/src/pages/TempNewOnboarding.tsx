import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { FaApple, FaTiktok, FaYoutube, FaTv, FaXTwitter, FaInstagram, FaGoogle, FaFacebookF } from 'react-icons/fa6';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Line as ChartLine } from 'react-chartjs-2';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { OnboardingLanguageSelector } from '@/components/OnboardingLanguageSelector';
import { calculateCalorieTarget, calculateMacros, calculateGoalDate } from '@/lib/nutrition';
import { loadDraft, saveDraft, clearDraft } from '@/lib/onboardingStorage';
import { signInWithApple, isAppleSignInAvailable } from '@/lib/appleAuth';
import Paywall from '@/components/Paywall';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/hooks/use-user';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
  ChartOptions
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

/**
 * Step ids are the historical `currentStep` numbers of each render block.
 * STEP_ORDER is the sequence the user actually walks, so the flow can be
 * reordered and new screens inserted without renumbering nineteen blocks and
 * their hardcoded next/back targets.
 *
 * Order follows the Cal AI shape: cheap impersonal questions first to build
 * momentum, personal ones in the middle, attribution last, reward beats
 * between clusters, then the payoff — plan, save, paywall.
 */
const STEP_WELCOME = 0;
const STEP_GENDER = 1;
const STEP_HEIGHT_WEIGHT = 2;
const STEP_BIRTHDATE = 3;
const STEP_GOAL = 4;
const STEP_DESIRED_WEIGHT = 5;
const STEP_MOTIVATION = 6;
const STEP_SPEED = 7;
const STEP_COMPARISON = 8;
const STEP_OBSTACLES = 9;
const STEP_DIET = 10;
const STEP_ACCOMPLISHMENTS = 11;
const STEP_POTENTIAL = 12;
const STEP_WORKOUT = 13;
const STEP_REFERRAL = 14;
const STEP_OTHER_APPS = 15;
const STEP_CHART = 16;
const STEP_LOADING = 17;
const STEP_RESULTS = 18;
// New screens
const STEP_ALLERGIES = 19;
const STEP_PHYSIQUE = 20;
const STEP_SAVE = 21;
const STEP_PAYWALL = 22;

const STEP_ORDER: number[] = [
  STEP_WELCOME,
  STEP_GENDER,
  STEP_WORKOUT,          // moved earlier — easy question, builds momentum
  STEP_HEIGHT_WEIGHT,
  STEP_BIRTHDATE,
  STEP_GOAL,
  STEP_DESIRED_WEIGHT,   // skipped when maintaining
  STEP_MOTIVATION,       // skipped when maintaining
  STEP_SPEED,            // skipped when maintaining
  STEP_COMPARISON,
  STEP_OBSTACLES,
  STEP_DIET,
  STEP_ALLERGIES,
  STEP_PHYSIQUE,
  STEP_ACCOMPLISHMENTS,
  STEP_POTENTIAL,
  STEP_OTHER_APPS,
  STEP_REFERRAL,         // attribution last — lowest value to the user
  STEP_CHART,
  STEP_LOADING,
  STEP_RESULTS,
  STEP_SAVE,
  STEP_PAYWALL
];

/** Screens that only make sense when the user is losing or gaining weight. */
const GOAL_DEPENDENT_STEPS = [STEP_DESIRED_WEIGHT, STEP_MOTIVATION, STEP_SPEED];

/** Screens excluded from the progress bar — welcome and everything post-plan. */
const UNTRACKED_STEPS = [STEP_WELCOME, STEP_LOADING, STEP_RESULTS, STEP_SAVE, STEP_PAYWALL];

function visibleSteps(goal: string | null): number[] {
  return STEP_ORDER.filter(
    (s) => !(goal === 'maintain' && GOAL_DEPENDENT_STEPS.includes(s))
  );
}

// Animation variants
const pageVariants = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, x: -50, transition: { duration: 0.3 } }
};

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } }
};

const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.4 } }
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.5, type: "spring", stiffness: 200 } }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } }
};

// Logo Component with animation
const Logo = () => (
  <motion.div 
    className="flex justify-center mt-4 mb-6"
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.6, type: "spring", stiffness: 200 }}
  >
    <img 
      src="/nutri-ai-logo.png" 
      alt="NutriAI" 
      className="h-16 sm:h-20"
    />
  </motion.div>
);

// Phone Mockup Component with animation
const PhoneMockup = ({ imageSrc }: { imageSrc: string }) => (
  <motion.div 
    className="flex items-center justify-center my-4 flex-1"
    initial={{ opacity: 0, y: 20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.5, delay: 0.2, type: "spring", stiffness: 120 }}
  >
    <div className="relative w-[45vw] max-w-[200px] min-w-[140px]">
      <motion.img 
        src={imageSrc} 
        alt="NutriAI App" 
        className="w-full h-auto drop-shadow-xl"
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.3 }}
      />
    </div>
  </motion.div>
);

// Heading Component with animation
const Heading = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <motion.div 
    className="text-center mb-6"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0.3 }}
  >
    <h1 className="text-2xl sm:text-3xl font-bold text-[#1E293B] leading-tight">
      {title}
    </h1>
    {subtitle && (
      <motion.h2 
        className="text-2xl sm:text-3xl font-bold text-[#1E293B] leading-tight mt-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        {subtitle}
      </motion.h2>
    )}
  </motion.div>
);

// Primary Button Component with animation
const PrimaryButton = ({ onClick, children, disabled = false }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) => (
  <motion.button
    onClick={onClick}
    disabled={disabled}
    className="w-full py-4 bg-[#26A8FF] text-white font-semibold rounded-full text-base hover:bg-[#1A8FE6] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg shadow-[#26A8FF]/25"
    whileHover={{ scale: disabled ? 1 : 1.02 }}
    whileTap={{ scale: disabled ? 1 : 0.98 }}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
  >
    {children}
  </motion.button>
);

// Sign In Link Component
const SignInLink = ({ onClick, alreadyHaveAccountText, signInText }: { onClick: () => void; alreadyHaveAccountText: string; signInText: string }) => (
  <motion.div 
    className="text-center py-2"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.4, delay: 0.6 }}
  >
    <span className="text-gray-600 text-sm">
      {alreadyHaveAccountText}{' '}
    </span>
    <motion.button
      onClick={onClick}
      className="text-[#26A8FF] font-semibold text-sm hover:underline"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {signInText}
    </motion.button>
  </motion.div>
);

// Home Indicator Component - removed for fullscreen experience
const HomeIndicator = () => null;

// Onboarding Layout Container
const OnboardingLayout = ({ children, showLanguageSelector = true }: { children: React.ReactNode; showLanguageSelector?: boolean }) => (
  <div className="fixed inset-0 bg-gradient-to-b from-[#E8F5FF] to-white flex flex-col px-5 sm:px-8 py-6 overflow-y-auto">
    {/* Language selector at top right (RTL-aware) */}
    {showLanguageSelector && (
      <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4 z-50">
        <OnboardingLanguageSelector />
      </div>
    )}
    <div className="flex-1 flex flex-col max-w-lg w-full mx-auto">
      {children}
    </div>
  </div>
);

// Back Button Component with animation
const BackButton = ({ onClick }: { onClick: () => void }) => (
  <motion.button
    onClick={onClick}
    className="absolute left-6 top-12 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.3 }}
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
  >
    <ChevronLeft className="w-6 h-6" />
  </motion.button>
);

// Progress Bar Component with animation
const ProgressBar = ({ current, total }: { current: number; total: number }) => (
  <div className="absolute left-16 right-16 top-12 flex items-center h-10">
    <div className="h-1 bg-[#26A8FF]/20 rounded-full overflow-hidden w-full">
      <motion.div 
        className="h-full bg-[#26A8FF] rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${(current / total) * 100}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </div>
  </div>
);

// Page Title Component with animation
const PageTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <motion.div 
    className="mb-12"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0.1 }}
  >
    <h1 className="text-2xl font-bold text-[#1E293B] mb-2">
      {title}
    </h1>
    {subtitle && (
      <motion.p 
        className="text-[#64748B] text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        {subtitle}
      </motion.p>
    )}
  </motion.div>
);

// Selection Button Component with animation
const SelectionButton = ({ 
  label, 
  selected, 
  onClick,
  index = 0
}: { 
  label: string; 
  selected: boolean; 
  onClick: () => void;
  index?: number;
}) => (
  <motion.button
    onClick={onClick}
    className={`w-full py-4 rounded-full text-base font-semibold transition-all border-2 ${
      selected 
        ? 'bg-[#26A8FF] text-white border-[#26A8FF] shadow-lg shadow-[#26A8FF]/25' 
        : 'bg-white text-[#1E293B] border-gray-200 hover:border-[#26A8FF]/50 hover:bg-[#26A8FF]/5'
    }`}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: 0.1 + index * 0.1 }}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    {label}
  </motion.button>
);

// Unit Toggle Component
const UnitToggle = ({ isMetric, onChange, imperialLabel, metricLabel }: { isMetric: boolean; onChange: (metric: boolean) => void; imperialLabel: string; metricLabel: string }) => (
  <motion.div 
    className="flex items-center justify-center gap-3 mb-8"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: 0.3 }}
  >
    <span className={`text-sm font-semibold transition-all duration-200 ${!isMetric ? 'text-[#26A8FF]' : 'text-gray-400'}`}>
      {imperialLabel}
    </span>
    <motion.button
      onClick={() => onChange(!isMetric)}
      className={`relative w-14 h-8 rounded-full transition-all duration-300 ${
        isMetric ? 'bg-[#26A8FF]' : 'bg-gray-300'
      }`}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div 
        className="absolute top-0.5 w-7 h-7 bg-white rounded-full shadow-lg"
        animate={{ x: isMetric ? 26 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </motion.button>
    <span className={`text-sm font-semibold transition-all duration-200 ${isMetric ? 'text-[#26A8FF]' : 'text-gray-400'}`}>
      {metricLabel}
    </span>
  </motion.div>
);

// Speed Slider Component with Animal Icons
const SpeedSlider = ({ 
  value, 
  onChange, 
  min, 
  max, 
  unit,
  goalType,
  labels
}: { 
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  unit: string;
  goalType: string;
  labels: {
    loseSpeedLabel: string;
    gainSpeedLabel: string;
    maintainLabel: string;
    recommended: string;
  };
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartValue, setDragStartValue] = useState(value);
  
  const percentage = ((value - min) / (max - min)) * 100;
  
  // Animal icons as emojis
  const getAnimalIcon = (speed: 'slow' | 'medium' | 'fast') => {
    if (speed === 'slow') return '🐢';
    if (speed === 'medium') return '🐇';
    return '🐆';
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    
    // Check if clicking on the track (not dragging)
    const rect = scrollRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newValue = min + percentage * (max - min);
    onChange(Math.max(min, Math.min(max, Math.round(newValue * 10) / 10)));
    
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragStartValue(Math.max(min, Math.min(max, Math.round(newValue * 10) / 10)));
  };
  
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!scrollRef.current) return;
    
    // Check if tapping on the track
    const rect = scrollRef.current.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const percentage = touchX / rect.width;
    const newValue = min + percentage * (max - min);
    onChange(Math.max(min, Math.min(max, Math.round(newValue * 10) / 10)));
    
    setIsDragging(true);
    setDragStartX(e.touches[0].clientX);
    setDragStartValue(Math.max(min, Math.min(max, Math.round(newValue * 10) / 10)));
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    const deltaX = e.clientX - dragStartX;
    const containerWidth = scrollRef.current.clientWidth;
    const deltaValue = (deltaX / containerWidth) * (max - min);
    const newValue = Math.max(min, Math.min(max, dragStartValue + deltaValue));
    onChange(Math.round(newValue * 10) / 10);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !scrollRef.current) return;
    const deltaX = e.touches[0].clientX - dragStartX;
    const containerWidth = scrollRef.current.clientWidth;
    const deltaValue = (deltaX / containerWidth) * (max - min);
    const newValue = Math.max(min, Math.min(max, dragStartValue + deltaValue));
    onChange(Math.round(newValue * 10) / 10);
  };
  
  const handleEnd = () => {
    setIsDragging(false);
  };
  
  // Get speed label based on goal type
  const getSpeedLabel = () => {
    if (goalType === 'lose') return labels.loseSpeedLabel;
    if (goalType === 'gain') return labels.gainSpeedLabel;
    return labels.maintainLabel;
  };
  
  return (
    <motion.div 
      className="relative px-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      {/* Speed label */}
      <motion.div 
        className="text-center mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <p className="text-[#64748B] text-sm">{getSpeedLabel()}</p>
      </motion.div>
      
      {/* Current value display */}
      <motion.div 
        className="text-center mb-8"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.4, type: "spring" }}
      >
        <div className="text-4xl font-bold text-[#1E293B]">
          {value.toFixed(1)} {unit}
        </div>
      </motion.div>
      
      {/* Swipeable Slider with animal icons */}
      <motion.div 
        ref={scrollRef}
        className="relative mb-8 select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleEnd}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        {/* Animal icons */}
        <div className="flex justify-between px-2 mb-6">
          <motion.span 
            className="text-3xl"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: 0.6, type: "spring" }}
          >
            {getAnimalIcon('slow')}
          </motion.span>
          <motion.span 
            className="text-3xl"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: 0.7, type: "spring" }}
          >
            {getAnimalIcon('medium')}
          </motion.span>
          <motion.span 
            className="text-3xl"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: 0.8, type: "spring" }}
          >
            {getAnimalIcon('fast')}
          </motion.span>
        </div>
        
        {/* Slider track */}
        <div className="relative h-2 bg-[#26A8FF]/20 rounded-full">
          {/* Progress fill */}
          <motion.div 
            className="absolute left-0 top-0 h-full bg-[#26A8FF] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.3 }}
          />
          
          {/* Slider thumb */}
          <motion.div 
            className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-2 border-[#26A8FF] rounded-full shadow-md cursor-grab active:cursor-grabbing"
            animate={{ left: `calc(${percentage}% - 12px)` }}
            transition={{ duration: 0.2 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          />
        </div>
        
        {/* Min/Max labels */}
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>{min.toFixed(1)} {unit}</span>
          <span>{max.toFixed(1)} {unit}</span>
        </div>
      </motion.div>
      
      {/* Recommendation badge - always reserve space */}
      <div className="flex justify-center h-10 items-center">
        <AnimatePresence>
          {value >= 0.5 && value <= 1.0 && (
            <motion.span 
              className="px-4 py-2 bg-[#26A8FF]/10 rounded-full text-sm font-medium text-[#26A8FF]"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              {labels.recommended}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// Weight Transition Chart Component
const WeightTransitionChart = ({ labels, goal }: { labels: { title: string; description: string; week1: string; week2: string; week8: string }; goal: string | null }) => {
  const chartRef = useRef<any>(null);

  // Generate data based on goal
  const getChartData = () => {
    switch (goal) {
      case 'gain':
        // Weight gain: gradual increase
        return [65, 65.8, 67, 68.5, 70, 73];
      case 'maintain':
        // Maintain: stable with minor fluctuations
        return [75, 75.2, 74.8, 75.1, 74.9, 75];
      case 'lose':
      default:
        // Weight loss: gradual decrease
        return [80, 79.5, 78.2, 76.8, 75, 72];
    }
  };

  const getYAxisRange = () => {
    switch (goal) {
      case 'gain':
        return { min: 62, max: 76 };
      case 'maintain':
        return { min: 72, max: 78 };
      case 'lose':
      default:
        return { min: 68, max: 82 };
    }
  };

  const chartData = getChartData();
  const yAxisRange = getYAxisRange();

  const data = {
    labels: ['Day 1', 'Day 7', 'Day 14', 'Day 21', 'Day 30', 'Day 60'],
    datasets: [
      {
        label: 'Weight Progress',
        data: chartData,
        borderColor: '#26A8FF',
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 200);
          gradient.addColorStop(0, 'rgba(38, 168, 255, 0.3)');
          gradient.addColorStop(1, 'rgba(38, 168, 255, 0.05)');
          return gradient;
        },
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: [4, 4, 4, 4, 4, 0],
        pointBackgroundColor: '#FFFFFF',
        pointBorderColor: '#26A8FF',
        pointBorderWidth: 2,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#FFFFFF',
        pointHoverBorderColor: '#1A8FE6',
        pointHoverBorderWidth: 3,
      }
    ]
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: true,
          color: 'rgba(156, 163, 175, 0.2)',
          lineWidth: 1,
          drawTicks: false,
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 11,
            weight: 500,
          },
          padding: 8,
          callback: function(value, index) {
            if (index === 0) return labels.week1;
            if (index === 2) return labels.week2;
            if (index === 5) return labels.week8;
            return '';
          }
        },
        border: {
          display: false,
        },
      },
      y: {
        display: false,
        min: yAxisRange.min,
        max: yAxisRange.max,
      },
    },
    animation: {
      duration: 2000,
      easing: 'easeInOutQuart' as const,
      delay: 300,
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  // Custom plugin to draw the target indicator
  useEffect(() => {
    const chart = chartRef.current;
    if (chart) {
      const plugin = {
        id: 'targetIndicator',
        afterDatasetsDraw: (chart: any) => {
          const ctx = chart.ctx;
          const meta = chart.getDatasetMeta(0);
          const lastPoint = meta.data[meta.data.length - 1];
          
          if (lastPoint) {
            const x = lastPoint.x;
            const y = lastPoint.y;
            
            // Draw orange circle
            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, 16, 0, 2 * Math.PI);
            ctx.fillStyle = '#F97316';
            ctx.fill();
            
            // Draw target emoji
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🎯', x, y);
            ctx.restore();
          }
        }
      };
      
      ChartJS.register(plugin);
    }
  }, []);

  return (
    <motion.div 
      className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-gray-100"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <motion.h3 
        className="text-center font-semibold text-[#1E293B] mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        {labels.title}
      </motion.h3>
      
      {/* Chart Container */}
      <motion.div 
        className="relative h-48 mb-6"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <ChartLine ref={chartRef} data={data} options={options} />
      </motion.div>
      
      {/* Description */}
      <motion.p 
        className="text-center text-sm text-[#64748B] leading-relaxed"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.7 }}
      >
        {labels.description}
      </motion.p>
    </motion.div>
  );
};

// Trust Illustration Component with animation
const TrustIllustration = () => (
  <motion.div 
    className="flex justify-center mb-8"
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.6, type: "spring", stiffness: 150 }}
  >
    <div className="relative">
      {/* Gradient circle background */}
      <motion.div 
        className="w-52 h-52 rounded-full bg-gradient-to-br from-blue-100 via-sky-50 to-cyan-100 flex items-center justify-center"
        animate={{ 
          boxShadow: ['0 0 0 0 rgba(38, 168, 255, 0.2)', '0 0 0 20px rgba(38, 168, 255, 0)', '0 0 0 0 rgba(38, 168, 255, 0.2)']
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Dots around the circle */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200">
          {Array.from({ length: 32 }, (_, i) => {
            const angle = (i * 360) / 32;
            const radius = 92;
            const x = 100 + radius * Math.cos((angle * Math.PI) / 180);
            const y = 100 + radius * Math.sin((angle * Math.PI) / 180);
            return (
              <motion.circle
                key={i}
                cx={x}
                cy={y}
                r="1.5"
                fill="#26A8FF"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
              />
            );
          })}
        </svg>
        
        {/* Simple handshake emoji as fallback */}
        <motion.div 
          className="relative z-10 text-7xl"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3, type: "spring", stiffness: 200 }}
        >
          🤝
        </motion.div>
      </motion.div>
    </div>
  </motion.div>
);

// Setup Loading Page Component
const SetupLoadingPage = ({ onComplete, labels }: { 
  onComplete: () => void; 
  labels: {
    settingUp: string;
    dailyRecommendation: string;
    steps: {
      analyzing: string;
      calculating: string;
      personalizing: string;
      finalizing: string;
      almostReady: string;
    };
    items: {
      calories: string;
      carbs: string;
      protein: string;
      fats: string;
      health: string;
    };
  };
}) => {
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(labels.steps.analyzing);
  const [completedItems, setCompletedItems] = useState<string[]>([]);
  
  const setupItems = [
    { key: 'calories', label: labels.items.calories },
    { key: 'carbs', label: labels.items.carbs },
    { key: 'protein', label: labels.items.protein },
    { key: 'fats', label: labels.items.fats },
    { key: 'health', label: labels.items.health }
  ];
  
  const messages = [
    labels.steps.analyzing,
    labels.steps.calculating,
    labels.steps.personalizing,
    labels.steps.finalizing,
    labels.steps.almostReady
  ];
  
  useEffect(() => {
    let currentProgress = 0;
    
    const interval = setInterval(() => {
      currentProgress += 1;
      setProgress(currentProgress);
      
      // Update message based on progress
      const messageIndex = Math.floor((currentProgress / 100) * messages.length);
      setCurrentMessage(messages[Math.min(messageIndex, messages.length - 1)]);
      
      // Mark items as complete based on progress
      const itemsToComplete = Math.floor((currentProgress / 100) * setupItems.length);
      setCompletedItems(setupItems.slice(0, itemsToComplete).map(item => item.key));
      
      if (currentProgress >= 100) {
        clearInterval(interval);
        // Mark all items complete
        setCompletedItems(setupItems.map(item => item.key));
        // Call onComplete after a brief delay
        setTimeout(() => {
          onComplete();
        }, 800);
      }
    }, 50);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <motion.div 
      className="flex-1 flex flex-col justify-center px-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Large percentage display */}
      <motion.div 
        className="text-center mb-4"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.h1 
          className="text-6xl font-bold text-[#26A8FF]"
          key={progress}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.1 }}
        >
          {Math.floor(progress)}%
        </motion.h1>
      </motion.div>
      
      {/* Status message */}
      <motion.div 
        className="text-center mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <h2 className="text-xl font-semibold text-[#1E293B]">
          {labels.settingUp}
        </h2>
      </motion.div>
      
      {/* Animated progress bar */}
      <motion.div 
        className="mb-2"
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <div className="h-2 bg-[#26A8FF]/20 rounded-full overflow-hidden">
          <motion.div 
            className="h-full rounded-full bg-gradient-to-r from-[#26A8FF] to-[#1A8FE6]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
      </motion.div>
      
      {/* Current action message */}
      <motion.p 
        className="text-center text-sm text-gray-500 mb-8"
        key={currentMessage}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {currentMessage}
      </motion.p>
      
      {/* Daily recommendation checklist */}
      <motion.div 
        className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <p className="font-semibold text-sm text-[#1E293B] mb-3">
          {labels.dailyRecommendation}
        </p>
        <div className="space-y-2">
          {setupItems.map((item, index) => (
            <motion.div 
              key={item.key} 
              className="flex items-center justify-between"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
            >
              <span className="text-sm text-gray-700 flex items-center">
                • {item.label}
              </span>
              <motion.div 
                className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  completedItems.includes(item.key) 
                    ? 'bg-[#26A8FF]' 
                    : 'border-2 border-gray-300'
                }`}
                initial={false}
                animate={{ 
                  scale: completedItems.includes(item.key) ? [1, 1.2, 1] : 1,
                  backgroundColor: completedItems.includes(item.key) ? '#26A8FF' : 'transparent'
                }}
                transition={{ duration: 0.3 }}
              >
                {completedItems.includes(item.key) && (
                  <motion.svg 
                    className="w-3 h-3 text-white" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2, type: "spring" }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </motion.svg>
                )}
              </motion.div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

// Congratulations Page Component
const CongratulationsPage = ({ 
  weightKg, 
  desiredWeightKg, 
  selectedGoal,
  dailyCalories,
  macros: calculatedMacros,
  effectivePacePerWeek,
  labels,
  locale = 'en'
}: { 
  weightKg: number; 
  desiredWeightKg: number; 
  selectedGoal: string | null;
  dailyCalories?: number;
  macros?: { protein: number; carbs: number; fat: number };
  effectivePacePerWeek?: number;
  labels: {
    title: string;
    subtitle: string;
    yourGoal: string;
    targetDate: string;
    focus: string;
    stayHealthy: string;
    dailyTargets: string;
    personalizedForYou: string;
    editable: string;
    maintainWeight: string;
    lose: string;
    gain: string;
    kgUnit: string;
    macros: {
      calories: string;
      protein: string;
      carbs: string;
      fat: string;
    };
  };
  locale?: string;
}) => {
  // Map language codes to locale codes for date formatting
  const localeMap: { [key: string]: string } = {
    en: 'en-US',
    ar: 'ar-SA',
    fr: 'fr-FR',
    es: 'es-ES',
    pl: 'pl-PL'
  };
  const dateLocale = localeMap[locale] || 'en-US';
  
  // Projected from the pace the user actually chose. This used to be a
  // hardcoded 84 days for everyone, which contradicted both their goal weight
  // and the speed slider they had just dragged.
  const projection = calculateGoalDate(weightKg, desiredWeightKg, effectivePacePerWeek ?? 0);
  const targetDateStr = projection
    ? projection.date.toLocaleDateString(dateLocale, { month: 'long', day: 'numeric', year: 'numeric' })
    : labels.stayHealthy;
  
  // Calculate weight difference
  const weightDiff = Math.abs(weightKg - desiredWeightKg);
  const goalText = selectedGoal === 'lose' ? labels.lose : selectedGoal === 'gain' ? labels.gain : labels.maintainWeight;
  
  // Use calculated values or defaults
  const macros = [
    { name: labels.macros.calories, value: dailyCalories || 2000, unit: '', color: '#26A8FF' },
    { name: labels.macros.protein, value: calculatedMacros?.protein || 150, unit: 'g', color: '#FFA434' },
    { name: labels.macros.carbs, value: calculatedMacros?.carbs || 200, unit: 'g', color: '#5AEB4E' },
    { name: labels.macros.fat, value: calculatedMacros?.fat || 65, unit: 'g', color: '#FB6060' },
  ];
  
  return (
    <motion.div 
      className="flex-1 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Success Header */}
      <div className="text-center pt-2 pb-6">
        {/* Success checkmark */}
        <motion.div 
          className="flex justify-center mb-4"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 200 }}
        >
          <motion.div 
            className="w-16 h-16 bg-gradient-to-br from-[#26A8FF] to-[#1A8FE6] rounded-full flex items-center justify-center shadow-xl shadow-[#26A8FF]/30"
            animate={{ 
              boxShadow: ['0 10px 40px rgba(38, 168, 255, 0.3)', '0 10px 60px rgba(38, 168, 255, 0.5)', '0 10px 40px rgba(38, 168, 255, 0.3)']
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <motion.path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={3} 
                d="M5 13l4 4L19 7"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              />
            </svg>
          </motion.div>
        </motion.div>
        
        {/* Title */}
        <motion.h1 
          className="text-2xl font-bold text-[#1E293B] mb-1"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          {labels.title}
        </motion.h1>
        <motion.p 
          className="text-[#64748B] text-base"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          {labels.subtitle}
        </motion.p>
      </div>
      
      {/* Goal Card */}
      <motion.div 
        className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#64748B] text-xs uppercase tracking-wide mb-1">{labels.yourGoal}</p>
            <p className="font-bold text-lg text-[#1E293B]">
              {selectedGoal === 'maintain' ? labels.maintainWeight : `${goalText} ${weightDiff} ${labels.kgUnit}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[#64748B] text-xs uppercase tracking-wide mb-1">{selectedGoal === 'maintain' ? labels.focus : labels.targetDate}</p>
            <p className="font-semibold text-[#26A8FF]">
              {selectedGoal === 'maintain' ? labels.stayHealthy : targetDateStr}
            </p>
          </div>
        </div>
      </motion.div>
      
      {/* Daily Targets Card */}
      <motion.div 
        className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex-1"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-[#1E293B] text-base">
              {labels.dailyTargets}
            </h3>
            <p className="text-[#64748B] text-xs">
              {labels.personalizedForYou}
            </p>
          </div>
          <motion.span 
            className="text-xs text-[#26A8FF] font-medium bg-[#26A8FF]/10 px-3 py-1 rounded-full"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: 1, type: "spring" }}
          >
            {labels.editable}
          </motion.span>
        </div>
        
        {/* Macro Grid - 2x2 layout matching dashboard style */}
        <div className="grid grid-cols-2 gap-3">
          {macros.map((macro, index) => (
            <motion.div 
              key={macro.name}
              className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-100"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.8 + index * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <motion.div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: macro.color }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3, delay: 1 + index * 0.1, type: "spring" }}
                />
                <span className="text-xs font-medium text-[#64748B]">{macro.name}</span>
              </div>
              
              <motion.p 
                className="text-2xl font-bold text-[#1E293B]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 1.1 + index * 0.1 }}
              >
                {macro.value}
                {macro.unit && <span className="text-base font-normal text-[#64748B] ml-0.5">{macro.unit}</span>}
              </motion.p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

// Accomplishment Option Component with animation
const AccomplishmentOption = ({ 
  icon,
  label,
  selected, 
  onClick,
  index = 0
}: { 
  icon: React.ReactNode;
  label: string;
  selected: boolean; 
  onClick: () => void;
  index?: number;
}) => (
  <motion.button
    onClick={onClick}
    className={`w-full p-4 rounded-2xl text-left transition-all ${
      selected 
        ? 'bg-[#26A8FF]/10 border-2 border-[#26A8FF]' 
        : 'bg-white border-2 border-gray-100 hover:border-[#26A8FF]/30'
    }`}
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.4, delay: index * 0.08 }}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    <div className="flex items-center gap-3">
      <motion.span 
        className="text-xl"
        animate={{ scale: selected ? 1.2 : 1 }}
        transition={{ duration: 0.2 }}
      >
        {icon}
      </motion.span>
      <span className="font-medium text-[#1E293B] text-base">{label}</span>
    </div>
  </motion.button>
);

// Diet Option Component with animation
const DietOption = ({ 
  icon,
  label,
  selected, 
  onClick,
  index = 0
}: { 
  icon: React.ReactNode;
  label: string;
  selected: boolean; 
  onClick: () => void;
  index?: number;
}) => (
  <motion.button
    onClick={onClick}
    className={`w-full p-4 rounded-2xl text-left transition-all ${
      selected 
        ? 'bg-[#26A8FF]/10 border-2 border-[#26A8FF]' 
        : 'bg-white border-2 border-gray-100 hover:border-[#26A8FF]/30'
    }`}
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.4, delay: index * 0.08 }}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    <div className="flex items-center gap-3">
      <motion.span 
        className="text-xl"
        animate={{ scale: selected ? 1.2 : 1 }}
        transition={{ duration: 0.2 }}
      >
        {icon}
      </motion.span>
      <span className="font-medium text-[#1E293B] text-base">{label}</span>
    </div>
  </motion.button>
);

// Obstacle Option Component with animation
const ObstacleOption = ({ 
  icon,
  label,
  selected, 
  onClick,
  index = 0
}: { 
  icon: React.ReactNode;
  label: string;
  selected: boolean; 
  onClick: () => void;
  index?: number;
}) => (
  <motion.button
    onClick={onClick}
    className={`w-full p-4 rounded-2xl text-left transition-all border-2 ${
      selected 
        ? 'bg-[#26A8FF]/10 border-[#26A8FF]' 
        : 'bg-white border-gray-200 hover:border-[#26A8FF]/30'
    }`}
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.4, delay: index * 0.08 }}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    <div className="flex items-center gap-3">
      <motion.span 
        className="text-xl"
        animate={{ scale: selected ? 1.2 : 1 }}
        transition={{ duration: 0.2 }}
      >
        {icon}
      </motion.span>
      <span className="font-medium text-[#1E293B]">{label}</span>
    </div>
  </motion.button>
);

// Comparison Card Component
const ComparisonCard = ({ 
  label, 
  value, 
  isHighlight,
  fillPercentage,
  index = 0
}: { 
  label: string; 
  value: string; 
  isHighlight: boolean;
  fillPercentage?: number;
  index?: number;
}) => (
  <motion.div 
    className="flex-1 h-full"
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0.3 + index * 0.15 }}
  >
    {/* Container with border and background */}
    <div className="relative h-full rounded-3xl bg-gray-100 border-2 border-gray-200 overflow-hidden">
      {/* Background fill */}
      <motion.div 
        className={`absolute bottom-0 left-0 right-0 ${
          isHighlight ? 'bg-[#26A8FF]' : 'bg-gray-300'
        }`}
        initial={{ height: 0 }}
        animate={{ height: `${fillPercentage || 100}%` }}
        transition={{ duration: 0.8, delay: 0.5 + index * 0.15, ease: "easeOut" }}
      />
      
      {/* Content */}
      <div className={`relative z-10 p-6 flex flex-col items-center justify-center h-full ${
        isHighlight ? 'text-white' : 'text-[#1E293B]'
      }`}>
        <p className={`text-sm font-semibold mb-3 ${
          isHighlight ? 'text-white' : 'text-[#64748B]'
        }`}>
          {label}
        </p>
        <motion.p 
          className="text-4xl font-bold"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.7 + index * 0.15 }}
        >
          {value}
        </motion.p>
      </div>
    </div>
  </motion.div>
);

// Weight Slider Component (Ruler Style)
const WeightSlider = ({ 
  value, 
  onChange, 
  min, 
  max, 
  unit,
  currentWeight,
  goalLabel
}: { 
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  unit: string;
  currentWeight: number;
  goalLabel: string;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const pixelsPerUnit = 20; // 20 pixels per kg (matching OnboardingQuiz)
  const CAL = -10; // Calibration offset for center alignment
  const totalUnits = Math.ceil(max - min) + 1;
  
  // Scroll to selected value
  useEffect(() => {
    if (scrollRef.current && !isDragging) {
      const scrollPosition = (value - min) * pixelsPerUnit - CAL;
      scrollRef.current.scrollLeft = scrollPosition;
    }
  }, [value, min, isDragging]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    
    const scrollLeft = scrollRef.current.scrollLeft;
    const newValue = min + (scrollLeft + CAL) / pixelsPerUnit;
    const roundedValue = Math.round(newValue);
    const clampedValue = Math.max(min, Math.min(max, roundedValue));
    
    if (clampedValue !== value) {
      onChange(clampedValue);
    }
  };
  
  return (
    <motion.div 
      className="relative w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      {/* Current value display */}
      <div className="text-center mb-8">
        <motion.div 
          className="text-sm text-[#64748B] mb-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          {goalLabel}
        </motion.div>
        <motion.div 
          className="text-5xl font-bold text-[#1E293B]"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5, type: "spring" }}
        >
          {value.toFixed(1)} <span className="text-3xl text-[#64748B]">{unit}</span>
        </motion.div>
      </div>
      
      {/* Ruler container */}
      <motion.div 
        className="relative h-24 bg-gray-50 rounded-2xl overflow-hidden w-full"
        initial={{ opacity: 0, scaleX: 0.9 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.4, delay: 0.6 }}
      >
        {/* Center indicator line (fixed in middle) */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 bg-[#26A8FF] z-20 pointer-events-none" />
        <div className="absolute left-1/2 -translate-x-1/2 top-0 w-3 h-3 bg-[#26A8FF] rounded-b-full z-20 pointer-events-none" />
        
        {/* Scrollable ruler */}
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          className="h-full overflow-x-scroll scrollbar-hide cursor-grab active:cursor-grabbing"
          style={{ scrollbarWidth: 'none' }}
        >
          <div 
            className="flex items-end h-16 select-none"
            style={{ 
              width: `${totalUnits * pixelsPerUnit}px`,
              paddingLeft: '50%',
              paddingRight: '50%'
            }}
          >
            {Array.from({ length: totalUnits }, (_, i) => {
              const tickValue = min + i;
              const isMajorTick = tickValue % 10 === 0;
              const isMediumTick = tickValue % 5 === 0 && tickValue % 10 !== 0;
              const isCurrentWeight = Math.abs(tickValue - currentWeight) < 1;
              
              return (
                <div key={i} className="flex flex-col items-center justify-end" style={{ minWidth: `${pixelsPerUnit}px` }}>
                  {isMajorTick ? (
                    <>
                      <div className={`w-0.5 h-12 ${isCurrentWeight ? 'bg-[#26A8FF]' : 'bg-gray-400'}`} />
                      <span className={`text-xs mt-1 font-bold ${isCurrentWeight ? 'text-[#26A8FF]' : 'text-[#1E293B]'}`}>
                        {tickValue}
                      </span>
                    </>
                  ) : isMediumTick ? (
                    <>
                      <div className={`w-0.5 h-8 ${isCurrentWeight ? 'bg-[#26A8FF]' : 'bg-gray-300'}`} />
                      <span className={`text-[10px] mt-1 ${isCurrentWeight ? 'text-[#26A8FF]' : 'text-[#64748B]'}`}>
                        {tickValue}
                      </span>
                    </>
                  ) : (
                    <div className={`w-0.5 h-4 ${isCurrentWeight ? 'bg-[#26A8FF]' : 'bg-gray-400'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Gradient overlays for fade effect */}
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-gray-50 to-transparent pointer-events-none z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none z-10" />
      </motion.div>
    </motion.div>
  );
};

// iOS Style Picker Component
const IOSPicker = ({ 
  value, 
  onChange, 
  items,
  suffix = '',
  formatter
}: { 
  value: number | string;
  onChange: (value: any) => void;
  items: (number | string)[];
  suffix?: string;
  formatter?: (value: any) => string;
}) => {
  const containerRef = useRef<HTMLUListElement>(null);
  const itemHeight = 44;
  const [selectedIndex, setSelectedIndex] = useState(items.indexOf(value));
  
  // Use refs to avoid stale closures in callbacks
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const itemsRef = useRef(items);
  
  // Keep refs updated
  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
    itemsRef.current = items;
  }, [value, onChange, items]);

  useEffect(() => {
    if (containerRef.current) {
      const index = items.indexOf(value);
      setSelectedIndex(index);
      containerRef.current.scrollTop = index * itemHeight;
    }
  }, [value, items, itemHeight]);

  // Function to update the value based on current scroll position - uses refs to avoid stale closures
  const updateValueFromScroll = () => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    const clampedIndex = Math.max(0, Math.min(index, itemsRef.current.length - 1));
    setSelectedIndex(clampedIndex);
    
    const newValue = itemsRef.current[clampedIndex];
    if (newValue !== undefined && newValue !== valueRef.current) {
      onChangeRef.current(newValue);
    }
  };

  // Use scrollend event for precise snap detection (with fallback)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleScrollEnd = () => {
      updateValueFromScroll();
    };
    
    // Modern browsers support scrollend
    container.addEventListener('scrollend', handleScrollEnd);
    
    return () => {
      container.removeEventListener('scrollend', handleScrollEnd);
    };
  }, []);

  const handleScroll = () => {
    // Update selected index for visual feedback immediately
    if (containerRef.current) {
      const scrollTop = containerRef.current.scrollTop;
      const index = Math.round(scrollTop / itemHeight);
      const clampedIndex = Math.max(0, Math.min(index, itemsRef.current.length - 1));
      setSelectedIndex(clampedIndex);
      
      // Also update value immediately for browsers that don't support scrollend
      const newValue = itemsRef.current[clampedIndex];
      if (newValue !== undefined && newValue !== valueRef.current) {
        onChangeRef.current(newValue);
      }
    }
  };

  return (
    <motion.div 
      className="ios-style-picker relative h-52 overflow-hidden rounded-xl bg-white"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <ul
        ref={containerRef}
        onScroll={handleScroll}
        className="ios-style-picker__option-list h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide list-none m-0 p-0"
        style={{ 
          paddingTop: `${itemHeight * 2}px`, 
          paddingBottom: `${itemHeight * 2}px`,
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {items.map((item, idx) => {
          const distance = Math.abs(selectedIndex - idx);
          const opacity = Math.max(0.2, 1 - (distance * 0.3));
          const scale = idx === selectedIndex ? 1 : Math.max(0.85, 1 - (distance * 0.05));
          
          return (
            <li
              key={item}
              className="ios-style-picker__option-item snap-center flex items-center justify-center transition-all duration-150"
              style={{ height: `${itemHeight}px` }}
            >
              <span
                className={`text-xl transition-all duration-300 ease-out ${
                  idx === selectedIndex 
                    ? 'text-[#1E293B] font-semibold' 
                    : 'text-[#64748B] font-normal'
                }`}
                style={{
                  opacity,
                  transform: `scale(${scale})`,
                  letterSpacing: '-0.02em',
                  transition: 'all 0.3s ease-out'
                }}
              >
                {formatter ? formatter(item) : `${item}${suffix}`}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="ios-style-picker__highlight absolute inset-0 pointer-events-none">
        <ul className="ios-style-picker__highlight-list list-none m-0 p-0">
          {/* Top gradient */}
          <li className="ios-style-picker__highlight-item absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white via-white/80 to-transparent z-10" />
          {/* Selection highlight */}
          <li className="ios-style-picker__highlight-item absolute inset-x-0 top-1/2 -translate-y-1/2 h-11 bg-gray-50/50 border-y border-gray-200/60 z-0" />
          {/* Bottom gradient */}
          <li className="ios-style-picker__highlight-item absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white via-white/80 to-transparent z-10" />
        </ul>
      </div>
    </motion.div>
  );
};

// Workout Icons
const WorkoutIcon = ({ type }: { type: 'low' | 'medium' | 'high' }) => {
  if (type === 'low') {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="3.5" fill="currentColor" />
      </svg>
    );
  }
  if (type === 'medium') {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="7" cy="17" r="3" fill="currentColor" />
        <circle cx="14" cy="8" r="3" fill="currentColor" />
        <circle cx="21" cy="17" r="3" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="7" cy="8" r="2.5" fill="currentColor" />
      <circle cx="14" cy="8" r="2.5" fill="currentColor" />
      <circle cx="21" cy="8" r="2.5" fill="currentColor" />
      <circle cx="7" cy="15" r="2.5" fill="currentColor" />
      <circle cx="14" cy="15" r="2.5" fill="currentColor" />
      <circle cx="21" cy="15" r="2.5" fill="currentColor" />
    </svg>
  );
};

// Option Card Component - for workout selection with animation
const OptionCard = ({ 
  iconType,
  title,
  subtitle,
  selected, 
  onClick,
  index = 0
}: { 
  iconType: 'low' | 'medium' | 'high';
  title: string;
  subtitle: string;
  selected: boolean; 
  onClick: () => void;
  index?: number;
}) => (
  <motion.button
    onClick={onClick}
    className={`w-full p-4 rounded-2xl text-left transition-all border-2 ${
      selected 
        ? 'bg-[#26A8FF]/10 border-[#26A8FF]' 
        : 'bg-white border-gray-200 hover:border-[#26A8FF]/30'
    }`}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: index * 0.1 }}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    <div className="flex items-center gap-3">
      <motion.div 
        className={`flex-shrink-0 ${selected ? 'text-[#26A8FF]' : 'text-[#1E293B]'}`}
        animate={{ scale: selected ? 1.1 : 1 }}
        transition={{ duration: 0.2 }}
      >
        <WorkoutIcon type={iconType} />
      </motion.div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-[#1E293B]">{title}</span>
        </div>
        <span className="text-sm text-[#64748B]">{subtitle}</span>
      </div>
    </div>
  </motion.button>
);

// Source Option Component - for "Where did you hear about us?" with animation
const SourceOption = ({ 
  icon,
  label,
  selected, 
  onClick,
  index = 0
}: { 
  icon: React.ReactNode;
  label: string;
  selected: boolean; 
  onClick: () => void;
  index?: number;
}) => (
  <motion.button
    onClick={onClick}
    className={`w-full p-3 rounded-2xl text-left transition-all border-2 ${
      selected 
        ? 'bg-[#26A8FF]/10 border-[#26A8FF]' 
        : 'bg-white border-gray-200 hover:border-[#26A8FF]/30'
    }`}
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3, delay: index * 0.05 }}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    <div className="flex items-center gap-3">
      <div className="flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <span className="font-medium text-[#1E293B]">{label}</span>
    </div>
  </motion.button>
);

// Yes/No Option Component with animation
const YesNoOption = ({ 
  icon,
  label,
  selected, 
  onClick,
  index = 0
}: { 
  icon: string;
  label: string;
  selected: boolean; 
  onClick: () => void;
  index?: number;
}) => (
  <motion.button
    onClick={onClick}
    className={`w-full p-4 rounded-2xl text-left transition-all border-2 ${
      selected 
        ? 'bg-[#26A8FF]/10 border-[#26A8FF]' 
        : 'bg-white border-gray-200 hover:border-[#26A8FF]/30'
    }`}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: index * 0.15 }}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    <div className="flex items-center gap-3">
      <motion.span 
        className="text-2xl"
        animate={{ scale: selected ? 1.2 : 1 }}
        transition={{ duration: 0.2 }}
      >
        {icon}
      </motion.span>
      <span className="font-semibold text-[#1E293B] text-lg">{label}</span>
    </div>
  </motion.button>
);

// Weight Chart Component (adapts based on goal)
const WeightLossChart = ({ labels, goal }: { 
  labels: { 
    yourWeight: string; 
    month1: string; 
    month6: string; 
    nutriAI: string; 
    weight: string; 
    traditionalDiet: string; 
  };
  goal: string | null;
}) => {
  // Generate data based on goal
  const getChartData = () => {
    switch (goal) {
      case 'gain':
        // Weight gain: NutriAI helps gain muscle mass effectively
        return [
          { month: 1, nutriAI: 65, traditional: 65 },
          { month: 2, nutriAI: 66.5, traditional: 65.5 },
          { month: 3, nutriAI: 68, traditional: 66 },
          { month: 4, nutriAI: 70, traditional: 66.3 },
          { month: 5, nutriAI: 72, traditional: 66.5 },
          { month: 6, nutriAI: 74, traditional: 67 },
        ];
      case 'maintain':
        // Maintain: NutriAI keeps weight stable, traditional fluctuates
        return [
          { month: 1, nutriAI: 75, traditional: 75 },
          { month: 2, nutriAI: 75.1, traditional: 76 },
          { month: 3, nutriAI: 74.9, traditional: 74 },
          { month: 4, nutriAI: 75, traditional: 76.5 },
          { month: 5, nutriAI: 75.1, traditional: 74.5 },
          { month: 6, nutriAI: 75, traditional: 77 },
        ];
      case 'lose':
      default:
        // Weight loss: NutriAI more effective than traditional
        return [
          { month: 1, nutriAI: 80, traditional: 80 },
          { month: 2, nutriAI: 77.5, traditional: 79 },
          { month: 3, nutriAI: 75, traditional: 78.5 },
          { month: 4, nutriAI: 73, traditional: 78 },
          { month: 5, nutriAI: 71, traditional: 77.8 },
          { month: 6, nutriAI: 69, traditional: 77.5 },
        ];
    }
  };

  const getYAxisDomain = () => {
    switch (goal) {
      case 'gain':
        return [62, 77];
      case 'maintain':
        return [72, 79];
      case 'lose':
      default:
        return [65, 82];
    }
  };

  const data = getChartData();
  const yAxisDomain = getYAxisDomain();

  return (
    <motion.div 
      className="w-full bg-white rounded-3xl p-6 mb-6 shadow-sm border border-gray-100"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <motion.div 
        className="text-sm font-semibold text-[#1E293B] mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        {labels.yourWeight}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <defs>
              <linearGradient id="nutriGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#26A8FF" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#26A8FF" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 13, fill: '#6b7280', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => value === 1 ? labels.month1 : value === 6 ? labels.month6 : ''}
              ticks={[1, 6]}
              domain={[1, 6]}
            />
            <YAxis hide domain={yAxisDomain} />
            
            {/* Traditional Diet Line */}
            <Line 
              type="natural" 
              dataKey="traditional" 
              stroke="#ef4444" 
              strokeWidth={3}
              dot={{ fill: '#ef4444', r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
              name="traditional"
            />
            
            {/* NutriAI Line with gradient fill */}
            <Line 
              type="natural" 
              dataKey="nutriAI" 
              stroke="#26A8FF" 
              strokeWidth={3.5}
              dot={{ fill: '#26A8FF', r: 5, strokeWidth: 0 }}
              activeDot={{ r: 7, strokeWidth: 2, stroke: '#fff' }}
              name="nutriAI"
              fill="url(#nutriGradient)"
            />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>
      
      {/* Legend */}
      <motion.div 
        className="flex items-center gap-6 justify-center mt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.7 }}
      >
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-[#26A8FF] shadow-sm"></div>
          <span className="text-xs font-semibold text-[#1E293B]">{labels.nutriAI}</span>
          <span className="text-xs bg-[#26A8FF] text-white px-2.5 py-1 rounded-full font-medium">{labels.weight}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-10 h-0.5 bg-red-500 rounded-full"></div>
          <span className="text-xs text-gray-600 font-medium">{labels.traditionalDiet}</span>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function TempNewOnboarding() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation('onboarding');
  const { user, isLoading } = useUser();

  // Redirect authenticated users who have completed onboarding to dashboard
  useEffect(() => {
    if (!isLoading && user?.hasCompletedOnboarding) {
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

  // Restore a draft synchronously on first render so there is no flash of
  // step 1 before the resume kicks in.
  const [currentStep, setCurrentStep] = useState<number>(() => {
    const draft = loadDraft();
    if (draft?.stepId != null) {
      const n = Number(draft.stepId);
      if (Number.isFinite(n) && STEP_ORDER.includes(n)) return n;
    }
    return STEP_WELCOME;
  });

  const [selectedGender, setSelectedGender] = useState<string | null>(null);
  const [isMetric, setIsMetric] = useState(true);
  const [heightFeet, setHeightFeet] = useState(5);
  const [heightInches, setHeightInches] = useState(6);
  const [heightCm, setHeightCm] = useState(170);
  const [weightLbs, setWeightLbs] = useState(120);
  const [weightKg, setWeightKg] = useState(54);
  const [birthMonth, setBirthMonth] = useState('January');
  const [birthDay, setBirthDay] = useState(1);
  const [birthYear, setBirthYear] = useState(2000);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [desiredWeightKg, setDesiredWeightKg] = useState(65);
  const [desiredWeightLbs, setDesiredWeightLbs] = useState(143);
  const [weightLossSpeed, setWeightLossSpeed] = useState(0.8);
  const [weightGainSpeed, setWeightGainSpeed] = useState(0.5);
  const [workoutFrequency, setWorkoutFrequency] = useState<string | null>(null);
  const [referralSource, setReferralSource] = useState<string | null>(null);
  const [hasUsedOtherApps, setHasUsedOtherApps] = useState<boolean | null>(null);
  const [selectedObstacles, setSelectedObstacles] = useState<string[]>([]);
  const [selectedDiet, setSelectedDiet] = useState<string | null>(null);
  const [selectedAccomplishments, setSelectedAccomplishments] = useState<string[]>([]);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [selectedPhysique, setSelectedPhysique] = useState<string | null>(null);

  // --- Draft restore -------------------------------------------------------
  // Answers are rehydrated once on mount. Without this, moving auth to the end
  // of the flow would mean an app kill at question 16 destroys everything —
  // strictly worse than the old auth-first flow.
  const restoredRef = useRef(false);
  if (!restoredRef.current) {
    restoredRef.current = true;
    const a = loadDraft()?.answers as Record<string, any> | undefined;
    if (a) {
      if (a.selectedGender != null) setSelectedGender(a.selectedGender);
      if (a.isMetric != null) setIsMetric(a.isMetric);
      if (a.heightFeet != null) setHeightFeet(a.heightFeet);
      if (a.heightInches != null) setHeightInches(a.heightInches);
      if (a.heightCm != null) setHeightCm(a.heightCm);
      if (a.weightLbs != null) setWeightLbs(a.weightLbs);
      if (a.weightKg != null) setWeightKg(a.weightKg);
      if (a.birthMonth != null) setBirthMonth(a.birthMonth);
      if (a.birthDay != null) setBirthDay(a.birthDay);
      if (a.birthYear != null) setBirthYear(a.birthYear);
      if (a.selectedGoal != null) setSelectedGoal(a.selectedGoal);
      if (a.desiredWeightKg != null) setDesiredWeightKg(a.desiredWeightKg);
      if (a.desiredWeightLbs != null) setDesiredWeightLbs(a.desiredWeightLbs);
      if (a.weightLossSpeed != null) setWeightLossSpeed(a.weightLossSpeed);
      if (a.weightGainSpeed != null) setWeightGainSpeed(a.weightGainSpeed);
      if (a.workoutFrequency != null) setWorkoutFrequency(a.workoutFrequency);
      if (a.referralSource != null) setReferralSource(a.referralSource);
      if (a.hasUsedOtherApps != null) setHasUsedOtherApps(a.hasUsedOtherApps);
      if (a.selectedObstacles != null) setSelectedObstacles(a.selectedObstacles);
      if (a.selectedDiet != null) setSelectedDiet(a.selectedDiet);
      if (a.selectedAccomplishments != null) setSelectedAccomplishments(a.selectedAccomplishments);
      if (a.selectedAllergies != null) setSelectedAllergies(a.selectedAllergies);
      if (a.selectedPhysique != null) setSelectedPhysique(a.selectedPhysique);
    }
  }

  // Persist on every answer change. Cheap (a few hundred bytes, synchronous)
  // and it is what makes every resume case below work.
  useEffect(() => {
    if (currentStep === STEP_WELCOME) return;
    saveDraft({
      stepId: String(currentStep),
      answers: {
        selectedGender, isMetric, heightFeet, heightInches, heightCm,
        weightLbs, weightKg, birthMonth, birthDay, birthYear,
        selectedGoal, desiredWeightKg, desiredWeightLbs,
        weightLossSpeed, weightGainSpeed, workoutFrequency,
        referralSource, hasUsedOtherApps, selectedObstacles,
        selectedDiet, selectedAccomplishments, selectedAllergies, selectedPhysique
      }
    });
  }, [
    currentStep, selectedGender, isMetric, heightFeet, heightInches, heightCm,
    weightLbs, weightKg, birthMonth, birthDay, birthYear, selectedGoal,
    desiredWeightKg, desiredWeightLbs, weightLossSpeed, weightGainSpeed,
    workoutFrequency, referralSource, hasUsedOtherApps, selectedObstacles,
    selectedDiet, selectedAccomplishments, selectedAllergies, selectedPhysique
  ]);

  // An already-authenticated user with no draft (signed in on a fresh install,
  // never finished onboarding) has no use for the welcome pitch.
  useEffect(() => {
    if (!isLoading && user && !user.hasCompletedOnboarding && currentStep === STEP_WELCOME) {
      setCurrentStep(STEP_GENDER);
    }
  }, [isLoading, user, currentStep]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const finishOnboarding = () => {
    clearDraft();
    navigate('/dashboard');
  };

  const handleAppleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const result = await signInWithApple();
      if (!result) return; // user dismissed Apple's sheet
      // The account now exists, so the (auth-required) profile write can run.
      await mutation.mutateAsync();
    } catch (err) {
      console.error('[Onboarding] Apple save failed:', err);
      setSaveError(
        err instanceof Error ? err.message : t('save.error', 'Could not save your plan. Please try again.')
      );
    } finally {
      setIsSaving(false);
    }
  };

  // --- Navigation ----------------------------------------------------------
  const steps = visibleSteps(selectedGoal);
  const stepIndex = steps.indexOf(currentStep);

  // `goalOverride` exists because the goal screen advances in the same click
  // that sets selectedGoal — `steps` above is still computed from the previous
  // value at that moment, so a maintainer would otherwise walk into the three
  // screens they should skip.
  const goNext = (goalOverride?: string) => {
    const list = goalOverride ? visibleSteps(goalOverride) : steps;
    const i = list.indexOf(currentStep);
    if (i >= 0 && i < list.length - 1) setCurrentStep(list[i + 1]);
  };

  const goBack = () => {
    const i = steps.indexOf(currentStep);
    if (i > 0) setCurrentStep(steps[i - 1]);
  };

  // Progress counts only the question screens, so the bar stays honest for
  // maintainers (who skip three) instead of the old hardcoded total of 18.
  const trackedSteps = steps.filter((s) => !UNTRACKED_STEPS.includes(s));
  const progressTotal = trackedSteps.length;
  const progressCurrent = Math.max(0, trackedSteps.indexOf(currentStep) + 1);

  // Calculate age from birthdate
  const calculateAge = () => {
    const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'].indexOf(birthMonth);
    const birthDate = new Date(birthYear, monthIndex, birthDay);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Convert to metric for calculations
  const getHeightInCm = () => {
    if (isMetric) return heightCm;
    return Math.round((heightFeet * 30.48) + (heightInches * 2.54));
  };

  const getWeightInKg = () => {
    if (isMetric) return weightKg;
    return Math.round(weightLbs * 0.453592);
  };

  const getGoalWeightInKg = () => {
    if (isMetric) return desiredWeightKg;
    return Math.round(desiredWeightLbs * 0.453592);
  };

  // Map workout frequency to activity level
  const getActivityLevel = () => {
    switch (workoutFrequency) {
      case '0-2': return 'sedentary';
      case '3-5': return 'moderate';
      case '6+': return 'active';
      default: return 'moderate';
    }
  };

  // Map selectedGoal to weightGoal
  const getWeightGoal = () => {
    if (selectedGoal === 'lose') return 'loss';
    if (selectedGoal === 'gain') return 'gain';
    return 'maintain';
  };

  // Full calorie target, including the pace the user chose on the speed slider
  // and whether that pace had to be floored for safety.
  const getCalorieTarget = () => {
    const weightGoal = getWeightGoal();
    const goalType = weightGoal === 'loss' ? 'lose' :
                     weightGoal === 'gain' ? 'gain' : 'maintain';
    const pace = goalType === 'lose' ? weightLossSpeed
               : goalType === 'gain' ? weightGainSpeed
               : 0;

    return calculateCalorieTarget(
      calculateAge(),
      getWeightInKg(),
      getHeightInCm(),
      getActivityLevel(),
      goalType,
      selectedGender === 'male',
      pace
    );
  };

  const getCalculatedDailyCalories = () => getCalorieTarget().calories;

  // Wrapper function using shared calculateMacros utility
  const getCalculatedMacros = (calories: number) => {
    const weightGoal = getWeightGoal();
    const goalType = weightGoal === 'loss' ? 'lose' : 
                     weightGoal === 'gain' ? 'gain' : 'maintain';
    return calculateMacros(calories, goalType);
  };

  // Mutation for completing onboarding
  const mutation = useMutation({
    mutationFn: async () => {
      const dailyCalories = getCalculatedDailyCalories();
      const macros = getCalculatedMacros(dailyCalories);
      
      const profileData = {
        age: calculateAge(),
        gender: selectedGender || 'other',
        height: getHeightInCm(),
        weight: getWeightInKg(),
        goalWeight: getGoalWeightInKg(),
        weightGoal: getWeightGoal(),
        activityLevel: getActivityLevel(),
        calorieGoal: dailyCalories,
        proteinGoal: macros.protein,
        carbsGoal: macros.carbs,
        fatGoal: macros.fat,
        dietaryRestrictions: selectedDiet ? [selectedDiet] : [],
        allergies: selectedAllergies,
        bodyType: selectedPhysique,
        mealBudget: 'medium',
        experienceLevel: hasUsedOtherApps ? 'intermediate' : 'beginner',
        // Respect the language the user actually chose rather than clobbering
        // users.preferred_language with a hardcoded 'en' on every submit.
        preferredLanguage: i18n.language || 'en',
        // Enhanced onboarding fields
        weightLossSpeed: selectedGoal === 'lose' ? weightLossSpeed : null,
        weightGainSpeed: selectedGoal === 'gain' ? weightGainSpeed : null,
        obstacles: selectedObstacles,
        accomplishments: selectedAccomplishments,
        referralSource: referralSource,
        hasUsedOtherApps: hasUsedOtherApps,
        birthMonth,
        birthDay,
        birthYear,
        isMetric,
        // Store original user input values for better UX
        workoutFrequency: workoutFrequency,
        heightFeet: !isMetric ? heightFeet : null,
        heightInches: !isMetric ? heightInches : null,
        weightLbs: !isMetric ? weightLbs : null,
        goalWeightLbs: !isMetric ? desiredWeightLbs : null,
      };

      const formDataToSend = new FormData();
      formDataToSend.append('profile', JSON.stringify(profileData));

      const response = await fetch('/api/register/complete-onboarding', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Onboarding completion failed:', errorData);
        throw new Error('Failed to complete onboarding');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate user query to refresh auth state
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });

      // Set flag to show tutorial overlay on dashboard
      localStorage.setItem('justCompletedOnboarding', 'true');

      // Answers are on the server now; the local draft has done its job.
      clearDraft();
      setCurrentStep(STEP_PAYWALL);
    },
    onError: (error: Error) => {
      console.error('Onboarding completion error:', error);
      toast({
        title: t('common.error'),
        description: t('common.saveError'),
        variant: 'destructive',
      });
    },
  });

  // The email path leaves the app for /auth and comes back to /onboarding.
  // The draft restores the user to the save step, but they now have an
  // account — so push the profile through without making them tap again.
  const autoSavedRef = useRef(false);
  useEffect(() => {
    if (
      currentStep === STEP_SAVE &&
      user &&
      !user.hasCompletedOnboarding &&
      !autoSavedRef.current &&
      !mutation.isPending
    ) {
      autoSavedRef.current = true;
      mutation.mutate();
    }
  }, [currentStep, user, mutation]);

  // Function to toggle obstacle selection
  const toggleObstacle = (obstacle: string) => {
    setSelectedObstacles(prev => 
      prev.includes(obstacle) 
        ? prev.filter(o => o !== obstacle)
        : [...prev, obstacle]
    );
  };

  // Function to toggle accomplishment selection
  const toggleAccomplishment = (accomplishment: string) => {
    setSelectedAccomplishments(prev => 
      prev.includes(accomplishment) 
        ? prev.filter(a => a !== accomplishment)
        : [...prev, accomplishment]
    );
  };

  // Generate height and weight options
  const feetOptions = [3, 4, 5, 6, 7, 8];
  const inchesOptions = Array.from({ length: 12 }, (_, i) => i);
  const cmOptions = Array.from({ length: 121 }, (_, i) => 100 + i); // 100-220 cm
  const lbsOptions = Array.from({ length: 351 }, (_, i) => 70 + i); // 70-420 lbs
  const kgOptions = Array.from({ length: 161 }, (_, i) => 30 + i); // 30-190 kg

  // Birth date options - translated months
  const months = [
    t('birthDate.months.january'),
    t('birthDate.months.february'),
    t('birthDate.months.march'),
    t('birthDate.months.april'),
    t('birthDate.months.may'),
    t('birthDate.months.june'),
    t('birthDate.months.july'),
    t('birthDate.months.august'),
    t('birthDate.months.september'),
    t('birthDate.months.october'),
    t('birthDate.months.november'),
    t('birthDate.months.december')
  ];
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  // Fixed weight ranges for desired weight - no dynamic limits
  const getWeightRange = () => {
    const minWeight = isMetric ? 30 : 70;
    const maxWeight = isMetric ? 190 : 420;
    
    return {
      min: minWeight,
      max: maxWeight
    };
  };

  // Get goal label
  const getGoalLabel = () => {
    if (selectedGoal === 'lose') return t('goal.loseWeight');
    if (selectedGoal === 'gain') return t('goal.gainWeight');
    return t('goal.maintain');
  };

  // Calculate weight difference for motivational message with difficulty level
  const getWeightDifference = () => {
    const current = isMetric ? weightKg : weightLbs;
    const desired = isMetric ? desiredWeightKg : desiredWeightLbs;
    const diff = Math.abs(current - desired);
    const unit = isMetric ? 'kg' : 'lb';
    
    // Determine difficulty level based on weight difference
    let difficulty = '';
    let color = '';
    
    if (isMetric) {
      // For kg
      if (diff <= 5) {
        difficulty = 'easy';
        color = 'text-green-500';
      } else if (diff <= 10) {
        difficulty = 'realistic';
        color = 'text-orange-500';
      } else if (diff <= 20) {
        difficulty = 'hard';
        color = 'text-orange-600';
      } else {
        difficulty = 'veryHard';
        color = 'text-red-500';
      }
    } else {
      // For lbs
      if (diff <= 11) {
        difficulty = 'easy';
        color = 'text-green-500';
      } else if (diff <= 22) {
        difficulty = 'realistic';
        color = 'text-orange-500';
      } else if (diff <= 44) {
        difficulty = 'hard';
        color = 'text-orange-600';
      } else {
        difficulty = 'veryHard';
        color = 'text-red-500';
      }
    }
    
    if (selectedGoal === 'lose') {
      return { action: t('desiredWeight.lose'), diff, unit, difficulty, color };
    } else if (selectedGoal === 'gain') {
      return { action: t('desiredWeight.gain'), diff, unit, difficulty, color };
    } else {
      return { action: t('desiredWeight.maintain'), diff: 0, unit, difficulty: 'easy', color: 'text-green-500' };
    }
  };

  // Page 1: Welcome Screen
  if (currentStep === 0) {
    return (
      <OnboardingLayout>
        <Logo />
        <PhoneMockup imageSrc="/phone-mockup.png" />
        <Heading 
          title={t('welcome.title')} 
          subtitle={t('welcome.subtitle')} 
        />
        <div className="space-y-3 mt-auto mb-4">
          {/* Straight into the questions. Nothing is asked of a stranger until
              they have seen their plan — the whole point of the restructure. */}
          <PrimaryButton onClick={goNext}>
            {t('common.getStarted')}
          </PrimaryButton>
          <SignInLink
            onClick={() => navigate('/auth')}
            alreadyHaveAccountText={t('common.alreadyHaveAccount')}
            signInText={t('common.signIn')}
          />
        </div>
        <HomeIndicator />
      </OnboardingLayout>
    );
  }

  // Page 2: Gender Selection
  if (currentStep === 1) {
    return (
      <OnboardingLayout>
        <BackButton onClick={goBack} />
        <ProgressBar current={progressCurrent} total={progressTotal} />
        
        <div className="flex-1 flex flex-col justify-center mt-16">
          <PageTitle 
            title={t('gender.title')}
            subtitle={t('gender.subtitle')}
          />
          
          <div className="space-y-4 mb-12">
            <SelectionButton
              label={t('gender.male')}
              selected={selectedGender === 'male'}
              onClick={() => setSelectedGender('male')}
              index={0}
            />
            <SelectionButton
              label={t('gender.female')}
              selected={selectedGender === 'female'}
              onClick={() => setSelectedGender('female')}
              index={1}
            />
            <SelectionButton
              label={t('gender.other')}
              selected={selectedGender === 'other'}
              onClick={() => setSelectedGender('other')}
              index={2}
            />
          </div>
        </div>
        
        <div className="mt-auto space-y-4">
          <PrimaryButton 
            onClick={goNext}
            disabled={!selectedGender}
          >
            {t('common.continue')}
          </PrimaryButton>
          <HomeIndicator />
        </div>
      </OnboardingLayout>
    );
  }

  // Page 3: Height & Weight
  if (currentStep === 2) {
    return (
      <OnboardingLayout>
        <BackButton onClick={goBack} />
        <ProgressBar current={progressCurrent} total={progressTotal} />
        
        <div className="flex-1 flex flex-col mt-16">
          <PageTitle 
            title={t('heightWeight.title')}
            subtitle={t('heightWeight.subtitle')}
          />
          
          <UnitToggle 
            isMetric={isMetric} 
            onChange={setIsMetric} 
            imperialLabel={t('common.imperial')}
            metricLabel={t('common.metric')}
          />
          
          <div className="flex gap-4 mb-8">
            {!isMetric ? (
              <>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-[#1E293B] text-center mb-4">{t('heightWeight.height')}</h3>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <IOSPicker
                        value={heightFeet}
                        onChange={setHeightFeet}
                        items={feetOptions}
                        suffix=" ft"
                      />
                    </div>
                    <div className="flex-1">
                      <IOSPicker
                        value={heightInches}
                        onChange={setHeightInches}
                        items={inchesOptions}
                        suffix=" in"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-[#1E293B] text-center mb-4">{t('heightWeight.weight')}</h3>
                  <IOSPicker
                    value={weightLbs}
                    onChange={setWeightLbs}
                    items={lbsOptions}
                    suffix=" lb"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-[#1E293B] text-center mb-4">{t('heightWeight.height')}</h3>
                  <IOSPicker
                    value={heightCm}
                    onChange={setHeightCm}
                    items={cmOptions}
                    suffix=" cm"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-[#1E293B] text-center mb-4">{t('heightWeight.weight')}</h3>
                  <IOSPicker
                    value={weightKg}
                    onChange={setWeightKg}
                    items={kgOptions}
                    suffix=" kg"
                  />
                </div>
              </>
            )}
          </div>
        </div>
        
        <div className="mt-auto space-y-4">
          <PrimaryButton 
            onClick={goNext}
          >
            {t('common.continue')}
          </PrimaryButton>
          <HomeIndicator />
        </div>
      </OnboardingLayout>
    );
  }

  // Page 4: Birth Date
  if (currentStep === 3) {
    return (
      <OnboardingLayout>
        <BackButton onClick={goBack} />
        <ProgressBar current={progressCurrent} total={progressTotal} />
        
        <div className="flex-1 flex flex-col mt-16">
          <PageTitle 
            title={t('birthDate.title')}
            subtitle={t('birthDate.subtitle')}
          />
          
          <div className="flex gap-3 mb-8 px-2">
            <div className="flex-1">
              <IOSPicker
                value={birthMonth}
                onChange={setBirthMonth}
                items={months}
                formatter={(value) => value}
              />
            </div>
            <div className="w-20">
              <IOSPicker
                value={birthDay}
                onChange={setBirthDay}
                items={days}
              />
            </div>
            <div className="w-24">
              <IOSPicker
                value={birthYear}
                onChange={setBirthYear}
                items={years}
              />
            </div>
          </div>
        </div>
        
        <div className="mt-auto space-y-4">
          <PrimaryButton 
            onClick={goNext}
          >
            {t('common.continue')}
          </PrimaryButton>
          <HomeIndicator />
        </div>
      </OnboardingLayout>
    );
  }

  // Page 5: What is your goal?
  if (currentStep === 4) {
    return (
      <OnboardingLayout>
        <BackButton onClick={goBack} />
        <ProgressBar current={progressCurrent} total={progressTotal} />
        
        <div className="flex-1 flex flex-col justify-center mt-16">
          <PageTitle 
            title={t('goal.title')}
            subtitle={t('goal.subtitle')}
          />
          
          <div className="space-y-4 mb-12">
            <SelectionButton
              label={t('goal.loseWeight')}
              selected={selectedGoal === 'lose'}
              onClick={() => setSelectedGoal('lose')}
              index={0}
            />
            <SelectionButton
              label={t('goal.maintain')}
              selected={selectedGoal === 'maintain'}
              onClick={() => setSelectedGoal('maintain')}
              index={1}
            />
            <SelectionButton
              label={t('goal.gainWeight')}
              selected={selectedGoal === 'gain'}
              onClick={() => setSelectedGoal('gain')}
              index={2}
            />
          </div>
        </div>
        
        <div className="mt-auto space-y-4">
          <PrimaryButton 
            onClick={() => {
              if (selectedGoal === 'maintain') {
                // Skip desired weight and motivational steps - set desired weight to current weight
                setDesiredWeightKg(weightKg);
                setDesiredWeightLbs(weightLbs);
                goNext('maintain');
              } else {
                goNext();
              }
            }}
            disabled={!selectedGoal}
          >
            {t('common.continue')}
          </PrimaryButton>
          <HomeIndicator />
        </div>
      </OnboardingLayout>
    );
  }

  // Page 6: Desired Weight (skipped if maintain is selected)
  if (currentStep === 5) {
    const range = getWeightRange();
    const currentWeight = isMetric ? weightKg : weightLbs;
    const goalLabel = getGoalLabel();
    
    // Debug logging - remove after fixing
    console.log('DEBUG DESIRED WEIGHT STEP:', {
      isMetric,
      weightKg,
      weightLbs,
      selectedGoal,
      range,
      currentWeight
    });
    
    return (
      <OnboardingLayout>
        <BackButton onClick={goBack} />
        <ProgressBar current={progressCurrent} total={progressTotal} />
        
        <div className="flex-1 flex flex-col justify-center mt-16">
          <PageTitle 
            title={t('desiredWeight.title')}
          />
          
          {/* Unit Toggle */}
          <UnitToggle 
            isMetric={isMetric} 
            onChange={setIsMetric} 
            imperialLabel={t('common.imperial')}
            metricLabel={t('common.metric')}
          />
          
          {/* Weight slider */}
          <WeightSlider
            value={isMetric ? desiredWeightKg : desiredWeightLbs}
            onChange={isMetric ? setDesiredWeightKg : setDesiredWeightLbs}
            min={range.min}
            max={range.max}
            unit={isMetric ? 'kg' : 'lb'}
            currentWeight={currentWeight}
            goalLabel={goalLabel}
          />
        </div>
        
        <div className="mt-auto space-y-4">
          <PrimaryButton 
            onClick={goNext}
          >
            {t('common.continue')}
          </PrimaryButton>
          <HomeIndicator />
        </div>
      </OnboardingLayout>
    );
  }

  // Page 7: Motivational Message (skipped if maintain is selected)
  if (currentStep === 6) {
    const { action, diff, unit, difficulty, color } = getWeightDifference();
    
    // Back button goes to step 5 (desired weight) for lose/gain
    const handleMotivationBack = () => {
      goBack();
    };
    
    // Get appropriate message based on difficulty
    const getMessage = () => {
      return t(`motivation.${difficulty}.message`);
    };

    const getDescription = () => {
      return t(`motivation.${difficulty}.description`);
    };

    // Get difficulty text for display
    const getDifficultyText = () => {
      return t(`motivation.difficulty.${difficulty}`);
    };
    
    return (
      <OnboardingLayout>
        <BackButton onClick={handleMotivationBack} />
        <ProgressBar current={progressCurrent} total={progressTotal} />
        
        <div className="flex-1 flex flex-col justify-center mt-16">
          <div className="text-center px-4">
            <h1 className="text-3xl font-bold text-[#1E293B] mb-8 leading-tight">
              {action} <span className={color}>{diff.toFixed(0)} {unit}</span> {t('motivation.isA')} {getDifficultyText()} {t('motivation.target')}. {getMessage()}
            </h1>
            
            <p className="text-[#64748B] text-base leading-relaxed">
              {getDescription()}
            </p>
          </div>
        </div>
        
        <div className="mt-auto space-y-4">
          <PrimaryButton 
            onClick={goNext}
          >
            {t('common.continue')}
          </PrimaryButton>
          <HomeIndicator />
        </div>
      </OnboardingLayout>
    );
  }

  // Page 8: How fast do you want to reach your goal?
  if (currentStep === 7) {
    const speedUnit = isMetric ? 'kg' : 'lb';
    const isLosing = selectedGoal === 'lose';
    const isGaining = selectedGoal === 'gain';
    
    // Skip this page if maintaining weight - use effect to avoid render issues
    if (selectedGoal === 'maintain') {
      // Immediately move to next step without rendering
      setTimeout(() => goNext(), 0);
      return (
        <OnboardingLayout>
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#26A8FF]"></div>
          </div>
        </OnboardingLayout>
      );
    }
    
    // Set speed ranges based on goal
    const getSpeedRange = () => {
      if (isLosing) {
        return {
          min: isMetric ? 0.1 : 0.2,
          max: isMetric ? 1.5 : 3.3,
          value: isMetric ? weightLossSpeed : weightLossSpeed * 2.2,
          setter: (val: number) => setWeightLossSpeed(isMetric ? val : val / 2.2)
        };
      } else if (isGaining) {
        return {
          min: isMetric ? 0.1 : 0.2,
          max: isMetric ? 1.0 : 2.2,
          value: isMetric ? weightGainSpeed : weightGainSpeed * 2.2,
          setter: (val: number) => setWeightGainSpeed(isMetric ? val : val / 2.2)
        };
      } else {
        return null;
      }
    };
    
    const speedRange = getSpeedRange();
    
    if (!speedRange) {
      setTimeout(() => goNext(), 0);
      return null;
    }
    
    return (
      <OnboardingLayout>
        <BackButton onClick={goBack} />
        <ProgressBar current={progressCurrent} total={progressTotal} />
        
        <div className="flex-1 flex flex-col justify-center mt-16">
          <PageTitle 
            title={t('speed.title')}
          />
          
          <SpeedSlider
            value={speedRange.value}
            onChange={speedRange.setter}
            min={speedRange.min}
            max={speedRange.max}
            unit={speedUnit}
            goalType={selectedGoal || 'lose'}
            labels={{
              loseSpeedLabel: t('speed.loseSpeedLabel'),
              gainSpeedLabel: t('speed.gainSpeedLabel'),
              maintainLabel: t('speed.maintainLabel'),
              recommended: t('speed.recommended')
            }}
          />
        </div>
        
        <div className="mt-auto space-y-4">
          <PrimaryButton 
            onClick={goNext}
          >
            {t('common.continue')}
          </PrimaryButton>
          <HomeIndicator />
        </div>
      </OnboardingLayout>
    );
  }

  // Page 9: Comparison - Nutri AI vs On Your Own
  if (currentStep === 8) {
    return (
      <OnboardingLayout>
        <BackButton onClick={goBack} />
        <ProgressBar current={progressCurrent} total={progressTotal} />
        
        <div className="flex-1 flex flex-col justify-center mt-16">
          <PageTitle 
            title={t('comparison.title')}
          />
          
          {/* Comparison Container */}
          <div className="bg-white rounded-3xl p-6 mb-8 shadow-sm border border-gray-100">
            <div className="flex gap-4 mb-6" style={{ height: '180px' }}>
              <ComparisonCard
                label={t('comparison.withoutApp')}
                value="20%"
                isHighlight={false}
                fillPercentage={20}
              />
              <ComparisonCard
                label={t('comparison.withApp')}
                value="2X"
                isHighlight={true}
                fillPercentage={90}
              />
            </div>
            
            {/* Description */}
            <p className="text-center text-[#64748B] text-sm">
              Nutri AI makes it easy and holds you accountable.
            </p>
          </div>
        </div>
        
        <div className="mt-auto space-y-4">
          <PrimaryButton 
            onClick={goNext}
          >
            Continue
          </PrimaryButton>
          <HomeIndicator />
        </div>
      </OnboardingLayout>
    );
  }

  // Page 10: What's stopping you from reaching your goals?
  if (currentStep === 9) {
    return (
      <OnboardingLayout>
        <BackButton onClick={goBack} />
        <ProgressBar current={progressCurrent} total={progressTotal} />
        
        <div className="flex-1 flex flex-col justify-center mt-16">
          <PageTitle 
            title={t('obstacles.title')}
          />
          
          <div className="space-y-3 mb-12">
            <ObstacleOption
              icon="📊"
              label={t('obstacles.consistency')}
              selected={selectedObstacles.includes('consistency')}
              onClick={() => toggleObstacle('consistency')}
            />
            <ObstacleOption
              icon="🍽️"
              label={t('obstacles.eating')}
              selected={selectedObstacles.includes('eating')}
              onClick={() => toggleObstacle('eating')}
            />
            <ObstacleOption
              icon="💎"
              label={t('obstacles.support')}
              selected={selectedObstacles.includes('support')}
              onClick={() => toggleObstacle('support')}
            />
            <ObstacleOption
              icon="📅"
              label={t('obstacles.schedule')}
              selected={selectedObstacles.includes('schedule')}
              onClick={() => toggleObstacle('schedule')}
            />
            <ObstacleOption
              icon="🍽️"
              label={t('obstacles.inspiration')}
              selected={selectedObstacles.includes('inspiration')}
              onClick={() => toggleObstacle('inspiration')}
            />
          </div>
        </div>
        
        <div className="mt-auto space-y-4">
          <PrimaryButton 
            onClick={goNext}
          >
            {t('common.continue')}
          </PrimaryButton>
          <HomeIndicator />
        </div>
      </OnboardingLayout>
    );
  }

  // Page 11: Do you follow a specific diet?
  if (currentStep === 10) {
    return (
      <OnboardingLayout>
        <BackButton onClick={goBack} />
        <ProgressBar current={progressCurrent} total={progressTotal} />
        
        <div className="flex-1 flex flex-col justify-center mt-16">
          <PageTitle 
            title={t('diet.title')}
          />
          
          <div className="space-y-3 mb-12">
            <DietOption
              icon="🍖"
              label={t('diet.classic')}
              selected={selectedDiet === 'classic'}
              onClick={() => setSelectedDiet('classic')}
            />
            <DietOption
              icon="🐟"
              label={t('diet.pescatarian')}
              selected={selectedDiet === 'pescatarian'}
              onClick={() => setSelectedDiet('pescatarian')}
            />
            <DietOption
              icon="🥬"
              label={t('diet.vegetarian')}
              selected={selectedDiet === 'vegetarian'}
              onClick={() => setSelectedDiet('vegetarian')}
            />
            <DietOption
              icon="🌱"
              label={t('diet.vegan')}
              selected={selectedDiet === 'vegan'}
              onClick={() => setSelectedDiet('vegan')}
            />
          </div>
        </div>
        
        <div className="mt-auto space-y-4">
          <PrimaryButton 
            onClick={goNext}
            disabled={!selectedDiet}
          >
            {t('common.continue')}
          </PrimaryButton>
          <HomeIndicator />
        </div>
      </OnboardingLayout>
    );
  }

  // Page 12: What would you like to accomplish?
  if (currentStep === 11) {
    return (
      <OnboardingLayout>
        <BackButton onClick={goBack} />
        <ProgressBar current={progressCurrent} total={progressTotal} />
        
        <div className="flex-1 flex flex-col justify-center mt-16">
          <PageTitle 
            title={t('accomplishments.title')}
          />
          
          <div className="space-y-3 mb-12">
            <AccomplishmentOption
              icon="🍎"
              label={t('accomplishments.healthier')}
              selected={selectedAccomplishments.includes('healthier')}
              onClick={() => toggleAccomplishment('healthier')}
            />
            <AccomplishmentOption
              icon="☀️"
              label={t('accomplishments.energy')}
              selected={selectedAccomplishments.includes('energy')}
              onClick={() => toggleAccomplishment('energy')}
            />
            <AccomplishmentOption
              icon="💪"
              label={t('accomplishments.motivated')}
              selected={selectedAccomplishments.includes('motivated')}
              onClick={() => toggleAccomplishment('motivated')}
            />
            <AccomplishmentOption
              icon="🧘"
              label={t('accomplishments.body')}
              selected={selectedAccomplishments.includes('body')}
              onClick={() => toggleAccomplishment('body')}
            />
          </div>
        </div>
        
        <div className="mt-auto space-y-4">
          <PrimaryButton 
            onClick={goNext}
          >
            {t('common.continue')}
          </PrimaryButton>
          <HomeIndicator />
        </div>
      </OnboardingLayout>
    );
  }

  // Page 13: You have great potential to crush your goal
  if (currentStep === 12) {
    return (
      <OnboardingLayout>
        <BackButton onClick={goBack} />
        <ProgressBar current={progressCurrent} total={progressTotal} />
        
        <div className="flex-1 flex flex-col justify-center mt-16">
          <PageTitle 
            title={t('potential.title')}
          />
          
          <WeightTransitionChart 
            goal={selectedGoal}
            labels={{
              title: t('potential.yourWeightTransition'),
              description: t('potential.chartDescription'),
              week1: t('potential.week1'),
              week2: t('potential.week2'),
              week8: t('potential.week8')
            }}
          />
        </div>
        
        <div className="mt-auto space-y-4">
          <PrimaryButton 
            onClick={goNext}
          >
            {t('common.continue')}
          </PrimaryButton>
          <HomeIndicator />
        </div>
      </OnboardingLayout>
    );
  }

  // Page 14: Workout frequency
  if (currentStep === 13) {
    return (
      <OnboardingLayout>
        <BackButton onClick={goBack} />
        <ProgressBar current={progressCurrent} total={progressTotal} />
        
        <div className="flex-1 flex flex-col justify-center mt-16">
          <PageTitle 
            title={t('workout.title')}
            subtitle={t('workout.subtitle')}
          />
          
          <div className="space-y-4 mb-12">
            <OptionCard
              iconType="low"
              title="0-2"
              subtitle={t('workout.low')}
              selected={workoutFrequency === '0-2'}
              onClick={() => setWorkoutFrequency('0-2')}
            />
            <OptionCard
              iconType="medium"
              title="3-5"
              subtitle={t('workout.medium')}
              selected={workoutFrequency === '3-5'}
              onClick={() => setWorkoutFrequency('3-5')}
            />
            <OptionCard
              iconType="high"
              title="6+"
              subtitle={t('workout.high')}
              selected={workoutFrequency === '6+'}
              onClick={() => setWorkoutFrequency('6+')}
            />
          </div>
        </div>
        
        <div className="mt-auto space-y-4">
          <PrimaryButton 
            onClick={goNext}
            disabled={!workoutFrequency}
          >
            {t('common.continue')}
          </PrimaryButton>
          <HomeIndicator />
        </div>
      </OnboardingLayout>
    );
  }

  // Page 15: Where did you hear about us?
  if (currentStep === 14) {
    return (
      <OnboardingLayout>
        <BackButton onClick={goBack} />
        <ProgressBar current={progressCurrent} total={progressTotal} />
        
        <div className="flex-1 flex flex-col justify-center mt-16">
          <PageTitle 
            title={t('referral.title')}
          />
          
          <div className="space-y-3 mb-12">
            <SourceOption
              icon={<div className="w-6 h-6 rounded-lg bg-black flex items-center justify-center"><FaTiktok className="w-4 h-4 text-white" /></div>}
              label={t('referral.tiktok')}
              selected={referralSource === 'tiktok'}
              onClick={() => setReferralSource('tiktok')}
            />
            <SourceOption
              icon={<div className="w-6 h-6 rounded-lg bg-red-600 flex items-center justify-center"><FaYoutube className="w-4 h-4 text-white" /></div>}
              label={t('referral.youtube')}
              selected={referralSource === 'youtube'}
              onClick={() => setReferralSource('youtube')}
            />
            <SourceOption
              icon={<div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 flex items-center justify-center"><FaInstagram className="w-4 h-4 text-white" /></div>}
              label={t('referral.instagram')}
              selected={referralSource === 'instagram'}
              onClick={() => setReferralSource('instagram')}
            />
            <SourceOption
              icon={<div className="w-6 h-6 rounded-lg border-2 border-gray-300 flex items-center justify-center bg-white"><FaGoogle className="w-4 h-4 text-blue-500" /></div>}
              label={t('referral.google')}
              selected={referralSource === 'google'}
              onClick={() => setReferralSource('google')}
            />
            <SourceOption
              icon={<div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center"><FaFacebookF className="w-4 h-4 text-white" /></div>}
              label={t('referral.facebook')}
              selected={referralSource === 'facebook'}
              onClick={() => setReferralSource('facebook')}
            />
          </div>
        </div>
        
        <div className="mt-auto space-y-4">
          <PrimaryButton 
            onClick={goNext}
            disabled={!referralSource}
          >
            {t('common.continue')}
          </PrimaryButton>
          <HomeIndicator />
        </div>
      </OnboardingLayout>
    );
  }

  // Page 16: Have you tried other calorie tracking apps?
  if (currentStep === 15) {
    return (
      <OnboardingLayout>
        <BackButton onClick={goBack} />
        <ProgressBar current={progressCurrent} total={progressTotal} />
        
        <div className="flex-1 flex flex-col justify-center mt-16">
          <PageTitle 
            title={t('otherApps.title')}
          />
          
          <div className="space-y-4 mb-12">
            <YesNoOption
              icon="👎"
              label={t('otherApps.no')}
              selected={hasUsedOtherApps === false}
              onClick={() => setHasUsedOtherApps(false)}
            />
            <YesNoOption
              icon="👍"
              label={t('otherApps.yes')}
              selected={hasUsedOtherApps === true}
              onClick={() => setHasUsedOtherApps(true)}
            />
          </div>
        </div>
        
        <div className="mt-auto space-y-4">
          <PrimaryButton 
            onClick={goNext}
            disabled={hasUsedOtherApps === null}
          >
            {t('common.continue')}
          </PrimaryButton>
          <HomeIndicator />
        </div>
      </OnboardingLayout>
    );
  }

  // Page 17: Results Chart
  if (currentStep === 16) {
    return (
      <OnboardingLayout>
        <BackButton onClick={goBack} />
        <ProgressBar current={progressCurrent} total={progressTotal} />
        
        <div className="flex-1 flex flex-col justify-center mt-16">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#1E293B] leading-tight">
              {t('results.title')}
            </h1>
          </div>
          
          <WeightLossChart 
            goal={selectedGoal}
            labels={{
              yourWeight: t('results.yourWeight'),
              month1: t('results.month1'),
              month6: t('results.month6'),
              nutriAI: t('results.nutriAI'),
              weight: t('results.weight'),
              traditionalDiet: t('results.traditionalDiet')
            }}
          />
          
          <div className="text-center mb-8">
            <p className="text-[#1E293B] text-base">
              {t('results.stat')}
            </p>
          </div>
        </div>
        
        <div className="mt-auto space-y-4">
          <PrimaryButton 
            onClick={goNext}
          >
            {t('common.continue')}
          </PrimaryButton>
          <HomeIndicator />
        </div>
      </OnboardingLayout>
    );
  }

  // Page 18: Setup Loading Page
  if (currentStep === 17) {
    return (
      <OnboardingLayout>
        <SetupLoadingPage
          onComplete={() => {
            // The plan is computed client-side and shown next. Nothing is sent
            // to the server yet — there is no account until the save step.
            saveDraft({ planReady: true });
            goNext();
          }}
          labels={{
            settingUp: t('loading.settingUp'),
            dailyRecommendation: t('loading.dailyRecommendation'),
            steps: {
              analyzing: t('loading.steps.analyzing'),
              calculating: t('loading.steps.calculating'),
              personalizing: t('loading.steps.personalizing'),
              finalizing: t('loading.steps.finalizing'),
              almostReady: t('loading.steps.almostReady')
            },
            items: {
              calories: t('loading.items.calories'),
              carbs: t('loading.items.carbs'),
              protein: t('loading.items.protein'),
              fats: t('loading.items.fats'),
              health: t('loading.items.health')
            }
          }}
        />
        <HomeIndicator />
      </OnboardingLayout>
    );
  }

  // Page 19: Congratulations Page (Final page)
  if (currentStep === STEP_RESULTS) {
    const target = getCalorieTarget();
    const dailyCalories = target.calories;
    const macros = getCalculatedMacros(dailyCalories);
    
    return (
      <OnboardingLayout>
        <ProgressBar current={progressCurrent} total={progressTotal} />
        
        <div className="mt-16">
          <CongratulationsPage 
            weightKg={getWeightInKg()} 
            desiredWeightKg={getGoalWeightInKg()} 
            selectedGoal={selectedGoal}
            dailyCalories={dailyCalories}
            macros={macros}
            effectivePacePerWeek={target.effectivePacePerWeek}
            locale={i18n.language}
            labels={{
              title: t('congratulations.title'),
              subtitle: t('congratulations.subtitle'),
              yourGoal: t('congratulations.yourGoal'),
              targetDate: t('congratulations.targetDate'),
              focus: t('congratulations.focus'),
              stayHealthy: t('congratulations.stayHealthy'),
              dailyTargets: t('congratulations.dailyTargets'),
              personalizedForYou: t('congratulations.personalizedForYou'),
              editable: t('congratulations.editable'),
              maintainWeight: t('congratulations.maintainWeight'),
              lose: t('congratulations.lose'),
              gain: t('congratulations.gain'),
              kgUnit: t('common.kg'),
              macros: {
                calories: t('congratulations.macros.calories'),
                protein: t('congratulations.macros.protein'),
                carbs: t('congratulations.macros.carbs'),
                fat: t('congratulations.macros.fat')
              }
            }}
          />
        </div>
        
        <div className="mt-auto space-y-4">
          <PrimaryButton onClick={goNext}>
            {t('common.continue')}
          </PrimaryButton>
          <HomeIndicator />
        </div>
      </OnboardingLayout>
    );
  }

  // Allergies. The `allergies` column has existed since the schema was written
  // and was always submitted as an empty array — nothing ever asked.
  if (currentStep === STEP_ALLERGIES) {
    const ALLERGENS = [
      { id: 'peanuts', icon: '🥜', label: t('allergies.peanuts', 'Peanuts') },
      { id: 'tree_nuts', icon: '🌰', label: t('allergies.treeNuts', 'Tree nuts') },
      { id: 'dairy', icon: '🥛', label: t('allergies.dairy', 'Dairy') },
      { id: 'eggs', icon: '🥚', label: t('allergies.eggs', 'Eggs') },
      { id: 'gluten', icon: '🌾', label: t('allergies.gluten', 'Gluten') },
      { id: 'shellfish', icon: '🦐', label: t('allergies.shellfish', 'Shellfish') },
      { id: 'soy', icon: '🫘', label: t('allergies.soy', 'Soy') },
      { id: 'fish', icon: '🐟', label: t('allergies.fish', 'Fish') }
    ];

    const toggleAllergy = (id: string) =>
      setSelectedAllergies((prev) =>
        prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
      );

    return (
      <OnboardingLayout>
        <BackButton onClick={goBack} />
        <ProgressBar current={progressCurrent} total={progressTotal} />

        <div className="flex-1 flex flex-col justify-center mt-16">
          <PageTitle
            title={t('allergies.title', 'Any allergies we should know about?')}
            subtitle={t('allergies.subtitle', 'We will keep these out of your recipes.')}
          />

          <div className="space-y-3 mb-6">
            {ALLERGENS.map((a) => (
              <ObstacleOption
                key={a.id}
                icon={a.icon}
                label={a.label}
                selected={selectedAllergies.includes(a.id)}
                onClick={() => toggleAllergy(a.id)}
              />
            ))}
          </div>
        </div>

        <div className="mt-auto space-y-4">
          <PrimaryButton onClick={goNext}>
            {selectedAllergies.length === 0
              ? t('allergies.none', 'None of these')
              : t('common.continue')}
          </PrimaryButton>
          <HomeIndicator />
        </div>
      </OnboardingLayout>
    );
  }

  // Desired physique. `body_type` also already exists in the schema and was
  // never collected. Feeds the copy on the results screen.
  if (currentStep === STEP_PHYSIQUE) {
    const PHYSIQUES = [
      { id: 'lean', icon: '🏃', label: t('physique.lean', 'Lean and defined') },
      { id: 'athletic', icon: '💪', label: t('physique.athletic', 'Athletic and strong') },
      { id: 'muscular', icon: '🏋️', label: t('physique.muscular', 'Muscular and powerful') },
      { id: 'healthy', icon: '🌿', label: t('physique.healthy', 'Just healthy and comfortable') }
    ];

    return (
      <OnboardingLayout>
        <BackButton onClick={goBack} />
        <ProgressBar current={progressCurrent} total={progressTotal} />

        <div className="flex-1 flex flex-col justify-center mt-16">
          <PageTitle
            title={t('physique.title', 'What are you working towards?')}
          />

          <div className="space-y-3 mb-12">
            {PHYSIQUES.map((p) => (
              <DietOption
                key={p.id}
                icon={p.icon}
                label={p.label}
                selected={selectedPhysique === p.id}
                onClick={() => setSelectedPhysique(p.id)}
              />
            ))}
          </div>
        </div>

        <div className="mt-auto space-y-4">
          <PrimaryButton onClick={goNext} disabled={!selectedPhysique}>
            {t('common.continue')}
          </PrimaryButton>
          <HomeIndicator />
        </div>
      </OnboardingLayout>
    );
  }

  // Save your plan — the auth step.
  //
  // Deliberately framed as saving the plan the user just earned, not as
  // "create an account". It sits after the results and before the paywall so
  // there is a user record to attach an entitlement to, and so an email is
  // captured even from people who decline to subscribe.
  if (currentStep === STEP_SAVE) {
    return (
      <OnboardingLayout>
        <BackButton onClick={goBack} />
        <div className="flex-1 flex flex-col justify-center px-2">
          <PageTitle
            title={t('save.title', 'Save your plan')}
            subtitle={t('save.subtitle', 'Create an account so your plan and meals are always here.')}
          />

          {saveError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <p className="text-red-600 text-sm text-center">{saveError}</p>
            </div>
          )}
        </div>

        <div className="mt-auto space-y-3">
          {isAppleSignInAvailable() && (
            <button
              type="button"
              onClick={handleAppleSave}
              disabled={isSaving}
              className="w-full h-14 flex items-center justify-center gap-2.5 rounded-2xl bg-black text-white font-medium text-[17px] active:opacity-80 disabled:opacity-60"
            >
              {isSaving ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : (
                <svg viewBox="0 0 384 512" aria-hidden="true" className="h-[19px] w-[19px] fill-white">
                  <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
                </svg>
              )}
              {isSaving ? t('save.saving', 'Saving…') : t('save.withApple', 'Sign in with Apple')}
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/auth')}
            disabled={isSaving}
            className="w-full h-12 text-[#64748B] text-sm font-medium disabled:opacity-60"
          >
            {t('save.withEmail', 'Use email instead')}
          </button>
          <HomeIndicator />
        </div>
      </OnboardingLayout>
    );
  }

  // Paywall. Rendered after the account exists so the entitlement has a user.
  if (currentStep === STEP_PAYWALL) {
    return (
      <Paywall
        onSubscribed={finishOnboarding}
        onRestored={finishOnboarding}
        onDismiss={finishOnboarding}
      />
    );
  }

  // Fallback
  return null;
}
