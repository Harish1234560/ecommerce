import multer from 'multer';
import { MAX_UPLOAD_BYTES } from '../services/storage.service.js';

export const MAX_FILES_PER_UPLOAD = 8;

// Files are held in memory, size-limited here, and type-checked from their bytes in the storage service.
export const uploadImages = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: MAX_FILES_PER_UPLOAD },
}).array('files', MAX_FILES_PER_UPLOAD);
