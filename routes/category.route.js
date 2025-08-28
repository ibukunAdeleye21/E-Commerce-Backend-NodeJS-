const express = require("express");
const {getCategories, getCategory} = require("../controllers/category.controller");
const route = express.Router();
const upload = require("../utils/multer");
const {authentication, authorization} = require("../middlewares/auth.middleware");

route.get("/categories", authentication, getCategories);
route.get("/categories/:categoryId", authentication, getCategory);


module.exports = route;