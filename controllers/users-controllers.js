const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const HttpError = require("../models/http-error");
const User = require("../models/user");

// const DUMMY_USERS = [
//   {
//     id: "u1",
//     name: "Jacob Berry",
//     email: "jacob@berrywebdesign.com",
//     password: "testers",
//   },
// ];

//Just used to get a list of all users
// const getUsers = (req, res, next) => {
//   res.json({ users: DUMMY_USERS });
// };
const getUsers = async (req, res, next) => {
  //This finds all users info, NOT including the 'password' field
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (err) {
    const error = new HttpError("Fetching users failed. Please try again", 500);
    return next(error);
  }
  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

//Used to create a new user (or, signup). When the user inputs their name/email/password, we grab that data using the 'req' variable object, and destructure each input into their own separate variables (name, email, password). Then we create a new user as an object using a uuid created ID. Then we add that user into the list of users (which we are using a static DUMMY_USERS just for now) and then 'res' (respond) by pushing that info into a new 'user' object which is being sent to a database
//A check is run to ensure the email has not already been used
const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid signup info. Please check your data.", 422)
    );
  }

  const { name, email, password } = req.body;

  // const hasUser = DUMMY_USERS.find((u) => u.email === email);
  // //Code 422 is usually meant for input error
  // if (hasUser) {
  //   throw new HttpError("Could not create user. Email already exists.", 422);
  // }

  //Here we are doing an async task to see if the user exists already. This error catch is just in case there is an issue 'trying' or 'attempting' to look through the database of users. Then we move to the IF statement and check if we ended up finding an existing user. If we did, we pass a different error
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      "Signing up failed, please try again later.",
      500
    );
    return next(error);
  }

  if (existingUser) {
    const error = new HttpError(
      "User exists already, please login instead.",
      422
    );
    return next(error);
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError(
      "Could not creatre user, please try again.",
      500
    );
    return next(error);
  }

  const createdUser = new User({
    name,
    email,
    image: req.file.path,
    password: hashedPassword,
    places: [],
  });

  // DUMMY_USERS.push(createdUser);
  try {
    //mongoose method
    console.log(createdUser);
    await createdUser.save();
  } catch (err) {
    const error = new HttpError("Signup failed, please try again.", 500);
    return next(error);
  }

  let token;
  try {
    //.id is auto created by mongoose
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    const error = new HttpError("Signup failed, please try again.", 500);
    return next(error);
  }

  res
    .status(201)
    .json({ userId: createdUser.id, email: createdUser.email, token: token });
};

//This is to login as a user into the website. First we grab the email/password info using the 'req' object variable. We destructure that into their own variables. Then we search the list of users (currently DUMMY_USERS) to see if there is a match of an email address; this is stored as an object assuming there is an email match. Then we do an IF check to see if either: there is no identified user (in which case it would be null/undefined) or if we found a user but the password field does not match. If not, we throw an error, linking to our HttpError model by inputting an error message and code. If we pass that 'if' check, for now we simply respond with a 'logged in' message.
const login = async (req, res, next) => {
  const { email, password } = req.body;

  // const identifiedUser = DUMMY_USERS.find((u) => u.email === email);
  // if (!identifiedUser || identifiedUser.password !== password) {
  //   throw new HttpError(
  //     "Could not identify user, credentials seem to be wrong.",
  //     401
  //   );
  // }

  //This block attemps to find the user and throws an error IF the PROCESS of finding a user fails
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      "Logging in failed, please try again later.",
      500
    );
    return next(error);
  }

  //This block will throw an error if the user already exists
  if (!existingUser) {
    const error = new HttpError(
      "Invalid credentials. Could not log you in.",
      401
    );
    return next(error);
  }

  //This block will attempt to compare the passwords, and throw an error if the PROCESS of this fails
  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    const error = new HttpError("Could not log you in, please try again.", 500);
    return next(error);
  }

  //This will throw an error only if the password is actually incorrect
  if (!isValidPassword) {
    const error = new HttpError(
      "Invalid credentials. Could not log you in.",
      403
    );
    return next(error);
  }

  let token;
  try {
    //.id is auto created by mongoose
    token = jwt.sign(
      { userId: existingUser.id, email: existingUser.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    const error = new HttpError("Login failed, please try again.", 500);
    return next(error);
  }

  res.json({
    userId: existingUser.id,
    email: existingUser.email,
    token: token,
  });
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
