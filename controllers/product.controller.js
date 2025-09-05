const mongoose = require("mongoose");
const productModel = require("../models/product.model");
const categoryModel = require("../models/category.model");
const logger = require("../utils/logger");
const cloudinary = require("cloudinary");
const fs = require("fs/promises");


const getProducts = async (req, res) => {
    logger.debug("Incoming request to get all products...");

    const { page = 1, limit = 10 } = req.query;
    
    try {
        // Convert query params to numbers
        const pageNumber = parseInt(page, 10) || 1;
        const limitNumber = parseInt(limit, 10) || 10;
        const skip = (pageNumber - 1) * limitNumber;

        logger.debug(`Fetching products from the db`);
        const products = await productModel
            .find()
            .skip(skip)
            .sort({createdAt: -1})
            .limit(limitNumber)
            .lean()
            .populate({
                path: "category",
                select: "name description -_id"
            });;

        logger.info("Products fetched successfully");

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
        logger.error(`Error getting all products: ${error.message}`);
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

        const product = await productModel.findById(productId);

        if (!product)
        {
            logger.warn(`Product with ID ${productId} does not exist`);
            return res.status(404).json({
                message: "Product does not exist",
                success: false
            });
        }

        logger.info(`Product with ID: ${product._id} gotten successful`);

        return res.status(200).json({
            message: "Product fetched successfully", 
            success: true, 
            data: product
        });

    } catch (error) {
        logger.error(`Error getting product ${error.message}`);
        return res.status(500).json({
            message: `Get product with ID: ${productId} failed`, 
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

        logger.debug(`Getting all products with category ID: ${categoryId}...`);

        const products = await productModel
            .find({category: categoryId})
            .skip(skip)
            .sort({createdAt: -1})
            .limit(limitNumber)
            .lean();

        // Count total posts
        const totalProducts = await productModel.countDocuments({category: categoryId});

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
        logger.error(`Error getting all products ${error.message}`);
        return res.status(500).json({
            message: `Get all products with category ID: ${categoryId} failed`, 
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

        logger.info("Product gotten successfully");

        return res.status(200).json({
            message: "Product fetched successfully", 
            success: true, 
            data: product
        });

    } catch (error) {
        logger.error(`Error getting product ${error.message}`);
        return res.status(500).json({
            message: `Get product with ID: ${productId} failed`, 
            success: false, 
            error: error.message
        });
    }
}

module.exports = {
    getProducts, 
    getProduct, 
    getProductsInCategory, 
    getProductInCategory
};