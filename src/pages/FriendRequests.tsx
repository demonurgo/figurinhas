import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, X, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { getPendingFriendRequests, acceptFriendRequest, rejectFriendRequest, searchUsers, sendFriendRequest } from "@/services/FriendshipService";
import type { FriendRequest, Profile } from "@/models/StickerTypes";

const FriendRequests = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    const pendingRequests = await getPendingFriendRequests();
    setRequests(pendingRequests as FriendRequest[]); // Type assertion to fix TypeScript error
    setLoading(false);
  };

  const handleAccept = async (requestId: string) => {
    const success = await acceptFriendRequest(requestId);
    if (success) {
      loadRequests();
    }
  };

  const handleReject = async (requestId: string) => {
    const success = await rejectFriendRequest(requestId);
    if (success) {
      loadRequests();
    }
  };

  const handleSearch = async () => {
    if (!searchTerm || searchTerm.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const results = await searchUsers(searchTerm);
    setSearchResults(results);
    setSearching(false);
  };

  const handleSendRequest = async (recipientId: string) => {
    const success = await sendFriendRequest(recipientId);
    if (success) {
      setSearchResults([]);
      setSearchTerm("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Update with new design and higher z-index */}
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="mr-2"
          >
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-xl font-bold">Solicitações de Amizade</h1>
          {profile && (
            <div className="hidden sm:block ml-4">
              <p className="text-sm font-medium">{profile.full_name || profile.username}</p>
              <p className="text-xs opacity-80">@{profile.username}</p>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Search Input */}
        <div className="mb-4">
          <div className="relative">
            <Input
              type="search"
              placeholder="Buscar por nome de usuário, nome ou email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" onClick={handleSearch} style={{cursor: 'pointer'}} />
          </div>
        </div>

        {/* Search Results */}
        {searchTerm && searchResults.length > 0 && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <h2 className="text-lg font-semibold mb-2">Resultados da Busca</h2>
              {searching ? (
                <p>Buscando...</p>
              ) : (
                <ul className="space-y-2">
                  {searchResults.map((user) => (
                    <li key={user.id} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Avatar className="w-8 h-8 mr-2">
                          <AvatarImage src={user.avatar_url || undefined} alt={user.username} />
                          <AvatarFallback>{user.full_name?.charAt(0) || user.username?.charAt(0) || "U"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.full_name || user.username}</p>
                          <p className="text-xs text-gray-500">@{user.username}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleSendRequest(user.id)}>
                        Adicionar
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {/* Friend Requests List */}
        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-2">Solicitações Pendentes</h2>
            {loading ? (
              <p>Carregando solicitações...</p>
            ) : requests.length === 0 ? (
              <p>Nenhuma solicitação pendente.</p>
            ) : (
              <ul className="space-y-2">
                {requests.map((request) => (
                  <li key={request.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Avatar className="w-8 h-8 mr-2">
                        <AvatarImage src={request.sender?.avatar_url || undefined} alt={request.sender?.username} />
                        <AvatarFallback>{request.sender?.full_name?.charAt(0) || request.sender?.username?.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{request.sender?.full_name || request.sender?.username}</p>
                        <p className="text-xs text-gray-500">@{request.sender?.username}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleAccept(request.id)}>
                        <Check size={20} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleReject(request.id)}>
                        <X size={20} />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FriendRequests;
