import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Save, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Profile = () => {
  const { currentUser, profile, updateProfile, logout } = useAuth();
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setFullName(profile.full_name || "");
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  const handleUpdateProfile = async () => {
    if (!currentUser) return;
    
    const success = await updateProfile({
      username,
      full_name: fullName,
      avatar_url: avatarUrl
    });
    
    if (success) {
      navigate('/');
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0 || !currentUser) {
        return;
      }
      
      const file = e.target.files[0];
      setUploading(true);
      
      // Converter imagem para base64 usando FileReader
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (!event.target || !event.target.result) {
          toast({
            variant: "destructive",
            title: "Erro ao processar imagem",
            description: "Não foi possível processar a imagem selecionada.",
          });
          setUploading(false);
          return;
        }
        
        const imageDataUrl = event.target.result.toString();
        
        // Validar se é uma imagem válida
        if (!imageDataUrl.startsWith('data:image/')) {
          toast({
            variant: "destructive",
            title: "Formato inválido",
            description: "Por favor, selecione uma imagem válida.",
          });
          setUploading(false);
          return;
        }
        
        setAvatarUrl(imageDataUrl);
        
        // Atualizar o perfil automaticamente com a nova URL da foto
        const success = await updateProfile({
          username,
          full_name: fullName,
          avatar_url: imageDataUrl
        });
        
        if (success) {
          toast({
            title: "Foto atualizada",
            description: "Sua foto de perfil foi atualizada com sucesso!",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Erro ao salvar",
            description: "A foto foi carregada, mas não foi possível salvá-la no seu perfil.",
          });
        }
        setUploading(false);
      };
      
      reader.onerror = () => {
        toast({
          variant: "destructive",
          title: "Erro ao ler arquivo",
          description: "Ocorreu um erro ao ler o arquivo de imagem.",
        });
        setUploading(false);
      };
      
      // Iniciar a leitura do arquivo como Data URL (base64)
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        variant: "destructive",
        title: "Erro no upload",
        description: "Ocorreu um erro ao tentar fazer o upload do avatar.",
      });
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Increased z-index to ensure it stays on top */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(-1)}
              className="mr-2"
            >
              <ArrowLeft size={20} />
            </Button>
            <h1 className="text-xl font-bold">Seu Perfil</h1>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/connections')}
            title="Conexões"
          >
            <Users size={20} />
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Foto de Perfil</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <Avatar className="w-24 h-24 mb-4">
              <AvatarImage src={avatarUrl || undefined} alt="Avatar" />
              <AvatarFallback>{fullName?.charAt(0) || username?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            
            <Button asChild variant="outline" disabled={uploading}>
              <label className="cursor-pointer">
                {uploading ? "Carregando..." : "Alterar foto"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />
              </label>
            </Button>
          </CardContent>
        </Card>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Informações Pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="username">
                Nome de Usuário
              </label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Este nome será visível para outros usuários.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="fullName">
                Nome Completo
              </label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                value={currentUser?.email || ""}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Seu email não pode ser alterado.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => logout()}>
              Sair da conta
            </Button>
            <Button onClick={handleUpdateProfile} className="bg-sticker-purple hover:bg-sticker-purple-dark">
              <Save size={16} className="mr-2" /> Salvar
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
