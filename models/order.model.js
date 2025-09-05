const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Types.ObjectId,
        ref: 'user',
        required: true
    },
    items: [{
        productId: {
            type: mongoose.Types.ObjectId,
            ref: "product",
            required: true
        },
        quantity: {
            type: Number,
            required: true
        }
    }],
    referenceNumber: {
        required: true,
        type: String
    },
    totalAmount: Number,
    status: {
        type: String,
        enum: ["Pending", "Processing", "Shipped", "Delivered"],
        default: "Pending"
    },
    shippingAddress: {
        type: String
    },
}, {timestamps: true});

const orderModel = mongoose.model("order", orderSchema);

module.exports = orderModel;