const jwt = require("jsonwebtoken");

const HttpError = require("../models/http-error");

module.exports = (req, res, next) => {
  //Browsers by default, if the request isn't a 'GET', calls it 'OPTIONS'. So here we are simply allowing 'OPTIONS' to be used
  if (req.method === "OPTIONS") {
    return next();
  }

  try {
    const token = req.headers.authorization.split(" ")[1]; //Authorization: 'Bearer TOKEN'
    if (!token) {
      throw new Error("Authentication failed!");
    }
    //If this line fails, it throws an error so it will then skip the next line and go to the 'catch' block
    const decodedToken = jwt.verify(token, process.env.JWT_KEY);

    req.userData = { userId: decodedToken.userId };
    next();
  } catch (err) {
    const error = new HttpError("Authentication failed!", 403);
    return next(error);
  }
};
