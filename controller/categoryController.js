import Category from "../models/categoryModel.js";

const addCategory = async (req, res) => {
  try {
    console.log(req.body);

    const {
      category,
      offer,
      visibility = true,
      status = true,
      description,
    } = req.body;
    const exist = await Category.findOne({ category });
    if (exist) {
      return res.status(409).json({ message: "category already exist " });
    }
    const newCategory = new Category({
      category,
      offer,
      visibility,
      status,
      description,
    });
    await newCategory.save();
    res.status(201).json({ message: "new category added " });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "server error" });
  }
};

const getCategory = async (req, res) => {
  try {
    const categories = await Category.find();
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

const listCategory = async (req, res) => {
  try {
    const categories = await Category.find({ visibility: true });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

const editStatus = async (req, res) => {
  const { id } = req.params;
  const { status, visibility, category, description, offer } = req.body;

  try {
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      {
        $set: { status, visibility, category, description, offer },
      },
      { new: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json(updatedCategory);
  } catch (err) {
    res.status(500).json({ message: "Error updating category" });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    await Category.findByIdAndDelete(id);

    res
      .status(200)
      .json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

const categoriesForUser = async (req, res) => {
  try {
    const categories = await Category.find({}, { category: 1 });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export {
  addCategory,
  getCategory,
  editStatus,
  listCategory,
  deleteCategory,
  categoriesForUser,
};
