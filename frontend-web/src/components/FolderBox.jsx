import React from 'react';
import './FolderBox.css';

const monthsShort = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const formatCreateDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, "0");
  const month = monthsShort[d.getMonth()];
  const year = d.getFullYear();
  return `${day} · ${month} · ${year}`;
};

function FolderBox({ folder, onClick, isFavoriteFolder }) {
  const parseFolderName = (name) => {
    if (!name) return { customerName: "", venue: "", eventDate: "" };
    const parts = name.split("_");
    return {
      customerName: parts[0] || "",
      venue: parts[1] || "",
      eventDate: parts.slice(2).join("_") || "",
    };
  };

  const { customerName } = parseFolderName(folder.name);
  const createdDate = formatCreateDate(folder.created_at || folder.createdAt);
  const displayName = customerName || folder.name;

  return (
    <button
      className="folder-box"
      onClick={() => onClick(folder)}
      type="button"
    >
      <svg className="folder-box-icon" viewBox="0 0 40 34" width="38" height="32" aria-hidden="true">
        <rect x="2" y="0" width="10" height="5" rx="1.5" fill="#E6B73A" />
        <path d="M0 5 L16 5 L20 9 L38 9 L38 32 L0 32 Z" fill="#F5C842" />
        <path d="M0 9 L38 9 L38 32 L0 32 Z" fill="#FFD54F" />
      </svg>
      <span className="folder-box-name" title={displayName}>{displayName}</span>
      <span className="folder-box-date">{createdDate}</span>
      {isFavoriteFolder && <span className="folder-box-fav">★</span>}
    </button>
  );
}

export default FolderBox;