const express = require("express");
const mongoose = require("mongoose");
const logger = require("../utils/logger");
const cloudinary = require("../utils/cloudinary");
const axios = require("axios");
const categoryModel = require("../models/category.model");
const fs = require("fs/promises");


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



module.exports = {getCategories, getCategory};