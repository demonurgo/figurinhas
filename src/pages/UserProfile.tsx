import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { UserCheck, UserMinus, UserPlus, ArrowLeft, Clock, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getProfileWithStats } from '@/services/ProfileService';
import { checkFriendshipStatus, FriendshipStatus, sendFriendRequest } from '@/services/FriendshipService';
import { removeConnection } from '@/services/ProfileService';
import { ProfileWithStats } from '@/models/StickerTypes';
import Header from '@/components/Header';

const UserProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfileWithStats | null>(null);
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>('none');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchProfile();
      if (user) {
        checkFriendship();
      }
    }
  }, [id, user]);

  const fetchProfile = async () => {
    setIsLoading(true);
    const data = await getProfileWithStats(id);
    setProfile(data);
    setIsLoading(false);
  };

  const checkFriendship = async () => {
    if (!user || !id) return;
    const status = await checkFriendshipStatus(user.id, id);
    setFriendshipStatus(status);
  };

  const handleAddFriend = async () => {
    if (!user || !profile) return;
    const success = await sendFriendRequest(user.id, profile.id);
    if (success) {
      setFriendshipStatus('request_sent');
    }
  };

  const handleRemoveConnection = async () => {
    if (!user || !profile) return;
    
    // Update to pass both required arguments
    const success = await removeConnection(user.id, profile.id);
    
    if (success) {
      setFriendshipStatus('none');
      toast({
        title: "Conexão removida",
        description: "Usuário removido das suas conexões."
      });
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  const pieChartData = profile ? [
    { name: 'Coletadas', value: profile.totalStickers },
    { name: 'Restantes', value: profile.missingStickers },
  ] : [];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <Card className="p-2 shadow-md">
          <p className="label">{`${payload[0].name} : ${payload[0].value}`}</p>
        </Card>
      );
    }

    return null;
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <Header
        title="Perfil do Usuário"
        showBackButton
        onBack={() => navigate(-1)}
        className="mb-4"
      />

      {isLoading ? (
        <p className="text-center py-4">Carregando perfil...</p>
      ) : profile ? (
        <>
          <Card className="p-4 mb-4">
            <div className="flex items-center gap-4 mb-4">
              <Avatar>
                <AvatarImage src={profile.avatar_url || ''} alt={profile.username || 'Avatar'} />
                <AvatarFallback>{profile.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-lg font-semibold">{profile.full_name || profile.username}</h2>
                <p className="text-sm text-gray-500">@{profile.username}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              {user && user.id !== profile.id && (
                <>
                  {friendshipStatus === 'none' && (
                    <Button onClick={handleAddFriend}>
                      <UserPlus size={16} className="mr-2" />
                      Adicionar
                    </Button>
                  )}

                  {friendshipStatus === 'request_sent' && (
                    <Button variant="secondary" disabled>
                      <Clock size={16} className="mr-2" />
                      Pendente...
                    </Button>
                  )}

                  {friendshipStatus === 'friends' && (
                    <Button variant="destructive" onClick={handleRemoveConnection}>
                      <UserMinus size={16} className="mr-2" />
                      Remover Conexão
                    </Button>
                  )}

                  {friendshipStatus === 'request_received' && (
                    <Button variant="secondary" disabled>
                      <AlertCircle size={16} className="mr-2" />
                      Aceitar solicitação
                    </Button>
                  )}
                </>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-md font-semibold mb-2">Progresso do Álbum</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label
                >
                  {pieChartData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <CustomTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </>
      ) : (
        <p className="text-center py-4">Usuário não encontrado.</p>
      )}
    </div>
  );
};

export default UserProfile;
