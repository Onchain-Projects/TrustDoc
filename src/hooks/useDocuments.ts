import { useState, useEffect, useCallback } from 'react'
import { documentService, type CreateProofData } from '@/lib/documents'
import type { Proof } from '@/lib/supabase'

export interface DocumentState {
  proofs: Proof[]
  loading: boolean
  error: string | null
  uploading: boolean
}

export const useDocuments = (issuerId?: string) => {
  const [documentState, setDocumentState] = useState<DocumentState>({
    proofs: [],
    loading: false,
    error: null,
    uploading: false
  })

  // Load proofs for issuer
  const loadProofs = useCallback(async () => {
    if (!issuerId) {
      console.log('useDocuments: No issuerId provided')
      return
    }

    console.log('useDocuments: Loading proofs for issuer:', issuerId)
    setDocumentState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const proofs = await documentService.getProofsByIssuer(issuerId)
      console.log('useDocuments: Loaded proofs:', proofs)
      setDocumentState(prev => ({
        ...prev,
        proofs,
        loading: false,
        error: null
      }))
    } catch (error) {
      console.error('useDocuments: Error loading proofs:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load proofs'
      setDocumentState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false
      }))
    }
  }, [issuerId])

  // Upload files and create proof
  const uploadDocuments = async (
    files: File[],
    batchName: string,
    proofData: Omit<CreateProofData, 'issuer_id' | 'batch' | 'file_paths'>
  ) => {
    if (!issuerId) {
      throw new Error('Issuer ID is required')
    }

    setDocumentState(prev => ({ ...prev, uploading: true, error: null }))
    
    try {
      // Upload files to storage
      const filePaths = await documentService.batchUploadFiles(files, issuerId, batchName)
      
      // Create proof record
      const proof = await documentService.createProof({
        ...proofData,
        issuer_id: issuerId,
        batch: batchName,
        file_paths: filePaths
      })

      // Update local state
      setDocumentState(prev => ({
        ...prev,
        proofs: [proof, ...prev.proofs],
        uploading: false,
        error: null
      }))

      return proof
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      setDocumentState(prev => ({
        ...prev,
        error: errorMessage,
        uploading: false
      }))
      throw error
    }
  }

  // Delete proof
  const deleteProof = async (proofId: string) => {
    setDocumentState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      await documentService.deleteProof(proofId)
      
      // Update local state
      setDocumentState(prev => ({
        ...prev,
        proofs: prev.proofs.filter(proof => proof.id !== proofId),
        loading: false,
        error: null
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Delete failed'
      setDocumentState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false
      }))
      throw error
    }
  }

  // Search proofs
  const searchProofs = useCallback(async (query: string) => {
    if (!issuerId) return

    setDocumentState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const proofs = await documentService.searchProofs(query, issuerId)
      setDocumentState(prev => ({
        ...prev,
        proofs,
        loading: false,
        error: null
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Search failed'
      setDocumentState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false
      }))
    }
  }, [issuerId])

  // Verify document
  const verifyDocument = async (merkleRoot: string) => {
    try {
      const result = await documentService.verifyDocument(merkleRoot)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Verification failed'
      setDocumentState(prev => ({ ...prev, error: errorMessage }))
      throw error
    }
  }

  // Clear error
  const clearError = useCallback(() => {
    setDocumentState(prev => ({ ...prev, error: null }))
  }, [])

  // Load proofs on mount
  useEffect(() => {
    if (issuerId) {
      loadProofs()
    }
  }, [issuerId, loadProofs])

  return {
    ...documentState,
    loadProofs,
    uploadDocuments,
    deleteProof,
    searchProofs,
    verifyDocument,
    clearError
  }
}
