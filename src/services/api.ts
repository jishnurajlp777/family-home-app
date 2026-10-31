import { FamilyMember, NewMemberInput, UpdateMemberInput, GalleryItem, AuthUser } from '../types/member';

const STORAGE_KEY = 'family_home_database_records_v2';
const STORAGE_KEY_GALLERY = 'family_home_gallery_v1';
const STORAGE_KEY_AUTH = 'family_home_auth_user_v1';
const STORAGE_KEY_API_URL = 'family_home_api_url_override';

export const DEFAULT_SEEDS: FamilyMember[] = [
  {
    id: 'mem_jishnu',
    name: 'Jishnu',
    mobile_number: '9876543210',
    caricature_key: 'jishnu',
    role: 'Tech Explorer',
    bio: 'Curious tech explorer, loves coding cool tools, gaming, and late night coffee brews.',
    tags: ['💻 Tech Lover', '☕ Coffee Fan', '🎮 Gamer'],
    room_title: "Jishnu's Tech Den",
    room_desc: 'Dual-monitor setup with warm ambient strip lighting, mechanical keyboards, and a comfy beanbag.',
    room_notes: 'Need to clean mechanical keyboard and organize cables under the dual-monitor desk.',
    checklist: [
      { id: 'c1', text: 'Clean dual monitors', completed: true },
      { id: 'c2', text: 'Water the desk succulent', completed: false },
      { id: 'c3', text: 'Backup project code to cloud', completed: false },
    ],
    location: {
      name: 'Tech Innovation Hub, Cyber Park',
      address: 'Tower B, Silicon Boulevard',
      lat: 12.9716,
      lng: 77.5946,
      updated_at: '5 mins ago',
      status: 'Compiling code & testing',
    },
    quote: 'Keep creating, keep questioning, and never stop building awesome things!',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'mem_ashna',
    name: 'Ashna',
    mobile_number: '9876543211',
    caricature_key: 'ashna',
    role: 'Creative Artist',
    bio: 'Creative mind, loves painting, cozy playlists, sweet treats, and family weekend trips.',
    tags: ['🎨 Creative Artist', '🎵 Music Lover', '🧁 Baker'],
    room_title: "Ashna's Art Haven",
    room_desc: 'Sunlit room with fairy lights, watercolor sketches pinned on walls, and potted succulents.',
    room_notes: 'Buy fresh pastel watercolor sheets and fairy light batteries.',
    checklist: [
      { id: 'c4', text: 'Organize acrylic brushes', completed: true },
      { id: 'c5', text: 'Frame the sunset sketch', completed: true },
      { id: 'c6', text: 'Restock pastel paints', completed: false },
    ],
    location: {
      name: 'Creative Art Studio & Cafe',
      address: '42 Pastel Boulevard, Arts District',
      lat: 12.978,
      lng: 77.601,
      updated_at: '12 mins ago',
      status: 'Working on canvas oil painting',
    },
    quote: 'Add a splash of color to everyday moments.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'mem_raju',
    name: 'Raju',
    mobile_number: '9876543212',
    caricature_key: 'raju',
    role: 'Family Pillar & Reader',
    bio: 'The family pillar! Enjoys morning newspaper walkabouts, gardening, and classic stories.',
    tags: ['🌿 Green Thumb', '📰 Avid Reader', '🛠️ Master Fixer'],
    room_title: "Raju's Study & Garden Porch",
    room_desc: 'Comfortable rocking chair and vintage bookshelf overlooking the green front yard.',
    room_notes: 'Check the jasmine saplings in the front balcony and trim dry leaves.',
    checklist: [
      { id: 'c7', text: 'Finish chapter 4 of historical novel', completed: true },
      { id: 'c8', text: 'Buy organic garden compost', completed: false },
    ],
    location: {
      name: 'Greenfield Botanical Gardens',
      address: 'Lake Road, North Gate',
      lat: 12.965,
      lng: 77.585,
      updated_at: '25 mins ago',
      status: 'Morning walk & reading',
    },
    quote: 'Patience and hard work always bear the sweetest fruits.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'mem_lalitha',
    name: 'Lalitha',
    mobile_number: '9876543213',
    caricature_key: 'lalitha',
    role: 'Heart of Home & Chef',
    bio: 'The warm heart of the home. Master of delicious feasts, kindness, and keeping everyone connected.',
    tags: ['🍲 Master Chef', '🌸 Joy Spreader', '❤️ Heart of Home'],
    room_title: "Lalitha's Cozy Sanctuary",
    room_desc: 'Filled with family photo albums, soft handcrafted cushions, and aroma of sweet cardamom.',
    room_notes: 'Recipe notebook kept on the second wooden shelf.',
    checklist: [
      { id: 'c9', text: 'Bake cardamom cookies for evening tea', completed: true },
      { id: 'c10', text: 'Call Aunt Sarah for weekend plan', completed: false },
    ],
    location: {
      name: 'Our Sweet Home',
      address: '22 Blossom Lane, Green Valley',
      lat: 12.97,
      lng: 77.59,
      updated_at: 'Just now',
      status: 'Making evening herbal tea',
    },
    quote: 'A happy family is an earlier heaven.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export class FamilyService {
  private static isServerMode: boolean = false;

  /**
   * Resolves the API base URL:
   * 1. Manual user override in localStorage (useful in APK to point to live API or computer IP)
   * 2. VITE_API_BASE_URL (configured in .env.production)
   * 3. Relative empty string '' (for same-origin or localhost proxy)
   */
  public static getApiBase(): string {
    try {
      const override = localStorage.getItem(STORAGE_KEY_API_URL);
      if (override && override.trim()) {
        return override.trim().replace(/\/$/, '');
      }
    } catch {}

    const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
    if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
      return envUrl.trim().replace(/\/$/, '');
    }

    return '';
  }

  public static setApiBase(url: string | null): void {
    try {
      if (url && url.trim()) {
        localStorage.setItem(STORAGE_KEY_API_URL, url.trim().replace(/\/$/, ''));
      } else {
        localStorage.removeItem(STORAGE_KEY_API_URL);
      }
    } catch {}
  }

  public static async checkConnection(): Promise<{ connected: boolean; dbType: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${this.getApiBase()}/api/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        this.isServerMode = true;
        return { connected: true, dbType: data.database || 'MySQL' };
      }
    } catch {
      // offline
    }
    this.isServerMode = false;
    return { connected: false, dbType: 'Local Cache' };
  }

  public static isConnectedToServer(): boolean {
    return this.isServerMode;
  }

  public static async getAll(): Promise<FamilyMember[]> {
    // 1. Try fetching from Backend Server (MySQL)
    try {
      const res = await fetch(`${this.getApiBase()}/api/members`);
      if (res.ok) {
        const data = await res.json();
        this.isServerMode = true;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch {}
        return data;
      }
    } catch {
      this.isServerMode = false;
    }

    // 2. Fallback to Local Storage Cache
    try {
      const localData = localStorage.getItem(STORAGE_KEY);
      if (!localData) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SEEDS));
        return DEFAULT_SEEDS;
      }
      return JSON.parse(localData);
    } catch {
      return DEFAULT_SEEDS;
    }
  }

  public static subscribeMembers(callback: (members: FamilyMember[]) => void) {
    // Periodic poll to keep multiple clients/devices in sync
    const interval = setInterval(async () => {
      try {
        const data = await this.getAll();
        callback(data);
      } catch {}
    }, 10000);

    return () => clearInterval(interval);
  }

  public static async getById(id: string): Promise<FamilyMember | null> {
    const all = await this.getAll();
    return all.find((m) => m.id === id) || null;
  }

  public static async create(input: NewMemberInput): Promise<FamilyMember> {
    const id = 'mem_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();

    const newRecord: FamilyMember = {
      id,
      name: input.name,
      mobile_number: input.mobile_number,
      caricature_key: input.caricature_key,
      image_url: input.image_url,
      role: input.role || 'Cherished Family Member',
      bio: input.bio || `${input.role || 'Family Member'}. Always bringing energy and joy to our family home!`,
      tags: input.tags || [`🌟 ${input.role ? input.role.slice(0, 20) : 'Family Member'}`, '🏡 Family Member'],
      room_title: input.room_title || `${input.name}'s Cozy Corner`,
      room_desc: input.room_desc || 'A freshly prepared cozy room with warm lighting.',
      room_notes: input.room_notes || 'Welcome to my space!',
      checklist: input.checklist || [
        { id: 'c_' + Date.now(), text: 'Settle into new room', completed: false },
      ],
      location: input.location || {
        name: 'Our Sweet Home',
        address: '22 Blossom Lane',
        lat: 12.97,
        lng: 77.59,
        updated_at: 'Just now',
        status: 'Relaxing at home',
      },
      quote: input.quote || 'Home is where love resides and memories blossom.',
      created_at: now,
      updated_at: now,
    };

    // 1. Send to Backend Server (MySQL)
    try {
      const res = await fetch(`${this.getApiBase()}/api/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (res.ok) {
        const created = await res.json();
        this.isServerMode = true;
        const all = await this.getAll();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
        return created;
      }
    } catch {
      this.isServerMode = false;
    }

    // 2. Fallback to Local Storage
    const all = await this.getAll();
    all.push(newRecord);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch {}
    return newRecord;
  }

  public static async update(id: string, updates: UpdateMemberInput): Promise<FamilyMember> {
    // 1. Send to Backend Server (MySQL)
    try {
      const res = await fetch(`${this.getApiBase()}/api/members/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const serverUpdated = await res.json();
        this.isServerMode = true;
        const all = await this.getAll();
        const idx = all.findIndex((m) => m.id === id);
        if (idx !== -1) all[idx] = serverUpdated;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
        return serverUpdated;
      }
    } catch {
      this.isServerMode = false;
    }

    // 2. Fallback to Local Storage
    const all = await this.getAll();
    const index = all.findIndex((m) => m.id === id);
    if (index !== -1) {
      const updatedRecord: FamilyMember = {
        ...all[index],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      all[index] = updatedRecord;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      } catch {}
      return updatedRecord;
    }

    throw new Error('Member not found');
  }

  public static async delete(id: string): Promise<{ success: boolean; message: string }> {
    // 1. Try deleting via Backend Server (MySQL)
    try {
      const res = await fetch(`${this.getApiBase()}/api/members/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        this.isServerMode = true;
        const all = await this.getAll();
        const filtered = all.filter((m) => m.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        return {
          success: true,
          message: data.message || 'Database Success: Member removed from database.',
        };
      }
      const err = await res.json().catch(() => ({}));
      if (err.error) {
        throw new Error(err.error);
      }
    } catch (e: unknown) {
      const error = e as Error;
      if (error.message?.includes('requires at least 1') || error.message?.includes('Cannot delete')) {
        throw error;
      }
      this.isServerMode = false;
    }

    // 2. Fallback to Local Storage
    const all = await this.getAll();
    if (all.length <= 1) {
      throw new Error('Cannot delete: Database requires at least 1 family record.');
    }
    const filtered = all.filter((m) => m.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch {}
    return {
      success: true,
      message: 'Database Success: Member removed from local database.',
    };
  }

  public static async resetDefaults(): Promise<FamilyMember[]> {
    try {
      const res = await fetch(`${this.getApiBase()}/api/reset`, { method: 'POST' });
      if (res.ok) {
        this.isServerMode = true;
        return await this.getAll();
      }
    } catch {
      this.isServerMode = false;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SEEDS));
    } catch {}
    return DEFAULT_SEEDS;
  }

  public static exportJson(members: FamilyMember[]): void {
    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(members, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonStr);
    downloadAnchor.setAttribute('download', `family_db_export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  // ==========================================
  // GALLERY API METHODS
  // ==========================================
  public static async getGallery(): Promise<GalleryItem[]> {
    // 1. Try Backend Server (MySQL)
    try {
      const res = await fetch(`${this.getApiBase()}/api/gallery`);
      if (res.ok) {
        const items = await res.json();
        this.isServerMode = true;
        localStorage.setItem(STORAGE_KEY_GALLERY, JSON.stringify(items));
        return items;
      }
    } catch {
      this.isServerMode = false;
    }

    // 2. Local Storage Cache
    try {
      const local = localStorage.getItem(STORAGE_KEY_GALLERY);
      return local ? JSON.parse(local) : [];
    } catch {
      return [];
    }
  }

  public static subscribeGallery(callback: (items: GalleryItem[]) => void) {
    const interval = setInterval(async () => {
      try {
        const items = await this.getGallery();
        callback(items);
      } catch {}
    }, 12000);

    return () => clearInterval(interval);
  }

  public static async addGalleryItem(imageData: string, title?: string, uploadedBy?: string): Promise<GalleryItem> {
    const id = 'img_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const newItem: GalleryItem = {
      id,
      image_data: imageData,
      title: title || 'Family Memory',
      uploaded_by: uploadedBy || 'Family Member',
      created_at: new Date().toISOString(),
    };

    // 1. Backend Server (MySQL)
    try {
      const res = await fetch(`${this.getApiBase()}/api/gallery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_data: imageData, title, uploaded_by: uploadedBy }),
      });
      if (res.ok) {
        const created = await res.json();
        this.isServerMode = true;
        const items = await this.getGallery();
        localStorage.setItem(STORAGE_KEY_GALLERY, JSON.stringify(items));
        return created;
      }
    } catch {
      this.isServerMode = false;
    }

    // 2. Fallback to Local Storage
    const items = await this.getGallery();
    items.unshift(newItem);
    try {
      localStorage.setItem(STORAGE_KEY_GALLERY, JSON.stringify(items));
    } catch {}
    return newItem;
  }

  public static async deleteGalleryItem(id: string): Promise<boolean> {
    // 1. Backend Server (MySQL)
    try {
      const res = await fetch(`${this.getApiBase()}/api/gallery/${id}`, { method: 'DELETE' });
      if (res.ok) {
        this.isServerMode = true;
        const items = await this.getGallery();
        const filtered = items.filter((item) => item.id !== id);
        localStorage.setItem(STORAGE_KEY_GALLERY, JSON.stringify(filtered));
        return true;
      }
    } catch {
      this.isServerMode = false;
    }

    // 2. Fallback to Local Storage
    const items = await this.getGallery();
    const filtered = items.filter((item) => item.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY_GALLERY, JSON.stringify(filtered));
    } catch {}
    return true;
  }

  // ==========================================
  // AUTH & USER ACCESS LEVELS
  // ==========================================
  public static getCurrentUser(): AuthUser | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AUTH);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  }

  public static setCurrentUser(user: AuthUser): void {
    try {
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(user));
    } catch {}
  }

  public static async login(mobileNumber: string): Promise<AuthUser> {
    const clean = String(mobileNumber || '').trim();
    if (!clean) {
      throw new Error('Please enter a mobile number.');
    }

    // 1. Admin shortcut login
    if (clean === '2000') {
      const adminUser: AuthUser = {
        role: 'admin',
        name: 'Admin',
        mobile_number: '2000',
      };
      this.setCurrentUser(adminUser);
      return adminUser;
    }

    // 2. Server login attempt
    try {
      const res = await fetch(`${this.getApiBase()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile_number: clean }),
      });
      if (res.ok) {
        const data = await res.json();
        const user: AuthUser = {
          role: data.role,
          name: data.name,
          mobile_number: data.mobile_number,
          memberId: data.memberId,
          member: data.member,
        };
        this.setCurrentUser(user);
        return user;
      }
    } catch {
      // Offline fallback
    }

    // 3. Fallback: match against members list
    const members = await this.getAll();
    const matched = members.find((m) => String(m.mobile_number || '').trim() === clean);
    if (matched) {
      const user: AuthUser = {
        role: 'member',
        name: matched.name,
        mobile_number: matched.mobile_number,
        memberId: matched.id,
        member: matched,
      };
      this.setCurrentUser(user);
      return user;
    }

    throw new Error('Mobile number not found. Enter "2000" for Admin or your registered member mobile number.');
  }

  public static logout(): void {
    try {
      localStorage.removeItem(STORAGE_KEY_AUTH);
    } catch {}
  }
}
