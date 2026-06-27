import { jsPDF } from "jspdf";

const getFullImageUrl = (rawUrl) => {
  if (!rawUrl) return "";
  const API_BASE = (process.env.REACT_APP_API_URL || "http://localhost:5000/api").replace(/\/api$/, "");
  if (rawUrl.startsWith("http")) {
    return rawUrl;
  }
  return `${API_BASE}${rawUrl}`;
};

const fetchBlob = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.blob();
};

const blobToImage = (blob) => new Promise((resolve, reject) => {
  const img = new Image();
  const url = URL.createObjectURL(blob);
  img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image decode failed")); };
  img.src = url;
});

const imageToJpegDataUrl = (img, quality = 0.85) => {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL("image/jpeg", quality);
};

const fetchImageAsJpeg = async (url) => {
  const blob = await fetchBlob(url);
  if (blob.type === "image/jpeg") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  const img = await blobToImage(blob);
  return imageToJpegDataUrl(img);
};

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

export const generateImagePDF = async (images) => {
  const doc = new jsPDF("landscape", "mm", "a4");
  const PAGE_W = 297;
  const MARGIN = 12;
  const CARDS_PER_PAGE = 3;
  const CARD_H = 56;
  const CARD_GAP = 5;
  const IMG_SIZE = 40;
  const COLS = 3;
  const ROW_H = 7;

  for (let i = 0; i < images.length; i++) {
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

    const img = images[i];
    const data = img.image_data || {};
    const cardY = 17 + cardIndex * (CARD_H + CARD_GAP);
    const imgX = MARGIN;
    const imgY = cardY + 3;

    try {
      const rawUrl = data.imageUrl || "";
      const fullUrl = getFullImageUrl(rawUrl);
      if (fullUrl) {
        const jpegData = await fetchImageAsJpeg(fullUrl);
        doc.addImage(jpegData, "JPEG", imgX, imgY, IMG_SIZE, IMG_SIZE);
      } else {
        throw new Error("No image URL");
      }
    } catch {
      doc.setDrawColor(210, 210, 210);
      doc.setFillColor(248, 248, 248);
      doc.rect(imgX, imgY, IMG_SIZE, IMG_SIZE, "FD");
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(180, 180, 180);
      doc.text("No Image", imgX + IMG_SIZE / 2, imgY + IMG_SIZE / 2 + 1, { align: "center" });
    }

    const specX = imgX + IMG_SIZE + 7;
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
      { label: "Colours", value: data.colourCombination?.join(", ") },
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

    if (cardIndex < CARDS_PER_PAGE - 1 && i < images.length - 1) {
      const sepY = cardY + CARD_H + CARD_GAP / 2;
      doc.setDrawColor(225, 225, 225);
      doc.setLineWidth(0.2);
      doc.line(MARGIN, sepY, PAGE_W - MARGIN, sepY);
    }
  }

  doc.save(`image_specifications_${Date.now()}.pdf`);
};

export const downloadAsPDF = async (images) => {
  await generateImagePDF(images);
};
