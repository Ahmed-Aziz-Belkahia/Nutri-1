import { Switch, Route, useLocation } from "wouter";
import { useAuth, AuthProvider } from "@/hooks/use-auth";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AppSkeleton, RecipesSkeleton } from "@/components/ui/AppSkeleton";
import { DashboardSkeleton } from "@/components/ui/DashboardSkeleton";
import AuthPage from "./pages/AuthPage";
import DashboardNew from "./pages/DashboardNew";
import Settings from "./pages/Settings";
import AddFoodNew from "./pages/AddFoodNew";
import MealAnalysis from "./pages/MealAnalysis";
import IngredientsAnalysis from "./pages/IngredientsAnalysis";
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
import Privacy from "./pages/Privacy";
import Profile from "./pages/Profile";
import TempNewOnboarding from "./pages/TempNewOnboarding";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import BottomNav from "./components/BottomNav";
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
    } else if (location.startsWith('/dashboard')) {
      return <DashboardSkeleton />;
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
    } else if (location.startsWith('/dashboard')) {
      return <DashboardSkeleton />;
    }
    return <AppSkeleton />;
  }

  // Show bottom nav only on main app pages when authenticated
  // Exclude /dashboard and /profile as they have their own navbar via BaseLayout
  const showBottomNav = user && ['/settings'].includes(location);

  // Use black background for camera-based pages only
  const isFullScreenCameraPage = location === '/scan-recipe' || location === '/add-food' || location === '/meal-analysis' || location === '/ingredients-analysis';
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

            <Route path="/dashboard">
              <ProtectedRoute>
                <DashboardNew />
              </ProtectedRoute>
            </Route>
            <Route path="/settings">
              <ProtectedRoute>
                <Settings />
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
            <Route path="/profile">
              <ProtectedRoute>
                <Profile />
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
            <Route path="/onboarding" component={TempNewOnboarding} />
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
