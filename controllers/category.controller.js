const express = require("express");
const mongoose = require("mongoose");
const logger = require("../utils/logger");
const cloudinary = require("../utils/cloudinary");
const axios = require("axios");
const categoryModel = require("../models/category.model");
const fs = require("fs/promises");


const getCategories = async (req, res) => {
    logger.info("Incoming request to get categories...");

    const { userId, role } = req.user;
    const { page = 1, limit = 10 } = req.query;

    try {
        // Convert query params to numbers
        const pageNumber = parseInt(page, 10) || 1;
        const limitNumber = parseInt(limit, 10) || 10;
        const skip = (pageNumber - 1) * limitNumber;

        logger.debug("Getting categories from the db");

        const categories = await categoryModel
            .find()
            .skip(skip)
            .sort({createdAt: -1})
            .limit(limitNumber)
            .lean();

        // Count total posts
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

        logger.info(`Category with ID: ${category._id} fetched successful`);

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



module.exports = {getCategories, getCategory};