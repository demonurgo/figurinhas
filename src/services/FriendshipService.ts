
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Profile } from "@/models/StickerTypes";

interface UserResponse {
  data: Profile | null;
  error: Error | null;
}

// Function to get user profile by ID
export const getUserProfile = async (userId: string): Promise<UserResponse> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  return { 
    data: data as Profile, 
    error 
  };
};

// Send friend request
export const sendFriendRequest = async (
  currentUserId: string,
  recipientId: string
): Promise<boolean> => {
  try {
    // Check if request already exists
    const { data: existingRequest, error: checkError } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`)
      .or(`sender_id.eq.${recipientId},recipient_id.eq.${recipientId}`)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking friend request:', checkError);
      
      toast({
        title: "Erro",
        description: "Não foi possível verificar se já existe uma solicitação de amizade.",
        variant: "destructive",
      });
      
      return false;
    }

    if (existingRequest) {
      toast({
        title: "Aviso",
        description: "Já existe uma solicitação de amizade pendente com este usuário.",
      });
      
      return false;
    }

    // Get recipient profile to display name in toast
    const recipientProfile = await getUserProfile(recipientId);
    const recipientName = recipientProfile.data?.username || 'este usuário';

    // Insert new friend request
    const { error } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: currentUserId,
        recipient_id: recipientId,
        status: 'pending'
      });

    if (error) {
      console.error('Error sending friend request:', error);
      
      toast({
        title: "Erro",
        description: "Não foi possível enviar a solicitação de amizade.",
        variant: "destructive",
      });
      
      return false;
    }

    toast({
      title: "Solicitação enviada",
      description: `Solicitação de amizade enviada para ${recipientName}.`,
    });
    
    return true;
  } catch (error) {
    console.error('Error in sendFriendRequest:', error);
    
    toast({
      title: "Erro",
      description: "Ocorreu um erro ao processar sua solicitação.",
      variant: "destructive",
    });
    
    return false;
  }
};

// Get pending friend requests for current user
export const getPendingRequests = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('friend_requests')
      .select('*, profiles!friend_requests_sender_id_fkey(*)')
      .eq('recipient_id', userId)
      .eq('status', 'pending');

    if (error) {
      console.error('Error fetching friend requests:', error);
      
      toast({
        title: "Erro",
        description: "Não foi possível carregar suas solicitações de amizade.",
        variant: "destructive",
      });
      
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPendingRequests:', error);
    
    toast({
      title: "Erro",
      description: "Ocorreu um erro ao buscar as solicitações de amizade.",
      variant: "destructive",
    });
    
    return [];
  }
};

// Accept friend request
export const acceptFriendRequest = async (
  requestId: number, 
  currentUserId: string, 
  senderId: string
): Promise<boolean> => {
  try {
    // Update request status to accepted
    const { error: updateError } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (updateError) {
      console.error('Error accepting friend request:', updateError);
      
      toast({
        title: "Erro",
        description: "Não foi possível aceitar a solicitação de amizade.",
        variant: "destructive",
      });
      
      return false;
    }

    // Create friendship entries (bidirectional)
    const { error: insertError } = await supabase
      .from('friendships')
      .insert([
        { user_id: currentUserId, friend_id: senderId },
        { user_id: senderId, friend_id: currentUserId }
      ]);

    if (insertError) {
      console.error('Error creating friendship:', insertError);
      
      toast({
        title: "Aviso",
        description: "Solicitação aceita, mas houve um erro ao criar a conexão.",
        variant: "destructive",
      });
      
      return false;
    }

    // Get sender profile to display name in toast
    const senderProfile = await getUserProfile(senderId);
    const senderName = senderProfile.data?.username || 'o usuário';

    toast({
      title: "Nova conexão",
      description: `Você e ${senderName} agora estão conectados!`,
    });
    
    return true;
  } catch (error) {
    console.error('Error in acceptFriendRequest:', error);
    
    toast({
      title: "Erro",
      description: "Ocorreu um erro ao aceitar a solicitação.",
      variant: "destructive",
    });
    
    return false;
  }
};

// Reject friend request
export const rejectFriendRequest = async (requestId: number): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    if (error) {
      console.error('Error rejecting friend request:', error);
      
      toast({
        title: "Erro",
        description: "Não foi possível rejeitar a solicitação de amizade.",
        variant: "destructive",
      });
      
      return false;
    }

    toast({
      title: "Solicitação rejeitada",
      description: "A solicitação de amizade foi rejeitada.",
    });
    
    return true;
  } catch (error) {
    console.error('Error in rejectFriendRequest:', error);
    
    toast({
      title: "Erro",
      description: "Ocorreu um erro ao rejeitar a solicitação.",
      variant: "destructive",
    });
    
    return false;
  }
};

// Get all friends for current user
export const getFriends = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('friendships')
      .select('friend_id')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching friends:', error);
      
      toast({
        title: "Erro",
        description: "Não foi possível carregar suas conexões.",
        variant: "destructive",
      });
      
      return [];
    }

    // Extract friend IDs
    const friendIds = data.map(item => item.friend_id);
    
    if (friendIds.length === 0) {
      return [];
    }

    // Get friend profiles
    const { data: friendProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', friendIds);

    if (profilesError) {
      console.error('Error fetching friend profiles:', profilesError);
      
      toast({
        title: "Erro",
        description: "Não foi possível carregar os perfis de suas conexões.",
        variant: "destructive",
      });
      
      return [];
    }

    return friendProfiles || [];
  } catch (error) {
    console.error('Error in getFriends:', error);
    
    toast({
      title: "Erro",
      description: "Ocorreu um erro ao buscar suas conexões.",
      variant: "destructive",
    });
    
    return [];
  }
};

// Remove friend connection
export const removeFriend = async (
  currentUserId: string, 
  friendId: string
): Promise<boolean> => {
  try {
    // Get friend profile to display name in toast
    const friendProfile = await getUserProfile(friendId);
    const friendName = friendProfile.data?.username || 'este usuário';

    // Delete bidirectional friendship
    const { error } = await supabase
      .from('friendships')
      .delete()
      .or(`user_id.eq.${currentUserId},friend_id.eq.${friendId}`)
      .or(`user_id.eq.${friendId},friend_id.eq.${currentUserId}`);

    if (error) {
      console.error('Error removing friend:', error);
      
      toast({
        title: "Erro",
        description: "Não foi possível remover a conexão.",
        variant: "destructive",
      });
      
      return false;
    }

    toast({
      title: "Conexão removida",
      description: `Você e ${friendName} não estão mais conectados.`,
    });
    
    return true;
  } catch (error) {
    console.error('Error in removeFriend:', error);
    
    toast({
      title: "Erro",
      description: "Ocorreu um erro ao remover a conexão.",
      variant: "destructive",
    });
    
    return false;
  }
};

// Check friendship status between current user and another user
export type FriendshipStatus = 'friends' | 'request_sent' | 'request_received' | 'none';

export const checkFriendshipStatus = async (
  currentUserId: string,
  otherUserId: string
): Promise<FriendshipStatus> => {
  try {
    // Check if they are already friends
    const { data: friendData, error: friendError } = await supabase
      .from('friendships')
      .select('*')
      .eq('user_id', currentUserId)
      .eq('friend_id', otherUserId)
      .single();

    if (friendData) {
      return 'friends';
    }
    
    if (friendError && friendError.code !== 'PGRST116') {
      console.error('Error checking friendship:', friendError);
    }

    // Check for pending requests
    const { data: sentRequest, error: sentError } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('sender_id', currentUserId)
      .eq('recipient_id', otherUserId)
      .eq('status', 'pending')
      .single();

    if (sentRequest) {
      return 'request_sent';
    }
    
    if (sentError && sentError.code !== 'PGRST116') {
      console.error('Error checking sent requests:', sentError);
    }

    const { data: receivedRequest, error: receivedError } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('sender_id', otherUserId)
      .eq('recipient_id', currentUserId)
      .eq('status', 'pending')
      .single();

    if (receivedRequest) {
      return 'request_received';
    }
    
    if (receivedError && receivedError.code !== 'PGRST116') {
      console.error('Error checking received requests:', receivedError);
    }

    return 'none';
  } catch (error) {
    console.error('Error in checkFriendshipStatus:', error);
    return 'none';
  }
};
