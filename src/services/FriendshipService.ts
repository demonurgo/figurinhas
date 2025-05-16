import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/models/StickerTypes";
import { toast } from "@/components/ui/use-toast";

export interface FriendRequest {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  sender?: Profile;
  recipient?: Profile;
}

export const getPendingFriendRequestCount = async (): Promise<number> => {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) return 0;
    
    const { data, error } = await supabase
      .from('friend_requests')
      .select('id')
      .eq('recipient_id', user.data.user.id)
      .eq('status', 'pending');
      
    if (error) {
      console.error('Error getting friend request count:', error);
      return 0;
    }
    
    return data?.length || 0;
  } catch (error) {
    console.error('Error in getPendingFriendRequestCount:', error);
    return 0;
  }
};

export const searchUsers = async (searchTerm: string): Promise<Profile[]> => {
  if (!searchTerm || searchTerm.length < 2) return [];
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .limit(15);
      
    if (error) {
      console.error('Error searching users:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in searchUsers:', error);
    return [];
  }
};

export const sendFriendRequest = async (recipientId: string): Promise<boolean> => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData || !userData.user) {
      console.error('Error getting current user:', userError);
      toast({
        title: "Erro",
        description: "Não foi possível identificar o usuário atual.",
        variant: "destructive"
      });
      return false;
    }
    
    const senderId = userData.user.id;
    
    // Check if request already exists
    const { data: existingRequests, error: checkError } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`and(sender_id.eq.${senderId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${senderId})`);
    
    if (checkError) {
      console.error('Error checking existing requests:', checkError);
      return false;
    }
    
    if (existingRequests && existingRequests.length > 0) {
      toast({
        title: "Solicitação já existe",
        description: "Já existe uma solicitação de amizade entre vocês.",
        variant: "destructive"
      });
      return false;
    }
    
    // Insert new friend request
    const { error } = await supabase
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
        title: "Erro",
        description: "Não foi possível enviar a solicitação de amizade.",
        variant: "destructive"
      });
      return false;
    }
    
    toast({
      title: "Solicitação enviada",
      description: "Solicitação de amizade enviada com sucesso!"
    });
    
    return true;
  } catch (error) {
    console.error('Error in sendFriendRequest:', error);
    return false;
  }
};

export const getPendingFriendRequests = async (): Promise<FriendRequest[]> => {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) return [];
    
    const { data, error } = await supabase
      .from('friend_requests')
      .select('*, sender:profiles!friend_requests_sender_id_fkey(*)')
      .eq('recipient_id', user.data.user.id)
      .eq('status', 'pending');
      
    if (error) {
      console.error('Error getting friend requests:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getPendingFriendRequests:', error);
    return [];
  }
};

export const respondToFriendRequest = async (requestId: string, accept: boolean): Promise<boolean> => {
  try {
    const newStatus = accept ? 'accepted' : 'rejected';
    
    // Update request status
    const { error: updateError } = await supabase
      .from('friend_requests')
      .update({ status: newStatus })
      .eq('id', requestId);
      
    if (updateError) {
      console.error('Error updating friend request:', updateError);
      return false;
    }
    
    // If accepted, create connection in both directions
    if (accept) {
      // Get the friend request details first
      const { data: requestData, error: fetchError } = await supabase
        .from('friend_requests')
        .select('sender_id, recipient_id')
        .eq('id', requestId)
        .single();
      
      if (fetchError || !requestData) {
        console.error('Error fetching friend request details:', fetchError);
        return false;
      }
      
      // Create connections both ways
      const { error: connectionError } = await supabase
        .from('user_connections')
        .insert([
          { 
            user_id: requestData.recipient_id, 
            connected_user_id: requestData.sender_id 
          },
          { 
            user_id: requestData.sender_id, 
            connected_user_id: requestData.recipient_id 
          }
        ]);
        
      if (connectionError) {
        console.error('Error creating connection:', connectionError);
        return false;
      }
    }
    
    toast({
      title: accept ? "Amizade aceita" : "Solicitação recusada",
      description: accept 
        ? "Vocês agora são amigos!" 
        : "A solicitação de amizade foi recusada."
    });
    
    return true;
  } catch (error) {
    console.error('Error in respondToFriendRequest:', error);
    return false;
  }
};