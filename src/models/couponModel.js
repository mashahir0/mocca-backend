import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    code: {
        type: String,  // Fixed typo here
        required: true,
        unique: true,
    },
    discount: {
        type: Number,
        required: true,
    },
    minPurchaseAmount: {  // Fixed typo here
        type: Number,
        required: true,
    },
    maxDiscountAmount: {
        type: Number,
        required: true,
    },
    validFrom: {
        type: Date,
        required: true,
    },
    validTo: {
        type: Date,
        required: true,
    },
    visibility: {
        type: Boolean,
        default: true,  // Fixed default value to a boolean
    },
}, {
    timestamps: true
}

);

const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;
