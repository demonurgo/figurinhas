
import React, { createContext, useState, useContext, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

// Define types for user and auth context
interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  email?: string;
}

interface AuthContextType {
  currentUser: User | null;
  profile: Profile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<boolean>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch user profile
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }
      
      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
    }
  };

  // Create default admin user
  const createDefaultAdmin = async () => {
    try {
      // Check if admin@test.com already exists
      const { data: existingUser } = await supabase.auth.signInWithPassword({
        email: 'admin@test.com',
        password: 'admin123'
      });
      
      if (existingUser.user) {
        console.log('Default admin already exists');
        return;
      }
      
      // Create admin user
      const { data, error } = await supabase.auth.signUp({
        email: 'admin@test.com',
        password: 'admin123',
        options: {
          data: {
            name: 'Admin User'
          }
        }
      });
      
      if (error) {
        console.error('Error creating default admin:', error);
        return;
      }
      
      console.log('Default admin created successfully');
      
    } catch (error) {
      console.error('Error in createDefaultAdmin:', error);
    }
  };

  // Initialize auth state
  useEffect(() => {
    // Create default admin on initial load
    createDefaultAdmin();
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        setCurrentUser(newSession?.user ?? null);
        
        if (newSession?.user) {
          setTimeout(() => {
            fetchProfile(newSession.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setCurrentUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        fetchProfile(currentSession.user.id);
      }
      
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      console.log('Attempting login for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('Login error from Supabase:', error);
        toast({
          variant: "destructive",
          title: "Falha no login",
          description: error.message,
        });
        return false;
      }
      
      if (data.user) {
        console.log('Login successful for:', data.user.email);
        toast({
          title: "Login bem-sucedido!",
          description: `Bem-vindo de volta!`,
        });
        return true;
      }
      
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

  // Signup function
  const signup = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Add validation
      if (!email.includes('@')) {
        toast({
          variant: "destructive",
          title: "Email inválido",
          description: "Por favor, forneça um email válido.",
        });
        return false;
      }
      
      if (password.length < 6) {
        toast({
          variant: "destructive",
          title: "Senha muito curta",
          description: "A senha deve ter pelo menos 6 caracteres.",
        });
        return false;
      }
      
      console.log('Attempting signup for:', email, 'with name:', name);
      
      // Check if email already exists
      const { data: existingUsers, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .limit(1);
        
      if (checkError) {
        console.error('Error checking existing user:', checkError);
      } else if (existingUsers && existingUsers.length > 0) {
        toast({
          variant: "destructive",
          title: "Email já registrado",
          description: "Este email já está sendo usado. Tente fazer login.",
        });
        return false;
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            email
          }
        }
      });
      
      if (error) {
        console.error('Signup error from Supabase:', error);
        toast({
          variant: "destructive",
          title: "Falha no cadastro",
          description: error.message,
        });
        return false;
      }
      
      if (data.user) {
        console.log('Signup successful for:', data.user.email);
        
        toast({
          title: "Conta criada com sucesso!",
          description: `Bem-vindo, ${name}!`,
        });
        return true;
      }
      
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
  const logout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Você saiu da sua conta.",
    });
  };

  // Update profile function
  const updateProfile = async (data: Partial<Profile>): Promise<boolean> => {
    try {
      if (!currentUser) return false;
      
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', currentUser.id);
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao atualizar perfil",
          description: error.message,
        });
        return false;
      }
      
      // Update local state
      setProfile(prev => prev ? { ...prev, ...data } : null);
      
      toast({
        title: "Perfil atualizado",
        description: "Seu perfil foi atualizado com sucesso.",
      });
      return true;
    } catch (error) {
      console.error('Profile update error:', error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar perfil",
        description: "Ocorreu um erro ao tentar atualizar seu perfil.",
      });
      return false;
    }
  };

  const value = {
    currentUser,
    profile,
    isLoading,
    login,
    signup,
    logout,
    updateProfile
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
