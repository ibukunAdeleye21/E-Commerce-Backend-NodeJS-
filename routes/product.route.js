const express = require("express");
const {
    getProducts, 
    getProduct, 
    getProductsInCategory, 
    getProductInCategory
} = require("../controllers/product.controller");

const {authentication, authorization} = require("../middlewares/auth.middleware");

const route = express.Router();

route.get("/products", authentication, getProducts);
route.get("/products/:productId", authentication, getProduct);
route.get("/categories/:categoryId/products", authentication, getProductsInCategory);
route.get("/categories/:categoryId/products/:productId", authentication, getProductInCategory);

module.exports = route;