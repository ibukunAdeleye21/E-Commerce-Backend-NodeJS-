const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    images: [{
        type: String,
        required: true
    }],
    stock: {  // how many you have available
        type: Number,
        default: 0
    },
    category: {
        type: mongoose.Types.ObjectId,
        ref: "category",
        required: true
    }
}, {timestamps: true})

const productModel = mongoose.model("product", productSchema);

module.exports = productModel;