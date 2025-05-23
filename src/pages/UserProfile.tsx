import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, UserPlus, UserMinus, Image, Clock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getProfileWithStats } from "@/services/ProfileService";
import { checkConnection, removeConnection } from "@/services/ProfileService";
import { getConnectionStickers } from "@/models/StickerModel";
import { ProfileWithStats } from "@/models/StickerTypes";
import { Sticker } from "@/models/StickerModel";
import { toast } from "@/components/ui/use-toast";
import { sendFriendRequest } from "@/services/FriendshipService";

// Definindo constantes
const TOTAL_STICKERS = 184;

// Definindo as figurinhas especiais
const BRONZE_STICKERS = [10, 22, 34, 46, 58, 70, 82, 94, 102, 114, 126, 138, 150, 162];
const SILVER_STICKERS = [11, 23, 35, 47, 59, 71, 83, 95, 103, 115, 127, 139, 151, 163];
const GOLD_STICKERS = [12, 24, 36, 48, 60, 72, 84, 96, 104, 116, 128, 140, 152, 164];

// Função para verificar se uma figurinha é especial e retornar seu tipo
const getStickerType = (id: number) => {
  if (BRONZE_STICKERS.includes(id)) return 'bronze';
  if (SILVER_STICKERS.includes(id)) return 'silver';
  if (GOLD_STICKERS.includes(id)) return 'gold';
  return 'regular';
};

const UserProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [userProfile, setUserProfile] = useState<ProfileWithStats | null>(null);
  const [isConnection, setIsConnection] = useState(false);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingRequest, setPendingRequest] = useState(false);
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
    
    // Check if there's a pending friend request
    const { data: pendingRequests } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${id}),and(sender_id.eq.${id},recipient_id.eq.${currentUser.id})`)
      .eq('status', 'pending');
      
    setPendingRequest(pendingRequests && pendingRequests.length > 0);
    
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

  const handleRemoveConnection = async () => {
    if (!id || !currentUser) return;
    
    const success = await removeConnection(currentUser.id, id);
    if (success) {
      setIsConnection(false);
      setStickers([]);
      toast({
        title: "Conexão removida",
        description: "Usuário removido das suas conexões.",
      });
    }
  };

  const handleSendFriendRequest = async () => {
    if (!id || !currentUser) return;
    
    const success = await sendFriendRequest(id);
    if (success) {
      setPendingRequest(true);
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
                
                {/* Status de conexão - Botão conditional */}
                {isConnection ? (
                  <Button
                    onClick={handleRemoveConnection}
                    className="bg-gray-200 text-gray-800 hover:bg-gray-300"
                  >
                    <UserMinus size={16} className="mr-2" /> Remover Conexão
                  </Button>
                ) : pendingRequest ? (
                  <Button disabled className="bg-yellow-100 text-yellow-800">
                    <Clock size={16} className="mr-2" /> Solicitação Pendente
                  </Button>
                ) : (
                  <Button
                    onClick={handleSendFriendRequest}
                    className="bg-sticker-purple hover:bg-sticker-purple-dark"
                  >
                    <UserPlus size={16} className="mr-2" /> Solicitar Amizade
                  </Button>
                )}
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
              <p className="text-lg font-bold text-sticker-purple">{isConnection ? collectedStickers : "?"} / {TOTAL_STICKERS}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-gray-500">Progresso</p>
              <p className="text-lg font-bold text-gray-500">
                {isConnection ? `${Math.round((collectedStickers / TOTAL_STICKERS) * 100)}%` : "?"}
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Sticker Collection */}
        {isConnection ? (
          <>
            <h3 className="text-md font-medium mb-2">Figurinhas</h3>
            <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 mb-20">
              {stickers.map((sticker) => {
                const stickerType = getStickerType(sticker.id);
                
                // Determinar as classes de estilo baseadas no tipo da figurinha
                let specialStyles = '';
                let specialBorder = '';
                
                if (stickerType === 'bronze') {
                  specialStyles = sticker.collected ? 'bg-amber-700 text-white' : 'bg-white';
                  specialBorder = 'border-amber-800';
                } else if (stickerType === 'silver') {
                  specialStyles = sticker.collected ? 'bg-gray-300 text-gray-800' : 'bg-white';
                  specialBorder = 'border-gray-400';
                } else if (stickerType === 'gold') {
                  specialStyles = sticker.collected ? 'bg-yellow-500 text-white' : 'bg-white';
                  specialBorder = 'border-yellow-600';
                } else {
                  specialStyles = sticker.collected 
                    ? 'bg-sticker-purple text-white' 
                    : 'bg-white text-gray-700';
                  specialBorder = sticker.collected 
                    ? 'border-sticker-purple-dark' 
                    : 'border-gray-200';
                }
                
                return (
                  <button
                    key={sticker.id}
                    className={`aspect-square rounded-md flex flex-col items-center justify-center border text-sm font-medium transition-colors relative overflow-hidden ${specialStyles} ${specialBorder}`}
                    onClick={() => handleStickerClick(sticker.id)}
                  >
                    {sticker.photoUrl ? (
                      <>
                        <div 
                          className={`absolute inset-0 w-full h-full bg-cover bg-center z-0 opacity-90 ${
                            stickerType === 'bronze' ? 'border-4 border-amber-800' : 
                            stickerType === 'silver' ? 'border-4 border-gray-400' : 
                            stickerType === 'gold' ? 'border-4 border-yellow-600' : ''
                          }`} 
                          style={{ backgroundImage: `url(${sticker.photoUrl})` }}
                        />
                        <span className="z-10 text-white font-bold drop-shadow-md">{sticker.id}</span>
                      </>
                    ) : (
                      <span className="relative z-10">
                        {sticker.id}
                        {stickerType !== 'regular' && (
                          <span className="block text-xs mt-1">
                            {stickerType === 'bronze' && '🥉'}
                            {stickerType === 'silver' && '🥈'}
                            {stickerType === 'gold' && '🥇'}
                          </span>
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
              
              {/* If there are no stickers yet, show placeholders */}
              {stickers.length === 0 && Array.from({ length: TOTAL_STICKERS }).map((_, index) => (
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
              {pendingRequest ? (
                <p>Você precisará esperar a aceitação da solicitação de amizade para ver a coleção.</p>
              ) : (
                <p>Envie uma solicitação de amizade para ver a coleção deste usuário.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
