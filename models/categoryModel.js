import mongoose from "mongoose";


const CategorySchema = new mongoose.Schema({
    category: {
        type: String,
        required: true
    },
    visibility: {
        type: Boolean,
        default: true
    },
    offer: {
        type: Number,
        required: true
    },
    status: {
        type: Boolean,
        default: true
    },
    description: {
        type: String,
        required: true
    },

},
    {
        timestamps: true
    }
)
const Category = mongoose.model('Category', CategorySchema)
export default Category