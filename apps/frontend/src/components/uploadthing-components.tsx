"use client";

import { generateUploadButton, generateUploadDropzone } from "@uploadthing/react";
import type { OurFileRouter } from "@/lib/uploadthing/uploadthing";

// @ts-ignore - UploadThing component type inference issue with pnpm
export const UploadButton: any = generateUploadButton<OurFileRouter>();
// @ts-ignore - UploadThing component type inference issue with pnpm
export const UploadDropzone: any = generateUploadDropzone<OurFileRouter>();
