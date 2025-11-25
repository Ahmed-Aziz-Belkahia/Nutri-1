import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Activity, 
  Zap,
  Calendar,
  Database,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Cpu,
  Server,
  TrendingDown
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  premiumUsers: number;
  completedOnboarding: number;
}

interface TokenStats {
  totalTokensUsed: number;
  totalCostUsd: number;
  avgTokensPerUser: number;
  avgCostPerUser: number;
  todayTokens: number;
  todayCost: number;
  weekTokens: number;
  weekCost: number;
  monthTokens: number;
  monthCost: number;
  topUsers: Array<{
    userId: number;
    email: string;
    tokensUsed: number;
    costUsd: number;
  }>;
}

interface APIStats {
  totalRequests: number;
  successRate: number;
  errorRate: number;
  avgResponseTime: number;
  endpointBreakdown: Array<{
    endpoint: string;
    count: number;
    avgTokens: number;
    totalCost: number;
  }>;
  modelUsage: Array<{
    model: string;
    count: number;
    totalTokens: number;
    totalCost: number;
  }>;
}

interface ActivityData {
  date: string;
  users: number;
  tokens: number;
  cost: number;
  requests: number;
}

interface UserDetail {
  id: number;
  email: string;
  username?: string;
  isAdmin: boolean;
  hasCompletedOnboarding: boolean;
  lastLoginAt?: string;
  lastActivityDate?: string;
  stats: {
    totalTokens: number;
    totalCost: number;
    totalRequests: number;
    foodLogsCount: number;
    recipesCount: number;
    tier: string;
    dailyLimit: number;
    monthlyLimit: number;
    dailyUsed: number;
    monthlyUsed: number;
  };
}

export default function AdminAnalytics() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);
  const [apiStats, setAPIStats] = useState<APIStats | null>(null);
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [allUsers, setAllUsers] = useState<UserDetail[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [usersRes, tokensRes, apiRes, activityRes, allUsersRes] = await Promise.all([
        fetch(`/api/admin/analytics/users`, { credentials: 'include' }),
        fetch(`/api/admin/analytics/tokens?range=${timeRange}`, { credentials: 'include' }),
        fetch(`/api/admin/analytics/api?range=${timeRange}`, { credentials: 'include' }),
        fetch(`/api/admin/analytics/activity?range=${timeRange}`, { credentials: 'include' }),
        fetch(`/api/admin/users`, { credentials: 'include' })
      ]);

      console.log('Analytics API responses:', {
        users: usersRes.status,
        tokens: tokensRes.status,
        api: apiRes.status,
        activity: activityRes.status
      });

      if (usersRes.ok) {
        const data = await usersRes.json();
        console.log('User stats:', data);
        setUserStats(data);
      } else {
        console.error('Users API error:', await usersRes.text());
      }
      
      if (tokensRes.ok) {
        const data = await tokensRes.json();
        console.log('Token stats:', data);
        setTokenStats(data);
      } else {
        console.error('Tokens API error:', await tokensRes.text());
      }
      
      if (apiRes.ok) {
        const data = await apiRes.json();
        console.log('API stats:', data);
        setAPIStats(data);
      } else {
        console.error('API stats error:', await apiRes.text());
      }
      
      if (activityRes.ok) {
        const data = await activityRes.json();
        console.log('Activity data:', data);
        setActivityData(data);
      } else {
        console.error('Activity API error:', await activityRes.text());
      }

      if (allUsersRes.ok) {
        const data = await allUsersRes.json();
        console.log('All users data:', data);
        setAllUsers(data);
      } else {
        console.error('All users API error:', await allUsersRes.text());
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const COLORS = ['#26A8FF', '#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF', '#FF8B94'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#26A8FF] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  console.log('Rendering with data:', { userStats, tokenStats, apiStats, activityData });

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLocation('/admin')}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
              aria-label="Back to Admin Dashboard"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-[#26A8FF]" />
                Admin Analytics Dashboard
              </h1>
              <p className="text-gray-500 mt-1">Comprehensive overview of platform metrics and usage</p>
            </div>
          </div>
          
          {/* Time Range Selector */}
          <div className="flex gap-2">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  timeRange === range
                    ? 'bg-[#26A8FF] text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </div>

        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Users */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
                +{userStats?.newUsersThisWeek || 0} this week
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Users</h3>
            <p className="text-3xl font-bold text-gray-900">{formatNumber(userStats?.totalUsers || 0)}</p>
            <p className="text-sm text-gray-500 mt-2">
              {formatNumber(userStats?.activeUsers || 0)} active users
            </p>
          </div>

          {/* Total Tokens Used */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                {formatNumber(tokenStats?.todayTokens || 0)} today
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Tokens</h3>
            <p className="text-3xl font-bold text-gray-900">
              {formatNumber(tokenStats?.totalTokensUsed || 0)}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Avg {formatNumber(tokenStats?.avgTokensPerUser || 0)} per user
            </p>
          </div>

          {/* Total Cost */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
                {formatCurrency(tokenStats?.todayCost || 0)} today
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total API Cost</h3>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(tokenStats?.totalCostUsd || 0)}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Avg {formatCurrency(tokenStats?.avgCostPerUser || 0)} per user
            </p>
          </div>

          {/* API Success Rate */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-100 rounded-xl">
                <Activity className="w-6 h-6 text-yellow-600" />
              </div>
              <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                (apiStats?.successRate || 0) >= 95 
                  ? 'text-green-600 bg-green-50' 
                  : 'text-red-600 bg-red-50'
              }`}>
                {((apiStats?.successRate || 0) * 100).toFixed(1)}% success
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">API Requests</h3>
            <p className="text-3xl font-bold text-gray-900">
              {formatNumber(apiStats?.totalRequests || 0)}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {apiStats?.avgResponseTime.toFixed(0)}ms avg response
            </p>
          </div>
        </div>

        {/* Activity Chart */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-[#26A8FF]" />
            Platform Activity Over Time
          </h2>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={activityData}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#26A8FF" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#26A8FF" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF6B6B" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#FF6B6B" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="users" 
                stroke="#26A8FF" 
                fillOpacity={1} 
                fill="url(#colorUsers)" 
                name="Active Users"
              />
              <Area 
                type="monotone" 
                dataKey="requests" 
                stroke="#FF6B6B" 
                fillOpacity={1} 
                fill="url(#colorRequests)" 
                name="API Requests"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Token Usage & Cost Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Token Usage Chart */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Zap className="w-6 h-6 text-purple-600" />
              Token Usage Trend
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="tokens" 
                  stroke="#A855F7" 
                  strokeWidth={2}
                  name="Tokens Used"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Cost Chart */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-green-600" />
              Daily Cost Trend
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar 
                  dataKey="cost" 
                  fill="#10B981" 
                  name="Cost (USD)"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Model Usage & Endpoint Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Model Usage */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Cpu className="w-6 h-6 text-[#26A8FF]" />
              Model Usage Distribution
            </h2>
            {apiStats?.modelUsage && apiStats.modelUsage.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={apiStats.modelUsage}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.model}: ${entry.count}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {apiStats.modelUsage.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">
                No model usage data
              </div>
            )}
            <div className="mt-6 space-y-3">
              {apiStats?.modelUsage.map((model, index) => (
                <div key={model.model} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-medium text-gray-700">{model.model}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatNumber(model.totalTokens)} tokens
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatCurrency(model.totalCost)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Endpoints */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Server className="w-6 h-6 text-blue-600" />
              Top API Endpoints
            </h2>
            <div className="space-y-4">
              {apiStats?.endpointBreakdown.slice(0, 10).map((endpoint, index) => (
                <div key={endpoint.endpoint} className="border-b border-gray-100 pb-4 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 text-sm truncate max-w-xs">
                      {endpoint.endpoint}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">
                      {formatNumber(endpoint.count)} calls
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Avg: {formatNumber(endpoint.avgTokens)} tokens</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(endpoint.totalCost)}
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-[#26A8FF] h-2 rounded-full transition-all"
                      style={{ 
                        width: `${Math.min(100, (endpoint.count / (apiStats?.endpointBreakdown[0]?.count || 1)) * 100)}%` 
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Users by Token Usage */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Users className="w-6 h-6 text-[#26A8FF]" />
            Top Users by Token Usage
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Rank</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">User ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Tokens Used</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Total Cost</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {tokenStats?.topUsers.map((user, index) => (
                  <tr key={user.userId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-50 text-blue-700'
                      }`}>
                        #{index + 1}
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono text-sm text-gray-600">
                      {user.userId}
                    </td>
                    <td className="py-4 px-4 text-gray-900">
                      {user.email}
                    </td>
                    <td className="py-4 px-4 text-right font-semibold text-gray-900">
                      {formatNumber(user.tokensUsed)}
                    </td>
                    <td className="py-4 px-4 text-right font-semibold text-green-600">
                      {formatCurrency(user.costUsd)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      {user.tokensUsed > 50000 ? (
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                          High Usage
                        </span>
                      ) : user.tokensUsed > 20000 ? (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                          Medium
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          Normal
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
            <Calendar className="w-8 h-8 mb-4 opacity-80" />
            <h3 className="text-sm font-medium opacity-90 mb-2">This Month</h3>
            <p className="text-3xl font-bold">{formatNumber(tokenStats?.monthTokens || 0)}</p>
            <p className="text-sm opacity-80 mt-1">tokens used</p>
            <p className="text-lg font-semibold mt-3">{formatCurrency(tokenStats?.monthCost || 0)}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
            <Clock className="w-8 h-8 mb-4 opacity-80" />
            <h3 className="text-sm font-medium opacity-90 mb-2">This Week</h3>
            <p className="text-3xl font-bold">{formatNumber(tokenStats?.weekTokens || 0)}</p>
            <p className="text-sm opacity-80 mt-1">tokens used</p>
            <p className="text-lg font-semibold mt-3">{formatCurrency(tokenStats?.weekCost || 0)}</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
            <Database className="w-8 h-8 mb-4 opacity-80" />
            <h3 className="text-sm font-medium opacity-90 mb-2">User Growth</h3>
            <p className="text-3xl font-bold">+{userStats?.newUsersThisMonth || 0}</p>
            <p className="text-sm opacity-80 mt-1">new users this month</p>
            <p className="text-lg font-semibold mt-3">
              {((userStats?.completedOnboarding || 0) / (userStats?.totalUsers || 1) * 100).toFixed(1)}% onboarded
            </p>
          </div>
        </div>

        {/* All Users Detailed Table */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-[#26A8FF]" />
              All Users ({allUsers.length})
            </h2>
            <div className="text-sm text-gray-500">
              Showing detailed user information and statistics
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-3 font-semibold text-gray-700 text-sm">ID</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-700 text-sm">Email</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-700 text-sm">Username</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-700 text-sm">Status</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-700 text-sm">Tier</th>
                  <th className="text-right py-3 px-3 font-semibold text-gray-700 text-sm">Tokens</th>
                  <th className="text-right py-3 px-3 font-semibold text-gray-700 text-sm">Cost</th>
                  <th className="text-right py-3 px-3 font-semibold text-gray-700 text-sm">Requests</th>
                  <th className="text-right py-3 px-3 font-semibold text-gray-700 text-sm">Food Logs</th>
                  <th className="text-right py-3 px-3 font-semibold text-gray-700 text-sm">Recipes</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-700 text-sm">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map((user, index) => (
                  <tr 
                    key={user.id} 
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}
                  >
                    <td className="py-3 px-3 font-mono text-xs text-gray-600">
                      {user.id}
                    </td>
                    <td className="py-3 px-3 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#26A8FF] to-blue-600 flex items-center justify-center text-white font-bold text-xs">
                          {user.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{user.email}</div>
                          {user.isAdmin && (
                            <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium mt-0.5">
                              Admin
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-700">
                      {user.username || '-'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {user.hasCompletedOnboarding ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                          <AlertCircle className="w-3 h-3" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                        user.stats.tier === 'premium' ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' :
                        user.stats.tier === 'pro' ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' :
                        'bg-gray-200 text-gray-700'
                      }`}>
                        {user.stats.tier.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-sm">
                      <div className="text-gray-900">{formatNumber(user.stats.totalTokens)}</div>
                      <div className="text-xs text-gray-500">
                        {user.stats.monthlyLimit > 0 ? 
                          `${((user.stats.monthlyUsed / user.stats.monthlyLimit) * 100).toFixed(0)}% of limit` :
                          'No limit'
                        }
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-green-600 text-sm">
                      {formatCurrency(user.stats.totalCost)}
                    </td>
                    <td className="py-3 px-3 text-right text-gray-700 text-sm">
                      {formatNumber(user.stats.totalRequests)}
                    </td>
                    <td className="py-3 px-3 text-right text-sm">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded font-medium">
                        <Activity className="w-3 h-3" />
                        {user.stats.foodLogsCount}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-sm">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded font-medium">
                        <Server className="w-3 h-3" />
                        {user.stats.recipesCount}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-xs text-gray-500">
                      {user.lastActivityDate ? 
                        new Date(user.lastActivityDate).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        }) : 
                        user.lastLoginAt ?
                        new Date(user.lastLoginAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        }) :
                        'Never'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {allUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No users found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
