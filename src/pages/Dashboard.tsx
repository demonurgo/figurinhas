import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { Plus, Book, User, Bell } from 'lucide-react';
import { getStickers } from '@/models/StickerModel';
import { getPendingFriendRequestCount } from '@/services/FriendshipService';
import Header from '@/components/Header';

const Dashboard = () => {
  const { user } = useAuth();
  const [stickers, setStickers] = useState([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchStickers();
      fetchPendingRequestsCount();
    }
  }, [user]);

  const fetchStickers = async () => {
    const fetchedStickers = await getStickers();
    setStickers(fetchedStickers);
  };

  const fetchPendingRequestsCount = async () => {
    if (user && user.id) {
      const count = await getPendingFriendRequestCount(user.id);
      setPendingRequestsCount(count);
    }
  };

  const collectedStickersCount = stickers.length;
  const totalStickersCount = 184;
  const progress = (collectedStickersCount / totalStickersCount) * 100;

  return (
    <div className="container mx-auto p-4 max-w-md">
      <Header title="Meu Álbum" />

      <Card className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Progresso do Álbum</h2>
          <span className="text-sm text-gray-500">{collectedStickersCount}/{totalStickersCount}</span>
        </div>
        <Progress value={progress} />
      </Card>

      <Tabs defaultvalue="collection" className="w-full">
        <TabsList>
          <TabsTrigger value="collection" className="flex items-center gap-1"><Book size={16} /> Coleção</TabsTrigger>
          <TabsTrigger value="social" className="flex items-center gap-1"><User size={16} /> Social</TabsTrigger>
        </TabsList>
        <TabsContent value="collection" className="pt-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
            {[...Array(totalStickersCount)].map((_, i) => {
              const stickerId = i + 1;
              const collected = stickers.some(sticker => sticker.id === stickerId);
              return (
                <Link key={stickerId} to={`/sticker/${stickerId}`}>
                  <Card className={`aspect-square flex items-center justify-center ${collected ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <span className="text-sm">{stickerId}</span>
                  </Card>
                </Link>
              );
            })}
          </div>
        </TabsContent>
        <TabsContent value="social" className="pt-4">
          <div className="flex flex-col gap-4">
            <Card className="p-4">
              <Link to="/connections" className="flex items-center justify-between">
                <span>Minhas Conexões</span>
                <User size={16} />
              </Link>
            </Card>
            <Card className="p-4">
              <Link to="/friend-requests" className="flex items-center justify-between">
                <span>
                  Solicitações de Amizade
                  {pendingRequestsCount > 0 && (
                    <span className="ml-2 rounded-full bg-red-500 text-white text-xs px-2 py-0.5">{pendingRequestsCount}</span>
                  )}
                </span>
                <Bell size={16} />
              </Link>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Link to="/profile">
        <Button className="w-full mt-6 flex items-center justify-center gap-2">
          <Plus size={16} />
          Adicionar Figurinhas
        </Button>
      </Link>
    </div>
  );
};

export default Dashboard;
