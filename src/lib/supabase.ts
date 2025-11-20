import { createClient } from '@supabase/supabase-js';

// Supabase client configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug logging
console.log('Supabase URL configured:', !!supabaseUrl);
console.log('Supabase Anon Key configured:', !!supabaseAnonKey);
console.log('Environment check:', import.meta.env.MODE);

// Create a mock client that returns chainable methods when env vars are missing
const createMockClient = () => {
  const chainableMock: any = {
    data: [],
    error: new Error('Supabase not configured'),
    eq: () => chainableMock,
    in: () => chainableMock,
    single: () => chainableMock,
    order: () => chainableMock,
    limit: () => chainableMock,
    range: () => chainableMock,
  };

  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signUp: async () => ({ data: { user: null, session: null }, error: new Error('Supabase not configured') }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error('Supabase not configured') }),
      signInWithOAuth: async () => ({ data: { url: null }, error: new Error('Supabase not configured') }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: () => chainableMock,
      insert: () => chainableMock,
      update: () => chainableMock,
      delete: () => chainableMock,
    }),
  };
};

export const supabase: any = (!supabaseUrl || !supabaseAnonKey)
  ? createMockClient()
  : createClient(supabaseUrl, supabaseAnonKey, {
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
