const express = require("express");
const { check } = require("express-validator");

//Importing from the 'places-controllers.js' file.
const usersControllers = require("../controllers/users-controllers");

const fileUpload = require("../middleware/file-upload");

const router = express.Router();

router.get("/", usersControllers.getUsers);

router.post(
  "/signup",
  //'image' is a name we can create ourselves. It's the 'key' word that will be expected when frontend connects to the backend for the file upload
  fileUpload.single("image"),
  [
    check("name").not().isEmpty(),
    check("email").normalizeEmail().isEmail(),
    check("password").isLength({ min: 6 }),
  ],
  usersControllers.signup
);

router.post("/login", usersControllers.login);

//syntax for exporting
module.exports = router;
