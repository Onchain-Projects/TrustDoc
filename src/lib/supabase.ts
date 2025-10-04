import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create a single Supabase client instance to avoid multiple instances
let supabaseInstance: any = null

export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'trustdoc-auth-token'
      }
    })
  }
  return supabaseInstance
})()

// Create Supabase client for server-side operations (with service role key)
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

// Database types based on your schema
export interface Issuer {
  id: string
  email: string
  password: string
  address: string
  issuer_id: string
  name: string
  public_key: string
  private_key: string
  meta_mask_address: string
  is_approved: boolean
  approved_by?: string
  approval_date?: string
  approval_notes?: string
  blockchain_address?: string
  blockchain_registration_tx?: string
  worker_addition_tx?: string
  created_at: string
  updated_at: string
}

export interface Owner {
  id: string
  email: string
  password: string
  address: string
  name: string
  auth_user_id?: string // Link to auth.users table
  created_at: string
  updated_at: string
}

export interface OwnerVerification {
  id: string
  owner_id: string
  document_hash: string
  merkle_root: string
  verification_result: boolean
  verification_date: string
  issuer_id?: string
  document_name?: string
  verification_method: 'qr_code' | 'manual' | 'file_upload'
}

export interface IssuerApprovalHistory {
  id: string
  issuer_id: string
  owner_id: string
  action: 'approve' | 'reject'
  approval_notes?: string
  created_at: string
}

export interface Proof {
  id: string
  issuer_id: string
  batch: string
  merkle_root: string
  proof_json: any
  signature?: string
  file_paths: string[]
  created_at: string
  expiry_date?: string
  description?: string
}

// Auth types
export interface AuthUser {
  id: string
  email: string
  user_metadata?: {
    name?: string
    issuer_id?: string
    user_type?: 'issuer' | 'owner'
  }
}

// Storage types
export interface StorageFile {
  name: string
  size: number
  type: string
  lastModified: number
}
