// Storage utilities for managing speaker profiles using IndexedDB

import { SpeakerProfile } from '@/types';

const DB_NAME = 'VoiceIdentificationDB';
const DB_VERSION = 1;
const STORE_NAME = 'speakerProfiles';

class SpeakerStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create the speaker profiles store
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: true });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  async saveSpeakerProfile(profile: SpeakerProfile): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // Convert Int32Array to regular array for storage
      const profileToStore = {
        ...profile,
        voiceprint: Array.from(profile.voiceprint),
        createdAt: profile.createdAt.toISOString(),
        lastUpdated: profile.lastUpdated.toISOString(),
      };

      const request = store.put(profileToStore);

      request.onerror = () => {
        reject(new Error('Failed to save speaker profile'));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async getSpeakerProfile(id: string): Promise<SpeakerProfile | null> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onerror = () => {
        reject(new Error('Failed to get speaker profile'));
      };

      request.onsuccess = () => {
        if (request.result) {
          const profile = {
            ...request.result,
            voiceprint: new Int32Array(request.result.voiceprint),
            createdAt: new Date(request.result.createdAt),
            lastUpdated: new Date(request.result.lastUpdated),
          };
          resolve(profile);
        } else {
          resolve(null);
        }
      };
    });
  }

  async getAllSpeakerProfiles(): Promise<SpeakerProfile[]> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => {
        reject(new Error('Failed to get speaker profiles'));
      };

      request.onsuccess = () => {
        const profiles = request.result.map((profile: any) => ({
          ...profile,
          voiceprint: new Int32Array(profile.voiceprint),
          createdAt: new Date(profile.createdAt),
          lastUpdated: new Date(profile.lastUpdated),
        }));
        resolve(profiles);
      };
    });
  }

  async deleteSpeakerProfile(id: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => {
        reject(new Error('Failed to delete speaker profile'));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async getSpeakerByName(name: string): Promise<SpeakerProfile | null> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('name');
      const request = index.get(name);

      request.onerror = () => {
        reject(new Error('Failed to get speaker profile by name'));
      };

      request.onsuccess = () => {
        if (request.result) {
          const profile = {
            ...request.result,
            voiceprint: new Int32Array(request.result.voiceprint),
            createdAt: new Date(request.result.createdAt),
            lastUpdated: new Date(request.result.lastUpdated),
          };
          resolve(profile);
        } else {
          resolve(null);
        }
      };
    });
  }

  async clearAllProfiles(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => {
        reject(new Error('Failed to clear speaker profiles'));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }
}

// Export a singleton instance
export const speakerStorage = new SpeakerStorage(); 