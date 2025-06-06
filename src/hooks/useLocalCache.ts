// src/hooks/useLocalCache.ts
import { useCallback, useEffect, useState } from 'react';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  version: number;
}

class LocalCacheManager {
  private dbName = 'FigurinhasCache';
  private version = 2;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Limpar stores antigas se existirem
        const storeNames = ['stickers', 'profiles', 'connections', 'images', 'friend_requests'];
        storeNames.forEach(storeName => {
          if (db.objectStoreNames.contains(storeName)) {
            db.deleteObjectStore(storeName);
          }
        });
        
        // Store para stickers do usuário
        const stickersStore = db.createObjectStore('stickers', { keyPath: 'cacheKey' });
        stickersStore.createIndex('userId', 'userId', { unique: false });
        
        // Store para perfis
        const profilesStore = db.createObjectStore('profiles', { keyPath: 'id' });
        
        // Store para conexões
        const connectionsStore = db.createObjectStore('connections', { keyPath: 'cacheKey' });
        
        // Store para cache de imagens
        const imagesStore = db.createObjectStore('images', { keyPath: 'url' });
        
        // Store para friend requests
        const friendRequestsStore = db.createObjectStore('friend_requests', { keyPath: 'cacheKey' });
      };
    });

    return this.initPromise;
  }

  async set<T>(storeName: string, key: string, data: T, ttl: number = 1000 * 60 * 30): Promise<void> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const cacheItem: CacheItem<T> & { cacheKey?: string; id?: string; url?: string } = {
        data,
        timestamp: Date.now(),
        version: this.version,
      };

      // Define a chave apropriada baseada no store
      if (storeName === 'images') {
        cacheItem.url = key;
      } else if (storeName === 'profiles') {
        cacheItem.id = key;
      } else {
        cacheItem.cacheKey = key;
      }
      
      const request = store.put(cacheItem);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(storeName: string, key: string, maxAge: number = 1000 * 60 * 30): Promise<T | null> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result as CacheItem<T> | undefined;
        
        if (!result) {
          resolve(null);
          return;
        }
        
        // Verificar se o cache não expirou
        const now = Date.now();
        if (now - result.timestamp > maxAge) {
          // Cache expirado, remover
          this.delete(storeName, key);
          resolve(null);
          return;
        }
        
        resolve(result.data);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, key: string): Promise<void> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName: string): Promise<void> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllByIndex<T>(storeName: string, indexName: string, value: string): Promise<T[]> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      
      const request = index.getAll(value);
      request.onsuccess = () => {
        const results = request.result as CacheItem<T>[];
        resolve(results.map(item => item.data));
      };
      request.onerror = () => reject(request.error);
    });
  }
}

const cacheManager = new LocalCacheManager();

export const useLocalCache = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const setCacheData = useCallback(async <T>(
    storeName: string, 
    key: string, 
    data: T, 
    ttl?: number
  ): Promise<void> => {
    try {
      await cacheManager.set(storeName, key, data, ttl);
    } catch (error) {
      console.warn('Erro ao salvar no cache:', error);
    }
  }, []);

  const getCacheData = useCallback(async <T>(
    storeName: string, 
    key: string, 
    maxAge?: number
  ): Promise<T | null> => {
    try {
      return await cacheManager.get<T>(storeName, key, maxAge);
    } catch (error) {
      console.warn('Erro ao buscar do cache:', error);
      return null;
    }
  }, []);

  const deleteCacheData = useCallback(async (storeName: string, key: string): Promise<void> => {
    try {
      await cacheManager.delete(storeName, key);
    } catch (error) {
      console.warn('Erro ao deletar do cache:', error);
    }
  }, []);

  const clearCache = useCallback(async (storeName: string): Promise<void> => {
    try {
      await cacheManager.clear(storeName);
    } catch (error) {
      console.warn('Erro ao limpar cache:', error);
    }
  }, []);

  return {
    isOnline,
    setCacheData,
    getCacheData,
    deleteCacheData,
    clearCache,
    cacheManager
  };
};

export default cacheManager;