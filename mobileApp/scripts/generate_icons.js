const sharp = require("D:\\ImageManagementSystem\\back_end\\node_modules\\sharp");
const fs = require("fs");
const path = require("path");

const SIZES = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};

const RES_DIR = path.join(__dirname, "..", "android", "app", "src", "main", "res");

const textSvg = (size) => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="#ff6b8a"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, sans-serif" font-weight="bold"
        font-size="${size * 0.45}px" fill="white">PV</text>
</svg>`;

async function generateIcon(resolution, size, suffix) {
  const svg = textSvg(size);
  const filename = `ic_launcher${suffix}.png`;
  const dir = path.join(RES_DIR, resolution);
  await fs.promises.mkdir(dir, { recursive: true });
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(path.join(dir, filename));
  console.log(`Created ${resolution}/${filename}`);
}

async function main() {
  for (const [resolution, size] of Object.entries(SIZES)) {
    await generateIcon(resolution, size, "");
    await generateIcon(resolution, size, "_round");
  }
  console.log("All icons generated successfully!");
}

main().catch(console.error);
