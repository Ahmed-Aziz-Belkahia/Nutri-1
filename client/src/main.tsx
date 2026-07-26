import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import App from './App';
import "./index.css";
// Import i18n configuration
import "./i18n/config";
import { installNativeApiInterceptor, loadStoredTokens } from "./lib/nativeApi";
import { initNativeShell } from "./lib/nativeShell";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

const app = (
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster />
    </QueryClientProvider>
  </StrictMode>
);

// On native, the fetch interceptor must be installed and the persisted bearer
// token restored before the first request fires — otherwise the initial auth
// check goes out unauthenticated and bounces the user to the login screen.
// No-ops on the web.
installNativeApiInterceptor();
loadStoredTokens().finally(() => {
  createRoot(root).render(app);
  // After first render, so the splash hides over real content.
  initNativeShell();
});
