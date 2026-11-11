import multer from 'multer';
import path from 'path';

/**
 * Memory storage: Keeps uploaded files as memory buffers so they can be
 * streamed directly to Cloudinary without writing temporary files to local disk.
 */
const memoryStorage = multer.memoryStorage();

// Image file filter for Products & Avatars
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|svg/;
  const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mime = allowedTypes.test(file.mimetype);

  if (ext && mime) {
    return cb(null, true);
  }
  cb(new Error('Only image files (jpeg, jpg, png, webp, svg) are allowed!'));
};

export const upload = multer({
  storage: memoryStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: fileFilter
});

// Review media filter: Images and Videos
const reviewMediaFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isImage = /jpeg|jpg|png|webp/.test(ext) || file.mimetype.startsWith('image/');
  const isVideo = /mp4|webm|mov|m4v|ogg/.test(ext) || file.mimetype.startsWith('video/');

  if (isImage || isVideo) {
    return cb(null, true);
  }
  cb(new Error('Only images (jpg, png, webp) and videos (mp4, webm, mov) are allowed!'));
};

export const uploadReviewMedia = multer({
  storage: memoryStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: reviewMediaFilter
});

// Order damage report video filter: strictly videos
const complaintVideoFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isVideo = /mp4|webm|mov|m4v|ogg|3gp|mkv/.test(ext) || file.mimetype.startsWith('video/');

  if (isVideo) {
    return cb(null, true);
  }
  cb(new Error('Only video files (mp4, webm, mov, m4v) are allowed for damage report verification!'));
};

export const uploadComplaintVideo = multer({
  storage: memoryStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: complaintVideoFilter
});
