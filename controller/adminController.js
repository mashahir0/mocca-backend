import User from "../models/userModel.js";
import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { Parser } from "json2csv";
import pdf from "pdfkit";
dotenv.config();

const key = process.env.JWT_SECRET;

const refreshTokenHandler = async (req, res) => {

  const { refreshToken } = req.body;

  if (!refreshToken)
    return res.status(401).json({ message: "No refresh token provided" });

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN);

    const admin = await User.findById(decoded.id);
    if (!admin || admin.refreshToken !== refreshToken) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "2d" }
    );

    res.json({ adminToken: newAccessToken });
  } catch (error) {
    res.status(403).json({ message: "Invalid or expired refresh token" });
  }
};

const adminLogin = async (req, res) => {
  try {
    const admin = await User.findOne({ email: req.body.email });
    if (!admin) {
      return res.status(401).json({ message: "Email does not match" });
    }

    const adminPass = await bcrypt.compare(req.body.password, admin.password);
    if (!adminPass || admin.role !== "admin") {
      return res.status(401).json({ message: "Password does not match" });
    }

    const adminToken = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      key,
      { expiresIn: "2d" }
    );

    return res.status(201).json({
      message: "Login success",
      adminToken,
      adminDetails: {
        name: admin.name,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};

const getUserList = async (req, res) => {
  try {
    const users = await User.find({ role: "user" });
    if (users && users.length > 0) {
      res.status(200).json({ users, totalCount: users.length });
    } else {
      res.status(200).json({ users: [], totalCount: 0 });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

//Block & Unblock

const toggleStatus = async (req, res) => {
  try {
    const { customerId } = req.params;
    const customer = await User.findById(customerId);

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    customer.status = !customer.status;

    await customer.save();

    res.status(200).json({
      message: `Customer ${
        customer.status ? "unblocked" : "blocked"
      } successfully`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error toggling customer status" });
  }
};

//delete user
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.customerId;

    if (!userId) {
      return res.status(400).json({ message: "Customer ID is required" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await User.findByIdAndDelete(userId);

    return res.status(200).json({ message: "User successfully deleted" });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const getSalesReport = async (req, res) => {
  try {
    const { filter, startDate, endDate } = req.query;
    let query = {};
    let labels = [];
    let salesData = [];

    if (filter === "daily") {
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setUTCHours(23, 59, 59, 999);

      query.orderDate = { $gte: startOfDay, $lt: endOfDay };
      labels = [new Date().toISOString().slice(0, 10)];
    } else if (filter === "weekly") {
      const currentDate = new Date();
      const weekAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);

      query.orderDate = { $gte: weekAgo, $lte: currentDate };

      labels = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(currentDate.getTime() - i * 24 * 60 * 60 * 1000);
        return date.toISOString().slice(0, 10);
      }).reverse();
    } else if (filter === "yearly") {
      const currentYear = new Date().getFullYear();
      const startOfYear = new Date(currentYear, 0, 1);
      const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);

      query.orderDate = { $gte: startOfYear, $lte: endOfYear };

      labels = Array.from({ length: 12 }, (_, i) => {
        return new Date(currentYear, i).toLocaleString("default", {
          month: "short",
        });
      });
    } else if (startDate && endDate) {
      query.orderDate = { $gte: new Date(startDate), $lte: new Date(endDate) };

      const daysDifference =
        (new Date(endDate) - new Date(startDate)) / (24 * 60 * 60 * 1000) + 1;
      labels = Array.from({ length: daysDifference }, (_, i) => {
        const date = new Date(
          new Date(startDate).getTime() + i * 24 * 60 * 60 * 1000
        );
        return date.toISOString().slice(0, 10);
      });
    }

    const orders = await Order.find(query).populate("userId", "name email");

    if (filter === "yearly") {
      const monthlySales = Array(12).fill(0);
      orders.forEach((order) => {
        const orderMonth = new Date(order.orderDate).getMonth();
        monthlySales[orderMonth] += order.totalAmount;
      });
      salesData = monthlySales;
    } else {
      const salesMap = {};
      orders.forEach((order) => {
        const orderDate = new Date(order.orderDate).toISOString().slice(0, 10);
        salesMap[orderDate] = (salesMap[orderDate] || 0) + order.totalAmount;
      });

      // Map labels to salesData
      labels.forEach((label) => {
        salesData.push(salesMap[label] || 0);
      });
    }

    const overallSalesCount = orders.length;
    const overallOrderAmount = orders.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    );
    const overallDiscount = orders.reduce(
      (sum, order) => sum + (order.discountedAmount || 0),
      0
    );

    const reportData = {
      overallSalesCount,
      overallOrderAmount,
      overallDiscount,
      chart: {
        labels,
        data: salesData,
      },
      orders,
    };

    // Send response
    res.status(200).json(reportData);
  } catch (error) {
    console.error("Error generating sales report:", error);
    res.status(500).json({ message: "Failed to generate sales report." });
  }
};

const downloadPDFReport = async (req, res) => {
  try {
    const { filter, startDate, endDate } = req.query;

    let query = {};
    const today = new Date();

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.orderDate = { $gte: start, $lte: end };
    } else if (filter === "daily") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      query.orderDate = { $gte: startOfDay, $lte: endOfDay };
    } else if (filter === "weekly") {
      const startOfWeek = new Date();
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date();
      endOfWeek.setDate(today.getDate() - today.getDay() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      query.orderDate = { $gte: startOfWeek, $lte: endOfWeek };
    }

    const orders = await Order.find(query);

    if (orders.length === 0) {
      res.status(200).send(`No orders found for the selected period.`);
      return;
    }

    const overallSalesCount = orders.length;
    const overallOrderAmount = orders.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    );
    const overallDiscount = orders.reduce(
      (sum, order) => sum + (order.discountedAmount || 0),
      0
    );

    const doc = new pdf({ size: "A4", margin: 40 });
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filter}_sales_report.pdf"`
    );
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    doc
      .fontSize(18)
      .text(
        `${filter.charAt(0).toUpperCase() + filter.slice(1)} Sales Report`,
        {
          align: "center",
          underline: true,
        }
      );
    doc.moveDown(1);
    doc.fontSize(12).text(`Overall Sales Count: ${overallSalesCount}`);
    doc.text(`Overall Order Amount: ₹${overallOrderAmount.toFixed(2)}`);
    doc.text(`Overall Discount: ₹${overallDiscount.toFixed(2)}`);
    doc.moveDown(1);

    const headers = [
      "Order ID",
      "User ID",
      "Total Amount",
      "Discount",
      "Order Date",
    ];
    const columnWidths = [100, 100, 80, 80, 100];
    const tableTop = doc.y;
    const rowHeight = 20;
    const margin = doc.page.margins.left;
    let y = tableTop;

    headers.forEach((header, idx) => {
      doc
        .fontSize(10)
        .text(
          header,
          margin + columnWidths.slice(0, idx).reduce((sum, w) => sum + w, 0),
          y,
          {
            width: columnWidths[idx],
            align: "center",
          }
        );
    });

    doc
      .moveTo(margin, y + rowHeight - 10)
      .lineTo(doc.page.width - margin, y + rowHeight - 10)
      .stroke();
    y += rowHeight;

    orders.forEach((order) => {
      const rowData = [
        order._id,
        order.userId || "N/A",
        `₹${order.totalAmount.toFixed(2)}`,
        `₹${(order.discountedAmount || 0).toFixed(2)}`,
        new Date(order.orderDate).toLocaleDateString(),
      ];

      rowData.forEach((data, idx) => {
        doc
          .fontSize(10)
          .text(
            data,
            margin + columnWidths.slice(0, idx).reduce((sum, w) => sum + w, 0),
            y,
            {
              width: columnWidths[idx],
              align: "center",
              ellipsis: true,
            }
          );
      });

      doc
        .rect(
          margin,
          y,
          columnWidths.reduce((sum, w) => sum + w, 0),
          rowHeight
        )
        .stroke();
      y += rowHeight;

      if (y > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        y = doc.page.margins.top;

        headers.forEach((header, idx) => {
          doc
            .fontSize(10)
            .text(
              header,
              margin +
                columnWidths.slice(0, idx).reduce((sum, w) => sum + w, 0),
              y,
              {
                width: columnWidths[idx],
                align: "center",
              }
            );
        });

        doc
          .moveTo(margin, y + rowHeight - 10)
          .lineTo(doc.page.width - margin, y + rowHeight - 10)
          .stroke();
        y += rowHeight;
      }
    });

    doc.end();
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({ message: "Failed to generate PDF." });
  }
};

const downloadExcelReport = async (req, res) => {
  try {
    const { filter, startDate, endDate } = req.query;

    let query = {};
    const today = new Date();

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.orderDate = { $gte: start, $lte: end };
    } else if (filter === "daily") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      query.orderDate = { $gte: startOfDay, $lte: endOfDay };
    } else if (filter === "weekly") {
      const startOfWeek = new Date();
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date();
      endOfWeek.setDate(today.getDate() - today.getDay() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      query.orderDate = { $gte: startOfWeek, $lte: endOfWeek };
    }

    const orders = await Order.find(query);

    if (orders.length === 0) {
      res.status(200).send(`No orders found for the selected period.`);
      return;
    }

    const overallSalesCount = orders.length;
    const overallOrderAmount = orders.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    );
    const overallDiscount = orders.reduce(
      (sum, order) => sum + (order.discountedAmount || 0),
      0
    );

    const overallData = `\nOverall Sales Count: ${overallSalesCount}\nOverall Order Amount: ₹${overallOrderAmount.toFixed(
      2
    )}\nOverall Discount: ₹${overallDiscount.toFixed(2)}\n`;

    const fields = ["Order ID", "User", "Total Amount", "Discount", "Date"];
    const json2csvParser = new Parser({ fields });

    const csvData = orders.map((order) => ({
      "Order ID": order._id,
      User: order.userId ? order.userId.name : "N/A",
      "Total Amount": `₹${order.totalAmount.toFixed(2)}`,
      Discount: `₹${(order.discountedAmount || 0).toFixed(2)}`,
      Date: order.orderDate.toISOString().split("T")[0],
    }));

    const csv = json2csvParser.parse(csvData);

    const finalCsvData = overallData + csv;

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filter}_sales_report.csv"`
    );
    res.set("Content-Type", "text/csv");
    res.status(200).send(finalCsvData);
  } catch (error) {
    console.error("Error generating Excel report:", error);
    res.status(500).json({ message: "Failed to generate Excel report." });
  }
};



const getTopSelling = async (req, res) => {
  try {
    // Top Selling Products
    const topProductsPipeline = [
      {
        $unwind: "$products", 
      },
      {
        $group: {
          _id: "$products.productId", 
          totalQuantity: { $sum: "$products.quantity" },
        },
      },
      {
        $sort: { totalQuantity: -1 }, 
      },
      {
        $limit: 10, 
      },
      {
        $lookup: {
          from: "products", 
          localField: "_id", 
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $unwind: "$productDetails", 
      },
      {
        $project: {
          _id: 0,
          productId: "$_id",
          productName: "$productDetails.productName",
          category: "$productDetails.category",
          sales: "$totalQuantity",
        },
      },
    ];

    const topProducts = await Order.aggregate(topProductsPipeline);

    // Top Selling Categories
    const topCategoriesPipeline = [
      {
        $unwind: "$products", 
      },
      {
        $lookup: {
          from: "products", 
          localField: "products.productId", 
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $unwind: "$productDetails", 
      },
      {
        $group: {
          _id: "$productDetails.category", 
          totalQuantity: { $sum: "$products.quantity" }, 
        },
      },
      {
        $sort: { totalQuantity: -1 }, 
      },
      {
        $limit: 10, 
      },
      {
        $project: {
          _id: 0,
          categoryName: "$_id",
          sales: "$totalQuantity",
        },
      },
    ];

    const topCategories = await Order.aggregate(topCategoriesPipeline);

    // Response
    res.status(200).json({
      message: "Top selling products and categories fetched successfully!",
      topProducts,
      topCategories,
    });
  } catch (error) {
    console.error("Error fetching top-selling products/categories:", error);
    res.status(500).json({
      message: "Failed to fetch top-selling data. Please try again later.",
    });
  }
};


export {
  adminLogin,
  getUserList,
  toggleStatus,
  deleteUser,
  refreshTokenHandler,
  getSalesReport,
  downloadExcelReport,
  downloadPDFReport,
  getTopSelling,
};
