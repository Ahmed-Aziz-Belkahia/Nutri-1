import { useState } from 'react';

interface GroceryItem {
  id: number;
  name: string;
  quantity: string | number;
  unit: string;
  category?: string;
  isPurchased?: boolean;
  purchased?: boolean;
}

interface GroceryListProps {
  groceryList: GroceryItem[];
  mealPlan: any | null;
  onToggleItem: (itemId: number, currentStatus: boolean) => void;
}

export default function GroceryList({ groceryList, mealPlan, onToggleItem }: GroceryListProps) {
  const [displayCount, setDisplayCount] = useState(5);

  return (
    <div>
      <div>
        {Array.isArray(groceryList) && groceryList.length > 0 ? (
          <>
            {groceryList.slice(0, displayCount).map((item, index) => {
              const isPurchased = item.isPurchased ?? item.purchased ?? false;
              const isNewlyRevealed = index >= displayCount - 5 && index >= 5;
              return (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                  style={{
                    animation: isNewlyRevealed ? 'slideInFromBottom 0.3s ease-out' : 'none',
                    animationFillMode: 'backwards',
                    animationDelay: `${(index % 5) * 0.05}s`
                  }}
                >
                  <div className="flex-1">
                    <h3 className={`text-base font-medium transition-all ${
                      isPurchased 
                        ? 'text-gray-400 line-through' 
                        : 'text-gray-900'
                    }`}>
                      {item.name}
                    </h3>
                    <p className={`text-xs transition-all ${
                      isPurchased 
                        ? 'text-gray-300 line-through' 
                        : 'text-gray-500'
                    }`}>
                      {item.quantity} {item.unit}{item.category && ` • ${item.category}`}
                    </p>
                  </div>
                  <button 
                    onClick={() => onToggleItem(item.id, isPurchased)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      isPurchased 
                        ? 'bg-[#26A8FF] border-[#26A8FF]' 
                        : 'border-gray-300 bg-white hover:border-[#26A8FF]'
                    }`}
                    aria-label={isPurchased ? 'Mark as not purchased' : 'Mark as purchased'}
                  >
                    {isPurchased && (
                      <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
              );
            })}
            {groceryList.length > displayCount && (
              <button
                onClick={() => setDisplayCount(prev => prev + 5)}
                className="w-full mt-3 py-2 text-sm font-medium text-[#26A8FF] hover:text-[#1A8FE6] transition-colors"
              >
                View more ({groceryList.length - displayCount} remaining)
              </button>
            )}
          </>
        ) : (
          <div className="text-sm text-gray-500 py-4 text-center">
            {mealPlan ? "Generating grocery list..." : "No items in your grocery list"}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInFromBottom {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
