
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Profile, FriendRequest } from "@/models/StickerTypes";

// Get count of pending friend requests
export const getPendingFriendRequestCount = async (): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('friend_requests')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', supabase.auth.getUser().data.user?.id)
      .eq('status', 'pending');
    
    if (error) {
      console.error('Error fetching pending friend requests count:', error);
      return 0;
    }
    
    return count || 0;
  } catch (e) {
    console.error('Error in getPendingFriendRequestCount:', e);
    return 0;
  }
};

// Search for users by username, name or email
export const searchUsers = async (searchTerm: string): Promise<Profile[]> => {
  try {
    if (!searchTerm || searchTerm.trim().length < 3) {
      return [];
    }
    
    const currentUserId = supabase.auth.getUser().data.user?.id;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .neq('id', currentUserId)
      .limit(10);
    
    if (error) {
      console.error('Error searching users:', error);
      toast({
        description: "Erro ao buscar usuários",
        duration: 3000
      });
      return [];
    }
    
    return data as Profile[];
  } catch (e) {
    console.error('Error in searchUsers:', e);
    toast({
      description: "Erro ao buscar usuários",
      duration: 3000
    });
    return [];
  }
};

// Send friend request
export const sendFriendRequest = async (recipientId: string): Promise<boolean> => {
  try {
    const senderId = supabase.auth.getUser().data.user?.id;
    
    if (!senderId) {
      toast({
        description: "Você precisa estar logado para enviar solicitações",
        duration: 3000
      });
      return false;
    }
    
    // Check if request already exists
    const { data: existingRequest } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`and(sender_id.eq.${senderId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${senderId})`)
      .limit(1);
    
    if (existingRequest && existingRequest.length > 0) {
      const request = existingRequest[0];
      
      // If there's a pending request from the recipient to the sender, automatically accept it
      if (request.sender_id === recipientId && request.recipient_id === senderId && request.status === 'pending') {
        const accepted = await acceptFriendRequest(request.id);
        if (accepted) {
          toast({
            description: "Solicitação aceita automaticamente!",
            duration: 3000
          });
          return true;
        }
      }
      
      // If there's already a pending request from sender to recipient
      if (request.sender_id === senderId && request.recipient_id === recipientId && request.status === 'pending') {
        toast({
          description: "Você já enviou uma solicitação para este usuário",
          duration: 3000
        });
        return false;
      }
      
      // If they're already friends (request was accepted)
      if (request.status === 'accepted') {
        toast({
          description: "Vocês já são amigos",
          duration: 3000
        });
        return false;
      }
      
      // If request was rejected, allow to send again
      if (request.status === 'rejected') {
        await supabase
          .from('friend_requests')
          .delete()
          .eq('id', request.id);
      }
    }
    
    // Send new request
    const { data, error } = await supabase
      .from('friend_requests')
      .insert([
        { 
          sender_id: senderId, 
          recipient_id: recipientId,
          status: 'pending'
        }
      ]);
    
    if (error) {
      console.error('Error sending friend request:', error);
      toast({
        description: "Erro ao enviar solicitação de amizade",
        duration: 3000
      });
      return false;
    }
    
    toast({
      description: "Solicitação de amizade enviada!",
      duration: 3000
    });
    return true;
    
  } catch (e) {
    console.error('Error in sendFriendRequest:', e);
    toast({
      description: "Erro ao enviar solicitação de amizade",
      duration: 3000
    });
    return false;
  }
};

// Get pending friend requests
export const getPendingFriendRequests = async (): Promise<FriendRequest[]> => {
  try {
    const userId = supabase.auth.getUser().data.user?.id;
    
    if (!userId) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('friend_requests')
      .select(`
        *,
        sender:sender_id(id, username, full_name, avatar_url)
      `)
      .eq('recipient_id', userId)
      .eq('status', 'pending');
    
    if (error) {
      console.error('Error fetching friend requests:', error);
      toast({
        description: "Erro ao carregar solicitações de amizade",
        duration: 3000
      });
      return [];
    }
    
    return data as unknown as FriendRequest[];
  } catch (e) {
    console.error('Error in getPendingFriendRequests:', e);
    toast({
      description: "Erro ao carregar solicitações de amizade",
      duration: 3000
    });
    return [];
  }
};

// Accept friend request
export const acceptFriendRequest = async (requestId: string): Promise<boolean> => {
  try {
    const userId = supabase.auth.getUser().data.user?.id;
    
    if (!userId) {
      toast({
        description: "Você precisa estar logado para aceitar solicitações",
        duration: 3000
      });
      return false;
    }
    
    // First get the request details
    const { data: requestData, error: fetchError } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('id', requestId)
      .eq('recipient_id', userId) // Make sure the user is the recipient
      .single();
    
    if (fetchError || !requestData) {
      console.error('Error fetching friend request:', fetchError);
      toast({
        description: "Erro ao processar solicitação de amizade",
        duration: 3000
      });
      return false;
    }
    
    // Update request status to accepted
    const { error: updateError } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);
    
    if (updateError) {
      console.error('Error accepting friend request:', updateError);
      toast({
        description: "Erro ao aceitar solicitação de amizade",
        duration: 3000
      });
      return false;
    }
    
    // Create mutual connection records
    const { error: connectionError } = await supabase
      .from('user_connections')
      .insert([
        {
          user_id: userId,
          connected_user_id: requestData.sender_id
        },
        {
          user_id: requestData.sender_id,
          connected_user_id: userId
        }
      ]);
    
    if (connectionError) {
      console.error('Error creating connection:', connectionError);
      toast({
        description: "Solicitação aceita, mas erro ao criar conexão",
        duration: 3000
      });
      return false;
    }
    
    toast({
      description: "Solicitação de amizade aceita!",
      duration: 3000
    });
    return true;
    
  } catch (e) {
    console.error('Error in acceptFriendRequest:', e);
    toast({
      description: "Erro ao aceitar solicitação de amizade",
      duration: 3000
    });
    return false;
  }
};

// Reject friend request
export const rejectFriendRequest = async (requestId: string): Promise<boolean> => {
  try {
    const userId = supabase.auth.getUser().data.user?.id;
    
    if (!userId) {
      toast({
        description: "Você precisa estar logado para rejeitar solicitações",
        duration: 3000
      });
      return false;
    }
    
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId)
      .eq('recipient_id', userId); // Make sure the user is the recipient
    
    if (error) {
      console.error('Error rejecting friend request:', error);
      toast({
        description: "Erro ao rejeitar solicitação de amizade",
        duration: 3000
      });
      return false;
    }
    
    toast({
      description: "Solicitação de amizade rejeitada",
      duration: 3000
    });
    return true;
    
  } catch (e) {
    console.error('Error in rejectFriendRequest:', e);
    toast({
      description: "Erro ao rejeitar solicitação de amizade",
      duration: 3000
    });
    return false;
  }
};
