const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

//import syntax
const placesRoutes = require("./routes/places-routes");
const usersRoutes = require("./routes/users-routes");
const HttpError = require("./models/http-error");

const app = express();

app.use(bodyParser.json());

app.use("/uploads/images", express.static(path.join("uploads", "images")));

//This is just to get rid of CORS errors when setting up a React app that runs on a different server than your backend
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-Width, Content-Type, Accept, Authorization"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");
  next();
});

app.use("/api/places", placesRoutes); //now it will only run if the URL starts with '/api/places'
app.use("/api/users", usersRoutes); //now it will only run if the URL starts with '/api/users'

app.use((req, res, next) => {
  const error = new HttpError("Could not find this route.", 404);
  throw error;
});

//Express knows to handle this type of middleware function as an error function, if you have 4 arguments
app.use((error, req, res, next) => {
  if (req.file) {
    //unlink = delete
    //.path is added from multer
    fs.unlink(req.file.path, (err) => {
      console.log(err);
    });
  }
  //If a response has already been sent
  if (res.headerSent) {
    return next(error);
  }

  //If there is no error code, set the code property of 'error' as 500
  res.status(error.code || 500);

  //Replace error message with a default one ONLY if there is no message property in the error in the first place
  res.json({ message: error.message || "An unknown error occurred!" });
});

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.n1sktgs.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`
  )
  .then(() => {
    //changed from just 5000 which was used purely for localhost
    app.listen(process.env.PORT || 5000);
  })
  .catch((err) => {
    console.log(err);
  });
