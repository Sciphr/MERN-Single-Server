const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const placeSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: { type: String, required: true },
  image: { type: String, required: true },
  address: { type: String, require: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  creator: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
});

//Name of model (whatever we want), then point to the created Schema
module.exports = mongoose.model("Place", placeSchema);
