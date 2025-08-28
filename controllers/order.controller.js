const orderModel = require("../models/order.model");
const mongoose = require("mongoose");
const userModel = require("../models/user.model");
const cartModel = require("../models/cart.model");
const productModel = require("../models/product.model");
const logger = require("../utils/logger");
const generateReference = require("../utils/generateReference");


const createOrder = async (req, res) => {
    logger.debug("Incoming request to create order...");

    const {userId} = req.user;
    const {cartId, shippingAddress} = req.body;

    // validate cartId 
    if (!mongoose.Types.ObjectId.isValid(cartId))
    {
        logger.warn(`Invalid cartId: ${cartId}`);
        return res.status(400).json({message: "Invalid cartId"});
    }

    // check if cartId exist in the db
    const isCartIdValid = await cartModel.findById(cartId);

    if (!isCartIdValid)
    {
        logger.warn(`CartId: ${cartId} does not exist in the db`);
        return res.status(404).json({message: "Cart does not exist"});
    }

    // Fetch user's cart
    const userCart = await cartModel.findOne({_id: cartId, userId}).populate("items.productId");

    if (!userCart || userCart.items.length === 0) {
        logger.warn(`Cart for user ${userId} is empty or does not exist`);
        return res.status(404).json({ message: "Cart is empty" });
    }

    try {
        // calculate total amount
        let totalAmount = 0;
        userCart.items.forEach(item => {
            totalAmount += item.productId.price * item.quantity;
        });

        // Create order
        logger.debug(`Creating a new order for user with ID: ${userId}`);

        const newOrder = new orderModel({
            userId,
            items: userCart.items.map(item => ({
                productId: item.productId._id,
                quantity: item.quantity
            })),
            referenceNumber: generateReference(),
            totalAmount,
            shippingAddress
        });

        const savedOrder = await newOrder.save();

        // update the product stock
        logger.debug("Updating the product stock");

        console.log(`UserCart: ${userCart}`);
        console.log(`CartItems: ${userCart.items}`);

        for (const item of userCart.items) {
            const productResponse = await productModel.findById(item.productId._id);

            if (!productResponse) {
                logger.warn(`Product with ID: ${item.productId._id} not found`);
                continue;
            }

            await productModel.findByIdAndUpdate(item.productId._id, {stock: productResponse.stock - item.quantity}, {new: true});
        }

        // Clear the cart after order is placed
        logger.debug("Clearing user's cart...");
        userCart.items = [];
        await userCart.save();

        // modify the user table
        await userModel.findByIdAndUpdate(userId, {$push: {orders: savedOrder._id}}, {new: true});

        logger.info(`Order created for user ${userId} with ID: ${newOrder._id}`);

        return res.status(201).json({
            message: "Order placed successfully",
            orderId: newOrder._id
        });
    } catch (error) {
        logger.error(`Error creating order for user: ${error.message}`)
        return res.status(500).json({message: "Create order failed"})
    }    
}

const getUserOrders = async (req, res) => {
    logger.debug("Incoming request to get order");

    const {userId} = req.user;

    try {
        logger.debug(`Get user with ID: ${userId} orders`);

        const getOrders = await orderModel.find({userId});

        return res.status(200).json({message: "User orders fetched successfully", success: true, orders: getOrders});

    } catch (error) {
        logger.error(`Error getting user orders ${error.message}`);
        return res.status(500).json({message: "Get user orders failed"});
    }
}

const getUserOrder = async (req, res) => {
    logger.debug("Incoming request to get user order");

    const {userId} = req.user;
    const {orderId} = req.params;

    // validate orderId
    if (!mongoose.Types.ObjectId.isValid(orderId))
    {
        logger.warn(`Invalid orderId: ${orderId}`);
        return res.status(400).json({message: "Invalid orderId"});
    }

    try {
        // get user order if orderId exist
        const getOrder = await orderModel.findById(orderId).populate("items.productId", "name price description");

        if (!getOrder)
        {
            logger.warn(`Invalid order with ID: ${orderId}`);
            return res.status(404).json({message: "Invalid order ID"});
        }

        return res.status(200).json({message: "User order fetched successfully", success: true, order: getOrder});

    } catch (error) {
        logger.error(`Error getting user order: ${error.message}`);
        return res.status(500).json({message: "Get user order failed"});
    }
}

module.exports = {createOrder, getUserOrders, getUserOrder};