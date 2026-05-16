const pool = require("../config/db");
const { comparePassword } = require("../utils/passwordHash");
const generateToken = require("../config/jwt");

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 10;
const attempts = new Map();

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Credentials required" });
    }

    const now = Date.now();
    const record = attempts.get(username);

    if (record) {
      if (record.count >= MAX_ATTEMPTS) {
        const elapsed = now - record.lockedAt;
        const remaining = Math.ceil((LOCKOUT_MINUTES * 60 * 1000 - elapsed) / 1000);
        if (remaining > 0) {
          const mins = Math.ceil(remaining / 60);
          return res.status(429).json({ message: `Too many failed attempts. Try again in ${mins} minute(s).` });
        }
        attempts.delete(username);
      }
    }

    const empResult = await pool.query(
      "SELECT * FROM employee_details WHERE employee_id = $1",
      [username]
    );

  if (empResult.rows.length > 0) {
    const emp = empResult.rows[0];
    const empDetails = typeof emp.employee_details === "string"
      ? JSON.parse(emp.employee_details)
      : emp.employee_details;
    const validPassword = await comparePassword(password, empDetails.Password);

    if (!validPassword) {
      const rec = attempts.get(username) || { count: 0, lockedAt: now };
      rec.count += 1;
      rec.lockedAt = now;
      attempts.set(username, rec);
      const remaining = MAX_ATTEMPTS - rec.count;
      return res.status(401).json({ message: remaining > 0 ? `Invalid credentials. ${remaining} attempt(s) remaining.` : "Account locked. Try again later." });
    }

    attempts.delete(username);

    const token = generateToken({
      username: empDetails.employee_name,
      role: empDetails.role,
      userId: emp.employee_id,
    });

    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.json({
      success: true,
      user: {
        displayName: empDetails.employee_name,
        role: empDetails.role,
      },
    });
    return;
  }

  const rec = attempts.get(username) || { count: 0, lockedAt: now };
  rec.count += 1;
  rec.lockedAt = now;
  attempts.set(username, rec);

  res.status(401).json({ message: "Invalid credentials" });
  } catch (error) {
    console.error("[Login] Error:", error.message);
    res.status(500).json({ message: error.message || "Login failed" });
  }
};

const logout = (req, res) => {
  const isProduction = process.env.NODE_ENV === "production";
  res.clearCookie("auth_token", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  });
  res.json({ success: true });
};

const me = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  res.json({
    user: {
      displayName: req.user.username,
      role: req.user.role,
    },
  });
};

module.exports = { login, logout, me };
