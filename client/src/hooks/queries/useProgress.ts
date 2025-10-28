// Progress Tracking Query Hooks
// Reusable hooks for progress data fetching and mutations

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { queryKeys, queryPresets, createInvalidator } from '@/lib/queryUtils';
import { useToast } from '@/hooks/use-toast';

// Types
interface ProgressPhoto {
  id: number;
  imageUrl: string;
  date: string;
  weight?: number;
  notes?: string;
  createdAt: string;
}

interface WeightLog {
  id: number;
  weight: number;
  date: string;
  notes?: string;
  createdAt: string;
}

interface Measurement {
  id: number;
  date: string;
  chest?: number;
  waist?: number;
  hips?: number;
  arms?: number;
  thighs?: number;
  notes?: string;
  createdAt: string;
}

interface BodyFatLog {
  id: number;
  date: string;
  bodyFatPercentage: number;
  method?: string;
  notes?: string;
  createdAt: string;
}

// Query Hooks

// Get all progress photos
export function useProgressPhotos(): UseQueryResult<ProgressPhoto[]> {
  return useQuery({
    queryKey: queryKeys.progress.photos(),
    queryFn: async () => {
      const response = await fetch('/api/progress/photos', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch progress photos');
      return response.json();
    },
    ...queryPresets.moderate,
  });
}

// Get a specific progress photo by ID
export function useProgressPhotoById(id: number | undefined): UseQueryResult<ProgressPhoto> {
  return useQuery({
    queryKey: queryKeys.progress.photoById(id!),
    queryFn: async () => {
      if (!id) throw new Error('Photo ID is required');
      
      const response = await fetch(`/api/progress/photos/${id}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch progress photo');
      return response.json();
    },
    enabled: !!id,
    ...queryPresets.moderate,
  });
}

// Get all weight logs
export function useWeightLogs(): UseQueryResult<WeightLog[]> {
  return useQuery({
    queryKey: queryKeys.progress.weights(),
    queryFn: async () => {
      const response = await fetch('/api/progress/weights', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch weight logs');
      return response.json();
    },
    ...queryPresets.moderate,
  });
}

// Get all body measurements
export function useMeasurements(): UseQueryResult<Measurement[]> {
  return useQuery({
    queryKey: queryKeys.progress.measurements(),
    queryFn: async () => {
      const response = await fetch('/api/progress/measurements', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch measurements');
      return response.json();
    },
    ...queryPresets.moderate,
  });
}

// Get all body fat logs
export function useBodyFatLogs(): UseQueryResult<BodyFatLog[]> {
  return useQuery({
    queryKey: queryKeys.progress.bodyFat(),
    queryFn: async () => {
      const response = await fetch('/api/progress/body-fat', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch body fat logs');
      return response.json();
    },
    ...queryPresets.moderate,
  });
}

// Mutation Hooks

// Upload a progress photo
export function useUploadProgressPhoto(): UseMutationResult<ProgressPhoto, Error, FormData> {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (formData) => {
      const response = await fetch('/api/progress/photos', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to upload progress photo');
      return response.json();
    },
    onSuccess: () => {
      const invalidator = createInvalidator(queryClient);
      invalidator.progress('photos');
      toast({
        title: "Success",
        description: "Progress photo uploaded",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload progress photo",
        variant: "destructive",
      });
    },
  });
}

// Delete a progress photo
export function useDeleteProgressPhoto(): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (photoId) => {
      const response = await fetch(`/api/progress/photos/${photoId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete progress photo');
    },
    onSuccess: () => {
      const invalidator = createInvalidator(queryClient);
      invalidator.progress('photos');
      toast({
        title: "Success",
        description: "Progress photo deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete progress photo",
        variant: "destructive",
      });
    },
  });
}

// Add a weight log
export function useAddWeightLog(): UseMutationResult<WeightLog, Error, Omit<WeightLog, 'id' | 'createdAt'>> {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (weightData) => {
      const response = await fetch('/api/progress/weights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(weightData),
      });
      if (!response.ok) throw new Error('Failed to add weight log');
      return response.json();
    },
    onMutate: async (newWeight) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.progress.weights() });
      const previous = queryClient.getQueryData(queryKeys.progress.weights());
      
      queryClient.setQueryData(queryKeys.progress.weights(), (old: any) => {
        if (!old) return [{ ...newWeight, id: Date.now(), createdAt: new Date().toISOString() }];
        return [...old, { ...newWeight, id: Date.now(), createdAt: new Date().toISOString() }];
      });
      
      return { previous };
    },
    onError: (err, newWeight, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.progress.weights(), context.previous);
      }
      toast({
        title: "Error",
        description: "Failed to add weight log",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      const invalidator = createInvalidator(queryClient);
      invalidator.progress('weights');
      toast({
        title: "Success",
        description: "Weight log added",
      });
    },
  });
}

// Update a weight log
export function useUpdateWeightLog(): UseMutationResult<WeightLog, Error, { id: number; data: Partial<WeightLog> }> {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await fetch(`/api/progress/weights/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update weight log');
      return response.json();
    },
    onSuccess: () => {
      const invalidator = createInvalidator(queryClient);
      invalidator.progress('weights');
      toast({
        title: "Success",
        description: "Weight log updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update weight log",
        variant: "destructive",
      });
    },
  });
}

// Delete a weight log
export function useDeleteWeightLog(): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (weightId) => {
      const response = await fetch(`/api/progress/weights/${weightId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete weight log');
    },
    onSuccess: () => {
      const invalidator = createInvalidator(queryClient);
      invalidator.progress('weights');
      toast({
        title: "Success",
        description: "Weight log deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete weight log",
        variant: "destructive",
      });
    },
  });
}

// Add a measurement
export function useAddMeasurement(): UseMutationResult<Measurement, Error, Omit<Measurement, 'id' | 'createdAt'>> {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (measurementData) => {
      const response = await fetch('/api/progress/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(measurementData),
      });
      if (!response.ok) throw new Error('Failed to add measurement');
      return response.json();
    },
    onSuccess: () => {
      const invalidator = createInvalidator(queryClient);
      invalidator.progress('measurements');
      toast({
        title: "Success",
        description: "Measurement added",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add measurement",
        variant: "destructive",
      });
    },
  });
}

// Update a measurement
export function useUpdateMeasurement(): UseMutationResult<Measurement, Error, { id: number; data: Partial<Measurement> }> {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await fetch(`/api/progress/measurements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update measurement');
      return response.json();
    },
    onSuccess: () => {
      const invalidator = createInvalidator(queryClient);
      invalidator.progress('measurements');
      toast({
        title: "Success",
        description: "Measurement updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update measurement",
        variant: "destructive",
      });
    },
  });
}

// Delete a measurement
export function useDeleteMeasurement(): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (measurementId) => {
      const response = await fetch(`/api/progress/measurements/${measurementId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete measurement');
    },
    onSuccess: () => {
      const invalidator = createInvalidator(queryClient);
      invalidator.progress('measurements');
      toast({
        title: "Success",
        description: "Measurement deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete measurement",
        variant: "destructive",
      });
    },
  });
}

// Add a body fat log
export function useAddBodyFatLog(): UseMutationResult<BodyFatLog, Error, Omit<BodyFatLog, 'id' | 'createdAt'>> {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (bodyFatData) => {
      const response = await fetch('/api/progress/body-fat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(bodyFatData),
      });
      if (!response.ok) throw new Error('Failed to add body fat log');
      return response.json();
    },
    onSuccess: () => {
      const invalidator = createInvalidator(queryClient);
      invalidator.progress('bodyFat');
      toast({
        title: "Success",
        description: "Body fat log added",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add body fat log",
        variant: "destructive",
      });
    },
  });
}

// Delete a body fat log
export function useDeleteBodyFatLog(): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (bodyFatId) => {
      const response = await fetch(`/api/progress/body-fat/${bodyFatId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete body fat log');
    },
    onSuccess: () => {
      const invalidator = createInvalidator(queryClient);
      invalidator.progress('bodyFat');
      toast({
        title: "Success",
        description: "Body fat log deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete body fat log",
        variant: "destructive",
      });
    },
  });
}
