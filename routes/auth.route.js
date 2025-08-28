const express = require("express");
const {addUser, login, addAdmin} = require("../controllers/auth.controller");
const { authorization } = require("../middlewares/auth.middleware");

const route = express.Router();


route.post("/add-user", addUser);
route.post("/login-user", login);

route.post("/add-admin", addAdmin);

module.exports = route;
