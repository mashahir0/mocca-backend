import mongoose from "mongoose"

const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // addressName: { type: String, required: true },
    name: { type: String, required: true },
    landmark: { type: String },
    city: { type: String, required: true },
    town: { type: String, required: true },
    street: { type: String, required: true },
    phone: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    houseno: { type: Number, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
)

const Address = mongoose.model("Address", addressSchema)
export default Address