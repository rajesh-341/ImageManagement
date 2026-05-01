const jwt = require("jsonwebtoken");

const generateToken = (user) => {
  return jwt.sign(
    {
      username: user.username,
      role: user.role,
      userId: user.userId || user.username,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

module.exports = generateToken;