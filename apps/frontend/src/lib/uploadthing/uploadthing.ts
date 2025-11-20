import { createUploadthing, type FileRouter } from 'uploadthing/next';
import logger from '@/lib/logger';
import type { AuthValidationResponse } from '@fundifyhub/types';
import { get } from '../api-client';
import { BACKEND_API_CONFIG } from '../urls';


const f = createUploadthing();

export const ourFileRouter: FileRouter = {
  /**
   * Asset Image Uploader Route
   *
   * Handles image uploads for assets with the following constraints:
   * - Max file size: 4MB
   * - File types: Images only
   * - Authentication: Required (JWT token validation)
   * - Storage: Private (requires signed URLs for access)
   *
   * @middleware Authenticates user via JWT token from headers or cookies
   * @returns Metadata including userId, userEmail, userRoles, userDistrict
   * @onUploadComplete Returns file metadata without public URL (private files)
   */
  assetImageUploader: f({
    image: { maxFileSize: '4MB', maxFileCount: 5 },
  })
    // Set permissions and file types for this FileRoute
    .middleware(async ({ req }: { req: Request }) => {
      // This code runs on your server before upload
      // If you throw, the user will not be able to upload

      try {
        // Forward cookie from incoming request to auth validation API
        const cookie = req.headers.get('cookie');
        const validationResult = await get<AuthValidationResponse>(
          BACKEND_API_CONFIG.ENDPOINTS.AUTH.VALIDATE,
          {
            headers: {
              cookie: cookie ?? '',
            },
          }
        );

        if (
          !validationResult.success ||
          !validationResult.data?.isAuthenticated
        ) {
          throw new Error('Invalid or expired token');
        }

        const user = validationResult.data.user;
        if (!user) {
          throw new Error('Authentication required');
        }
        // Whatever is returned here is accessible in onUploadComplete as `metadata`
        return {
          userId: user.id,
          userEmail: user.email,
          userRoles: user.roles,
          userDistrict: Array.isArray(user.districts) && user.districts.length ? user.districts[0] : '',
        };
      } catch (validationError) {
        logger.error(
          'UploadThing middleware: Token validation failed:',
          validationError as Error
        );
        throw new Error('Authentication failed');
      }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // This code RUNS ON YOUR SERVER after upload

      // For private files, we don't return the public URL
      // Instead, we'll generate signed URLs when needed for display

      // !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
      return {
        fileKey: file.key,
        uploadedBy: metadata.userId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      };
    }),

  /**
   * Request Document Uploader Route
   *
   * Handles document uploads (PDFs, images) for request-related documents like:
   * - Transfer proofs
   * - Payment receipts
   * - Additional verification documents
   *
   * @middleware Authenticates user via JWT token
   * @returns File metadata for database storage
   */
  requestDocument: f({
    image: { maxFileSize: '8MB', maxFileCount: 5 },
    pdf: { maxFileSize: '8MB', maxFileCount: 5 },
  })
    .middleware(async ({ req }: { req: Request }) => {
      try {
        const cookie = req.headers.get('cookie');
        const validationResult = await get<AuthValidationResponse>(
          BACKEND_API_CONFIG.ENDPOINTS.AUTH.VALIDATE,
          {
            headers: {
              cookie: cookie ?? '',
            },
          }
        );

        if (
          !validationResult.success ||
          !validationResult.data?.isAuthenticated
        ) {
          throw new Error('Invalid or expired token');
        }

        const user = validationResult.data.user;
        if (!user) {
          throw new Error('Authentication required');
        }

        return {
          userId: user.id,
          userEmail: user.email,
          userRoles: user.roles,
          userDistrict: Array.isArray(user.districts) && user.districts.length ? user.districts[0] : '',
        };
      } catch (validationError) {
        logger.error(
          'UploadThing middleware: Token validation failed:',
          validationError as Error
        );
        throw new Error('Authentication failed');
      }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        fileKey: file.key,
        uploadedBy: metadata.userId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      };
    }),
};

export type OurFileRouter = typeof ourFileRouter;
