
import { supabase } from "@/integrations/supabase/client";
import { SupabaseSticker } from "./StickerTypes";
import { storeStickers, getStickers, queueStickerUpdate, isOnline } from "@/services/OfflineDataService";

// Types for our sticker data
export interface Sticker {
  id: number;
  collected: boolean;
  photoUrl?: string;
  dateCollected?: string;
  notes?: string;
  quantity: number;
}

// Helper function to get stickers from Supabase or IndexedDB when offline
export const getStickersByUserId = async (userId: string): Promise<Sticker[]> => {
  try {
    // Check if online
    if (isOnline()) {
      // Fetch from Supabase
      const { data: supabaseStickers, error } = await supabase
        .from('stickers')
        .select('*')
        .eq('user_id', userId);
        
      if (error) {
        console.error('Error fetching stickers from Supabase:', error);
        // Fall back to local cache on error
        const localStickers = await getStickers();
        if (localStickers.length > 0) {
          return localStickers;
        }
      } else {
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
        
        // Save to local cache
        await storeStickers(allStickers);
        
        return allStickers;
      }
    }
    
    // If offline or fallback needed, get from IndexedDB
    const offlineStickers = await getStickers();
    
    // If we have stickers in IndexedDB, return them
    if (offlineStickers.length > 0) {
      return offlineStickers;
    }
    
    // If nothing in IndexedDB, create default empty stickers
    const defaultStickers: Sticker[] = Array.from({ length: 200 }, (_, index) => ({
      id: index + 1,
      collected: false,
      quantity: 0
    }));
    
    // Store these default stickers
    await storeStickers(defaultStickers);
    
    return defaultStickers;
  } catch (error) {
    console.error('Error in getStickersByUserId:', error);
    
    // Last resort - return empty stickers array
    return Array.from({ length: 200 }, (_, index) => ({
      id: index + 1,
      collected: false,
      quantity: 0
    }));
  }
};

// Helper function to update a sticker in Supabase or queue for offline sync
export const updateSticker = async (userId: string, sticker: Sticker): Promise<boolean> => {
  try {
    // For debugging
    console.log("Updating sticker:", sticker);
    
    // Update local storage first
    const allStickers = await getStickers();
    const updatedStickers = allStickers.map(s => 
      s.id === sticker.id ? { ...s, ...sticker } : s
    );
    await storeStickers(updatedStickers);
    
    // If online, sync with Supabase
    if (isOnline()) {
      // Check if sticker already exists for this user
      const { data: existingSticker, error: checkError } = await supabase
        .from('stickers')
        .select('id')
        .eq('user_id', userId)
        .eq('sticker_number', sticker.id)
        .maybeSingle();
        
      if (checkError) {
        console.error('Error checking sticker:', checkError);
        // Queue for later sync
        await queueStickerUpdate(userId, sticker);
        return true; // Return true because local update succeeded
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
          console.error('Error updating sticker in Supabase:', error);
          // Queue for later sync
          await queueStickerUpdate(userId, sticker);
          return true; // Return true because local update succeeded
        }
        
        result = true;
      } else {
        // Insert new sticker
        const { error } = await supabase
          .from('stickers')
          .insert([stickerData]);
          
        if (error) {
          console.error('Error inserting sticker in Supabase:', error);
          // Queue for later sync
          await queueStickerUpdate(userId, sticker);
          return true; // Return true because local update succeeded
        }
        
        result = true;
      }
      
      console.log("Sticker update completed successfully:", result);
      return result;
    } else {
      // If offline, queue for later sync
      await queueStickerUpdate(userId, sticker);
      return true; // Local update succeeded
    }
  } catch (error) {
    console.error('Error updating sticker:', error);
    // Try to queue for later sync
    try {
      await queueStickerUpdate(userId, sticker);
    } catch (queueError) {
      console.error('Failed to queue sticker update:', queueError);
    }
    return false;
  }
};

// Helper function to delete a sticker photo
export const deleteSticker = async (userId: string, stickerId: number): Promise<boolean> => {
  try {
    // Update local data first
    const allStickers = await getStickers();
    const stickerIndex = allStickers.findIndex(s => s.id === stickerId);
    
    if (stickerIndex !== -1) {
      allStickers[stickerIndex] = {
        ...allStickers[stickerIndex],
        collected: false,
        photoUrl: undefined,
        dateCollected: undefined,
        quantity: 0
      };
      
      await storeStickers(allStickers);
      
      // If online, sync with Supabase
      if (isOnline()) {
        const { error } = await supabase
          .from('stickers')
          .delete()
          .eq('user_id', userId)
          .eq('sticker_number', stickerId);
          
        if (error) {
          console.error('Error deleting sticker from Supabase:', error);
          // Queue delete operation for later
          await queueStickerUpdate(userId, { 
            id: stickerId, 
            collected: false,
            quantity: 0 
          });
        }
      } else {
        // If offline, queue delete operation for later
        await queueStickerUpdate(userId, { 
          id: stickerId, 
          collected: false,
          quantity: 0 
        });
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error deleting sticker:', error);
    return false;
  }
};

// Helper function to get stickers from a connection
export const getConnectionStickers = async (connectionId: string): Promise<Sticker[]> => {
  try {
    // This requires online connectivity - no offline support
    if (!isOnline()) {
      return [];
    }
    
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
