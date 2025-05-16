
import React, { createContext, useState, useContext, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';

// Define types for user and auth context
interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    const storedUser = localStorage.getItem('stickerUser');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse user from localStorage', error);
        localStorage.removeItem('stickerUser');
      }
    }
    setIsLoading(false);
  }, []);

  // Mock login function (would be replaced with real backend integration)
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, validate credentials with a backend
      // For this demo, we'll accept any email ending with @test.com and password with length > 5
      if (email.endsWith('@test.com') && password.length > 5) {
        const user = {
          id: 'user-' + Math.random().toString(36).substr(2, 9),
          name: email.split('@')[0],
          email
        };
        
        setCurrentUser(user);
        localStorage.setItem('stickerUser', JSON.stringify(user));
        toast({
          title: "Login bem-sucedido!",
          description: `Bem-vindo, ${user.name}!`,
        });
        return true;
      }
      
      toast({
        variant: "destructive",
        title: "Falha no login",
        description: "Email ou senha inválidos.",
      });
      return false;
    } catch (error) {
      console.error('Login error:', error);
      toast({
        variant: "destructive",
        title: "Erro no login",
        description: "Ocorreu um erro ao tentar fazer login. Tente novamente.",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Mock signup function
  const signup = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, create user in backend
      // For this demo, we'll accept any email ending with @test.com and password with length > 5
      if (email.endsWith('@test.com') && password.length > 5) {
        const user = {
          id: 'user-' + Math.random().toString(36).substr(2, 9),
          name,
          email
        };
        
        setCurrentUser(user);
        localStorage.setItem('stickerUser', JSON.stringify(user));
        toast({
          title: "Conta criada com sucesso!",
          description: `Bem-vindo, ${name}!`,
        });
        return true;
      }
      
      toast({
        variant: "destructive",
        title: "Falha no cadastro",
        description: "Email deve terminar com @test.com e senha deve ter mais de 5 caracteres.",
      });
      return false;
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        variant: "destructive",
        title: "Erro no cadastro",
        description: "Ocorreu um erro ao tentar criar sua conta. Tente novamente.",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('stickerUser');
    toast({
      title: "Logout realizado",
      description: "Você saiu da sua conta.",
    });
  };

  const value = {
    currentUser,
    isLoading,
    login,
    signup,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Create custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
