import React from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import CircularButtonWhite from '@/components/CircularButtonWhite';

export default function CircularButtonDemo() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Header */}
      <div className="p-4 flex items-center">
        <button
          onClick={() => setLocation('/dashboard')}
          className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/40"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="ml-4 text-xl font-semibold">Button Demo</h1>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="max-w-md mx-auto space-y-12">
          {/* Explanation */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
            <h2 className="text-lg font-medium mb-4">Simple White Circular Button</h2>
            <p className="text-gray-300 mb-4">
              This is a demonstration of the simple white circular button without any colored border.
            </p>
          </div>

          {/* Button Showcase */}
          <div className="flex flex-col items-center justify-center space-y-8">
            {/* Small Button */}
            <div className="text-center">
              <CircularButtonWhite 
                size="sm" 
                onClick={() => alert('Small button clicked!')} 
              />
              <p className="mt-3 text-sm text-gray-400">Small Size</p>
            </div>

            {/* Medium Button */}
            <div className="text-center">
              <CircularButtonWhite 
                size="md" 
                onClick={() => alert('Medium button clicked!')} 
              />
              <p className="mt-3 text-sm text-gray-400">Medium Size (Default)</p>
            </div>

            {/* Large Button */}
            <div className="text-center">
              <CircularButtonWhite 
                size="lg" 
                onClick={() => alert('Large button clicked!')} 
              />
              <p className="mt-3 text-sm text-gray-400">Large Size</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}