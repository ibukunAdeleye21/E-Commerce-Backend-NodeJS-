const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Types.ObjectId,
        ref: 'user',
        required: true
    },
    items: [{
        productId: {
            type: mongoose.Types.ObjectId,
            ref: 'product',
        },
        quantity: {
            type: Number,
            default: 1
        }
    }]
}, {timestamps: true});

const cartModel = mongoose.model('cart', cartSchema);

module.exports = cartModel;