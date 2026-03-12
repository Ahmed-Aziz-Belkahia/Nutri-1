import { Switch, Route, useLocation } from "wouter";
import { useAuth, AuthProvider } from "@/hooks/use-auth";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Loading } from "@/components/ui/Loading";
import { AppSkeleton, RecipesSkeleton } from "@/components/ui/AppSkeleton";
import { ProgressSkeleton } from "@/components/ui/ProgressSkeleton";
import { DashboardSkeleton } from "@/components/ui/DashboardSkeleton";
import Footer from "./components/Footer";
import AuthPage from "./pages/AuthPage";
import DashboardNew from "./pages/DashboardNew";
import LandingPage from "./pages/LandingPage";
import Settings from "./pages/Settings";
import EnhancedDashboard from "./pages/EnhancedDashboard";
import DetailedNutrition from "./pages/DetailedNutrition";
import SimpleNutritionDetail from "./pages/SimpleNutritionDetail";
import AddFood from "./pages/AddFood";
import AddFoodNew from "./pages/AddFoodNew";
import EnhancedAddFood from "./pages/EnhancedAddFood";
import MealAnalysis from "./pages/MealAnalysis";
import IngredientsAnalysis from "./pages/IngredientsAnalysis";
import FoodDetail from "./pages/FoodDetail";
import MealDetail from "./pages/MealDetail";
import RecipesNew from "./pages/RecipesNew";
import RecipeDetail from "./pages/RecipeDetail";
import CookingMode from "./pages/CookingMode";
import CreateRecipe from "./pages/CreateRecipe";
import RecipeScanner from "./pages/RecipeScanner";
import IngredientConfirmation from "./pages/IngredientConfirmation";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import GoogleAuthSuccess from "./pages/GoogleAuthSuccess";
import RecipeResults from "./pages/RecipeResults";
import SimpleCookingMode from "./pages/SimpleCookingMode";
import Privacy from "./pages/Privacy";
import AllMeals from "./pages/AllMeals";
import CircularButtonDemo from "./pages/CircularButtonDemo";
import TealButtonDemo from "./pages/TealButtonDemo";
import { useEffect, useState, Suspense, lazy } from "react";
import { format } from "date-fns";
import BottomNav from "./components/BottomNav";
import TransformationQuiz from "./pages/Onboarding/TransformationQuiz";
import Goals from "./pages/settings/goals";
import Profile from "./pages/Profile";
import NotificationsPage from "./pages/settings/NotificationsPage";
import PrivacyPage from "./pages/settings/PrivacyPage";
import HelpPage from "./pages/settings/HelpPage";
import AboutPage from "./pages/settings/AboutPage";
import SecurityPage from "./pages/settings/SecurityPage";
import SimpleMealPlanningQuiz from "./pages/SimpleMealPlanningQuiz";
import MealPlanningQuiz from "./pages/MealPlanningQuiz";
import MealPlanningQuizNew from "./pages/MealPlanningQuizNew";
import MealPlanView from "./pages/MealPlanView";
import MealPlanMarketplace from "./pages/MealPlanMarketplace";
import CreateMealPlan from "./pages/CreateMealPlan";

import MealPlan from "./pages/MealPlan";
import ShoppingList from "./pages/ShoppingList";
import EnhancedShoppingList from "./pages/EnhancedShoppingList";
import ImprovedShoppingList from "./pages/ImprovedShoppingList";
import PremiumShoppingList from "./pages/PremiumShoppingListPage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminAnalytics from "./pages/AdminAnalytics";
import { AdminProtectedRoute } from "./lib/admin-protected-route";

import TodayMealPlan from "./pages/TodayMealPlan";
import Analytics from "./pages/Analytics";
import BodyFatAnalysis from "./pages/BodyFatAnalysis";
import UnifiedProgress from "./pages/UnifiedProgress";
import CameraPage from "./pages/CameraPage";
import OnboardingQuiz from "./pages/OnboardingQuiz";
import TestLogin from "./pages/TestLogin";
import DebugLogin from "./pages/DebugLogin";

// Auth and Onboarding pages
import EmotionalLandingPage from "./pages/EmotionalLandingPage";
import EmotionalPaywall from "./pages/EmotionalPaywall";
import VisionBoard from "./pages/VisionBoard";
import TempNewOnboarding from "./pages/TempNewOnboarding";
import { LanguageProvider } from "@/components/LanguageProvider";
import { initializeWebViewOptimizations } from "./lib/webviewOptimizations";
import { useScrollRestoration } from "@/hooks/use-scroll-restoration";

// Redirect component for navigation
function NavigationRedirect({ to }: { to: string }) {
  const [, navigate] = useLocation();
  useEffect(() => {
    navigate(to);
  }, [to, navigate]);
  return null;
}

// Data Prefetcher component that prefetches common data
function DataPrefetcher() {
  const queryClient = useQueryClient();
  const [prefetched, setPrefetched] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd'); // Get today's date in YYYY-MM-DD format (local timezone)

  useEffect(() => {
    if (!prefetched) {
      // Prefetch common data that is used across multiple pages
      queryClient.prefetchQuery({
        queryKey: ["/api/user/profile"],
        staleTime: 1000 * 60 * 10, // 10 minutes
      });
      
      queryClient.prefetchQuery({
        queryKey: ["/api/meal-plans/today"],
        staleTime: 1000 * 60 * 10, // 10 minutes
      });

      // Prefetch initial recipes data
      queryClient.prefetchQuery({
        queryKey: ["/api/recipes", "saved"],
        staleTime: 1000 * 60 * 10, // 10 minutes
      });

      queryClient.prefetchQuery({
        queryKey: ["/api/recipes", "created"],
        staleTime: 1000 * 60 * 10, // 10 minutes
      });

      // Prefetch data for dashboard
      queryClient.prefetchQuery({
        queryKey: ["/api/food-logs", today],
        staleTime: 1000 * 60 * 5, // 5 minutes
      });

      // Prefetch data for progress
      queryClient.prefetchQuery({
        queryKey: ["/api/progress-photos"],
        staleTime: 1000 * 60 * 10, // 10 minutes
      });

      queryClient.prefetchQuery({
        queryKey: ["/api/weight-logs"],
        staleTime: 1000 * 60 * 10, // 10 minutes
      });

      setPrefetched(true);
    }
  }, [queryClient, prefetched, today]);

  return null;
}

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [location] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [isLoading, user, navigate]);

  // Show the appropriate skeleton based on the current route
  if (isLoading) {
    if (location.startsWith('/recipes')) {
      return <RecipesSkeleton />;
    } else if (location.startsWith('/dashboard') || location.startsWith('/enhanced-dashboard')) {
      return <DashboardSkeleton />;
    } else if (location.startsWith('/progress') || location.startsWith('/progress-new')) {
      return <ProgressSkeleton />;
    }
    return <AppSkeleton />;
  }

  return user ? (
    <>
      {children}
      <DataPrefetcher />
    </>
  ) : null;
}

function App() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  const [showSkeleton, setShowSkeleton] = useState(true);
  
  // Enable scroll restoration for all route changes
  useScrollRestoration();

  // Use effect to add a slight delay before showing the skeleton
  // This prevents flickering for very quick loads
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSkeleton(isLoading);
    }, 100);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Determine which skeleton to show based on the location
  if (showSkeleton) {
    if (location.startsWith('/recipes')) {
      return <RecipesSkeleton />;
    } else if (location.startsWith('/dashboard') || location.startsWith('/enhanced-dashboard')) {
      return <DashboardSkeleton />;
    } else if (location.startsWith('/progress') || location.startsWith('/progress-new')) {
      return <ProgressSkeleton />;
    }
    return <AppSkeleton />;
  }

  // Show bottom nav only on main app pages when authenticated
  // Exclude /dashboard, /progress, and /profile as they have their own navbar via BaseLayout
  const showBottomNav = user && ['/dashboard-old', '/enhanced-dashboard', '/settings', '/meals', '/analytics'].includes(location);

  // Use black background for camera-based pages only
  const isFullScreenCameraPage = location === '/scan-recipe' || location === '/add-food' || location === '/enhanced-add-food' || location === '/meal-analysis' || location === '/ingredients-analysis';
  const appBackgroundClass = isFullScreenCameraPage 
    ? "app-container min-h-screen relative bg-black" 
    : "app-container min-h-screen relative bg-white";
  
  const contentPaddingClass = isFullScreenCameraPage 
    ? "main-content" 
    : "main-content pt-safe-or-6";

  return (
    <>
      <div className={appBackgroundClass}>
        <div className={contentPaddingClass}>
          <Switch>
          {/* Common routes accessible to all users */}
          <Route path="/privacy" component={Privacy} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/reset-password" component={ResetPassword} />
          <Route path="/auth/google/success" component={GoogleAuthSuccess} />

          {user ? (
            // Protected routes for authenticated users
            <>
              <Route path="/onboarding">
                <ProtectedRoute>
                  <TempNewOnboarding />
                </ProtectedRoute>
              </Route>

            <Route path="/vision-board">
              <ProtectedRoute>
                <VisionBoard />
              </ProtectedRoute>
            </Route>

            <Route path="/temp-new-onboarding">
              <ProtectedRoute>
                <TempNewOnboarding />
              </ProtectedRoute>
            </Route>

            <Route path="/old-onboarding">
              <ProtectedRoute>
                <OnboardingQuiz />
              </ProtectedRoute>
            </Route>

            <Route path="/dashboard">
              <ProtectedRoute>
                <DashboardNew />
              </ProtectedRoute>
            </Route>
            <Route path="/dashboard-old">
              <ProtectedRoute>
                <DashboardNew />
              </ProtectedRoute>
            </Route>
            <Route path="/progress">
              <ProtectedRoute>
                <UnifiedProgress />
              </ProtectedRoute>
            </Route>
            <Route path="/camera">
              <ProtectedRoute>
                <CameraPage />
              </ProtectedRoute>
            </Route>
            <Route path="/progress-new">
              <ProtectedRoute>
                <UnifiedProgress />
              </ProtectedRoute>
            </Route>
            <Route path="/enhanced-dashboard">
              <ProtectedRoute>
                <EnhancedDashboard />
              </ProtectedRoute>
            </Route>
            <Route path="/settings">
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            </Route>
            <Route path="/settings/goals">
              <ProtectedRoute>
                <Goals />
              </ProtectedRoute>
            </Route>
            <Route path="/settings/notifications">
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            </Route>
            <Route path="/settings/privacy">
              <ProtectedRoute>
                <PrivacyPage />
              </ProtectedRoute>
            </Route>
            <Route path="/settings/security">
              <ProtectedRoute>
                <SecurityPage />
              </ProtectedRoute>
            </Route>
            <Route path="/settings/help">
              <ProtectedRoute>
                <HelpPage />
              </ProtectedRoute>
            </Route>
            <Route path="/settings/about">
              <ProtectedRoute>
                <AboutPage />
              </ProtectedRoute>
            </Route>
            <Route path="/add-food">
              <ProtectedRoute>
                <AddFoodNew />
              </ProtectedRoute>
            </Route>
            <Route path="/meal-analysis">
              <ProtectedRoute>
                <MealAnalysis />
              </ProtectedRoute>
            </Route>
            <Route path="/ingredients-analysis">
              <ProtectedRoute>
                <IngredientsAnalysis />
              </ProtectedRoute>
            </Route>
            <Route path="/add-food-old">
              <ProtectedRoute>
                <AddFood />
              </ProtectedRoute>
            </Route>
            <Route path="/enhanced-add-food">
              <ProtectedRoute>
                <EnhancedAddFood />
              </ProtectedRoute>
            </Route>
            <Route path="/food/:id">
              <ProtectedRoute>
                <FoodDetail />
              </ProtectedRoute>
            </Route>
            <Route path="/meal/:id">
              <ProtectedRoute>
                <MealDetail />
              </ProtectedRoute>
            </Route>
            <Route path="/recipes">
              <ProtectedRoute>
                <RecipesNew />
              </ProtectedRoute>
            </Route>
            <Route path="/recipes/food-log/:id">
              <ProtectedRoute>
                <RecipeDetail />
              </ProtectedRoute>
            </Route>
            <Route path="/recipes/:id">
              <ProtectedRoute>
                <RecipeDetail />
              </ProtectedRoute>
            </Route>
            <Route path="/cooking/food-log/:id">
              <ProtectedRoute>
                <CookingMode />
              </ProtectedRoute>
            </Route>
            <Route path="/cooking/:id">
              <ProtectedRoute>
                <CookingMode />
              </ProtectedRoute>
            </Route>
            <Route path="/create-recipe">
              <ProtectedRoute>
                <CreateRecipe />
              </ProtectedRoute>
            </Route>
            <Route path="/scan-recipe">
              <ProtectedRoute>
                <RecipeScanner />
              </ProtectedRoute>
            </Route>
            <Route path="/confirm-ingredients">
              <ProtectedRoute>
                <IngredientConfirmation />
              </ProtectedRoute>
            </Route>
            <Route path="/recipe-results">
              <ProtectedRoute>
                <RecipeResults />
              </ProtectedRoute>
            </Route>
            <Route path="/cooking/:recipeId">
              <ProtectedRoute>
                <SimpleCookingMode />
              </ProtectedRoute>
            </Route>
            <Route path="/meals">
              <ProtectedRoute>
                <AllMeals />
              </ProtectedRoute>
            </Route>
            {/* Calendar route removed */}
            <Route path="/profile">
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            </Route>
            <Route path="/meal-planning-quiz">
              <ProtectedRoute>
                <MealPlanningQuiz />
              </ProtectedRoute>
            </Route>

            <Route path="/meal-planning-quiz-new">
              <ProtectedRoute>
                <MealPlanningQuizNew />
              </ProtectedRoute>
            </Route>

            <Route path="/meal-plan/view">
              <ProtectedRoute>
                <MealPlanView />
              </ProtectedRoute>
            </Route>

            <Route path="/meal-plan-marketplace">
              <ProtectedRoute>
                <MealPlanMarketplace />
              </ProtectedRoute>
            </Route>

            <Route path="/meal-plan-marketplace/create">
              <ProtectedRoute>
                <CreateMealPlan />
              </ProtectedRoute>
            </Route>

            <Route path="/meal-plan">
              <ProtectedRoute>
                <NavigationRedirect to="/recipes?tab=meal-plan" />
              </ProtectedRoute>
            </Route>
            <Route path="/shopping-list">
              <ProtectedRoute>
                <NavigationRedirect to="/recipes" />
              </ProtectedRoute>
            </Route>
            <Route path="/premium-shopping-list">
              <ProtectedRoute>
                <PremiumShoppingList />
              </ProtectedRoute>
            </Route>
            <Route path="/today-meal-plan">
              <ProtectedRoute>
                <TodayMealPlan meals={[]} />
              </ProtectedRoute>
            </Route>
            <Route path="/analytics">
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            </Route>
            <Route path="/detailed-nutrition">
              <ProtectedRoute>
                <DetailedNutrition />
              </ProtectedRoute>
            </Route>
            
            <Route path="/simple-nutrition">
              <ProtectedRoute>
                <SimpleNutritionDetail />
              </ProtectedRoute>
            </Route>
            
            <Route path="/button-demo">
              <ProtectedRoute>
                <CircularButtonDemo />
              </ProtectedRoute>
            </Route>
            
            <Route path="/teal-button-demo">
              <ProtectedRoute>
                <TealButtonDemo />
              </ProtectedRoute>
            </Route>
            
            <Route path="/progress/body-fat-analysis">
              <ProtectedRoute>
                <BodyFatAnalysis />
              </ProtectedRoute>
            </Route>

            {/* Emotional journey routes */}
            <Route path="/emotional-paywall">
              <ProtectedRoute>
                <EmotionalPaywall />
              </ProtectedRoute>
            </Route>

            {/* Admin routes - available to all authenticated users */}
            <Route path="/admin">
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            </Route>
            
            <Route path="/admin/analytics">
              <ProtectedRoute>
                <AdminAnalytics />
              </ProtectedRoute>
            </Route>

            {/* Redirect authenticated users */}
            <Route path="/">
              <NavigationRedirect to={user?.hasCompletedOnboarding === true ? "/dashboard" : "/onboarding"} />
            </Route>
            
            {/* Fallback - redirect any unknown routes for authenticated users */}
            <Route>
              <NavigationRedirect to={user?.hasCompletedOnboarding === true ? "/dashboard" : "/onboarding"} />
            </Route>
          </>
        ) : (
          // Public routes for unauthenticated users
          <>
            <Route path="/auth" component={AuthPage} />
            <Route path="/verify-email" component={VerifyEmail} />
            <Route path="/forgot-password" component={ForgotPassword} />
            <Route path="/reset-password" component={ResetPassword} />
            <Route path="/test-login" component={TestLogin} />
            <Route path="/debug-login" component={DebugLogin} />
            <Route path="/emotional-landing" component={EmotionalLandingPage} />
            <Route path="/onboarding" component={TempNewOnboarding} />
            <Route path="/old-onboarding" component={OnboardingQuiz} />
            <Route path="/" component={TempNewOnboarding} />
            
            {/* Redirect unknown routes to landing */}
            <Route>
              <NavigationRedirect to="/" />
            </Route>
          </>
        )}
        </Switch>
      </div>
    </div>
    
    {/* Show bottom navigation for authenticated users on main pages - Outside main container */}
    {showBottomNav && <BottomNav />}
    </>
  );
}

// Wrap the app with necessary providers
export default function AppWithProviders() {
  // Initialize WebView optimizations on mount
  useEffect(() => {
    initializeWebViewOptimizations();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}