import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InsertUser, SelectUser, LoginUser } from "@db/schema";
import { useToast } from "@/hooks/use-toast";

export interface UserProfile {
  id: number;
  displayName?: string;
  height?: number;
  weight?: number;
  bodyFatPercentage?: number;
  goals?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
}

type RequestResult = {
  ok: true;
} | {
  ok: false;
  error: string;
};

async function handleRequest(
  url: string,
  method: string,
  data?: any
): Promise<RequestResult> {
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { 
        ok: false, 
        error: errorData.error || 'Operation failed'
      };
    }

    return { ok: true };
  } catch (e: any) {
    return { 
      ok: false, 
      error: e.message || 'Network error'
    };
  }
}

export function useUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: user, error, isLoading, refetch } = useQuery<(SelectUser & { profile?: UserProfile }) | null>({
    queryKey: ['/api/user'],
    queryFn: async () => {
      try {
        const res = await fetch("/api/user", {
          credentials: "include",
        });

        if (res.status === 401) {
          return null;
        }

        if (!res.ok) {
          throw new Error(await res.text());
        }

        const data = await res.json();
        return data;
      } catch (error) {
        console.error('Error fetching user:', error);
        return null;
      }
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginUser) => {
      return handleRequest("/api/login", "POST", credentials);
    },
    onSuccess: (result) => {
      if (!result.ok) {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: result.error,
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      return handleRequest("/api/register", "POST", data);
    },
    onSuccess: (result) => {
      if (!result.ok) {
        toast({
          variant: "destructive",
          title: "Registration Failed",
          description: result.error,
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      }
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (profile: Partial<UserProfile>) => {
      return handleRequest("/api/user/profile", "PUT", profile);
    },
    onSuccess: (result) => {
      if (!result.ok) {
        toast({
          variant: "destructive",
          title: "Profile Update Failed",
          description: result.error,
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      }
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return handleRequest("/api/logout", "POST");
    },
    onSuccess: (result) => {
      if (!result.ok) {
        toast({
          variant: "destructive",
          title: "Logout Failed",
          description: result.error,
        });
      } else {
        // Clear all queries and explicitly set user data to null
        queryClient.clear();
        queryClient.setQueryData(['/api/user'], null);
      }
    },
  });

  return {
    user,
    isLoading,
    error,
    refetch,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    updateProfile: updateProfileMutation.mutateAsync,
  };
}