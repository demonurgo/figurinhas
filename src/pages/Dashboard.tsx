
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { getStickersByUserId, Sticker } from "@/models/StickerModel";
import { LogOut, Image, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const [stats, setStats] = useState({ 
    collected: 0, 
    remaining: 0, 
    withPhotos: 0 
  });

  useEffect(() => {
    if (currentUser) {
      const userStickers = getStickersByUserId(currentUser.id);
      setStickers(userStickers);
      
      // Calculate statistics
      const collected = userStickers.filter(s => s.collected).length;
      const withPhotos = userStickers.filter(s => s.photoUrl).length;
      
      setStats({
        collected,
        remaining: 200 - collected,
        withPhotos
      });
    }
  }, [currentUser]);

  const handleStickerClick = (id: number) => {
    navigate(`/sticker/${id}`);
  };

  const filteredStickers = stickers.filter(sticker => {
    const searchNum = parseInt(searchTerm);
    if (!isNaN(searchNum)) {
      return sticker.id === searchNum;
    }
    if (!searchTerm) return true;
    return sticker.collected && searchTerm.toLowerCase() === "coletadas" || 
           !sticker.collected && searchTerm.toLowerCase() === "faltantes" ||
           sticker.photoUrl && searchTerm.toLowerCase() === "com foto";
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-sticker-purple-dark">Álbum de Figurinhas</h1>
            <p className="text-sm text-gray-600">Fernanda Pessoa</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={logout}
            title="Sair"
          >
            <LogOut size={20} />
          </Button>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-500">Coletadas</p>
              <p className="text-lg font-bold text-sticker-purple">{stats.collected} / 200</p>
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

        {/* Search */}
        <div className="relative mb-4">
          <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
          <Input
            placeholder="Buscar por número ou filtrar (coletadas, faltantes, com foto)"
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Sticker grid */}
        <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 mb-20">
          {filteredStickers.map((sticker) => (
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
        </div>
      </div>

      {/* Footer for mobile */}
      <div className="h-16 md:hidden"></div>
    </div>
  );
};

export default Dashboard;
