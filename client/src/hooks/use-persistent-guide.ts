import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';

const GUIDE_PROGRESS_KEY = 'nutri-guide-progress';
const GUIDE_ACTIVE_KEY = 'nutri-guide-active';

interface GuideProgress {
  currentStep: number;
  isActive: boolean;
  actionCompleted: boolean;
  lastActionTime: number;
}

export function usePersistentGuide() {
  const [location] = useLocation();
  const [guideState, setGuideState] = useState<GuideProgress>(() => {
    // Check if user has permanently skipped the guide
    const isSkipped = localStorage.getItem('nutri-guide-skipped') === 'true';
    if (isSkipped) {
      return {
        currentStep: 0,
        isActive: false,
        actionCompleted: false,
        lastActionTime: 0
      };
    }
    
    const saved = localStorage.getItem(GUIDE_PROGRESS_KEY);
    return saved ? JSON.parse(saved) : {
      currentStep: 0,
      isActive: false,
      actionCompleted: false,
      lastActionTime: 0
    };
  });

  // Save guide state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(GUIDE_PROGRESS_KEY, JSON.stringify(guideState));
  }, [guideState]);

  // Monitor for food log additions and other actions
  useEffect(() => {
    const handleGuideEvent = (event: CustomEvent) => {
      const { action, step } = event.detail;
      console.log(`Guide: Received event ${action} for step ${step}`);
      
      if (action === 'food-added' && guideState.currentStep === 1) {
        console.log('Guide: Food added, advancing to next step');
        setTimeout(() => {
          setGuideState(prev => ({
            ...prev,
            currentStep: 2,
            actionCompleted: true,
            lastActionTime: Date.now()
          }));
        }, 1500);
      }
      
      if (action === 'route-visited' && step > guideState.currentStep) {
        console.log(`Guide: Route visited, advancing to step ${step}`);
        setTimeout(() => {
          setGuideState(prev => ({
            ...prev,
            currentStep: step,
            actionCompleted: true,
            lastActionTime: Date.now()
          }));
        }, 1000);
      }
    };

    // Listen for custom guide events
    window.addEventListener('guide-action', handleGuideEvent as EventListener);

    // Also monitor console logs as fallback
    const originalConsoleLog = console.log;
    console.log = (...args) => {
      originalConsoleLog(...args);
      // Check for food log success message
      if (args[0] === '[Food Log Hook] Successfully added food:') {
        console.log('Guide: Detected food log success, current step:', guideState.currentStep);
        if (guideState.currentStep === 1) {
          console.log('Guide: Dispatching food-added event');
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('guide-action', {
              detail: { action: 'food-added', step: 2 }
            }));
          }, 500);
        }
      }
    };

    return () => {
      window.removeEventListener('guide-action', handleGuideEvent as EventListener);
      console.log = originalConsoleLog;
    };
  }, [guideState.currentStep]);

  // Auto-advance guide based on route changes
  useEffect(() => {
    if (!guideState.isActive) return;

    const routeStepMap: Record<string, number> = {
      '/dashboard': 0,
      '/add-food': 1,
      '/recipes': 2,
      '/progress-new': 3,
    };

    const expectedStep = routeStepMap[location];
    
    if (expectedStep !== undefined && expectedStep > guideState.currentStep) {
      console.log(`Guide: Route changed to ${location}, advancing to step ${expectedStep + 1}`);
      setGuideState(prev => ({
        ...prev,
        currentStep: expectedStep + 1,
        actionCompleted: true,
        lastActionTime: Date.now()
      }));
    }
  }, [location, guideState.isActive, guideState.currentStep]);

  const startGuide = useCallback(() => {
    console.log('Guide: Starting persistent guide');
    setGuideState({
      currentStep: 0,
      isActive: true,
      actionCompleted: false,
      lastActionTime: Date.now()
    });
  }, []);

  const nextStep = useCallback(() => {
    setGuideState(prev => ({
      ...prev,
      currentStep: prev.currentStep + 1,
      actionCompleted: false,
      lastActionTime: Date.now()
    }));
  }, []);

  const previousStep = useCallback(() => {
    setGuideState(prev => ({
      ...prev,
      currentStep: Math.max(0, prev.currentStep - 1),
      actionCompleted: false,
      lastActionTime: Date.now()
    }));
  }, []);

  const skipGuide = useCallback(() => {
    localStorage.setItem('nutri-guide-skipped', 'true');
    setGuideState({
      currentStep: 0,
      isActive: false,
      actionCompleted: false,
      lastActionTime: Date.now()
    });
  }, []);

  const completeGuide = useCallback(() => {
    console.log('Guide: Completing persistent guide');
    setGuideState({
      currentStep: 0,
      isActive: false,
      actionCompleted: true,
      lastActionTime: Date.now()
    });
    localStorage.setItem(GUIDE_ACTIVE_KEY, 'completed');
  }, []);

  const resetGuide = useCallback(() => {
    console.log('Guide: Resetting persistent guide');
    setGuideState({
      currentStep: 0,
      isActive: false,
      actionCompleted: false,
      lastActionTime: 0
    });
    localStorage.removeItem(GUIDE_PROGRESS_KEY);
    localStorage.removeItem(GUIDE_ACTIVE_KEY);
  }, []);

  return {
    currentStep: guideState.currentStep,
    isActive: guideState.isActive,
    actionCompleted: guideState.actionCompleted,
    startGuide,
    nextStep,
    previousStep,
    completeGuide,
    resetGuide,
    skipGuide
  };
}