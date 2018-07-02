//require packages to use their methods
var express = require("express") //for routing
var app = express(); //use nickname so you don't have to write express all the time
var bodyParser = require("body-parser") //needed for post routes, used to relay info from form inputs
var mongoose = require("mongoose") //use to interact with db
var Highlight = require("./models/highlights.js") //require database model
var Comment = require("./models/comments.js") //require comment model
var methodOverride = require("method-override") //use to hack post requests and make them something else
var expressSession = require("express-session") //use to create custom sessions
var passport = require("passport") //use for user authentication
var LocalStrategy = require("passport-local") //use for creating a local strategy for authentication
var User = require("./models/user.js") //require user model
var flash = require("connect-flash") //use to display flash messages upon redirect
var aSync = require("async")
var nodeMailer = require("nodemailer")
app.locals.moment = require("moment") //use for time elapsed functions
var crypto = require("crypto")
var notAUser = true

//connect to mongo database
// mongoose.connect("mongodb://localhost/nba_moments")
mongoose.connect("mongodb://Chris:ucirul3s@ds123971.mlab.com:23971/nba_moments")

//tells express to find assets(css, images, etc) in public folder
app.use(express.static("public"))

//tells bodyParser to relay items to post route
app.use(bodyParser.urlencoded({extended: true}))

//lets us modify our post requests
app.use(methodOverride("_method"))

//enables flash package
app.use(flash())



//config authentication

//generates unique sessions for a user whenever the site is rendered. but does not retain any day, thats why we need passport
app.use(expressSession({
    secret: "Magic is the greatest player ever",
    resave: false,
    saveUninitialized: false
}))

app.use(passport.initialize()) //enables authenication with passport
app.use(passport.session()) //creates a session that's unique to the user
passport.use(new LocalStrategy(User.authenticate())) //will use local strategy as method to authenticate
passport.serializeUser(User.serializeUser()) //get information from a user object and store it in the session
passport.deserializeUser(User.deserializeUser()) //retirve information from a session and store it back into a user object


//call this function on every route to check if there is a currentUser
app.use(function(req, res, next){
    res.locals.currentUser = req.user
    res.locals.error = req.flash("error")
    res.locals.success = req.flash("success")
    next()
})


//HOME ROUTE
app.get("/", function(req, res){
    Highlight.find({}, function(error, allHighlights){
        var latestHighlight = allHighlights.slice(-1)
        if(error){
            req.flash("error", "Sorry, we could not take you to the homepage at this time. Please try again later.")
            res.redirect("back")
        } else{
            res.render("home.ejs", {highlight: latestHighlight})
        }
    })
})

//INDEX ROUTE
app.get("/highlights", function(req, res){
    //enable pagenation
    var perPage = 9;
    var pageQuery = parseInt(req.query.page);
    var pageNumber = pageQuery ? pageQuery: 1;
    var query = req.query.search
    //find items that match our user's query
    if(query){
        escapeRegex(query)
        var regex = new RegExp(escapeRegex(req.query.search), "gi");
        Highlight.find({player: regex}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function(error, allHighlights){
            Highlight.count().exec(function(error, count){
                if(error){
                    req.flash("error", "Sorry, we could not display moments at this time. Please try again later.")
                    res.redirect("back")
                } else{
                    //if no error, render page with all moments fom database
                    res.render("highlights.ejs", {highlights: allHighlights, query: query, current: pageNumber, pages: Math.ceil( count / perPage)})
                }
            })
        })
    //find all moments from our database    
    } else{
        Highlight.find({}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function(error, allHighlights){
            Highlight.count().exec(function(error, count){
                if(error){
                    req.flash("error", "Sorry, we could not display moments at this time. Please try again later.")
                    res.redirect("back")
                } else{
                    //if no error, render page with all moments fom database
                    res.render("highlights.ejs", {highlights: allHighlights, query: query, current: pageNumber, pages: Math.ceil( count / perPage)})
                }
            })
        })
    }
})

//NEW ROUTE
app.get("/highlights/new", isLoggedIn, function(req, res){
    res.render("newHighlight.ejs")
})


//CREATE ROUTE
app.post("/highlights", function(req, res){
    var poster = req.body.poster
    var player = req.body.name;
    var image = req.body.image;
    var desc = req.body.desc;
    //use inputs stored in above variables to create a new object
    var newHighlight = {poster: poster, player: player, image: image, desc: desc};
    //using our model, add that new object into the database
    Highlight.create(newHighlight, function(error, newlyCreated){
        if(error){
            req.flash("error", "Sorry, we could not create your moment at this time. Please try again later.")
            res.redirect("back")
        } else{
            //if there is no error, then redirect them to the index route
            req.flash("success", "Your moment has been created.")
            res.redirect("/highlights");     
        }
    });
})



//SHOW ROUTE
app.get("/highlights/:id", function(req, res){
    req.params.id
    Highlight.findById(req.params.id).populate("comments").exec(function(error, foundHighlight){
        if(error || !foundHighlight){
            req.flash("error", "That moment does not exist.")
            res.redirect("back")
        } else{
            res.render("show.ejs", {highlight: foundHighlight, notAUser: notAUser})
        }
    })
})


//EDIT ROUTE
app.get("/highlights/:id/edit", checkMomentOwnership, function(req, res){
    req.params.id
    Highlight.findById(req.params.id, function(error, foundHighlight){
        if(error){
            req.flash("error", "Sorry, we cannot edit this moment right now. Please try again later.")
            res.redirect("back")
        } else{
            res.render("edit.ejs", {highlight: foundHighlight})
        }
    })
})


//UPDATE ROUTE
app.put("/highlights/:id", checkMomentOwnership, function(req, res){
    req.params.id
    var player = req.body.name
    var image = req.body.image
    var desc = req.body.desc
    var updates = {player: player, image: image, desc: desc}
    Highlight.findByIdAndUpdate(req.params.id, updates, function(error, updatedHighlight){
        if(error){
            req.flash("error", "Sorry, we cannot update your moment at this time. Please try again later.")
            res.redirect("back")
        } else{
            req.flash("success", "Success. You have updated your moment.")
            res.redirect("/highlights/" + req.params.id)
        }
    })
})

//DESTROY ROUTE
app.delete("/highlights/:id", checkMomentOwnership, function(req, res){
    req.params.id
    Highlight.findByIdAndDelete(req.params.id, function(error){
        if(error){
            req.flash("error", "Sorry, we cannot delete your moment at this time.")
            res.redirect("back")
        } else{
            req.flash("success", "Success. You have deleted your moment.")
            res.redirect("/highlights")
        }
    })
})




//--Comments Route

//New Route
app.get("/highlights/:id/comments/new", isLoggedIn, function(req, res){
    req.params.id
    Highlight.findById(req.params.id, function(error, foundHighlight){
        if(error || !foundHighlight){
            req.flash("error", "That moment does not exist")
            res.redirect("back")
        } else{
            res.render("newComment.ejs", {highlight: foundHighlight})
        }
    })
})


//Create route
app.post("/highlights/:id/comments", function(req, res){
    req.params.id
    var author = req.body.author;
    var text = req.body.text;
    var newComment = {author: author, text: text}
    Highlight.findById(req.params.id, function(error, foundHighlight){
        if(error){
            req.flash("error", "Sorry we cannot find this moment. Please try again later.")
            res.redirect("back")
        } else{
            Comment.create(newComment, function(error, createdComment){
                if(error){
                    req.flash("error", "Sorry we cannot create your comment at this time. Please try again later.")
                    res.redirect("back")
                } else{
                    foundHighlight.comments.push(createdComment)
                    foundHighlight.save()
                    req.flash("success", "Success. You have created a new comment.")
                    res.redirect("/highlights/" + req.params.id)
                }
            })
        }
    })
})


//Edit Route
app.get("/comments/:id/edit", checkCommentOwnership, function(req, res){
    req.params.id //comment id
    var highlightId = req.query.highlightId //use query to extract input from get routes
    Highlight.findById(highlightId, function(error, foundHighlight){
        if(error || !foundHighlight){
            req.flash("error", "This moment does not exist.")
            res.redirect("back")
        } else{
            Comment.findById(req.params.id, function(error, foundComment){
                if(error || !foundComment){
                    req.flash("error", "That comment does not exist")
                    res.redirect("back")
                } else{
                    res.render("editComment.ejs", {comment: foundComment, highlight: foundHighlight})
                }
            })
        }
    })
})


//Update route
app.put("/comments/:id", checkCommentOwnership, function(req, res){
    req.params.id //comment id
    var highlightId = req.body.highlightId //need this form redirecting to show route
    var author = req.body.author
    var text = req.body.text
    var updates = {author: author, text: text}
    Comment.findByIdAndUpdate(req.params.id, updates, function(error, updatedComment){
        if(error){
            req.flash("error", "Sorry, we cannot update your comment at this time. Please try again later.")
            res.redirect("back")
        } else{
            req.flash("success", "Success. You have updated your comment.")
            res.redirect("/highlights/" + highlightId)
        }
    })
})


//Delete route
app.delete("/comments/:id", checkCommentOwnership, function(req, res){
    req.params.id //comment id
    var highlightId = req.body.highlightId //need this form redirecting to show route
    Comment.findByIdAndDelete(req.params.id, function(error){
        if(error){
            req.flash("error", "Sorry we cannot delete your comment at this time. Please try again later.")
            res.redirect("back")
        } else{
            req.flash("success", "Success. Your comment has been deleted.")
            res.redirect("/highlights/" + highlightId)
        }
    })
})



//--Authentication routes

//register route
app.get("/register", function(req, res){
    if(notAUser){
        res.render("register.ejs")        
    } else{
        req.flash("error", "You already have an account.")
        res.redirect("/dashboard")
    }
})


//create route
app.post("/register", function(req, res){
    var username = req.body.username
    var email = req.body.email
    var password = req.body.password
    var newUser = new User({username: username, email: email})
    User.register(newUser, password, function(error, createdUser){
        if(error && error.message.substring(0, 6) == "E11000"){
            req.flash("error", "An account has already been associated with that email address.")
            res.redirect("/register")
        } else if(error){
            req.flash("error", error.message)
            res.redirect("/register")
        } else{
            passport.authenticate("local")(req, res, function(){
                notAUser = false
                req.flash("success", "Success. Welcome to the family! Please post responsibly.")
                res.redirect("/highlights")
            })
        }
    })
    
})


//login route
app.get("/login", function(req, res){
    if(notAUser){
        res.render("login.ejs")    
    } else{
        //if user is already logged in, they can't login again
        res.redirect("/highlights")   
    }

})


//passport extracts the user inputs from the form automatically and will check if they belong to a valid user.
app.post("/login", passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true
}), function(req, res){
        if(req.isAuthenticated()){
            notAUser = false
            res.redirect("/dashboard")
        }
})

//logout route
app.get("/logout", function(req, res){
    notAUser = true    
    req.logout()
    req.flash("success", "Success. You are logged out.")
    res.redirect("/highlights")
})


//dashboard
app.get("/dashboard", function(req, res){
    if(notAUser){
        res.redirect("/login")
    } else{
        res.render("dashboard.ejs")
    }
})

//dashboard items
app.get("/dashboard/:username", function(req, res){
    var poster = req.query.poster //use req.query to retrieve inputs from get routes. req.body is used for post routes.
    User.find({username: poster}, function(error, foundUser){
        if(error || foundUser == ""){
            req.flash("error", "That user does not exist.")
            res.redirect("back")
        } else{
            Highlight.find({poster: poster}, function(error, foundHighlights){
                if(error){
                    req.flash("error", "Sorry, we cannot display that dashboard at this time. Please try again later.")
                    res.redirect("back")
                } else{
                    res.render("dashboardItems.ejs", {highlights: foundHighlights, user: foundUser})
                }
            })            
        }
    })
})


//user profiles
app.get("/profile/:username", function(req, res){
    var user = req.params.username //use req.query to retrieve inputs from get routes. req.body is used for post routes.
    User.find({username: user}, function(error, foundUser){
        if(error || foundUser == ""){
            req.flash("error", "That user does not exist.")
            res.redirect("back")
        } else{
            Highlight.find({poster: user}, function(error, foundHighlights){
                if(error){
                    req.flash("error", "Sorry, we cannot display that dashboard at this time. Please try again later.")
                    res.redirect("back")
                } else{
                    res.render("dashboardItems.ejs", {highlights: foundHighlights, user: foundUser})
                }
            })            
        }
    })
})

//edit avatar
app.get("/dashboard/avatar/edit", isLoggedIn, function(req, res){
    res.render("editAvatar.ejs")
})

//update avatar
app.put("/dashboard/:id/avatar/edit", checkAvatarOwnership, function(req, res){
    req.params.id // user id
    var avatar = req.body.avatar
    var updates = {avatar: avatar}
    User.findByIdAndUpdate(req.params.id, updates, function(error, updatedUser){
        if(error){
            req.flash("error", "We could not update your avatar at this time. Please try again later.")
            res.redirect("back")
        } else{
            req.flash("success", "You have updated your avatar")
            res.redirect("/dashboard/")
        }
    })
})


app.get("*", function(req, res){
    req.flash("error", "We cannot find that page you are lookin for.")
    res.redirect("/")
})


//Used to give a user administrative privileges
// User.update({username: "Chris"}, {$set: {isAdmin: true}}, function(error, updatedItem){
//     console.log(updatedItem)
// })


function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next()
    } else{
        req.flash("error", "You must be logged in to do that")
        res.redirect("/login")
    }
}

function checkMomentOwnership(req, res, next){
    if(req.isAuthenticated()){
        req.params.id //moment id
        Highlight.findById(req.params.id, function(error, foundHighlight){
            if(error || !foundHighlight){
                req.flash("error", "That moment does not exist.")
                res.redirect("back")
            } else{
                if(foundHighlight.poster == req.user.username || req.user.username == "Chris"){
                    next()
                } else{
                    req.flash("error", "You do not have permission to do that")
                    res.redirect("back")
                }
            }
        })
    } else{
        req.flash("error", "You must be logged in to do that")
        res.redirect("/login")
    }
}


function checkCommentOwnership(req, res, next){
    if(req.isAuthenticated()){
        req.params.id //comment id
        Comment.findById(req.params.id, function(error, foundComment){
            if(error || !foundComment){
                req.flash("error", "That comment does not exist.")                
                res.redirect("back")
            } else{
                if(foundComment.author == req.user.username || req.user.username == "Chris"){
                    next()
                } else{
                    req.flash("error", "You do not have permission to do that")                    
                    res.redirect("back")
                }
            }
        })
    } else{
        req.flash("error", "You must be logged in to do that.")
        res.redirect("/login")
    }
}

function checkAvatarOwnership(req, res, next){
    if(req.isAuthenticated){
        req.params.id // userid
        User.findById(req.params.id, function(error, foundUser){
            if(error || !foundUser){
                req.flash("error", "That user does not exist")
                res.redirect("back")
            } else{
                if(foundUser.username == req.user.username || req.user.username == "Chris"){
                    next()
                } else{
                    req.flash("error", "You do not have permission to do that.")
                    res.redirect("back")
                }
            }
        })
    } else{
        req.flash("error", "You must be logged in to do that.")
        res.redirect("/login")
    }
}


function escapeRegex(text){
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}


//listens for app to check if it is running
app.listen(process.env.PORT, process.env.IP, function(){
    console.log("server is running")
})