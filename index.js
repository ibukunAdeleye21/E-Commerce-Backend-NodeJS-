const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const upload = require("./utils/multer");
const dotenv = require("dotenv")
dotenv.config();

const authRoute = require("./routes/auth.route");
const productRoute = require("./routes/product.route");
const categoryRoute = require("./routes/category.route");
const cartRoute = require("./routes/cart.route");
const orderRoute = require("./routes/order.route");
const adminRoute = require("./routes/admin.route");

const app = express();

app.use(express.json());
app.use(cookieParser());

const Port = process.env.PORT || 9000;

app.use(authRoute);
app.use(productRoute);
app.use(categoryRoute);
app.use(cartRoute);
app.use(orderRoute);
app.use(adminRoute);


mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log("connection was successful"))
    .catch(() => console.log("oops something went wrong"));

app.listen(Port, () => {
    console.log(`app is listening on port ${Port}`);
})
