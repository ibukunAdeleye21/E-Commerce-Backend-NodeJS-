const { genSalt } = require("bcrypt");
const userModel = require("../models/user.model");
const logger = require("../utils/logger");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const addUser = async (req, res) => {
    const body = req.body;

    logger.info("Incoming request to create user");

    const {email, password, ...others} = body;

    body.email?.trim().toLowerCase();
    logger.debug(`Sanitized email: ${body.email}`);

    // check if email and password are provided
    if (!email || !password) {
        logger.warn("Missing email or password in request");
        return res.status(400).json({
            message: "Please provide either of email or password which is missing",
        });
    };

    // check if email in the database
    const emailExist = await userModel.findOne({email});
    if (emailExist)
    {
        logger.warn(`Email already exists: ${email}`);
        return res.status(409).json({
            message: "The email exist. Please use another email or proceed to sign in",
        });
    };

    try {
        logger.debug("Generating salt for password hashing...")
        const salt = await bcrypt.genSalt(10);
        logger.info("salt generated successfully");

        // hash the password
        logger.debug("Hashing password...");
        const hashedPassword = await bcrypt.hash(password, salt);
        logger.info("Password hashed successfully");

        const newUser = new userModel({
            email,
            password: hashedPassword,
            ...others,
        });
        const savedUser = await newUser.save();

        logger.info(`User created successfully with ID: ${savedUser._id}`);
        return res.status(201).json({ message: "User account created successfully" });
    } catch (error) {
        logger.error(`Error creating user: ${error.message}`);
        return res.status(500).json({ message: "Create user failed" });
    }
}

const login = async (req, res) => {
    const {email, password} = req.body;
    logger.info("Incoming request to login a user");

    // check if email and password is provided
    if (!email || !password) {
        logger.warn("Missing email or password field");
        return res.status(400).json({ message: "Email or password is missing. Please provide" });
    }

    try {
        // get user if email exist in the database
        logger.debug("Looking for user in the DB...");
        const user = await userModel.findOne({ email });

        if (!user) {
            logger.warn("User with provided email not found");
            return res.status(404).json({ message: "Invalid email or password" });
        }

        // compare the password
        logger.debug("Comparing passwords...");
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            logger.warn("Invalid login attempt: password mismatch");
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // create a token
        logger.debug("Creating JWT token...");
        const token = jwt.sign(
            { name: user.name, userId: user._id, admin: user.isAdmin },
            process.env.JWT_SECRET
        );

        logger.debug("Setting auth cookie...");

        return res.cookie("token", token, {
            maxAge: 1000 * 60 * 60,
            secure: true,
            httpOnly: true,
        }).status(200).json({ message: "Login successful" });
  } catch (error) {
        logger.error(`Login failed: ${error.message}`);
        return res.status(500).json({ message: "Login failed. Please try again later." });
  }
}

const addAdmin = async (req, res) => {
    logger.info("Incoming request to add an admin by an admin");
    const body = req.body;

    const { email, password, ...others } = body;

    body.email?.trim().toLowerCase();
    logger.debug(`Sanitized email: ${body.email}`);

    // check if email and password are provided
    if (!email || !password) {
        logger.warn("Missing email or password in request");
        return res.status(400).json({
        message: "Please provide either of email or password which is missing",
        });
    }

    // check if email exist in the database
    const emailExist = await userModel.findOne({ email });
    if (emailExist) {
        logger.warn(`Email already exists: ${email}`);
        return res.status(409).json({
        message:
            "The email exist. Please use another email or proceed to sign in",
        });
    }

    try {
        // hash the password
        // generate the salt
        logger.debug("Generating salt for password hashing...");
        const salt = await bcrypt.genSalt(10);
        logger.info("salt generated successfully");

        // hash the password
        logger.debug("Hashing password...");
        const hashedPassword = await bcrypt.hash(password, salt);
        logger.info("Password hashed successfully");

        const newUser = new userModel({
            email,
            password: hashedPassword,
            isAdmin: true,
            ...others,
        });
        const savedUser = await newUser.save();

        logger.info(`Admin created successfully with ID: ${savedUser._id}`);
        return res.status(201).json({ message: "Admin account created successfully" });
    } catch (error) {
        logger.error(`Error creating Admin: ${error.message}`);
        return res.status(500).json({ message: "Create Admin failed" });
    }
}

module.exports = {addUser, login, addAdmin}