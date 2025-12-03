'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Camera, 
  X, 
  Loader2, 
  CheckCircle, 
  ImageIcon 
} from 'lucide-react';
import { UploadDropzone } from '@/components/uploadthing-components';
import { postWithResult, deleteWithResult } from '@/lib/api-client';
import { useToast } from '@/hooks';
import { DOCUMENT_TYPE, LOCAL_STORAGE_KEYS } from '@fundifyhub/types';

interface InspectionPhotoUploadProps {
  requestId: string;
  onPhotosChange?: (photos: StagedPhoto[]) => void;
}

interface StagedPhoto {
  fileKey: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  url?: string;
  dbId?: string;
}

const getStorageKey = (requestId: string) => LOCAL_STORAGE_KEYS.INSPECTION_PHOTOS(requestId);

export function InspectionPhotoUpload({
  requestId,
  onPhotosChange,
}: InspectionPhotoUploadProps) {
  const [stagedPhotos, setStagedPhotos] = useState<StagedPhoto[]>([]);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const { success: toastSuccess, error: toastError } = useToast();

  // Load staged photos from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(getStorageKey(requestId));
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as StagedPhoto[];
        setStagedPhotos(parsed);
      } catch (e) {
        console.error('Failed to parse staged photos from localStorage:', e);
      }
    }
  }, [requestId]);

  // Save staged photos to localStorage whenever they change
  useEffect(() => {
    if (stagedPhotos.length > 0) {
      localStorage.setItem(getStorageKey(requestId), JSON.stringify(stagedPhotos));
    } else {
      localStorage.removeItem(getStorageKey(requestId));
    }
    onPhotosChange?.(stagedPhotos);
  }, [stagedPhotos, requestId, onPhotosChange]);

  const handleUploadComplete = async (res: any[]) => {
    try {
      const newPhotos: StagedPhoto[] = [];
      
      for (const file of res) {
        const fileKey = file.key || file.serverData?.fileKey || file.fileKey;
        const fileName = file.name || file.serverData?.fileName || file.fileName;
        const fileSize = file.size || file.serverData?.fileSize || file.fileSize;
        const fileType = file.type || file.serverData?.fileType || file.fileType;
        
        // Save to database with INSPECTION_PHOTO type
        const result = await postWithResult<{ document: { id: string } }>(`/api/v1/requests/${requestId}/documents`, {
          fileKey,
          fileName,
          fileSize,
          fileType,
          category: DOCUMENT_TYPE.INSPECTION_PHOTO,
        });

        if (result.ok && result.data?.document) {
          newPhotos.push({
            fileKey,
            fileName,
            fileSize,
            fileType,
            url: file.url,
            dbId: result.data.document.id,
          });
        } else {
          console.error('Failed to save document:', result.ok ? 'No document ID' : result.error?.message);
          toastError(`Failed to save ${fileName}`);
        }
      }
      
      if (newPhotos.length > 0) {
        setStagedPhotos((prev) => [...prev, ...newPhotos]);
        toastSuccess(`${newPhotos.length} photo${newPhotos.length > 1 ? 's' : ''} uploaded successfully`);
      }
    } catch (err) {
      toastError('Failed to save inspection photos');
      console.error(err);
    }
  };

  const handleRemovePhoto = async (photoToRemove: StagedPhoto) => {
    setIsRemoving(photoToRemove.fileKey);
    try {
      if (photoToRemove.dbId) {
        const result = await deleteWithResult(`/api/v1/documents/${photoToRemove.dbId}`);
        if (!result.ok) {
          console.error('Failed to delete document from DB:', result.error?.message);
        }
      }
      
      setStagedPhotos((prev) => prev.filter((p) => p.fileKey !== photoToRemove.fileKey));
      toastSuccess('Photo removed');
    } catch (err) {
      console.error('Error removing photo:', err);
      toastError('Failed to remove photo');
    } finally {
      setIsRemoving(null);
    }
  };

  const clearAllPhotos = () => {
    setStagedPhotos([]);
    localStorage.removeItem(getStorageKey(requestId));
  };

  return (
    <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/10">
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-start gap-3">
          <Camera className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Upload Inspection Photos
            </h4>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
              Capture photos of the asset during inspection. Photos will be attached to this request.
            </p>
          </div>
        </div>

        {/* Upload Area */}
        <div className="border-2 border-dashed border-blue-200 dark:border-blue-800 rounded-lg bg-background/50">
          <UploadDropzone
            endpoint="assetImageUploader"
            onClientUploadComplete={handleUploadComplete}
            onUploadError={(error: Error) => toastError(`Upload failed: ${error.message}`)}
            config={{ mode: "auto" }}
            appearance={{
              container: "p-3",
              button: "bg-blue-600 hover:bg-blue-700 text-white text-sm",
              label: "text-blue-700 dark:text-blue-300 text-sm",
              allowedContent: "text-blue-600/70 dark:text-blue-400/70 text-xs"
            }}
          />
        </div>

        {/* Uploaded Photos Grid */}
        {stagedPhotos.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Uploaded Photos ({stagedPhotos.length})
              </h5>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {stagedPhotos.map((photo) => (
                <div 
                  key={photo.fileKey}
                  className="relative group rounded-lg overflow-hidden border border-blue-100 dark:border-blue-900 bg-background aspect-square"
                >
                  {photo.url ? (
                    <img 
                      src={photo.url} 
                      alt={photo.fileName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Remove button overlay */}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemovePhoto(photo)}
                    disabled={isRemoving === photo.fileKey}
                  >
                    {isRemoving === photo.fileKey ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                  </Button>

                  {/* File name tooltip */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs text-white truncate">{photo.fileName}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default InspectionPhotoUpload;
