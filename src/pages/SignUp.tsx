import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { AlertCircle, Mail, Lock, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SignUp = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Validação
    if (!name || !email || !password || !confirmPassword) {
      setError("Por favor, preencha todos os campos.");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("As senhas não conferem");
      return;
    }
    
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    
    setIsSubmitting(true);
    
    console.log("Tentando cadastrar:", email);
    const success = await signup(name, email, password);
    
    if (success) {
      navigate('/');
    }
    
    setIsSubmitting(false);
  };

  // Gerar elementos flutuantes
  const [floatingElements, setFloatingElements] = useState<Array<{id: number, top: string, left: string, size: string, delay: string, duration: string, type: string}>>([]);

  useEffect(() => {
    const elements = [];
    const types = ['circle', 'square', 'triangle', 'star'];
    
    // Gerar 15 elementos flutuantes com posições e tamanhos aleatórios
    for (let i = 0; i < 15; i++) {
      elements.push({
        id: i,
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        size: `${Math.random() * 3 + 1}rem`,
        delay: `${Math.random() * 5}s`,
        duration: `${Math.random() * 10 + 15}s`,
        type: types[Math.floor(Math.random() * types.length)]
      });
    }
    
    setFloatingElements(elements);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-white to-sticker-purple-light overflow-hidden relative">
      {/* Elementos decorativos flutuantes */}
      {floatingElements.map((el) => (
        <div
          key={el.id}
          className={`absolute opacity-20 animate-float pointer-events-none ${
            el.type === 'circle' ? 'rounded-full bg-sticker-purple' :
            el.type === 'square' ? 'rounded-md bg-sticker-purple-dark' :
            el.type === 'triangle' ? 'triangle bg-sticker-purple-light' :
            'star bg-yellow-400'
          }`}
          style={{
            top: el.top,
            left: el.left,
            width: el.size,
            height: el.size,
            animationDelay: el.delay,
            animationDuration: el.duration,
          }}
        />
      ))}
      
      {/* Padrão de pontos */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src="/icons/icon-192x192.png" alt="Logo" className="h-24 w-24 animate-pulse-slow" />
          </div>
          <h1 className="text-3xl font-bold text-sticker-purple-dark">O álbum de figurinhas mais incrível da sua vida</h1>
        </div>

        <Card className="border-sticker-purple/20 shadow-lg backdrop-blur-sm bg-white/90">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-sticker-purple-dark">Criar Conta</CardTitle>
            <CardDescription className="text-center">
              Cadastre-se para começar a colecionar figurinhas
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sticker-purple-dark">Nome</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="name"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="pl-10 border-sticker-purple/30 focus:border-sticker-purple"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sticker-purple-dark">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 border-sticker-purple/30 focus:border-sticker-purple"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sticker-purple-dark">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pl-10 border-sticker-purple/30 focus:border-sticker-purple"
                  />
                  <p className="text-xs text-gray-500 mt-1">Mínimo de 6 caracteres</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sticker-purple-dark">Confirme a Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pl-10 border-sticker-purple/30 focus:border-sticker-purple"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button 
                type="submit" 
                className="w-full bg-sticker-purple hover:bg-sticker-purple-dark transition-colors duration-300"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Criando conta..." : "Criar Conta"}
              </Button>
              <div className="text-center text-sm">
                Já tem uma conta?{" "}
                <Link to="/login" className="text-sticker-purple font-medium hover:underline">
                  Faça login
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default SignUp;
