import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Flame, Trophy, Calendar, ChevronRight, X, Zap, Target, Star } from "lucide-react";

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
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="bg-orange-100 rounded-xl px-4 py-2.5 animate-pulse w-full">
        <div className="h-5 bg-gray-200 rounded" />
      </div>
    );
  }

  if (!streakData) return null;

  const { currentStreak, longestStreak, todayLogged, weeklyProgress, streakMilestones, totalDaysLogged } = streakData;

  // Find next milestone
  const nextMilestone = streakMilestones.find((m) => !m.achieved);
  const lastAchieved = [...streakMilestones].reverse().find((m) => m.achieved);

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
          className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl px-4 py-2.5 cursor-pointer shadow-sm active:scale-[0.99] transition-transform flex items-center justify-between w-full"
        >
          {/* Left: Flame + Streak count */}
          <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-2">
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

      {/* Details Modal */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowDetails(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 p-6 rounded-t-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <button
                  onClick={() => setShowDetails(false)}
                  className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
                
                <div className="relative text-center">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl mx-auto mb-3 flex items-center justify-center"
                  >
                    <Flame className="w-12 h-12 text-white" />
                  </motion.div>
                  <h2 className="text-4xl font-bold text-white">{currentStreak}</h2>
                  <p className="text-white/80 font-medium">
                    {t('streak.dayStreak', 'Day Streak')} {currentStreak > 0 && '🔥'}
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="p-6">
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-orange-50 rounded-xl p-3 text-center">
                    <Trophy className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-800">{longestStreak}</p>
                    <p className="text-xs text-gray-500">{t('streak.longest', 'Longest')}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3 text-center">
                    <Calendar className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-800">{totalDaysLogged}</p>
                    <p className="text-xs text-gray-500">{t('streak.totalDays', 'Total Days')}</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-3 text-center">
                    <Target className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-800">
                      {Math.round((weeklyProgress.filter(Boolean).length / 7) * 100)}%
                    </p>
                    <p className="text-xs text-gray-500">{t('streak.thisWeek', 'This Week')}</p>
                  </div>
                </div>

                {/* Weekly Progress */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    {t('streak.last7Days', 'Last 7 Days')}
                  </h3>
                  <div className="flex justify-between">
                    {weeklyProgress.map((logged, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: i * 0.05 }}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            logged
                              ? 'bg-gradient-to-br from-orange-400 to-amber-500 shadow-md'
                              : 'bg-gray-100'
                          }`}
                        >
                          {logged ? (
                            <Flame className="w-5 h-5 text-white" />
                          ) : (
                            <span className="w-2 h-2 bg-gray-300 rounded-full" />
                          )}
                        </motion.div>
                        <span className="text-xs text-gray-400">{DAY_LABELS[i]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Milestones */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    {t('streak.milestones', 'Milestones')}
                  </h3>
                  <div className="space-y-2">
                    {streakMilestones.slice(0, 5).map((m, i) => (
                      <motion.div
                        key={m.milestone}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={`flex items-center gap-3 p-3 rounded-xl ${
                          m.achieved
                            ? 'bg-gradient-to-r from-amber-50 to-orange-50 border border-orange-200'
                            : 'bg-gray-50'
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                            m.achieved
                              ? 'bg-gradient-to-br from-orange-400 to-amber-500'
                              : 'bg-gray-200'
                          }`}
                        >
                          {m.achieved ? m.emoji : '🔒'}
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium ${m.achieved ? 'text-gray-800' : 'text-gray-400'}`}>
                            {m.label}
                          </p>
                          <p className="text-xs text-gray-400">
                            {m.milestone} {t('streak.daysRequired', 'days streak')}
                          </p>
                        </div>
                        {m.achieved && (
                          <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Motivational message */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200"
                >
                  <p className="text-center text-sm text-emerald-700">
                    {currentStreak === 0 
                      ? t('streak.startToday', "Start your streak today! Every journey begins with a single step. 🚀")
                      : currentStreak < 7
                      ? t('streak.keepBuilding', "You're building momentum! Keep logging to reach your first week. 💪")
                      : currentStreak < 30
                      ? t('streak.greatProgress', "Amazing progress! You're developing a real habit. 🌟")
                      : t('streak.legend', "You're a nutrition tracking legend! Keep inspiring yourself! 🏆")}
                  </p>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
