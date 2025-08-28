const express = require("express");
const route = express.Router();
const {createCart, getCart, updateCart, removeFromCart} = require("../controllers/cart.controller");
const {authentication, authorization} = require("../middlewares/auth.middleware");

route.post("/carts", authentication, createCart);

route.get("/carts", authentication, getCart);

route.put("/carts", authentication, updateCart);

route.delete("/carts", authentication, removeFromCart);

module.exports = route;