import { supabase } from './supabase'

export interface VerificationRecord {
  id: string
  ownerId: string
  documentHash: string
  merkleRoot: string
  verificationResult: boolean
  verificationDate: Date
  issuerId: string
  documentName: string
  verificationMethod: 'qr_code' | 'manual' | 'file_upload'
}

export interface VerificationStats {
  totalVerifications: number
  validVerifications: number
  invalidVerifications: number
  lastVerification: Date | null
  averageVerificationsPerDay: number
  mostCommonIssuer: string | null
}

export class OwnerService {
  /**
   * Record a verification attempt
   */
  static async recordVerification(verificationData: {
    ownerId: string
    documentHash: string
    merkleRoot: string
    verificationResult: boolean
    issuerId: string
    documentName: string
    verificationMethod: 'qr_code' | 'manual' | 'file_upload'
  }): Promise<VerificationRecord> {
    try {
      const { data, error } = await supabase
        .from('owner_verifications')
        .insert({
          owner_id: verificationData.ownerId,
          document_hash: verificationData.documentHash,
          merkle_root: verificationData.merkleRoot,
          verification_result: verificationData.verificationResult,
          issuer_id: verificationData.issuerId,
          document_name: verificationData.documentName,
          verification_method: verificationData.verificationMethod,
          verification_date: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to record verification: ${error.message}`)
      }

      return {
        id: data.id,
        ownerId: data.owner_id,
        documentHash: data.document_hash,
        merkleRoot: data.merkle_root,
        verificationResult: data.verification_result,
        verificationDate: new Date(data.verification_date),
        issuerId: data.issuer_id,
        documentName: data.document_name,
        verificationMethod: data.verification_method
      }
    } catch (error) {
      console.error('Error recording verification:', error)
      throw error
    }
  }

  /**
   * Get verification history for an owner
   */
  static async getVerificationHistory(
    ownerId: string, 
    limit: number = 50,
    offset: number = 0
  ): Promise<VerificationRecord[]> {
    try {
      const { data, error } = await supabase
        .from('owner_verifications')
        .select('*')
        .eq('owner_id', ownerId)
        .order('verification_date', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        throw new Error(`Failed to get verification history: ${error.message}`)
      }

      return (data || []).map(record => ({
        id: record.id,
        ownerId: record.owner_id,
        documentHash: record.document_hash,
        merkleRoot: record.merkle_root,
        verificationResult: record.verification_result,
        verificationDate: new Date(record.verification_date),
        issuerId: record.issuer_id,
        documentName: record.document_name,
        verificationMethod: record.verification_method
      }))
    } catch (error) {
      console.error('Error getting verification history:', error)
      throw error
    }
  }

  /**
   * Get verification statistics for an owner
   */
  static async getVerificationStats(ownerId: string): Promise<VerificationStats> {
    try {
      const { data, error } = await supabase
        .from('owner_verifications')
        .select('verification_result, verification_date, issuer_id')
        .eq('owner_id', ownerId)

      if (error) {
        throw new Error(`Failed to get verification stats: ${error.message}`)
      }

      const verifications = data || []
      const totalVerifications = verifications.length
      const validVerifications = verifications.filter(v => v.verification_result).length
      const invalidVerifications = totalVerifications - validVerifications
      
      const lastVerification = verifications.length > 0 
        ? new Date(Math.max(...verifications.map(v => new Date(v.verification_date).getTime())))
        : null

      // Calculate average verifications per day
      const now = new Date()
      const firstVerification = verifications.length > 0 
        ? new Date(Math.min(...verifications.map(v => new Date(v.verification_date).getTime())))
        : now
      const daysDiff = Math.max(1, Math.ceil((now.getTime() - firstVerification.getTime()) / (1000 * 60 * 60 * 24)))
      const averageVerificationsPerDay = totalVerifications / daysDiff

      // Find most common issuer
      const issuerCounts = verifications.reduce((acc, v) => {
        acc[v.issuer_id] = (acc[v.issuer_id] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      const mostCommonIssuer = Object.keys(issuerCounts).length > 0
        ? Object.keys(issuerCounts).reduce((a, b) => issuerCounts[a] > issuerCounts[b] ? a : b)
        : null

      return {
        totalVerifications,
        validVerifications,
        invalidVerifications,
        lastVerification,
        averageVerificationsPerDay,
        mostCommonIssuer
      }
    } catch (error) {
      console.error('Error getting verification stats:', error)
      throw error
    }
  }

  /**
   * Search verification history
   */
  static async searchVerifications(
    ownerId: string,
    query: string,
    limit: number = 20
  ): Promise<VerificationRecord[]> {
    try {
      const { data, error } = await supabase
        .from('owner_verifications')
        .select('*')
        .eq('owner_id', ownerId)
        .or(`document_name.ilike.%${query}%,issuer_id.ilike.%${query}%,merkle_root.ilike.%${query}%`)
        .order('verification_date', { ascending: false })
        .limit(limit)

      if (error) {
        throw new Error(`Failed to search verifications: ${error.message}`)
      }

      return (data || []).map(record => ({
        id: record.id,
        ownerId: record.owner_id,
        documentHash: record.document_hash,
        merkleRoot: record.merkle_root,
        verificationResult: record.verification_result,
        verificationDate: new Date(record.verification_date),
        issuerId: record.issuer_id,
        documentName: record.document_name,
        verificationMethod: record.verification_method
      }))
    } catch (error) {
      console.error('Error searching verifications:', error)
      throw error
    }
  }

  /**
   * Get verification by ID
   */
  static async getVerificationById(verificationId: string): Promise<VerificationRecord | null> {
    try {
      const { data, error } = await supabase
        .from('owner_verifications')
        .select('*')
        .eq('id', verificationId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new Error(`Failed to get verification: ${error.message}`)
      }

      return {
        id: data.id,
        ownerId: data.owner_id,
        documentHash: data.document_hash,
        merkleRoot: data.merkle_root,
        verificationResult: data.verification_result,
        verificationDate: new Date(data.verification_date),
        issuerId: data.issuer_id,
        documentName: data.document_name,
        verificationMethod: data.verification_method
      }
    } catch (error) {
      console.error('Error getting verification by ID:', error)
      throw error
    }
  }

  /**
   * Delete verification record
   */
  static async deleteVerification(verificationId: string, ownerId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('owner_verifications')
        .delete()
        .eq('id', verificationId)
        .eq('owner_id', ownerId)

      if (error) {
        throw new Error(`Failed to delete verification: ${error.message}`)
      }

      return true
    } catch (error) {
      console.error('Error deleting verification:', error)
      throw error
    }
  }

  /**
   * Export verification history
   */
  static async exportVerificationHistory(ownerId: string): Promise<string> {
    try {
      const verifications = await this.getVerificationHistory(ownerId, 1000) // Get up to 1000 records
      
      const csvData = [
        ['Date', 'Document Name', 'Issuer ID', 'Merkle Root', 'Result', 'Method'],
        ...verifications.map(v => [
          v.verificationDate.toISOString(),
          v.documentName,
          v.issuerId,
          v.merkleRoot,
          v.verificationResult ? 'Valid' : 'Invalid',
          v.verificationMethod
        ])
      ]

      return csvData.map(row => row.join(',')).join('\n')
    } catch (error) {
      console.error('Error exporting verification history:', error)
      throw error
    }
  }

  /**
   * Get owner profile
   */
  static async getOwnerProfile(ownerId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('owners')
        .select('*')
        .eq('id', ownerId)
        .single()

      if (error) {
        throw new Error(`Failed to get owner profile: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error getting owner profile:', error)
      throw error
    }
  }

  /**
   * Update owner profile
   */
  static async updateOwnerProfile(
    ownerId: string, 
    updates: {
      name?: string
      address?: string
      email?: string
    }
  ): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('owners')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
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
