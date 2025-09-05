const express = require("express");
const route = express.Router();
const {
    createProduct, 
    updateProduct, 
    deleteProduct, 
    createCategory, 
    updateCategory, 
    deleteCategory,
    updateOrderStatus,
    getAllOrders,
    getOrder,
    getProducts,
    getProduct,
    getProductsInCategory,
    getProductInCategory,
    getCategories,
    getCategory
} = require("../controllers/admin.controller");

const {authorization, authentication} = require("../middlewares/auth.middleware");
const upload = require("../utils/multer");

// category
route.get("/admin/categories", authorization, getCategories);
route.get("/admin/categories/:categoryId", authorization, getCategory);  

route.post("/admin/categories", authorization, upload.single("image"), createCategory);
route.put("/admin/categories/:categoryId", authorization, upload.single("image"), updateCategory);
route.delete("/admin/categories/:categoryId", authorization, deleteCategory);


// order
route.put("/admin/orders/:orderId/status", authorization, updateOrderStatus);
route.get("/admin/orders", authorization, getAllOrders);
route.get("/admin/orders/:orderId", authorization, getOrder);


// product
route.get("/admin/products", authorization, getProducts);
route.get("/admin/products/:productId", authorization, getProduct);
route.get("/admin/categories/:categoryId/products", authorization, getProductsInCategory);
route.get("/admin/categories/:categoryId/products/:productId", authorization, getProductInCategory);

route.post("/admin/products", authorization, upload.array("image", 4), createProduct);
route.put("/admin/products/:productId", authorization, upload.array("image", 4), updateProduct);
route.delete("/admin/products/:productId", authorization, deleteProduct);

module.exports = route;