require("dotenv").config();
process.env.JWT_SECRET
process.env.PORT

const app = require("./app");
const runMigrations = require("./migrations");

const PORT = process.env.PORT || 5000;

runMigrations().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
