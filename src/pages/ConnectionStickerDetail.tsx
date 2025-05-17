
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Check, Image as ImageIcon } from "lucide-react";
import { SupabaseSticker } from "@/models/StickerTypes";

// Definindo as figurinhas especiais
const BRONZE_STICKERS = [10, 22, 34, 46, 58, 70, 82, 94, 102, 114, 126, 138, 150, 162];
const SILVER_STICKERS = [11, 23, 35, 47, 59, 71, 83, 95, 103, 115, 127, 139, 151, 163];
const GOLD_STICKERS = [12, 24, 36, 48, 60, 72, 84, 96, 104, 116, 128, 140, 152, 164];

// Definição das categorias das figurinhas
const STICKER_CATEGORIES = {
  "Fotografias": [1, 12],
  "Pinturas": [13, 60],
  "Esculturas e instalações": [61, 72],
  "Obras literárias": [73, 96],
  "Distopias": [97, 104],
  "Poemas": [105, 116],
  "Músicas": [117, 128],
  "Filmes": [129, 140],
  "Clássicos infantis": [141, 152],
  "Teóricos": [153, 164],
  "Slogans": [165, 184]
};

const getStickerType = (id: number) => {
  if (BRONZE_STICKERS.includes(id)) return 'bronze';
  if (SILVER_STICKERS.includes(id)) return 'silver';
  if (GOLD_STICKERS.includes(id)) return 'gold';
  return 'regular';
};

const getStickerCategory = (id: number) => {
  for (const [category, range] of Object.entries(STICKER_CATEGORIES)) {
    if (id >= range[0] && id <= range[1]) {
      return category;
    }
  }
  return "Sem categoria";
};

const ConnectionStickerDetail = () => {
  const { userId, stickerId } = useParams<{ userId: string; stickerId: string }>();
  const { currentUser } = useAuth();
  const [sticker, setSticker] = useState<SupabaseSticker | null>(null);
  const [username, setUsername] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const navigate = useNavigate();
  const stickerNumber = parseInt(stickerId || "0");

  useEffect(() => {
    if (userId && stickerNumber && currentUser) {
      fetchSticker();
      fetchUsername();
    }
  }, [userId, stickerNumber, currentUser]);

  const fetchSticker = async () => {
    try {
      const { data, error } = await supabase
        .from('stickers')
        .select('*')
        .eq('user_id', userId)
        .eq('sticker_number', stickerNumber)
        .maybeSingle();
        
      if (error) {
        console.error('Error fetching sticker:', error);
        return;
      }
      
      if (data) {
        setSticker(data);
      }
    } catch (error) {
      console.error('Error in fetchSticker:', error);
    }
  };

  const fetchUsername = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, full_name')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error('Error fetching username:', error);
        return;
      }
      
      if (data) {
        setUsername(data.full_name || data.username);
      }
    } catch (error) {
      console.error('Error in fetchUsername:', error);
    }
  };

  const handleViewPhoto = () => {
    if (sticker?.photo_url) {
      setPhotoPreview(sticker.photo_url);
    }
  };

  if (!sticker) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-soft text-sticker-purple-dark">Carregando...</div>
      </div>
    );
  }

  // Determinar o tipo e a categoria da figurinha atual
  const stickerType = getStickerType(stickerNumber);
  const stickerCategory = getStickerCategory(stickerNumber);
  
  // Definir estilos baseados no tipo da figurinha
  let headerColor = "bg-white";
  let medalIcon = null;
  
  if (stickerType === 'bronze') {
    headerColor = sticker.collected ? "bg-amber-100" : "bg-white";
    medalIcon = "🥉";
  } else if (stickerType === 'silver') {
    headerColor = sticker.collected ? "bg-gray-100" : "bg-white";
    medalIcon = "🥈";
  } else if (stickerType === 'gold') {
    headerColor = sticker.collected ? "bg-yellow-100" : "bg-white";
    medalIcon = "🥇";
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className={`${headerColor} shadow-sm sticky top-0 z-10`}>
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
            <div>
              <h1 className="text-xl font-bold flex items-center">
                Figurinha #{stickerNumber} {medalIcon && <span className="ml-2 text-lg">{medalIcon}</span>}
              </h1>
              <p className="text-xs text-gray-500">{stickerCategory}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Ownership Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Coleção de {username}</CardTitle>
          </CardHeader>
        </Card>

        {/* Sticker Status Card */}
        <Card className={`mb-6 ${stickerType === 'bronze' && sticker.collected ? 'border-amber-500' : 
                           stickerType === 'silver' && sticker.collected ? 'border-gray-400' : 
                           stickerType === 'gold' && sticker.collected ? 'border-yellow-500' : ''}`}>
          <CardHeader>
            <CardTitle className="text-lg flex justify-between items-center">
              Status
              <span className={sticker.collected ? "text-green-500" : "text-gray-400"}>
                {sticker.collected ? <Check size={20} /> : null}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">
              {sticker.collected ? "Coletada" : "Não coletada"}
            </p>
            
            {sticker.date_collected && (
              <p className="text-sm text-gray-500 mt-2">
                Coletada em: {new Date(sticker.date_collected).toLocaleDateString('pt-BR')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Photo Card */}
        {sticker.collected && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Foto</CardTitle>
            </CardHeader>
            <CardContent>
              {sticker.photo_url ? (
                <div className="text-center">
                  <div 
                    className={`aspect-square max-w-48 mx-auto mb-4 rounded-md bg-cover bg-center cursor-pointer border ${stickerType === 'bronze' ? 'border-amber-800 shadow-amber-300/50' : 
                                 stickerType === 'silver' ? 'border-gray-400 shadow-gray-300/50' : 
                                 stickerType === 'gold' ? 'border-yellow-600 shadow-yellow-300/50' : ''} ${
                                 stickerType === 'gold' ? 'shadow-md hover:shadow-lg transition-shadow' : ''
                               }`}
                    style={{ backgroundImage: `url(${sticker.photo_url})` }}
                    onClick={handleViewPhoto}
                  ></div>
                  
                  <Button variant="outline" className="flex items-center" onClick={handleViewPhoto}>
                    <ImageIcon size={16} className="mr-2" /> Visualizar
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500">Esta figurinha não tem foto</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Notes Card */}
        {sticker.notes && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Anotações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{sticker.notes}</p>
            </CardContent>
          </Card>
        )}
        
        {/* Duplicates Card */}
        {sticker.collected && sticker.quantity && sticker.quantity > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Duplicatas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center">
                <p className="text-lg font-medium mb-2">{sticker.quantity} exemplares</p>
                <p className="text-center text-sm text-gray-500">
                  {username} possui {sticker.quantity} exemplares desta figurinha.
                </p>
                
                {sticker.quantity > 1 && (
                  <div className="mt-4 text-center">
                    <p className="text-xs text-gray-500 mb-2">
                      Esta figurinha está disponível para troca!
                    </p>
                    <Button
                      className="mt-2 bg-sticker-purple hover:bg-sticker-purple-dark"
                      onClick={() => navigate(`/trade-request/${userId}/${stickerNumber}`)}
                    >
                      Propor troca
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Full screen photo preview */}
      {photoPreview && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setPhotoPreview(null)}
        >
          <div className="relative max-w-full max-h-full">
            <img 
              src={photoPreview} 
              alt="Foto da figurinha" 
              className="max-w-full max-h-[80vh] object-contain rounded-md"
            />
            <Button 
              variant="outline" 
              size="icon" 
              className="absolute top-3 right-3 rounded-full bg-black bg-opacity-50 text-white"
              onClick={() => setPhotoPreview(null)}
            >
              <ArrowLeft size={20} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionStickerDetail;
