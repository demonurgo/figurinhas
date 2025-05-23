import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Search, UserPlus, UserMinus, User, Bell, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { getUserConnections, searchUsers, removeConnection } from "@/services/ProfileService";
import { sendFriendRequest } from "@/services/FriendshipService";
import { Profile } from "@/models/StickerTypes";

const Connections = () => {
  const { currentUser } = useAuth();
  const [connections, setConnections] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const loadConnections = useCallback(async () => {
    if (currentUser) {
      setRefreshing(true);
      console.log('Carregando conexões para o usuário atual...');
      const userConnections = await getUserConnections(currentUser.id);
      console.log('Conexões carregadas:', userConnections);
      setConnections(userConnections);
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [currentUser]);

  // Carregar conexões quando o componente inicializar
  useEffect(() => {
    loadConnections();
  }, [currentUser, loadConnections]);

  const handleSearch = async () => {
    if (!searchTerm.trim() || !currentUser) return;
    
    setIsSearching(true);
    const results = await searchUsers(searchTerm);
    
    // Filter out the current user and already connected users
    const filteredResults = results.filter(
      user => user.id !== currentUser.id && 
      !connections.some(conn => conn.id === user.id)
    );
    
    setSearchResults(filteredResults);
    setIsSearching(false);
  };

  const handleSendFriendRequest = async (userId: string) => {
    if (!currentUser) return;
    
    const success = await sendFriendRequest(userId);
    if (success) {
      toast({
        title: "Solicitação enviada",
        description: "Solicitação de amizade enviada com sucesso!",
      });
      
      // Remove from search results
      setSearchResults(prev => prev.filter(user => user.id !== userId));
    }
  };

  const handleRemoveConnection = async (userId: string) => {
    if (!currentUser) return;
    
    const success = await removeConnection(currentUser.id, userId);
    if (success) {
      toast({
        title: "Conexão removida",
        description: "Usuário removido das suas conexões.",
      });
      
      // Remove from connections
      setConnections(prev => prev.filter(user => user.id !== userId));
    } else {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível remover a conexão.",
      });
    }
  };

  const viewProfile = (userId: string) => {
    navigate(`/user/${userId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Reorganizado para melhor visualização em celulares */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          {/* Primeira linha: Botão de voltar e título */}
          <div className="flex items-center mb-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(-1)}
              className="mr-2"
            >
              <ArrowLeft size={20} />
            </Button>
            <h1 className="text-xl font-bold">Suas Conexões</h1>
          </div>
          
          {/* Segunda linha: Botões de ação */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadConnections}
              disabled={refreshing}
              className="flex items-center gap-1"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              Atualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/friend-requests')}
              className="flex items-center"
            >
              <Bell size={16} className="mr-2" />
              Solicitações
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder="Buscar usuários..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button 
                onClick={handleSearch}
                disabled={isSearching}
                className="bg-sticker-purple hover:bg-sticker-purple-dark"
              >
                <Search size={18} />
              </Button>
            </div>
            
            {/* Search Results */}
            {searchResults.length > 0 ? (
              <div className="mt-4 space-y-2">
                <h3 className="text-sm font-medium text-gray-500">Resultados da busca</h3>
                {searchResults.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>{user.full_name?.charAt(0) || user.username.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.full_name || user.username}</p>
                        <p className="text-xs text-gray-500">@{user.username}</p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleSendFriendRequest(user.id)}
                      className="bg-sticker-purple hover:bg-sticker-purple-dark"
                    >
                      <UserPlus size={16} className="mr-1" /> Solicitar amizade
                    </Button>
                  </div>
                ))}
              </div>
            ) : searchTerm && !isSearching ? (
              <p className="text-center text-gray-500 mt-4">Nenhum usuário encontrado</p>
            ) : null}
          </CardContent>
        </Card>
        
        {/* Connections List */}
        <h2 className="text-lg font-bold mb-3">Suas Conexões</h2>
        {isLoading ? (
          <Card>
            <CardContent className="p-6 flex justify-center items-center">
              <div className="animate-pulse text-sticker-purple-dark">Carregando conexões...</div>
            </CardContent>
          </Card>
        ) : connections.length > 0 ? (
          <div className="space-y-3">
            {connections.map((connection) => (
              <Card key={connection.id}>
                <CardContent className="p-4">
                  {/* Layout reorganizado para celulares: info e botões em colunas */}
                  <div className="flex flex-col">
                    {/* Informações do usuário */}
                    <div 
                      className="flex items-center mb-3" 
                      onClick={() => viewProfile(connection.id)} 
                      style={{ cursor: 'pointer' }}
                    >
                      <Avatar className="h-12 w-12 mr-3">
                        <AvatarImage src={connection.avatar_url || undefined} />
                        <AvatarFallback>{connection.full_name?.charAt(0) || connection.username.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{connection.full_name || connection.username}</p>
                        <p className="text-xs text-gray-500">@{connection.username}</p>
                      </div>
                    </div>
                    
                    {/* Botões abaixo das informações */}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline"
                        size="sm" 
                        onClick={() => viewProfile(connection.id)}
                        className="flex-1"
                      >
                        <User size={16} className="mr-1" /> Perfil
                      </Button>
                      <Button 
                        variant="outline"
                        size="sm" 
                        onClick={() => handleRemoveConnection(connection.id)}
                        className="flex-1 text-red-500 border-red-200 hover:bg-red-50"
                      >
                        <UserMinus size={16} className="mr-1" /> Remover
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
              <p>Você ainda não tem conexões.</p>
              <p className="text-sm mt-1">Busque por usuários para adicionar à sua lista.</p>
              <p className="text-xs text-gray-400 mt-3">
                Última atualização: {new Date().toLocaleTimeString()}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Connections;
