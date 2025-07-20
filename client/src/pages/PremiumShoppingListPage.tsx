import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import PremiumShoppingList from '@/components/PremiumShoppingList';
import { Home, Search, Calendar, User, Book } from 'lucide-react';

const PremiumShoppingListPage = () => {
  const [activeTab, setActiveTab] = useState('shopping');
  
  return (
    <div className="min-h-screen bg-white relative pb-20">
      {/* Main content */}
      <div className="container max-w-md mx-auto px-4 pb-24">
        <PremiumShoppingList />
      </div>
      
      {/* Premium iOS-style navigation bar */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="fixed bottom-0 left-0 right-0 bg-white/60 backdrop-blur-xl border-t border-gray-100 shadow-lg z-10"
      >
        <div className="flex items-center justify-around max-w-md mx-auto">
          <Link href="/">
            <a className="flex flex-col items-center py-3 px-5 relative">
              <Home className="h-6 w-6 text-gray-500" />
              <span className="text-xs text-gray-500 mt-1">Home</span>
            </a>
          </Link>
          
          <Link href="/recipes">
            <a className="flex flex-col items-center py-3 px-5 relative">
              <Book className="h-6 w-6 text-gray-500" />
              <span className="text-xs text-gray-500 mt-1">Recipes</span>
            </a>
          </Link>
          
          {/* Active tab with glow effect */}
          <Link href="/premium-shopping-list">
            <a className="flex flex-col items-center py-3 px-5 relative">
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-teal-400 to-blue-400 opacity-30 blur-sm"></div>
                <div className="relative bg-gradient-to-r from-teal-400 to-blue-400 text-white p-2 rounded-full">
                  <Search className="h-5 w-5" />
                </div>
              </div>
              <span className="text-xs font-medium text-teal-600 mt-1">Shopping</span>
              
              {/* Active indicator line */}
              <motion.div 
                layoutId="activeTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-400 to-blue-400"
              />
            </a>
          </Link>
          
          <Link href="/calendar">
            <a className="flex flex-col items-center py-3 px-5 relative">
              <Calendar className="h-6 w-6 text-gray-500" />
              <span className="text-xs text-gray-500 mt-1">Calendar</span>
            </a>
          </Link>
          
          <Link href="/profile">
            <a className="flex flex-col items-center py-3 px-5 relative">
              <User className="h-6 w-6 text-gray-500" />
              <span className="text-xs text-gray-500 mt-1">Profile</span>
            </a>
          </Link>
        </div>
      </motion.div>
      
      {/* Neomorphic Floating Action Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.7, type: "spring", stiffness: 300 }}
        whileHover={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
        whileTap={{ scale: 0.95 }}
        className="fixed right-6 bottom-24 w-14 h-14 rounded-full shadow-[6px_6px_10px_rgba(0,0,0,0.1),-6px_-6px_10px_rgba(255,255,255,0.8)] bg-gradient-to-br from-teal-400 to-blue-400 flex items-center justify-center z-20"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 5V19M5 12H19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </motion.button>
    </div>
  );
};

export default PremiumShoppingListPage;