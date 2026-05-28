import { jsPDF } from "jspdf";

const getFullImageUrl = (rawUrl) => {
  if (!rawUrl) return "";
  const API_BASE = (process.env.REACT_APP_API_URL || "http://localhost:5000/api").replace(/\/api$/, "");
  if (rawUrl.startsWith("http")) {
    return rawUrl.replace("/upload/", "/upload/f_auto,q_auto/");
  }
  return `${API_BASE}${rawUrl}`;
};

const fetchImageAsBase64 = async (url) => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
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
  if (w && w !== "0") parts.push(`W:${w}`);
  if (l && l !== "0") parts.push(`L:${l}`);
  if (h && h !== "0") parts.push(`H:${h}`);
  return parts.join(" ") + (data.sizeUnit ? ` ${data.sizeUnit}` : "") || data.sizeDisplay || "";
};

export const generateImagePDF = async (images) => {
  const doc = new jsPDF("landscape", "mm", "a4");
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const data = img.image_data || {};

    if (i > 0) doc.addPage();

    const rawUrl = data.imageUrl || "";
    const fullUrl = getFullImageUrl(rawUrl);

    try {
      const imgData = await fetchImageAsBase64(fullUrl);

      const margin = 15;
      const imgW = 100;
      const imgH = 75;
      const imgX = margin;
      const imgY = margin + 15;

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Image Specification Report", pageW / 2, 12, { align: "center" });

      doc.setDrawColor(213, 100, 147);
      doc.setLineWidth(0.5);
      doc.line(margin, 14, pageW - margin, 14);

      doc.addImage(imgData, "JPEG", imgX, imgY, imgW, imgH);

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Design Name:", imgX + imgW + 10, imgY + 8);
      doc.setFont("helvetica", "normal");
      doc.text(data.designName || "Untitled", imgX + imgW + 10, imgY + 16);

      const specs = [
        { label: "Design Name", value: data.designName },
        { label: "Event Type", value: data.eventType },
        { label: "Decor Type", value: data.decorType },
        { label: "Flower Type", value: data.flowerType },
        { label: "Size", value: buildSizeLabeled(data) },
        { label: "Price", value: formatPriceStr(data.priceMin, data.priceMax) },
        { label: "Colors", value: data.colourCombination?.join(", ") },
        { label: "Customer", value: data.venueCustomer },
        { label: "Venue", value: data.venueName },
        { label: "Date", value: formatDate(data.venueDate) },
        { label: "Folder", value: img.folder_name || data.folderName },
      ];

      const validSpecs = specs.filter((s) => s.value);

      let yPos = imgY + imgH + 15;
      const col1X = margin;
      const col2X = margin + (pageW - 2 * margin) / 2;

      validSpecs.forEach((spec, idx) => {
        const col = idx < Math.ceil(validSpecs.length / 2) ? 0 : 1;
        const x = col === 0 ? col1X : col2X;
        const row = col === 0 ? idx : idx - Math.ceil(validSpecs.length / 2);
        const y = yPos + row * 9;

        if (y > pageH - 20) return;

        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.2);
        doc.line(x, y - 1, x + (pageW - 2 * margin) / 2 - 10, y - 1);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(spec.label + ":", x + 2, y + 4);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(spec.value || "-", x + 2, y + 12);
      });
    } catch {
      doc.setFontSize(12);
      doc.setFont("helvetica", "italic");
      doc.text("Image could not be loaded for this entry.", 15, 40);
    }
  }

  doc.save(`image_specifications_${Date.now()}.pdf`);
};

export const downloadAsPDF = async (images) => {
  await generateImagePDF(images);
};
