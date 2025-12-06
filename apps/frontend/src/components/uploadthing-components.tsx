"use client";

import {
  generateUploadButton,
  generateUploadDropzone,
} from "@uploadthing/react";
import type { OurFileRouter } from "@/lib/uploadthing/uploadthing";

// Re-export @uploadthing/shared to ensure TypeScript can resolve the dependency
// This fixes pnpm deep dependency type inference issues during build
export type {} from "@uploadthing/shared";

/**
 * Type-safe UploadButton component for the OurFileRouter
 * @see https://docs.uploadthing.com/getting-started/appdir
 */
export const UploadButton = generateUploadButton<OurFileRouter>();

/**
 * Type-safe UploadDropzone component for the OurFileRouter
 * @see https://docs.uploadthing.com/getting-started/appdir
 */
export const UploadDropzone = generateUploadDropzone<OurFileRouter>();
