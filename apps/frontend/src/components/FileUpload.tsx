"use client";

import { X } from "lucide-react";
import { UploadButton } from "./uploadthing-components";
import type { OurFileRouter } from "@/lib/uploadthing/uploadthing";
import { useFileUpload, type UseFileUploadOptions } from "@/hooks/use-file-upload";
import type { UploadedFile } from "@fundifyhub/types";
import { Button } from "./button";

interface FileUploadProps extends Omit<UseFileUploadOptions, "onUploadComplete" | "onUploadError"> {
  endpoint: keyof OurFileRouter;
  onFilesChange?: (files: UploadedFile[]) => void;
  disabled?: boolean;
  className?: string;
  showFileList?: boolean;
}

/**
 * Reusable file upload component using UploadThing
 * 
 * @example
 * ```tsx
 * <FileUpload
 *   endpoint="assetImageUploader"
 *   multiple={true}
 *   maxFiles={5}
 *   documentType="ASSET_PHOTO"
 *   documentCategory="ASSET"
 *   uploadedBy={user.id}
 *   autoSaveToDatabase={true}
 *   onFilesChange={(files) => console.log(files)}
 * />
 * ```
 */
export function FileUpload({
  endpoint,
  onFilesChange,
  disabled = false,
  className = "",
  showFileList = true,
  ...uploadOptions
}: FileUploadProps) {
  const {
    uploadedFiles,
    isUploading,
    isSavingToDatabase,
    uploadProgress,
    error,
    handleUploadComplete,
    handleUploadError,
    handleUploadBegin,
    removeFile,
    clearFiles,
  } = useFileUpload({
    ...uploadOptions,
    onUploadComplete: (files) => {
      onFilesChange?.(files);
    },
    onUploadError: (err) => {
      console.error("Upload error:", err);
    },
  });

  return (
    <div className={`space-y-4 ${className}`}>
      <UploadButton
        endpoint={endpoint}
        onClientUploadComplete={(res: any[]) => {
          const files: UploadedFile[] = res.map((file: any) => ({
            fileKey: file.key,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            url: file.url,
          }));
          handleUploadComplete(files);
        }}
        onUploadError={(err: Error) => {
          handleUploadError(err);
        }}
        onUploadBegin={handleUploadBegin}
        disabled={disabled || isUploading || isSavingToDatabase}
        config={{
          mode: "auto",
          appendOnPaste: true,
        }}
      />

      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Uploading...</span>
            <span className="font-medium">{uploadProgress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {isSavingToDatabase && (
        <div className="text-sm text-muted-foreground">Saving to database...</div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {showFileList && uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              Uploaded Files ({uploadedFiles.length})
            </h4>
            {uploadedFiles.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFiles}
                className="h-8 text-xs"
              >
                Clear All
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.fileKey}
                className="flex items-center justify-between rounded-md border border-border bg-card p-3"
              >
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">{file.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.fileSize / 1024).toFixed(2)} KB · {file.fileType}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(file.fileKey)}
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
