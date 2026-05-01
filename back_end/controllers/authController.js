const pool = require("../config/db");
const { comparePassword } = require("../utils/passwordHash");
const generateToken = require("../config/jwt");

const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Credentials required" });
  }

  const ownerResult = await pool.query(
    "SELECT owner_detail FROM master_table WHERE owner_detail->>'UserName'=$1",
    [username]
  );

  if (ownerResult.rows.length > 0) {
    const user = ownerResult.rows[0].owner_detail;
    const validPassword = await comparePassword(password, user.Password);

    if (!validPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken({
      username: user.UserName,
      role: user.Role,
      userId: user.OwnerUniqueId,
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
        displayName: user.UserName,
        role: user.Role,
      },
    });
    return;
  }

  const empResult = await pool.query(
    "SELECT employee_detail FROM master_table WHERE id = 1"
  );

  if (empResult.rows.length > 0) {
    const employees = empResult.rows[0].employee_detail;
    const employee = employees.find(emp => emp.employee_id === username || emp.employee_name === username);

    if (employee) {
      const validPassword = await comparePassword(password, employee.Password);

      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = generateToken({
        username: employee.employee_id,
        role: employee.role,
        userId: employee.employee_id,
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
          displayName: employee.employee_name,
          role: employee.role,
        },
      });
      return;
    }
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
