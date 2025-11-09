"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { getDocumentSignedUrl } from "@/lib/document-api";
import { Loader2, ImageOff } from "lucide-react";

interface SecureImageProps {
  documentId: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  expiresIn?: number; // URL expiration time in seconds (default: 3600 = 1 hour)
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

/**
 * SecureImage component for displaying private images stored in UploadThing
 * Automatically fetches signed URLs from the backend and handles expiration/refresh
 * 
 * @example
 * ```tsx
 * <SecureImage
 *   documentId="doc-123"
 *   alt="Asset photo"
 *   width={400}
 *   height={300}
 *   className="rounded-lg"
 * />
 * ```
 */
export function SecureImage({
  documentId,
  alt,
  className = "",
  width,
  height,
  fill = false,
  priority = false,
  expiresIn = 3600,
  objectFit = "cover",
  onLoad,
  onError,
}: SecureImageProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  const fetchSignedUrl = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await getDocumentSignedUrl(documentId, expiresIn);
      setSignedUrl(response.url);
      setExpiresAt(response.expiresAt);
      
      // Schedule refresh before expiration (refresh 5 minutes before expiry)
      const refreshTime = new Date(response.expiresAt).getTime() - Date.now() - 5 * 60 * 1000;
      if (refreshTime > 0) {
        setTimeout(() => {
          fetchSignedUrl();
        }, refreshTime);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load image";
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [documentId, expiresIn, onError]);

  useEffect(() => {
    fetchSignedUrl();
  }, [fetchSignedUrl]);

  // Handle loading state
  if (isLoading) {
    return (
      <div
        className={`flex items-center justify-center bg-muted ${className}`}
        style={fill ? undefined : { width, height }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Handle error state
  if (error || !signedUrl) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-muted ${className}`}
        style={fill ? undefined : { width, height }}
      >
        <ImageOff className="h-8 w-8 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">{error || "Failed to load"}</p>
      </div>
    );
  }

  // Render the image
  if (fill) {
    return (
      <Image
        src={signedUrl}
        alt={alt}
        fill
        priority={priority}
        className={className}
        style={{ objectFit }}
        onLoad={onLoad}
        onError={() => {
          setError("Image failed to load");
          onError?.(new Error("Image failed to load"));
        }}
      />
    );
  }

  if (!width || !height) {
    throw new Error("SecureImage: width and height are required when fill is false");
  }

  return (
    <Image
      src={signedUrl}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      className={className}
      style={{ objectFit }}
      onLoad={onLoad}
      onError={() => {
        setError("Image failed to load");
        onError?.(new Error("Image failed to load"));
      }}
    />
  );
}
