import React, { useState } from "react";

const COLORS = [
  { name: "Red", hex: "#dc2626" },
  { name: "Blue", hex: "#2563eb" },
  { name: "Green", hex: "#22c55e" },
  { name: "Yellow", hex: "#eab308" },
  { name: "Orange", hex: "#f97316" },
  { name: "Purple", hex: "#9333ea" },
  { name: "Pink", hex: "#ec4899" },
  { name: "Brown", hex: "#92400e" },
  { name: "Black", hex: "#1a1a1a" },
  { name: "White", hex: "#ffffff" },
  { name: "Gray", hex: "#6b7280" },
  { name: "Light Blue", hex: "#93c5fd" },
  { name: "Dark Blue", hex: "#1e40af" },
  { name: "Light Green", hex: "#86efac" },
  { name: "Dark Green", hex: "#166534" },
  { name: "Sky Blue", hex: "#38bdf8" },
  { name: "Navy Blue", hex: "#1e3a8a" },
  { name: "Maroon", hex: "#7f1d1d" },
  { name: "Olive Green", hex: "#808000" },
  { name: "Beige", hex: "#f5f5dc" },
  { name: "Cream", hex: "#fef3c7" },
  { name: "Gold", hex: "#f59e0b" },
  { name: "Silver", hex: "#9ca3af" },
  { name: "Bronze", hex: "#cd7f32" },
  { name: "Copper", hex: "#b87333" },
  { name: "Rose Gold", hex: "#fda4af" },
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
                    ["White","Yellow","Light Blue","Light Green","Sky Blue","Beige","Cream","Silver","Gold","Rose Gold","Gray","Bronze","Copper"].includes(color.name) ? "light-color" : ""
                  }`}
                  style={{ backgroundColor: color.hex, borderColor: selectedColors.includes(color.name) ? color.hex : undefined }}
                  title={color.name}
                >
                  {selectedColors.includes(color.name) && (
                    <span className="color-swatch-check" style={{ color: ["White","Yellow","Light Blue","Light Green","Sky Blue","Beige","Cream","Silver","Gold","Rose Gold","Gray","Bronze","Copper"].includes(color.name) ? "#374151" : "#fff" }}>✓</span>
                  )}
                </button>
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
