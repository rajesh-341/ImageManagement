const cloudinary = require('./cloudinary');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const isLocal = () => process.env.STORAGE_TYPE === 'local';

const processBuffer = async (buffer) => {
  return sharp(buffer)
    .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();
};

const saveImage = async (buffer, folder) => {
  const sanitizedFolder = folder.replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase();
  const processed = await processBuffer(buffer);

  if (isLocal()) {
    const folderPath = path.join(UPLOADS_DIR, sanitizedFolder);
    await fs.mkdir(folderPath, { recursive: true });
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
    const filePath = path.join(folderPath, filename);
    await fs.writeFile(filePath, processed);
    return { imageUrl: `/uploads/${sanitizedFolder}/${filename}`, filename };
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `image_management/${sanitizedFolder}`,
        format: 'webp',
        public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve({ imageUrl: result.secure_url, filename: result.public_id });
      }
    );
    stream.end(processed);
  });
};

const deleteImage = async (imageUrl) => {
  if (isLocal()) {
    const relativePath = imageUrl.replace(/^\/uploads\//, '');
    const filePath = path.join(UPLOADS_DIR, relativePath);
    try {
      await fs.unlink(filePath);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    return;
  }

  if (imageUrl.startsWith('/uploads/')) {
    console.warn(`[Cloudinary] Skipping local-format URL in cloudinary mode: ${imageUrl}`);
    return;
  }

  try {
    const urlObj = new URL(imageUrl);
    const pathParts = urlObj.pathname.split('/');
    const uploadIndex = pathParts.indexOf('upload');
    if (uploadIndex === -1 || uploadIndex + 1 >= pathParts.length) {
      throw new Error(`Cannot parse Cloudinary public_id from URL: ${imageUrl}`);
    }
    const publicIdParts = pathParts.slice(uploadIndex + 2);
    const fullPublicId = publicIdParts.join('/').replace(/\.[^.]+$/, '');

    const result = await cloudinary.uploader.destroy(fullPublicId, { invalidate: true });
    if (result.result !== 'ok') {
      console.warn(`[Cloudinary] Destroy returned: ${JSON.stringify(result)} for public_id: ${fullPublicId}`);
    }
  } catch (err) {
    console.error('[Cloudinary] Delete failed:', err.message);
    throw err;
  }
};

module.exports = { saveImage, deleteImage, isLocal };
