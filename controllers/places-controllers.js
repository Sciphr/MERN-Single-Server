const { validationResult } = require("express-validator");
const fs = require("fs");

// Importing a model for error codes
const HttpError = require("../models/http-error");
const getCoordsForAddress = require("../util/location");
const Place = require("../models/place");
const User = require("../models/user");
const { default: mongoose } = require("mongoose");

// let DUMMY_PLACES = [
//   {
//     id: "p1",
//     title: "Empire State Building",
//     description: "One of the most famous buildings in the world",
//     location: {
//       lat: 40.7484474,
//       lng: -73.9871516,
//     },
//     address: "20 W 34th St, New York, NY 10001",
//     creator: "u1",
//   },
// ];

const getPlaceById = async (req, res, next) => {
  //This is getting the URL at the 'pid' spot (so after api/places/). In dummy example, we want p1
  const placeId = req.params.pid; //{pid: 'p1'}

  let place;

  // //This is setting 'place' as true ONLY if we find an ID that matches the 'placeId' from above. In this case, if we find an ID in the DUMMY_PLACES array that matches p1. Which we do
  // const place = DUMMY_PLACES.find((p) => {
  //   return p.id === placeId;
  // });

  try {
    //findById is a mongoose method. Place is the name of the 'model' from 'place.js'
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong. Could not find a place.",
      500
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError(
      "Could not find a place for the provided id.",
      404
    );
    return next(error);
  }
  res.json({ place: place.toObject({ getters: true }) }); // => {place} => {place: place}
};

//This one is the same as above, but instead we are looking for a userId. In this example with only 1 set of data, we are hoping for a match with 'u1' as the 'creator'
const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  let places;

  try {
    //find() is from mongoose
    places = await Place.find({ creator: userId });
  } catch (err) {
    const error = new HttpError(
      "Fetching places failed, please try again later",
      500
    );
    return next(error);
  }

  if (!places || places.length === 0) {
    return next(
      new HttpError("Could not find places for the provided user id.", 404)
    );
  }

  // getters removes the '_' from the ID field which is automatically created
  res.json({
    places: places.map((place) => place.toObject({ getters: true })),
  });
};

const createPlace = async (req, res, next) => {
  //Import at the top for the 'validationResult' method of the 'express-validation' package
  //the method will take the request (req), which means all the data the user passes to create a place. We are putting all the errors from that method into 'errors'. We check if there are no errors in 'errors'. If it is NOT empty, we throw an HttpError
  const errors = validationResult(req);

  //Making overall function async, which means we have to use 'next' instead of 'throw'. This is just how express works vs javascript/React
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed. Please check your data.", 422)
    );
  }

  // const title = req.body.title; etc for each property
  const { title, description, address } = req.body;


  let coordinates;
  try {
    coordinates = await getCoordsForAddress(address);
  } catch (error) {
    return next(error);
  }


  const createdPlace = new Place({
    title,
    description,
    address,
    location: coordinates,
    image: req.file.path,
    creator: req.userData.userId,
  });

  let user;

  //This is to try and find the ID of the user being passed. The error in this block ONLY represents if the communication to the server fails
  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    const error = new HttpError(
      "Creating place failed. Please try again!",
      500
    );
    return next(error);
  }

  //This is the error IF the above block was unable to find an ID associated with the one passed here
  if (!user) {
    const error = new HttpError("Could not find user for provider ID", 404);
    return next(error);
  }

  console.log(user);

  //This is a way to make sure all actions to save the place are done at once and will only go through if they all succeed. This is called using 'sessions'
  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess });
    user.places.push(createdPlace);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Creating place failed, please try again.",
      500
    );
    return next(error);
  }

  // DUMMY_PLACES.push(createdPlace); //'push' will add as the last element in the array. I could use 'unshift' to put it in the front of the array

  res.status(201).json({ place: createdPlace }); //201 is normal status code for something done successfully
};

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed. Please check your data.", 422)
    );
  }

  const { title, description } = req.body;

  //the ID we are getting, is being taken from the URL as that is how we are naming the URL of each individual user and place. In 'places-routes', we name the dynamic part 'pid' therefore that is how we extract it here.
  const placeId = req.params.pid;

  // //We are finding the 'place' in the array of places, by using the ID taken from the URL. Then we get the index of that 'place' in the array
  // const updatedPlace = { ...DUMMY_PLACES.find((p) => p.id === placeId) };
  // const placeIndex = DUMMY_PLACES.findIndex((p) => p.id === placeId);

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update place.",
      500
    );
    return next(error);
  }

  if (place.creator.toString() !== req.userData.userId) {
    const error = new HttpError(
      "You are not authorized to edit this place :(",
      401
    );
    return next(error);
  }

  //Once we have that info (in the form of an object, as the array is an array of objects), and it is stored in this 'updatedPlace' variable, we update the object with the UPDATED info from the user
  place.title = title;
  place.description = description;

  // //Finally, we use this new info and replace the old object with the new object 'updatedPlace'
  // DUMMY_PLACES[placeIndex] = updatedPlace;
  try {
    await place.save();
  } catch (err) {
    const error = new HttpError("Unable to update place", 500);
    return next(error);
  }

  //code 200 is used for adding/updating.
  res.status(200).json({ place: place.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;

  // if (!DUMMY_PLACES.find((p) => p.id === placeId)) {
  //   throw new HttpError("could not find a place for that ID.", 404);
  // }

  let place;

  //Here we look up the place by the ID given here, along with the information on the associated UserID or 'creator'.
  try {
    place = await Place.findById(placeId).populate("creator", "-password");
  } catch (err) {
    const error = new HttpError(
      "Something went wrong. Could not delete place.",
      500
    );
    return next(error);
  }

  //Exit out if no place was found
  if (!place) {
    const error = new HttpError("No place was found for this ID!", 404);
    return next(error);
  }

  if (place.creator.id !== req.userData.userId) {
    const error = new HttpError(
      "You are not authorized to delete this place :(",
      401
    );
    return next(error);
  }

  const imagePath = place.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.remove({ session: sess });
    place.creator.places.pull(place);
    await place.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError("Could not delete place. Try again later", 500);
    return next(error);
  }

  fs.unlink(imagePath, (err) => {
    console.log(err);
  });

  //the 'filter' method will remove all objects in an array that do NOT meet the requirements of the function. Example here: we are comparing each ID of each object with the 'placeId'. Only if they are NOT equal, does it remove that corresponding object
  // DUMMY_PLACES = DUMMY_PLACES.filter((p) => p.id !== placeId);
  res.status(200).json({ message: "Deleted place." });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;

//This is for one export
//module.exports
