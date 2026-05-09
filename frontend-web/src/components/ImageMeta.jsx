import React from "react";

function ImageMeta({ data, showFolder = false, folderName = "" }) {
  if (!data) return null;

  const metaItems = [
    data.eventType && { label: "Event", value: data.eventType },
    data.decorType && { label: "Decor", value: data.decorType },
    data.sizeDisplay && { label: "Size", value: data.sizeDisplay },
    data.colourCombination?.length > 0 && { label: "Colors", value: data.colourCombination.join(", ") },
    data.flowerType && { label: "Flower", value: data.flowerType },
    data.priceMin != null && data.priceMax != null && {
      label: "Price",
      value: `$${data.priceMin} - $${data.priceMax}`
    },
    data.venueCustomer && { label: "Customer", value: data.venueCustomer },
    data.venueName && { label: "Venue", value: data.venueName },
    (showFolder || folderName) && { label: "Folder", value: folderName || data.folderName, icon: "📁" },
  ].filter(Boolean);

  if (metaItems.length === 0) return null;

  return (
    <div className="image-meta">
      {metaItems.map((item, index) => (
        <p key={index}>
          {item.icon && <span className="meta-icon">{item.icon}</span>}
          {item.label}: {item.value}
        </p>
      ))}
    </div>
  );
}

export default ImageMeta;