import * as React from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import axios from "axios";
import { clearTokens, getRefreshToken } from "@/lib/nativeApi";
import { useToast } from "./use-toast";

type User = {
  id: number;
  email: string;
  preferredLanguage?: string;
  preferred_language?: string; // Support both formats during transition
  hasCompletedOnboarding?: boolean;
  has_completed_onboarding?: boolean; // Support both formats during transition
  profileImage?: string;
  profile_image?: string; // Support both formats during transition
  isAdmin?: boolean;
  is_admin?: boolean; // Support both formats during transition
  profile?: {
    currentWeight?: number;
    goalWeight?: number;
    weightGoal?: string;
    activityLevel?: string;
    calorieGoal?: number;
    proteinGoal?: number;
    carbsGoal?: number;
    fatGoal?: number;
  };
};

type LoginData = {
  email: string;
  password: string;
};

type RegisterData = LoginData & {
  profile?: {
    currentWeight: number;
    goalWeight: number;
    weightGoal: string;
    activityLevel: string;
    calorieGoal: number;
    proteinGoal: number;
    carbsGoal: number;
    fatGoal: number;
  };
};

type AuthResponse = {
  ok: boolean;
  error?: string;
  requiresVerification?: boolean;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  loginMutation: UseMutationResult<AuthResponse, Error, LoginData>;
  registerMutation: UseMutationResult<AuthResponse, Error, RegisterData>;
  logout: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sessionRestored, setSessionRestored] = React.useState(false);

  const { data: user, isLoading, refetch } = useQuery<User | null>({
    queryKey: ["user"],
    queryFn: async () => {
      try {
        // Use the new JWT auth endpoint
        const response = await axios.get("/api/auth/me", { withCredentials: true });
        console.log('User data received from JWT API:', response.data);
        
        // Transform snake_case to camelCase for frontend 
        const userData = response.data;
        if (userData) {
          // Handle both snake_case and camelCase naming conventions during transition
          const transformedUser: User = {
            id: userData.id,
            email: userData.email,
            // Store values in both snake_case and camelCase formats for compatibility
            preferredLanguage: userData.preferred_language || userData.preferredLanguage,
            preferred_language: userData.preferred_language || userData.preferredLanguage,
            hasCompletedOnboarding: userData.has_completed_onboarding !== undefined ? userData.has_completed_onboarding : userData.hasCompletedOnboarding,
            has_completed_onboarding: userData.has_completed_onboarding !== undefined ? userData.has_completed_onboarding : userData.hasCompletedOnboarding,
            profileImage: userData.profile_image || userData.profileImage,
            profile_image: userData.profile_image || userData.profileImage,
            isAdmin: userData.is_admin || userData.isAdmin,
            is_admin: userData.is_admin || userData.isAdmin,
            // Add other properties as needed
          };
          console.log('Transformed user data:', transformedUser);
          console.log('hasCompletedOnboarding value:', transformedUser.hasCompletedOnboarding);
          
          // Store session flag in localStorage
          localStorage.setItem('nutriai_session_active', 'true');
          localStorage.setItem('nutriai_user_id', String(transformedUser.id));
          
          return transformedUser;
        }
        return userData;
      } catch (error) {
        console.error('Failed to fetch user from JWT endpoint:', error);
        // Clear session flag on auth failure
        localStorage.removeItem('nutriai_session_active');
        localStorage.removeItem('nutriai_user_id');
        return null;
      }
    },
    staleTime: Infinity, // User data never becomes stale (only refresh manually)
    gcTime: Infinity, // Keep user data in cache indefinitely
    retry: false, // Don't retry failed auth requests automatically
    refetchOnMount: false, // Don't refetch on mount, we'll handle restoration manually
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
  });

  // Session restoration on mount
  React.useEffect(() => {
    const restoreSession = async () => {
      // Check if there was an active session
      const hadActiveSession = localStorage.getItem('nutriai_session_active') === 'true';
      
      if (!hadActiveSession) {
        console.log('[Auth] No previous session found');
        setSessionRestored(true);
        return;
      }

      console.log('[Auth] Previous session detected, attempting to restore...');
      
      try {
        // First try to refresh the token
        await axios.post("/api/auth/refresh", { refreshToken: await getRefreshToken() }, { withCredentials: true });
        console.log('[Auth] Token refreshed successfully');
        
        // Then fetch user data
        await refetch();
        console.log('[Auth] Session restored successfully');
      } catch (error) {
        console.error('[Auth] Session restoration failed:', error);
        // Clear session flags if restoration fails
        localStorage.removeItem('nutriai_session_active');
        localStorage.removeItem('nutriai_user_id');
      } finally {
        setSessionRestored(true);
      }
    };

    restoreSession();
  }, [refetch]);

  // Auto-refresh token every 20 hours (before the 24-hour expiry)
  React.useEffect(() => {
    if (!user) return; // Only set up refresh if user is logged in

    const refreshInterval = setInterval(async () => {
      try {
        console.log('[Auth] Auto-refreshing access token...');
        await axios.post("/api/auth/refresh", { refreshToken: await getRefreshToken() }, { withCredentials: true });
        console.log('[Auth] Token auto-refreshed successfully');
      } catch (error) {
        console.error('[Auth] Auto-refresh failed:', error);
        // Clear session on refresh failure
        localStorage.removeItem('nutriai_session_active');
        localStorage.removeItem('nutriai_user_id');
        queryClient.setQueryData(["user"], null);
      }
    }, 20 * 60 * 60 * 1000); // 20 hours in milliseconds

    return () => clearInterval(refreshInterval);
  }, [user, queryClient]);

  const loginMutation = useMutation<AuthResponse, Error, LoginData>({
    mutationFn: async (credentials) => {
      // Use the new JWT auth endpoint (will be redirected via 307)
      const response = await axios.post("/api/auth/login", credentials, {
        withCredentials: true,
      });
      return response.data;
    },
    onSuccess: async () => {
      // Refetch user data to populate the session
      await refetch();
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.response?.data?.error || "An unexpected error occurred",
      });
      throw error;
    },
  });

  const registerMutation = useMutation<AuthResponse, Error, RegisterData>({
    mutationFn: async (data) => {
      // Use the new JWT auth endpoint (will be redirected via 307)
      const response = await axios.post("/api/auth/register", data, {
        withCredentials: true,
      });
      return response.data;
    },
    onSuccess: async () => {
      // Refetch user data to populate the session
      await refetch();
      toast({
        title: "Registration successful",
        description: "Welcome to NutriAI!",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error.response?.data?.error || "An unexpected error occurred",
      });
      throw error;
    },
  });

  const logout = async () => {
    try {
      // Use the new JWT auth endpoint (will be redirected via 307)
      await axios.post("/api/auth/logout", {}, { withCredentials: true });

      // On native the session lives in the stored bearer token, not a cookie,
      // so clearing the server session is not enough.
      await clearTokens();

      // Clear local session flags
      localStorage.removeItem('nutriai_session_active');
      localStorage.removeItem('nutriai_user_id');
      
      // Clear user data from React Query cache
      queryClient.setQueryData(["user"], null);
      // Force invalidate the user query to ensure the auth state is updated correctly
      queryClient.invalidateQueries({ queryKey: ["user"] });
      
      toast({
        title: "Logged out successfully",
      });
      
      // Force navigation to auth page
      window.location.href = '/auth';
    } catch (error) {
      // Even if logout API fails, clear local state and redirect
      localStorage.removeItem('nutriai_session_active');
      localStorage.removeItem('nutriai_user_id');
      queryClient.setQueryData(["user"], null);
      
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: "An unexpected error occurred",
      });
      
      // Still redirect to auth page
      window.location.href = '/auth';
    }
  };

  const value: AuthContextType = {
    user: user ?? null,
    isLoading,
    loginMutation,
    registerMutation,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}