const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const logger = require("../utils/logger");
const userModel = require("../models/user.model");

const authentication = async (req, res, next) => {
    try {
        const {token} = req.cookies;

        if (!token)
        {
            logger.warn("No token provided. Please login");
            return res.status(401).json({message: "Please login"});
        }

        logger.debug("Verifying token...");

        const {userId, admin} = jwt.verify(token, process.env.JWT_SECRET);

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            logger.warn("UserId is not valid");
            return res.status(400).json({ message: "Please provide a valid userId" });
        }   

        // Check user in DB
        const user = await userModel.findById(userId).populate("_id");
        if (!user) {
            logger.warn("user not found");
            return res.status(401).json({ message: "User not found or not a writer" });
        }

        // Restrict if user is not admin
        if (user.isAdmin) {
            logger.warn("Unauthorized: User is not an admin");
            return res.status(403).json({ message: "You are not authorized to access this resource" });
        }

        req.user = {userId, admin};
        next();
    } catch (error) {
        logger.warn("Token verification failed");
        return res.status(401).json({ message: "Session expired or token invalid" });
    }
};

const authorization = async (req, res, next) => {
    try {
        const {token} = req.cookies;

        if (!token)
        {
            logger.warn("No token provided. Please login.");
            return res.status(401).json({message: "Please login"});
        }

        logger.debug("Verifying token...");

        const {userId, admin} = jwt.verify(token, process.env.JWT_SECRET);

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            logger.warn("UserId is not valid");
            return res.status(400).json({ message: "Please provide a valid userId" });
        }

        if (!admin) {
            logger.warn(`Access denied for non-admin user: ${userId}`);
            return res.status(403).json({message: "Forbidden. Admin access required."});
        }

        // Check user in DB
        const user = await userModel.findById(userId);
        if (!user || !user.isAdmin) {
            logger.warn(`Access denied for admin: ${userId}`);
            return res.status(401).json({ message: "Access denied" });
        }

        req.user = {userId, admin};
        next();
    } catch (error) {
        logger.warn("Token verification failed");
        return res.status(401).json({ message: "Session expired or token invalid" });
    }
};

module.exports = {authentication, authorization};