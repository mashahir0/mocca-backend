


import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  rating: { type: Number, required: false },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const productSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  brandName: { type: String, required: true },
  salePrice: { type: Number, required: true },
  offerPrice: { type: Number, required: true },
  offerStatus:{type:Boolean, required: true, default : false},
  stockQuantity: { type: Number, required: true },
  size: [
    {
      name: { type: String, required: true },
      stock: { type: Number, required: true },
    },
  ],
  review: { type: [reviewSchema], default: [] }, // Embedded review schema
  status: { type: Boolean, default: true },
  mainImage: { type: [String], required: true },
  thumbnails: { type: [String], required: true },
});

const Product = mongoose.model("Product", productSchema);
export default  Product;

