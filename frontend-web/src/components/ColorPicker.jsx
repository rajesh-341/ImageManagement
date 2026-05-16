import React, { useState } from "react";

const COLORS = [
  { name: "Red", hex: "#dc2626" },
  { name: "Blue", hex: "#2563eb" },
  { name: "Yellow", hex: "#eab308" },
  { name: "Green", hex: "#22c55e" },
  { name: "Orange", hex: "#f97316" },
  { name: "Purple", hex: "#9333ea" },
  { name: "Teal", hex: "#0d9488" },
  { name: "Cyan", hex: "#06b6d4" },
  { name: "Indigo", hex: "#4f46e5" },
  { name: "Deep Purple", hex: "#7c3aed" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Lime", hex: "#65a30d" },
  { name: "Brown", hex: "#92400e" },
  { name: "Grey", hex: "#6b7280" },
  { name: "Black", hex: "#1a1a1a" },
  { name: "White", hex: "#ffffff" },
];

const MAX_COLORS = 3;

function ColorPicker({ selectedColors = [], onChange, label = "Color" }) {
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? COLORS.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : COLORS;

  const toggleColor = (colorName) => {
    setError("");
    if (selectedColors.includes(colorName)) {
      onChange(selectedColors.filter((c) => c !== colorName));
    } else {
      if (selectedColors.length >= MAX_COLORS) {
        setError(`Maximum ${MAX_COLORS} colors allowed`);
        return;
      }
      onChange([...selectedColors, colorName]);
    }
  };

  const getColorHex = (colorName) => {
    const color = COLORS.find((c) => c.name === colorName);
    return color ? color.hex : "#ccc";
  };

  return (
    <div className="color-picker">
      <label className="color-picker-label">{label}</label>
      <div className="color-picker-search">
        <input
          type="text"
          className="color-search-input"
          placeholder="Search colours..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button type="button" className="color-search-clear" onClick={() => setSearch("")}>
            ×
          </button>
        )}
      </div>
      <div className="color-swatches">
        {filtered.map((color) => (
          <div key={color.name} className="color-swatch-container" onClick={() => toggleColor(color.name)}>
            <button
              type="button"
              className={`color-swatch ${selectedColors.includes(color.name) ? "selected" : ""} ${
                color.name === "White" || color.name === "Yellow" || color.name === "Amber" || color.name === "Lime" ? "light-color" : ""
              }`}
              style={{ backgroundColor: color.hex }}
              title={color.name}
            />
            <span className="color-swatch-name">{color.name}</span>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <span className="color-picker-no-results">No colours found</span>}
      {error && <span className="color-picker-error">{error}</span>}
      {selectedColors.length > 0 && (
        <div className="selected-colors-preview">
          <span className="selected-colors-label">Selected:</span>
          <div className="selected-colors-list">
            {selectedColors.map((colorName) => (
              <span
                key={colorName}
                className="selected-color-tag"
                style={{ backgroundColor: getColorHex(colorName) }}
              >
                {colorName}
                <button
                  type="button"
                  className="remove-color"
                  onClick={() => toggleColor(colorName)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ColorPicker;
export { COLORS };
