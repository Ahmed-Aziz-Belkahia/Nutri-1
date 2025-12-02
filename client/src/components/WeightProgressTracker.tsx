import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { TrendingDown, TrendingUp, Minus, Target, Calendar, Flame, Scale, ChevronRight } from "lucide-react";
import { useWeightLogs } from '@/hooks/use-weight-logs';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useTranslation } from "react-i18next";
import { format, subDays, differenceInDays } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart
} from "recharts";

interface WeightProgressTrackerProps {
  onUpdateWeight?: () => void;
}

export default function WeightProgressTracker({ onUpdateWeight }: WeightProgressTrackerProps) {
  const { t } = useTranslation(['common']);
  const { weightLogs, isLoading } = useWeightLogs();
  const { data: userProfile } = useUserProfile();

  // Process weight data for chart
  const chartData = useMemo(() => {
    if (!weightLogs || weightLogs.length === 0) return [];

    // Sort logs by date ascending
    const sortedLogs = [...weightLogs].sort((a, b) => 
      new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()
    );

    return sortedLogs.map(log => ({
      date: format(new Date(log.loggedAt), 'MMM d'),
      weight: log.weight,
      fullDate: new Date(log.loggedAt)
    }));
  }, [weightLogs]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!weightLogs || weightLogs.length === 0) {
      return {
        currentWeight: userProfile?.currentWeight ? parseFloat(userProfile.currentWeight.toString()) : 0,
        startWeight: 0,
        totalChange: 0,
        weeklyChange: 0,
        avgWeeklyChange: 0,
        daysTracking: 0,
        goalWeight: userProfile?.goalWeight ? parseFloat(userProfile.goalWeight.toString()) : 0,
        progressPercent: 0
      };
    }

    const sortedLogs = [...weightLogs].sort((a, b) => 
      new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()
    );

    const firstLog = sortedLogs[0];
    const lastLog = sortedLogs[sortedLogs.length - 1];
    const currentWeight = lastLog.weight;
    const startWeight = firstLog.weight;
    const totalChange = currentWeight - startWeight;
    
    // Calculate weekly change (last 7 days)
    const oneWeekAgo = subDays(new Date(), 7);
    const logsLastWeek = sortedLogs.filter(log => new Date(log.loggedAt) >= oneWeekAgo);
    const weeklyChange = logsLastWeek.length >= 2 
      ? logsLastWeek[logsLastWeek.length - 1].weight - logsLastWeek[0].weight 
      : 0;

    // Days tracking
    const daysTracking = differenceInDays(new Date(lastLog.loggedAt), new Date(firstLog.loggedAt)) + 1;

    // Average weekly change
    const weeksTracking = Math.max(1, daysTracking / 7);
    const avgWeeklyChange = totalChange / weeksTracking;

    // Goal progress
    const goalWeight = userProfile?.goalWeight ? parseFloat(userProfile.goalWeight.toString()) : currentWeight;
    const totalNeeded = Math.abs(startWeight - goalWeight);
    const achieved = Math.abs(startWeight - currentWeight);
    const progressPercent = totalNeeded > 0 ? Math.min(100, (achieved / totalNeeded) * 100) : 0;

    return {
      currentWeight,
      startWeight,
      totalChange,
      weeklyChange,
      avgWeeklyChange,
      daysTracking,
      goalWeight,
      progressPercent
    };
  }, [weightLogs, userProfile]);

  const isGaining = userProfile?.weightGoal === 'gain';
  const distanceToGoal = Math.abs(stats.currentWeight - stats.goalWeight);
  const isOnTrack = isGaining 
    ? stats.weeklyChange >= 0 
    : stats.weeklyChange <= 0;

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-gray-100">
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-lg font-bold text-[#0CC5BA]">
            {payload[0].value.toFixed(1)} kg
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card className="p-6 rounded-[28px] bg-white/20 backdrop-blur-xl border border-white/30">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Weight Progress Chart */}
      <Card className="p-6 rounded-[28px] bg-white/20 backdrop-blur-xl border border-white/30 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Scale className="w-5 h-5 text-[#0CC5BA]" />
            {t('common:progress.weightProgress', 'Weight Progress')}
          </h3>
          <button 
            onClick={onUpdateWeight}
            className="text-sm text-[#0CC5BA] flex items-center gap-1 hover:opacity-80"
          >
            {t('common:progress.update', 'Update')}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {chartData.length > 1 ? (
          <div className="h-48 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <defs>
                  <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0CC5BA" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0CC5BA" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                />
                <YAxis 
                  domain={['dataMin - 2', 'dataMax + 2']}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip content={<CustomTooltip />} />
                {stats.goalWeight > 0 && (
                  <ReferenceLine 
                    y={stats.goalWeight} 
                    stroke="#f97316" 
                    strokeDasharray="5 5"
                    label={{ 
                      value: 'Goal', 
                      position: 'right',
                      fill: '#f97316',
                      fontSize: 11
                    }}
                  />
                )}
                <Area 
                  type="monotone" 
                  dataKey="weight" 
                  fill="url(#weightGradient)" 
                  stroke="none"
                />
                <Line 
                  type="monotone" 
                  dataKey="weight" 
                  stroke="#0CC5BA" 
                  strokeWidth={3}
                  dot={{ fill: '#0CC5BA', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#0CC5BA' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Scale className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>{t('common:progress.logMoreWeight', 'Log more weight entries to see your progress chart')}</p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/20">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">{t('common:progress.current', 'Current')}</p>
            <p className="text-lg font-bold">{stats.currentWeight.toFixed(1)} kg</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">{t('common:progress.goal', 'Goal')}</p>
            <p className="text-lg font-bold text-orange-500">{stats.goalWeight.toFixed(1)} kg</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">{t('common:progress.toGo', 'To Go')}</p>
            <p className="text-lg font-bold text-[#0CC5BA]">{distanceToGoal.toFixed(1)} kg</p>
          </div>
        </div>
      </Card>

      {/* Progress Stats */}
      <div className="grid grid-cols-2 gap-3">
        {/* Weekly Change */}
        <Card className="p-4 rounded-[20px] bg-white/20 backdrop-blur-xl border border-white/30">
          <div className="flex items-center gap-2 mb-2">
            {stats.weeklyChange < 0 ? (
              <TrendingDown className={`w-5 h-5 ${isGaining ? 'text-orange-500' : 'text-green-500'}`} />
            ) : stats.weeklyChange > 0 ? (
              <TrendingUp className={`w-5 h-5 ${isGaining ? 'text-green-500' : 'text-orange-500'}`} />
            ) : (
              <Minus className="w-5 h-5 text-gray-400" />
            )}
            <span className="text-sm text-gray-500">{t('common:progress.thisWeek', 'This Week')}</span>
          </div>
          <p className={`text-2xl font-bold ${
            stats.weeklyChange === 0 ? 'text-gray-600' :
            isOnTrack ? 'text-green-500' : 'text-orange-500'
          }`}>
            {stats.weeklyChange > 0 ? '+' : ''}{stats.weeklyChange.toFixed(1)} kg
          </p>
        </Card>

        {/* Total Change */}
        <Card className="p-4 rounded-[20px] bg-white/20 backdrop-blur-xl border border-white/30">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-[#0CC5BA]" />
            <span className="text-sm text-gray-500">{t('common:progress.totalChange', 'Total Change')}</span>
          </div>
          <p className={`text-2xl font-bold ${
            stats.totalChange < 0 
              ? (isGaining ? 'text-orange-500' : 'text-green-500')
              : stats.totalChange > 0 
                ? (isGaining ? 'text-green-500' : 'text-orange-500')
                : 'text-gray-600'
          }`}>
            {stats.totalChange > 0 ? '+' : ''}{stats.totalChange.toFixed(1)} kg
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {stats.daysTracking} {t('common:progress.daysTracking', 'days tracking')}
          </p>
        </Card>
      </div>

      {/* Goal Progress Bar */}
      <Card className="p-4 rounded-[20px] bg-white/20 backdrop-blur-xl border border-white/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-orange-500" />
            <span className="text-sm font-medium">{t('common:progress.goalProgress', 'Goal Progress')}</span>
          </div>
          <span className="text-sm font-bold text-[#0CC5BA]">{stats.progressPercent.toFixed(0)}%</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[#0CC5BA] to-[#0AA59C] rounded-full transition-all duration-500"
            style={{ width: `${stats.progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>{t('common:progress.start', 'Start')}: {stats.startWeight.toFixed(1)} kg</span>
          <span>{t('common:progress.goal', 'Goal')}: {stats.goalWeight.toFixed(1)} kg</span>
        </div>
      </Card>

      {/* Calorie Adjustment Info */}
      {weightLogs.length > 0 && (
        <Card className="p-4 rounded-[20px] bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h4 className="font-medium text-gray-800">{t('common:progress.caloriesInfo.title', 'Calorie Adjustment')}</h4>
              <p className="text-sm text-gray-600 mt-1">
                {t('common:progress.caloriesInfo.description', 'Your daily calorie goal is automatically recalculated when you update your weight to keep you on track.')}
              </p>
              <p className="text-sm font-medium text-[#0CC5BA] mt-2">
                {t('common:progress.caloriesInfo.currentGoal', 'Current goal')}: {userProfile?.caloriesGoal || userProfile?.calorieGoal || 2000} kcal/day
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
