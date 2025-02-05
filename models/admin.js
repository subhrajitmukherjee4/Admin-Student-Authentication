const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");
const adminSchema = new mongoose.Schema({
   username: String,
   password: String,
   role: { type: String, default: 'admin' },
});
adminSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model("Admin", adminSchema);
