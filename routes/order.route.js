const express = require("express");
const {createOrder, getUserOrders, getUserOrder} = require("../controllers/order.controller");
const {authentication, authorization} = require("../middlewares/auth.middleware");
const route = express.Router();

route.post("/orders", authentication, createOrder);

route.get("/orders", authentication, getUserOrders);
route.get("/orders/:orderId", authentication, getUserOrder);

module.exports = route;