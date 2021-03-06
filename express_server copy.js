const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const bcrypt = require('bcryptjs');

const {generateRandomString, generateRandomID} = require("./utils/id-generator");
const {findUser} = require("./utils/find-user");
const {findUser} = require("./db");

const morgan = require('morgan');

const app = express();
const PORT = 8080; // default port 8080

app.set("view engine", "ejs");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(morgan('dev'));

const urlDatabase = {
  b6UTxQ: { longURL: "https://www.tsn.ca", userID: "aJ48lW" },
  i3BoGr: { longURL: "https://www.google.ca", userID: "aJ48lW" }
};

const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur"
  }
};

app.use((req,res,next)=>{
  req.isLoggedIn = false;
  const userId = req.cookies["user_id"];
  if (userId && users[userId]) {
    req.isLoggedIn = true;
    req.user = users[userId];
  }
  next();
});

// Set user cookie object
const setCookieTemplateVars = function(req) {
  let responseObj = {};
  try {
    responseObj.userId = users[req.cookies["user_id"]];
    console.log("Cookie found");
  } catch (error) {
    responseObj.userId = undefined;
    console.log("cannot find cookie");
  }

  return responseObj;
};


/**
 * User Routes
 */
app.get("/user/register", (req, res) => {
  let templateVars = setCookieTemplateVars(req);
  res.render("register", templateVars);
});

app.post("/api/user/register", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  const userId = findUser(users, email);
  if (userId) {
    return res
      .status(409)
      .send("user already exists");
  }
 
  if (email && email !== "" && password && password !== "") {
    const id = generateRandomID();
    users[id] = {};
    users[id].id = id;
    users[id].email = email;
    
    const hashedPassword = bcrypt.hashSync(password, 10);
    console.log(hashedPassword);
    users[id].password = hashedPassword;

    return res
      .cookie("user_id", id)
      .redirect('/urls');
  }
  
  res.sendStatus(500);
});


app.get("/user/login", (req, res) => {
  let templateVars = setCookieTemplateVars(req);
  res.render("login", templateVars);
});

app.post("/api/user/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  const userId = findUser(users, email);
  if (userId && users[userId].password === password) {
    return res
      .cookie("user_id", userId)
      .redirect("/urls");
  }
  return res
    .status(403)
    .send("wrong account info");
});

// Logout
app.post("/user/logout", (req, res) => {
  res
    .clearCookie("user_id")
    .redirect("/urls");
});

/**
 * Transfer to long url
 */
app.get("/u/:shortURL", (req, res) => {
  const shortURL = req.params.shortURL;
  if (urlDatabase[shortURL]) {
    return res.redirect(urlDatabase[shortURL].longURL);
  }
  return res.send("URL not find");
});

/**
 * URL Routes
 */
app.post("/urls/:shortURL/delete", (req, res) => {
  if (!req.isLoggedIn) {
    return res.redirect('/user/login');
  }
  const shortURL = req.params.shortURL;
  delete urlDatabase[shortURL];
  res.redirect(`/urls/`);
});

// EDIT: Long URL
app.post("/urls/:shortURL/edit", (req, res) => {
  if (!req.isLoggedIn) {
    return res.redirect('/user/login');
  }
  const shortURL = req.params.shortURL;
  const longURL = req.body.longURL;
  urlDatabase[shortURL] = longURL;
  res.redirect(`/urls/`);
});

app.get("/urls/new", (req, res) => {
  if (!req.isLoggedIn) {
    return res.redirect('/user/login');
  }
  let templateVars = setCookieTemplateVars(req);
  res.render("urls_new", templateVars);
});


app.get("/urls/:shortURL", (req, res) => {
  if (!req.isLoggedIn) {
    return res.redirect('/user/login');
  }

  const shortURL = req.params.shortURL;

  let templateVars = setCookieTemplateVars(req);
  templateVars.shortURL = shortURL;
  templateVars.longURL = urlDatabase[shortURL].longURL;

  res.render("urls_show", templateVars);
});

app.get("/urls", (req, res) => {
  if (!req.isLoggedIn) {
    return res.redirect('/user/login');
  }
  let templateVars = setCookieTemplateVars(req);
  templateVars.urls = urlDatabase;

  res.render("urls_index", templateVars);
});

app.post("/urls", (req, res) => {
  if (!req.isLoggedIn) {
    return res.redirect('/user/login');
  }
  const longURL = req.body.longURL;
  const shortURL = generateRandomString(longURL);
  urlDatabase[shortURL] = {
    longURL: longURL,
    userID: req.user.id
  };
  res.redirect(`/urls/${shortURL}`);
});

app.get("/", (req, res) => {
  res.redirect("urls");
});


app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});


module.exports = app;