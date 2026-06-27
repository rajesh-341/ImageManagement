import React from "react";

function ImageMeta({ data, showFolder = false, folderName = "" }) {
  if (!data) return null;

  const buildSizeDisplay = (d) => {
    const parts = [];
    if (d.sizeWidth && d.sizeWidth !== "0") parts.push(`${d.sizeWidth} W`);
    if (d.sizeLength && d.sizeLength !== "0") parts.push(`${d.sizeLength} L`);
    if (d.sizeHeight && d.sizeHeight !== "0") parts.push(`${d.sizeHeight} H`);
    if (parts.length === 0) return d.sizeDisplay || "";
    return parts.join(" x ") + (d.sizeUnit ? ` ${d.sizeUnit}` : "");
  };
  const sizeDisplay = buildSizeDisplay(data);

  const metaItems = [
    data.eventType && { label: "Event", value: data.eventType },
    data.designName && { label: "Design", value: data.designName },
    data.decorType && { label: "Decor", value: data.decorType },
    sizeDisplay && { label: "Size", value: sizeDisplay },
    data.colourCombination?.length > 0 && { label: "Colors", value: data.colourCombination.join(", ") },
    data.flowerType && { label: "Flower", value: data.flowerType },
    data.priceMin != null && data.priceMax != null && {
      label: "Price",
      value: `₹${data.priceMin} - ₹${data.priceMax}`
    },
    data.venueCustomer && { label: "Customer", value: data.venueCustomer },
    data.venueName && { label: "Venue", value: data.venueName },
    data.venueDate && { label: "Date", value: data.venueDate },
    (showFolder || folderName) && { label: "Folder", value: folderName || data.folderName },
  ].filter(Boolean);

  if (metaItems.length === 0) return null;

  return (
    <div className="image-meta">
      {metaItems.map((item, index) => (
        <p key={index}>
          {item.label}: {item.value}
        </p>
      ))}
    </div>
  );
}

export default React.memo(ImageMeta);
