const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getR2Client, R2_BUCKET_NAME, R2_PUBLIC_URL, isR2Configured } = require('./r2');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const isLocal = () => process.env.STORAGE_TYPE === 'local';

const processBuffer = async (buffer) => {
  return sharp(buffer)
    .resize(1600, 900, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
};

const extractKeyFromR2Url = (imageUrl) => {
  const urlObj = new URL(imageUrl);
  let key = urlObj.pathname.replace(/^\//, '');
  if (key.startsWith(R2_BUCKET_NAME + '/')) {
    key = key.slice(R2_BUCKET_NAME.length + 1);
  }
  return key;
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

  const key = `image_management/${sanitizedFolder}/${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: processed,
    ContentType: 'image/webp',
  });

  await getR2Client().send(command);

  const baseUrl = R2_PUBLIC_URL || `${process.env.R2_ENDPOINT}/${R2_BUCKET_NAME}`;
  const imageUrl = `${baseUrl.replace(/\/+$/, '')}/${key}`;

  return { imageUrl, filename: key };
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
    return;
  }

  try {
    const key = extractKeyFromR2Url(imageUrl);

    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    await getR2Client().send(command);
  } catch (err) {
    console.error('[R2] Delete failed:', err.message);
    throw err;
  }
};

module.exports = { saveImage, deleteImage, isLocal };
