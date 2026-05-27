import React from "react";

const IMAGE_BASE_URL = (process.env.REACT_APP_API_URL || "http://localhost:5000/api").replace(/\/api$/, "");

const lightColorSet = new Set([
  "White","Yellow","Light Blue","Light Green","Sky Blue","Beige","Cream","Silver","Gold",
  "Rose Gold","Gray","Bronze","Copper",
]);

function ImageCard({
  image, index, imageArray, isFav, isSelected, canEditDelete,
  onToggleFav, onSelect, onOpenLightbox, onEdit, onDelete, formatPrice, formatEventDate,
}) {
  const rawUrl = image.image_data?.imageUrl || "";
  const imgUrl = rawUrl
    ? rawUrl.startsWith("http")
      ? rawUrl.replace("/upload/", "/upload/f_auto,q_auto/")
      : `${IMAGE_BASE_URL}${rawUrl}`
    : "";
  const data = image.image_data || {};

  const buildSizeLabeled = (w, l, h) => {
    const parts = [];
    if (w && w !== "0") parts.push(`W:${w}`);
    if (l && l !== "0") parts.push(`L:${l}`);
    if (h && h !== "0") parts.push(`H:${h}`);
    return parts.join(" ") + (data.sizeUnit ? ` ${data.sizeUnit}` : "");
  };

  const sizeDisplay = data.sizeDisplay || buildSizeLabeled(data.sizeWidth, data.sizeLength, data.sizeHeight);
  const priceDisplay = formatPrice ? formatPrice(data.priceMin, data.priceMax) : "";
  const colorsDisplay = data.colourCombination?.length > 0 ? data.colourCombination.join(", ") : "";

  const handleClick = (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (onSelect) onSelect(image.id);
    } else if (isSelected) {
      if (onSelect) onSelect(image.id);
    } else {
      if (onOpenLightbox) onOpenLightbox(imageArray, index);
    }
  };

  return (
    <div
      className={`image-card${isSelected ? " selected" : ""}`}
      onClick={handleClick}
      style={{ contentVisibility: "auto", containIntrinsicSize: "300px" }}
    >
      <div className="image-card-img-wrap">
        {isSelected && (
          <div className="image-select-checkbox selected" onClick={(e) => { e.stopPropagation(); if (onSelect) onSelect(image.id); }}>
            ✓
          </div>
        )}
        <button
          className={`favorite-btn-card${isFav ? " active" : ""}`}
          onClick={(e) => { e.stopPropagation(); if (onToggleFav) onToggleFav(image.id, isFav); }}
          title={isFav ? "Remove from Favorites" : "Add to Favorites"}
        >
          {isFav ? "★" : "☆"}
        </button>
        {imgUrl ? (
          <img className="image-card-img" src={imgUrl} alt={data.designName} loading="lazy"
            onError={(e) => { e.target.onerror = null; e.target.src = ""; e.target.style.background = "#e5e7eb"; }}
          />
        ) : (
          <div className="image-card-placeholder">No Image</div>
        )}
        <div className="image-card-hover-actions">
          {canEditDelete && (
            <>
              <button className="btn-image-edit" onClick={(e) => { e.stopPropagation(); if (onEdit) onEdit(image); }}>Edit</button>
              <button className="btn-image-delete" onClick={(e) => { e.stopPropagation(); if (onDelete) onDelete(image.id); }}>Delete</button>
            </>
          )}
        </div>
        <div className="image-card-hover-details">
          {data.designName && <div className="hover-detail"><span>Design</span> {data.designName}</div>}
          {data.decorType && <div className="hover-detail"><span>Decor</span> {data.decorType}</div>}
          {data.eventType && <div className="hover-detail"><span>Event</span> {data.eventType}</div>}
          {sizeDisplay && <div className="hover-detail"><span>Size</span> {sizeDisplay}</div>}
          {priceDisplay && <div className="hover-detail"><span>Price</span> {priceDisplay}</div>}
          {colorsDisplay && <div className="hover-detail"><span>Colors</span> {colorsDisplay}</div>}
          {data.flowerType && <div className="hover-detail"><span>Flower</span> {data.flowerType}</div>}
          {data.venueCustomer && <div className="hover-detail"><span>Customer</span> {data.venueCustomer}</div>}
          {data.venueName && <div className="hover-detail"><span>Venue</span> {data.venueName}</div>}
          {data.venueDate && <div className="hover-detail"><span>Date</span> {formatEventDate ? formatEventDate(data.venueDate) : data.venueDate}</div>}
        </div>
      </div>
      <div className="image-card-info">
        <div className="image-card-design"><span className="info-label">Design Name -</span> {data.designName || "Untitled"}</div>
      </div>
    </div>
  );
}

export default React.memo(ImageCard);
