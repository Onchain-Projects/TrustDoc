import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  Image, 
  FileType, 
  File,
  Download,
  Eye,
  X
} from 'lucide-react'

interface FilePreviewProps {
  file: {
    name: string
    size: number
    type: string
    hash: string
    preview?: string
  }
  onRemove?: () => void
  onDownload?: () => void
  showActions?: boolean
}

const FILE_TYPE_ICONS = {
  'application/pdf': { icon: FileText, color: 'text-red-600', label: 'PDF' },
  'image/jpeg': { icon: Image, color: 'text-blue-600', label: 'JPEG' },
  'image/jpg': { icon: Image, color: 'text-blue-600', label: 'JPG' },
  'image/png': { icon: Image, color: 'text-green-600', label: 'PNG' },
  'application/msword': { icon: FileType, color: 'text-blue-600', label: 'DOC' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: FileType, color: 'text-blue-600', label: 'DOCX' },
  'text/plain': { icon: FileText, color: 'text-gray-600', label: 'TXT' },
  'application/vnd.ms-excel': { icon: FileType, color: 'text-green-600', label: 'XLS' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: FileType, color: 'text-green-600', label: 'XLSX' }
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  onRemove,
  onDownload,
  showActions = true
}) => {
  const fileType = FILE_TYPE_ICONS[file.type as keyof typeof FILE_TYPE_ICONS]
  const IconComponent = fileType?.icon || File
  const fileLabel = fileType?.label || 'Unknown'

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-start space-x-3">
        {/* File Icon/Preview */}
        <div className="flex-shrink-0">
          {file.preview ? (
            <img
              src={file.preview}
              alt={file.name}
              className="w-12 h-12 object-cover rounded border"
            />
          ) : (
            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
              <IconComponent className={`w-6 h-6 ${fileType?.color || 'text-gray-600'}`} />
            </div>
          )}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h4 className="text-sm font-medium truncate">{file.name}</h4>
            <Badge variant="outline" className="text-xs">
              {fileLabel}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
            <span>{formatFileSize(file.size)}</span>
            <span className="font-mono">Hash: {file.hash.slice(0, 8)}...</span>
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center space-x-1">
            {onDownload && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDownload}
                className="h-8 w-8 p-0"
              >
                <Download className="w-4 h-4" />
              </Button>
            )}
            
            {onRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
