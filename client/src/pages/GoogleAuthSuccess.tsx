import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Loader2, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import axios from "axios";

/**
 * GoogleAuthSuccess
 *
 * This page is where the system browser lands after the Google OAuth callback
 * sets the JWT cookies. It detects the session, loads the user, and redirects
 * to the correct page in the app.
 */
export default function GoogleAuthSuccess() {
  const [, setLocation] = useLocation();
  const { isLoading } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Signing you in with Google...");

  useEffect(() => {
    const finishAuth = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlAccessToken = params.get("accessToken");
        const urlRefreshToken = params.get("refreshToken");

        if (urlAccessToken && urlRefreshToken) {
          console.log("[GoogleAuthSuccess] Found tokens in URL, performing handoff...");
          await axios.post("/api/auth/google/handoff", {
            accessToken: urlAccessToken,
            refreshToken: urlRefreshToken
          });
          console.log("[GoogleAuthSuccess] Handoff successful");
        }

        // Refresh token to ensure the session is valid
        await axios.post("/api/auth/refresh", {}, { withCredentials: true });

        // Fetch user data
        const { data: user } = await axios.get("/api/auth/me", {
          withCredentials: true,
        });

        if (user) {
          // Store session flag (same as jwt login flow in use-auth.tsx)
          localStorage.setItem("nutriai_session_active", "true");
          localStorage.setItem("nutriai_user_id", String(user.id));

          setStatus("success");
          setMessage("Signed in successfully!");

          setTimeout(() => {
            if (user.has_completed_onboarding || user.hasCompletedOnboarding) {
              setLocation("/dashboard");
            } else {
              setLocation("/onboarding");
            }
          }, 1000);
        } else {
          throw new Error("No user data returned");
        }
      } catch (error) {
        console.error("[GoogleAuthSuccess] Failed to restore session:", error);
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
        setTimeout(() => setLocation("/auth?error=google_session_failed"), 2000);
      }
    };

    finishAuth();
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="text-center"
      >
        {/* Logo / icon */}
        <div className="w-20 h-20 bg-gradient-to-br from-[#0CC5BA] to-[#26A8FF] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          {status === "success" ? (
            <CheckCircle className="w-10 h-10 text-white" />
          ) : (
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          )}
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {status === "error" ? "Authentication Failed" : "Almost there..."}
        </h2>
        <p className="text-gray-500 text-sm">{message}</p>

        {status === "loading" && (
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Setting up your account</span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
