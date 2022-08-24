//This import gets all methods from the 'express' package. I could have also done: const {Router} = require('express') since the Router method is the only one I am using in this application
const express = require("express");

//This import is specifically getting the 'check' method from the 'express-validator' package
const { check } = require("express-validator");

//Importing from the 'places-controllers.js' file.
const placesControllers = require("../controllers/places-controllers");
const fileUpload = require("../middleware/file-upload");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.get("/:pid", placesControllers.getPlaceById);

router.get("/user/:uid", placesControllers.getPlacesByUserId);

//These middlewares are checked in sequence. So the above 2 middlewares go first and we won't authenticate those because we are okay with no token being needed to 'GET' data. But now we want to authenticate with a token before any 'POST' requests are made
router.use(checkAuth);

//using the 'express-validator' package, I can put multiple 'checks' in the middleware. Example, I am able to check the 'title' of a place a user is trying to create, and I am checking if it is NOT empty. The check will fail if any of my requirements aren't met
//******Error handling must be done where the controller is created. Therefore, go to: 'places-controllers.js' */
router.post(
  "/",
  fileUpload.single("image"),
  [
    check("title").not().isEmpty(),
    check("description").isLength({ min: 5 }),
    check("address").not().isEmpty(),
  ],
  placesControllers.createPlace
);

router.patch(
  "/:pid",
  [check("title").not().isEmpty(), check("description").isLength({ min: 5 })],
  placesControllers.updatePlace
);

router.delete("/:pid", placesControllers.deletePlace);

//syntax for exporting
module.exports = router;
