import { ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function AboutPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 bg-white/80 backdrop-blur-lg border-b border-zinc-100/80 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center">
            <button onClick={() => setLocation("/settings")} className="-ml-2 p-2">
              <ChevronLeft className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-medium ml-2">About</h1>
          </div>
        </div>
      </header>

      <div className="px-4 py-6">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-[#10c4bc] rounded-2xl flex items-center justify-center mb-4">
            <span className="text-3xl text-white">🥗</span>
          </div>
          <h2 className="text-xl font-semibold">Nutri AI</h2>
          <p className="text-sm text-gray-500 mt-1">Version 1.0.0</p>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-900">About Nutri AI</h3>
            <p className="mt-2 text-sm text-gray-500">
              Nutri AI is an advanced nutrition tracking platform that helps you maintain a healthy lifestyle through AI-powered meal tracking and personalized recommendations.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900">Features</h3>
            <ul className="mt-2 text-sm text-gray-500 space-y-2">
              <li>• AI-powered food recognition</li>
              <li>• Personalized nutrition tracking</li>
              <li>• Progress monitoring</li>
              <li>• Smart recommendations</li>
              <li>• Comprehensive meal database</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900">Credits</h3>
            <p className="mt-2 text-sm text-gray-500">
              Created with ❤️ by the Nutri AI team
            </p>
          </div>

          <div className="pt-4">
            <div className="text-xs text-center text-gray-400">
              © 2025 Nutri AI. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
