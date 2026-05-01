const sharp = require("sharp");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");

// R2 Storage Service - Cloudflare R2 with WebP conversion
class R2StorageService {
  constructor() {
    this.s3Client = null;
    this.bucket = process.env.R2_BUCKET_NAME;
    this.publicUrl = process.env.R2_PUBLIC_URL;
    
    if (process.env.R2_ACCESS_KEY_ID) {
      this.s3Client = new S3Client({
        region: "auto",
        endpoint: process.env.R2_ENDPOINT,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
      });
    }
  }

  // Upload image with WebP conversion
  async uploadImage(fileBuffer, originalName, options = {}) {
    const { 
      quality = 80,
      maxWidth = 1920,
      maxHeight = 1080
    } = options;

    try {
      // Convert to WebP
      const webpBuffer = await sharp(fileBuffer)
        .resize(maxWidth, maxHeight, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality })
        .toBuffer();

      const fileName = `${Date.now()}-${originalName.replace(/\.[^/.]+$/, "")}.webp`;
      
      if (this.s3Client) {
        const command = new PutObjectCommand({
          Bucket: this.bucket,
          Key: fileName,
          Body: webpBuffer,
          ContentType: "image/webp",
        });
        
        await this.s3Client.send(command);
        return `${this.publicUrl}/${fileName}`;
      }

      // Local storage fallback
      return this.saveLocal(fileName, webpBuffer);
    } catch (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  // Download image (for convert to JPEG on download)
  async downloadImage(imageUrl, format = "jpeg") {
    try {
      if (this.s3Client && imageUrl.includes(this.bucket)) {
        const key = imageUrl.split("/").pop();
        const command = new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        });
        
        const response = await this.s3Client.send(command);
        const chunks = [];
        
        for await (const chunk of response.Body) {
          chunks.push(chunk);
        }
        
        const buffer = Buffer.concat(chunks);
        
        // Convert to requested format
        if (format === "jpeg") {
          return await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
        }
        
        return buffer;
      }
      
      return null;
    } catch (error) {
      throw new Error(`Download failed: ${error.message}`);
    }
  }

  // Local storage fallback
  async saveLocal(fileName, buffer) {
    const fs = require("fs");
    const path = require("path");
    
    const uploadDir = path.join(__dirname, "..", "uploads");
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, buffer);
    
    return `/uploads/${fileName}`;
  }
}

module.exports = new R2StorageService();