import { useLocation, Link } from "wouter";
import React from 'react';
import { IoHomeOutline, IoHome, IoReaderOutline, IoReader, IoStatsChartOutline, IoStatsChart } from "react-icons/io5";

// Minimalistic tab bar with integrated Add button
export default function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-200" style={{ position: 'fixed' }}>
      {/* Minimalistic tab bar */}
      <div className="max-w-lg mx-auto px-4 py-3">
        <div className="flex justify-around items-center">
          {/* Home Tab */}
          <Link href="/dashboard" className="block" data-tutorial="home-nav">
            <div className="flex flex-col items-center p-2">
              {location === "/dashboard" 
                ? <IoHome className="w-7 h-7 text-[#00BCD6]" /> 
                : <IoHomeOutline className="w-7 h-7 text-gray-400" />
              }
            </div>
          </Link>

          {/* Recipes Tab */}
          <Link href="/recipes" className="block" data-tutorial="recipes-nav">
            <div className="flex flex-col items-center p-2">
              {location === "/recipes" 
                ? <IoReader className="w-7 h-7 text-[#00BCD6]" /> 
                : <IoReaderOutline className="w-7 h-7 text-gray-400" />
              }
            </div>
          </Link>

          {/* Progress Tab */}
          <Link href="/progress" className="block" data-tutorial="progress-nav">
            <div className="flex flex-col items-center p-2">
              {(location === "/progress" || location === "/progress-new")
                ? <IoStatsChart className="w-7 h-7 text-[#00BCD6]" /> 
                : <IoStatsChartOutline className="w-7 h-7 text-gray-400" />
              }
            </div>
          </Link>
          
          {/* Add Button - Simple clean + button */}
          <Link href="/add-food" className="block" data-testid="add-food-button" data-tutorial="add-food-button">
            <div className="flex flex-col items-center p-2">
              <div className="w-12 h-12 rounded-full bg-[#00BCD6] flex items-center justify-center shadow-lg">
                <span className="text-xl text-white font-bold">+</span>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Safe area padding for mobile devices */}
      <div className="h-safe-bottom pb-safe-bottom" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
    </nav>
  );
}