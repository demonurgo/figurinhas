
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
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${currentUser.id}/${fileName}`;
      
      setUploading(true);
      
      const { error: uploadError } = await supabase.storage
        .from('sticker_photos')
        .upload(filePath, file);
        
      if (uploadError) {
        toast({
          variant: "destructive",
          title: "Erro no upload",
          description: "Não foi possível fazer o upload da imagem.",
        });
        return;
      }
      
      const { data } = supabase.storage
        .from('sticker_photos')
        .getPublicUrl(filePath);
        
      setAvatarUrl(data.publicUrl);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        variant: "destructive",
        title: "Erro no upload",
        description: "Ocorreu um erro ao tentar fazer o upload do avatar.",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
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
