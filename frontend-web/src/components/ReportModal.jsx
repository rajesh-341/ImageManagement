import React, { useMemo } from "react";
import * as XLSX from "xlsx";

const parseFolderName = (name) => {
  if (!name) return { customerName: "", venue: "", eventDate: "" };
  const parts = name.split("_");
  return {
    customerName: parts[0] || "",
    venue: parts[1] || "",
    eventDate: parts.slice(2).join("_") || "",
  };
};

const formatEventDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatUploadDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const getEventTypeDisplay = (eventTypes) => {
  if (!eventTypes) return "";
  if (Array.isArray(eventTypes)) return eventTypes.join(", ");
  try {
    const parsed = JSON.parse(eventTypes);
    return Array.isArray(parsed) ? parsed.join(", ") : eventTypes;
  } catch {
    return eventTypes;
  }
};

const ReportModal = ({ isOpen, onClose, data, loading }) => {
  const formattedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((row, index) => {
      const { customerName, venue, eventDate } = parseFolderName(row.name);
      return {
        sno: index + 1,
        uploadedDate: formatUploadDate(row.upload_date),
        uploadedBy: row.uploaded_by || "",
        customerName: customerName || "",
        venue: venue || "",
        eventType: getEventTypeDisplay(row.event_types),
        eventDate: formatEventDate(eventDate),
        collectedBy: row.collected_by || "",
        imageCount: row.image_count || 0,
      };
    });
  }, [data]);

  const handleDownloadXlsx = () => {
    const worksheetData = formattedData.map((r) => ({
      "S.No": r.sno,
      "Uploaded Date": r.uploadedDate,
      "Uploaded By": r.uploadedBy,
      "Customer Name": r.customerName,
      "Venue": r.venue,
      "Event Type": r.eventType,
      "Event Date": r.eventDate,
      "Collected by": r.collectedBy,
      "No of images": r.imageCount,
    }));

    const ws = XLSX.utils.json_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");

    ws["!cols"] = [
      { wch: 6 },
      { wch: 18 },
      { wch: 20 },
      { wch: 20 },
      { wch: 16 },
      { wch: 20 },
      { wch: 14 },
      { wch: 16 },
      { wch: 14 },
    ];

    XLSX.writeFile(wb, `Folder_Report_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-report" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "1100px", width: "95%" }}>
        <div className="modal-header">
          <h2 className="modal-title">Folder Report</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ maxHeight: "70vh", overflow: "auto" }}>
          {loading ? (
            <div className="loading-spinner">Loading...</div>
          ) : formattedData.length === 0 ? (
            <p className="empty-state">No folder data available.</p>
          ) : (
            <table className="report-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>S.No</th>
                  <th style={thStyle}>Uploaded Date</th>
                  <th style={thStyle}>Uploaded By</th>
                  <th style={thStyle}>Customer Name</th>
                  <th style={thStyle}>Venue</th>
                  <th style={thStyle}>Event Type</th>
                  <th style={thStyle}>Event Date</th>
                  <th style={thStyle}>Collected by</th>
                  <th style={thStyle}>No of images</th>
                </tr>
              </thead>
              <tbody>
                {formattedData.map((r) => (
                  <tr key={r.sno}>
                    <td style={tdStyle}>{r.sno}</td>
                    <td style={tdStyle}>{r.uploadedDate}</td>
                    <td style={tdStyle}>{r.uploadedBy}</td>
                    <td style={tdStyle}>{r.customerName}</td>
                    <td style={tdStyle}>{r.venue}</td>
                    <td style={tdStyle}>{r.eventType}</td>
                    <td style={tdStyle}>{r.eventDate}</td>
                    <td style={tdStyle}>{r.collectedBy}</td>
                    <td style={tdStyle} className="text-center">{r.imageCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={handleDownloadXlsx} disabled={formattedData.length === 0}>
            Download XLSX
          </button>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

const thStyle = {
  padding: "10px 12px",
  textAlign: "left",
  borderBottom: "2px solid #dee2e6",
  backgroundColor: "#f8f9fa",
  fontWeight: 600,
  fontSize: "13px",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "8px 12px",
  borderBottom: "1px solid #eee",
  fontSize: "13px",
};

export default ReportModal;
