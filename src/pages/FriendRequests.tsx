
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, X, Check, UserPlus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getPendingRequests, searchUsers, acceptFriendRequest, rejectFriendRequest } from '@/services/FriendshipService';
import { Profile } from '@/models/StickerTypes';
import Header from '@/components/Header';

const FriendRequests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFriendRequests();
    }
  }, [user]);

  const fetchFriendRequests = async () => {
    if (!user) return;

    setIsLoading(true);
    const data = await getPendingRequests(user.id);
    setRequests(data);
    setIsLoading(false);
  };

  const handleAcceptRequest = async (requestId: string, senderId: string) => {
    if (!user) return;

    const success = await acceptFriendRequest(requestId, user.id, senderId);
    
    if (success) {
      // Remove the request from the list
      setRequests(prev => prev.filter(req => req.id !== requestId));
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    const success = await rejectFriendRequest(requestId);
    
    if (success) {
      // Remove the request from the list
      setRequests(prev => prev.filter(req => req.id !== requestId));
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) {
      toast({ 
        title: "Busca muito curta", 
        description: "Digite pelo menos 2 caracteres para buscar." 
      });
      return;
    }

    setIsSearching(true);
    const results = await searchUsers(searchQuery);
    setSearchResults(results);
    setIsSearching(false);
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <Header
        title="Solicitações de Amizade"
        showBackButton
        className="mb-4"
      />

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Buscar usuários</h2>
        <div className="flex gap-2">
          <Input
            placeholder="Digite um nome ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? 'Buscando...' : <Search size={18} />}
          </Button>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            {searchResults.map(profile => (
              <Card key={profile.id} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={profile.avatar_url || ''} />
                    <AvatarFallback>{profile.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{profile.full_name || profile.username}</p>
                    <p className="text-sm text-gray-500">@{profile.username}</p>
                  </div>
                </div>
                <Button variant="outline" size="icon" disabled={isSearching}>
                  <UserPlus size={18} />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Solicitações pendentes</h2>
        
        {isLoading ? (
          <p className="text-center py-4">Carregando...</p>
        ) : requests.length === 0 ? (
          <p className="text-center py-4 text-gray-500">Nenhuma solicitação pendente</p>
        ) : (
          <div className="space-y-3">
            {requests.map(request => (
              <Card key={request.id} className="p-3">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar>
                    <AvatarImage src={request.sender?.avatar_url || ''} />
                    <AvatarFallback>{request.sender?.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{request.sender?.full_name || request.sender?.username}</p>
                    <p className="text-sm text-gray-500">@{request.sender?.username}</p>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleRejectRequest(request.id)}
                  >
                    <X size={16} className="mr-1" /> Recusar
                  </Button>
                  <Button 
                    size="sm" 
                    className="bg-sticker-purple hover:bg-sticker-purple/80"
                    onClick={() => handleAcceptRequest(request.id, request.sender_id)}
                  >
                    <Check size={16} className="mr-1" /> Aceitar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendRequests;
