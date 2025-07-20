import { useQuery } from "@tanstack/react-query";
import type { UserProfile } from "../types/User";

export function useUserProfile() {
  return useQuery<UserProfile>({
    queryKey: ['/api/user/profile'],
    queryFn: async () => {
      const response = await fetch('/api/user/profile');
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      return response.json();
    }
  });
}
