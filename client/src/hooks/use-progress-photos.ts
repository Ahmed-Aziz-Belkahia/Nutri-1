import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ProgressPhoto } from "@db/schema";

export function useProgressPhotos() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ 
    photos: ProgressPhoto[]; 
    hasUploadedToday: boolean; 
    todayPhoto: ProgressPhoto | null 
  }>({
    queryKey: ["/api/progress-photos"],
    queryFn: async () => {
      console.log('Fetching progress photos...');
      const response = await fetch("/api/progress-photos", {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Failed to fetch photos");
      }
      const result = await response.json();
      console.log('Fetched photos response:', result);
      
      // Handle both old format (array) and new format (object with photos array)
      const photosArray = Array.isArray(result) ? result : result.photos || [];
      const hasUploadedToday = result.hasUploadedToday || false;
      const todayPhoto = result.todayPhoto || null;
      
      // Ensure each photo URL is properly formatted with absolute path if needed
      const formattedPhotos = photosArray.map((photo: ProgressPhoto) => {
        const photoUrl = photo.photoUrl || '';
        const formattedUrl = photoUrl.startsWith('http') 
          ? photoUrl 
          : photoUrl.startsWith('/') 
            ? photoUrl 
            : `/${photoUrl}`;
        
        return {
          ...photo,
          photoUrl: formattedUrl
        };
      });
      
      return {
        photos: formattedPhotos,
        hasUploadedToday,
        todayPhoto
      };
    },
    // Improved caching strategy for better performance
    refetchOnWindowFocus: true,  // Refetch when window gains focus to check for new uploads
    refetchOnMount: true,         // Always refetch on mount to get latest state
    refetchInterval: false,
    staleTime: 0,                 // Set to 0 to always consider data stale for immediate updates
    gcTime: 10 * 60 * 1000       // 10 minutes - using gcTime instead of deprecated cacheTime
  });

  const photos = data?.photos || [];
  const hasUploadedToday = data?.hasUploadedToday || false;
  const todayPhoto = data?.todayPhoto || null;

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
          const errorData = await response.json();
          console.log('Upload error response:', errorData);
          
          // If we hit the daily limit, automatically use replace instead
          if (errorData.error === 'Daily limit reached' && errorData.existingPhotoId) {
            console.log('Daily limit reached, automatically replacing photo:', errorData.existingPhotoId);
            
            // Call the replace endpoint instead
            const replaceResponse = await fetch(`/api/progress-photos/${errorData.existingPhotoId}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                photo: data.photoUrl,
                type: data.type,
                caption: data.caption
              }),
              credentials: "include"
            });
            
            if (!replaceResponse.ok) {
              throw new Error(await replaceResponse.text());
            }
            
            return await replaceResponse.json();
          }
          
          throw new Error(JSON.stringify(errorData));
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
      // Invalidate and immediately refetch to get updated hasUploadedToday status
      queryClient.invalidateQueries({ queryKey: ["/api/progress-photos"] });
      queryClient.refetchQueries({ queryKey: ["/api/progress-photos"] });
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

  const replacePhoto = useMutation({
    mutationFn: async (data: { photoId: number; photoUrl: string; type?: string; caption?: string }) => {
      console.log('Replacing photo:', data.photoId);
      
      const response = await fetch(`/api/progress-photos/${data.photoId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          photo: data.photoUrl,
          type: data.type,
          caption: data.caption
        }),
        credentials: "include"
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Replace error response:', errorText);
        throw new Error(errorText);
      }

      const result = await response.json();
      console.log('Replace successful, API response:', result);
      return result;
    },
    onSuccess: () => {
      console.log('Photo replacement succeeded');
      queryClient.invalidateQueries({ queryKey: ["/api/progress-photos"] });
      queryClient.refetchQueries({ queryKey: ["/api/progress-photos"] });
    },
    onError: (error) => {
      console.error('Photo replacement failed:', error);
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
    hasUploadedToday,
    todayPhoto,
    isLoading,
    addPhoto: addPhoto.mutateAsync,
    isAddingPhoto: addPhoto.isPending,
    updatePhotoType: updatePhotoType.mutateAsync,
    deletePhoto: deletePhoto.mutateAsync,
    isDeletingPhoto: deletePhoto.isPending,
    replacePhoto: replacePhoto.mutateAsync,
    isReplacingPhoto: replacePhoto.isPending,
    uploadPhoto
  };
}