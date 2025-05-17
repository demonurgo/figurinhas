
import { supabase } from "@/integrations/supabase/client";
import { SupabaseSticker } from "./StickerTypes";

// Types for our sticker data
export interface Sticker {
  id: number;
  collected: boolean;
  photoUrl?: string;
  dateCollected?: string;
  notes?: string;
  quantity: number;
}

// Helper function to get stickers from Supabase
export const getStickersByUserId = async (userId: string): Promise<Sticker[]> => {
  try {
    // First check if user has any stickers in Supabase
    const { data: supabaseStickers, error } = await supabase
      .from('stickers')
      .select('*')
      .eq('user_id', userId);
      
    if (error) {
      console.error('Error fetching stickers:', error);
      return [];
    }
    
    // Initialize all stickers (1-200)
    const allStickers: Sticker[] = Array.from({ length: 200 }, (_, index) => ({
      id: index + 1,
      collected: false,
      quantity: 0
    }));
    
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
            notes: dbSticker.notes || undefined,
            quantity: dbSticker.quantity || 1
          };
        }
      });
    }
    
    return allStickers;
  } catch (error) {
    console.error('Error in getStickersByUserId:', error);
    return [];
  }
};

// Helper function to update a sticker in Supabase
export const updateSticker = async (userId: string, sticker: Sticker): Promise<boolean> => {
  try {
    // Para depuração
    console.log("Atualizando figurinha:", sticker);
    
    // Check if sticker already exists for this user
    const { data: existingSticker, error: checkError } = await supabase
      .from('stickers')
      .select('id')
      .eq('user_id', userId)
      .eq('sticker_number', sticker.id)
      .maybeSingle();
      
    if (checkError) {
      console.error('Error checking sticker:', checkError);
      return false;
    }
    
    const stickerData = {
      user_id: userId,
      sticker_number: sticker.id,
      collected: sticker.collected,
      photo_url: sticker.photoUrl || null,
      notes: sticker.notes || null,
      date_collected: sticker.collected ? (sticker.dateCollected || new Date().toISOString()) : null,
      quantity: sticker.quantity || 1,
      updated_at: new Date().toISOString()
    };
    
    console.log("Dados para atualizar:", stickerData);
    
    let result;
    
    if (existingSticker) {
      // Update existing sticker
      const { error } = await supabase
        .from('stickers')
        .update(stickerData)
        .eq('id', existingSticker.id);
        
      if (error) {
        console.error('Error updating sticker:', error);
        return false;
      }
      
      result = true;
    } else {
      // Insert new sticker
      const { error } = await supabase
        .from('stickers')
        .insert([stickerData]);
        
      if (error) {
        console.error('Error inserting sticker:', error);
        return false;
      }
      
      result = true;
    }
    
    console.log("Atualização concluída com sucesso:", result);
    return result;
  } catch (error) {
    console.error('Error updating sticker:', error);
    return false;
  }
};

// Helper function to delete a sticker photo
export const deleteSticker = async (userId: string, stickerId: number): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('stickers')
      .delete()
      .eq('user_id', userId)
      .eq('sticker_number', stickerId);
      
    return !error;
  } catch (error) {
    console.error('Error deleting sticker:', error);
    return false;
  }
};

// Helper function to get stickers from a connection
export const getConnectionStickers = async (connectionId: string): Promise<Sticker[]> => {
  try {
    const { data: supabaseStickers, error } = await supabase
      .from('stickers')
      .select('*')
      .eq('user_id', connectionId);
      
    if (error) {
      console.error('Error fetching connection stickers:', error);
      return [];
    }
    
    // Convert to our frontend Sticker format
    return (supabaseStickers || []).map((sticker: SupabaseSticker) => ({
      id: sticker.sticker_number,
      collected: sticker.collected,
      photoUrl: sticker.photo_url || undefined,
      dateCollected: sticker.date_collected,
      notes: sticker.notes || undefined,
      quantity: sticker.quantity || 1
    }));
  } catch (error) {
    console.error('Error in getConnectionStickers:', error);
    return [];
  }
};
