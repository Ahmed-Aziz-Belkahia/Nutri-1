import { motion } from 'framer-motion';
import { Skeleton } from './skeleton';

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f9f9f9] to-[#f0f4ff]">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-screen-lg mx-auto pb-20 pt-safe-or-6"
      >
        {/* Header Skeleton */}
        <div className="px-4 py-5 border-b">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="p-4 space-y-4">
          {/* Nutrition Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>

          {/* Today's meals */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-6 w-20" />
            </div>
            
            <div className="flex overflow-x-auto pb-2 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex-none w-64">
                  <Skeleton className="h-40 w-full rounded-xl" />
                  <div className="mt-2 space-y-1">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-40" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Food Logs */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-6 w-20" />
            </div>
            
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white p-3 rounded-xl border shadow-sm">
                  <div className="flex justify-between">
                    <div className="space-y-1">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-12 w-12 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Nav Skeleton */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t py-2">
          <div className="flex justify-around items-center">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-8 w-8 rounded" />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}