import { createClient } from '@supabase/supabase-js';

// Supabase client configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your secrets.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          avatar_url: string | null;
          bio: string | null;
          twitter: string | null;
          website: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      products: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          tagline: string;
          description: string;
          slug: string;
          domain_url: string;
          launch_date: string | null;
          status: 'draft' | 'scheduled' | 'launched';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };
      product_media: {
        Row: {
          id: string;
          product_id: string;
          type: 'thumbnail' | 'icon' | 'screenshot' | 'video';
          url: string;
        };
        Insert: Omit<Database['public']['Tables']['product_media']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['product_media']['Insert']>;
      };
      product_categories: {
        Row: {
          id: number;
          name: string;
        };
        Insert: Omit<Database['public']['Tables']['product_categories']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['product_categories']['Insert']>;
      };
      votes: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          value: 1 | -1;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['votes']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['votes']['Insert']>;
      };
      follows: {
        Row: {
          follower_id: string;
          followed_id: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['follows']['Row'], 'created_at'>;
        Update: never;
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          product_id: string | null;
          stripe_session_id: string;
          plan: 'join' | 'skip' | 'relaunch';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
      };
    };
  };
};
