import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { getStickersByUserId, Sticker } from "@/models/StickerModel";
import { LogOut, Image, Search, User, Users, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getPendingFriendRequestCount } from "@/services/FriendshipService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Definição das categorias das figurinhas
const STICKER_CATEGORIES = {
  "Todas": [1, 184],
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

// Figurinhas especiais
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

// Função para obter a categoria de uma figurinha pelo seu ID
const getStickerCategory = (id: number) => {
  for (const [category, range] of Object.entries(STICKER_CATEGORIES)) {
    if (id >= range[0] && id <= range[1]) {
      return category;
    }
  }
  return "Sem categoria";
};

const TOTAL_STICKERS = 184;

const Dashboard = () => {
  const { currentUser, logout, profile } = useAuth();
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("Todas");
  const [goldAnimation, setGoldAnimation] = useState<number | null>(null);
  const navigate = useNavigate();
  const [stats, setStats] = useState({ 
    collected: 0, 
    remaining: 0, 
    withPhotos: 0 
  });
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState(0);

  useEffect(() => {
    async function loadStickers() {
      if (currentUser) {
        setLoading(true);
        
        // Carregar figurinhas
        const userStickers = await getStickersByUserId(currentUser.id);
        setStickers(userStickers);
        
        // Carregar contagem de solicitações pendentes
        const requestCount = await getPendingFriendRequestCount();
        setPendingRequests(requestCount);
        
        // Calculate statistics
        const collected = userStickers.filter(s => s.collected).length;
        const withPhotos = userStickers.filter(s => s.photoUrl).length;
        
        setStats({
          collected,
          remaining: TOTAL_STICKERS - collected,
          withPhotos
        });
        setLoading(false);
      }
    }
    
    loadStickers();
  }, [currentUser]);

  const handleStickerClick = (id: number) => {
    navigate(`/sticker/${id}`);
  };

  const filteredStickers = stickers.filter(sticker => {
    // Primeiro filtrar por categoria
    if (categoryFilter !== "Todas") {
      const categoryRange = STICKER_CATEGORIES[categoryFilter];
      if (sticker.id < categoryRange[0] || sticker.id > categoryRange[1]) {
        return false;
      }
    }
    
    // Depois filtrar por termo de busca
    const searchNum = parseInt(searchTerm);
    if (!isNaN(searchNum)) {
      return sticker.id === searchNum;
    }
    if (!searchTerm) return true;
    return sticker.collected && searchTerm.toLowerCase() === "coletadas" || 
           !sticker.collected && searchTerm.toLowerCase() === "faltantes" ||
           sticker.photoUrl && searchTerm.toLowerCase() === "com foto";
  });
  
  // Função para lidar com a animação das figurinhas douradas
  const handleGoldStickerClick = (id: number) => {
    if (GOLD_STICKERS.includes(id)) {
      setGoldAnimation(id);
      setTimeout(() => setGoldAnimation(null), 1500); // Remover animação após 1.5 segundos
    }
    handleStickerClick(id);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-soft text-sticker-purple-dark">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-sticker-purple-dark">O álbum de figurinhas mais incrivel da sua vida</h1>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/friend-requests')}
              title="Solicitações de Amizade"
              className="relative"
            >
              <Bell size={20} />
              {pendingRequests > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {pendingRequests}
                </span>
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/connections')}
              title="Conexões"
            >
              <Users size={20} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/profile')}
              title="Perfil"
            >
              <User size={20} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={logout}
              title="Sair"
            >
              <LogOut size={20} />
            </Button>
          </div>
        </div>
      </header>

      {/* Profile Summary */}
      {profile && (
        <div className="bg-sticker-purple text-white py-3">
          <div className="max-w-4xl mx-auto px-4 flex justify-between items-center">
            <div>
              <p className="font-medium">{profile.full_name || profile.username}</p>
              <p className="text-xs opacity-80">@{profile.username}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-white text-sticker-purple"
              onClick={() => navigate('/profile')}
            >
              <User size={14} className="mr-1" /> Editar Perfil
            </Button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-500">Coletadas</p>
              <p className="text-lg font-bold text-sticker-purple">{stats.collected} / {TOTAL_STICKERS}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-500">Faltantes</p>
              <p className="text-lg font-bold text-gray-500">{stats.remaining}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-500">Com foto</p>
              <p className="text-lg font-bold text-sticker-purple-dark">{stats.withPhotos}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
            <Input
              placeholder="Buscar por número ou filtrar (coletadas, faltantes, com foto)"
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Category Filter */}
          <div>
            <Select 
              value={categoryFilter} 
              onValueChange={setCategoryFilter}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(STICKER_CATEGORIES).map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Sticker grid */}
        <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 mb-20">
          {filteredStickers.map((sticker) => {
            const stickerType = getStickerType(sticker.id);
            const isGoldAnimated = goldAnimation === sticker.id;
            
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
                className={`aspect-square rounded-md flex flex-col items-center justify-center border text-sm font-medium transition-colors relative overflow-hidden ${specialStyles} ${specialBorder} ${
                  isGoldAnimated ? 'animate-pulse ring-2 ring-yellow-400 shadow-lg shadow-yellow-300/50' : ''
                }`}
                onClick={() => handleGoldStickerClick(sticker.id)}
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
                
                {/* Efeito de brilho para figurinhas douradas */}
                {isGoldAnimated && (
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 to-yellow-500 opacity-50 animate-pulse"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer for mobile */}
      <div className="h-16 md:hidden"></div>
    </div>
  );
};

export default Dashboard;