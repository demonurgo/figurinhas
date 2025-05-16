
export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserConnection {
  id: string;
  user_id: string;
  connected_user_id: string;
  created_at: string;
}

export interface SupabaseSticker {
  id: string;
  user_id: string;
  sticker_number: number;
  collected: boolean;
  photo_url: string | null;
  notes: string | null;
  date_collected: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileWithStats extends Profile {
  totalStickers: number;
  missingStickers: number;
}
