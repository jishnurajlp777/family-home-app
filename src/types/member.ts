export type CaricatureType =
  | 'jishnu'
  | 'ashna'
  | 'raju'
  | 'lalitha'
  | 'boy'
  | 'girl'
  | 'elder'
  | 'pet';

export type TabType = 'profile' | 'about' | 'room' | 'note' | 'location';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface MemberLocation {
  name: string;
  address: string;
  lat: number;
  lng: number;
  updated_at: string;
  status: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  mobile_number: string;
  caricature_key: CaricatureType;
  image_url?: string;
  role: string;
  bio: string;
  tags: string[];
  room_title: string;
  room_desc: string;
  room_status?: string;
  room_notes?: string;
  checklist?: ChecklistItem[];
  location?: MemberLocation;
  quote?: string;
  created_at: string;
  updated_at: string;
}

export interface NewMemberInput {
  name: string;
  mobile_number: string;
  caricature_key: CaricatureType;
  image_url?: string;
  role: string;
  quote?: string;
  bio?: string;
  tags?: string[];
  room_title?: string;
  room_desc?: string;
  room_status?: string;
  room_notes?: string;
  checklist?: ChecklistItem[];
  location?: MemberLocation;
}

export type UpdateMemberInput = Partial<FamilyMember>;

export interface GalleryItem {
  id: string;
  image_data: string;
  title?: string;
  uploaded_by?: string;
  uploaded_by_id?: string;
  created_at: string;
}

export type UserRole = 'admin' | 'member';

export interface AuthUser {
  role: UserRole;
  name: string;
  mobile_number: string;
  memberId?: string;
  member?: FamilyMember;
}
