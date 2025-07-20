import { motion } from 'framer-motion';
import { Skeleton } from './skeleton';

export function AppSkeleton() {
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
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 bg-white rounded-xl shadow-sm">
                <Skeleton className="h-4 w-12 mb-2" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>

          {/* Progress Card */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <Skeleton className="h-6 w-36 mb-4" />
            <Skeleton className="h-3 w-full rounded-full mb-2" />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-4 w-10" />
            </div>
          </div>

          {/* Meal Cards */}
          <div className="space-y-2">
            <Skeleton className="h-6 w-32 mb-2" />
            <div className="flex overflow-x-auto pb-2 gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex-none w-60 bg-white rounded-xl shadow-sm overflow-hidden">
                  <Skeleton className="h-32 w-full" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-3 w-24" />
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

export function RecipesSkeleton() {
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
            <div className="flex gap-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 py-3">
          <div className="flex gap-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>

        {/* Recipe Grid */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <Skeleton className="h-24 w-full" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <div className="flex gap-1.5">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
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