import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { getStickersByUserId, Sticker } from "@/models/StickerModel";
import { LogOut, Image, Search, User, Users, Bell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
    withPhotos: 0,
    duplicates: 0
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
        
        // Count duplicates (quantity > 1)
        const duplicates = userStickers.reduce((total, sticker) => {
          const extraQuantity = sticker.collected && sticker.quantity ? sticker.quantity - 1 : 0;
          return total + extraQuantity;
        }, 0);
        
        setStats({
          collected,
          remaining: TOTAL_STICKERS - collected,
          withPhotos,
          duplicates
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
           sticker.photoUrl && searchTerm.toLowerCase() === "com foto" ||
           sticker.quantity && sticker.quantity > 1 && (searchTerm.toLowerCase() === "duplicatas" || searchTerm.toLowerCase() === "repetidas");
  });
  
  // Função para lidar com a animação das figurinhas especiais
  const handleGoldStickerClick = (id: number) => {
    // Efeito especial para figurinhas de ouro
    if (GOLD_STICKERS.includes(id)) {
      setGoldAnimation(id);
      // Adicionar um efeito de confete para figurinhas de ouro coletadas
      const sticker = stickers.find(s => s.id === id);
      if (sticker?.collected) {
        // Som de sucesso ou confete poderia ser implementado aqui
        // Mas por enquanto, apenas vamos manter o efeito visual
      }
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
      {/* Header - Increased z-index to ensure it stays on top */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <a href="/" title="Página Inicial" className="flex items-center">
              <img 
                src="/icons/icon-72x72.png" 
                alt="Logo do Álbum" 
                className="h-10 w-10 rounded-full"
              />
            </a>
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
              className="relative p-0 h-9 w-9 overflow-hidden"
            >
              {profile && profile.avatar_url ? (
                <Avatar className="h-full w-full">
                  <AvatarImage src={profile.avatar_url} alt="Perfil" />
                  <AvatarFallback>
                    <User size={20} />
                  </AvatarFallback>
                </Avatar>
              ) : (
                <User size={20} />
              )}
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
          <div className="max-w-4xl mx-auto px-4">
            <div>
              <p className="font-medium">{profile.full_name || profile.username}</p>
              <p className="text-xs opacity-80">@{profile.username}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="grid grid-cols-4 gap-3 mb-4">
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
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-500">Duplicatas</p>
              <p className="text-lg font-bold text-amber-500">{stats.duplicates}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
            <Input
              placeholder="Buscar por número ou filtrar (coletadas, faltantes, com foto, duplicatas)"
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
        <div className="mb-20">
          {/* Renderização por categoria */}
          {Object.entries(STICKER_CATEGORIES)
            .filter(([category]) => category !== "Todas" && (categoryFilter === "Todas" || categoryFilter === category))
            .map(([category, range]) => {
              // Filtrar figurinhas desta categoria
              const categoryStickers = filteredStickers.filter(
                sticker => sticker.id >= range[0] && sticker.id <= range[1]
              );
              
              // Se não houver figurinhas nesta categoria após a filtragem, não exibir
              if (categoryStickers.length === 0 && searchTerm) {
                return null;
              }
              
              // Contagem de coletadas nesta categoria
              const collectedCount = categoryStickers.filter(s => s.collected).length;
              const totalCount = categoryStickers.length;
              
              return (
                <div key={category} className="mb-8">
                  <div className={`flex justify-between items-center mb-2 pb-1 ${category === 'Fotografias' || category === 'Pinturas' || category === 'Esculturas e instalações' || category === 'Obras literárias' || category === 'Distopias' || category === 'Poemas' || category === 'Músicas' || category === 'Filmes' || category === 'Clássicos infantis' || category === 'Teóricos' ? 'border-b-2 border-sticker-purple-light' : ''}`}>
                    <h3 className="text-lg font-bold text-sticker-purple-dark flex items-center">
                      {category}
                    </h3>
                    <span className="text-sm text-gray-500 font-medium">{collectedCount}/{totalCount}</span>
                  </div>
                  <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                    {categoryStickers.map((sticker) => {
                      const stickerType = getStickerType(sticker.id);
                      const isGoldAnimated = goldAnimation === sticker.id;
                      
                      // Determinar as classes de estilo baseadas no tipo da figurinha
                      let specialStyles = '';
                      let specialBorder = '';
                      let specialEffects = '';
                      
                      if (stickerType === 'bronze') {
                        // Estilo para figurinhas de bronze
                        specialStyles = sticker.collected 
                          ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white' 
                          : 'bg-white';
                        specialBorder = sticker.collected 
                          ? 'border-2 border-amber-800 ring-2 ring-amber-400' 
                          : 'border border-amber-500';
                        specialEffects = sticker.collected ? 'shadow-md shadow-amber-700/50' : '';
                      } else if (stickerType === 'silver') {
                        // Estilo para figurinhas de prata
                        specialStyles = sticker.collected 
                          ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white' 
                          : 'bg-white';
                        specialBorder = sticker.collected 
                          ? 'border-2 border-gray-400 ring-2 ring-gray-300' 
                          : 'border border-gray-400';
                        specialEffects = sticker.collected ? 'shadow-md shadow-gray-500/50' : '';
                      } else if (stickerType === 'gold') {
                        // Estilo para figurinhas de ouro com mais destaque
                        specialStyles = sticker.collected 
                          ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white' 
                          : 'bg-white';
                        specialBorder = sticker.collected 
                          ? 'border-2 border-yellow-600 ring-2 ring-yellow-300' 
                          : 'border border-yellow-500';
                        specialEffects = sticker.collected ? 'shadow-lg shadow-yellow-500/50' : '';
                      } else {
                        // Estilos para figurinhas comuns
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
                          className={`aspect-square ${stickerType !== 'regular' && sticker.collected ? 'rounded-xl' : 'rounded-md'} flex flex-col items-center justify-center text-sm font-medium transition-all duration-200 relative overflow-hidden ${specialStyles} ${specialBorder} ${specialEffects} ${
                            isGoldAnimated ? 'animate-pulse ring-2 ring-yellow-400 shadow-lg shadow-yellow-300/50' : ''
                          } ${sticker.collected && stickerType !== 'regular' ? 'hover:scale-105' : 'hover:brightness-95'}`}
                          onClick={() => handleGoldStickerClick(sticker.id)}
                        >
                          {/* Removed repeated stickers indicator */}
                          {/* Duplicate stickers indicator */}
                          {sticker.collected && sticker.quantity && sticker.quantity > 1 && (
                            <div className="absolute top-0 right-0 bg-white text-xs font-bold rounded-bl-md text-sticker-purple-dark px-1 shadow-sm z-10">
                              {sticker.quantity}
                            </div>
                          )}
                          
                          {sticker.photoUrl ? (
                            <>
                              <div 
                                className={`absolute inset-0 w-full h-full bg-cover bg-center z-0 ${
                                  stickerType === 'bronze' ? 'border-4 border-amber-800 opacity-90' : 
                                  stickerType === 'silver' ? 'border-4 border-gray-400 opacity-90' : 
                                  stickerType === 'gold' ? 'border-4 border-yellow-600 opacity-95 saturate-150' : 'opacity-90'
                                }`} 
                                style={{ backgroundImage: `url(${sticker.photoUrl})` }}
                              />
                              <span className="z-10 text-white font-bold drop-shadow-md">{sticker.id}</span>
                            </>
                          ) : (
                            <span className="relative z-10">
                              {sticker.id}
                              {stickerType !== 'regular' && (
                                <div className={`flex items-center justify-center mt-1 ${sticker.collected ? 'scale-125' : ''}`}>
                                  {stickerType === 'bronze' && (
                                    <span className="text-base relative">
                                      <span className="absolute top-0 left-0 text-amber-600 blur-[1px] opacity-80">🥉</span>
                                      <span className="relative z-10">🥉</span>
                                    </span>
                                  )}
                                  {stickerType === 'silver' && (
                                    <span className="text-base relative">
                                      <span className="absolute top-0 left-0 text-gray-400 blur-[1px] opacity-80">🥈</span>
                                      <span className="relative z-10">🥈</span>
                                    </span>
                                  )}
                                  {stickerType === 'gold' && (
                                    <span className="text-base relative animate-pulse">
                                      <span className="absolute top-0 left-0 text-yellow-400 blur-[1px] opacity-80">🥇</span>
                                      <span className="relative z-10">🥇</span>
                                    </span>
                                  )}
                                </div>
                              )}
                            </span>
                          )}
                          
                          {/* Efeito de brilho para figurinhas especiais */}
                          {isGoldAnimated && (
                            <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 to-yellow-500 opacity-50 animate-pulse"></div>
                          )}
                          
                          {/* Efeito de brilho permanente para figurinhas de ouro coletadas */}
                          {stickerType === 'gold' && sticker.collected && !isGoldAnimated && (
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-yellow-300/10 to-transparent opacity-30"></div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
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
