import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { Search, UserCheck, UserMinus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { getUserConnections, removeConnection } from '@/services/ProfileService';
import { Profile } from '@/models/StickerTypes';
import Header from '@/components/Header';

const Connections = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [connections, setConnections] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchConnections();
    }
  }, [user]);

  const fetchConnections = async () => {
    if (!user) return;

    setIsLoading(true);
    const data = await getUserConnections(user.id);
    setConnections(data);
    setIsLoading(false);
  };

  const handleRemoveConnection = async (connectionId: string) => {
    if (!user) return;
    
    // Update to pass both required arguments
    const success = await removeConnection(user.id, connectionId);
    
    if (success) {
      setConnections(prev => prev.filter(conn => conn.id !== connectionId));
      toast({
        title: "Conexão removida",
        description: "Usuário removido das suas conexões."
      });
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <Header
        title="Conexões"
        showBackButton
        className="mb-4"
      />

      {isLoading ? (
        <p className="text-center py-4">Carregando conexões...</p>
      ) : connections.length === 0 ? (
        <p className="text-center py-4 text-gray-500">Nenhuma conexão encontrada.</p>
      ) : (
        <div className="space-y-3">
          {connections.map(connection => (
            <Card key={connection.id} className="p-3">
              <div className="flex items-center gap-3 mb-3">
                <Avatar>
                  <AvatarImage src={connection.avatar_url || ''} />
                  <AvatarFallback>{connection.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{connection.full_name || connection.username}</p>
                  <p className="text-sm text-gray-500">@{connection.username}</p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Link to={`/user/${connection.id}`}>
                  <Button variant="outline" size="sm">
                    <UserCheck size={16} className="mr-1" /> Ver Perfil
                  </Button>
                </Link>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleRemoveConnection(connection.id)}
                >
                  <UserMinus size={16} className="mr-1" /> Remover
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Connections;
