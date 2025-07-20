import React from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type AdminProtectedRouteProps = {
  children: React.ReactNode;
};

export function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Check if user is logged in and has admin privileges
  if (!user || !(user.isAdmin || user.is_admin)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg">
          <div className="flex items-center justify-center mb-6">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-center mb-4">Access Denied</h1>
          <p className="text-gray-600 text-center mb-6">
            You don't have permission to access the admin dashboard. This area is restricted to administrators only.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              className="w-full"
              onClick={() => setLocation("/")}
            >
              Return to Home
            </Button>
            {!user && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setLocation("/auth")}
              >
                Login
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // User is admin, render the protected content
  return <>{children}</>;
}