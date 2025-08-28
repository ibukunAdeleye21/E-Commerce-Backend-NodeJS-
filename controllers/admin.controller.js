const mongoose = require("mongoose");
const express = require("express");
const categoryModel = require("../models/category.model");
const productModel = require("../models/product.model");
const orderModel = require("../models/order.model");
const userModel = require("../models/user.model");
const logger = require("../utils/logger");
const cloudinary = require("cloudinary");
const fs = require("fs/promises");
const axios = require("axios");

const createProduct = async (req, res) => {
    logger.debug("Incoming request to create a product...");

    const {categoryId, ...productBody} = req.body;
    const productImages = req.files;

    // validate categoryId 
    logger.debug(`Validate category with ID: ${categoryId}`);

    if (!mongoose.Types.ObjectId.isValid(categoryId))
    {
        logger.warn(`Invalid category with ID: ${categoryId}`);
        return res.status(400).json({message: "Invalid category ID."})
    }

    // Check if categoryId is in the db
    logger.debug("Checking category in the db...");
    const category = await categoryModel.findById(categoryId);

    if (!category)
    {
        logger.warn(`Category with ID: ${categoryId} does not exist in the db`);
        return res.status(404).json({message: "Category not found."});
    }

    try {
        // upload images if provided
        if (productImages && productImages.length > 0) {
            logger.debug("Uploading product images to cloudinary...");
            const uploadedProductImages = [];

            for (const productImage of productImages)
            {
                const uploadProductImageResponse = await cloudinary.uploader.upload(productImage.path)
                uploadedProductImages.push(uploadProductImageResponse.secure_url);
                await fs.unlink(productImage.path);
            }

            productBody.images = uploadedProductImages;
        }

        // create product

        logger.debug("Create product with uploaded product images...");
        const newProduct = new productModel({category: categoryId, ...productBody});

        const savedProduct = await newProduct.save();
        logger.info(`Product created with ID: ${savedProduct._id}`);

        // update the category with new product
        logger.debug("Update the category with new product...");

        await categoryModel.findByIdAndUpdate(categoryId, {$push: {products: savedProduct._id}}, {new: true});

        logger.info(`Category table modified with category ID: ${categoryId}`);

        logger.info(`Product created successfully with ID: ${savedProduct._id}`);

        return res.status(201).json({message: "Product created successfully", product: savedProduct});

    } catch (error) {
        logger.error(`Error creating product: ${error.message}`);
        return res.status(500).json({message: "Create product failed"});
    }
}

const updateProduct =  async (req, res) => {
    const {categoryId, ...productBody} = req.body;
    const {productId} = req.params;
    const productImages = req.files;

    logger.debug(`Updating product ID: ${productId} in category ID: ${categoryId}`);

    // validate productId
    if (!mongoose.Types.ObjectId.isValid(productId))
    {
        logger.warn("Product ID not provided");
        return res.status(400).json({ message: "Invalid product ID" });
    }

    if (categoryId) {
        // validate categoryId object
        logger.debug(`Validate category with ID: ${categoryId}`);

        if (!mongoose.Types.ObjectId.isValid(categoryId))
        {
            logger.warn(`Invalid category with ID: ${categoryId}`);
            return res.status(400).json({message: "Invalid category ID."})
        }

        // Check if categoryId is in the db
        logger.debug("Checking category in the db...");
        
        const isCategoryIdValid = await categoryModel.findById(categoryId);

        if (!isCategoryIdValid)
        {
            logger.warn(`Category with ID: ${categoryId} does not exist in the db`);
            return res.status(404).json({message: "Category does not exist"});
        }
    }

    try {
        // Ensure product exists
        const product = await productModel.findById(productId);

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // handles images if provided
        if (productImages && productImages.length > 0) {
            logger.debug("Uploading product images to cloudinary...");

            const uploadedProductImages = [];

            for (const productImage of productImages)
            {
                const uploadProductImageResponse = await cloudinary.uploader.upload(productImage.path)
                uploadedProductImages.push(uploadProductImageResponse.secure_url);
                await fs.unlink(productImage.path);
            }

            productBody.images = uploadedProductImages;
        }

        // modify the product
        logger.debug("Update the product...")
        const updatedProduct = await productModel.findByIdAndUpdate(productId, {...productBody}, {new: true});

        logger.info(`Product updated successfully with ID: ${updatedProduct._id}`);

        return res.status(200).json({message: "Product updated successfully", product: updatedProduct});

    } catch (error) {
        logger.error(`Error updating product: ${error.message}`);
        return res.status(500).json({ message: "Update product failed" });
    }
}

const deleteProduct = async (req, res) => {
    logger.debug(`Incoming request to delete product with ID: ${req.params.productId}`);

    const {productId} = req.params;
    
    // validate productId object
    logger.debug(`Validate product with ID: ${productId}`);
    if (!mongoose.Types.ObjectId.isValid(productId))
    {
        logger.warn(`Invalid product with ID: ${productId}`);
        return res.status(400).json({message: "Invalid product ID."})
    }


    try {
        // get product from product table
        const product = await productModel.findById(productId).populate("category", "_id");
        console.log(`Product: ${product.category}`);

        if (!product) {
            logger.warn(`Product with ID: ${productId} does not exist`);
            return res.status(404).json({message: "Product not found"});
        }

        const categoryId = product.category?._id;

        logger.debug(`Delete product with ID: ${productId}`);
        const deleteResponse = await productModel.findByIdAndDelete(productId);

        if (!deleteResponse)
        {
            logger.warn(`product with ID: ${productId} does not exist`);
            return res.status(404).json({ message: "Product not found" });
        }

        logger.info(`Product with ID: ${productId} deleted successfully`);

        await categoryModel.findByIdAndUpdate(categoryId,{ $pull: { products: productId } },{ new: true });
        logger.info(`Product ID: ${productId} removed from category ID: ${categoryId}`);

        return res.status(200).json({message: `Product with ID: ${productId} deleted successfully`});

    } catch (error) {
        logger.error(`Error deleting product with ID: ${productId}`);
        return res.status(500).json({message: `Delete product with ID: ${productId} failed`});
    }
}

const getProducts = async (req, res) => {
    logger.debug("Incoming request to get all products...");
    
    try {
        const getProductsReponse = await productModel.find().populate("category", "name description -_id");
        logger.info("Products gotten successfully");
        return res.status(200).json(getProductsReponse);
    } catch (error) {
        logger.error("Error getting all products");
        return res.status(500).json({message: "Get all products failed"});
    }
}

const getProduct = async (req, res) => {
    const {productId} = req.params;
    logger.debug(`Incoming request to get product with ID: ${productId}`); 

    // validate productId object
    logger.debug(`Validate product with ID: ${productId}`);

    if (!mongoose.Types.ObjectId.isValid(productId))
    {
        logger.warn(`Invalid product with ID: ${productId}`);
        return res.status(400).json({message: "Invalid product ID."})
    }

    try {
        logger.debug(`Check product with ID: ${productId} in the db`);

        const getProductResponse = await productModel.findById(productId).populate("category", "name description price category");

        if (!getProductResponse)
        {
            logger.warn(`Product with ID ${productId} does not exist`);
            return res.status(404).json({message: "Product does not exist"});
        }

        logger.info(`Product with ID: ${getProductResponse._id} gotten successful`);

        return res.status(200).json({message: "Product successfully fetched", success: true, product: getProductResponse});

    } catch (error) {
        logger.error(`Error getting product with ID: ${error.message}`);
        return res.status(500).json({message: `Get product with ID: ${productId} failed`});
    }
}

const getCategories = async (req, res) => {
    logger.info("Incoming request to get categories...");

    try {
        const getCategoriesResponse = await categoryModel.find();

        logger.info("Categories gotten successfully");

        return res.status(200).json({message: "Categories fetched successfully", success: true, products: getCategoriesResponse});

    } catch (error) {
        logger.error(`Error getting all categories: ${error.message}`);
        return res.status(500).json({message: "Failed to fetch categories"});
    }
}

const getCategory = async (req, res) => {
    const {categoryId} = req.params;

    logger.info(`Incoming request to get category of ID: ${categoryId}`);

    // validate categoryId object
    logger.debug(`Validate category with ID: ${categoryId}`);

    if (!mongoose.Types.ObjectId.isValid(categoryId))
    {
        logger.warn(`Invalid category with ID: ${categoryId}`);
        return res.status(400).json({message: "Invalid category ID."})
    }

    try {
        logger.debug(`Get category with ID: ${categoryId} in the db`);

        const getCategoryResponse = await categoryModel.findById(categoryId);

        if (!getCategoryResponse)
        {
            logger.warn(`Category with ID ${categoryId} does not exist`);
            return res.status(404).json({message: "Category does not exist"});
        }

        logger.info(`Category with ID: ${getCategoryResponse._id} gotten successful`);

        return res.status(200).json({message: "Category fetched successfully", success: true, category: getCategoryResponse});

    } catch (error) {
        logger.error(`Error getting category : ${error.message}}`);
        return res.status(500).json({message: `Get category with ID: ${categoryId} failed`});
    }
}

const getProductsInCategory = async (req, res) => {
    const {categoryId} = req.params;
    logger.debug(`Incoming request to get all products of category with ID: ${categoryId}`);

    // validate categoryId object
    logger.debug(`Validate category with ID: ${categoryId}`);

    if (!mongoose.Types.ObjectId.isValid(categoryId))
    {
        logger.warn(`Invalid category with ID: ${categoryId}`);
        return res.status(400).json({message: "Invalid category ID."})
    }

    // Check if categoryId is in the db
    logger.debug("Checking category in the db...");
    const isCategoryIdValid = await categoryModel.findById(categoryId);

    if (!isCategoryIdValid)
    {
        logger.warn(`Category with ID: ${categoryId} does not exist in the db`);
        return res.status(404).json({message: "Category not found."});
    }

    try {
        logger.debug(`Getting all products with category ID: ${categoryId}...`);

        const getProductsReponse = await productModel.find({category: categoryId}).populate("category", "name description");

        logger.info("Products gotten successfully");

        return res.status(200).json(getProductsReponse);
    } catch (error) {
        logger.error(`Error getting products: ${error.message}`);
        return res.status(500).json({message: "Internal server error while fetching products", error: error.message });
    }
}

const getProductInCategory = async (req, res) => {
    const {productId, categoryId} = req.params;

    logger.debug(`Incoming request to get product of ID: ${productId} and category of ID: ${categoryId}...`);

    // validate categoryId 
    logger.debug(`Validate category with ID: ${categoryId}`);

    if (!mongoose.Types.ObjectId.isValid(categoryId))
    {
        logger.warn(`Invalid category with ID: ${categoryId}`);
        return res.status(400).json({message: "Invalid category ID."})
    }

    // validate productId 
    logger.debug(`Validate product with ID: ${productId}`);

    if (!mongoose.Types.ObjectId.isValid(productId))
    {
        logger.warn(`Invalid product with ID: ${productId}`);
        return res.status(400).json({message: "Invalid product ID."})
    }

    // Check if categoryId is in the db
    logger.debug("Checking category in the db...");

    const isCategoryIdValid = await categoryModel.findById(categoryId);

    if (!isCategoryIdValid)
    {
        logger.warn(`Category with ID: ${categoryId} does not exist in the db`);
        return res.status(404).json({message: "Category not found."});
    }

    // check if productId is in the db
    logger.debug("Checking product in the db...");
    const isProductIdValid = await productModel.findById(productId);
    if (!isProductIdValid)
    {
        logger.warn(`Product with ID: ${productId} does not exist in the db`);
        return res.status(404).json({message: "Product not found."})
    }

    try {
        logger.debug(`Getting product with ID: ${productId}...`);

        const getProductReponse = await productModel.findOne({category: categoryId, _id: productId});

        logger.info(`Product ${productId} fetched successfully in category ${categoryId}`);

        return res.status(200).json({message: "Product fetched successfully", success: true, product: getProductReponse});

    } catch (error) {
        logger.error(`Error getting product: ${error.message}`);
        return res.status(500).json({message: "Internal server error while fetching products", error: error.message });
    }
}

const createCategory = async (req, res) => {
    logger.info("Incoming request to create category...");

    const categoryBody = req.body;
    const categoryImage = req.file;

    try {
        logger.debug("Checking cloudinary availability...")
        const isUp = await axios.get("https://api.cloudinary.com").then(() => true).catch(() => false);
        if (isUp) {
            logger.warn("Cloudinary service unavailable. Try again later.");
            return res.status(503).json({message: "Cloudinary service unavailable. Try again later."});
        }

        if (categoryImage) {
            logger.debug("Upload category image to cloudinary...")
            const uploadCategoryImageResponse = await cloudinary.uploader.upload(categoryImage.path);
            if (!uploadCategoryImageResponse)
            {
                logger.warn("Upload category image to cloudinary failed. Cloudinary returned no response.");
                return res.status(502).json({message: "Image upload failed. Cloudinary returned no response"});
            }
            await fs.unlink(categoryImage.path);

            logger.info("Successfully uploaded category image to cloudinary");

            // add the uploaded image to cloudinary body
            categoryBody["image"] = uploadCategoryImageResponse.secure_url;
        }
        
        // create category
        logger.debug("Create category with the category image uploaded...")
        const newCategory = new categoryModel({...categoryBody});

        const savedCategory = await newCategory.save();
        logger.info(`Category saved successfully in the database with ID: ${savedCategory._id}`);
        
        logger.info(`Category created successfully with ID: ${savedCategory._id}`);

        return res.status(201).json({message: "Category created successfully"});
    } catch (error) {
        logger.error(`Error creating category with files: ${error.message}`)
        return res.status(500).json({message: "Internal server error while creating product", error: error.message });
    }
}

const updateCategory = async (req, res) => {
    const {categoryId} = req.params;
    logger.info(`Incoming request to update category with ID: ${categoryId}`);

    const categoryBody = req.body;
    const categoryImage = req.file;

    // validate categoryId object
    logger.debug(`Validate category with ID: ${categoryId}`);
    if (!mongoose.Types.ObjectId.isValid(categoryId))
    {
        logger.warn(`Invalid category with ID: ${categoryId}`);
        return res.status(400).json({message: "Invalid category ID."})
    }

    try {
        // Ensure category exists
        const category = await productModel.findById(categoryId);
        if (!category) {
            logger.warn(`Category with ID: ${categoryId} does not exist`);
            return res.status(404).json({ message: "category not found" });
        }

        // Handle optional image upload
        if (categoryImage) {
            logger.debug("Upload category image to cloudinary...")
            const uploadCategoryImageResponse = await cloudinary.uploader.upload(categoryImage.path);
        
            if (!uploadCategoryImageResponse)
            {
                logger.warn("Upload category image to cloudinary failed. Cloudinary returned no response.");
                return res.status(502).json({message: "Image upload failed. Cloudinary returned no response"});
            }
            await fs.unlink(categoryImage.path);

            logger.info("Successfully uploaded category image to cloudinary");

            // add the uploaded image to cloudinary body
            categoryBody["image"] = uploadCategoryImageResponse.secure_url;
        }
        
        logger.debug(`Updating category with ID: ${categoryId} in the DB...`);
        const updateCategoryResponse = await categoryModel.findByIdAndUpdate(categoryId, {...categoryBody}, {new: true});

        if (!updateCategoryResponse) {
            logger.warn(`Category with ID: ${categoryId} does not exist`);
            return res.status(404).json({message: "Category does not exist"});
        }

        return res.status(200).json({message: "Category uploaded successfully", category: updateCategoryResponse});

    } catch (error) {
        logger.error(`Error updating category with ID: ${categoryId}`);
        return res.status(500).json({message: "Internal server error while updating products", error: error.message });
    }
}

const deleteCategory = async (req, res) => {
    const {categoryId} = req.params;

    logger.debug(`Incoming request to delete category with ID: ${categoryId}`);

    // validate categoryId object
    logger.debug(`Validate category with ID: ${categoryId}`);

    if (!mongoose.Types.ObjectId.isValid(categoryId))
    {
        logger.warn(`Invalid category with ID: ${categoryId}`);
        return res.status(400).json({message: "Invalid category ID."})
    }

    try {
        logger.debug(`Delete category with ID: ${categoryId}`);

        const deleteCategoryResponse = await categoryModel.findByIdAndDelete(categoryId);

        if (!deleteCategoryResponse) {
            logger.warn(`Category with ID: ${categoryId} does not exist`);
            return res.status(404).json({message: "Category does not exist"});
        }

        return res.status(204).json({message: `Delete category with ID: ${categoryId} successful`});
    } catch (error) {
        logger.error(`Error deleting category with ID: ${categoryId}`);
        return res.status(500).json({message: `Delete category with ID: ${categoryId} failed`});
    }
}

const updateOrderStatus = async (req, res) => {
    logger.debug("Incoming request to update order status...");

    const {...orderBody} = req.body;
    const {orderId} = req.params;

    // validate orderId object
    logger.debug(`Validate order with ID: ${orderId}`);

    if (!mongoose.Types.ObjectId.isValid(orderId))
    {
        logger.warn(`Invalid order with ID: ${orderId}`);
        return res.status(400).json({message: "Invalid order ID."})
    }

    try {
        // check if order Id exist in the database
        const order = await orderModel.findById(orderId);

        if (!order)
        {
            logger.warn(`Order with ID: ${orderId} does not exist`);
            return res.status(404).json({message: "Order does not exist"});
        }

        const updateOrderResponse = await orderModel.findByIdAndUpdate(orderId, {$set: orderBody}, {new: true});

        logger.info(`Order with ID: ${updateOrderResponse._id} updated successfully`);

        return res.status(200).json({message: "Update order successful", order: updateOrderResponse});

    } catch (error) {
        logger.error(`Error updating order with ID: ${orderId}}`);
        return res.status(500).json({message: `Update order with ID: ${orderId} failed`});
    }
}

const getAllOrders = async (req, res) => {
    logger.debug(`Incoming request to get order by ${req.query.filter}...`);

    const {userId} = req.user;
    const {filterByStatus} = req.query;

    try {
        // filter by query if query is not empty
        let getOrders;
        logger.debug(`Filtering order by ${filterByStatus}...`)
        if (filterByStatus)
        {
            getOrders = await orderModel.find({status: filterByStatus.trim()}).populate("items.productId", "name price description");;
        }
        else {
            // if query is empty
            getOrders = await orderModel.find().populate("items.productId", "name price description");;
        }

        return res.status(200).json({
            message: filterByStatus 
            ? `Orders filtered by status: ${filterByStatus}`
            : "All orders received successfully",
            count: getOrders.length,
            orders: getOrders,
        });
    } catch (error) {
        logger.error("Error getting orders:", error.message);
        return res.status(500).json({message: "An error occurred while retrieving orders", error: error.message});
    }
}

const getOrder = async (req, res) => {
    logger.debug("Incoming request to get an order");

    const {orderId} = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId))
    {
        logger.warn(`Invalid order ID: ${orderId}`);
        return res.status(400).json({message: "Invalid order ID."})
    }

    try {
        logger.debug("Getting order from the db...");

        const order = await orderModel.findById(orderId).populate("items.productId", "name price description");

        if (!order) {
            logger.warn(`Order with ID: ${orderId} does not exist`);
            return res.status(404).json({message: "Order does not exist"});
        }

        return res.status(200).json(
            {message: "Order fetched successfully", 
            success: true,
            order: order});

    } catch (error) {
        logger.error("Error getting order:", error.message);
        return res.status(500).json({message: "An error occurred while retrieving order", error: error.message});
    }
}

module.exports = {
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
}
