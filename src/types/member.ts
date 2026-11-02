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
  home_id?: string;
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
  last_active_at?: string;
  location_usage_count?: number;
}

export interface NewMemberInput {
  home_id?: string;
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
  home_id?: string;
  image_data: string;
  title?: string;
  uploaded_by?: string;
  uploaded_by_id?: string;
  created_at: string;
}

export type UserRole = 'super_admin' | 'admin' | 'member';

export interface Home {
  id: string;
  name: string;
  email: string;
  created_at?: string;
  updated_at?: string;
  last_active_at?: string;
  location_usage_count?: number;
  member_count?: number;
  photo_count?: number;
}

export interface HomeAuditEntity {
  id: string;
  name: string;
  role: string;
  type: 'home' | 'member';
  last_active_at?: string;
  location_usage_count: number;
  has_location?: boolean;
}

export interface HomeAuditSummary {
  home: Home;
  entities: HomeAuditEntity[];
  totalLocationUsage: number;
}

export interface AuthUser {
  token?: string;
  role: UserRole;
  name: string;
  mobile_number?: string;
  email?: string;
  homeId?: string;
  homeName?: string;
  home?: Home;
  memberId?: string;
  member?: FamilyMember;
}

export interface CallParticipant {
  id: string;
  name: string;
  role: string;
  joined_at: string;
  muted?: boolean;
}

export interface ActiveCall {
  id: string;
  home_id: string;
  caller_id: string;
  caller_name: string;
  caller_role: string;
  target_id: string; // 'all' or specific memberId
  status: 'ringing' | 'active' | 'ended';
  created_at: string;
  ringing_at: string;
  participants: CallParticipant[];
  repeated_call_count?: number;
}
