const mongoose = require("mongoose");
const productModel = require("../models/product.model");
const categoryModel = require("../models/category.model");
const logger = require("../utils/logger");
const cloudinary = require("cloudinary");
const fs = require("fs/promises");


const getProducts = async (req, res) => {
    logger.debug("Incoming request to get all products...");
    
    try {
        const getProductsReponse = await productModel.find();

        logger.info("Products gotten successfully");

        return res.status(200).json({message: "Products fetched successfully", success: true, products: getProductsReponse});

    } catch (error) {
        logger.error(`Error getting all products: ${error.message}`);
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

        const getProductResponse = await productModel.findById(productId);

        if (!getProductResponse)
        {
            logger.warn(`Product with ID ${productId} does not exist`);
            return res.status(404).json({message: "Product does not exist"});
        }

        logger.info(`Product with ID: ${getProductResponse._id} gotten successful`);

        return res.status(200).json({message: "Product fetched successfully", success: true, product: getProductResponse});

    } catch (error) {
        logger.error(`Error getting product ${error.message}`);
        return res.status(500).json({message: `Get product with ID: ${productId} failed`});
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

        const getProductsReponse = await productModel.find({category: categoryId});

        logger.info("Products gotten successfully");

        return res.status(200).json({message: "Products fetched successfully", success: true, products: getProductsReponse});

    } catch (error) {
        logger.error(`Error getting all products ${error.message}`);
        return res.status(500).json({message: `Get all products with category ID: ${categoryId} failed`});
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

        logger.info("Product gotten successfully");

        return res.status(200).json({message: "Product fetched successfully", success: true, product: getProductReponse});

    } catch (error) {
        logger.error(`Error getting product ${error.message}`);
        return res.status(500).json({message: `Get product with ID: ${productId} failed`});
    }
}

module.exports = {
    getProducts, 
    getProduct, 
    getProductsInCategory, 
    getProductInCategory
};