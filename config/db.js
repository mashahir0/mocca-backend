import dotenv from 'dotenv'
dotenv.config()
import mongoose  from 'mongoose';

const mongoURI = process.env.DATABASE_URL;
const connectDB = async ()=>{
    try {
        await mongoose.connect(mongoURI);
          console.log("Connected to MongoDB");
    } catch (error) {
        console.error("MongoDB connection error:", error);
    }
}
export default connectDB;
