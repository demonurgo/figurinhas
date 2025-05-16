
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { AlertCircle } from "lucide-react";
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-white to-sticker-purple-light">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-sticker-purple-dark">O álbum de figurinhas mais incrivel da sua vida</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Criar Conta</CardTitle>
            <CardDescription>
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
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <p className="text-xs text-gray-500">Mínimo de 6 caracteres</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirme a Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button 
                type="submit" 
                className="w-full bg-sticker-purple hover:bg-sticker-purple-dark"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Criando conta..." : "Criar Conta"}
              </Button>
              <div className="text-center text-sm">
                Já tem uma conta?{" "}
                <Link to="/login" className="text-sticker-purple hover:underline">
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
