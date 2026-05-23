import React, { useRef } from 'react';
import './FolderCard.css';

const monthsShort = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, "0");
  const month = monthsShort[d.getMonth()];
  const year = d.getFullYear();
  return `${day} · ${month} · ${year}`;
};

const formatEventDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${monthsShort[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

const parseFolderName = (name) => {
  if (!name) return { customerName: "", venue: "", eventDate: "" };
  const parts = name.split("_");
  return {
    customerName: parts[0] || "",
    venue: parts[1] || "",
    eventDate: parts.slice(2).join("_") || "",
  };
};

const FolderCard = ({ folder, onClick, onDelete, onEdit, canDelete, onMoveToFolder }) => {
  const cardRef = useRef(null);
  const { customerName, venue, eventDate } = parseFolderName(folder.name);
  const createdDate = formatDate(folder.created_at || folder.createdAt);

  const handleDragOver = (e) => {
    e.preventDefault();
    if (cardRef.current) cardRef.current.classList.add("drag-over");
  };

  const handleDragLeave = () => {
    if (cardRef.current) cardRef.current.classList.remove("drag-over");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (cardRef.current) cardRef.current.classList.remove("drag-over");
    const imageId = e.dataTransfer.getData("imageId");
    if (imageId && onMoveToFolder) onMoveToFolder(folder.name, imageId);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (onDelete) onDelete(e);
  };

  return (
    <div
      ref={cardRef}
      className="folder-card"
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="folder-card-header">
        <svg className="folder-card-icon" viewBox="0 0 40 34" width="22" height="19" aria-hidden="true">
          <rect x="2" y="0" width="10" height="5" rx="1.5" fill="#E6B73A" />
          <path d="M0 5 L16 5 L20 9 L38 9 L38 32 L0 32 Z" fill="#F5C842" />
          <path d="M0 9 L38 9 L38 32 L0 32 Z" fill="#FFD54F" />
        </svg>
        <div className="folder-card-meta">
          <span className="folder-card-created-label">CREATED</span>
          <span className="folder-card-created-date">{createdDate}</span>
        </div>
      </div>
      {canDelete && (
        <div className="folder-card-actions">
          <button className="folder-card-edit" onClick={(e) => { e.stopPropagation(); if (onEdit) onEdit(folder, e); }} aria-label="Edit folder">✎</button>
          <button className="folder-card-delete" onClick={handleDeleteClick} aria-label="Delete folder">×</button>
        </div>
      )}
      <div className="folder-card-body">
        <div className="folder-card-row">
          <span className="folder-card-row-label">CUSTOMER</span>
          <span className="folder-card-row-value" title={customerName}>{customerName || "—"}</span>
        </div>
        <div className="folder-card-divider" />
        <div className="folder-card-row">
          <span className="folder-card-row-label">VENUE</span>
          <span className="folder-card-row-value" title={venue}>{venue || "—"}</span>
        </div>
        <div className="folder-card-divider" />
        <div className="folder-card-row">
          <span className="folder-card-row-label">EVENT DATE</span>
          {eventDate ? (
            <span className="folder-card-date-badge">
              <svg viewBox="0 0 14 14" width="10" height="10" fill="none" stroke="#6B4E00" strokeWidth="1.2">
                <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" />
                <path d="M4.5 1v3" />
                <path d="M9.5 1v3" />
                <path d="M1.5 5.5h11" />
              </svg>
              {formatEventDate(eventDate)}
            </span>
          ) : (
            <span className="folder-card-row-value">—</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default FolderCard;
