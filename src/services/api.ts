import { FamilyMember, NewMemberInput, UpdateMemberInput, GalleryItem, AuthUser, Home, HomeAuditSummary, HomeAuditEntity, ActiveCall } from '../types/member';

const STORAGE_KEY_PREFIX = 'family_home_records_v8';
const STORAGE_KEY_GALLERY_PREFIX = 'family_home_gallery_v8';
const STORAGE_KEY_AUTH = 'family_home_auth_user_v3';
const STORAGE_KEY_API_URL = 'family_home_api_url_override';
const STORAGE_KEY_OFFLINE_HOMES = 'family_home_registered_homes_offline';

export const DEFAULT_SEEDS: FamilyMember[] = [];

// Clean legacy unpartitioned seeds so clean database / clean accounts stay clean
try {
  const legacyKeys = [
    'family_home_records_v7_multitenant',
    'family_home_records_v6_clean',
    'family_home_database_records_v2',
    'family_home_database_records_v1',
    'family_home_members_v3_clean',
    'family_home_records_v4_clean',
    'family_home_records_v5_clean',
  ];
  for (const k of legacyKeys) {
    localStorage.removeItem(k);
  }
} catch {}

export class FamilyService {
  private static isServerMode: boolean = false;

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
    } catch {}
    this.isServerMode = false;
    return { connected: false, dbType: 'Local Cache' };
  }

  public static isConnectedToServer(): boolean {
    return this.isServerMode;
  }

  public static getActiveHomeId(): string | null {
    const user = this.getCurrentUser();
    return user?.homeId || user?.member?.home_id || null;
  }

  // Deduplication Helper to guarantee zero duplicate member cards
  public static deduplicateMembers(members: FamilyMember[]): FamilyMember[] {
    if (!Array.isArray(members)) return [];
    const map = new Map<string, FamilyMember>();
    for (const m of members) {
      if (m && m.id) {
        map.set(m.id, m);
      }
    }
    return Array.from(map.values());
  }

  // Common authenticated headers helper with RBAC Bearer token & home ID scoping
  private static getHeaders(explicitHomeId?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const user = this.getCurrentUser();
    const homeId = explicitHomeId || this.getActiveHomeId();
    if (homeId) {
      headers['x-home-id'] = homeId;
    }
    if (user?.token) {
      headers['Authorization'] = `Bearer ${user.token}`;
    }
    return headers;
  }

  // Storage partition key helper
  private static getMemberStorageKey(homeId?: string | null): string {
    return `${STORAGE_KEY_PREFIX}_${homeId || 'unscoped'}`;
  }

  private static getGalleryStorageKey(homeId?: string | null): string {
    return `${STORAGE_KEY_GALLERY_PREFIX}_${homeId || 'unscoped'}`;
  }

  // ==========================================
  // MULTI-TENANT MEMBERS
  // ==========================================
  public static async getAll(explicitHomeId?: string): Promise<FamilyMember[]> {
    const targetHomeId = explicitHomeId || this.getActiveHomeId();
    const user = this.getCurrentUser();

    // If no user is logged in and no explicit home ID was requested, return empty list
    // to strictly prevent pre-login data leakage and duplicates across homes
    if (!targetHomeId && user?.role !== 'super_admin') {
      return [];
    }

    const queryParam = targetHomeId ? `?home_id=${encodeURIComponent(targetHomeId)}` : '';
    const headers = this.getHeaders(targetHomeId || undefined);

    try {
      const res = await fetch(`${this.getApiBase()}/api/members${queryParam}`, { headers });
      if (res.ok) {
        const data = await res.json();
        this.isServerMode = true;
        const cleanData = this.deduplicateMembers(Array.isArray(data) ? data : []);
        try {
          localStorage.setItem(this.getMemberStorageKey(targetHomeId), JSON.stringify(cleanData));
        } catch {}
        return cleanData;
      }
    } catch {
      this.isServerMode = false;
    }

    // Local Storage Partition Fallback
    try {
      const saved = localStorage.getItem(this.getMemberStorageKey(targetHomeId));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return this.deduplicateMembers(
            targetHomeId ? parsed.filter((m: any) => m.home_id === targetHomeId) : parsed
          );
        }
      }
    } catch {}

    return [];
  }

  public static async getById(id: string): Promise<FamilyMember | null> {
    try {
      const res = await fetch(`${this.getApiBase()}/api/members/${id}`, {
        headers: this.getHeaders(),
      });
      if (res.ok) {
        this.isServerMode = true;
        return await res.json();
      }
    } catch {
      this.isServerMode = false;
    }

    const members = await this.getAll();
    return members.find((m) => m.id === id) || null;
  }

  public static async create(input: NewMemberInput, explicitHomeId?: string): Promise<FamilyMember> {
    const home_id = explicitHomeId || input.home_id || this.getActiveHomeId() || 'default_home';
    const now = new Date().toISOString();
    const id = 'mem_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);

    const cleanInput: NewMemberInput = {
      ...input,
      home_id,
      name: input.name.trim(),
      mobile_number: String(input.mobile_number).trim(),
      role: input.role?.trim() || 'Cherished Family Member',
      bio: input.bio?.trim() || `${input.role || 'Family Member'}. Always bringing happiness to our home!`,
      tags: input.tags || [`🌟 ${input.role || 'Member'}`, '🏡 Family Member'],
      room_title: input.room_title?.trim() || `${input.name.trim()}'s Sanctuary`,
      room_desc: input.room_desc?.trim() || 'A peaceful sanctuary decorated with warmth and love.',
      room_status: input.room_status?.trim() || 'Happily at home!',
      room_notes: input.room_notes?.trim() || 'Welcome to my space!',
      checklist: input.checklist || [
        { id: 'c_' + Date.now().toString(36), text: 'Decorate my sanctuary', completed: false },
      ],
      location: input.location || {
        name: 'Our Family Home',
        address: 'Live Location Pin',
        lat: 12.97,
        lng: 77.59,
        updated_at: 'Just now',
        status: 'Relaxing at home',
      },
    };

    try {
      const res = await fetch(`${this.getApiBase()}/api/members`, {
        method: 'POST',
        headers: this.getHeaders(home_id),
        body: JSON.stringify(cleanInput),
      });
      if (res.ok) {
        this.isServerMode = true;
        const created = await res.json();
        // Refresh local cache for this home
        await this.getAll(home_id);
        return created;
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to add member to database');
      }
    } catch (e: any) {
      if (e.message && e.message.includes('already registered')) throw e;
      this.isServerMode = false;
    }

    // Local Storage Partition Fallback
    const fallbackRecord: FamilyMember = {
      id,
      home_id,
      name: cleanInput.name,
      mobile_number: cleanInput.mobile_number,
      caricature_key: cleanInput.caricature_key,
      image_url: cleanInput.image_url,
      role: cleanInput.role,
      bio: cleanInput.bio || '',
      tags: cleanInput.tags || [],
      room_title: cleanInput.room_title || '',
      room_desc: cleanInput.room_desc || '',
      room_status: cleanInput.room_status || '',
      room_notes: cleanInput.room_notes || '',
      checklist: cleanInput.checklist || [],
      location: cleanInput.location,
      quote: cleanInput.quote || 'Home is where love resides and memories blossom.',
      created_at: now,
      updated_at: now,
    };

    const currentMembers = await this.getAll(home_id);
    const updatedList = this.deduplicateMembers([...currentMembers, fallbackRecord]);
    try {
      localStorage.setItem(this.getMemberStorageKey(home_id), JSON.stringify(updatedList));
    } catch {}

    return fallbackRecord;
  }

  public static async update(id: string, updates: UpdateMemberInput): Promise<FamilyMember> {
    const cleanUpdates: any = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) cleanUpdates[key] = value;
    }

    const homeId = this.getActiveHomeId();

    try {
      const res = await fetch(`${this.getApiBase()}/api/members/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(cleanUpdates),
      });
      if (res.ok) {
        this.isServerMode = true;
        const updated = await res.json();
        await this.getAll(homeId || undefined);
        return updated;
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update member in database');
      }
    } catch (e: any) {
      if (e.message && e.message.includes('already registered')) throw e;
      this.isServerMode = false;
    }

    const members = await this.getAll(homeId || undefined);
    const index = members.findIndex((m) => m.id === id);
    if (index === -1) throw new Error('Member not found');

    const updated: FamilyMember = {
      ...members[index],
      ...cleanUpdates,
      updated_at: new Date().toISOString(),
    };
    members[index] = updated;
    const targetHomeId = updated.home_id || homeId;
    try {
      localStorage.setItem(this.getMemberStorageKey(targetHomeId), JSON.stringify(this.deduplicateMembers(members)));
    } catch {}

    return updated;
  }

  public static async delete(id: string): Promise<boolean> {
    const homeId = this.getActiveHomeId();
    try {
      const res = await fetch(`${this.getApiBase()}/api/members/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      if (res.ok) {
        this.isServerMode = true;
        await this.getAll(homeId || undefined);
        return true;
      }
    } catch {
      this.isServerMode = false;
    }

    const members = await this.getAll(homeId || undefined);
    const filtered = members.filter((m) => m.id !== id);
    try {
      localStorage.setItem(this.getMemberStorageKey(homeId), JSON.stringify(this.deduplicateMembers(filtered)));
    } catch {}
    return true;
  }

  // ==========================================
  // MULTI-TENANT GALLERY
  // ==========================================
  public static async getGallery(explicitHomeId?: string): Promise<GalleryItem[]> {
    const targetHomeId = explicitHomeId || this.getActiveHomeId();
    const queryParam = targetHomeId ? `?home_id=${encodeURIComponent(targetHomeId)}` : '';

    try {
      const res = await fetch(`${this.getApiBase()}/api/gallery${queryParam}`, {
        headers: this.getHeaders(targetHomeId || undefined),
      });
      if (res.ok) {
        this.isServerMode = true;
        const data = await res.json();
        const cleanList = Array.isArray(data) ? data : [];
        try {
          localStorage.setItem(this.getGalleryStorageKey(targetHomeId), JSON.stringify(cleanList));
        } catch {}
        return cleanList;
      }
    } catch {
      this.isServerMode = false;
    }

    try {
      const saved = localStorage.getItem(this.getGalleryStorageKey(targetHomeId));
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  }

  public static async addGalleryItem(
    imageData: string,
    title?: string,
    uploadedBy?: string,
    uploadedById?: string,
    explicitHomeId?: string
  ): Promise<GalleryItem> {
    const home_id = explicitHomeId || this.getActiveHomeId() || 'default_home';
    const id = 'img_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const newItem: GalleryItem = {
      id,
      home_id,
      image_data: imageData,
      title: title || 'Family Memory',
      uploaded_by: uploadedBy || 'Family Member',
      uploaded_by_id: uploadedById,
      created_at: new Date().toISOString(),
    };

    try {
      const res = await fetch(`${this.getApiBase()}/api/gallery`, {
        method: 'POST',
        headers: this.getHeaders(home_id),
        body: JSON.stringify({
          image_data: imageData,
          title,
          uploaded_by: uploadedBy,
          uploaded_by_id: uploadedById,
          home_id,
        }),
      });
      if (res.ok) {
        this.isServerMode = true;
        return await res.json();
      }
    } catch {
      this.isServerMode = false;
    }

    const items = await this.getGallery(home_id);
    items.unshift(newItem);
    try {
      localStorage.setItem(this.getGalleryStorageKey(home_id), JSON.stringify(items));
    } catch {}
    return newItem;
  }

  public static async deleteGalleryItem(id: string): Promise<boolean> {
    const home_id = this.getActiveHomeId();
    try {
      const res = await fetch(`${this.getApiBase()}/api/gallery/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(home_id || undefined),
      });
      if (res.ok) {
        this.isServerMode = true;
        return true;
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete photo.');
      }
    } catch (err) {
      if (err instanceof Error && !err.message.includes('Failed to fetch')) {
        throw err;
      }
      this.isServerMode = false;
    }

    const items = await this.getGallery(home_id || undefined);
    const filtered = items.filter((item) => item.id !== id);
    try {
      localStorage.setItem(this.getGalleryStorageKey(home_id), JSON.stringify(filtered));
    } catch {}
    return true;
  }

  // ==========================================
  // AUTHENTICATION & MULTI-TENANT SESSIONS
  // ==========================================
  public static getCurrentUser(): AuthUser | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AUTH);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  }

  public static setCurrentUser(user: AuthUser | null): void {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEY_AUTH);
      }
    } catch {}
  }

  // Offline registered homes cache helpers
  private static getRegisteredHomesOffline(): Array<{ id: string; name: string; email: string; password?: string; created_at: string }> {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_OFFLINE_HOMES);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  }

  private static saveRegisteredHomesOffline(homes: any[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_OFFLINE_HOMES, JSON.stringify(homes));
    } catch {}
  }

  // Register New Home (Home Admin) with both Server and Resilient Offline Storage
  public static async registerHome(homeName: string, email: string, password: string): Promise<AuthUser> {
    const cleanName = homeName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    try {
      const res = await fetch(`${this.getApiBase()}/api/auth/register-home`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ home_name: cleanName, email: cleanEmail, password: cleanPass }),
      });

      if (res.ok) {
        this.isServerMode = true;
        const data = await res.json();
        const user: AuthUser = {
          token: data.token,
          role: 'admin',
          name: data.name || cleanName,
          email: data.email || cleanEmail,
          homeId: data.homeId,
          homeName: data.homeName || cleanName,
          home: data.home,
        };
        this.setCurrentUser(user);

        // Mirror in offline cache for seamless subsequent offline usage
        const offlineHomes = this.getRegisteredHomesOffline();
        if (!offlineHomes.some((h) => h.email.toLowerCase() === cleanEmail)) {
          offlineHomes.push({ id: data.homeId, name: cleanName, email: cleanEmail, password: cleanPass, created_at: new Date().toISOString() });
          this.saveRegisteredHomesOffline(offlineHomes);
        }

        return user;
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to register home.');
      }
    } catch (e: any) {
      if (e.message && (e.message.includes('already registered') || e.message.includes('required') || e.message.includes('characters'))) {
        throw e;
      }
      this.isServerMode = false;
    }

    // Offline registration fallback
    const offlineHomes = this.getRegisteredHomesOffline();
    if (offlineHomes.some((h) => h.email.toLowerCase() === cleanEmail)) {
      throw new Error(`Home email "${cleanEmail}" is already registered. Please log in or use another email.`);
    }

    const newHomeId = 'home_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();
    const newHomeRecord = { id: newHomeId, name: cleanName, email: cleanEmail, password: cleanPass, created_at: now };
    offlineHomes.push(newHomeRecord);
    this.saveRegisteredHomesOffline(offlineHomes);

    const offlineUser: AuthUser = {
      token: 'tok_admin_' + newHomeId,
      role: 'admin',
      name: cleanName,
      email: cleanEmail,
      homeId: newHomeId,
      homeName: cleanName,
      home: { id: newHomeId, name: cleanName, email: cleanEmail, created_at: now },
    };
    this.setCurrentUser(offlineUser);
    return offlineUser;
  }

  // Super Admin Dedicated Login (Password is 2000, hidden from UI)
  public static async loginSuperAdmin(password: string): Promise<AuthUser> {
    const cleanPass = String(password || '').trim();
    if (cleanPass !== '2000') {
      throw new Error('Invalid Super Admin credentials.');
    }

    const user: AuthUser = {
      token: 'tok_super_admin_' + Date.now().toString(36),
      role: 'super_admin',
      name: 'Super Admin',
    };
    this.setCurrentUser(user);
    return user;
  }

  // Dedicated Home Login (Both Email and Password are required)
  public static async loginHome(email: string, password: string): Promise<AuthUser> {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPass = String(password || '').trim();

    // Super Admin check (hidden master code)
    if (cleanPass === '2000' || cleanEmail === 'superadmin') {
      return this.loginSuperAdmin('2000');
    }

    if (!cleanEmail) {
      throw new Error('Please enter your home email.');
    }
    if (!cleanPass) {
      throw new Error('Please enter your home password.');
    }

    // 1. Server API Call
    try {
      const res = await fetch(`${this.getApiBase()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPass }),
      });

      if (res.ok) {
        this.isServerMode = true;
        const data = await res.json();
        const user: AuthUser = {
          token: data.token,
          role: 'admin',
          name: data.name || 'Home',
          email: data.email || cleanEmail,
          homeId: data.homeId,
          homeName: data.homeName || data.name || 'Home',
          home: data.home,
        };
        this.setCurrentUser(user);

        // Mirror in offline cache for subsequent offline sessions
        const offlineHomes = this.getRegisteredHomesOffline();
        if (!offlineHomes.some((h) => h.id === data.homeId)) {
          offlineHomes.push({
            id: data.homeId,
            name: data.homeName || data.name || 'Home',
            email: data.email || cleanEmail,
            password: cleanPass,
            created_at: new Date().toISOString(),
          });
          this.saveRegisteredHomesOffline(offlineHomes);
        }

        return user;
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Invalid home email or password.');
      }
    } catch (err: unknown) {
      // Re-throw explicit validation errors from server
      if (err instanceof Error && err.message && !err.message.includes('Failed to fetch')) {
        throw err;
      }
      this.isServerMode = false;
    }

    // 2. Offline / LocalStorage Cache Fallback
    const offlineHomes = this.getRegisteredHomesOffline();
    const matched = offlineHomes.find(
      (h) => h.email && h.email.toLowerCase() === cleanEmail
    );

    if (matched) {
      if (matched.password !== cleanPass) {
        throw new Error('Invalid home email or password. Please verify your credentials.');
      }
      const user: AuthUser = {
        token: 'tok_admin_' + matched.id,
        role: 'admin',
        name: matched.name,
        email: matched.email,
        homeId: matched.id,
        homeName: matched.name,
        home: matched,
      };
      this.setCurrentUser(user);
      return user;
    }

    throw new Error('Invalid home email or password. Please verify your credentials or register.');
  }

  // Dedicated Member Login (via Registered Mobile Number)
  public static async loginMember(mobileNumber: string): Promise<AuthUser> {
    const cleanPhone = String(mobileNumber || '').trim();
    if (!cleanPhone) {
      throw new Error('Please enter your registered mobile number.');
    }

    // Super Admin master check (hidden)
    if (cleanPhone === '2000') {
      return this.loginSuperAdmin('2000');
    }

    // 1. Server API Call
    try {
      const res = await fetch(`${this.getApiBase()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile_number: cleanPhone }),
      });

      if (res.ok) {
        this.isServerMode = true;
        const data = await res.json();
        const user: AuthUser = {
          token: data.token,
          role: 'member',
          name: data.name,
          mobile_number: data.mobile_number,
          memberId: data.memberId,
          homeId: data.homeId,
          homeName: data.homeName,
          member: data.member,
        };
        this.setCurrentUser(user);
        return user;
      }
    } catch {
      this.isServerMode = false;
    }

    // 2. Offline Fallback for Member
    const offlineHomes = this.getRegisteredHomesOffline();
    for (const h of offlineHomes) {
      const members = await this.getAll(h.id);
      const matched = members.find((m) => String(m.mobile_number || '').trim() === cleanPhone);
      if (matched) {
        const user: AuthUser = {
          token: 'tok_member_' + matched.id,
          role: 'member',
          name: matched.name,
          mobile_number: matched.mobile_number,
          memberId: matched.id,
          homeId: matched.home_id || h.id,
          homeName: h.name || 'Our Family Home',
          member: matched,
        };
        this.setCurrentUser(user);
        return user;
      }
    }

    throw new Error('Mobile number not found. Please contact your home to register your profile.');
  }

  // Unified Login (Backwards Compatibility)
  public static async login(identifier: string, password?: string): Promise<AuthUser> {
    if (password) {
      return this.loginHome(identifier, password);
    }
    return this.loginMember(identifier);
  }

  // Update Home Profile Settings (Home Name & Password change)
  public static async updateHomeProfile(
    homeName?: string,
    currentPassword?: string,
    newPassword?: string
  ): Promise<{ success: boolean; homeName: string }> {
    const user = this.getCurrentUser();
    if (!user || user.role !== 'admin') {
      throw new Error('Home access required.');
    }
    const homeId = user.homeId;
    if (!homeId) {
      throw new Error('Home ID not found.');
    }

    const payload: any = {};
    if (homeName && homeName.trim()) payload.home_name = homeName.trim();
    if (currentPassword && currentPassword.trim()) payload.current_password = currentPassword.trim();
    if (newPassword && newPassword.trim()) payload.new_password = newPassword.trim();

    try {
      const res = await fetch(`${this.getApiBase()}/api/homes/profile`, {
        method: 'PUT',
        headers: this.getHeaders(homeId),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        this.isServerMode = true;
        const data = await res.json();
        const updatedUser: AuthUser = {
          ...user,
          homeName: data.homeName || (payload.home_name || user.homeName),
          name: data.homeName || user.name,
        };
        this.setCurrentUser(updatedUser);

        // Update offline cache mirror
        const offlineHomes = this.getRegisteredHomesOffline();
        const hIdx = offlineHomes.findIndex((h) => h.id === homeId);
        if (hIdx !== -1) {
          if (payload.home_name) offlineHomes[hIdx].name = payload.home_name;
          if (payload.new_password) offlineHomes[hIdx].password = payload.new_password;
          this.saveRegisteredHomesOffline(offlineHomes);
        }

        return { success: true, homeName: updatedUser.homeName || 'Our Home' };
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update home settings.');
      }
    } catch (e: any) {
      if (e.message && !e.message.includes('fetch')) throw e;
      this.isServerMode = false;
    }

    // Offline Profile Update
    const offlineHomes = this.getRegisteredHomesOffline();
    const hIdx = offlineHomes.findIndex((h) => h.id === homeId);
    if (hIdx !== -1) {
      if (payload.new_password) {
        if (offlineHomes[hIdx].password && offlineHomes[hIdx].password !== payload.current_password) {
          throw new Error('Incorrect current password.');
        }
        offlineHomes[hIdx].password = payload.new_password;
      }
      if (payload.home_name) {
        offlineHomes[hIdx].name = payload.home_name;
      }
      this.saveRegisteredHomesOffline(offlineHomes);
    }

    const updatedUser: AuthUser = {
      ...user,
      homeName: payload.home_name || user.homeName,
      name: payload.home_name || user.name,
    };
    this.setCurrentUser(updatedUser);
    return { success: true, homeName: updatedUser.homeName || 'Our Home' };
  }

  public static logout(): void {
    this.setCurrentUser(null);
  }

  // ==========================================
  // SUPER ADMIN PLATFORM MANAGEMENT METHODS
  // ==========================================
  public static async getSuperAdminHomes(): Promise<Home[]> {
    try {
      const res = await fetch(`${this.getApiBase()}/api/super-admin/homes`, {
        headers: this.getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data)
          ? data.map((h: any) => ({
              ...h,
              member_count: Number(h.member_count) || 0,
              photo_count: Number(h.photo_count) || 0,
              location_usage_count: Number(h.location_usage_count) || 0,
              last_active_at: h.last_active_at || h.updated_at || h.created_at || 'Recently',
            }))
          : [];
      }
    } catch {}

    // Offline mode: compute actual member and photo counts per home partition
    const offlineHomes = this.getRegisteredHomesOffline();
    return offlineHomes.map((h) => {
      let memberCount = 0;
      let photoCount = 0;
      try {
        const memRaw = localStorage.getItem(this.getMemberStorageKey(h.id));
        if (memRaw) memberCount = JSON.parse(memRaw).length;
      } catch {}
      try {
        const galRaw = localStorage.getItem(this.getGalleryStorageKey(h.id));
        if (galRaw) photoCount = JSON.parse(galRaw).length;
      } catch {}

      return {
        id: h.id,
        name: h.name,
        email: h.email,
        created_at: h.created_at,
        member_count: memberCount,
        photo_count: photoCount,
        location_usage_count: Number((h as any).location_usage_count) || 0,
        last_active_at: (h as any).last_active_at || h.created_at || 'Recently',
      };
    });
  }

  // Super Admin Home Audit (Confidential View: Activity Time Track & Google Location Usages)
  public static async getSuperAdminHomeAudit(homeId: string): Promise<HomeAuditSummary> {
    try {
      const res = await fetch(`${this.getApiBase()}/api/super-admin/homes/${homeId}/audit`, {
        headers: this.getHeaders(homeId),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    // Offline fallback for audit
    const offlineHomes = this.getRegisteredHomesOffline();
    const home = offlineHomes.find((h) => h.id === homeId) || {
      id: homeId,
      name: 'Family Home',
      email: 'home@example.com',
      created_at: new Date().toISOString(),
    };

    const members = await this.getAll(homeId);
    const homeEntity: HomeAuditEntity = {
      id: 'home_user_' + home.id,
      name: home.name,
      role: 'Home User',
      type: 'home',
      last_active_at: (home as any).last_active_at || home.created_at || 'Recently',
      location_usage_count: Number((home as any).location_usage_count) || 0,
    };

    const memberEntities: HomeAuditEntity[] = members.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role || 'Family Member',
      type: 'member',
      last_active_at: m.last_active_at || m.updated_at || m.created_at || 'Recently',
      location_usage_count: Number(m.location_usage_count) || 0,
      has_location: Boolean(m.location && (m.location.lat || m.location.name)),
    }));

    const entities = [homeEntity, ...memberEntities];
    const totalLocationUsage = entities.reduce((acc, curr) => acc + curr.location_usage_count, 0);

    return {
      home: {
        id: home.id,
        name: home.name,
        email: home.email,
        created_at: home.created_at,
        last_active_at: (home as any).last_active_at || home.created_at || 'Recently',
        location_usage_count: Number((home as any).location_usage_count) || 0,
      },
      entities,
      totalLocationUsage,
    };
  }

  // Record Google Location Usage for both Members and Home Users
  public static async recordLocationUsage(memberId?: string, explicitHomeId?: string): Promise<void> {
    const targetHomeId = explicitHomeId || this.getActiveHomeId();
    const user = this.getCurrentUser();
    const targetMemberId = memberId || (user?.role === 'member' ? user.memberId : undefined);

    try {
      await fetch(`${this.getApiBase()}/api/audit/location-usage`, {
        method: 'POST',
        headers: this.getHeaders(targetHomeId || undefined),
        body: JSON.stringify({
          homeId: targetHomeId,
          memberId: targetMemberId,
        }),
      });
    } catch {}

    // Offline update
    const nowIso = new Date().toISOString();
    if (targetMemberId && targetHomeId) {
      try {
        const stored = localStorage.getItem(this.getMemberStorageKey(targetHomeId));
        if (stored) {
          const list: FamilyMember[] = JSON.parse(stored);
          const idx = list.findIndex((m) => m.id === targetMemberId);
          if (idx !== -1) {
            list[idx].location_usage_count = (Number(list[idx].location_usage_count) || 0) + 1;
            list[idx].last_active_at = nowIso;
            localStorage.setItem(this.getMemberStorageKey(targetHomeId), JSON.stringify(list));
          }
        }
      } catch {}
    } else if (targetHomeId) {
      try {
        const offlineHomes = this.getRegisteredHomesOffline();
        const hIdx = offlineHomes.findIndex((h) => h.id === targetHomeId);
        if (hIdx !== -1) {
          (offlineHomes[hIdx] as any).location_usage_count = (Number((offlineHomes[hIdx] as any).location_usage_count) || 0) + 1;
          (offlineHomes[hIdx] as any).last_active_at = nowIso;
          this.saveRegisteredHomesOffline(offlineHomes);
        }
      } catch {}
    }
  }

  public static async getSuperAdminHomeMembers(homeId: string): Promise<FamilyMember[]> {
    try {
      const res = await fetch(`${this.getApiBase()}/api/super-admin/homes/${homeId}/members`, {
        headers: this.getHeaders(homeId),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    return await this.getAll(homeId);
  }

  public static async createHome(name: string, email: string, password: string): Promise<Home> {
    const res = await fetch(`${this.getApiBase()}/api/super-admin/homes`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create home.');
    }
    return await res.json();
  }

  public static async setHomePassword(homeId: string, password: string): Promise<boolean> {
    const res = await fetch(`${this.getApiBase()}/api/super-admin/homes/${homeId}/password`, {
      method: 'PUT',
      headers: this.getHeaders(homeId),
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update password.');
    }
    // Also update offline cache so that subsequent login checks have latest password
    try {
      const offlineHomes = this.getRegisteredHomesOffline();
      const idx = offlineHomes.findIndex((h) => h.id === homeId);
      if (idx !== -1) {
        offlineHomes[idx].password = password;
        this.saveRegisteredHomesOffline(offlineHomes);
      }
    } catch {}
    return true;
  }

  // --- Real-Time Internet Calling APIs ---
  public static async startCall(targetId: string = 'all', callerName?: string): Promise<ActiveCall> {
    const user = this.getCurrentUser();
    const name = callerName || user?.name || (user?.role === 'admin' ? 'Home Admin' : 'Family Member');
    const res = await fetch(`${this.getApiBase()}/api/calls/start`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ target_id: targetId, caller_name: name }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to start call.');
    }
    return await res.json();
  }

  public static async getActiveCall(): Promise<ActiveCall | null> {
    try {
      const res = await fetch(`${this.getApiBase()}/api/calls/active`, {
        headers: this.getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        return data.call || null;
      }
    } catch {}
    return null;
  }

  public static async joinCall(callId: string): Promise<ActiveCall> {
    const res = await fetch(`${this.getApiBase()}/api/calls/${callId}/join`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to join call.');
    }
    const data = await res.json();
    return data.call;
  }

  public static async repeatCall(callId: string): Promise<{ ringing_at: string; repeated_call_count: number }> {
    const res = await fetch(`${this.getApiBase()}/api/calls/${callId}/repeat`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to trigger repeated call.');
    }
    return await res.json();
  }

  public static async leaveCall(callId: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.getApiBase()}/api/calls/${callId}/leave`, {
        method: 'POST',
        headers: this.getHeaders(),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public static async endCall(callId: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.getApiBase()}/api/calls/${callId}/end`, {
        method: 'POST',
        headers: this.getHeaders(),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public static async sendCallSignal(callId: string, to: string, signal: any): Promise<boolean> {
    try {
      const res = await fetch(`${this.getApiBase()}/api/calls/${callId}/signal`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ to, signal }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public static async getCallSignals(callId: string, since: number = 0): Promise<any[]> {
    try {
      const res = await fetch(`${this.getApiBase()}/api/calls/${callId}/signals?since=${since}`, {
        headers: this.getHeaders(),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    return [];
  }

  public static async deleteHome(homeId: string): Promise<boolean> {
    const res = await fetch(`${this.getApiBase()}/api/super-admin/homes/${homeId}`, {
      method: 'DELETE',
      headers: this.getHeaders(homeId),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete home.');
    }
    return true;
  }
}
