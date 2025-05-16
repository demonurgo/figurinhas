
import { supabase } from "@/integrations/supabase/client";
import { Profile, ProfileWithStats, UserConnection } from "@/models/StickerTypes";

export const searchUsers = async (searchTerm: string): Promise<Profile[]> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
      .limit(10);
      
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

export const getUserConnections = async (userId: string): Promise<Profile[]> => {
  try {
    // Get user connections
    const { data: connections, error } = await supabase
      .from('user_connections')
      .select('connected_user_id')
      .eq('user_id', userId);
      
    if (error) {
      console.error('Error getting connections:', error);
      return [];
    }
    
    if (!connections || connections.length === 0) {
      return [];
    }
    
    // Get profiles of connections
    const connectedIds = connections.map(c => c.connected_user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', connectedIds);
      
    if (profilesError) {
      console.error('Error getting connection profiles:', profilesError);
      return [];
    }
    
    return profiles || [];
  } catch (error) {
    console.error('Error in getUserConnections:', error);
    return [];
  }
};

export const addConnection = async (userId: string, connectionId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_connections')
      .insert([
        { user_id: userId, connected_user_id: connectionId }
      ]);
      
    if (error) {
      console.error('Error adding connection:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in addConnection:', error);
    return false;
  }
};

export const removeConnection = async (userId: string, connectionId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_connections')
      .delete()
      .eq('user_id', userId)
      .eq('connected_user_id', connectionId);
      
    if (error) {
      console.error('Error removing connection:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in removeConnection:', error);
    return false;
  }
};

export const checkConnection = async (userId: string, connectionId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('user_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('connected_user_id', connectionId)
      .maybeSingle();
      
    if (error) {
      console.error('Error checking connection:', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error('Error in checkConnection:', error);
    return false;
  }
};

export const getProfileWithStats = async (userId: string): Promise<ProfileWithStats | null> => {
  try {
    // Get profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error) {
      console.error('Error getting profile:', error);
      return null;
    }
    
    // Get sticker stats
    const { data: stickers, error: stickersError } = await supabase
      .from('stickers')
      .select('collected')
      .eq('user_id', userId);
      
    if (stickersError) {
      console.error('Error getting sticker stats:', stickersError);
      return null;
    }
    
    const totalStickers = stickers ? stickers.length : 0;
    const missingStickers = 200 - totalStickers;
    
    return {
      ...profile,
      totalStickers,
      missingStickers
    };
  } catch (error) {
    console.error('Error in getProfileWithStats:', error);
    return null;
  }
};
