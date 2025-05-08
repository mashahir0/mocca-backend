import Wishlist from "../models/wishlistModel.js";
import Product from "../models/productModel.js";
import User from "../models/userModel.js";
import Category from "../models/categoryModel.js";

const addToWishlist = async (req, res) => {
  try {
    const productId = req.params.productId;
    const userId = req.params.userId;
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "product not found" });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }
    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        userId: userId,
        items: [productId],
      });
    } else {
      if (!wishlist.items.includes(productId)) {
        wishlist.items.push(productId);
        await wishlist.save();
      } else {
        return res
          .status(400)
          .json({ message: "Product is already in the wishlist." });
      }
    }

    res
      .status(201)
      .json({ message: "Product added to wishlist successfully.", wishlist });
  } catch (error) {
    console.log(error);
  }
};


  

const getWishListProducts = async (req, res) => {
  try {
    const userId = req.params.id;

    const wishlist = await Wishlist.findOne({ userId }).populate({
      path: 'items',
      model: 'Product',
      populate: {
        path: 'review',
      },
    });

    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    const productsWithRatings = await Promise.all(
      wishlist.items.map(async (product) => {
        const {
          _id,
          productName,
          salePrice,
          offerPrice,
          mainImage,
          offerStatus,
          category,
          review,
        } = product;

        let finalPrice = salePrice;

        // Fetch the category and check its offer status
        const categoryDetails = await Category.findOne({ category });

        if (offerStatus) {
          // If product's offer status is true, use the product's offer price
          finalPrice = offerPrice;
        } else if (categoryDetails?.status && categoryDetails?.offer > 0) {
          // If category's offer status is true, calculate the category discount
          const categoryDiscount = (salePrice * categoryDetails.offer) / 100;
          finalPrice = salePrice - categoryDiscount;
        }

        const averageRating =
          review.length > 0
            ? review.reduce((sum, r) => sum + (r.rating || 0), 0) / review.length
            : 0;

        return {
          id: _id,
          name: productName,
          finalPrice: Math.floor(finalPrice), // Rounded down price
          salePrice,
          offerPrice,
          averageRating,
          image: mainImage[0],
        };
      })
    );

    return res.status(200).json({ products: productsWithRatings });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch wishlist products' });
  }
};

  //remove from wishlist 

  const removeFromWishlist = async (req, res) => {
    try {
      const { userId, productId } = req.params; 
        
     
      const updatedWishlist = await Wishlist.findOneAndUpdate(
        { userId }, 
        { $pull: { items: productId } },
        { new: true }
      );
  
      if (!updatedWishlist) {
        return res.status(404).json({ message: 'Wishlist not found' });
      }
  
      return res.status(200).json({ message: 'Product removed from wishlist', wishlist: updatedWishlist });
    } catch (error) {
      console.error('Error removing product from wishlist:', error);
      return res.status(500).json({ error: 'Failed to remove product from wishlist' });
    }
  };
  

export { addToWishlist,getWishListProducts , removeFromWishlist};
