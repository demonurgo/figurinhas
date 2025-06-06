
import { supabase } from "@/integrations/supabase/client";
import { Profile, ProfileWithStats, UserConnection } from "@/models/StickerTypes";
import cacheManager from "@/hooks/useLocalCache";

export const searchUsers = async (searchTerm: string): Promise<Profile[]> => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUserId = sessionData.session?.user.id;
    
    if (!searchTerm || searchTerm.length < 2) return [];
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .neq('id', currentUserId) // Exclude current user
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
  const cacheKey = `user_connections_${userId}`;
  const maxAge = 1000 * 60 * 5; // 5 minutos cache para conexões
  
  try {
    console.log('Buscando conexões para o usuário:', userId);
    
    // 1. Tentar cache primeiro
    const cachedConnections = await cacheManager.get<Profile[]>('connections', cacheKey, maxAge);
    
    if (cachedConnections && cachedConnections.length >= 0) { // Permite array vazio em cache
      console.log('🎯 Conexões carregadas do cache local');
      
      // Se offline, retorna cache
      if (!navigator.onLine) {
        return cachedConnections;
      }
      
      // Se online, busca em background para atualizar
      fetchAndCacheConnections(userId, cacheKey).catch(console.error);
      return cachedConnections;
    }
    
    // 2. Se não tem cache, busca do Supabase
    return await fetchAndCacheConnections(userId, cacheKey);
    
  } catch (error) {
    console.error('Erro em getUserConnections:', error);
    
    // Fallback para cache expirado
    const fallbackCache = await cacheManager.get<Profile[]>('connections', cacheKey, Infinity);
    return fallbackCache || [];
  }
};

// Função auxiliar para buscar e cachear conexões
const fetchAndCacheConnections = async (userId: string, cacheKey: string): Promise<Profile[]> => {
  console.log('🌐 Buscando conexões do Supabase...');
  
  // Buscar conexões onde o usuário é o user_id
  const { data: outgoingConnections, error: outgoingError } = await supabase
    .from('user_connections')
    .select('connected_user_id')
    .eq('user_id', userId);
    
  // Buscar conexões onde o usuário é o connected_user_id
  const { data: incomingConnections, error: incomingError } = await supabase
    .from('user_connections')
    .select('user_id')
    .eq('connected_user_id', userId);
    
  if (outgoingError) {
    console.error('Erro ao buscar conexões de saída:', outgoingError);
  }
  
  if (incomingError) {
    console.error('Erro ao buscar conexões de entrada:', incomingError);
  }
  
  console.log('Conexões de saída encontradas:', outgoingConnections?.length || 0);
  console.log('Conexões de entrada encontradas:', incomingConnections?.length || 0);
  
  if ((!outgoingConnections || outgoingConnections.length === 0) && 
      (!incomingConnections || incomingConnections.length === 0)) {
    console.log('Nenhuma conexão encontrada para o usuário:', userId);
    
    // Cachear resultado vazio também
    await cacheManager.set('connections', cacheKey, [], 1000 * 60 * 10); // 10min cache
    return [];
  }
  
  // Combinar os dois conjuntos de IDs de usuários conectados
  const connectedIdsSet = new Set<string>();
  
  // Adicionar IDs dos usuários para os quais este usuário tem conexões de saída
  outgoingConnections?.forEach(conn => {
    connectedIdsSet.add(conn.connected_user_id);
  });
  
  // Adicionar IDs dos usuários que têm conexões com este usuário
  incomingConnections?.forEach(conn => {
    connectedIdsSet.add(conn.user_id);
  });
  
  const connectedIds = Array.from(connectedIdsSet);
  
  console.log('IDs únicos de usuários conectados:', connectedIds);
  
  if (connectedIds.length === 0) {
    await cacheManager.set('connections', cacheKey, [], 1000 * 60 * 10); // 10min cache
    return [];
  }
  
  // Buscar perfis dos usuários conectados
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .in('id', connectedIds);
    
  if (profilesError) {
    console.error('Erro ao buscar perfis das conexões:', profilesError);
    throw profilesError;
  }
  
  console.log('Perfis das conexões encontrados:', profiles?.length || 0);
  
  const connections = profiles || [];
  
  // Salvar no cache
  await cacheManager.set('connections', cacheKey, connections, 1000 * 60 * 10); // 10min cache
  console.log('💾 Conexões salvas no cache');
  
  return connections;
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
    console.log(`Removendo conexão: user_id=${userId}, connected_user_id=${connectionId}`);
    
    let successCount = 0;
    
    // Primeiro, removemos a conexão no sentido userId -> connectionId (se existir)
    const { data: outgoingConnection, error: queryError } = await supabase
      .from('user_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('connected_user_id', connectionId);
      
    if (queryError) {
      console.error('Erro ao consultar conexão de saída:', queryError);
    } else if (outgoingConnection && outgoingConnection.length > 0) {
      console.log('Conexão de saída encontrada:', outgoingConnection[0].id);
      
      const { error: deleteError } = await supabase
        .from('user_connections')
        .delete()
        .eq('id', outgoingConnection[0].id);
        
      if (deleteError) {
        console.error('Erro ao remover conexão de saída:', deleteError);
      } else {
        console.log('Conexão de saída removida com sucesso');
        successCount++;
      }
    } else {
      console.log('Nenhuma conexão de saída encontrada');
    }
    
    // Segundo, verificar e remover a conexão no sentido inverso: connectionId -> userId (se existir)
    const { data: incomingConnection, error: queryError2 } = await supabase
      .from('user_connections')
      .select('id')
      .eq('user_id', connectionId)
      .eq('connected_user_id', userId);
      
    if (queryError2) {
      console.error('Erro ao consultar conexão de entrada:', queryError2);
    } else if (incomingConnection && incomingConnection.length > 0) {
      console.log('Conexão de entrada encontrada:', incomingConnection[0].id);
      
      const { error: deleteError2 } = await supabase
        .from('user_connections')
        .delete()
        .eq('id', incomingConnection[0].id);
        
      if (deleteError2) {
        console.error('Erro ao remover conexão de entrada:', deleteError2);
      } else {
        console.log('Conexão de entrada removida com sucesso');
        successCount++;
      }
    } else {
      console.log('Nenhuma conexão de entrada encontrada');
    }
    
    // Consideramos bem-sucedido se pelo menos uma das conexões foi removida
    return successCount > 0;
  } catch (error) {
    console.error('Error in removeConnection:', error);
    return false;
  }
};

export const checkConnection = async (userId: string, connectionId: string): Promise<boolean> => {
  try {
    // Verificar se existe conexão no sentido userId -> connectionId
    const { data: outgoing, error: outgoingError } = await supabase
      .from('user_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('connected_user_id', connectionId)
      .maybeSingle();
      
    if (outgoingError) {
      console.error('Erro ao verificar conexão de saída:', outgoingError);
    } else if (outgoing) {
      // Se encontrou uma conexão de saída, já é suficiente
      return true;
    }
    
    // Se não encontrou, verificar no sentido inverso: connectionId -> userId
    const { data: incoming, error: incomingError } = await supabase
      .from('user_connections')
      .select('id')
      .eq('user_id', connectionId)
      .eq('connected_user_id', userId)
      .maybeSingle();
      
    if (incomingError) {
      console.error('Erro ao verificar conexão de entrada:', incomingError);
      return false;
    }
    
    // Retornar true se encontrou alguma conexão (entrada ou saída)
    return !!incoming || !!outgoing;
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
    const missingStickers = 184 - totalStickers;
    
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

export const getFriendRequests = async (userId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('friend_requests')
      .select(`
        *,
        sender:sender_id(id, username, full_name, avatar_url)
      `)
      .eq('recipient_id', userId)
      .eq('status', 'pending');
      
    if (error) {
      console.error('Error getting friend requests:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getFriendRequests:', error);
    return [];
  }
};
