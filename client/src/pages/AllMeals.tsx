import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Camera, Calendar, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import PullToRefresh from "@/components/PullToRefresh";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { useFoodLogsByDate, useDeleteFoodLog } from "@/hooks/queries/useFoodLogs";
import { format } from "date-fns";

interface FoodLog {
  id: number;
  name: string;
  calories: number;
  protein: string;
  carbs: string;
  fat: string;
  date: string;
  image?: string;
}

interface FoodLogsResponse {
  logs: FoodLog[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export default function AllMeals() {
  const { t } = useTranslation(['common']);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  
  // Use today's date for fetching all meals
  const today = format(new Date(), 'yyyy-MM-dd');
  
  // Pull to refresh setup
  const handleRefresh = usePullToRefresh([
    ['/api/food-logs']
  ]);
  
  // Redirect to onboarding if user hasn't completed it
  useEffect(() => {
    if (user && !user.hasCompletedOnboarding) {
      navigate("/onboarding");
    }
  }, [user, navigate]);
  
  // Use custom hook for food logs (cast to work with local interface)
  const { data, isLoading } = useFoodLogsByDate(today);
  const foodLogsData = data as any as FoodLogsResponse | undefined;

  // Use custom delete mutation
  const deleteMutation = useDeleteFoodLog(today);

  const createFoodLogMutation = useMutation({
    mutationFn: async ({ name, image, analysis }: { name: string; image?: string; analysis?: any }) => {
      const response = await fetch('/api/food-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name,
          image,
          analysis // Pass the analysis result
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-logs"] });
      toast({
        title: t('common:allMeals.success.created'),
        description: t('common:allMeals.success.created'),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: t('common:allMeals.error.createFailed'),
        description: error instanceof Error ? error.message : t('common:allMeals.error.createFailed'),
      });
    },
  });


  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0CC5BA]/5 to-blue-500/5 p-6">
        <div className="max-w-7xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold mb-6 bg-gradient-to-br from-[#0CC5BA] via-[#0CBACC] to-[#0C9CCC] bg-clip-text text-transparent"
          >
            {t('common:allMeals.loading')}
          </motion.h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="animate-pulse">
                  <div className="bg-gray-200 h-48 w-full" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-gradient-to-br from-[#0CC5BA]/5 to-blue-500/5 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold bg-gradient-to-br from-[#0CC5BA] via-[#0CBACC] to-[#0C9CCC] bg-clip-text text-transparent"
          >
            {t('common:allMeals.title')}
          </motion.h1>
          <Link href="/add-food">
            <Button className="bg-[#0CC5BA] hover:bg-[#0CC5BA]/90" onClick={() => createFoodLogMutation.mutate({name: "test", analysis: {}})}> {/* Added onClick handler */}
              <Plus className="h-4 w-4 mr-2" />
              {t('common:allMeals.addMeal')}
            </Button>
          </Link>
        </div>

        {foodLogsData?.logs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Camera className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600">{t('common:allMeals.noMeals')}</p>
            <p className="text-sm text-gray-500 mt-2">{t('common:allMeals.noMealsDesc')}</p>
          </motion.div>
        ) : (
          <>
            <motion.div 
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {foodLogsData?.logs.map((log: any) => (
                <motion.div key={log.id} variants={item}>
                  <Card className="overflow-hidden group hover:shadow-lg transition-shadow duration-300 border-[#0CC5BA]/10 bg-white/80 backdrop-blur-xl">
                    <div className="relative">
                      <Link href={`/meal/${log.id}`}>
                        {log.image ? (
                          <AspectRatio ratio={4/3}>
                            <img
                              src={log.image}
                              alt={log.name}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </AspectRatio>
                        ) : (
                          <AspectRatio ratio={4/3}>
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                              <Camera className="h-8 w-8 text-gray-400" />
                            </div>
                          </AspectRatio>
                        )}
                      </Link>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        onClick={() => deleteMutation.mutate(log.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="p-4">
                      <Link href={`/meal/${log.id}`}>
                        <h3 className="font-semibold text-lg mb-2 line-clamp-1 group-hover:text-[#0CC5BA] transition-colors">
                          {log.name}
                        </h3>
                      </Link>
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="bg-[#0CC5BA]/5 p-2 rounded-md">
                            <p className="text-gray-500">Calories</p>
                            <p className="font-medium">{log.calories}</p>
                          </div>
                          <div className="bg-[#0CC5BA]/5 p-2 rounded-md">
                            <p className="text-gray-500">Protein</p>
                            <p className="font-medium">{log.protein}g</p>
                          </div>
                        </div>
                        <div className="flex items-center text-sm text-gray-500 mt-2">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>{formatDate(log.date)}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            {data?.totals && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="mt-8 p-6 border-t-4 border-t-[#0CC5BA]">
                  <h2 className="text-lg font-semibold mb-4">{t('common:enhancedDashboard.dailyProgress')}</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                    <div className="p-4 bg-[#0CC5BA]/5 rounded-lg">
                      <p className="text-sm text-gray-500">{t('common:enhancedDashboard.calorieIntake')}</p>
                      <p className="text-2xl font-semibold text-[#0CC5BA]">{data.totals.calories}</p>
                    </div>
                    <div className="p-4 bg-[#0CC5BA]/5 rounded-lg">
                      <p className="text-sm text-gray-500">{t('common:enhancedDashboard.protein')}</p>
                      <p className="text-2xl font-semibold text-[#0CC5BA]">{data.totals.protein}g</p>
                    </div>
                    <div className="p-4 bg-[#0CC5BA]/5 rounded-lg">
                      <p className="text-sm text-gray-500">{t('common:enhancedDashboard.carbs')}</p>
                      <p className="text-2xl font-semibold text-[#0CC5BA]">{data.totals.carbs}g</p>
                    </div>
                    <div className="p-4 bg-[#0CC5BA]/5 rounded-lg">
                      <p className="text-sm text-gray-500">{t('common:enhancedDashboard.fat')}</p>
                      <p className="text-2xl font-semibold text-[#0CC5BA]">{data.totals.fat}g</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </>
        )}
      </div>
      </div>
    </PullToRefresh>
  );
}