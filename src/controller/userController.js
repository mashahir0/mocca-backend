import User from ".././models/userModel.js";
import bcrypt from "bcryptjs";
import Order from "../models/orderModel.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import Product from "../models/productModel.js";
import Category from "../models/categoryModel.js";
import Address from "../models/addressModel.js";
import { OAuth2Client } from "google-auth-library";
dotenv.config();

const key = process.env.JWT_SECRET;
const refreshTokenKey = process.env.REFRESH_TOKEN;

const CLIENT_ID = process.env.CLIENT_ID;
const client = new OAuth2Client(CLIENT_ID);

const googleLogin = async (req, res) => {
  const { tokenId } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: tokenId,
      audience: CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub, email, name, picture } = payload;

    const userExist = await User.findOne({ email });
    if (!userExist) {
      return res.status(409).json({ message: "Email not registered" });
    }

    if (userExist.status === false) {
      return res
        .status(403)
        .json({ message: "Your account is blocked. Please contact support." });
    }

    let user = await User.findOne({ googleId: sub });

    if (!user) {
      user = await User.findOne({ email });
      user.googleId = sub;
      user.picture = picture;
      await user.save();
    }

    const accessToken = jwt.sign({ id: email }, key, { expiresIn: "1d" });

    const refreshToken = jwt.sign({ id: email }, key, { expiresIn: "7d" });

    res.status(200).json({
      success: true,
      message: "User logged in successfully",
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      success: false,
      message: "Google login failed",
      error: error.message,
    });
  }
};

// const refreshAccessToken = (req, res) => {
//     const { refreshToken } = req.body;
//     if (!refreshToken) return res.status(401).json({ message: 'No refresh token provided' });

//     jwt.verify(refreshToken, refreshTokenKey, (err, user) => {
//         if (err) return res.status(403).json({ message: 'Invalid refresh token' });

//         const newAccessToken = jwt.sign(
//             { id: user.id, email: user.email },
//             key,
//             { expiresIn: '1d' }
//         );

//         res.json({ accessToken: newAccessToken });
//     });
// };
const refreshAccessToken = (req, res) => {
  const { refreshToken } = req.body;
  console.log("user refresh token");

  if (!refreshToken)
    return res.status(401).json({ message: "No refresh token provided" });
  console.log("1");

  jwt.verify(refreshToken, refreshTokenKey, (err, user) => {
    if (err)
      return res
        .status(403)
        .json({ message: "Invalid or expired refresh token" });
    console.log("2");
    // Generate new tokens
    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email },
      key,
      { expiresIn: "1d" } // Same as in login
    );

    const newRefreshToken = jwt.sign(
      { id: user.id, email: user.email },
      refreshTokenKey,
      { expiresIn: "7d" }
    );
    console.log("3");

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  });
};

const registerUser = async (req, res) => {
  try {
    const user = new User({
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      password: req.body.password,
    });
    console.log(user);

    await user.save();
    return res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error registering user", error });
  }
};

const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const accessToken = jwt.sign({ id: user._id, email: user.email }, key, {
      expiresIn: "1d",
    });

    const refreshToken = jwt.sign(
      { id: user._id, email: user.email },
      refreshTokenKey,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "User logged in successfully",
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const getProductDetails = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch active products from Product collection
    const products = await Product.find({ status: true })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const productsWithDetails = await Promise.all(
      products.map(async (product) => {
        const category = await Category.findOne({
          _id: product.category,
        }).select("offer status");

        const isCategoryActive =
          category?.status === true && category?.offer > 0;

        const effectivePrice = isCategoryActive
          ? product.salePrice * (1 - category.offer / 100)
          : product.salePrice;

        const totalReviews = product.review?.length || 0;
        const totalRating = product.review
          ? product.review.reduce(
              (sum, review) => sum + (review.rating || 0),
              0
            )
          : 0;
        const averageRating =
          totalReviews > 0 ? (totalRating / totalReviews).toFixed(1) : null;

        return {
          ...product,
          effectivePrice,
          averageRating,
          offer: isCategoryActive ? category.offer : null,
        };
      })
    );

    const totalProducts = await Product.countDocuments({ status: true });
    const totalPages = Math.ceil(totalProducts / limit);

    res.status(200).json({
      success: true,
      data: productsWithDetails,
      pagination: {
        currentPage: page,
        totalPages,
        totalProducts,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching product details:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const showProductDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Fetch the category details using the category name from the product
    const category = await Category.findOne({ category: product.category });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Check if the category status is active and the offer is greater than 0
    const isCategoryActive = category?.status === true && category?.offer > 0;

    // If the category is active, apply the discount to the salePrice
    const effectivePrice = isCategoryActive
      ? product.salePrice * (1 - category.offer / 100) // Apply the discount percentage from the category
      : product.salePrice;

    // Calculate reviews and average rating
    const totalReviews = product.review.length;
    const totalRating = product.review.reduce(
      (sum, review) => sum + (review.rating || 0),
      0
    );
    const averageRating =
      totalReviews > 0 ? (totalRating / totalReviews).toFixed(1) : null;

    // Send the response including the calculated effective price and category details
    res.status(200).json({
      ...product.toObject(),
      effectivePrice, // Include the calculated discounted price
      averageRating, // Include the average rating
      category: {
        category: category.category, // Include category name
        offer: category.offer, // Include offer percentage
        description: category.description, // Include category description
        status: category.status, // Include category status
      },
    });
  } catch (error) {
    console.error("Error fetching product details:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

//for profile

const getUserDetails = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const { name, email, phone, image } = req.body;
    const userId = req.params.id;

    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser._id.toString() !== userId) {
      return res.status(409).json({ message: "Email already exists" });
    }

    if (!name || !email || !phone) {
      return res
        .status(400)
        .json({ message: "Name, email, and phone are required" });
    }

    const updatedUser = await User.findByIdAndUpdate(userId, {
      name,
      email,
      phone,
      profileImage: image,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Server error, please try again later" });
  }
};

const changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (newPassword.trim() !== confirmPassword.trim()) {
      return res
        .status(400)
        .json({ message: "New password and confirm password do not match" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error during password change:", error.message);
    res.status(500).json({ message: "Server error, please try again later" });
  }
};

const changeNewPass = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.password = password;
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Server error, please try again later" });
  }
};

const addAddress = async (req, res) => {
  try {
    const {
      userId,
      name,
      mobile,
      pincode,
      houseNo,
      landmark,
      city,
      town,
      street,
      state,
    } = req.body;

    if (
      !userId ||
      !name ||
      !mobile ||
      !pincode ||
      !houseNo ||
      !city ||
      !state
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newAddress = new Address({
      userId,
      name,
      phone: mobile,
      pincode,
      houseno: houseNo,
      landmark,
      city,
      town,
      street,
      state,
    });

    await newAddress.save();
    res
      .status(201)
      .json({ message: "Address added successfully", address: newAddress });
  } catch (error) {
    console.error("Error adding address:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getUserAddresses = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required." });
    }

    const addresses = await Address.find({ userId });

    res.status(200).json(addresses);
  } catch (error) {
    console.error("Error fetching addresses:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    await Address.findByIdAndDelete(addressId);
    res.status(200).json({ message: "Address deleted successfully!" });
  } catch (error) {
    console.error("Error deleting address:", error);
    res.status(500).json({ error: "Failed to delete address." });
  }
};

// Set Default Address
const setDefaultAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const { userId } = req.body;

    await Address.updateMany({ userId }, { isDefault: false });

    await Address.findByIdAndUpdate(addressId, { isDefault: true });

    res.status(200).json({ message: "Default address updated successfully!" });
  } catch (error) {
    console.error("Error setting default address:", error);
    res.status(500).json({ error: "Failed to set default address." });
  }
};

const getDefaultAddress = async (req, res) => {
  try {
    const userId = req.params.id;

    const defaultAddress = await Address.findOne({ userId, isDefault: true });

    if (!defaultAddress) {
      return res.status(404).json({ message: "Default address not found" });
    }

    res.status(200).json(defaultAddress);
  } catch (error) {
    console.error("Error fetching default address:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const searchSuggestion = async (req, res) => {
  try {
    const searchTerm = req.query.q;

    if (!searchTerm || searchTerm.trim() === "") {
      return res.status(400).json({ message: "Search term is required." });
    }

    const suggestions = await Product.find({
      productName: { $regex: searchTerm, $options: "i" },
      status: true,
    })
      .select("productName mainImage salePrice") // Return relevant fields only
      .limit(10); // Limit the number of suggestions

    res.status(200).json(suggestions);
  } catch (error) {
    console.error("Error fetching search suggestions:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getTopSellingProducts = async (req, res) => {
  try {
    const orders = await Order.find();

    const productSalesMap = {};
    orders.forEach((order) => {
      order.products.forEach((productItem) => {
        const { productId, quantity } = productItem;
        if (!productSalesMap[productId]) {
          productSalesMap[productId] = quantity;
        } else {
          productSalesMap[productId] += quantity;
        }
      });
    });

    const topProducts = await Promise.all(
      Object.entries(productSalesMap)
        .sort(([, salesA], [, salesB]) => salesB - salesA)
        .slice(0, 3)
        .map(async ([productId, sales]) => {
          const product = await Product.findById(productId);
          if (!product) return null;

          const category = await Category.findOne({
            category: product.category,
          });

          // Calculate the final price based on product or category offer
          let finalPrice = product.salePrice;
          if (product.offerStatus) {
            finalPrice = product.offerPrice;
          } else if (category && category.status && category.offer > 0) {
            finalPrice =
              product.salePrice - product.salePrice * (category.offer / 100);
          }

          // Calculate average rating
          const totalRatings = product.review.reduce(
            (sum, review) => sum + review.rating,
            0
          );
          const ratingCount = product.review.length;
          const averageRating =
            ratingCount > 0 ? (totalRatings / ratingCount).toFixed(1) : 0;

          return {
            id: product._id,
            name: product.productName,
            image: product.mainImage[0] || "",
            price: product.salePrice,
            finalPrice: finalPrice.toFixed(2), // Include the calculated final price
            sales,
            averageRating,
            sizes: product.size.map((size) => size.name), // Include available sizes
          };
        })
    );

    const filteredProducts = topProducts.filter((product) => product !== null);

    res.status(200).json({
      message: "Top selling products fetched successfully!",
      topProducts: filteredProducts,
    });
  } catch (error) {
    console.error("Error fetching top selling products:", error);
    res.status(500).json({ message: "Failed to fetch top selling products" });
  }
};

const getOfferProducts = async (req, res) => {
  try {
    // Fetch six products where offerStatus is true
    const products = await Product.find({ offerStatus: true, status: true }) // Filter by active products and offer status
      .sort({ createdAt: -1 }) // Sort by the most recently added
      .limit(6); // Limit to six products

    // Format the response to include only necessary fields
    const formattedProducts = products.map((product) => ({
      id: product._id,
      name: product.productName,
      description: product.description,
      offerPrice: product.offerPrice,
      salePrice: product.salePrice,
      image: product.mainImage[0] || "", // Use the first image as the main image
    }));

    res.status(200).json({
      message: "Offer products fetched successfully!",
      products: formattedProducts,
    });
  } catch (error) {
    console.error("Error fetching offer products:", error);
    res.status(500).json({ message: "Failed to fetch offer products" });
  }
};

export {
  registerUser,
  userLogin,
  refreshAccessToken,
  getProductDetails,
  showProductDetails,
  googleLogin,
  getUserDetails,
  updateUserProfile,
  changePassword,
  changeNewPass,
  addAddress,
  getUserAddresses,
  setDefaultAddress,
  deleteAddress,
  getDefaultAddress,
  searchSuggestion,
  getTopSellingProducts,
  getOfferProducts,
};
