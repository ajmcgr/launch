export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      category_intro_copy: {
        Row: {
          category_id: number
          intro_copy: string | null
          meta_description: string | null
          updated_at: string | null
        }
        Insert: {
          category_id: number
          intro_copy?: string | null
          meta_description?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: number
          intro_copy?: string | null
          meta_description?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "category_intro_copy_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: true
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_products: {
        Row: {
          collection_id: string
          position: number | null
          product_id: string
        }
        Insert: {
          collection_id: string
          position?: number | null
          product_id: string
        }
        Update: {
          collection_id?: string
          position?: number | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_products_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          intro_copy: string | null
          is_auto_update: boolean | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          intro_copy?: string | null
          is_auto_update?: boolean | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          intro_copy?: string | null
          is_auto_update?: boolean | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          parent_comment_id: string | null
          pinned: boolean | null
          product_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          parent_comment_id?: string | null
          pinned?: boolean | null
          product_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          parent_comment_id?: string | null
          pinned?: boolean | null
          product_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      content_formats: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          product_count: number | null
          slug: string
          sort_order: number | null
          template_hint: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          product_count?: number | null
          slug: string
          sort_order?: number | null
          template_hint?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          product_count?: number | null
          slug?: string
          sort_order?: number | null
          template_hint?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string | null
          followed_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string | null
          followed_id: string
          follower_id: string
        }
        Update: {
          created_at?: string | null
          followed_id?: string
          follower_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_followed_id_fkey"
            columns: ["followed_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_followed_id_fkey"
            columns: ["followed_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_content: {
        Row: {
          body: string | null
          created_at: string | null
          created_by: string
          format_id: string
          id: string
          published_at: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          created_by: string
          format_id: string
          id?: string
          published_at?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          created_by?: string
          format_id?: string
          id?: string
          published_at?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_content_format_id_fkey"
            columns: ["format_id"]
            isOneToOne: false
            referencedRelation: "content_formats"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_content_builders: {
        Row: {
          commentary: string | null
          content_id: string
          id: string
          position: number | null
          user_id: string
        }
        Insert: {
          commentary?: string | null
          content_id: string
          id?: string
          position?: number | null
          user_id: string
        }
        Update: {
          commentary?: string | null
          content_id?: string
          id?: string
          position?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_content_builders_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "marketing_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_content_builders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_content_builders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_content_products: {
        Row: {
          commentary: string | null
          content_id: string
          id: string
          position: number | null
          product_id: string
        }
        Insert: {
          commentary?: string | null
          content_id: string
          id?: string
          position?: number | null
          product_id: string
        }
        Update: {
          commentary?: string | null
          content_id?: string
          id?: string
          position?: number | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_content_products_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "marketing_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_content_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_content_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          email_sent: boolean | null
          id: string
          message: string | null
          read: boolean | null
          related_product_id: string | null
          related_user_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_sent?: boolean | null
          id?: string
          message?: string | null
          read?: boolean | null
          related_product_id?: string | null
          related_user_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_sent?: boolean | null
          id?: string
          message?: string | null
          read?: boolean | null
          related_product_id?: string | null
          related_user_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_product_id_fkey"
            columns: ["related_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_product_id_fkey"
            columns: ["related_product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_user_id_fkey"
            columns: ["related_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_user_id_fkey"
            columns: ["related_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          id: string
          plan: string
          product_id: string | null
          stripe_session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          plan: string
          product_id?: string | null
          stripe_session_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          plan?: string
          product_id?: string | null
          stripe_session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      product_analytics: {
        Row: {
          created_at: string
          event_type: string
          id: string
          product_id: string
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          product_id: string
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          product_id?: string
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_analytics_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_analytics_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_archives: {
        Row: {
          created_at: string | null
          id: string
          net_votes: number
          period: string
          product_id: string
          rank: number
          year: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          net_votes: number
          period: string
          product_id: string
          rank: number
          year: number
        }
        Update: {
          created_at?: string | null
          id?: string
          net_votes?: number
          period?: string
          product_id?: string
          rank?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_archives_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_archives_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      product_category_map: {
        Row: {
          category_id: number
          product_id: string
        }
        Insert: {
          category_id: number
          product_id: string
        }
        Update: {
          category_id?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_category_map_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_category_map_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_category_map_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_follows: {
        Row: {
          created_at: string | null
          follower_id: string
          product_id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          product_id: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_follows_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_follows_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_makers: {
        Row: {
          product_id: string
          user_id: string
        }
        Insert: {
          product_id: string
          user_id: string
        }
        Update: {
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_makers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_makers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_makers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_makers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      product_media: {
        Row: {
          id: string
          product_id: string
          type: string
          url: string
        }
        Insert: {
          id?: string
          product_id: string
          type: string
          url: string
        }
        Update: {
          id?: string
          product_id?: string
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_ratings: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          rating: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          rating: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          rating?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_ratings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_ratings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      product_tag_map: {
        Row: {
          product_id: string
          tag_id: number
        }
        Insert: {
          product_id: string
          tag_id: number
        }
        Update: {
          product_id?: string
          tag_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_tag_map_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_tag_map_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_tag_map_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "product_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      product_tags: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          name?: string
          slug?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          badge_embedded: boolean | null
          badge_verified_at: string | null
          coupon_code: string | null
          coupon_description: string | null
          created_at: string | null
          description: string | null
          domain_url: string | null
          id: string
          languages: string[] | null
          last_badge_check: string | null
          launch_date: string | null
          mrr_verified_at: string | null
          name: string | null
          owner_id: string
          platforms: string[] | null
          slug: string | null
          status: string | null
          stripe_connect_account_id: string | null
          stripe_product_id: string | null
          tagline: string | null
          verified_mrr: number | null
          won_daily: boolean | null
          won_monthly: boolean | null
          won_weekly: boolean | null
        }
        Insert: {
          badge_embedded?: boolean | null
          badge_verified_at?: string | null
          coupon_code?: string | null
          coupon_description?: string | null
          created_at?: string | null
          description?: string | null
          domain_url?: string | null
          id?: string
          languages?: string[] | null
          last_badge_check?: string | null
          launch_date?: string | null
          mrr_verified_at?: string | null
          name?: string | null
          owner_id: string
          platforms?: string[] | null
          slug?: string | null
          status?: string | null
          stripe_connect_account_id?: string | null
          stripe_product_id?: string | null
          tagline?: string | null
          verified_mrr?: number | null
          won_daily?: boolean | null
          won_monthly?: boolean | null
          won_weekly?: boolean | null
        }
        Update: {
          badge_embedded?: boolean | null
          badge_verified_at?: string | null
          coupon_code?: string | null
          coupon_description?: string | null
          created_at?: string | null
          description?: string | null
          domain_url?: string | null
          id?: string
          languages?: string[] | null
          last_badge_check?: string | null
          launch_date?: string | null
          mrr_verified_at?: string | null
          name?: string | null
          owner_id?: string
          platforms?: string[] | null
          slug?: string | null
          status?: string | null
          stripe_connect_account_id?: string | null
          stripe_product_id?: string | null
          tagline?: string | null
          verified_mrr?: number | null
          won_daily?: boolean | null
          won_monthly?: boolean | null
          won_weekly?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "products_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_analytics: {
        Row: {
          created_at: string
          event_type: string
          id: string
          product_id: string
          sponsored_position: number | null
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          product_id: string
          sponsored_position?: number | null
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          product_id?: string
          sponsored_position?: number | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_analytics_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_analytics_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsored_products: {
        Row: {
          created_at: string
          end_date: string
          id: string
          position: number
          product_id: string
          sponsorship_type: string
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          position?: number
          product_id: string
          sponsorship_type: string
          start_date: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          position?: number
          product_id?: string
          sponsorship_type?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsored_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsored_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      tag_intro_copy: {
        Row: {
          intro_copy: string | null
          meta_description: string | null
          tag_id: number
          updated_at: string | null
        }
        Insert: {
          intro_copy?: string | null
          meta_description?: string | null
          tag_id: number
          updated_at?: string | null
        }
        Update: {
          intro_copy?: string | null
          meta_description?: string | null
          tag_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tag_intro_copy_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: true
            referencedRelation: "product_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          annual_access_expires_at: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email_notifications_enabled: boolean | null
          id: string
          instagram: string | null
          linkedin: string | null
          name: string | null
          notify_on_comment: boolean | null
          notify_on_follow: boolean | null
          notify_on_launch: boolean | null
          notify_on_vote: boolean | null
          plan: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_cancel_at_period_end: boolean | null
          subscription_status: string | null
          telegram: string | null
          twitter: string | null
          updated_at: string | null
          username: string
          website: string | null
          youtube: string | null
        }
        Insert: {
          annual_access_expires_at?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email_notifications_enabled?: boolean | null
          id: string
          instagram?: string | null
          linkedin?: string | null
          name?: string | null
          notify_on_comment?: boolean | null
          notify_on_follow?: boolean | null
          notify_on_launch?: boolean | null
          notify_on_vote?: boolean | null
          plan?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_cancel_at_period_end?: boolean | null
          subscription_status?: string | null
          telegram?: string | null
          twitter?: string | null
          updated_at?: string | null
          username: string
          website?: string | null
          youtube?: string | null
        }
        Update: {
          annual_access_expires_at?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email_notifications_enabled?: boolean | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          name?: string | null
          notify_on_comment?: boolean | null
          notify_on_follow?: boolean | null
          notify_on_launch?: boolean | null
          notify_on_vote?: boolean | null
          plan?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_cancel_at_period_end?: boolean | null
          subscription_status?: string | null
          telegram?: string | null
          twitter?: string | null
          updated_at?: string | null
          username?: string
          website?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
      votes: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "votes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      product_analytics_summary: {
        Row: {
          product_id: string | null
          total_page_views: number | null
          total_website_clicks: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_analytics_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_analytics_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_rating_stats: {
        Row: {
          average_rating: number | null
          product_id: string | null
          rating_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_ratings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_ratings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_vote_counts: {
        Row: {
          net_votes: number | null
          product_id: string | null
          total_votes: number | null
        }
        Relationships: [
          {
            foreignKeyName: "votes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      public_products: {
        Row: {
          badge_embedded: boolean | null
          badge_verified_at: string | null
          coupon_description: string | null
          created_at: string | null
          description: string | null
          domain_url: string | null
          has_verified_revenue: boolean | null
          id: string | null
          languages: string[] | null
          last_badge_check: string | null
          launch_date: string | null
          name: string | null
          owner_id: string | null
          platforms: string[] | null
          slug: string | null
          status: string | null
          tagline: string | null
          won_daily: boolean | null
          won_monthly: boolean | null
          won_weekly: boolean | null
        }
        Insert: {
          badge_embedded?: boolean | null
          badge_verified_at?: string | null
          coupon_description?: string | null
          created_at?: string | null
          description?: string | null
          domain_url?: string | null
          has_verified_revenue?: never
          id?: string | null
          languages?: string[] | null
          last_badge_check?: string | null
          launch_date?: string | null
          name?: string | null
          owner_id?: string | null
          platforms?: string[] | null
          slug?: string | null
          status?: string | null
          tagline?: string | null
          won_daily?: boolean | null
          won_monthly?: boolean | null
          won_weekly?: boolean | null
        }
        Update: {
          badge_embedded?: boolean | null
          badge_verified_at?: string | null
          coupon_description?: string | null
          created_at?: string | null
          description?: string | null
          domain_url?: string | null
          has_verified_revenue?: never
          id?: string | null
          languages?: string[] | null
          last_badge_check?: string | null
          launch_date?: string | null
          name?: string | null
          owner_id?: string | null
          platforms?: string[] | null
          slug?: string | null
          status?: string | null
          tagline?: string | null
          won_daily?: boolean | null
          won_monthly?: boolean | null
          won_weekly?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "products_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          id: string | null
          instagram: string | null
          linkedin: string | null
          name: string | null
          telegram: string | null
          twitter: string | null
          updated_at: string | null
          username: string | null
          website: string | null
          youtube: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id?: string | null
          instagram?: string | null
          linkedin?: string | null
          name?: string | null
          telegram?: string | null
          twitter?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
          youtube?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id?: string | null
          instagram?: string | null
          linkedin?: string | null
          name?: string | null
          telegram?: string | null
          twitter?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_comment_count: { Args: { product_uuid: string }; Returns: number }
      get_product_rating: {
        Args: { product_uuid: string }
        Returns: {
          average_rating: number
          rating_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
