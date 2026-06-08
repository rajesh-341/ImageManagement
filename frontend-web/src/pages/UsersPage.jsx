import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ApiService from "../services/api";
import {
  MANAGE_USERS_ROLES, EVENT_TYPES, DECOR_TYPES,
} from "../constants";
import "./UsersPage.css";

const slugifyRole = (role) => (role || "").toLowerCase().replace(/\s+/g, "-");

function UsersPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState(new Set());
  const [userForm, setUserForm] = useState({ username: "", displayName: "", role: "", password: "" });
  const [editingUser, setEditingUser] = useState(null);

  const [customEventTypes, setCustomEventTypes] = useState([]);
  const [customDecorTypes, setCustomDecorTypes] = useState([]);
  const [newEventType, setNewEventType] = useState("");
  const [newDecorType, setNewDecorType] = useState("");
  const [hiddenEventTypes, setHiddenEventTypes] = useState([]);
  const [hiddenDecorTypes, setHiddenDecorTypes] = useState([]);
  const [editingEventTypeIdx, setEditingEventTypeIdx] = useState(null);
  const [editingDecorTypeIdx, setEditingDecorTypeIdx] = useState(null);
  const [editingTagValue, setEditingTagValue] = useState("");

  const allEventTypes = [...EVENT_TYPES, ...customEventTypes].filter((t, i, arr) => arr.indexOf(t) === i && !hiddenEventTypes.includes(t));
  const allDecorTypes = [...DECOR_TYPES, ...customDecorTypes].filter((t, i, arr) => arr.indexOf(t) === i && !hiddenDecorTypes.includes(t));

  const [getFormConfigKey] = useState(() => {
    const u = ApiService.getCurrentUser();
    return u ? `formConfig_${u.username || u.displayName || "default"}` : "formConfig";
  });

  const [formConfig, setFormConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem(getFormConfigKey)) || {}; } catch { return {}; }
  });

  const canManageUsers = user && MANAGE_USERS_ROLES.map(r => r.toLowerCase()).includes(user.role?.toLowerCase());

  const isFieldRequired = (fieldKey) => formConfig[fieldKey] !== false;

  const showNotif = (message, type = "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const saveFormConfig = (config) => {
    setFormConfig(config);
    localStorage.setItem(getFormConfigKey, JSON.stringify(config));
  };

  useEffect(() => {
    const currentUser = ApiService.getCurrentUser();
    if (!currentUser) {
      navigate("/", { replace: true });
      return;
    }
    setUser(currentUser);
    loadUsers();
    loadDropdownConfig();
  }, [navigate]);

  const loadDropdownConfig = async () => {
    try {
      const config = await ApiService.getDropdownConfig();
      if (config.eventTypes) setCustomEventTypes(config.eventTypes);
      if (config.decorTypes) setCustomDecorTypes(config.decorTypes);
      if (config.hiddenEventTypes) setHiddenEventTypes(config.hiddenEventTypes);
      if (config.hiddenDecorTypes) setHiddenDecorTypes(config.hiddenDecorTypes);
    } catch (err) {
      console.error("Failed to load dropdown config:", err);
    }
  };

  const loadUsers = async () => {
    try {
      const userList = await ApiService.getUsers();
      setUsers(userList);
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!userForm.username || !userForm.displayName || !userForm.role || !userForm.password) {
      showNotif("All fields are required", "warning");
      return;
    }
    setLoading(true);
    try {
      await ApiService.createUser(userForm);
      setUserForm({ username: "", displayName: "", role: "", password: "" });
      loadUsers();
    } catch (err) {
      showNotif("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setUserForm({
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      password: "",
    });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!userForm.username || !userForm.displayName || !userForm.role) {
      showNotif("Username, display name, and role are required", "warning");
      return;
    }
    setLoading(true);
    try {
      await ApiService.updateUser(editingUser.id, userForm);
      setEditingUser(null);
      setUserForm({ username: "", displayName: "", role: "", password: "" });
      loadUsers();
    } catch (err) {
      showNotif("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id, username) => {
    if (!window.confirm(`Delete user "${username}"?`)) return;
    setLoading(true);
    try {
      await ApiService.deleteUser(id);
      loadUsers();
    } catch (err) {
      showNotif("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (userId) => {
    setVisiblePasswords(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleSaveEventTypeEdit = async (index, oldVal) => {
    const newVal = editingTagValue.trim();
    if (!newVal || newVal === oldVal) { setEditingEventTypeIdx(null); setEditingTagValue(""); return; }
    const isBuiltIn = EVENT_TYPES.includes(oldVal);
    if (isBuiltIn) {
      const newHidden = [...hiddenEventTypes, oldVal];
      const newCustom = customEventTypes.includes(newVal) ? customEventTypes : [...customEventTypes, newVal];
      setHiddenEventTypes(newHidden);
      setCustomEventTypes(newCustom);
      await ApiService.updateDropdownConfig(newCustom, customDecorTypes, newHidden, hiddenDecorTypes);
    } else {
      const newCustom = customEventTypes.map(ct => ct === oldVal ? newVal : ct);
      setCustomEventTypes(newCustom);
      await ApiService.updateDropdownConfig(newCustom, customDecorTypes, hiddenEventTypes, hiddenDecorTypes);
    }
    setEditingEventTypeIdx(null);
    setEditingTagValue("");
  };

  const handleSaveDecorTypeEdit = async (index, oldVal) => {
    const newVal = editingTagValue.trim();
    if (!newVal || newVal === oldVal) { setEditingDecorTypeIdx(null); setEditingTagValue(""); return; }
    const isBuiltIn = DECOR_TYPES.includes(oldVal);
    if (isBuiltIn) {
      const newHidden = [...hiddenDecorTypes, oldVal];
      const newCustom = customDecorTypes.includes(newVal) ? customDecorTypes : [...customDecorTypes, newVal];
      setHiddenDecorTypes(newHidden);
      setCustomDecorTypes(newCustom);
      await ApiService.updateDropdownConfig(customEventTypes, newCustom, hiddenEventTypes, newHidden);
    } else {
      const newCustom = customDecorTypes.map(ct => ct === oldVal ? newVal : ct);
      setCustomDecorTypes(newCustom);
      await ApiService.updateDropdownConfig(customEventTypes, newCustom, hiddenEventTypes, hiddenDecorTypes);
    }
    setEditingDecorTypeIdx(null);
    setEditingTagValue("");
  };

  const handleLogout = async () => {
    await ApiService.logout();
    navigate("/", { replace: true });
  };

  const displayName = user?.displayName || user?.username || "User";
  const role = user?.role || "N/A";

  return (
    <div className="users-page">
      <nav className="users-navbar">
        <div className="users-navbar-brand">Event Management</div>
        <div className="users-navbar-right">
          <button className="users-nav-btn" onClick={() => navigate("/images")}>
            ← Back to Dashboard
          </button>
          <div className="users-user-info">
            <span className="users-user-name">{displayName}</span>
            <span className="users-user-role">{role}</span>
          </div>
          <button onClick={handleLogout} className="users-btn-logout">Logout</button>
        </div>
      </nav>

      {notification && (
        <div className={`users-notification ${notification.type}`} onClick={() => setNotification(null)}>
          {notification.message}
        </div>
      )}

      <div className="users-page-content">
        <div className="users-page-header">
          <h1>Users & Settings</h1>
        </div>

        {canManageUsers && (
          <section className="users-section">
            <h2 className="users-section-title">User Management</h2>

            {editingUser ? (
              <div className="users-card">
                <h3>Edit User</h3>
                <form onSubmit={handleUpdateUser}>
                  <div className="users-form-grid">
                    <div className="users-field">
                      <label>Username</label>
                      <input type="text" className="users-input" value={userForm.username}
                        onChange={(e) => setUserForm({...userForm, username: e.target.value})} required />
                    </div>
                    <div className="users-field">
                      <label>Display Name</label>
                      <input type="text" className="users-input" value={userForm.displayName}
                        onChange={(e) => setUserForm({...userForm, displayName: e.target.value})} required />
                    </div>
                    <div className="users-field">
                      <label>Role</label>
                      <select className="users-input" value={userForm.role}
                        onChange={(e) => setUserForm({...userForm, role: e.target.value})} required>
                        <option value="">Select Role</option>
                        <option value="CEO">CEO</option>
                        <option value="Marketing Head">Marketing Head</option>
                        <option value="Event Managers">Event Managers</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </div>
                    <div className="users-field">
                      <label>Password (leave blank to keep current)</label>
                      <input type="text" className="users-input" value={userForm.password}
                        onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                        placeholder="Enter new password" />
                    </div>
                  </div>
                  <div className="users-form-actions">
                    <button type="button" className="users-btn users-btn-secondary" onClick={() => { setEditingUser(null); setUserForm({ username: "", displayName: "", role: "", password: "" }); }}>
                      Cancel
                    </button>
                    <button type="submit" className="users-btn users-btn-primary" disabled={loading}>
                      {loading ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="users-card">
                <h3>Add New User</h3>
                <form onSubmit={handleAddUser}>
                  <div className="users-form-grid users-form-grid-add">
                    <div className="users-field">
                      <label>Username</label>
                      <input type="text" className="users-input" placeholder="Username" value={userForm.username}
                        onChange={(e) => setUserForm({...userForm, username: e.target.value})} required />
                    </div>
                    <div className="users-field">
                      <label>Display Name</label>
                      <input type="text" className="users-input" placeholder="Display Name" value={userForm.displayName}
                        onChange={(e) => setUserForm({...userForm, displayName: e.target.value})} required />
                    </div>
                    <div className="users-field">
                      <label>Role</label>
                      <select className="users-input" value={userForm.role}
                        onChange={(e) => setUserForm({...userForm, role: e.target.value})} required>
                        <option value="">Role</option>
                        <option value="CEO">CEO</option>
                        <option value="Marketing Head">Marketing Head</option>
                        <option value="Event Managers">Event Managers</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </div>
                    <div className="users-field">
                      <label>Password</label>
                      <input type="text" className="users-input" placeholder="Password" value={userForm.password}
                        onChange={(e) => setUserForm({...userForm, password: e.target.value})} required />
                    </div>
                    <div className="users-field users-field-submit">
                      <button type="submit" className="users-btn users-btn-primary" disabled={loading}>
                        {loading ? "Adding..." : "Add User"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            <div className="users-table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Display Name</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Password</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={5} className="users-empty">No users found.</td></tr>
                  ) : (
                    users.map(userItem => (
                      <tr key={userItem.id}>
                        <td className="users-cell-name">{userItem.displayName}</td>
                        <td>{userItem.username}</td>
                        <td>
                          <span className={`users-role-badge ${slugifyRole(userItem.role)}`}>
                            {userItem.role || "—"}
                          </span>
                        </td>
                        <td className="users-cell-password">
                          <div className="users-password-wrap">
                            <span className="users-password-text">
                              {visiblePasswords.has(userItem.id) ? (userItem.password || "(no password)") : "••••••••"}
                            </span>
                            <button
                              className="users-password-toggle"
                              onClick={() => togglePasswordVisibility(userItem.id)}
                              title={visiblePasswords.has(userItem.id) ? "Hide password" : "Show password"}
                            >
                              {visiblePasswords.has(userItem.id) ? (
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                                  <line x1="1" y1="1" x2="23" y2="23"/>
                                </svg>
                              ) : (
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                  <circle cx="12" cy="12" r="3"/>
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="users-actions">
                            <button className="users-icon-btn users-icon-btn-edit" onClick={() => handleEditUser(userItem)} title="Edit user">
                              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button className="users-icon-btn users-icon-btn-delete" onClick={() => handleDeleteUser(userItem.id, userItem.username)} title="Delete user">
                              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                <line x1="10" y1="11" x2="10" y2="17"/>
                                <line x1="14" y1="11" x2="14" y2="17"/>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="users-section">
          <h2 className="users-section-title">Form Settings</h2>
          <div className="users-card">
            <p className="users-hint">Toggle fields between mandatory (<span className="users-required-star">*</span>) and optional</p>
            <div className="users-settings-grid">
              <div className="users-settings-group">
                <h4>Add Folder</h4>
                <label className="users-settings-row"><span>Customer Name</span><input type="checkbox" checked={isFieldRequired("folder_customerName")} onChange={(e) => { const c = {...formConfig, folder_customerName: e.target.checked}; saveFormConfig(c); }} /></label>
                <label className="users-settings-row"><span>Venue</span><input type="checkbox" checked={isFieldRequired("folder_venue")} onChange={(e) => { const c = {...formConfig, folder_venue: e.target.checked}; saveFormConfig(c); }} /></label>
                <label className="users-settings-row"><span>Event Date</span><input type="checkbox" checked={isFieldRequired("folder_eventDate")} onChange={(e) => { const c = {...formConfig, folder_eventDate: e.target.checked}; saveFormConfig(c); }} /></label>
                <label className="users-settings-row"><span>Collected By</span><input type="checkbox" checked={isFieldRequired("folder_collectedBy")} onChange={(e) => { const c = {...formConfig, folder_collectedBy: e.target.checked}; saveFormConfig(c); }} /></label>
              </div>
              <div className="users-settings-group">
                <h4>Upload Image</h4>
                <label className="users-settings-row"><span>Design Name</span><input type="checkbox" checked={isFieldRequired("image_designName")} onChange={(e) => { const c = {...formConfig, image_designName: e.target.checked}; saveFormConfig(c); }} /></label>
                <label className="users-settings-row"><span>Decoration Type</span><input type="checkbox" checked={isFieldRequired("image_decorType")} onChange={(e) => { const c = {...formConfig, image_decorType: e.target.checked}; saveFormConfig(c); }} /></label>
                <label className="users-settings-row"><span>Venue</span><input type="checkbox" checked={isFieldRequired("image_venueName")} onChange={(e) => { const c = {...formConfig, image_venueName: e.target.checked}; saveFormConfig(c); }} /></label>
                <label className="users-settings-row"><span>Flower Type</span><input type="checkbox" checked={isFieldRequired("image_flowerType")} onChange={(e) => { const c = {...formConfig, image_flowerType: e.target.checked}; saveFormConfig(c); }} /></label>
                <label className="users-settings-row"><span>Colour</span><input type="checkbox" checked={isFieldRequired("image_colours")} onChange={(e) => { const c = {...formConfig, image_colours: e.target.checked}; saveFormConfig(c); }} /></label>
                <label className="users-settings-row"><span>Size</span><input type="checkbox" checked={isFieldRequired("image_size")} onChange={(e) => { const c = {...formConfig, image_size: e.target.checked}; saveFormConfig(c); }} /></label>
                <label className="users-settings-row"><span>Price Range</span><input type="checkbox" checked={isFieldRequired("image_price")} onChange={(e) => { const c = {...formConfig, image_price: e.target.checked}; saveFormConfig(c); }} /></label>
              </div>
            </div>
          </div>
        </section>

        <section className="users-section">
          <h2 className="users-section-title">Manage Dropdown Options</h2>
          <div className="users-card">
            <p className="users-hint">Add, edit, or remove options for dropdowns. Changes apply to all users.</p>

            <div className="users-settings-group">
              <h4>Event Type</h4>
              <div className="users-tag-list">
                {allEventTypes.map((t, i) => (
                  <span key={i} className="users-tag">
                    {editingEventTypeIdx === i ? (
                      <span className="users-tag-editing">
                        <input type="text" className="users-input-sm" value={editingTagValue}
                          onChange={(e) => setEditingTagValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { handleSaveEventTypeEdit(i, t); }
                            if (e.key === "Escape") { setEditingEventTypeIdx(null); setEditingTagValue(""); }
                          }}
                          autoFocus />
                        <button type="button" className="users-tag-save" onClick={() => handleSaveEventTypeEdit(i, t)}>✓</button>
                        <button type="button" className="users-tag-cancel" onClick={() => { setEditingEventTypeIdx(null); setEditingTagValue(""); }}>×</button>
                      </span>
                    ) : (
                      <>
                        {t}
                        <button type="button" className="users-tag-edit" onClick={() => { setEditingEventTypeIdx(i); setEditingTagValue(t); }} title="Edit">✎</button>
                        <button type="button" className="users-tag-remove" onClick={async () => {
                          const isBuiltIn = EVENT_TYPES.includes(t);
                          if (isBuiltIn) {
                            const newHidden = [...hiddenEventTypes, t];
                            setHiddenEventTypes(newHidden);
                            const newCustom = customEventTypes.filter(ct => ct !== t);
                            setCustomEventTypes(newCustom);
                            await ApiService.updateDropdownConfig(newCustom, customDecorTypes, newHidden, hiddenDecorTypes);
                          } else {
                            const updated = customEventTypes.filter(ct => ct !== t);
                            setCustomEventTypes(updated);
                            await ApiService.updateDropdownConfig(updated, customDecorTypes, hiddenEventTypes, hiddenDecorTypes);
                          }
                        }}>×</button>
                      </>
                    )}
                  </span>
                ))}
              </div>
              <div className="users-tag-add-row">
                <input type="text" className="users-input" placeholder="New event type..." value={newEventType}
                  onChange={(e) => setNewEventType(e.target.value)} />
                <button type="button" className="users-btn users-btn-primary users-btn-sm" disabled={!newEventType.trim()}
                  onClick={async () => {
                    const val = newEventType.trim();
                    if (!val || allEventTypes.includes(val)) return;
                    const updated = [...customEventTypes, val];
                    setCustomEventTypes(updated);
                    setNewEventType("");
                    await ApiService.updateDropdownConfig(updated, customDecorTypes, hiddenEventTypes, hiddenDecorTypes);
                  }}>Add</button>
              </div>
            </div>

            <div className="users-settings-group">
              <h4>Decoration Type</h4>
              <div className="users-tag-list">
                {allDecorTypes.map((t, i) => (
                  <span key={i} className="users-tag">
                    {editingDecorTypeIdx === i ? (
                      <span className="users-tag-editing">
                        <input type="text" className="users-input-sm" value={editingTagValue}
                          onChange={(e) => setEditingTagValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { handleSaveDecorTypeEdit(i, t); }
                            if (e.key === "Escape") { setEditingDecorTypeIdx(null); setEditingTagValue(""); }
                          }}
                          autoFocus />
                        <button type="button" className="users-tag-save" onClick={() => handleSaveDecorTypeEdit(i, t)}>✓</button>
                        <button type="button" className="users-tag-cancel" onClick={() => { setEditingEventTypeIdx(null); setEditingTagValue(""); }}>×</button>
                      </span>
                    ) : (
                      <>
                        {t}
                        <button type="button" className="users-tag-edit" onClick={() => { setEditingDecorTypeIdx(i); setEditingTagValue(t); }} title="Edit">✎</button>
                        <button type="button" className="users-tag-remove" onClick={async () => {
                          const isBuiltIn = DECOR_TYPES.includes(t);
                          if (isBuiltIn) {
                            const newHidden = [...hiddenDecorTypes, t];
                            setHiddenDecorTypes(newHidden);
                            const newCustom = customDecorTypes.filter(ct => ct !== t);
                            setCustomDecorTypes(newCustom);
                            await ApiService.updateDropdownConfig(customEventTypes, newCustom, hiddenEventTypes, newHidden);
                          } else {
                            const updated = customDecorTypes.filter(ct => ct !== t);
                            setCustomDecorTypes(updated);
                            await ApiService.updateDropdownConfig(customEventTypes, updated, hiddenEventTypes, hiddenDecorTypes);
                          }
                        }}>×</button>
                      </>
                    )}
                  </span>
                ))}
              </div>
              <div className="users-tag-add-row">
                <input type="text" className="users-input" placeholder="New decoration type..." value={newDecorType}
                  onChange={(e) => setNewDecorType(e.target.value)} />
                <button type="button" className="users-btn users-btn-primary users-btn-sm" disabled={!newDecorType.trim()}
                  onClick={async () => {
                    const val = newDecorType.trim();
                    if (!val || allDecorTypes.includes(val)) return;
                    const updated = [...customDecorTypes, val];
                    setCustomDecorTypes(updated);
                    setNewDecorType("");
                    await ApiService.updateDropdownConfig(customEventTypes, updated, hiddenEventTypes, hiddenDecorTypes);
                  }}>Add</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default UsersPage;
