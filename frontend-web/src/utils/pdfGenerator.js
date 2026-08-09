import { jsPDF } from "jspdf";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const API_BASE = API_BASE_URL.replace(/\/api$/, "");

const getFullImageUrl = (rawUrl) => {
  if (!rawUrl) return "";
  if (rawUrl.startsWith("http")) {
    return rawUrl;
  }
  return `${API_BASE}${rawUrl}`;
};

const getAuthHeaders = () => {
  const token = document.cookie.replace(/(?:(?:^|.*;\s*)auth_token\s*=\s*([^;]*).*$)|^.*$/, "$1");
  if (token) {
    return { Authorization: `Bearer ${token}`, "X-Requested-With": "XMLHttpRequest" };
  }
  return {};
};

const fetchBlob = async (url, includeAuth) => {
  const config = includeAuth
    ? { credentials: "include", headers: getAuthHeaders() }
    : undefined;
  const response = await fetch(url, config);
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
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL("image/jpeg", quality);
};

// Returns { dataUrl, width, height } for an image.
// Tries the direct URL first; if that is blocked (e.g. cross-origin CORS),
// falls back to the application's authenticated download endpoint.
const loadImageData = async (imgRecord, rawUrl) => {
  const fullUrl = getFullImageUrl(rawUrl);
  if (!fullUrl) throw new Error("No image URL");

  const decode = async (blob) => {
    const imgEl = await blobToImage(blob);
    return {
      dataUrl: imageToJpegDataUrl(imgEl),
      width: imgEl.naturalWidth || imgEl.width || 0,
      height: imgEl.naturalHeight || imgEl.height || 0,
    };
  };

  try {
    const blob = await fetchBlob(fullUrl, false);
    return await decode(blob);
  } catch (directError) {
    if (imgRecord && imgRecord.id) {
      const blob = await fetchBlob(`${API_BASE_URL}/download/${imgRecord.id}`, true);
      return await decode(blob);
    }
    throw directError;
  }
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
  const CARDS_PER_PAGE = 2;
  const CARD_H = 84;
  const CARD_GAP = 8;
  const IMG_BOX_W = 100;
  const IMG_BOX_H = 78;
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
    const data = img.image_data || img.data || {};
    const cardY = 17 + cardIndex * (CARD_H + CARD_GAP);
    const imgX = MARGIN;
    const rawUrl = data.imageUrl || img.url || "";

    try {
      const { dataUrl, width, height } = await loadImageData(img, rawUrl);
      const scale = width > 0 && height > 0
        ? Math.min(IMG_BOX_W / width, IMG_BOX_H / height)
        : 1;
      const imgW = width * scale;
      const imgH = height * scale;
      const imgY = cardY + (CARD_H - imgH) / 2;
      doc.addImage(dataUrl, "JPEG", imgX, imgY, imgW, imgH);
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
