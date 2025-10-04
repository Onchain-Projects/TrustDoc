import { supabase, type Owner, type Issuer } from './supabase'
import { blockchainService } from './blockchain/blockchain-service'

export interface CreateOwnerData {
  email: string
  password: string
  name: string
  address: string
}

export interface IssuerApprovalData {
  issuerId: string
  metaMaskAddress: string
  isApproved: boolean
  approvedBy: string // Owner ID
  approvalNotes?: string
}

export interface OwnerStats {
  totalIssuers: number
  approvedIssuers: number
  pendingIssuers: number
  totalVerifications: number
}

export class OwnerService {
  /**
   * Create the first owner account
   */
  static async createOwner(data: CreateOwnerData): Promise<Owner> {
    try {
      // Check if any owner already exists
      const { data: existingOwners, error: checkError } = await supabase
        .from('owners')
        .select('id')
        .limit(1)

      if (checkError) {
        throw new Error(`Failed to check existing owners: ${checkError.message}`)
      }

      if (existingOwners && existingOwners.length > 0) {
        throw new Error('Owner account already exists. Only one owner is allowed.')
      }

      // Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            user_type: 'owner',
          }
        }
      })

      if (authError) {
        throw new Error(`Failed to create auth user: ${authError.message}`)
      }

      if (!authData.user) {
        throw new Error('Failed to create auth user')
      }

      // Create owner record
      const { data: ownerData, error: ownerError } = await supabase
        .from('owners')
        .insert({
          email: data.email,
          password: data.password, // In production, this should be hashed
          address: data.address,
          name: data.name,
          auth_user_id: authData.user.id, // Link to auth user
        })
        .select()
        .single()

      if (ownerError) {
        throw new Error(`Failed to create owner: ${ownerError.message}`)
      }

      console.log('Owner created successfully:', ownerData.id)
      return ownerData
    } catch (error) {
      console.error('Error creating owner:', error)
      throw error
    }
  }

  /**
   * Get owner by email
   */
  static async getOwnerByEmail(email: string): Promise<Owner | null> {
    try {
      const { data, error } = await supabase
        .from('owners')
        .select('*')
        .eq('email', email)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // No owner found
        }
        throw new Error(`Failed to get owner: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error getting owner:', error)
      throw error
    }
  }

  /**
   * Get all pending issuers (not yet approved)
   */
  static async getPendingIssuers(): Promise<Issuer[]> {
    try {
      const { data, error } = await supabase
        .from('issuers')
        .select('*')
        .eq('is_approved', false)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to get pending issuers: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Error getting pending issuers:', error)
      throw error
    }
  }

  /**
   * Get all approved issuers
   */
  static async getApprovedIssuers(): Promise<Issuer[]> {
    try {
      const { data, error } = await supabase
        .from('issuers')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to get approved issuers: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Error getting approved issuers:', error)
      throw error
    }
  }

  /**
   * Approve or reject an issuer (Unified Flow: Database + Smart Contract)
   */
  static async approveIssuer(data: IssuerApprovalData): Promise<void> {
    try {
      // Step 1: Get issuer details from database
      const { data: issuer, error: fetchError } = await supabase
        .from('issuers')
        .select('*')
        .eq('issuer_id', data.issuerId)
        .single()

      if (fetchError || !issuer) {
        throw new Error(`Failed to fetch issuer: ${fetchError?.message || 'Issuer not found'}`)
      }

      if (!issuer.meta_mask_address) {
        throw new Error('Issuer MetaMask address is required for blockchain registration')
      }

      // Step 2: Update database approval status
      const { error: dbError } = await supabase
        .from('issuers')
        .update({
          is_approved: data.isApproved,
          approved_by: data.approvedBy,
          approval_date: new Date().toISOString(),
          approval_notes: data.approvalNotes || null,
          blockchain_address: data.isApproved ? issuer.meta_mask_address : null,
        })
        .eq('issuer_id', data.issuerId)

      if (dbError) {
        throw new Error(`Failed to update issuer approval in database: ${dbError.message}`)
      }

      console.log(`✅ Database updated: Issuer ${data.issuerId} ${data.isApproved ? 'approved' : 'rejected'}`)

      // Step 3: If approved, register on smart contract
      if (data.isApproved) {
        try {
          console.log('🔗 Adding issuer as worker on blockchain...')
          
          // Add issuer as worker on smart contract
          const workerTxHash = await blockchainService.addWorker(issuer.meta_mask_address)
          console.log('✅ Worker added on blockchain:', workerTxHash)

          // Register issuer on smart contract
          const issuerTxHash = await blockchainService.registerIssuer({
            issuerId: data.issuerId,
            name: issuer.name,
            walletAddress: issuer.meta_mask_address
          })
          console.log('✅ Issuer registered on blockchain:', issuerTxHash)

          // Update database with transaction hashes
          await supabase
            .from('issuers')
            .update({
              blockchain_address: issuer.meta_mask_address,
              blockchain_registration_tx: issuerTxHash,
              worker_addition_tx: workerTxHash
            })
            .eq('issuer_id', data.issuerId)

          console.log('🎉 Unified approval flow completed successfully!')
          console.log(`   Issuer: ${data.issuerId}`)
          console.log(`   Database: ✅ Approved`)
          console.log(`   Worker: ✅ Added (${workerTxHash})`)
          console.log(`   Registration: ✅ Complete (${issuerTxHash})`)

        } catch (blockchainError) {
          console.error('❌ Blockchain integration failed:', blockchainError)
          
          // Mark as approved but blockchain integration failed
          await supabase
            .from('issuers')
            .update({
              blockchain_address: issuer.meta_mask_address,
              blockchain_registration_tx: 'blockchain_integration_failed',
              worker_addition_tx: 'blockchain_integration_failed'
            })
            .eq('issuer_id', data.issuerId)
          
          console.log('⚠️ Issuer approved but blockchain integration failed')
          console.log(`   Issuer: ${data.issuerId}`)
          console.log(`   Database: ✅ Approved`)
          console.log(`   Blockchain: ❌ Integration failed`)
          console.log(`   Error: ${blockchainError}`)
          
          // Don't throw error - issuer is still approved in database
          // They can try blockchain integration later
        }
      }

    } catch (error) {
      console.error('Error in unified approval flow:', error)
      throw error
    }
  }

  /**
   * Retry blockchain integration for a failed issuer
   */
  static async retryBlockchainIntegration(issuerId: string, approvedBy: string): Promise<void> {
    try {
      console.log(`🔄 Retrying blockchain integration for issuer: ${issuerId}`)
      
      // Step 1: Get issuer details from database
      const { data: issuer, error: fetchError } = await supabase
        .from('issuers')
        .select('*')
        .eq('issuer_id', issuerId)
        .single()

      if (fetchError || !issuer) {
        throw new Error(`Failed to fetch issuer: ${fetchError?.message || 'Issuer not found'}`)
      }

      if (!issuer.meta_mask_address) {
        throw new Error('Issuer MetaMask address is required for blockchain registration')
      }

      // Step 2: Check current blockchain status and retry integration
      try {
        console.log('🔍 Checking current blockchain status...')
        
        // Check if already a worker
        const isAlreadyWorker = await blockchainService.isWorker(issuer.meta_mask_address)
        console.log(`Worker status: ${isAlreadyWorker ? 'Already a worker' : 'Not a worker'}`)
        
        let workerTxHash = 'already_worker'
        let issuerTxHash = ''
        
        // Only add as worker if not already one
        if (!isAlreadyWorker) {
          console.log('🔗 Adding issuer as worker on blockchain...')
          workerTxHash = await blockchainService.addWorker(issuer.meta_mask_address)
          console.log('✅ Worker added on blockchain:', workerTxHash)
        } else {
          console.log('✅ Worker already exists on blockchain')
        }

        // Register issuer on smart contract (this might also fail if already registered)
        try {
          issuerTxHash = await blockchainService.registerIssuer({
            issuerId: issuerId,
            name: issuer.name,
            walletAddress: issuer.meta_mask_address
          })
          console.log('✅ Issuer registered on blockchain:', issuerTxHash)
        } catch (registerError: any) {
          if (registerError.message?.includes('already registered') || registerError.message?.includes('Already a worker')) {
            console.log('✅ Issuer already registered on blockchain')
            issuerTxHash = 'already_registered'
          } else {
            throw registerError
          }
        }

        // Update database with transaction hashes or status
        await supabase
          .from('issuers')
          .update({
            blockchain_address: issuer.meta_mask_address,
            blockchain_registration_tx: issuerTxHash,
            worker_addition_tx: workerTxHash,
            approval_notes: `Blockchain integration retry successful. Worker: ${isAlreadyWorker ? 'already existed' : 'added'}, Registration: ${issuerTxHash === 'already_registered' ? 'already existed' : 'completed'}. Original approval: ${issuer.approval_date}`
          })
          .eq('issuer_id', issuerId)

        console.log('🎉 Blockchain integration retry completed successfully!')
        console.log(`   Issuer: ${issuerId}`)
        console.log(`   Worker: ${isAlreadyWorker ? 'Already existed' : `Added (${workerTxHash})`}`)
        console.log(`   Registration: ${issuerTxHash === 'already_registered' ? 'Already existed' : `Complete (${issuerTxHash})`}`)

      } catch (blockchainError) {
        console.error('❌ Blockchain integration retry failed:', blockchainError)
        
        // Update with retry failure details
        await supabase
          .from('issuers')
          .update({
            blockchain_registration_tx: 'blockchain_integration_failed',
            worker_addition_tx: 'blockchain_integration_failed',
            approval_notes: `Blockchain integration retry failed: ${blockchainError}. Original approval: ${issuer.approval_date}`
          })
          .eq('issuer_id', issuerId)
        
        throw new Error(`Blockchain integration retry failed: ${blockchainError}`)
      }

    } catch (error) {
      console.error('Error in blockchain integration retry:', error)
      throw error
    }
  }

  /**
   * Get owner statistics
   */
  static async getOwnerStats(ownerId: string): Promise<OwnerStats> {
    try {
      const [pendingResult, approvedResult] = await Promise.all([
        supabase
          .from('issuers')
          .select('id')
          .eq('is_approved', false),
        supabase
          .from('issuers')
          .select('id')
          .eq('is_approved', true)
      ])

      if (pendingResult.error) {
        throw new Error(`Failed to get pending issuers: ${pendingResult.error.message}`)
      }

      if (approvedResult.error) {
        throw new Error(`Failed to get approved issuers: ${approvedResult.error.message}`)
      }

      const pendingCount = pendingResult.data?.length || 0
      const approvedCount = approvedResult.data?.length || 0

      return {
        totalIssuers: pendingCount + approvedCount,
        approvedIssuers: approvedCount,
        pendingIssuers: pendingCount,
        totalVerifications: 0, // TODO: Implement verification counting
      }
    } catch (error) {
      console.error('Error getting owner stats:', error)
      throw error
    }
  }

  /**
   * Update owner profile
   */
  static async updateOwnerProfile(ownerId: string, updates: Partial<CreateOwnerData>): Promise<Owner> {
    try {
      const { data, error } = await supabase
        .from('owners')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ownerId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update owner profile: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error updating owner profile:', error)
      throw error
    }
  }
}