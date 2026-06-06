import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, FlatList, TextInput,
  Modal, StyleSheet, Platform, Alert, ActivityIndicator,
} from "react-native";
import ApiService from "../services/apiService";

function UserModal({ visible, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ username: "", displayName: "", role: "", password: "" });

  useEffect(() => {
    if (visible) loadUsers();
  }, [visible]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await ApiService.getUsers();
      setUsers(list);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setEditingUser(null);
    setForm({ username: "", displayName: "", role: "", password: "" });
    setShowForm(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({ username: user.username || "", displayName: user.displayName || "", role: user.role || "", password: "" });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.username || !form.displayName || !form.role) {
      Alert.alert("Error", "Username, display name, and role are required");
      return;
    }
    if (!editingUser && !form.password) {
      Alert.alert("Error", "Password is required for new users");
      return;
    }
    setSaving(true);
    try {
      if (editingUser) {
        await ApiService.updateUser(editingUser.id, form);
      } else {
        await ApiService.createUser(form);
      }
      setShowForm(false);
      loadUsers();
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (user) => {
    Alert.alert("Delete User", `Delete user "${user.displayName || user.username}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          await ApiService.deleteUser(user.id);
          loadUsers();
        } catch (err) {
          Alert.alert("Error", err.message);
        }
      }},
    ]);
  };

  const roles = ["Captain", "ViceCaptain", "Owner", "Facilitator", "TeamLead", "TeamMember", "Marketing", "Admin", "Viewer"];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>User Management</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.close}>×</Text></TouchableOpacity>
        </View>
        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color="#ff6b8a" /></View>
        ) : showForm ? (
          <View style={styles.form}>
            <Text style={styles.label}>Username *</Text>
            <TextInput style={styles.input} value={form.username} onChangeText={t => setForm({...form, username: t})} placeholder="Username" autoCapitalize="none" />
            <Text style={styles.label}>Display Name *</Text>
            <TextInput style={styles.input} value={form.displayName} onChangeText={t => setForm({...form, displayName: t})} placeholder="Display name" />
            <Text style={styles.label}>Role *</Text>
            <View style={styles.roleRow}>
              {roles.map(r => (
                <TouchableOpacity key={r} style={[styles.roleChip, form.role === r && styles.roleChipActive]}
                  onPress={() => setForm({...form, role: r})}>
                  <Text style={[styles.roleChipText, form.role === r && styles.roleChipTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Password {editingUser ? "(leave blank to keep current)" : "*"}</Text>
            <TextInput style={styles.input} value={form.password} onChangeText={t => setForm({...form, password: t})} placeholder="Password" secureTextEntry />
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                <Text style={styles.saveText}>{saving ? "Saving..." : "Save"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <TouchableOpacity style={styles.addBtn} onPress={openNew}>
              <Text style={styles.addBtnText}>+ Add User</Text>
            </TouchableOpacity>
            <FlatList data={users} keyExtractor={u => u.id?.toString()}
              renderItem={({ item }) => (
                <View style={styles.userRow}>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.displayName || item.username}</Text>
                    <Text style={styles.userRole}>{item.role}</Text>
                  </View>
                  <View style={styles.userActions}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              contentContainerStyle={styles.list}
            />
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb",
  },
  title: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  close: { fontSize: 24, color: "#6b7280", paddingHorizontal: 8 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  addBtn: { margin: 16, padding: 14, borderRadius: 12, backgroundColor: "#ff6b8a", alignItems: "center" },
  addBtnText: { fontSize: 15, fontWeight: "600", color: "#fff" },
  list: { paddingHorizontal: 16 },
  userRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 14, backgroundColor: "#fff", borderRadius: 12, marginBottom: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  userInfo: {},
  userName: { fontSize: 15, fontWeight: "600", color: "#1a1a1a" },
  userRole: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  userActions: { flexDirection: "row", gap: 8 },
  editBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#f3f4f6" },
  editBtnText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  deleteBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#fef2f2" },
  deleteBtnText: { fontSize: 13, fontWeight: "600", color: "#ef4444" },
  form: { flex: 1, padding: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 10,
    padding: Platform.OS === "ios" ? 12 : 8, fontSize: 14, color: "#1a1a1a", backgroundColor: "#f9fafb",
  },
  roleRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  roleChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: "#f3f4f6", borderWidth: 1, borderColor: "#e5e7eb" },
  roleChipActive: { backgroundColor: "#ff6b8a", borderColor: "#ff6b8a" },
  roleChipText: { fontSize: 12, color: "#6b7280" },
  roleChipTextActive: { color: "#fff", fontWeight: "600" },
  btnRow: { flexDirection: "row", gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: "#f3f4f6", alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "600", color: "#6b7280" },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: "#ff6b8a", alignItems: "center" },
  saveText: { fontSize: 15, fontWeight: "600", color: "#fff" },
});

export default UserModal;