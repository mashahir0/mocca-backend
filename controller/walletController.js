import Wallet from "../models/walletModel.js";

const getWalletDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the wallet for the user
    let wallet = await Wallet.findOne({ userId }).populate(
      "userId",
      "name email"
    );

    if (!wallet) {
      // If wallet doesn't exist, create a new one
      wallet = await Wallet.create({ userId, balance: 0, transactions: [] });
      wallet = await Wallet.findOne({ userId }).populate(
        "userId",
        "name email"
      );
    }

    // Get the last 10 transactions in descending order (most recent first)
    const lastTenTransactions = wallet.transactions
      .sort((a, b) => new Date(b.date) - new Date(a.date)) // Sort by date descending
      .slice(0, 10); // Limit to 10 items

    // Respond with wallet details and the filtered transactions
    res.status(200).json({
      user: wallet.userId,
      balance: wallet.balance,
      transactions: lastTenTransactions,
    });
  } catch (error) {
    console.error("Error fetching or creating wallet:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch or create wallet details." });
  }
};

const walletPayment = async (req, res) => {
  try {
    const { userId, totalAmount } = req.body;
    console.log(userId, "from wallet payment", totalAmount);

    if (!userId || !totalAmount) {
      return res
        .status(400)
        .json({ message: "User ID and total amount are required." });
    }

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found." });
    }
    console.log("from wallet payment2222");

    if (wallet.balance < totalAmount) {
      return res.status(400).json({ message: "Not enough balance in wallet." });
    }
    console.log("from wallet payment333");

    wallet.balance -= totalAmount;

    wallet.transactions.push({
      type: "debit",
      amount: totalAmount,
      description: "Payment for order",
    });

    await wallet.save();

    res.status(200).json({ success: true, message: "Payment successful." });
  } catch (error) {
    console.error("Error processing wallet payment:", error);
    res
      .status(500)
      .json({
        message: "Failed to process wallet payment. Please try again later.",
      });
  }
};

export { getWalletDetails, walletPayment };
