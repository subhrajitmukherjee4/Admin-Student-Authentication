const express = require('express');
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const ejsMate = require("ejs-mate"); 
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended:true}));
app.engine("ejs",ejsMate);
app.use(express.static(path.join(__dirname, "/public")));
app.use(express.static("/public"));
const methodOverride = require("method-override");
const Joi = require("joi");
app.use(methodOverride("_method"));
app.use(express.urlencoded({ extended:true}));

//mongoose setup
async function main(){
    mongoose.connect("mongodb://127.0.0.1:27017/stdrgtn");
}
main().then(res=> console.log("database connected"))
      .catch(err=> console.log(err));


//server side data validation using Joi
const studentSchema = Joi.object().keys({ 
  username: Joi.string().required(),
  name: Joi.string().required(),
  email: Joi.string().required(),
  isActive: Joi.boolean().required(),
  password: Joi.string().required(),
 
}); 

const studentPatchSchema = Joi.object().keys({
  name: Joi.string().required(),
  email: Joi.string().required(),
  isActive: Joi.boolean().required(),
});
//ExpressError
class ExpressError extends Error{
  constructor(statusCode , message){
      super();
      this.statusCode=statusCode;
      this.message = message;
  }
};
// | session |
const session = require("express-session");
const sessionOptions = {
    secret : "mysecret",
    resave: false,
    saveUninitialized: true,
    cookie :{
      expires : Date.now() + 7 * 24 * 60 * 60 * 1000,
      maxAge : 7 * 24 * 60 * 60 * 1000,
      httpOnly : true, // for security, search crossScripting
    },
  };
  app.use(session(sessionOptions)); 

  //IMPORTING MODELS
  const Student = require("./models/student.js");
  const Admin = require("./models/admin.js");

  //PASSPORT
  const passport = require("passport");
  const LocalStrategy = require("passport-local");
  app.use(passport.initialize());
app.use(passport.session());

// Passport Local Strategy for User
passport.use('student-local', new LocalStrategy(
  (username, password, done) => {
    Student.findOne({ username: username })
      .then((user) => {
        if (!user) {
          return done(null, false, { message: 'Incorrect username or password' });
        }
        if (!user.authenticate(password)) {
          return done(null, false, { message: 'Incorrect username or password' });
        }
        return done(null, user);
      })
      .catch((err) => done(err));
  }
));

// Passport Local Strategy for Admin
passport.use('admin-local', new LocalStrategy(
  (username, password, done) => {
    Admin.findOne({ username: username })
      .then((admin) => {
        if (!admin) {
          return done(null, false, { message: 'Incorrect username or password' });
        }
        if (!admin.authenticate(password)) {
          return done(null, false, { message: 'Incorrect username or password' });
        }
        return done(null, admin);
      })
      .catch((err) => done(err));
  }
));

// Serialize and Deserialize User/Admin
passport.serializeUser((user, done) => {
  done(null, { id: user.id, role: user.role });
});

passport.deserializeUser((obj, done) => {
  if (obj.role === 'user') {
    Student.findById(obj.id)
      .then((user) => done(null, user))
      .catch((err) => done(err));
  } else if (obj.role === 'admin') {
    Admin.findById(obj.id)
      .then((admin) => done(null, admin))
      .catch((err) => done(err));
  }
});

const  checkStatus = ((req, res, next) => {
      if (!req.user.isActive) {
        // return res.status(403).json({ message: "User is inactive. Contact admin." });
        res.send("User is inactive. Contact admin");
      }
      return next();
  });


// middleware
let stuLoggedIn = (req,res, next)=>{
    // console.log(req);
      if(!req.isAuthenticated()){
          return res.redirect("/studentlogin"); // if we dont write return,"cannot set header error will appear"
        }
        next();
  };
let AdmLoggedIn = (req,res, next)=>{
    // console.log(req);
      if(!req.isAuthenticated()){
          return res.redirect("/adminlogin"); // if we dont write return,"cannot set header error will appear"
        }
        next();
  };

  let adminLogout = (req,res,next)=>{
    req.logout((err)=>{
        if(err){
            next(err);
        }
        res.redirect("/adminlogin");
    });
  };
  let studentLogout = (req,res,next)=>{
    req.logout((err)=>{
        if(err){
            next(err);
        }
        res.redirect("/studentlogin");
    });
  };
// student login
app.get("/studentlogin", (req,res,next)=>{ 
    res.render("student/login.ejs");
});
app.get("/admin/logout", adminLogout);
app.get("/student/logout", studentLogout);
app.post("/studentlogin",
    passport.authenticate("student-local", {
    failureRedirect: "/studentlogin", 
    // failureFlash: true,
}), 

 async (req,res) => {
    res.redirect("/student");
    // res.send("student");

    }
);

// app.use((req,res,next)=>{
//     res.locals.user = req.user;
//     next();
// });
app.get("/student",  stuLoggedIn, checkStatus, async(req,res)=>{
    // console.log(res.locals.user);
    res.locals.user = await Student.findById(req.user._id);
    res.render("student/student.ejs");
});
// admin login
  app.get("/adminlogin", (req,res,next)=>{ 
    res.render("admin/adminlogin.ejs");
});

app.post("/adminlogin",
    passport.authenticate("admin-local", {
    failureRedirect: "/adminlogin", 
    // failureFlash: true,
}), 

 async (req,res) => {
    res.redirect("/admin");

    }
);
app.get("/admin",  AdmLoggedIn, async(req,res)=>{
    let students = await Student.find({});
    res.render("admin/admin.ejs",{students});
});
app.get("/admin/add",   AdmLoggedIn, (req,res)=>{
    res.render("admin/addStudent.ejs");
});
app.post("/admin/add",  AdmLoggedIn, async(req,res)=>{
    try{
      let result = studentSchema.validate(req.body);
      if(result.error){
       throw new ExpressError(400, result.error);
      }
        let {username, name, email, isActive, password} = req.body;
        const newStudent = new Student({name, username, email, isActive});
        const registeredUser= await Student.register(newStudent, password); //register method is a async method
        console.log(registeredUser);
 
        res.redirect("/admin");
    } catch(e){
        // req.flash("error", e.message);
        res.send(e.message);
    }
 
});

app.get("/admin/student/:id", AdmLoggedIn, async(req,res)=>{
  let {id} = req.params;
  let student = await Student.findById(id);
  res.render("admin/updateStudent.ejs",{student});
});
app.patch("/admin/student/:id", AdmLoggedIn, async(req,res)=>{
  try{
    const id = req.params.id;
      let result = studentPatchSchema.validate(req.body);
      if(result.error){
   
        throw new ExpressError(400, result.error);
      }
    let {name, email, isActive} = req.body;
      let updatedStudent = await Student.findOneAndUpdate({_id:id},req.body,{new:true});
      res.redirect("/admin");
  } catch(e){
res.send(e.message);
  }
 
 

});
app.listen(3000,(req,res)=>{
    console.log("app is listening");
});
