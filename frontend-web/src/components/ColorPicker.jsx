import React, { useState } from "react";

const COLORS = [
  { name: "Black", hex: "#1a1a1a" },
  { name: "White", hex: "#ffffff" },
  { name: "Charcoal Gray", hex: "#36454f" },
  { name: "Royal Blue", hex: "#4169e1" },
  { name: "Bright Red", hex: "#dc2626" },
  { name: "Light Pink", hex: "#f9a8d4" },
  { name: "Cyan", hex: "#06b6d4" },
  { name: "Peach", hex: "#fca5a5" },
  { name: "Gold", hex: "#f59e0b" },
  { name: "Silver", hex: "#9ca3af" },
  { name: "Purple", hex: "#9333ea" },
  { name: "Green", hex: "#22c55e" },
  { name: "Orange", hex: "#f97316" },
  { name: "Brown", hex: "#92400e" },
  { name: "Navy Blue", hex: "#1e3a8a" },
  { name: "Maroon", hex: "#7f1d1d" },
  { name: "Cream", hex: "#fef3c7" },
  { name: "Lavender", hex: "#c4b5fd" },
  { name: "Teal", hex: "#0d9488" },
  { name: "Burgundy", hex: "#881337" },
  { name: "Mint", hex: "#6ee7b7" },
  { name: "Coral", hex: "#fb7185" },
  { name: "Rose Gold", hex: "#fda4af" },
  { name: "Champagne", hex: "#f7dc6f" },
];

const MAX_COLORS = 3;

function ColorPicker({ selectedColors = [], onChange, label = "Color" }) {
  const [error, setError] = useState("");

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
      <div className="color-swatches">
        {COLORS.map((color) => (
          <div key={color.name} className="color-swatch-container">
            <button
              type="button"
              className={`color-swatch ${selectedColors.includes(color.name) ? "selected" : ""} ${
                color.name === "White" || color.name === "Cream" || color.name === "Light Pink" || color.name === "Peach" || color.name === "Champagne" || color.name === "Mint" || color.name === "Lavender" ? "light-color" : ""
              } ${color.name === "Peach" ? "elevated" : ""}`}
              style={{ backgroundColor: color.hex }}
              onClick={() => toggleColor(color.name)}
              title={color.name}
            />
            <span className="color-swatch-name">{color.name}</span>
          </div>
        ))}
      </div>
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