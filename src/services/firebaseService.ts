import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Firestore,
  Unsubscribe
} from 'firebase/firestore';
import { FamilyMember, GalleryItem, UpdateMemberInput } from '../types/member';
import { getActiveFirebaseConfig } from './firebaseConfig';

class FirebaseService {
  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;
  private isInitialized = false;

  constructor() {
    this.init();
  }

  public isAvailable(): boolean {
    return this.isInitialized && this.db !== null;
  }

  public reloadConfig(): boolean {
    this.app = null;
    this.db = null;
    this.isInitialized = false;
    this.init();
    return this.isAvailable();
  }

  private init() {
    const config = getActiveFirebaseConfig();
    if (!config || !config.projectId || !config.apiKey || config.apiKey === 'AIzaSy...') {
      this.isInitialized = false;
      this.db = null;
      return;
    }

    try {
      this.app = getApps().length > 0 ? getApp() : initializeApp(config);
      this.db = getFirestore(this.app);
      this.isInitialized = true;
      console.log('🔥 Firebase Cloud Firestore connected successfully.');
    } catch (err) {
      console.warn('⚠️ Could not initialize Firebase Firestore:', err);
      this.isInitialized = false;
      this.db = null;
    }
  }

  // ==========================================
  // MEMBERS API
  // ==========================================

  public async getMembers(): Promise<FamilyMember[]> {
    if (!this.db) throw new Error('Firebase DB not initialized');
    const colRef = collection(this.db, 'members');
    const q = query(colRef, orderBy('created_at', 'asc'));
    const snapshot = await getDocs(q);
    const members: FamilyMember[] = [];
    snapshot.forEach((docSnap) => {
      members.push(docSnap.data() as FamilyMember);
    });
    return members;
  }

  public subscribeMembers(callback: (members: FamilyMember[]) => void): Unsubscribe | null {
    if (!this.db) return null;
    const colRef = collection(this.db, 'members');
    const q = query(colRef, orderBy('created_at', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const members: FamilyMember[] = [];
      snapshot.forEach((docSnap) => {
        members.push(docSnap.data() as FamilyMember);
      });
      callback(members);
    });
  }

  public async getMemberById(id: string): Promise<FamilyMember | null> {
    if (!this.db) throw new Error('Firebase DB not initialized');
    const docRef = doc(this.db, 'members', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as FamilyMember;
    }
    return null;
  }

  public async createMember(member: FamilyMember): Promise<FamilyMember> {
    if (!this.db) throw new Error('Firebase DB not initialized');
    const docRef = doc(this.db, 'members', member.id);
    await setDoc(docRef, member);
    return member;
  }

  public async updateMember(id: string, updates: UpdateMemberInput): Promise<FamilyMember> {
    if (!this.db) throw new Error('Firebase DB not initialized');
    const docRef = doc(this.db, 'members', id);
    await updateDoc(docRef, {
      ...updates,
      updated_at: new Date().toISOString()
    });
    const updatedSnap = await getDoc(docRef);
    return updatedSnap.data() as FamilyMember;
  }

  public async deleteMember(id: string): Promise<void> {
    if (!this.db) throw new Error('Firebase DB not initialized');
    const docRef = doc(this.db, 'members', id);
    await deleteDoc(docRef);
  }

  public async seedDefaultMembers(defaults: FamilyMember[]): Promise<void> {
    if (!this.db) return;
    const current = await this.getMembers();
    if (current.length === 0) {
      for (const m of defaults) {
        await this.createMember(m);
      }
      console.log('🌱 Seeded default members into Firebase Firestore.');
    }
  }

  // ==========================================
  // GALLERY API
  // ==========================================

  public async getGallery(): Promise<GalleryItem[]> {
    if (!this.db) throw new Error('Firebase DB not initialized');
    const colRef = collection(this.db, 'gallery');
    const q = query(colRef, orderBy('created_at', 'desc'));
    const snapshot = await getDocs(q);
    const items: GalleryItem[] = [];
    snapshot.forEach((docSnap) => {
      items.push(docSnap.data() as GalleryItem);
    });
    return items;
  }

  public subscribeGallery(callback: (items: GalleryItem[]) => void): Unsubscribe | null {
    if (!this.db) return null;
    const colRef = collection(this.db, 'gallery');
    const q = query(colRef, orderBy('created_at', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const items: GalleryItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as GalleryItem);
      });
      callback(items);
    });
  }

  public async addGalleryItem(item: GalleryItem): Promise<GalleryItem> {
    if (!this.db) throw new Error('Firebase DB not initialized');
    const docRef = doc(this.db, 'gallery', item.id);
    await setDoc(docRef, item);
    return item;
  }

  public async deleteGalleryItem(id: string): Promise<void> {
    if (!this.db) throw new Error('Firebase DB not initialized');
    const docRef = doc(this.db, 'gallery', id);
    await deleteDoc(docRef);
  }
}

export const firebaseService = new FirebaseService();
