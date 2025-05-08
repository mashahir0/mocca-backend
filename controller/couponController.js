import Coupon from "../models/couponModel.js";
import Product from "../models/productModel.js";

const addCoupon = async (req, res) => {
  try {
    const {
      name,
      code,
      discount,
      minPurchaseAmount,
      maxDiscountAmount,
      validFrom,
      validTo,
      status,
    } = req.body;
    console.log("111");

    // Create a new coupon document
    const coupon = new Coupon({
      name,
      code,
      discount,
      minPurchaseAmount,
      maxDiscountAmount,
      validFrom,
      validTo,
      visibility: status,
    });

    // Save coupon to database
    await coupon.save();
    res.status(201).json({ message: "Coupon added successfully", coupon });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error adding coupon", error });
  }
};

const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find();

    if (!coupons) {
      res.status(401).json({ message: "no couponce found" });
    }
    res.status(200).json(coupons);
  } catch (error) {
    console.log(error);
  }
};

const couponStatus = async (req, res) => {
  try {
    const id = req.params.id;

    if (!id) {
      res.status(404).json({ message: "coupon not available" });
    }

    const coupon = await Coupon.findOne({ _id: id });
    coupon.visibility = !coupon.visibility;
    await coupon.save();
    res
      .status(200)
      .json({
        message: `coupon status changed to ${
          coupon.visibility ? "active" : "not-active"
        }`,
      });
  } catch (error) {
    console.log(error);
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      res.status(404).json({ message: "coupon id not found" });
    }

    const coupon = await Coupon.findById(id);
    if (!coupon) {
      res.status(404).json({ message: "coupon not found" });
    }

    await Coupon.findByIdAndDelete(id);
    res.status(200).json({ message: "coupon deleted successfully" });
  } catch (error) {}
};

const listCouponUserSide = async (req, res) => {
  try {
    const coupons = await Coupon.find({ visibility: true });

    if (!coupons) {
      res.status(401).json({ message: "no couponce found" });
    }
    res.status(200).json(coupons);
  } catch (error) {
    console.log(error);
  }
};

export {
  addCoupon,
  getCoupons,
  couponStatus,
  deleteCoupon,
  listCouponUserSide,
};
