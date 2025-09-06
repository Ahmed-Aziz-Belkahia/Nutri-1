import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

export interface BodyAnalysis {
  bodyFatPercentage: number;
  bodyType: string;
  muscleMass?: string;
  bodyCompositionNotes?: string;
  improvementSuggestions?: string[];
  confidence: number;
  sources?: {
    title: string;
    organization: string;
    url: string;
    description: string;
  }[];
  calculationMethods?: {
    method: string;
    formula: string;
    source: string;
  }[];
}

export function useBodyAnalysis() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BodyAnalysis | null>(null);
  const queryClient = useQueryClient();

  const bodyAnalysisMutation = useMutation({
    mutationFn: async ({
      imageBase64,
      weight,
      height,
      gender = 'male',
      age = 30
    }: {
      imageBase64: string;
      weight: number;
      height: number;
      gender?: 'male' | 'female';
      age?: number;
    }) => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('Starting body analysis API call with parameters:', {
          imageBase64Length: imageBase64?.length || 0,
          hasValidImagePrefix: imageBase64?.startsWith('data:image/') || false,
          weight,
          height,
          gender,
          age
        });
        
        const response = await axios.post<BodyAnalysis>('/api/analyze-body', {
          imageBase64,
          weight,
          height,
          gender,
          age
        });
        
        console.log('Body analysis API call successful, received result:', {
          bodyFatPercentage: response.data.bodyFatPercentage,
          bodyType: response.data.bodyType,
          confidence: response.data.confidence
        });
        
        setResult(response.data);
        return response.data;
      } catch (err) {
        const errorMessage = err instanceof Error ? 
          err.message : 
          'Failed to analyze body composition';
        
        console.error('Body analysis API call failed:', err);
        if (axios.isAxiosError(err)) {
          console.error('Axios error details:', {
            status: err.response?.status,
            statusText: err.response?.statusText,
            data: err.response?.data,
            message: err.message
          });
        }
        
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (params: { bodyFatPercentage: number; bodyType?: string }) => {
      try {
        const response = await axios.put('/api/user/profile', {
          bodyFatPercentage: params.bodyFatPercentage,
          bodyType: params.bodyType
        });
        return response.data;
      } catch (err) {
        const errorMessage = err instanceof Error ? 
          err.message : 
          'Failed to update profile with body composition data';
        throw new Error(errorMessage);
      }
    },
    onSuccess: () => {
      // Invalidate user profile queries to reflect the updated body composition data
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
    }
  });

  const analyzeBody = async (
    imageBase64: string,
    weight: number,
    height: number,
    gender: 'male' | 'female' = 'male',
    age: number = 30
  ): Promise<BodyAnalysis> => {
    return bodyAnalysisMutation.mutateAsync({
      imageBase64,
      weight,
      height,
      gender,
      age
    });
  };

  const updateProfileWithBodyFat = async (bodyFatPercentage: number, bodyType?: string) => {
    return updateProfileMutation.mutateAsync({ bodyFatPercentage, bodyType });
  };

  return {
    analyzeBody,
    updateProfileWithBodyFat,
    isLoading: bodyAnalysisMutation.isPending || updateProfileMutation.isPending || isLoading,
    isAnalyzing: bodyAnalysisMutation.isPending,
    isUpdating: updateProfileMutation.isPending,
    error: error || 
      (bodyAnalysisMutation.error as Error)?.message || 
      (updateProfileMutation.error as Error)?.message,
    result
  };
}