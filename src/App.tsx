
import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";

// Lazy load components for better performance
const Login = lazy(() => import("./pages/Login"));
const SignUp = lazy(() => import("./pages/SignUp"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const StickerDetail = lazy(() => import("./pages/StickerDetail"));
const Profile = lazy(() => import("./pages/Profile"));
const Connections = lazy(() => import("./pages/Connections"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const ConnectionStickerDetail = lazy(() => import("./pages/ConnectionStickerDetail"));
const FriendRequests = lazy(() => import("./pages/FriendRequests"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Optimized QueryClient configuration with data persistence
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (replacing deprecated cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <PWAInstallPrompt />
        <BrowserRouter>
          <Suspense fallback={
            <div className="flex items-center justify-center h-screen">
              <div className="w-16 h-16 border-4 border-sticker-purple border-solid rounded-full border-t-transparent animate-spin"></div>
            </div>
          }>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/sticker/:id" element={<ProtectedRoute><StickerDetail /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/connections" element={<ProtectedRoute><Connections /></ProtectedRoute>} />
              <Route path="/friend-requests" element={<ProtectedRoute><FriendRequests /></ProtectedRoute>} />
              <Route path="/user/:id" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
              <Route path="/user/:userId/sticker/:stickerId" element={<ProtectedRoute><ConnectionStickerDetail /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
