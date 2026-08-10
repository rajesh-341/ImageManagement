const pool = require("../config/db");
const { jsPDF } = require("jspdf");
const sharp = require("sharp");
const fs = require("fs").promises;
const path = require("path");

const UPLOADS_DIR = path.join(__dirname, "..", "uploads");
const MAX_PDF_IMAGES = 200;

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

const formatPriceStr = (min, max) => {
  if (min && max) return `\u20B9${min} - \u20B9${max}`;
  if (min) return `\u20B9${min}+`;
  if (max) return `Up to \u20B9${max}`;
  return "";
};

const buildSizeLabeled = (data) => {
  const w = data.sizeWidth, l = data.sizeLength, h = data.sizeHeight;
  const parts = [];
  if (w && w !== "0") parts.push(`${w} W`);
  if (l && l !== "0") parts.push(`${l} L`);
  if (h && h !== "0") parts.push(`${h} H`);
  return parts.join(" x ") + (data.sizeUnit ? ` ${data.sizeUnit}` : "") || data.sizeDisplay || "";
};

const truncateText = (text, maxWidth, doc) => {
  if (!text) return "";
  const str = String(text);
  const textWidth = doc.getTextWidth(str);
  if (textWidth <= maxWidth) return str;
  let truncated = str;
  while (truncated.length > 0 && doc.getTextWidth(truncated + "..") > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "..";
};

const loadImageBuffer = async (imageUrl) => {
  if (imageUrl.startsWith("/uploads/")) {
    const relativePath = imageUrl.replace(/^\/uploads\//, "");
    const filePath = path.join(UPLOADS_DIR, relativePath);
    return fs.readFile(filePath);
  }
  const response = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
};

const renderImageCard = async (doc, img, cardY) => {
  const PAGE_W = 297;
  const MARGIN = 12;
  const CARD_H = 84;
  const IMG_BOX_W = 100;
  const IMG_BOX_H = 78;
  const COLS = 3;
  const ROW_H = 7;

  const data = img.image_data || {};
  const imgX = MARGIN;
  const rawUrl = data.imageUrl || "";

  try {
    const buffer = await loadImageBuffer(rawUrl);
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    const scale = width > 0 && height > 0
      ? Math.min(IMG_BOX_W / width, IMG_BOX_H / height)
      : 1;
    const imgW = width * scale;
    const imgH = height * scale;

    if (imgW > 0 && imgH > 0) {
      const jpegBuffer = await sharp(buffer).jpeg({ quality: 85 }).toBuffer();
      const imgY = cardY + (CARD_H - imgH) / 2;
      doc.addImage(jpegBuffer, "JPEG", imgX, imgY, imgW, imgH);
    } else {
      throw new Error("Invalid image dimensions");
    }
  } catch {
    const imgY = cardY + (CARD_H - IMG_BOX_H) / 2;
    doc.setDrawColor(210, 210, 210);
    doc.setFillColor(248, 248, 248);
    doc.rect(imgX, imgY, IMG_BOX_W, IMG_BOX_H, "FD");
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(180, 180, 180);
    doc.text("No Image", imgX + IMG_BOX_W / 2, imgY + IMG_BOX_H / 2 + 1, { align: "center" });
  }

  const specX = imgX + IMG_BOX_W + 7;
  const specW = PAGE_W - MARGIN - specX;
  const colW = specW / COLS;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50, 50, 50);
  doc.text(data.designName || "Untitled", specX, cardY + 7);

  const specs = [
    { label: "Event", value: data.eventType },
    { label: "Decor", value: data.decorType },
    { label: "Flower", value: data.flowerType },
    { label: "Size", value: buildSizeLabeled(data) },
    { label: "Price", value: formatPriceStr(data.priceMin, data.priceMax) },
    { label: "Colours", value: Array.isArray(data.colourCombination) ? data.colourCombination.join(", ") : "" },
    { label: "Customer", value: data.venueCustomer },
    { label: "Venue", value: data.venueName },
    { label: "Date", value: formatDate(data.venueDate) },
    { label: "Folder", value: img.folder_name || data.folderName },
  ].filter((s) => s.value);

  const specStartY = cardY + 13;

  specs.forEach((spec, idx) => {
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    const x = specX + col * colW;
    const y = specStartY + row * ROW_H;

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(140, 140, 140);
    doc.text(spec.label, x, y);

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    const valMaxWidth = colW - 2;
    const displayVal = truncateText(spec.value || "-", valMaxWidth, doc);
    doc.text(displayVal, x, y + 3.2);
  });
};

const generateImagesPdf = async (req, res) => {
  try {
    const { imageIds } = req.body || {};
    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({ message: "imageIds array is required" });
    }

    const ids = imageIds.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));
    if (ids.length === 0) {
      return res.status(400).json({ message: "imageIds array is required" });
    }
    if (ids.length > MAX_PDF_IMAGES) {
      return res.status(400).json({ message: `Maximum ${MAX_PDF_IMAGES} images allowed per PDF download` });
    }

    const result = await pool.query(
      "SELECT id, folder_name, image_data FROM image_management WHERE id = ANY($1::int[])",
      [ids]
    );
    const rowsById = new Map(result.rows.map((row) => [
      row.id,
      {
        id: row.id,
        folder_name: row.folder_name,
        image_data: typeof row.image_data === "string" ? JSON.parse(row.image_data) : row.image_data,
      },
    ]));

    const doc = new jsPDF("landscape", "mm", "a4");
    const PAGE_W = 297;
    const MARGIN = 12;
    const CARDS_PER_PAGE = 2;
    const CARD_H = 84;
    const CARD_GAP = 8;

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const cardIndex = i % CARDS_PER_PAGE;

      if (i > 0 && cardIndex === 0) doc.addPage();

      if (cardIndex === 0) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 40, 40);
        doc.text("Image Specification Report", PAGE_W / 2, 9, { align: "center" });

        doc.setDrawColor(213, 100, 147);
        doc.setLineWidth(0.5);
        doc.line(MARGIN, 12, PAGE_W - MARGIN, 12);
      }

      const row = rowsById.get(id);
      const img = row || { id, folder_name: "", image_data: {} };
      const cardY = 17 + cardIndex * (CARD_H + CARD_GAP);

      await renderImageCard(doc, img, cardY);

      if (cardIndex < CARDS_PER_PAGE - 1 && i < ids.length - 1) {
        const sepY = cardY + CARD_H + CARD_GAP / 2;
        doc.setDrawColor(225, 225, 225);
        doc.setLineWidth(0.2);
        doc.line(MARGIN, sepY, PAGE_W - MARGIN, sepY);
      }
    }

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="image_specifications_${Date.now()}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("[PDF] Error:", error.message);
    res.status(500).json({ message: error.message || "PDF generation failed" });
  }
};

module.exports = { generateImagesPdf };
