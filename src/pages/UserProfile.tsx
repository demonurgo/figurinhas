
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, UserPlus, UserMinus, Image } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getProfileWithStats } from "@/services/ProfileService";
import { checkConnection, addConnection, removeConnection } from "@/services/ProfileService";
import { getConnectionStickers } from "@/models/StickerModel";
import { ProfileWithStats } from "@/models/StickerTypes";
import { Sticker } from "@/models/StickerModel";
import { toast } from "@/components/ui/use-toast";

const UserProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [userProfile, setUserProfile] = useState<ProfileWithStats | null>(null);
  const [isConnection, setIsConnection] = useState(false);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (id && currentUser) {
      loadProfileData();
    }
  }, [id, currentUser]);

  const loadProfileData = async () => {
    if (!id || !currentUser) return;
    
    setLoading(true);
    
    // Check if we're connected with this user
    const connectionStatus = await checkConnection(currentUser.id, id);
    setIsConnection(connectionStatus);
    
    // Get user profile and stats
    const profile = await getProfileWithStats(id);
    if (profile) {
      setUserProfile(profile);
    }
    
    // Get stickers if we're connected
    if (connectionStatus) {
      const userStickers = await getConnectionStickers(id);
      setStickers(userStickers);
    }
    
    setLoading(false);
  };

  const handleToggleConnection = async () => {
    if (!id || !currentUser) return;
    
    if (isConnection) {
      const success = await removeConnection(currentUser.id, id);
      if (success) {
        setIsConnection(false);
        setStickers([]);
        toast({
          title: "Conexão removida",
          description: "Usuário removido das suas conexões.",
        });
      }
    } else {
      const success = await addConnection(currentUser.id, id);
      if (success) {
        setIsConnection(true);
        const userStickers = await getConnectionStickers(id);
        setStickers(userStickers);
        toast({
          title: "Conexão adicionada",
          description: "Usuário adicionado às suas conexões.",
        });
      }
    }
  };

  const handleStickerClick = (stickerId: number) => {
    if (isConnection) {
      navigate(`/user/${id}/sticker/${stickerId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-soft text-sticker-purple-dark">Carregando...</div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-xl text-gray-500 mb-4">Usuário não encontrado</p>
        <Button onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    );
  }

  // Count collected stickers
  const collectedStickers = stickers.filter(s => s.collected).length;

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
            <h1 className="text-xl font-bold">Perfil do Usuário</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* User Profile Info */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col items-center sm:flex-row sm:items-start">
              <Avatar className="w-20 h-20 mb-4 sm:mb-0 sm:mr-6">
                <AvatarImage src={userProfile.avatar_url || undefined} />
                <AvatarFallback>
                  {userProfile.full_name?.charAt(0) || userProfile.username.charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              <div className="text-center sm:text-left flex-1">
                <h2 className="text-xl font-bold">{userProfile.full_name || userProfile.username}</h2>
                <p className="text-gray-500 mb-4">@{userProfile.username}</p>
                
                <Button
                  onClick={handleToggleConnection}
                  className={isConnection ? "bg-gray-200 text-gray-800 hover:bg-gray-300" : "bg-sticker-purple hover:bg-sticker-purple-dark"}
                >
                  {isConnection ? (
                    <>
                      <UserMinus size={16} className="mr-2" /> Remover Conexão
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} className="mr-2" /> Adicionar Conexão
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Sticker Collection Stats */}
        <h2 className="text-lg font-bold mb-3">Coleção de Figurinhas</h2>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-gray-500">Figurinhas coletadas</p>
              <p className="text-lg font-bold text-sticker-purple">{isConnection ? collectedStickers : "?"} / 200</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-gray-500">Progresso</p>
              <p className="text-lg font-bold text-gray-500">
                {isConnection ? `${Math.round((collectedStickers / 200) * 100)}%` : "?"}
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Sticker Collection */}
        {isConnection ? (
          <>
            <h3 className="text-md font-medium mb-2">Figurinhas</h3>
            <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 mb-20">
              {stickers.map((sticker) => (
                <button
                  key={sticker.id}
                  className={`aspect-square rounded-md flex flex-col items-center justify-center border text-sm font-medium transition-colors ${
                    sticker.collected
                      ? "bg-sticker-purple text-white border-sticker-purple-dark"
                      : "bg-white text-gray-700 border-gray-200"
                  }`}
                  onClick={() => handleStickerClick(sticker.id)}
                >
                  <span>{sticker.id}</span>
                  {sticker.photoUrl && <Image size={12} className="mt-1" />}
                </button>
              ))}
              
              {/* If there are no stickers yet, show placeholders */}
              {stickers.length === 0 && Array.from({ length: 200 }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-square rounded-md flex items-center justify-center border border-gray-200 bg-gray-50 text-gray-400 text-sm"
                >
                  {index + 1}
                </div>
              ))}
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
              <p>Adicione este usuário como uma conexão para ver sua coleção.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
