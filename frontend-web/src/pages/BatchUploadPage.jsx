import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ApiService from "../services/api";
import AutocompleteInput from "../components/AutocompleteInput";
import { COLORS } from "../components/ColorPicker";
import {
  UPLOAD_ROLES, FLOWER_TYPES, SIZE_UNITS, SAME_FIELDS,
} from "../constants";
import "./BatchUploadPage.css";

function BatchUploadPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [notif, setNotif] = useState(null);
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [batchImages, setBatchImages] = useState([]);
  const [uploadProgress, setUploadProgress] = useState("");
  const [loading, setLoading] = useState(false);
  const [colourSearchTexts, setColourSearchTexts] = useState([]);
  const [colourPickerOpen, setColourPickerOpen] = useState([]);
  const batchImageRef = useRef(null);
  const isUploading = useRef(false);

  const [designNameSugs, setDesignNameSugs] = useState([]);
  const [venueSugs, setVenueSugs] = useState([]);
  const designNameSugTimer = useRef(null);
  const venueSugTimer = useRef(null);

  const [customDecorTypes, setCustomDecorTypes] = useState([]);
  const [hiddenDecorTypes, setHiddenDecorTypes] = useState([]);

  const DECOR_TYPES = [
    "Name board", "Stage Ceiling", "Hall side Decoration",
    "Hall ceiling work", "Hall Entrance", "Receiption Area",
    "Pathway", "Main Entrance", "Orchestra Stage", "Car Decoration",
    "Selfie Area", "Bedroom Decoration", "Home Decoration",
    "Lighting work in Home", "Lighting work in Mahal", "Audio work",
  ];

  const allDecorTypes = [...DECOR_TYPES, ...customDecorTypes].filter((t, i, arr) => arr.indexOf(t) === i && !hiddenDecorTypes.includes(t));

  const showNotif = (msg, type = "error") => {
    setNotif({ message: msg, type });
    setTimeout(() => setNotif(null), 4000);
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

  useEffect(() => {
    const currentUser = ApiService.getCurrentUser();
    if (!currentUser) {
      navigate("/", { replace: true });
      return;
    }
    setUser(currentUser);

    const canUpload = currentUser && UPLOAD_ROLES.map(r => r.toLowerCase()).includes(currentUser.role?.toLowerCase());
    if (!canUpload) {
      showNotif("You do not have permission to upload images", "warning");
      navigate("/images");
      return;
    }

    loadFolders();
    loadDropdownConfig();
  }, [navigate]);

  const loadDropdownConfig = async () => {
    try {
      const config = await ApiService.getDropdownConfig();
      if (config.decorTypes) setCustomDecorTypes(config.decorTypes);
      if (config.hiddenDecorTypes) setHiddenDecorTypes(config.hiddenDecorTypes);
    } catch (err) {
      console.error("Failed to load dropdown config:", err);
    }
  };

  const loadFolders = async () => {
    try {
      const folderList = await ApiService.getFolders("home");
      setFolders(folderList);
      if (folderList.length > 0) {
        setSelectedFolderId(folderList[0].id?.toString() || "");
      }
    } catch (err) {
      console.error("Failed to load folders:", err);
    }
  };

  const handleBatchImageSelect = (e) => {
    const files = Array.from(e.target.files);
    const totalAfterAdd = batchImages.length + files.length;
    if (totalAfterAdd > 100) {
      showNotif(`Maximum 100 images allowed per batch. You can add ${100 - batchImages.length} more.`, "warning");
      e.target.value = "";
      return;
    }
    const newRows = files.map((file) => {
      const keepSame = {};
      SAME_FIELDS.forEach(f => { keepSame[f] = false; });
      return {
        file, preview: URL.createObjectURL(file),
        designName: "", decorType: "", venueName: "",
        sizeWidth: "", sizeLength: "", sizeHeight: "", sizeUnit: "sq.ft",
        colours: [], flowerType: "", priceMin: "", priceMax: "",
        keepSame,
      };
    });
    setBatchImages(prev => [...prev, ...newRows]);
    setColourSearchTexts(prev => [...prev, ...newRows.map(() => "")]);
    setColourPickerOpen(prev => [...prev, ...newRows.map(() => false)]);
    e.target.value = "";
  };

  const updateBatchRow = (index, field, value) => {
    setBatchImages(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (SAME_FIELDS.includes(field)) {
        for (let i = index + 1; i < updated.length; i++) {
          if (updated[i].keepSame[field]) {
            updated[i] = { ...updated[i], [field]: value };
          }
        }
      }
      return updated;
    });
  };

  const toggleKeepSameField = (index, field) => {
    setBatchImages(prev => {
      const updated = [...prev];
      const row = updated[index];
      const newVal = !row.keepSame[field];
      row.keepSame = { ...row.keepSame, [field]: newVal };
      if (newVal && index > 0) {
        row[field] = updated[index - 1][field];
      }
      return updated;
    });
  };

  const removeBatchRow = (index) => {
    setBatchImages(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      setColourSearchTexts(prev => { const c = [...prev]; c.splice(index, 1); return c; });
      setColourPickerOpen(prev => { const c = [...prev]; c.splice(index, 1); return c; });
      return updated;
    });
  };

  const buildSizeDisplay = (width, length, height, unit) => {
    const parts = [];
    if (width && width !== "0") parts.push(width);
    if (length && length !== "0") parts.push(length);
    if (height && height !== "0") parts.push(height);
    if (parts.length === 0) return "";
    return parts.join("x") + (unit ? ` ${unit}` : "");
  };

  const preventNumberAction = (e) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E") {
      e.preventDefault();
    }
  };

  const handleUploadBatch = async (e) => {
    e.preventDefault();

    if (!selectedFolderId) {
      showNotif("Please select a folder", "warning");
      return;
    }
    if (batchImages.length === 0) {
      showNotif("Please select at least one image", "warning");
      return;
    }

    const selectedFolder = folders.find(f => f.id?.toString() === selectedFolderId?.toString());
    if (!selectedFolder) {
      showNotif("Selected folder not found", "warning");
      return;
    }

    const missingRows = [];
    batchImages.forEach((row, idx) => {
      const missing = [];
      if (!row.designName) missing.push("Design Name");
      if (!row.decorType) missing.push("Decoration Type");
      if (!row.colours || (Array.isArray(row.colours) && row.colours.length === 0)) missing.push("Colour");
      if ((row.sizeWidth || row.sizeLength || row.sizeHeight) && (!row.sizeWidth || !row.sizeLength || !row.sizeHeight)) missing.push("All three size fields required");
      if (row.priceMin && row.priceMax && parseFloat(row.priceMax) <= parseFloat(row.priceMin)) missing.push("Max price must be > Min price");
      if (missing.length > 0) missingRows.push({ row: idx + 1, fields: missing });
    });

    if (missingRows.length > 0) {
      const msg = missingRows.map(r => `Row ${r.row}: ${r.fields.join(", ")}`).join(" | ");
      showNotif(`Please fill required fields - ${msg}`, "warning");
      return;
    }

    setLoading(true);
    isUploading.current = true;
    const totalImages = batchImages.length;
    setUploadProgress(`Uploading 0 of ${totalImages} images...`);
    let successCount = 0;
    let errorCount = 0;
    const batchStartTime = Date.now();
    const CONCURRENCY = 3;

    const uploadImageWithTimeout = async (row, index) => {
      let imageUrl;
      const isLocalDev = window.location.hostname === "localhost";
      try {
        if (isLocalDev) {
          const uploadResult = await ApiService.uploadFile(row.file, selectedFolder.name);
          imageUrl = uploadResult.imageUrl;
        } else {
          const sig = await ApiService.getUploadSignature(selectedFolder.name);
          const cloudResult = await ApiService.uploadDirectToCloudinary(row.file, sig);
          imageUrl = cloudResult.secure_url;
        }
        const { customerName: folderCustomer, venue: folderVenue } = parseFolderName(selectedFolder.name);
        const sizeDisplay = buildSizeDisplay(row.sizeWidth, row.sizeLength, row.sizeHeight, row.sizeUnit);
        const colours = Array.isArray(row.colours)
          ? row.colours
          : row.colours.split(",").map(c => c.trim()).filter(c => c);
        const metaData = {
          folderName: selectedFolder.name,
          imageUrl,
          colourCombination: colours,
          sizeWidth: row.sizeWidth || null,
          sizeLength: row.sizeLength || null,
          sizeHeight: row.sizeHeight || null,
          sizeUnit: row.sizeUnit,
          sizeDisplay: sizeDisplay,
          designName: row.designName,
          decorType: row.decorType,
          venueCustomer: folderCustomer,
          venueName: row.venueName || folderVenue,
          flowerType: row.flowerType || null,
          priceMin: row.priceMin,
          priceMax: row.priceMax,
          collectedBy: selectedFolder.collected_by || "",
        };
        await ApiService.uploadImage(metaData);
        return true;
      } catch (err) {
        if (imageUrl && !isLocalDev) {
          ApiService.destroyCloudinaryImage(imageUrl).catch(() => {});
        }
        console.error(`Failed to upload image ${index + 1}:`, err);
        return false;
      }
    };

    try {
      for (let i = 0; i < totalImages; i += CONCURRENCY) {
        const batch = batchImages.slice(i, i + CONCURRENCY);
        setUploadProgress(`Uploading ${Math.min(i + CONCURRENCY, totalImages)} of ${totalImages} images...`);
        const batchResults = await Promise.allSettled(
          batch.map((row, batchIndex) => uploadImageWithTimeout(row, i + batchIndex))
        );
        for (const r of batchResults) {
          if (r.status === "fulfilled" && r.value) successCount++;
          else errorCount++;
        }
      }
      const totalTime = ((Date.now() - batchStartTime) / 1000).toFixed(1);
      setUploadProgress(`Successfully uploaded ${successCount} images in ${totalTime}s!${errorCount > 0 ? ` (${errorCount} failed)` : ""}`);
      batchImages.forEach(row => URL.revokeObjectURL(row.preview));
      setBatchImages([]);
      isUploading.current = false;
      setTimeout(() => {
        setUploadProgress("");
      }, 3000);
    } catch (err) {
      showNotif("Something went wrong");
    } finally {
      isUploading.current = false;
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await ApiService.logout();
    navigate("/", { replace: true });
  };

  const displayName = user?.displayName || user?.username || "User";
  const role = user?.role || "N/A";

  return (
    <div className="batch-page">
      <nav className="batch-navbar">
        <div className="batch-navbar-brand">Event Management</div>
        <div className="batch-navbar-right">
          <button className="batch-nav-btn" onClick={() => navigate("/images")}>
            ← Back to Dashboard
          </button>
          <div className="batch-user-info">
            <span className="batch-user-name">{displayName}</span>
            <span className="batch-user-role">{role}</span>
          </div>
          <button onClick={handleLogout} className="batch-btn-logout">Logout</button>
        </div>
      </nav>

      {notif && (
        <div className={`batch-notification ${notif.type}`} onClick={() => setNotif(null)}>
          {notif.message}
        </div>
      )}

      <div className="batch-content">
        <div className="batch-header">
          <h1>Batch Upload Images</h1>
          <p className="batch-subtitle">Upload multiple images with metadata at once</p>
        </div>

        <form onSubmit={handleUploadBatch}>
          <div className="batch-section">
            <h2 className="batch-section-title">1. Select Target Folder</h2>
            <div className="batch-folder-select">
              <select
                className="batch-folder-select-input"
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                required
              >
                <option value="">-- Select a folder --</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>
                    {parseFolderName(f.name).customerName || f.name} — {parseFolderName(f.name).venue || ""} {parseFolderName(f.name).eventDate || ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="batch-section">
            <h2 className="batch-section-title">2. Add Images</h2>
            <div className="batch-add-images">
              <button type="button" className="batch-add-btn" onClick={() => batchImageRef.current?.click()}>
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                Add Images
              </button>
              <input ref={batchImageRef} type="file" accept="image/*" multiple onChange={handleBatchImageSelect} style={{ display: "none" }} />
              <span className="batch-hint">Select multiple images. Max 100 per batch.</span>
            </div>
          </div>

          {batchImages.length > 0 && (
            <div className="batch-section">
              <h2 className="batch-section-title">
                3. Enter Image Details
                <span className="batch-count">({batchImages.length} image{batchImages.length > 1 ? "s" : ""})</span>
              </h2>

              <div className="batch-grid-wrap">
                {batchImages.map((row, index) => (
                  <div key={index} className="batch-card">
                    <div className="batch-card-header">
                      <span className="batch-card-number">#{index + 1}</span>
                      <button type="button" className="batch-card-remove" onClick={() => removeBatchRow(index)} title="Remove">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                    <div className="batch-card-preview">
                      <img src={row.preview} alt="" />
                    </div>
                    <div className="batch-card-fields">
                      <div className="batch-field-row">
                        <div className="batch-field">
                          <label>Design Name</label>
                          <AutocompleteInput
                            options={designNameSugs}
                            value={row.designName}
                            onChange={(val) => {
                              updateBatchRow(index, "designName", val);
                              if (designNameSugTimer.current) clearTimeout(designNameSugTimer.current);
                              if (val.trim()) {
                                designNameSugTimer.current = setTimeout(async () => {
                                  const sugs = await ApiService.getSuggestions("designName", val);
                                  setDesignNameSugs(sugs);
                                }, 200);
                              } else {
                                setDesignNameSugs([]);
                              }
                            }}
                            placeholder="Design name"
                            showOnEmpty={false}
                          />
                          {index > 0 && (
                            <button type="button" className={`batch-same-btn ${row.keepSame.designName ? "active" : ""}`}
                              onClick={() => toggleKeepSameField(index, "designName")} title="Same as previous">
                              S
                            </button>
                          )}
                        </div>
                        <div className="batch-field">
                          <label>Venue</label>
                          <AutocompleteInput
                            options={venueSugs}
                            value={row.venueName}
                            onChange={(val) => {
                              updateBatchRow(index, "venueName", val);
                              if (venueSugTimer.current) clearTimeout(venueSugTimer.current);
                              if (val.trim()) {
                                venueSugTimer.current = setTimeout(async () => {
                                  const sugs = await ApiService.getSuggestions("venueName", val);
                                  setVenueSugs(sugs);
                                }, 200);
                              } else {
                                setVenueSugs([]);
                              }
                            }}
                            placeholder="Venue name"
                            showOnEmpty={false}
                          />
                          {index > 0 && (
                            <button type="button" className={`batch-same-btn ${row.keepSame.venueName ? "active" : ""}`}
                              onClick={() => toggleKeepSameField(index, "venueName")} title="Same as previous">
                              S
                            </button>
                          )}
                        </div>
                        <div className="batch-field">
                          <label>Decoration Type</label>
                          <AutocompleteInput
                            options={allDecorTypes}
                            value={row.decorType}
                            onChange={(val) => updateBatchRow(index, "decorType", val)}
                            placeholder="Decor type"
                          />
                          {index > 0 && (
                            <button type="button" className={`batch-same-btn ${row.keepSame.decorType ? "active" : ""}`}
                              onClick={() => toggleKeepSameField(index, "decorType")} title="Same as previous">
                              S
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="batch-field-row">
                        <div className="batch-field batch-field-sm">
                          <label>Width</label>
                          <input type="number" className="batch-input" placeholder="W" value={row.sizeWidth} min="0"
                            onWheel={(e) => e.target.blur()}
                            onKeyDown={preventNumberAction}
                            onChange={(e) => { const v = e.target.value; if (v === "" || parseFloat(v) >= 0) updateBatchRow(index, "sizeWidth", v); }} />
                        </div>
                        <div className="batch-field batch-field-sm">
                          <label>Length</label>
                          <input type="number" className="batch-input" placeholder="L" value={row.sizeLength} min="0"
                            onWheel={(e) => e.target.blur()}
                            onKeyDown={preventNumberAction}
                            onChange={(e) => { const v = e.target.value; if (v === "" || parseFloat(v) >= 0) updateBatchRow(index, "sizeLength", v); }} />
                        </div>
                        <div className="batch-field batch-field-sm">
                          <label>Height</label>
                          <input type="number" className="batch-input" placeholder="H" value={row.sizeHeight} min="0"
                            onWheel={(e) => e.target.blur()}
                            onKeyDown={preventNumberAction}
                            onChange={(e) => { const v = e.target.value; if (v === "" || parseFloat(v) >= 0) updateBatchRow(index, "sizeHeight", v); }} />
                        </div>
                        <div className="batch-field batch-field-xs">
                          <label>Unit</label>
                          <select className="batch-input" value={row.sizeUnit}
                            onChange={(e) => updateBatchRow(index, "sizeUnit", e.target.value)}>
                            {SIZE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                          {index > 0 && (
                            <button type="button" className={`batch-same-btn ${row.keepSame.sizeWidth ? "active" : ""}`}
                              onClick={() => { toggleKeepSameField(index, "sizeWidth"); toggleKeepSameField(index, "sizeLength"); toggleKeepSameField(index, "sizeHeight"); }} title="Same as previous">
                              S
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="batch-field-row">
                        <div className="batch-field batch-field-colours">
                          <label>Colours <span className="colour-count">{(row.colours || []).length}/3</span></label>
                          <div className="batch-colour-select">
                            {(row.colours || []).length > 0 && (
                              <div className="batch-colour-tags">
                                {(row.colours || []).map((c, ci) => {
                                  const colorObj = COLORS.find(co => co.name === c);
                                  return (
                                    <span key={ci} className="batch-colour-tag" style={{ backgroundColor: colorObj?.hex || "#ccc" }}>
                                      {c}
                                      <button type="button" className="batch-colour-tag-remove"
                                        onClick={() => {
                                          const updated = (row.colours || []).filter((_, i) => i !== ci);
                                          updateBatchRow(index, "colours", updated);
                                        }}>×</button>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                            <div className="batch-colour-search-wrap">
                              <input type="text" className="batch-input batch-colour-search-input"
                                placeholder="Type colour name..."
                                value={colourSearchTexts[index] || ""}
                                onChange={(e) => {
                                  const newSearch = [...colourSearchTexts];
                                  newSearch[index] = e.target.value;
                                  setColourSearchTexts(newSearch);
                                }}
                                onFocus={() => {
                                  const newOpen = [...colourPickerOpen];
                                  newOpen[index] = true;
                                  setColourPickerOpen(newOpen);
                                  const newSearch = [...colourSearchTexts];
                                  if (!newSearch[index]) newSearch[index] = "";
                                  setColourSearchTexts(newSearch);
                                }}
                                onBlur={() => {
                                  setTimeout(() => {
                                    setColourPickerOpen(prev => {
                                      const c = [...prev];
                                      c[index] = false;
                                      return c;
                                    });
                                  }, 180);
                                }}
                              />
                              {colourPickerOpen[index] && (
                                <div className="batch-colour-grid">
                                  {COLORS.filter(c => c.name.toLowerCase().includes((colourSearchTexts[index] || "").toLowerCase())).map(color => {
                                    const isSelected = (row.colours || []).includes(color.name);
                                    const isLightColor = ["White","Yellow","Light Blue","Light Green","Sky Blue","Beige","Cream","Silver","Gold","Rose Gold","Gray","Bronze","Copper"].includes(color.name);
                                    return (
                                      <button key={color.name} type="button"
                                        className={`batch-colour-grid-item ${isSelected ? "selected" : ""} ${isLightColor ? "light-color" : ""}`}
                                        style={{ backgroundColor: color.hex }}
                                        onClick={() => {
                                          let updated = [...(row.colours || [])];
                                          if (isSelected) {
                                            updated = updated.filter(c => c !== color.name);
                                          } else {
                                            if (updated.length >= 3) return;
                                            updated.push(color.name);
                                          }
                                          updateBatchRow(index, "colours", updated);
                                        }}
                                        title={color.name}
                                      >
                                        {isSelected && <span className="batch-colour-check" style={{ color: isLightColor ? "#374151" : "#fff" }}>✓</span>}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            <div className="batch-colour-actions">
                              {(row.colours || []).length > 0 && (
                                <button type="button" className="batch-colour-clear-link"
                                  onClick={() => { updateBatchRow(index, "colours", []); setColourSearchTexts(prev => { const c = [...prev]; c[index] = ""; return c; }); setColourPickerOpen(prev => { const c = [...prev]; c[index] = false; return c; }); }}>
                                  Clear
                                </button>
                              )}
                              {index > 0 && (
                                <button type="button" className={`batch-same-btn ${row.keepSame.colours ? "active" : ""}`}
                                  onClick={() => toggleKeepSameField(index, "colours")} title="Same as previous">S</button>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="batch-field">
                          <label>Flower Type</label>
                          <select className="batch-input" value={row.flowerType}
                            onChange={(e) => updateBatchRow(index, "flowerType", e.target.value)}>
                            <option value="">Select</option>
                            {FLOWER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          {index > 0 && (
                            <button type="button" className={`batch-same-btn ${row.keepSame.flowerType ? "active" : ""}`}
                              onClick={() => toggleKeepSameField(index, "flowerType")} title="Same as previous">S</button>
                          )}
                        </div>
                      </div>
                      <div className="batch-field-row">
                        <div className="batch-field">
                          <label>Min Price (₹)</label>
                          <input type="number" className="batch-input" value={row.priceMin} min="0"
                            onWheel={(e) => e.target.blur()}
                            onKeyDown={preventNumberAction}
                            onChange={(e) => { const v = e.target.value; if (v === "" || parseFloat(v) >= 0) updateBatchRow(index, "priceMin", v); }} placeholder="Min" />
                          {index > 0 && (
                            <button type="button" className={`batch-same-btn ${row.keepSame.priceMin ? "active" : ""}`}
                              onClick={() => toggleKeepSameField(index, "priceMin")} title="Same as previous">S</button>
                          )}
                        </div>
                        <div className="batch-field">
                          <label>Max Price (₹)</label>
                          <input type="number" className="batch-input" value={row.priceMax} min="0"
                            onWheel={(e) => e.target.blur()}
                            onKeyDown={preventNumberAction}
                            onChange={(e) => { const v = e.target.value; if (v === "" || parseFloat(v) >= 0) updateBatchRow(index, "priceMax", v); }} placeholder="Max" />
                          {index > 0 && (
                            <button type="button" className={`batch-same-btn ${row.keepSame.priceMax ? "active" : ""}`}
                              onClick={() => toggleKeepSameField(index, "priceMax")} title="Same as previous">S</button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {uploadProgress && <div className="batch-progress">{uploadProgress}</div>}

              <div className="batch-actions">
                <button type="button" className="batch-btn batch-btn-secondary"
                  onClick={() => { batchImages.forEach(row => URL.revokeObjectURL(row.preview)); setBatchImages([]); setColourSearchTexts([]); setColourPickerOpen([]); setUploadProgress(""); }}>
                  Clear All
                </button>
                <button type="submit" className="batch-btn batch-btn-primary" disabled={loading || batchImages.length === 0}>
                  {loading ? "Uploading..." : `Upload ${batchImages.length} Image${batchImages.length > 1 ? "s" : ""}`}
                </button>
                <button type="button" className="batch-btn batch-btn-secondary" onClick={() => navigate("/images")}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default BatchUploadPage;
