import express from "express";
import {
  adminLogin,
  getUserList,
  toggleStatus,
  deleteUser,
  refreshTokenHandler,
  getSalesReport,
  downloadPDFReport,
  downloadExcelReport,
  getTopSelling,
} from "../controller/adminController.js";
import { protect } from "../middleware/authMiddleware.js";
import admin from "../middleware/authAdminMiddleware.js";
import {
  addCategory,
  deleteCategory,
  editStatus,
  getCategory,
  listCategory,
} from "../controller/categoryController.js";
import {
  addProduct,
  getDetailsForEdit,
  getProducts,
  getProductsAdmin,
  toggleOfferStatus,
  toggleProductAvailability,
  updateProduct,
} from "../controller/productController.js";
import {
  adminCancelOrder,
  adminUpdateOrderStatus,
  getAllOrders,
} from "../controller/orderController.js";
import {
  addCoupon,
  couponStatus,
  deleteCoupon,
  getCoupons,
} from "../controller/couponController.js";

const admin_routes = express.Router();
admin_routes.use(express.json());

admin_routes.post("/refresh-token-admin", refreshTokenHandler);
admin_routes.post("/login", adminLogin);
admin_routes.get("/userlist", protect, admin, getUserList);
admin_routes.patch("/admin/toggleStatus/:customerId", toggleStatus);
admin_routes.delete("/deleteUser/:customerId", deleteUser);

//category

admin_routes.get("/get-category", protect, admin, getCategory);
admin_routes.post("/add-category", addCategory);
admin_routes.patch("/update-categories/:id", editStatus);
admin_routes.get("/list-category", listCategory);
admin_routes.delete("/delete-categories/:id", deleteCategory);

//Product management

admin_routes.post("/addproduct", addProduct);
admin_routes.get("/get-products", protect, admin, getProductsAdmin);
admin_routes.put("/toggle-product/:id", toggleProductAvailability);
admin_routes.put("/toggle-offer/:id", toggleOfferStatus);
admin_routes.get("/edit-product-details/:id", getDetailsForEdit);
admin_routes.put("/update-product/:id", updateProduct);

//orders managment

admin_routes.get("/get-allorders", protect, admin, getAllOrders);
admin_routes.put("/update-order-status/:orderId", adminUpdateOrderStatus);
admin_routes.put("/cancel-order/:orderId", adminCancelOrder);

//coupon

admin_routes.post("/add-coupon", protect, admin, addCoupon);
admin_routes.get("/get-coupons", getCoupons);
admin_routes.patch("/coupon-status/:id", couponStatus);
admin_routes.delete("/delete-coupon/:id", deleteCoupon);

//dashboard
admin_routes.get("/sales-report", getSalesReport);
admin_routes.get("/sales-report/download-pdf", downloadPDFReport);
admin_routes.get("/sales-report/download-excel", downloadExcelReport);
admin_routes.get("/top-selling", getTopSelling);

export default admin_routes;
