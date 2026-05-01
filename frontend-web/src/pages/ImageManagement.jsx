import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ApiService from "../services/api";
import "./ImageManagement.css";

const UPLOAD_ROLES = ["Captain", "ViceCaptain", "Owner"];
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const IMAGE_BASE_URL = API_BASE_URL.replace(/\/api$/, "");

function ImageManagement() {
  const [folders, setFolders] = useState([]);
  const [images, setImages] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTab, setUploadTab] = useState("single");
  const [folderName, setFolderName] = useState("");
  const [folderDescription, setFolderDescription] = useState("");
  const [selectedExcelFile, setSelectedExcelFile] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [batchImages, setBatchImages] = useState([]);
  const [imagePreview, setImagePreview] = useState("");
  const [lightboxImage, setLightboxImage] = useState(null);
  const [imageData, setImageData] = useState({
    designName: "",
    size: "",
    sizeUnit: "inch",
    colours: "",
    placeOfEvent: "",
    decorType: "",
    eventName: "",
  });
  const [uploadProgress, setUploadProgress] = useState("");
  const navigate = useNavigate();
  const excelFileRef = useRef(null);
  const batchImageRef = useRef(null);
  const imageFileRef = useRef(null);

  useEffect(() => {
    const checkAuth = () => {
      const user = ApiService.getCurrentUser();
      if (!user) {
        navigate("/", { replace: true });
        return;
      }
      setUser(user);
    };

    checkAuth();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkAuth();
      }
    };

    const handlePopState = () => {
      checkAuth();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [navigate]);

  useEffect(() => {
    if (user) {
      loadFolders();
    }
  }, [user]);

  useEffect(() => {
    if (currentFolder) {
      loadImages();
    }
  }, [currentFolder]);

  const loadFolders = async () => {
    try {
      const folderList = await ApiService.getFolders();
      setFolders(folderList);
    } catch (err) {
      console.error("Failed to load folders:", err);
    }
  };

  const loadImages = async () => {
    if (!currentFolder) {
      setImages([]);
      return;
    }
    setLoading(true);
    try {
      const imageList = await ApiService.getImages(currentFolder.name);
      setImages(imageList);
    } catch (err) {
      alert("Error loading images: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFolder = async (e) => {
    e.preventDefault();
    if (!folderName.trim()) {
      alert("Please enter a folder name");
      return;
    }
    setLoading(true);
    try {
      await ApiService.createFolder(folderName.trim(), folderDescription.trim());
      setFolderName("");
      setFolderDescription("");
      setShowAddFolderModal(false);
      loadFolders();
    } catch (err) {
      alert("Failed to create folder: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFolder = async (id, name, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete folder "${name}" and all its images?`)) return;
    setLoading(true);
    try {
      await ApiService.deleteFolder(id);
      if (currentFolder && currentFolder.id === id) {
        setCurrentFolder(null);
        setImages([]);
      }
      loadFolders();
    } catch (err) {
      alert("Failed to delete folder: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEnterFolder = (folder) => {
    setCurrentFolder(folder);
  };

  const handleBackToFolders = () => {
    setCurrentFolder(null);
    setImages([]);
  };

  const handleExcelSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedExcelFile(file);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      alert("Please select a valid image file");
    }
  };

  const handleBatchImageSelect = (e) => {
    const files = Array.from(e.target.files);
    const newRows = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      designName: "",
      size: "",
      sizeUnit: "inch",
      colours: "",
      placeOfEvent: "",
      decorType: "",
      eventName: "",
    }));
    setBatchImages(prev => [...prev, ...newRows]);
    e.target.value = "";
  };

  const updateBatchRow = (index, field, value) => {
    setBatchImages(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeBatchRow = (index) => {
    setBatchImages(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleUploadBatch = async (e) => {
    e.preventDefault();
    if (batchImages.length === 0) {
      alert("Please select at least one image");
      return;
    }
    setLoading(true);
    setUploadProgress(`Uploading 0 of ${batchImages.length} images...`);
    let successCount = 0;
    let errorCount = 0;
    try {
      for (let i = 0; i < batchImages.length; i++) {
        const row = batchImages[i];
        setUploadProgress(`Uploading ${i + 1} of ${batchImages.length} images...`);
        try {
          const uploadResult = await ApiService.uploadFile(row.file, currentFolder.name);
          const metaData = {
            folderName: currentFolder.name,
            imageUrl: uploadResult.imageUrl,
            colourCombination: row.colours.split(",").map(c => c.trim()).filter(c => c),
            size: row.size,
            sizeUnit: row.sizeUnit,
            designName: row.designName,
            placeOfEvent: row.placeOfEvent,
            decorType: row.decorType,
            eventName: row.eventName,
            eventTime: null,
          };
          await ApiService.uploadImage(metaData);
          successCount++;
        } catch (err) {
          console.error(`Failed to upload image ${i + 1}:`, err);
          errorCount++;
        }
      }
      setUploadProgress(`Successfully uploaded ${successCount} images!${errorCount > 0 ? ` (${errorCount} failed)` : ""}`);
      batchImages.forEach(row => URL.revokeObjectURL(row.preview));
      setBatchImages([]);
      loadImages();
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadProgress("");
        setUploadTab("single");
      }, 2000);
    } catch (err) {
      alert("Batch upload failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSingleImage = async (e) => {
    e.preventDefault();
    if (!selectedImage) {
      alert("Please select an image");
      return;
    }
    setLoading(true);
    setUploadProgress("Uploading image...");
    try {
      const uploadResult = await ApiService.uploadFile(selectedImage, currentFolder.name);
      const metaData = {
        folderName: currentFolder.name,
        imageUrl: uploadResult.imageUrl,
        colourCombination: imageData.colours.split(",").map(c => c.trim()).filter(c => c),
        size: imageData.size,
        sizeUnit: imageData.sizeUnit,
        designName: imageData.designName,
        placeOfEvent: imageData.placeOfEvent,
        decorType: imageData.decorType,
        eventName: imageData.eventName,
        eventTime: null,
      };
      setUploadProgress("Saving metadata...");
      await ApiService.uploadImage(metaData);
      setUploadProgress("Uploaded successfully!");
      setSelectedImage(null);
      setImagePreview("");
      setImageData({ designName: "", size: "", sizeUnit: "inch", colours: "", placeOfEvent: "", decorType: "", eventName: "" });
      loadImages();
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadProgress("");
        setUploadTab("single");
      }, 1500);
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadExcel = async (e) => {
    e.preventDefault();
    if (!selectedExcelFile) {
      alert("Please select an Excel file");
      return;
    }
    setLoading(true);
    setUploadProgress("Uploading and processing Excel file...");
    try {
      const result = await ApiService.uploadExcel(selectedExcelFile, currentFolder.name);
      setUploadProgress(`Success! ${result.uploaded} images uploaded`);
      if (result.errors && result.errors.length > 0) {
        setUploadProgress(prev => prev + `\nErrors: ${result.errors.join(", ")}`);
      }
      setSelectedExcelFile(null);
      loadImages();
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadProgress("");
      }, 2000);
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async (id) => {
    if (!window.confirm("Delete this image?")) return;
    setLoading(true);
    try {
      await ApiService.deleteImage(id);
      loadImages();
    } catch (err) {
      alert("Delete failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await ApiService.logout();
    navigate("/", { replace: true });
  };

  const canUpload = user && UPLOAD_ROLES.map(r => r.toLowerCase()).includes(user.role?.toLowerCase());

  const displayName = user?.displayName || user?.username || "User";
  const role = user?.role || "N/A";

  return (
    <div className="image-management">
      <nav className="navbar">
        <div className="navbar-left">
          <div className="navbar-brand">Event Management</div>
          {currentFolder && (
            <button className="btn-back" onClick={handleBackToFolders}>
              ← Back to Folders
            </button>
          )}
        </div>
        <div className="navbar-right">
          <div className="user-info">
            <span className="user-display">User: <strong>{displayName}</strong></span>
            <span className="user-role">Role: <strong>{role}</strong></span>
          </div>
          <button onClick={handleLogout} className="btn btn-logout">
            Logout
          </button>
        </div>
      </nav>

      <div className="main-content">
        {!currentFolder ? (
          <div className="folder-view">
            <div className="action-bar">
              <h2>Folders</h2>
              {canUpload && (
                <button
                  className="btn btn-primary btn-add-folder"
                  onClick={() => setShowAddFolderModal(true)}
                >
                  + Add Folder
                </button>
              )}
            </div>

            {folders.length === 0 ? (
              <div className="empty-state">
                <p>No folders yet. Create one to get started!</p>
              </div>
            ) : (
              <div className="folder-grid">
                {folders.map(folder => (
                  <div
                    key={folder.id}
                    className="folder-item"
                    onClick={() => handleEnterFolder(folder)}
                  >
                    <div className="folder-icon">
                      <svg viewBox="0 0 64 64" width="64" height="64">
                        <path d="M8 16h18l6 6h24v32H8z" fill="#F5C842" />
                        <path d="M8 22h48v28H8z" fill="#FFD54F" />
                        <path d="M8 16h18l6 6H8z" fill="#FFB300" />
                      </svg>
                    </div>
                    <span className="folder-name">{folder.name}</span>
                    {canUpload && (
                      <button
                        className="folder-delete"
                        onClick={(e) => handleDeleteFolder(folder.id, folder.name, e)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="folder-content">
            <div className="action-bar">
              <h2>{currentFolder.name}</h2>
              {canUpload && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setUploadTab("single");
                    setShowUploadModal(true);
                  }}
                >
                  + Upload Images
                </button>
              )}
            </div>

            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
              </div>
            ) : images.length === 0 ? (
              <div className="empty-state">
                <p>No images in this folder. Upload an image or Excel file to add images!</p>
              </div>
            ) : (
              <div className="image-grid">
                {images.map(image => {
                  const imgUrl = image.image_data?.imageUrl ? `${IMAGE_BASE_URL}${image.image_data.imageUrl}` : "";
                  return (
                    <div key={image.id} className="image-card">
                      {imgUrl ? (
                        <img
                          className="image-card-img"
                          src={imgUrl}
                          alt={image.image_data?.designName}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "";
                            e.target.style.background = "#e5e7eb";
                          }}
                          onClick={() => setLightboxImage({ url: imgUrl, data: image.image_data })}
                        />
                      ) : (
                        <div className="image-card-placeholder">No Image</div>
                      )}
                      <div className="image-card-content">
                        <h3>{image.image_data?.designName || "Untitled"}</h3>
                        <div className="image-meta">
                          {image.image_data?.size && <p>Size: {image.image_data.size} {image.image_data.sizeUnit}</p>}
                          {image.image_data?.colourCombination?.length > 0 && (
                            <p>Colours: {image.image_data.colourCombination.join(", ")}</p>
                          )}
                          {image.image_data?.placeOfEvent && <p>Place: {image.image_data.placeOfEvent}</p>}
                          {image.image_data?.decorType && <p>Decor Name: {image.image_data.decorType}</p>}
                          {image.image_data?.eventName && <p>Event Name: {image.image_data.eventName}</p>}
                        </div>
                        {canUpload && (
                          <button
                            className="image-card-delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteImage(image.id);
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Folder Modal */}
      {showAddFolderModal && (
        <div className="modal-overlay" onClick={() => setShowAddFolderModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create New Folder</h2>
              <button className="modal-close" onClick={() => setShowAddFolderModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddFolder}>
              <div className="form-group">
                <label className="label">Folder Name *</label>
                <input
                  type="text"
                  className="input"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="e.g., Wedding_Decor_HallA_2024"
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Description (optional)</label>
                <input
                  type="text"
                  className="input"
                  value={folderDescription}
                  onChange={(e) => setFolderDescription(e.target.value)}
                  placeholder="Brief description"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Creating..." : "Create Folder"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Upload Modal - Tabs for Single Image and Excel */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal upload-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Upload Images</h2>
              <button className="modal-close" onClick={() => setShowUploadModal(false)}>×</button>
            </div>

            <div className="upload-tabs">
              <button
                className={`upload-tab ${uploadTab === "single" ? "active" : ""}`}
                onClick={() => setUploadTab("single")}
              >
                Single Image
              </button>
              <button
                className={`upload-tab ${uploadTab === "batch" ? "active" : ""}`}
                onClick={() => setUploadTab("batch")}
              >
                Batch Upload
              </button>
            </div>

            {uploadTab === "single" && (
              <form onSubmit={handleUploadSingleImage}>
                <div className="form-group">
                  <label className="label">Select Image</label>
                  <div
                    className="drop-zone"
                    onClick={() => imageFileRef.current?.click()}
                  >
                    <input
                      ref={imageFileRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      style={{ display: "none" }}
                    />
                    {imagePreview ? (
                      <div className="image-preview-container">
                        <img src={imagePreview} alt="Preview" className="image-preview" />
                        <button
                          type="button"
                          className="remove-preview"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedImage(null);
                            setImagePreview("");
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="drop-text">
                        <span className="drop-icon">📷</span>
                        <p>Click to select or drag image here</p>
                        <p className="drop-hint">Supports: JPG, PNG, GIF, WebP</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="label">Decoration Name</label>
                  <input
                    type="text"
                    className="input"
                    value={imageData.designName}
                    onChange={(e) => setImageData({...imageData, designName: e.target.value})}
                    placeholder="Enter decoration name"
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="label">Size</label>
                    <div className="flex-gap">
                      <input
                        type="text"
                        className="input"
                        value={imageData.size}
                        onChange={(e) => setImageData({...imageData, size: e.target.value})}
                        placeholder="Size"
                      />
                      <select
                        className="input"
                        value={imageData.sizeUnit}
                        onChange={(e) => setImageData({...imageData, sizeUnit: e.target.value})}
                      >
                        <option value="inch">inch</option>
                        <option value="cm">cm</option>
                        <option value="meter">meter</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="label">Colours (comma separated)</label>
                    <input
                      type="text"
                      className="input"
                      value={imageData.colours}
                      onChange={(e) => setImageData({...imageData, colours: e.target.value})}
                      placeholder="Red, Gold, White"
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="label">Place of Event</label>
                    <input
                      type="text"
                      className="input"
                      value={imageData.placeOfEvent}
                      onChange={(e) => setImageData({...imageData, placeOfEvent: e.target.value})}
                      placeholder="Enter location"
                    />
                  </div>

                  <div className="form-group">
                    <label className="label">Event Name</label>
                    <input
                      type="text"
                      className="input"
                      value={imageData.eventName}
                      onChange={(e) => setImageData({...imageData, eventName: e.target.value})}
                      placeholder="Enter event name"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="label">Decor Name</label>
                  <input
                    type="text"
                    className="input"
                    value={imageData.decorType}
                    onChange={(e) => setImageData({...imageData, decorType: e.target.value})}
                    placeholder="Enter decor name"
                  />
                </div>

                {uploadProgress && (
                  <div className="upload-progress">{uploadProgress}</div>
                )}

                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Uploading..." : "Upload Image"}
                </button>
              </form>
            )}

            {uploadTab === "batch" && (
              <form onSubmit={handleUploadBatch}>
                <div className="batch-upload-section">
                  <div className="batch-image-selector">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => batchImageRef.current?.click()}
                    >
                      + Add Images
                    </button>
                    <input
                      ref={batchImageRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleBatchImageSelect}
                      style={{ display: "none" }}
                    />
                    <span className="batch-hint">Select multiple images to add them to the table</span>
                  </div>

                  {batchImages.length > 0 && (
                    <div className="batch-table-container">
                      <table className="batch-table">
                        <thead>
                          <tr>
                            <th className="batch-col-image">Image</th>
                            <th className="batch-col-design">Design Name</th>
                            <th className="batch-col-size">Size</th>
                            <th className="batch-col-unit">Unit</th>
                            <th className="batch-col-colours">Colours</th>
                            <th className="batch-col-place">Place of Event</th>
                            <th className="batch-col-decor">Decor Name</th>
                            <th className="batch-col-event">Event Name</th>
                            <th className="batch-col-action"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {batchImages.map((row, index) => (
                            <tr key={index}>
                              <td className="batch-col-image">
                                <div className="batch-thumbnail">
                                  <img src={row.preview} alt={`Preview ${index + 1}`} />
                                </div>
                              </td>
                              <td className="batch-col-design">
                                <input
                                  type="text"
                                  className="batch-input"
                                  value={row.designName}
                                  onChange={(e) => updateBatchRow(index, "designName", e.target.value)}
                                  placeholder="Design name"
                                />
                              </td>
                              <td className="batch-col-size">
                                <input
                                  type="text"
                                  className="batch-input batch-input-sm"
                                  value={row.size}
                                  onChange={(e) => updateBatchRow(index, "size", e.target.value)}
                                  placeholder="Size"
                                />
                              </td>
                              <td className="batch-col-unit">
                                <select
                                  className="batch-select"
                                  value={row.sizeUnit}
                                  onChange={(e) => updateBatchRow(index, "sizeUnit", e.target.value)}
                                >
                                  <option value="inch">inch</option>
                                  <option value="cm">cm</option>
                                  <option value="meter">meter</option>
                                </select>
                              </td>
                              <td className="batch-col-colours">
                                <input
                                  type="text"
                                  className="batch-input"
                                  value={row.colours}
                                  onChange={(e) => updateBatchRow(index, "colours", e.target.value)}
                                  placeholder="Red, Gold"
                                />
                              </td>
                              <td className="batch-col-place">
                                <input
                                  type="text"
                                  className="batch-input"
                                  value={row.placeOfEvent}
                                  onChange={(e) => updateBatchRow(index, "placeOfEvent", e.target.value)}
                                  placeholder="Location"
                                />
                              </td>
                              <td className="batch-col-decor">
                                <input
                                  type="text"
                                  className="batch-input"
                                  value={row.decorType}
                                  onChange={(e) => updateBatchRow(index, "decorType", e.target.value)}
                                  placeholder="Decor name"
                                />
                              </td>
                              <td className="batch-col-event">
                                <input
                                  type="text"
                                  className="batch-input"
                                  value={row.eventName}
                                  onChange={(e) => updateBatchRow(index, "eventName", e.target.value)}
                                  placeholder="Event name"
                                />
                              </td>
                              <td className="batch-col-action">
                                <button
                                  type="button"
                                  className="batch-remove-btn"
                                  onClick={() => removeBatchRow(index)}
                                >
                                  ×
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {uploadProgress && (
                    <div className="upload-progress">{uploadProgress}</div>
                  )}

                  <div className="batch-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setBatchImages([]);
                        setUploadProgress("");
                      }}
                    >
                      Clear All
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={loading || batchImages.length === 0}>
                      {loading ? "Uploading..." : `Upload ${batchImages.length} Image(s)`}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* Lightbox */}
      {lightboxImage && (
        <div className="lightbox" onClick={() => setLightboxImage(null)}>
          <button className="lightbox-close" onClick={() => setLightboxImage(null)}>×</button>
          {lightboxImage.url ? (
            <img
              className="lightbox-image"
              src={lightboxImage.url}
              alt={lightboxImage.data?.designName}
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = "none";
              }}
            />
          ) : (
            <div className="lightbox-placeholder">Image not available</div>
          )}
          <div className="lightbox-info">
            <h3>{lightboxImage.data?.designName || "Untitled"}</h3>
            <div className="lightbox-meta">
              {lightboxImage.data?.size && <span>Size: {lightboxImage.data.size} {lightboxImage.data.sizeUnit}</span>}
              {lightboxImage.data?.colourCombination?.length > 0 && (
                <span>Colours: {lightboxImage.data.colourCombination.join(", ")}</span>
              )}
              {lightboxImage.data?.placeOfEvent && <span>Place: {lightboxImage.data.placeOfEvent}</span>}
              {lightboxImage.data?.decorType && <span>Decor Name: {lightboxImage.data.decorType}</span>}
              {lightboxImage.data?.eventName && <span>Event Name: {lightboxImage.data.eventName}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImageManagement;
