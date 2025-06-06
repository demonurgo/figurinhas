
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

// Configuração otimizada do React Query para cache local-first
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache por 30 minutos por padrão
      staleTime: 1000 * 60 * 30,
      // Manter dados em cache por 1 hora
      gcTime: 1000 * 60 * 60,
      // Revalidar dados quando voltar online
      refetchOnWindowFocus: true,
      // Revalidar dados quando reconectar
      refetchOnReconnect: true,
      // Retry automático em caso de erro
      retry: (failureCount, error: any) => {
        // Se offline, não tentar novamente
        if (!navigator.onLine) return false;
        // Máximo 3 tentativas
        return failureCount < 3;
      },
      // Rede lenta - timeout em 10s
      networkMode: 'offlineFirst' as const
    },
    mutations: {
      // Retry mutações apenas se não for erro de validação
      retry: (failureCount, error: any) => {
        if (!navigator.onLine) return false;
        // Não retry em erros 4xx (validação)
        if (error?.status >= 400 && error?.status < 500) return false;
        return failureCount < 2;
      },
      networkMode: 'offlineFirst' as const
    }
  }
});

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
