const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 6 },
  image: { type: String, required: true },
  places: [{ type: mongoose.Types.ObjectId, required: true, ref: "Place" }],
});

//Put square brackets around the places object because there can be multiple places to 1 user. This does not apply to the place.js file when we do the object type, because you can't have multiple users to 1 place

userSchema.plugin(uniqueValidator);

//Name of model (whatever we want), then point to the created Schema
module.exports = mongoose.model("User", userSchema);
