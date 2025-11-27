import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';

interface WeightLog { id: number; weight: number; loggedAt: string; }

interface Props {
  weightLogs: WeightLog[];
  goalWeight?: number;
  loading?: boolean;
}

export const WeightTrendChart: React.FC<Props> = ({ weightLogs, goalWeight, loading }) => {
  const { t } = useTranslation();
  const data = useMemo(() => weightLogs
    .slice()
    .sort((a,b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime())
    .map(l => ({
      date: new Date(l.loggedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      weight: l.weight
    })), [weightLogs]);

  if (loading) {
    return <Card className="p-4 rounded-2xl"><Skeleton className="h-40 w-full" /></Card>;
  }

  if (!data.length) {
    return <Card className="p-4 rounded-2xl text-sm text-gray-500">{t('progress.weightTrend.emptyState', 'Add weight logs to see your trend.')}</Card>;
  }

  return (
    <Card className="p-4 rounded-2xl bg-white/70 backdrop-blur border border-gray-200/60">
      <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('progress.weightTrend.title', 'Weight Trend')}</h4>
      <div className="h-48 -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" tickLine={false} axisLine={false} />
            <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 11 }} stroke="#94a3b8" tickLine={false} axisLine={false} width={30} />
            <Tooltip cursor={{ stroke: '#0CC5BA', strokeWidth: 1 }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }} />
            {goalWeight && <ReferenceLine y={goalWeight} stroke="#0CC5BA" strokeDasharray="4 4" label={{ value: t('progress.weightTrend.goal', 'Goal'), position: 'right', fill: '#0CC5BA', fontSize: 11 }} />}
            <Line type="monotone" dataKey="weight" stroke="#0CC5BA" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
