
import { supabase } from "@/integrations/supabase/client";
import { SupabaseSticker } from "./StickerTypes";

// Types for our sticker data
export interface Sticker {
  id: number;
  collected: boolean;
  photoUrl?: string;
  dateCollected?: string;
  notes?: string;
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
    
    // If user has stickers in Supabase
    if (supabaseStickers && supabaseStickers.length > 0) {
      // Convert to our frontend Sticker format
      return supabaseStickers.map((sticker: SupabaseSticker) => ({
        id: sticker.sticker_number,
        collected: sticker.collected,
        photoUrl: sticker.photo_url || undefined,
        dateCollected: sticker.date_collected,
        notes: sticker.notes || undefined
      }));
    }
    
    // If no stickers in Supabase, initialize 200 stickers
    const initialStickers: Sticker[] = Array.from({ length: 200 }, (_, index) => ({
      id: index + 1,
      collected: false
    }));
    
    return initialStickers;
  } catch (error) {
    console.error('Error in getStickersByUserId:', error);
    return [];
  }
};

// Helper function to update a sticker in Supabase
export const updateSticker = async (userId: string, sticker: Sticker): Promise<boolean> => {
  try {
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
      updated_at: new Date().toISOString()
    };
    
    let result;
    
    if (existingSticker) {
      // Update existing sticker
      const { error } = await supabase
        .from('stickers')
        .update(stickerData)
        .eq('id', existingSticker.id);
        
      result = !error;
    } else {
      // Insert new sticker
      const { error } = await supabase
        .from('stickers')
        .insert([stickerData]);
        
      result = !error;
    }
    
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
      notes: sticker.notes || undefined
    }));
  } catch (error) {
    console.error('Error in getConnectionStickers:', error);
    return [];
  }
};
