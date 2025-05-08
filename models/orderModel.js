import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    address: {
      name: { type: String, required: true },
      houseno: { type: String, required: true },
      street: { type: String, required: true },
      landmark: { type: String },
      town: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      phone: { type: String, required: true },
    },
    products: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        productName: { type: String, required: true },
        mainImage: [ String ],
        size: { type: String },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true },
        status: {
            type: String,
            enum: ['Pending', 'Cancelled', 'Shipped', 'Delivered','Returned'],
            default: 'Pending', // Default status is "Pending"
          },
          returnReason :{type :String, required : false}
      },
    ],
    paymentMethod: {
      type: String,
      enum: ['Wallet', 'Razor Pay', 'Cash On Delivery'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Completed', 'Failed'],
      default: 'Pending',
    },
    orderStatus: {
      type: String,
      enum: ['Processing', 'Shipped', 'Delivered', 'Cancelled','Returned'],
      default: 'Processing',
    },
    returnReason :{type :String, required : false},
    totalAmount: { type: Number, required: true },
    discountedAmount: { type: Number, required: false }, 
    couponCode: { type: String, required: false }, 
    orderDate: { type: Date, default: Date.now },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt fields
);

const Order = mongoose.model('Order', orderSchema);

export default Order
