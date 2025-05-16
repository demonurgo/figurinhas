
// Types for our sticker data
export interface Sticker {
  id: number;
  collected: boolean;
  photoUrl?: string;
  dateCollected?: string;
  notes?: string;
}

// Sample local storage key
export const STICKERS_STORAGE_KEY = 'fernanda-pessoa-stickers';

// Helper function to get stickers from localStorage
export const getStickersByUserId = (userId: string): Sticker[] => {
  const storageKey = `${STICKERS_STORAGE_KEY}-${userId}`;
  const storedStickers = localStorage.getItem(storageKey);
  
  if (storedStickers) {
    return JSON.parse(storedStickers);
  }
  
  // Initialize 200 stickers if none exist
  const initialStickers: Sticker[] = Array.from({ length: 200 }, (_, index) => ({
    id: index + 1,
    collected: false
  }));
  
  localStorage.setItem(storageKey, JSON.stringify(initialStickers));
  return initialStickers;
};

// Helper function to update a sticker
export const updateSticker = (userId: string, sticker: Sticker): void => {
  const storageKey = `${STICKERS_STORAGE_KEY}-${userId}`;
  const stickers = getStickersByUserId(userId);
  
  const updatedStickers = stickers.map(s => 
    s.id === sticker.id ? sticker : s
  );
  
  localStorage.setItem(storageKey, JSON.stringify(updatedStickers));
};
