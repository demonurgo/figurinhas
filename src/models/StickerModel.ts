
import { supabase } from "@/integrations/supabase/client";
import { SupabaseSticker } from "./StickerTypes";
import cacheManager from "@/hooks/useLocalCache";
// Removendo importação do serviço offline anterior

// Types for our sticker data
export interface Sticker {
  id: number;
  collected: boolean;
  photoUrl?: string;
  dateCollected?: string;
  notes?: string;
}

// Helper function to get stickers with cache-first strategy
export const getStickersByUserId = async (userId: string): Promise<Sticker[]> => {
  const cacheKey = `stickers_${userId}`;
  const maxAge = 1000 * 60 * 15; // 15 minutos cache
  
  try {
    // 1. Primeiro tenta buscar do cache local
    const cachedStickers = await cacheManager.get<Sticker[]>('stickers', cacheKey, maxAge);
    
    if (cachedStickers && cachedStickers.length > 0) {
      console.log('🎯 Stickers carregados do cache local');
      
      // Se offline, retorna cache
      if (!navigator.onLine) {
        return cachedStickers;
      }
      
      // Se online, busca em background para atualizar cache
      fetchAndCacheStickers(userId, cacheKey).catch(console.error);
      return cachedStickers;
    }
    
    // 2. Se não tem cache ou expirou, busca do Supabase
    return await fetchAndCacheStickers(userId, cacheKey);
    
  } catch (error) {
    console.error('Error in getStickersByUserId:', error);
    
    // Em caso de erro, tenta cache mesmo se expirado
    const fallbackCache = await cacheManager.get<Sticker[]>('stickers', cacheKey, Infinity);
    return fallbackCache || createDefaultStickers();
  }
};

// Função auxiliar para buscar e cachear stickers
const fetchAndCacheStickers = async (userId: string, cacheKey: string): Promise<Sticker[]> => {
  console.log('🌐 Buscando stickers do Supabase...');
  
  // Buscar stickers do Supabase
  const { data: supabaseStickers, error } = await supabase
    .from('stickers')
    .select('*')
    .eq('user_id', userId);
    
  if (error) {
    console.error('Error fetching stickers:', error);
    throw error;
  }
  
  // Initialize all 184 stickers
  const allStickers = createDefaultStickers();
  
  // If user has stickers in Supabase
  if (supabaseStickers && supabaseStickers.length > 0) {
    // Update the stickers that exist in the database
    supabaseStickers.forEach((dbSticker: SupabaseSticker) => {
      const index = dbSticker.sticker_number - 1;
      if (index >= 0 && index < 184) {
        allStickers[index] = {
          id: dbSticker.sticker_number,
          collected: dbSticker.collected,
          photoUrl: dbSticker.photo_url || undefined,
          dateCollected: dbSticker.date_collected,
          notes: dbSticker.notes || undefined
        };
      }
    });
  }
  
  // Salvar no cache
  await cacheManager.set('stickers', cacheKey, allStickers, 1000 * 60 * 30); // 30min cache
  console.log('💾 Stickers salvos no cache');
  
  return allStickers;
};

// Função para criar stickers padrão
const createDefaultStickers = (): Sticker[] => {
  return Array.from({ length: 184 }, (_, index) => ({
    id: index + 1,
    collected: false
  }));
};

// Helper function to update a sticker with optimistic updates
export const updateSticker = async (userId: string, sticker: Sticker): Promise<boolean> => {
  const cacheKey = `stickers_${userId}`;
  
  try {
    console.log("🔄 Atualizando figurinha:", sticker);
    
    // 1. Atualização otimista - atualiza cache local primeiro
    const cachedStickers = await cacheManager.get<Sticker[]>('stickers', cacheKey, Infinity);
    
    if (cachedStickers) {
      const updatedStickers = cachedStickers.map(s => 
        s.id === sticker.id ? { ...s, ...sticker } : s
      );
      
      // Salva imediatamente no cache local
      await cacheManager.set('stickers', cacheKey, updatedStickers, 1000 * 60 * 30);
      console.log('💾 Cache local atualizado otimisticamente');
    }
    
    // 2. Se online, sincroniza com Supabase
    if (navigator.onLine) {
      try {
        // Verifica se sticker já existe para este usuário
        const { data: existingSticker, error: checkError } = await supabase
          .from('stickers')
          .select('id')
          .eq('user_id', userId)
          .eq('sticker_number', sticker.id)
          .maybeSingle();
          
        if (checkError) {
          console.error('Erro ao verificar sticker:', checkError);
          // Mantém atualização local como válida
          return true;
        }
        
        const stickerData = {
          user_id: userId,
          sticker_number: sticker.id,
          collected: sticker.collected,
          photo_url: sticker.photoUrl || null,
          notes: sticker.notes || null,
          date_collected: sticker.collected ? (sticker.dateCollected || new Date().toISOString()) : null,
          updated_at: new Date().toISOString()
        };
        
        console.log("Dados para Supabase:", stickerData);
        
        if (existingSticker) {
          // Atualizar sticker existente
          const { error } = await supabase
            .from('stickers')
            .update(stickerData)
            .eq('id', existingSticker.id);
            
          if (error) {
            console.error('Erro ao atualizar no Supabase:', error);
            return true; // Mantém sucesso local
          }
        } else {
          // Inserir novo sticker
          const { error } = await supabase
            .from('stickers')
            .insert([stickerData]);
            
          if (error) {
            console.error('Erro ao inserir no Supabase:', error);
            return true; // Mantém sucesso local
          }
        }
        
        console.log('✅ Sticker sincronizado com Supabase');
        return true;
        
      } catch (supabaseError) {
        console.error('Erro na sincronização com Supabase:', supabaseError);
        return true; // Mantém sucesso local
      }
    } else {
      console.log('📴 Offline - sincronização adiada');
      return true; // Sucesso local
    }
  } catch (error) {
    console.error('Erro ao atualizar sticker:', error);
    return false;
  }
};

// Helper function to delete a sticker
export const deleteSticker = async (userId: string, stickerId: number): Promise<boolean> => {
  const cacheKey = `stickers_${userId}`;
  
  try {
    console.log('🗑️ Deletando sticker:', stickerId);
    
    // 1. Atualização otimista local
    const cachedStickers = await cacheManager.get<Sticker[]>('stickers', cacheKey, Infinity);
    
    if (cachedStickers) {
      const stickerIndex = cachedStickers.findIndex(s => s.id === stickerId);
      
      if (stickerIndex !== -1) {
        cachedStickers[stickerIndex] = {
          ...cachedStickers[stickerIndex],
          collected: false,
          photoUrl: undefined,
          dateCollected: undefined,
          notes: undefined
        };
        
        // Atualiza cache local imediatamente
        await cacheManager.set('stickers', cacheKey, cachedStickers, 1000 * 60 * 30);
        console.log('💾 Cache local atualizado - sticker deletado');
      }
    }
    
    // 2. Se online, sincroniza com Supabase
    if (navigator.onLine) {
      try {
        const { error } = await supabase
          .from('stickers')
          .delete()
          .eq('user_id', userId)
          .eq('sticker_number', stickerId);
          
        if (error) {
          console.error('Erro ao deletar no Supabase:', error);
          return true; // Mantém sucesso local
        }
        
        console.log('✅ Sticker deletado do Supabase');
      } catch (supabaseError) {
        console.error('Erro na deleção no Supabase:', supabaseError);
        return true; // Mantém sucesso local
      }
    } else {
      console.log('📴 Offline - deleção será sincronizada posteriormente');
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao deletar sticker:', error);
    return false;
  }
};

// Helper function to get stickers from a connection with cache
export const getConnectionStickers = async (connectionId: string): Promise<Sticker[]> => {
  const cacheKey = `connection_stickers_${connectionId}`;
  const maxAge = 1000 * 60 * 10; // 10 minutos cache para conexões
  
  try {
    // 1. Tentar cache primeiro
    const cachedStickers = await cacheManager.get<Sticker[]>('connections', cacheKey, maxAge);
    
    if (cachedStickers && cachedStickers.length > 0) {
      console.log('🎯 Stickers da conexão carregados do cache');
      
      // Se offline, retorna cache
      if (!navigator.onLine) {
        return cachedStickers;
      }
      
      // Se online, busca em background
      fetchConnectionStickers(connectionId, cacheKey).catch(console.error);
      return cachedStickers;
    }
    
    // 2. Se não tem cache ou expirou
    return await fetchConnectionStickers(connectionId, cacheKey);
    
  } catch (error) {
    console.error('Error in getConnectionStickers:', error);
    
    // Fallback para cache expirado
    const fallbackCache = await cacheManager.get<Sticker[]>('connections', cacheKey, Infinity);
    return fallbackCache || [];
  }
};

// Função auxiliar para buscar stickers da conexão
const fetchConnectionStickers = async (connectionId: string, cacheKey: string): Promise<Sticker[]> => {
  if (!navigator.onLine) {
    return [];
  }
  
  console.log('🌐 Buscando stickers da conexão do Supabase...');
  
  const { data: supabaseStickers, error } = await supabase
    .from('stickers')
    .select('*')
    .eq('user_id', connectionId);
    
  if (error) {
    console.error('Error fetching connection stickers:', error);
    throw error;
  }
  
  // Converter para formato frontend
  const stickers = (supabaseStickers || []).map((sticker: SupabaseSticker) => ({
    id: sticker.sticker_number,
    collected: sticker.collected,
    photoUrl: sticker.photo_url || undefined,
    dateCollected: sticker.date_collected,
    notes: sticker.notes || undefined
  }));
  
  // Salvar no cache
  await cacheManager.set('connections', cacheKey, stickers, 1000 * 60 * 15); // 15min cache
  console.log('💾 Stickers da conexão salvos no cache');
  
  return stickers;
};
