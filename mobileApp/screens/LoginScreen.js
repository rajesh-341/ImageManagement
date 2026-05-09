import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import ApiService from "../services/apiService";

function LoginScreen({ navigation }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!username || !password) {
      setError("Please enter username and password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await ApiService.login(username, password);

      navigation.replace("Home");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Illustration Section */}
        <View style={styles.illustrationPanel}>
          {/* Curved Background */}
          <View style={styles.curvedBg} />

          {/* Brand Logo */}
          <View style={styles.brand}>
            <View style={styles.brandIcon}>
              <Text style={styles.brandIconText}>PV</Text>
            </View>
            <View style={styles.brandText}>
              <Text style={styles.brandName}>PV</Text>
              <Text style={styles.brandTagline}>Event Management</Text>
            </View>
          </View>

          {/* Illustration Content */}
          <View style={styles.illustrationContent}>
            {/* Decorative Stars */}
            <Text style={[styles.star, { top: 20, left: 40 }]}>✦</Text>
            <Text style={[styles.star, { top: 35, right: 50 }]}>✦</Text>
            <Text style={[styles.star, { bottom: 80, left: 30 }]}>✦</Text>
            <Text style={[styles.star, { top: 60, right: 30 }]}>✦</Text>

            {/* People */}
            <View style={styles.people}>
              <View style={styles.person}>
                <View style={[styles.personHead, { backgroundColor: "rgba(255,255,255,0.9)" }]} />
                <View style={[styles.personBody, { backgroundColor: "rgba(173,216,230,0.9)" }]} />
              </View>
              <View style={styles.person}>
                <View style={[styles.personHead, { backgroundColor: "rgba(255,255,255,0.9)" }]} />
                <View style={[styles.personBody, { backgroundColor: "rgba(255,218,185,0.9)" }]} />
              </View>
              <View style={styles.person}>
                <View style={[styles.personHead, { backgroundColor: "rgba(255,255,255,0.9)" }]} />
                <View style={[styles.personBody, { backgroundColor: "rgba(152,251,152,0.9)" }]} />
              </View>
              <View style={styles.person}>
                <View style={[styles.personHead, { backgroundColor: "rgba(255,255,255,0.9)" }]} />
                <View style={[styles.personBody, { backgroundColor: "rgba(221,160,221,0.9)" }]} />
              </View>
            </View>

            {/* Table */}
            <View style={styles.tableShape} />
            <View style={styles.tableLegs}>
              <View style={styles.tableLeg} />
              <View style={styles.tableLeg} />
            </View>

            {/* Cake */}
            <View style={styles.cake}>
              <View style={styles.cakeBase}>
                <View style={styles.candle} />
              </View>
              <View style={styles.cakeLayer} />
            </View>

            {/* Gift Boxes */}
            <View style={styles.gifts}>
              <View style={[styles.gift, { backgroundColor: "#87ceeb" }]} />
              <View style={[styles.gift, { backgroundColor: "#dda0dd" }]} />
              <View style={[styles.gift, { backgroundColor: "#98fb98" }]} />
            </View>
          </View>
        </View>

        {/* Login Form Section */}
        <View style={styles.formPanel}>
          <View style={styles.formContainer}>
            {/* Header */}
            <View style={styles.formHeader}>
              <Text style={styles.title}>Login</Text>
              <Text style={styles.subtitle}>
                Don't have an account?{" "}
                <Text style={styles.createAccountLink}>Create your account</Text>
              </Text>
            </View>

            {/* Form Fields */}
            <View style={styles.formFields}>
              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            </View>

            {/* Options Row */}
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.rememberMe}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.rememberMeText}>Remember Me</Text>
              </TouchableOpacity>
              <TouchableOpacity>
                <Text style={styles.forgotPassword}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Error Message */}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>

            {/* Social Login */}
            <View style={styles.socialLogin}>
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Or Login with</Text>
                <View style={styles.dividerLine} />
              </View>
              <View style={styles.socialButtons}>
                {/* Instagram */}
                <TouchableOpacity style={styles.socialButton} activeOpacity={0.7}>
                  <Text style={styles.socialIcon}>📷</Text>
                </TouchableOpacity>
                {/* Google/Chrome */}
                <TouchableOpacity style={styles.socialButton} activeOpacity={0.7}>
                  <View style={styles.googleIcon}>
                    <View style={styles.googleIconBlue} />
                    <View style={styles.googleIconRed} />
                    <View style={styles.googleIconYellow} />
                    <View style={styles.googleIconGreen} />
                    <View style={styles.googleIconCenter} />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f0f0",
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Illustration Panel
  illustrationPanel: {
    height: 280,
    backgroundColor: "#ff6b8a",
    position: "relative",
    overflow: "hidden",
  },
  curvedBg: {
    position: "absolute",
    top: -60,
    left: -20,
    right: -20,
    height: 340,
    backgroundColor: "#ff7b96",
    borderRadius: "0 0 40% 40%",
  },

  // Brand
  brand: {
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
    top: 20,
    left: 20,
    zIndex: 10,
    gap: 10,
  },
  brandIcon: {
    width: 36,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  brandIconText: {
    fontWeight: "700",
    fontSize: 16,
    color: "#ff6b8a",
  },
  brandText: {
    gap: 2,
  },
  brandName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  brandTagline: {
    fontSize: 10,
    color: "rgba(255,255,255,0.85)",
  },

  // Illustration Content
  illustrationContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  star: {
    position: "absolute",
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
  },

  // People
  people: {
    flexDirection: "row",
    justifyContent: "space-around",
    position: "absolute",
    bottom: 70,
    left: 30,
    right: 30,
  },
  person: {
    alignItems: "center",
  },
  personHead: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  personBody: {
    width: 26,
    height: 34,
    borderRadius: 6,
    marginTop: -3,
  },

  // Table
  tableShape: {
    position: "absolute",
    bottom: 50,
    width: 140,
    height: 12,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 6,
  },
  tableLegs: {
    flexDirection: "row",
    justifyContent: "space-between",
    position: "absolute",
    bottom: 20,
    width: 120,
  },
  tableLeg: {
    width: 6,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 3,
  },

  // Cake
  cake: {
    position: "absolute",
    bottom: 62,
    alignItems: "center",
  },
  cakeBase: {
    width: 48,
    height: 24,
    backgroundColor: "#ffe4e1",
    borderRadius: 6,
    position: "relative",
  },
  candle: {
    position: "absolute",
    top: -10,
    alignSelf: "center",
    width: 6,
    height: 12,
    backgroundColor: "#ffd700",
    borderRadius: 3,
  },
  cakeLayer: {
    width: 56,
    height: 16,
    backgroundColor: "#ffb6c1",
    borderRadius: 5,
    marginTop: -2,
  },

  // Gifts
  gifts: {
    flexDirection: "row",
    justifyContent: "space-between",
    position: "absolute",
    bottom: 25,
    left: 20,
    right: 20,
  },
  gift: {
    width: 28,
    height: 24,
    borderRadius: 4,
  },

  // Form Panel
  formPanel: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  formContainer: {
    width: "100%",
  },

  // Form Header
  formHeader: {
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: "#6b7280",
  },
  createAccountLink: {
    color: "#ff6b8a",
    fontWeight: "500",
  },

  // Form Fields
  formFields: {
    gap: 16,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 0,
  },
  input: {
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#1a1a1a",
    backgroundColor: "#fff",
  },

  // Options Row
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  rememberMe: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderColor: "#d1d5db",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#ff6b8a",
    borderColor: "#ff6b8a",
  },
  checkmark: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  rememberMeText: {
    fontSize: 13,
    color: "#6b7280",
  },
  forgotPassword: {
    fontSize: 13,
    color: "#ff6b8a",
    fontWeight: "500",
  },

  // Error
  error: {
    color: "#ef4444",
    fontSize: 13,
    backgroundColor: "rgba(239,68,68,0.08)",
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },

  // Login Button
  loginButton: {
    backgroundColor: "#ff6b8a",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#ff6b8a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // Social Login
  socialLogin: {
    alignItems: "center",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e5e7eb",
  },
  dividerText: {
    fontSize: 13,
    color: "#9ca3af",
  },
  socialButtons: {
    flexDirection: "row",
    gap: 16,
  },
  socialButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  socialIcon: {
    fontSize: 22,
  },
  googleIcon: {
    width: 24,
    height: 24,
    position: "relative",
  },
  googleIconBlue: {
    position: "absolute",
    top: 0,
    left: 10,
    width: 8,
    height: 10,
    backgroundColor: "#4285F4",
    borderRadius: 2,
  },
  googleIconRed: {
    position: "absolute",
    top: 6,
    right: 0,
    width: 10,
    height: 8,
    backgroundColor: "#EA4335",
    borderRadius: 2,
  },
  googleIconYellow: {
    position: "absolute",
    bottom: 2,
    left: 8,
    width: 10,
    height: 8,
    backgroundColor: "#FBBC05",
    borderRadius: 2,
  },
  googleIconGreen: {
    position: "absolute",
    top: 6,
    left: 0,
    width: 10,
    height: 8,
    backgroundColor: "#34A853",
    borderRadius: 2,
  },
  googleIconCenter: {
    position: "absolute",
    top: 7,
    left: 7,
    width: 10,
    height: 10,
    backgroundColor: "#fff",
    borderRadius: 5,
  },
});

export default LoginScreen;
