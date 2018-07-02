var mongoose = require("mongoose")
mongoose.connect("mongoDB://localhost/nba_moments")

var commentsSchema = new mongoose.Schema({
    author: String,
    text: String,
    createdAt: { type: Date, default: Date.now },
})

var Comment = mongoose.model("Comment", commentsSchema)

//Must export to return this model when file is required
module.exports = Comment