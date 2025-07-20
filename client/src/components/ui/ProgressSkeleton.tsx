import { motion } from 'framer-motion';
import { Skeleton } from './skeleton';

export function ProgressSkeleton() {
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
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="p-4 space-y-6">
          {/* Progress Section Selector */}
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div>
                <Skeleton className="h-5 w-32 mb-1" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
            
            {/* Weight Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 rounded-xl bg-gray-50">
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-6 w-20" />
              </div>
              <div className="p-4 rounded-xl bg-gray-50">
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
            
            {/* Progress Chart */}
            <Skeleton className="h-40 w-full rounded-xl" />
            
            {/* Progress Photos */}
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="aspect-square w-full rounded-lg" />
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