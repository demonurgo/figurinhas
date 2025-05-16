
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Search, UserPlus, Check, X, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { FriendRequest } from "@/models/StickerTypes";
import { searchUsers } from "@/services/ProfileService";
import { sendFriendRequest, getPendingFriendRequests, respondToFriendRequest } from "@/services/FriendshipService";

const FriendRequests = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const loadPendingRequests = useCallback(async () => {
    if (!currentUser) return;
    setRefreshing(true);
    console.log("Carregando solicitações pendentes para o usuário:", currentUser.id);
    const requests = await getPendingFriendRequests();
    console.log('Solicitações carregadas:', requests);
    setPendingRequests(requests);
    setIsLoading(false);
    setRefreshing(false);
  }, [currentUser]);

  // Carregar solicitações quando a página é carregada
  useEffect(() => {
    if (currentUser) {
      loadPendingRequests();
    }
  }, [currentUser, loadPendingRequests]);

  // Recarregar periodicamente
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (currentUser) {
        loadPendingRequests();
      }
    }, 10000); // Recarregar a cada 10 segundos

    return () => clearInterval(intervalId);
  }, [currentUser, loadPendingRequests]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm || searchTerm.length < 2) {
      toast({
        title: "Termo muito curto",
        description: "Digite pelo menos 2 caracteres para buscar.",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    const results = await searchUsers(searchTerm);
    setSearchResults(results);
    setIsSearching(false);

    if (results.length === 0) {
      toast({
        title: "Nenhum usuário encontrado",
        description: "Tente usar outro termo de busca."
      });
    }
  };

  const handleSendRequest = async (userId: string) => {
    if (!currentUser) return;
    
    const success = await sendFriendRequest(userId);
    
    if (success) {
      // Remove from search results to prevent sending multiple requests
      setSearchResults(prev => prev.filter(user => user.id !== userId));
    }
  };

  const handleRespondToRequest = async (requestId: string, accept: boolean) => {
    const success = await respondToFriendRequest(requestId, accept);
    
    if (success) {
      // Refresh the pending requests list
      loadPendingRequests();
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
            <h1 className="text-xl font-bold">Amigos</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadPendingRequests}
            disabled={refreshing}
            className="flex items-center gap-1"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Atualizar
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Search for users */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4">Encontrar Usuários</h2>
          <form onSubmit={handleSearch} className="flex gap-2 mb-4">
            <Input
              placeholder="Buscar por nome, username ou email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={isSearching}>
              <Search size={18} className="mr-2" />
              {isSearching ? "Buscando..." : "Buscar"}
            </Button>
          </form>

          {searchResults.length > 0 && (
            <div className="space-y-3">
              {searchResults.map((user) => (
                <Card key={user.id} className="overflow-hidden">
                  <CardContent className="p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>
                          {user.full_name?.charAt(0) || user.username.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.full_name || user.username}</p>
                        <p className="text-sm text-gray-500">@{user.username}</p>
                        <p className="text-xs text-gray-400">ID: {user.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleSendRequest(user.id)}
                      className="bg-sticker-purple hover:bg-sticker-purple-dark"
                    >
                      <UserPlus size={16} className="mr-1" /> Adicionar
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Pending friend requests */}
        <div>
          <h2 className="text-lg font-bold mb-4">Solicitações de Amizade</h2>
          
          {isLoading ? (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="animate-pulse">Carregando solicitações...</div>
              </CardContent>
            </Card>
          ) : pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">Você não tem solicitações de amizade pendentes.</p>
                <p className="text-xs text-gray-400 mt-2">
                  Última atualização: {new Date().toLocaleTimeString()}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <Card key={request.id} className="overflow-hidden">
                  <CardContent className="p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={request.sender?.avatar_url || undefined} />
                        <AvatarFallback>
                          {request.sender?.full_name?.charAt(0) || 
                           request.sender?.username?.charAt(0) || 
                           'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {request.sender?.full_name || 
                           request.sender?.username || 
                           `Usuário (${request.sender_id.slice(0, 8)}...)`}
                        </p>
                        {request.sender?.username && (
                          <p className="text-sm text-gray-500">@{request.sender.username}</p>
                        )}
                        <p className="text-xs text-gray-400">
                          ID: {request.id} / Emissor: {request.sender_id.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleRespondToRequest(request.id, true)}
                      >
                        <Check size={16} className="mr-1" /> Aceitar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleRespondToRequest(request.id, false)}
                      >
                        <X size={16} className="mr-1" /> Recusar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendRequests;
