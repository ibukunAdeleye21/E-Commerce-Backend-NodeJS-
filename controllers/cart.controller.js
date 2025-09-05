const cartModel = require("../models/cart.model");
const logger = require("../utils/logger");
const userModel = require("../models/user.model");
const mongoose = require("mongoose");
const productModel = require("../models/product.model");

const createCart = async (req, res) => {
    logger.debug("Incoming request to create cart...")

    const {userId} = req.user;
    const {productId} = req.body;

    // validate productId
    if (!mongoose.Types.ObjectId.isValid(productId))
    {
        logger.warn(`Invalid productId: ${productId}`);
        return res.status(400).json({
            message: "Invalid productId", 
            success: false
        });
    }

    try {
        // check if productId exist in the db
        const isProductIdValid = await productModel.findById(productId);
        if (!isProductIdValid)
        {
            logger.warn(`ProductId: ${productId} does not exist in the db`);
            return res.status(404).json({
                message: `Invalid productId`, 
                success: false
            });
        }

        // check if user has an existing cart 
        logger.debug(`Checking if user with ID: ${userId} has an existing cart.`);
        const userCart = await cartModel.findOne({userId});

        if (userCart)
        {
            logger.debug(`User with ID: ${userId} has an existing cart`);
            // Cart exists → Check if product is already in cart
            const productIndex = userCart.items.findIndex(
                item => item.productId.toString() === productId
            );

            if (productIndex != -1) {
                // If product exists, update quantity
                userCart.items[productIndex].quantity += 1;
                //userCart.items[productIndex].quantity += quantity || 1;
            } else {
                // If product doesn't exist, add new product
                userCart.items.push({ productId, quantity: 1 });
            }
            
            const savedCart = await userCart.save();

            // update user table
            await userModel.findByIdAndUpdate(userId, {cart: savedCart}, {new: true});

            return res.status(200).json({ 
                message: "Cart updated", 
                success: true, 
                data: userCart 
            });
        }
        else {
            logger.debug(`User with ID: ${userId} does not have an existing cart`);
            
            const newUserCart = new cartModel({
                userId, 
                items: [{productId, quantity: 1}]
            });

            await newUserCart.save();
            return res.status(201).json({ 
                message: "Cart created", 
                success: true, 
                data: newUserCart 
            });
        }
    } catch (error) {
        logger.error("Error creating cart:", error.message);
        return res.status(500).json({
            message: "An error occurred while creating cart", 
            success: false, 
            error: error.message
        });
    }
    
}

const getCart = async (req, res) => {
    logger.debug(`Incoming request to get cart...`);

    const {userId} = req.user;

    try {
        logger.debug("Get cart for user");

        const getUserCart = await cartModel.findOne({userId});

        if (!getUserCart)
        {
            logger.warn(`User with ID: ${userId} not found`);
            return res.status(404).json({
                message: "Cart not found", 
                success: false
            });
        }
        logger.info("Get user cart successful");

        return res.status(200).json({
            message: "Cart fetched successfully", 
            success: true, 
            data: getUserCart
        });

    } catch (error) {
        logger.error(`Error getting user cart ${error.message}`);
        return res.status(500).json({
            message: "Get user cart failed", 
            success: false, 
            error: error.message
        });
    }
}

const updateCart = async (req, res) => {
    logger.debug("Incoming request to update user cart.");

    const {userId} = req.user;
    const {productId, quantity} = req.body;

    // check if number in integer
    if (!Number.isInteger(quantity) || quantity < 1) {
        logger.warn("Quantity must be a positive integer");
        return res.status(400).json({ 
            message: "Quantity must be a positive integer", 
            success: false 
        });
    }

    // validate productId
    if (!mongoose.Types.ObjectId.isValid(productId))
    {
        logger.warn(`Invalid productId: ${productId}`);
        return res.status(400).json({
            message: "Invalid productId", 
            success: false
        });
    }

    // check if productId exist in the db
    const isProductIdValid = await productModel.findById(productId);

    if (!isProductIdValid)
    {
        logger.warn(`ProductId: ${productId} does not exist in the db`);
        return res.status(404).json({
            message: `Product not found`, 
            success: false
        });
    }

    // get usercart if cart exist
    const userCart = await cartModel.findOne({userId});

    if (!userCart)
    {
        logger.warn(`user with ID: ${userId} does not have an active cart`);
        return res.status(404).json({
            message: "Cart does not exist", 
            success: false
        });
    }

    // find product in the userCart
    try {
        logger.debug(`Searching for product with ID: ${productId} in userCart`);

        const productIndex = userCart.items.findIndex(
                item => item.productId.toString() === productId
        );
        if (productIndex === -1)
        {
            logger.warn(`Product with ID: ${productId} does not exist in cart`);
            return res.status(404).json({
                message: "Product not in user cart", 
                success: false
            });
        }

        // update the user cart
        userCart.items[productIndex].quantity = quantity;

        await userCart.save();

        return res.status(204).json({
            message: "Cart updated successfully", 
            success: true
        });

    } catch (error) {
        logger.error(`Error updating users cart: ${error.message}`);
        return res.status(500).json({
            message: "Update user cart failed", 
            success: false, 
            error: error.message
        });
    }
}

const removeFromCart = async (req, res) => {
    logger.debug("Incoming request to delete user cart");

    const {userId} = req.user;
    const {productId} = req.body;

    // validate productId
    if (!mongoose.Types.ObjectId.isValid(productId))
    {
        logger.warn(`Invalid productId: ${productId}`);
        return res.status(400).json({
            message: "Invalid productId", 
            success: false
        });
    }

    // check if productId exist in the db
    const isProductIdValid = await productModel.findById(productId);

    if (!isProductIdValid)
    {
        logger.warn(`ProductId: ${productId} does not exist in the db`);
        return res.status(404).json({
            message: `Product not found`, 
            success: false
        });
    }

    // get usercart if cart exist
    const userCart = await cartModel.findOne({userId});

    if (!userCart)
    {
        logger.warn(`user with ID: ${userId} does not have an active cart`);
        return res.status(404).json({
            message: "Cart does not exist", 
            success: false
        });
    }

    try {
        logger.debug(`Searching for product with ID: ${productId} in userCart`);

        const productIndex = userCart.items.findIndex(
                item => item.productId.toString() === productId
        );

        if (productIndex === -1)
        {
            logger.warn(`Product with ID: ${productId} does not exist in cart`);
            return res.status(404).json({
                message: "Product not in user cart", 
                success: false
            });
        }

        // remove product from cart
        logger.debug(`Remove product with ID: ${productId} from cart`);

        userCart.items.splice(productIndex, 1);

        await userCart.save();

        logger.info(`Product with ID: ${productId} removed from cart for user: ${userId}`);

        return res.status(204).json({
            message: "Product removed from cart successfully", 
            success: true
        });

    } catch (error) {
        logger.error(`Error removing product from cart ${error.message}`);
        return res.status(500).json({
            message: "Remove product from user cart failed", 
            success: false, 
            error: error.message
        });
    }
}

module.exports = {createCart, getCart, updateCart, removeFromCart};