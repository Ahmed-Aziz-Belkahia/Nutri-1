import * as React from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import axios from "axios";
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

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["user"],
    queryFn: async () => {
      try {
        const response = await axios.get("/api/user", { withCredentials: true });
        console.log('User data received from API:', response.data);
        
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
            hasCompletedOnboarding: userData.has_completed_onboarding || userData.hasCompletedOnboarding,
            has_completed_onboarding: userData.has_completed_onboarding || userData.hasCompletedOnboarding,
            profileImage: userData.profile_image || userData.profileImage,
            profile_image: userData.profile_image || userData.profileImage,
            isAdmin: userData.is_admin || userData.isAdmin,
            is_admin: userData.is_admin || userData.isAdmin,
            // Add other properties as needed
          };
          return transformedUser;
        }
        return userData;
      } catch (error) {
        return null;
      }
    },
  });

  const loginMutation = useMutation<AuthResponse, Error, LoginData>({
    mutationFn: async (credentials) => {
      const response = await axios.post("/api/login", credentials, {
        withCredentials: true,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
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
      const response = await axios.post("/api/register", data, {
        withCredentials: true,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
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
      await axios.post("/api/logout", {}, { withCredentials: true });
      queryClient.setQueryData(["user"], null);
      // Force invalidate the user query to ensure the auth state is updated correctly
      queryClient.invalidateQueries({ queryKey: ["user"] });
      toast({
        title: "Logged out successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: "An unexpected error occurred",
      });
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