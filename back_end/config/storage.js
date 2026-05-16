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

  const publicId = imageUrl.split('/').pop().replace(/\.\w+$/, '');
  const folderMatch = imageUrl.match(/image_management\/([^/]+)/);
  const fullPublicId = folderMatch
    ? `image_management/${folderMatch[1]}/${publicId}`
    : publicId;
  try {
    await cloudinary.uploader.destroy(fullPublicId);
  } catch (err) {
    console.log('[Cloudinary] Delete warning:', err.message);
  }
};

module.exports = { saveImage, deleteImage, isLocal };
