const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
    name: {
        type: String, 
        required: true
    },
    description: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    products: [{
        type: mongoose.Types.ObjectId,
        ref: 'product'
    }]
}, {timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true }} );

// Virtual field for product count
categorySchema.virtual("productCount").get(function() {
    return this.products ? this.products.length : 0;
});

const categoryModel = mongoose.model("category", categorySchema);

module.exports = categoryModel;