import Product from "../models/productModel.js";
import Category from "../models/categoryModel.js";

const addProduct = async (req, res) => {
  const {
    productName,
    salePrice,
    offerPrice,
    stockQuantity,
    size,
    description,
    category,
    brandName,
    mainImage,
    thumbnails,
  } = req.body;

  try {
    const calculatedStock = size.reduce((total, s) => total + s.stock, 0);

    if (calculatedStock !== stockQuantity) {
      return res.status(400).json({
        message: "Mismatch between total stock and size stock quantities",
      });
    }

    const product = await Product.create({
      productName,
      salePrice,
      offerPrice,
      brandName,
      description,
      category,
      stockQuantity,
      size, // Now an array with size and stock
      mainImage,
      thumbnails,
    });

    res.status(200).json({ message: "Product added successfully", product });
  } catch (error) {
    console.error("Error adding product:", error.message);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      price,
      rating,
      sort,
      search,
    } = req.query;

    const filters = {
      status: true, // Ensures only active products are fetched
    };

    if (category && category !== "All") {
      filters.category = category; // Filter by specific category
    }

    // Pagination setup
    const currentPage = parseInt(page, 10) || 1;
    const pageSize = parseInt(limit, 10) || 10;
    const skip = (currentPage - 1) * pageSize;

    // Sorting setup
    let sortOption = {};
    if (sort) {
      if (sort === "price-asc") sortOption.salePrice = 1;
      else if (sort === "price-desc") sortOption.salePrice = -1;
      else if (sort === "rating-desc") sortOption.averageRating = -1;
      else if (sort === "rating-asc") sortOption.averageRating = 1;
      else if (sort === "alphabetical") sortOption.productName = 1;
    }

    if (Object.keys(sortOption).length === 0) {
      sortOption = { _id: 1 }; // Default sorting
    }

    // Search filter
    if (search) {
      filters.productName = { $regex: search, $options: "i" }; // Case-insensitive search
    }

    // Price filter
    if (price) {
      const priceRanges = price.split(",").map((range) => range.trim());
      const priceFilter = [];
      priceRanges.forEach((range) => {
        if (range === "under-100")
          priceFilter.push({ salePrice: { $lt: 100 } });
        else if (range === "100-500")
          priceFilter.push({ salePrice: { $gte: 100, $lte: 500 } });
        else if (range === "500-1000")
          priceFilter.push({ salePrice: { $gte: 500, $lte: 1000 } });
        else if (range === "1000-2000")
          priceFilter.push({ salePrice: { $gte: 1000, $lte: 2000 } });
        else if (range === "above-2000")
          priceFilter.push({ salePrice: { $gt: 2000 } });
      });
      if (priceFilter.length > 0) filters.$or = priceFilter;
    }

    // Aggregation pipeline
    const pipeline = [
      { $match: filters }, // Match active products with the given filters
      {
        $lookup: {
          from: "categories", // Join with categories collection
          localField: "category", // Match on the category field
          foreignField: "category",
          as: "categoryDetails", // Result stored in categoryDetails array
        },
      },
      {
        $addFields: {
          averageRating: { $avg: "$review.rating" }, // Calculate average rating
          effectivePrice: {
            $cond: {
              if: {
                $and: [
                  { $gt: [{ $arrayElemAt: ["$categoryDetails.offer", 0] }, 0] }, // Check if offer exists
                  {
                    $eq: [
                      { $arrayElemAt: ["$categoryDetails.status", 0] },
                      true,
                    ],
                  }, // Ensure category status is true
                ],
              },
              then: {
                $multiply: [
                  "$salePrice",
                  {
                    $subtract: [
                      1,
                      {
                        $divide: [
                          { $arrayElemAt: ["$categoryDetails.offer", 0] },
                          100,
                        ],
                      },
                    ],
                  },
                ],
              },
              else: "$salePrice", // No discount if no valid offer
            },
          },
        },
      },
    ];

    // Apply rating filter if present
    if (rating) {
      const ratingValues = rating.split(",").map((r) => parseInt(r.trim()));
      pipeline.push({
        $match: {
          averageRating: { $in: ratingValues },
        },
      });
    }

    // Add sorting, pagination, and limiting to the pipeline
    pipeline.push({ $sort: sortOption }, { $skip: skip }, { $limit: pageSize });

    // Execute the aggregation pipeline
    const products = await Product.aggregate(pipeline);

    // Count the total number of products
    const totalProductsCountPipeline = [
      { $match: filters },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "category",
          as: "categoryDetails",
        },
      },
      {
        $addFields: {
          averageRating: { $avg: "$review.rating" },
        },
      },
    ];
    const totalProductsCountResult = await Product.aggregate([
      ...totalProductsCountPipeline,
      { $count: "count" },
    ]);
    const totalProductsCount =
      totalProductsCountResult.length > 0
        ? totalProductsCountResult[0].count
        : 0;

    const totalPages = Math.ceil(totalProductsCount / pageSize);

    // Send the response
    res.json({
      data: products,
      pagination: {
        currentPage,
        totalPages,
        pageSize,
        totalProducts: totalProductsCount,
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const toggleProductAvailability = async (req, res) => {
  try {
    const { id } = req.params;

    const { status } = req.body;

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({
      message: "Product availability updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Error updating product availability:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const getDetailsForEdit = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(product);
  } catch (error) {
    console.error("Error fetching product details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateProduct = async (req, res) => {
  try {
    const {
      productName,
      description,
      category,
      brandName,
      stockQuantity,
      salePrice,
      offerPrice,
      size,
      mainImage,
      thumbnails,
    } = req.body;
    console.log("11111111111");

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.productName = productName || product.productName;
    product.description = description || product.description;
    product.category = category || product.category;
    product.brandName = brandName || product.brandName;
    product.stockQuantity = stockQuantity || product.stockQuantity;
    product.salePrice = salePrice || product.salePrice;
    product.offerPrice = offerPrice || product.offerPrice;
    product.size = size || product.size;
    product.mainImage = mainImage || product.mainImage;
    product.thumbnails =
      thumbnails && thumbnails.length > 0 ? thumbnails : product.thumbnails;

    await product.save();

    return res
      .status(200)
      .json({ message: "Product updated successfully", product });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

const addReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment, userId } = await req.body;
    console.log(rating, comment, userId);

    if (!rating || isNaN(rating)) {
      return res
        .status(400)
        .json({ message: "Rating must be a valid number." });
    }

    if (rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ message: "Rating must be between 1 and 5." });
    }

    if (!comment) {
      return res.status(400).json({ message: "Comment is required." });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }
    console.log(userId);

    const newReview = {
      userId,
      rating: parseFloat(rating),
      comment,
      createdAt: new Date(),
    };

    product.review.push(newReview);

    await product.save();

    res.status(200).json({ message: "Review added successfully!", product });
  } catch (error) {
    console.error("Error adding review:", error);
    res
      .status(500)
      .json({ message: "An error occurred while adding the review." });
  }
};

const getReviews = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findById(id).select("review").populate({
      path: "review.userId",
      select: "name",
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(product.review);
  } catch (error) {
    console.error("Error fetching reviews:", error.message);
    res
      .status(500)
      .json({
        message: "An error occurred while fetching reviews",
        error: error.message,
      });
  }
};

const getProductsAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    const products = await Product.find()
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    const totalCount = await Product.countDocuments();

    res.status(200).json({
      products,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalCount / limitNumber),
      totalCount,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const toggleOfferStatus = async (req, res) => {
  const { id } = req.params; // Get product ID from request params

  try {
    // Find the product by ID
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Toggle the offerStatus
    product.offerStatus = !product.offerStatus;

    // Save the updated product
    await product.save();

    res.status(200).json({
      message: "Offer status updated successfully",
      product,
    });
  } catch (error) {
    console.error("Error updating offer status:", error);
    res.status(500).json({
      message: "Failed to update offer status",
      error: error.message,
    });
  }
};

export {
  addProduct,
  getProducts,
  toggleProductAvailability,
  getDetailsForEdit,
  updateProduct,
  addReview,
  getReviews,
  getProductsAdmin,
  toggleOfferStatus,
};
