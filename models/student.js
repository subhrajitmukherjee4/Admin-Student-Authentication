const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const StudentSchema = new mongoose.Schema({
  username:{ type: String},
  name: { type: String},
  email: { type: String},
  isActive: { type: Boolean, default: true },
  password: { type: String},
  role: { type: String, default: 'user' },
});

// Add passport-local-mongoose plugin
StudentSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("Student", StudentSchema);

