import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Flame, Trophy, Calendar, ChevronRight, X, Target, Check } from "lucide-react";

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  todayLogged: boolean;
  lastLogDate: string | null;
  weeklyProgress: boolean[];
  totalDaysLogged: number;
  streakMilestones: {
    milestone: number;
    achieved: boolean;
    label: string;
    emoji: string;
  }[];
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export default function StreakCard() {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);

  const { data: streakData, isLoading } = useQuery<StreakData>({
    queryKey: ["user-streak"],
    queryFn: async () => {
      const res = await fetch("/api/user/streak", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch streak");
      return res.json();
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="bg-orange-100 rounded-xl py-2.5 animate-pulse w-full">
        <div className="h-5 bg-gray-200 rounded mx-4" />
      </div>
    );
  }

  if (!streakData) return null;

  const { currentStreak, longestStreak, todayLogged, weeklyProgress, streakMilestones, totalDaysLogged } = streakData;

  // Find next milestone
  const nextMilestone = streakMilestones.find((m) => !m.achieved);

  // Calculate progress to next milestone
  const progressToNext = nextMilestone
    ? Math.min((currentStreak / nextMilestone.milestone) * 100, 100)
    : 100;

  return (
    <>
      {/* Main Streak Card - Full Width Compact Bar */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        <div
          onClick={() => setShowDetails(true)}
          className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl py-2.5 cursor-pointer shadow-sm active:scale-[0.99] transition-transform flex items-center justify-between w-full"
        >
          {/* Left: Flame + Streak count */}
          <div className="flex items-center gap-2 pl-4">
            <motion.div
              animate={currentStreak > 0 ? { scale: [1, 1.15, 1] } : {}}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
            >
              <Flame className={`w-5 h-5 ${currentStreak > 0 ? 'text-white' : 'text-white/60'}`} />
            </motion.div>
            
            <span className="text-base font-bold text-white">{currentStreak}</span>
            <span className="text-white/80 text-xs">
              {currentStreak === 1 ? t('streak.day', 'day') : t('streak.days', 'days')}
            </span>
            
            {!todayLogged && currentStreak > 0 && (
              <span className="text-xs text-white/90 ml-1">• {t('streak.logToday', 'Log to continue')}</span>
            )}
          </div>
          
          {/* Right: Weekly dots + arrow */}
          <div className="flex items-center gap-2 pr-4">
            <div className="flex gap-1">
              {weeklyProgress.map((logged, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${logged ? 'bg-white' : 'bg-white/40'}`}
                />
              ))}
            </div>
            <ChevronRight className="w-4 h-4 text-white/60" />
          </div>
        </div>
      </motion.div>

      {/* Professional Details Modal */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowDetails(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-[calc(100%-32px)] max-w-sm mx-4 shadow-2xl overflow-hidden"
            >
              {/* Minimal Header */}
              <div className="relative px-5 pt-5 pb-4">
                <button
                  onClick={() => setShowDetails(false)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
                
                {/* Streak Display */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-200">
                    <Flame className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-gray-900">{currentStreak}</span>
                      <span className="text-gray-500 text-sm font-medium">
                        {currentStreak === 1 ? t('streak.day', 'day') : t('streak.days', 'days')}
                      </span>
                    </div>
                    <p className="text-gray-500 text-sm">
                      {todayLogged 
                        ? t('streak.keepGoing', "You're on fire! 🔥")
                        : t('streak.logToday', 'Log a meal to continue')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-gray-100 mx-5" />

              {/* Stats Row */}
              <div className="px-5 py-4">
                <div className="flex justify-between">
                  <div className="text-center flex-1">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <span className="text-xl font-bold text-gray-900">{longestStreak}</span>
                    </div>
                    <p className="text-xs text-gray-400">{t('streak.longest', 'Best')}</p>
                  </div>
                  <div className="w-px bg-gray-100" />
                  <div className="text-center flex-1">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      <span className="text-xl font-bold text-gray-900">{totalDaysLogged}</span>
                    </div>
                    <p className="text-xs text-gray-400">{t('streak.totalDays', 'Total')}</p>
                  </div>
                  <div className="w-px bg-gray-100" />
                  <div className="text-center flex-1">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <Target className="w-4 h-4 text-emerald-500" />
                      <span className="text-xl font-bold text-gray-900">
                        {weeklyProgress.filter(Boolean).length}/7
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{t('streak.thisWeek', 'This Week')}</p>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-gray-100 mx-5" />

              {/* Weekly Progress */}
              <div className="px-5 py-4">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
                  {t('streak.last7Days', 'This Week')}
                </p>
                <div className="flex justify-between gap-1">
                  {weeklyProgress.map((logged, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                      <div
                        className={`w-full aspect-square max-w-[40px] rounded-xl flex items-center justify-center transition-all ${
                          logged
                            ? 'bg-gradient-to-br from-orange-500 to-amber-500 shadow-sm'
                            : 'bg-gray-100'
                        }`}
                      >
                        {logged ? (
                          <Check className="w-4 h-4 text-white" />
                        ) : (
                          <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                        )}
                      </div>
                      <span className="text-[10px] font-medium text-gray-400">{DAY_LABELS[i]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Next Milestone */}
              {nextMilestone && (
                <>
                  <div className="h-px bg-gray-100 mx-5" />
                  <div className="px-5 py-4">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
                      {t('streak.nextMilestone', 'Next Goal')}
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">
                        {nextMilestone.emoji}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm">{nextMilestone.label}</p>
                        <p className="text-xs text-gray-400">
                          {nextMilestone.milestone - currentStreak} {t('streak.daysToGo', 'days to go')}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-orange-500">{Math.round(progressToNext)}%</span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressToNext}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Milestones Achieved */}
              {streakMilestones.some(m => m.achieved) && (
                <>
                  <div className="h-px bg-gray-100 mx-5" />
                  <div className="px-5 py-4 pb-5">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
                      {t('streak.achieved', 'Achieved')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {streakMilestones.filter(m => m.achieved).map((m) => (
                        <div
                          key={m.milestone}
                          className="px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 border border-orange-200 flex items-center gap-1.5"
                        >
                          <span className="text-sm">{m.emoji}</span>
                          <span className="text-xs font-medium text-orange-700">{m.milestone}d</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
