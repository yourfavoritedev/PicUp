var mongoose = require("mongoose")
var passportLocalMongoose = require("passport-local-mongoose")

var userSchema = new mongoose.Schema({
    username: String,
    email: {type: String, unique: true}, 
    password: String,
    avatar: {type: String, default: ""},
    isAdmin: {type: Boolean, default: false}
})

userSchema.plugin(passportLocalMongoose)

var User = mongoose.model("User", userSchema)

module.exports = User
