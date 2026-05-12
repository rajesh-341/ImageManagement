const pool = require("../config/db");
const { comparePassword } = require("../utils/passwordHash");
const generateToken = require("../config/jwt");

const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Credentials required" });
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
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken({
      username: empDetails.employee_name,
      role: empDetails.role,
      userId: emp.employee_id,
    });

    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
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

  res.status(401).json({ message: "Invalid credentials" });
};

const logout = (req, res) => {
  res.clearCookie("auth_token");
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
