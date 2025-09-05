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
        return res.status(400).json({
            message: "Invalid category ID.", 
            success: false
        })
    }

    // Check if categoryId is in the db
    logger.debug("Checking category in the db...");
    const category = await categoryModel.findById(categoryId);

    if (!category)
    {
        logger.warn(`Category with ID: ${categoryId} does not exist in the db`);
        return res.status(404).json({
            message: "Category not found.", 
            success: false
        });
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

        return res.status(201).json({
            message: "Product created successfully", 
            success: true,
            data: savedProduct
        });

    } catch (error) {
        logger.error(`Error creating product: ${error.message}`);
        return res.status(500).json({
            message: "Create product failed", 
            success: false, 
            error: error.message
        });
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
        return res.status(400).json({ 
            message: "Invalid product ID", 
            success: false 
        });
    }

    if (categoryId) {
        // validate categoryId object
        logger.debug(`Validate category with ID: ${categoryId}`);

        if (!mongoose.Types.ObjectId.isValid(categoryId))
        {
            logger.warn(`Invalid category with ID: ${categoryId}`);
            return res.status(400).json({
                message: "Invalid category ID.", 
                success: false
            })
        }

        // Check if categoryId is in the db
        logger.debug("Checking category in the db...");
        
        const isCategoryIdValid = await categoryModel.findById(categoryId);

        if (!isCategoryIdValid)
        {
            logger.warn(`Category with ID: ${categoryId} does not exist in the db`);
            return res.status(404).json({
                message: "Category does not exist", 
                success: false
            });
        }
    }

    try {
        // Ensure product exists
        const product = await productModel.findById(productId);

        if (!product) {
            return res.status(404).json({ 
                message: "Product not found", 
                success: false 
            });
        }

        // handles images if provided
        if (productImages && productImages.length > 0) {
            logger.debug("Uploading product images to cloudinary...");


            const uploadedProductImages = await Promise.all(
                productImages.map(async (productImage) => {
                    const uploadRes = await cloudinary.uploader.upload(productImage.path);
                    await fs.unlink(productImage.path);
                    return uploadRes.secure_url;
                })
            );
            // const uploadedProductImages = [];

            // for (const productImage of productImages)
            // {
            //     const uploadProductImageResponse = await cloudinary.uploader.upload(productImage.path)
            //     uploadedProductImages.push(uploadProductImageResponse.secure_url);
            //     await fs.unlink(productImage.path);
            // }

            productBody.images = uploadedProductImages;
        }

        // whitelist fields you allow to be updated
        const allowedFields = ["name", "description", "price", "images", "stock", "category"];
        const updateData = Object.fromEntries(
            Object.entries(productBody).filter(([key]) => allowedFields.includes(key))
        );

        // modify the product
        logger.debug("Update the product...")
        const updatedProduct = await productModel.findByIdAndUpdate(productId, updateData, {new: true, runValidators: true});

        logger.info(`Product updated successfully with ID: ${updatedProduct._id}`);

        return res.status(200).json({
            message: "Product updated successfully", 
            success: true, 
            data: updatedProduct
        });

    } catch (error) {
        logger.error(`Error updating product: ${error.message}`);
        return res.status(500).json({ 
            message: "Update product failed", 
            success: false, 
            error: error.message 
        });
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
        return res.status(400).json({
            message: "Invalid product ID.", 
            success: false
        })
    }


    try {
        // get product from product table
        const product = await productModel.findById(productId).populate("category", "_id");

        if (!product) {
            logger.warn(`Product with ID: ${productId} does not exist`);
            return res.status(404).json({
                message: "Product not found", 
                success: false
            });
        }

        const categoryId = product.category?._id;

        logger.debug(`Delete product with ID: ${productId}`);
        const deleteResponse = await productModel.findByIdAndDelete(productId);

        if (!deleteResponse)
        {
            logger.warn(`product with ID: ${productId} does not exist`);
            return res.status(404).json({ 
                message: "Product not found", 
                success: false 
            });
        }

        logger.info(`Product with ID: ${productId} deleted successfully`);

        await categoryModel.findByIdAndUpdate(categoryId,{ $pull: { products: productId } },{ new: true });
        logger.info(`Product ID: ${productId} removed from category ID: ${categoryId}`);

        return res.status(200).json({
            message: `Product with ID: ${productId} deleted successfully`, 
            success: true
        });

    } catch (error) {
        logger.error(`Error deleting product with ID: ${productId}`);
        return res.status(500).json({
            message: `Delete product with ID: ${productId} failed`, 
            success: false, 
            error: error.message
        });
    }
}

const getProducts = async (req, res) => {
    logger.debug("Incoming request to get all products...");

    const { page = 1, limit = 10 } = req.query;
    
    try {
        // Convert query params to numbers
        const pageNumber = parseInt(page, 10) || 1;
        const limitNumber = parseInt(limit, 10) || 10;
        const skip = (pageNumber - 1) * limitNumber;

        logger.debug("Getting products from the db");
        const products = await productModel
            .find()
            .skip(skip)
            .sort({createdAt: -1})
            .limit(limitNumber)
            .lean()
            .populate("category", "name description -_id");

        logger.info("Products gotten successfully");

        // Count total products
        const totalProducts = await productModel.countDocuments();

        return res.status(200).json({
            message: products.length ? "Products fetched successfully" : "No products found",
            success: true,
            data: products,
            pagination: {
                totalProducts,
                currentPage: pageNumber,
                limit: limitNumber,
                totalPages: Math.ceil(totalProducts / limitNumber),
            }
        });

    } catch (error) {
        logger.error("Error getting all products");
        return res.status(500).json({
            message: "Get all products failed", 
            success: false, 
            error: error.message
        });
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
        return res.status(400).json({
            message: "Invalid product ID.", 
            success: false
        })
    }

    try {
        logger.debug(`Check product with ID: ${productId} in the db`);

        const product = await productModel.findById(productId).populate("category", "name description price category");

        if (!product)
        {
            logger.warn(`Product with ID ${productId} does not exist`);
            return res.status(404).json({
                message: "Product does not exist", 
                success: false
            });
        }

        // Compute product count for this category
        const productCount = await productModel.countDocuments({ category: product.category._id });

        // Merge category with productCount
        const categoryWithCount = {
            ...product.category.toObject(),
            productCount
        };

        // Replace category field in product
        const productResponse = {
            ...product.toObject(),
            category: categoryWithCount
        };

        logger.info(`Product with ID: ${product._id} gotten successful`);

        return res.status(200).json({
            message: "Product successfully fetched", 
            success: true, 
            data: productResponse
        });

    } catch (error) {
        logger.error(`Error getting product with ID: ${error.message}`);
        return res.status(500).json({
            message: `Get product with ID: ${productId} failed`, 
            success: false, 
            error: error.message
        });
    }
}

const getCategories = async (req, res) => {
    logger.info("Incoming request to get categories...");

    const { page = 1, limit = 10 } = req.query;

    try {
        // Convert query params to numbers
        const pageNumber = parseInt(page, 10) || 1;
        const limitNumber = parseInt(limit, 10) || 10;
        const skip = (pageNumber - 1) * limitNumber;

        logger.debug("Getting categories from the db.");
        const categories = await categoryModel
            .find()
            .skip(skip)
            .sort({createdAt: -1, name: 1})
            .limit(limitNumber);

        // Count total categories
        const totalCategories = await categoryModel.countDocuments();

        logger.info("Categories gotten successfully");

        return res.status(200).json({
            message: categories.length ? "Categories fetched successfully" : "No categories found", 
            success: true, 
            data: categories,
            pagination: {
                totalCategories,
                currentPage: pageNumber,
                limit: limitNumber,
                totalPages: Math.ceil(totalCategories / limitNumber),
            }
        });

    } catch (error) {
        logger.error(`Error getting all categories: ${error.message}`);
        return res.status(500).json({
            message: "Failed to fetch categories", 
            success: false, 
            error: error.message
        });
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
        return res.status(400).json({
            message: "Invalid category ID.", 
            success: false
        })
    }

    try {
        logger.debug(`Get category with ID: ${categoryId} in the db`);

        const category = await categoryModel.findById(categoryId);

        if (!category)
        {
            logger.warn(`Category with ID ${categoryId} does not exist`);
            return res.status(404).json({
                message: "Category does not exist", 
                success: false
            });
        }

        logger.info(`Category with ID: ${category._id} gotten successful`);

        return res.status(200).json({
            message: "Category fetched successfully", 
            success: true, 
            data: category
        });

    } catch (error) {
        logger.error(`Error getting category : ${error.message}}`);
        return res.status(500).json({
            message: `Get category with ID: ${categoryId} failed`, 
            success: false, 
            error: error.message
        });
    }
}

const getProductsInCategory = async (req, res) => {
    const {categoryId} = req.params;

    const { page = 1, limit = 10 } = req.query;

    logger.debug(`Incoming request to get all products of category with ID: ${categoryId}`);

    // validate categoryId object
    logger.debug(`Validate category with ID: ${categoryId}`);

    if (!mongoose.Types.ObjectId.isValid(categoryId))
    {
        logger.warn(`Invalid category with ID: ${categoryId}`);
        return res.status(400).json({
            message: "Invalid category ID.", 
            success: false
        })
    }

    // Check if categoryId is in the db
    logger.debug("Checking category in the db...");

    const isCategoryIdValid = await categoryModel.findById(categoryId);

    if (!isCategoryIdValid)
    {
        logger.warn(`Category with ID: ${categoryId} does not exist in the db`);
        return res.status(404).json({
            message: "Category not found.", 
            success: false
        });
    }

    try {
        // Convert query params to numbers
        const pageNumber = parseInt(page, 10) || 1;
        const limitNumber = parseInt(limit, 10) || 10;
        const skip = (pageNumber - 1) * limitNumber;

        logger.debug(`Getting all products with category ID: ${categoryId} from the db`);

        const products = await productModel
            .find({category: categoryId})
            .skip(skip)
            .sort({createdAt: -1})
            .limit(limitNumber)
            .lean()
            .populate("category", "name description");

        // Count total products in category
        const totalProducts = await productModel.countDocuments();

        logger.info("Products gotten successfully");

        return res.status(200).json({
            message: products.length ? "Products fetched successfully" : "No products found", 
            success: true, 
            data: products,
            pagination: {
                totalProducts,
                currentPage: pageNumber,
                limit: limitNumber,
                totalPages: Math.ceil(totalProducts / limitNumber),
            }
        });

    } catch (error) {
        logger.error(`Error getting products: ${error.message}`);
        return res.status(500).json({
            message: "Internal server error while fetching products", 
            success: false, 
            error: error.message 
        });
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
        return res.status(400).json({
            message: "Invalid category ID.", 
            success: false
        })
    }

    // validate productId 
    logger.debug(`Validate product with ID: ${productId}`);

    if (!mongoose.Types.ObjectId.isValid(productId))
    {
        logger.warn(`Invalid product with ID: ${productId}`);
        return res.status(400).json({
            message: "Invalid product ID.", 
            success: false
        })
    }

    // Check if categoryId is in the db
    logger.debug("Checking category in the db...");

    const isCategoryIdValid = await categoryModel.findById(categoryId);

    if (!isCategoryIdValid)
    {
        logger.warn(`Category with ID: ${categoryId} does not exist in the db`);
        return res.status(404).json({
            message: "Category not found.", 
            success: false
        });
    }

    // check if productId is in the db
    logger.debug("Checking product in the db...");

    const isProductIdValid = await productModel.findById(productId);

    if (!isProductIdValid)
    {
        logger.warn(`Product with ID: ${productId} does not exist in the db`);
        return res.status(404).json({
            message: "Product not found.", 
            success: false
        })
    }

    try {
        logger.debug(`Getting product with ID: ${productId}...`);

        const product = await productModel.findOne({category: categoryId, _id: productId});

        if (!product) {
            logger.warn(`Product with ID: ${productId} does not exist`);
            return res.status(404).json({
                message: "Product not found", 
                success: false
            });
        }

        logger.info(`Product ${productId} fetched successfully in category ${categoryId}`);

        return res.status(200).json({
            message: "Product fetched successfully", 
            success: true, 
            data: product});

    } catch (error) {
        logger.error(`Error getting product: ${error.message}`);
        return res.status(500).json({
            message: "Internal server error while fetching products", 
            success: false,
            error: error.message });
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

            return res.status(503).json({
                message: "Cloudinary service unavailable. Try again later.", 
                success: false
            });
        }

        if (categoryImage) {
            logger.debug("Upload category image to cloudinary...")

            const uploadCategoryImageResponse = await cloudinary.uploader.upload(categoryImage.path);

            if (!uploadCategoryImageResponse)
            {
                logger.warn("Upload category image to cloudinary failed. Cloudinary returned no response.");

                return res.status(502).json({
                    message: "Image upload failed. Cloudinary returned no response", 
                    success: false
                });
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
        
        logger.info(`Category created successfully with ID: ${savedCategory._id}`);

        return res.status(201).json({
            message: "Category created successfully", 
            success: true,
            data: savedCategory
        });

    } catch (error) {
        logger.error(`Error creating category with files: ${error.message}`)
        return res.status(500).json({
            message: "Internal server error while creating product", 
            success: false, 
            error: error.message 
        });
    }
}

const updateCategory = async (req, res) => {
    const {categoryId} = req.params;

    logger.info(`Incoming request to update category with ID: ${categoryId}`);

    const categoryBody = {...req.body};

    const categoryImage = req.file;

    // validate categoryId object
    logger.debug(`Validate category with ID: ${categoryId}`);

    if (!mongoose.Types.ObjectId.isValid(categoryId))
    {
        logger.warn(`Invalid category with ID: ${categoryId}`);
        return res.status(400).json({
            message: "Invalid category ID.", 
            success: false
        });
    }

    try {
        // Ensure category exists
        const category = await categoryModel.findById(categoryId);

        if (!category) {
            logger.warn(`Category with ID: ${categoryId} does not exist`);
            return res.status(404).json({ 
                message: "category not found", 
                success: false 
            });
        }

        // Handle optional image upload
        if (categoryImage) {
            logger.debug("Upload category image to cloudinary...")

            const uploadCategoryImageResponse = await cloudinary.uploader.upload(categoryImage.path);
        
            if (!uploadCategoryImageResponse)
            {
                logger.warn("Upload category image to cloudinary failed. Cloudinary returned no response.");
                return res.status(502).json({
                    message: "Image upload failed. Cloudinary returned no response", 
                    success: false
                });
            }
            await fs.unlink(categoryImage.path);

            logger.info("Successfully uploaded category image to cloudinary");

            // add the uploaded image to cloudinary body
            categoryBody["image"] = uploadCategoryImageResponse.secure_url;
        }
        
        logger.debug(`Updating category with ID: ${categoryId} in the DB...`);

        // whitelist fields you allow to be updated
        const allowedFields = ["name", "description", "image"];
        Object.keys(categoryBody).forEach((key) => {
            if (!allowedFields.includes(key)) {
                delete categoryBody[key];
            }
        })
        
        const updateCategoryResponse = await categoryModel.findByIdAndUpdate(categoryId, categoryBody, {new: true, runValidators: true});

        if (!updateCategoryResponse) {
            logger.warn(`Category with ID: ${categoryId} does not exist`);
            return res.status(404).json({
                message: "Category does not exist", 
                success: false
            });
        }

        return res.status(200).json({
            message: "Category updated successfully", 
            success: true, 
            data: updateCategoryResponse
        });

    } catch (error) {
        logger.error(`Error updating category with ID: ${categoryId}`);
        return res.status(500).json({
            message: "Internal server error while updating products", 
            success: false, 
            error: error.message 
        });
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
        return res.status(400).json({
            message: "Invalid category ID.", 
            success: false
        })
    }

    try {
        logger.debug(`Delete category with ID: ${categoryId}`);

        const deleteCategoryResponse = await categoryModel.findByIdAndDelete(categoryId);

        if (!deleteCategoryResponse) {
            logger.warn(`Category with ID: ${categoryId} does not exist`);
            return res.status(404).json({
                message: "Category does not exist", 
                success: false
            });
        }

        return res.status(204).json({
            message: `Delete category with ID: ${categoryId} successful`, 
            success: true
        });

    } catch (error) {
        logger.error(`Error deleting category with ID: ${categoryId}`);
        return res.status(500).json({
            message: `Delete category with ID: ${categoryId} failed`, 
            success: false, 
            error: error.message
        });
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
        return res.status(400).json({
            message: "Invalid order ID.", 
            success: false
        })
    }

    try {
        // whitelist fields
        const allowedFields = ["referenceNumber", "status", "shippingAddress"];
        const updateData = Object.fromEntries(
            Object.entries(orderBody).filter(([key]) => allowedFields.includes(key))
        );

        const updateOrderResponse = await orderModel.findByIdAndUpdate(orderId, {$set: updateData}, {new: true, runValidators: true});

        if (!updateOrderResponse) {
            logger.debug(`Order with ID: ${orderId} cannot be found`);
            return res.status(404).json({ message: "Order not found", success: false });
        }

        logger.info(`Order with ID: ${updateOrderResponse._id} updated successfully`);

        return res.status(200).json({
            message: "Update order successful", 
            success: true, 
            data: updateOrderResponse
        });

    } catch (error) {
        logger.error(`Error updating order with ID: ${orderId}}`);
        return res.status(500).json({
            message: `Update order with ID: ${orderId} failed`, 
            success: false, 
            error: error.message
        });
    }
}

const getAllOrders = async (req, res) => {
    logger.debug(`Incoming request to get order by ${req.query.filter}...`);

    const {userId} = req.user;

    const {page = 1, limit = 10, filterByStatus} = req.query;

    try {
        // Convert query params to numbers
        const pageNumber = parseInt(page, 10) || 1;
        const limitNumber = parseInt(limit, 10) || 10;
        const skip = (pageNumber - 1) * limitNumber;

        // filter by query if query is not empty
        let orders;

        let filter = {};
        if (filterByStatus) {
            filter = filterByStatus.trim();
            filter = filterByStatus.charAt(0).toUpperCase() + filterByStatus.slice(1);
        }

        logger.debug(`Filtering order by ${filterByStatus} by admin ${userId}`);
        if (filterByStatus)
        {
            orders = await orderModel
                .find(filter)
                .skip(skip)
                .sort({createdAt: -1})
                .limit(limitNumber)
                .lean()
                .populate("items.productId", "name price description");;
        }
        else {
            // if query is empty
            orders = await orderModel
                .find()
                .skip(skip)
                .sort({createdAt: -1})
                .limit(limitNumber)
                .lean()
                .populate("items.productId", "name price description");;
        }

        // Count total orders
        const totalOrders = await orderModel.countDocuments(filter);

        return res.status(200).json({
            message: orders.length 
            ? filterByStatus 
                ? `Orders filtered by status: ${filterByStatus}`
                : "All orders received successfully" 
            : "No orders found",
            success: true,
            count: orders.length,
            data: orders,
            pagination: {
                totalOrders,
                currentPage: pageNumber,
                limit: limitNumber,
                totalPages: Math.ceil(totalOrders / limitNumber),
            }
        });

    } catch (error) {
        logger.error("Error getting orders:", error.message);
        return res.status(500).json({
            message: "An error occurred while retrieving orders", 
            success: false, 
            error: error.message
        });
    }
}

const getOrder = async (req, res) => {
    logger.debug("Incoming request to get an order");

    const {orderId} = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId))
    {
        logger.warn(`Invalid order ID: ${orderId}`);
        return res.status(400).json({
            message: "Invalid order ID.", 
            success: false
        })
    }

    try {
        logger.debug(`Fetch order with ID: ${orderId} from the db`);

        const order = await orderModel.findById(orderId).populate("items.productId", "name price description");

        if (!order) {
            logger.warn(`Order with ID: ${orderId} does not exist`);
            return res.status(404).json({
                message: "Order does not exist", 
                success: false
            });
        }

        return res.status(200).json(
            {message: "Order fetched successfully", 
            success: true,
            data: order});

    } catch (error) {
        logger.error("Error getting order:", error.message);
        return res.status(500).json({
            message: "An error occurred while retrieving order", 
            success: false, 
            error: error.message
        });
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
