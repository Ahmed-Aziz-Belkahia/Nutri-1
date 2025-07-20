import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ProgressPhoto } from "@db/schema";

export function useProgressPhotos() {
  const queryClient = useQueryClient();

  const { data: photos = [], isLoading } = useQuery<ProgressPhoto[]>({
    queryKey: ["/api/progress-photos"],
    queryFn: async () => {
      console.log('Fetching progress photos...');
      const response = await fetch("/api/progress-photos", {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Failed to fetch photos");
      }
      const data = await response.json();
      console.log('Fetched photos:', data);
      
      // Ensure each photo URL is properly formatted with absolute path if needed
      return data.map((photo: ProgressPhoto) => {
        // Ensure the URL is absolute and properly formed
        const photoUrl = photo.photoUrl || '';
        const formattedUrl = photoUrl.startsWith('http') 
          ? photoUrl 
          : photoUrl.startsWith('/') 
            ? photoUrl 
            : `/${photoUrl}`;
        
        console.log('Processing photo URL:', {
          original: photo.photoUrl,
          formatted: formattedUrl
        });
        
        return {
          ...photo,
          photoUrl: formattedUrl
        };
      });
    },
    // Improved caching strategy for better performance
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes - using gcTime instead of deprecated cacheTime
  });

  const addPhoto = useMutation({
    mutationFn: async (data: { photoUrl: string; type?: 'latest' | 'favorite' | 'first' | 'progress-now'; caption?: string }) => {
      console.log('Processing photo for upload...', {
        hasPhotoUrl: !!data.photoUrl,
        photoUrlLength: data.photoUrl ? data.photoUrl.length : 0,
        type: data.type || 'latest'
      });

      try {
        console.log('Starting photo upload to API');
        const response = await fetch("/api/progress-photos", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            photo: data.photoUrl,
            type: data.type || 'latest',
            caption: data.caption
          }),
          credentials: "include"
        });

        console.log('API response status:', response.status, response.statusText);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Upload error response:', errorText);
          throw new Error(errorText);
        }

        const result = await response.json();
        console.log('Upload successful, API response:', result);
        
        // Force a refresh to ensure we have the latest data
        queryClient.invalidateQueries({ queryKey: ["/api/progress-photos"] });
        
        return result;
      } catch (error) {
        console.error('Upload failed, detailed error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('Mutation succeeded, data:', data);
      console.log('Invalidating photos query cache...');
      queryClient.invalidateQueries({ queryKey: ["/api/progress-photos"] });
    },
    onError: (error) => {
      console.error('Mutation error handler:', error);
    }
  });

  const updatePhotoType = useMutation({
    mutationFn: async (data: { photoUrl: string; type: 'latest' | 'favorite' | 'first' | 'progress-now' }) => {
      const response = await fetch("/api/progress-photos/type", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/progress-photos"] });
    },
  });

  const deletePhoto = useMutation({
    mutationFn: async (photoUrl: string) => {
      console.log('Deleting photo:', photoUrl);
      
      const response = await fetch("/api/progress-photos", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ photoUrl }),
        credentials: "include"
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Delete error response:', errorText);
        throw new Error(errorText);
      }

      const result = await response.json();
      console.log('Delete successful, API response:', result);
      return result;
    },
    onSuccess: () => {
      console.log('Photo deletion succeeded');
      queryClient.invalidateQueries({ queryKey: ["/api/progress-photos"] });
    },
    onError: (error) => {
      console.error('Photo deletion failed:', error);
    }
  });

  const uploadPhoto = async (photoDataUrl: string, type?: 'latest' | 'favorite' | 'first' | 'progress-now', caption?: string) => {
    console.log('uploadPhoto called with:', { 
      hasData: !!photoDataUrl, 
      dataLength: photoDataUrl.length,
      isBase64: photoDataUrl.startsWith('data:image/'),
      type, 
      caption 
    });
    return addPhoto.mutateAsync({ photoUrl: photoDataUrl, type, caption });
  };

  return {
    photos,
    isLoading,
    addPhoto: addPhoto.mutateAsync,
    isAddingPhoto: addPhoto.isPending,
    updatePhotoType: updatePhotoType.mutateAsync,
    deletePhoto: deletePhoto.mutateAsync,
    isDeletingPhoto: deletePhoto.isPending,
    uploadPhoto
  };
}