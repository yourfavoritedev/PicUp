var mongoose = require("mongoose")

mongoose.connect("mongoDB://localhost/nba_moments")

//Create schema, parameters/fields for moments
var highlightSchema = new mongoose.Schema({
    poster: String,
    player: String,
    image: String,
    desc: String,
    createdAt: { type: Date, default: Date.now },
    comments: [
        {
            type: mongoose.Schema.Types.ObjectId, //the id of the comment
            ref: "Comment" //referencing to our comment model
        }
    ]
})

//use Schema to create model so that we can add new moments
var Highlight = mongoose.model("Moment", highlightSchema)

//must export model to return this code when requiring it
module.exports = Highlight