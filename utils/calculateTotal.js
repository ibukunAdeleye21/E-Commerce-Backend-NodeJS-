const productModel = require("../models/product.model");

const calculateCartTotal = async (items) => {
    let total = 0;
    for (const item of items) {
        const product = await productModel.findById(item.productId).lean();
        if (product) {
            total += product.price * item.quantity;
        }
    }
    return total;
};

module.exports = { calculateCartTotal };