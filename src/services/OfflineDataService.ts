
import { supabase } from "@/integrations/supabase/client";
import { Sticker } from "@/models/StickerModel";
import { Profile } from "@/models/StickerTypes";
import { updateProfile } from "@/services/ProfileService";

// Database configuration
const DB_NAME = 'figurinhas-offline-db';
const DB_VERSION = 1;
const STORES = {
  STICKERS: 'stickers',
  PROFILE: 'profile',
  PENDING_UPLOADS: 'pendingUploads',
  PENDING_ACTIONS: 'pendingActions'
};

// Open the database
export const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create the object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.STICKERS)) {
        db.createObjectStore(STORES.STICKERS, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(STORES.PROFILE)) {
        db.createObjectStore(STORES.PROFILE, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(STORES.PENDING_UPLOADS)) {
        const pendingUploadsStore = db.createObjectStore(STORES.PENDING_UPLOADS, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        pendingUploadsStore.createIndex('userId', 'userId', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.PENDING_ACTIONS)) {
        const pendingActionsStore = db.createObjectStore(STORES.PENDING_ACTIONS, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        pendingActionsStore.createIndex('type', 'type', { unique: false });
      }
    };
    
    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };
    
    request.onerror = (event) => {
      console.error('Error opening IndexedDB:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

// Store stickers in IndexedDB
export const storeStickers = async (stickers: Sticker[]): Promise<boolean> => {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(STORES.STICKERS, 'readwrite');
    const store = transaction.objectStore(STORES.STICKERS);
    
    stickers.forEach(sticker => {
      store.put(sticker);
    });
    
    return new Promise((resolve) => {
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => resolve(false);
    });
  } catch (error) {
    console.error('Error storing stickers in IndexedDB:', error);
    return false;
  }
};

// Get stickers from IndexedDB
export const getStickers = async (): Promise<Sticker[]> => {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(STORES.STICKERS, 'readonly');
    const store = transaction.objectStore(STORES.STICKERS);
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting stickers from IndexedDB:', error);
    return [];
  }
};

// Store profile in IndexedDB
export const storeProfile = async (profile: Profile): Promise<boolean> => {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(STORES.PROFILE, 'readwrite');
    const store = transaction.objectStore(STORES.PROFILE);
    
    store.put(profile);
    
    return new Promise((resolve) => {
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => resolve(false);
    });
  } catch (error) {
    console.error('Error storing profile in IndexedDB:', error);
    return false;
  }
};

// Get profile from IndexedDB
export const getProfile = async (userId: string): Promise<Profile | null> => {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(STORES.PROFILE, 'readonly');
    const store = transaction.objectStore(STORES.PROFILE);
    const request = store.get(userId);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting profile from IndexedDB:', error);
    return null;
  }
};

// Queue a sticker update for when online
export const queueStickerUpdate = async (userId: string, sticker: Sticker): Promise<boolean> => {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(STORES.PENDING_ACTIONS, 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_ACTIONS);
    
    // Store the action to be performed when online
    const pendingAction = {
      type: 'UPDATE_STICKER',
      userId,
      data: sticker,
      timestamp: new Date().getTime()
    };
    
    store.add(pendingAction);
    
    return new Promise((resolve) => {
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => resolve(false);
    });
  } catch (error) {
    console.error('Error queuing sticker update:', error);
    return false;
  }
};

// Queue a profile update for when online
export const queueProfileUpdate = async (userId: string, profile: Partial<Profile>): Promise<boolean> => {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(STORES.PENDING_ACTIONS, 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_ACTIONS);
    
    // Store the action to be performed when online
    const pendingAction = {
      type: 'UPDATE_PROFILE',
      userId,
      data: profile,
      timestamp: new Date().getTime()
    };
    
    store.add(pendingAction);
    
    return new Promise((resolve) => {
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => resolve(false);
    });
  } catch (error) {
    console.error('Error queuing profile update:', error);
    return false;
  }
};

// Queue a photo upload for when online
export const queuePhotoUpload = async (userId: string, stickerId: number, photoData: string): Promise<boolean> => {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(STORES.PENDING_UPLOADS, 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_UPLOADS);
    
    // Store the photo data to be uploaded when online
    const pendingUpload = {
      userId,
      stickerId,
      photoData, // Base64 data
      timestamp: new Date().getTime()
    };
    
    store.add(pendingUpload);
    
    return new Promise((resolve) => {
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => resolve(false);
    });
  } catch (error) {
    console.error('Error queuing photo upload:', error);
    return false;
  }
};

// Sync all pending actions with Supabase
export const syncPendingActions = async (): Promise<boolean> => {
  try {
    const db = await openDatabase();
    
    // First, get all pending actions
    const pendingActions = await new Promise<any[]>((resolve, reject) => {
      const transaction = db.transaction(STORES.PENDING_ACTIONS, 'readonly');
      const store = transaction.objectStore(STORES.PENDING_ACTIONS);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    
    if (!pendingActions.length) {
      return true; // Nothing to sync
    }
    
    // Sort actions by timestamp (oldest first)
    pendingActions.sort((a, b) => a.timestamp - b.timestamp);
    
    // Process each action
    const processed: number[] = [];
    
    for (const action of pendingActions) {
      let success = false;
      
      if (action.type === 'UPDATE_STICKER') {
        // Import the function dynamically to avoid circular dependencies
        const { updateSticker } = await import('@/models/StickerModel');
        success = await updateSticker(action.userId, action.data);
      }
      else if (action.type === 'UPDATE_PROFILE') {
        // Use the imported updateProfile function
        success = !!(await updateProfile(action.data));
      }
      
      if (success) {
        processed.push(action.id);
      }
    }
    
    // Remove processed actions
    if (processed.length > 0) {
      const deleteTransaction = db.transaction(STORES.PENDING_ACTIONS, 'readwrite');
      const deleteStore = deleteTransaction.objectStore(STORES.PENDING_ACTIONS);
      
      for (const id of processed) {
        deleteStore.delete(id);
      }
      
      await new Promise<void>((resolve) => {
        deleteTransaction.oncomplete = () => resolve();
        deleteTransaction.onerror = () => resolve();
      });
    }
    
    // If all actions were processed successfully
    return processed.length === pendingActions.length;
  } catch (error) {
    console.error('Error syncing pending actions:', error);
    return false;
  }
};

// Sync all pending uploads with Supabase
export const syncPendingUploads = async (): Promise<boolean> => {
  try {
    const db = await openDatabase();
    
    // Get all pending uploads
    const pendingUploads = await new Promise<any[]>((resolve, reject) => {
      const transaction = db.transaction(STORES.PENDING_UPLOADS, 'readonly');
      const store = transaction.objectStore(STORES.PENDING_UPLOADS);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    
    if (!pendingUploads.length) {
      return true; // Nothing to upload
    }
    
    // Process each upload
    const processed: number[] = [];
    
    for (const upload of pendingUploads) {
      try {
        const { userId, stickerId, photoData } = upload;
        
        // Decode base64 to file
        const res = await fetch(photoData);
        const blob = await res.blob();
        const file = new File([blob], `sticker-${stickerId}.jpg`, { type: 'image/jpeg' });
        
        // Upload to Supabase Storage
        const filePath = `${userId}/stickers/${stickerId}`;
        const { data, error } = await supabase.storage
          .from('stickers')
          .upload(filePath, file, { upsert: true });
        
        if (error) {
          console.error('Error uploading file to Supabase:', error);
          continue;
        }
        
        // Get the public URL
        const { data: { publicUrl } } = supabase.storage
          .from('stickers')
          .getPublicUrl(filePath);
        
        // Update the sticker with the new photo URL
        const { updateSticker } = await import('@/models/StickerModel');
        const sticker = {
          id: stickerId,
          collected: true,
          photoUrl: publicUrl,
          quantity: 1
        };
        
        const success = await updateSticker(userId, sticker);
        if (success) {
          processed.push(upload.id);
        }
      } catch (error) {
        console.error('Error processing upload:', error);
      }
    }
    
    // Remove processed uploads
    if (processed.length > 0) {
      const deleteTransaction = db.transaction(STORES.PENDING_UPLOADS, 'readwrite');
      const deleteStore = deleteTransaction.objectStore(STORES.PENDING_UPLOADS);
      
      for (const id of processed) {
        deleteStore.delete(id);
      }
      
      await new Promise<void>((resolve) => {
        deleteTransaction.oncomplete = () => resolve();
        deleteTransaction.onerror = () => resolve();
      });
    }
    
    return processed.length === pendingUploads.length;
  } catch (error) {
    console.error('Error syncing pending uploads:', error);
    return false;
  }
};

// Check online status
export const isOnline = (): boolean => {
  return navigator.onLine;
};

// Register for service worker sync when back online
export const registerSync = async (): Promise<void> => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check if sync is supported
      if ('sync' in registration) {
        await registration.sync.register('sync-stickers');
      } else {
        // Manually sync if background sync is not supported
        void syncPendingActions();
        void syncPendingUploads();
      }
    } catch (error) {
      console.error('Error registering sync:', error);
      // Manually sync if background sync registration fails
      void syncPendingActions();
      void syncPendingUploads();
    }
  } else {
    // Manually sync if service worker is not supported
    void syncPendingActions();
    void syncPendingUploads();
  }
};

// Listen for online status changes
export const setupOfflineSync = (): void => {
  window.addEventListener('online', () => {
    console.log('App is back online. Starting sync...');
    void registerSync();
    
    // Notify the service worker
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'ONLINE_STATUS_CHANGE',
        online: true
      });
    }
  });
  
  window.addEventListener('offline', () => {
    console.log('App is offline. Changes will be synced when online.');
    
    // Notify the service worker
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'ONLINE_STATUS_CHANGE',
        online: false
      });
    }
  });
  
  // Initial sync if online
  if (navigator.onLine) {
    void registerSync();
  }
};

// Initialize the offline service
export const initOfflineService = async (): Promise<void> => {
  try {
    // Initialize IndexedDB
    await openDatabase();
    
    // Setup online/offline listeners
    setupOfflineSync();
    
    console.log('Offline data service initialized successfully');
  } catch (error) {
    console.error('Error initializing offline data service:', error);
  }
};
