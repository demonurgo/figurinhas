
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import StickerDetail from "./pages/StickerDetail";
import Profile from "./pages/Profile";
import Connections from "./pages/Connections";
import UserProfile from "./pages/UserProfile";
import ConnectionStickerDetail from "./pages/ConnectionStickerDetail";
import FriendRequests from "./pages/FriendRequests";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <PWAInstallPrompt />
        <BrowserRouter>
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
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
