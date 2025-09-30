import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import bcrypt from "bcryptjs";
// Login user
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      isAdmin: user.isAdmin,
      token: generateToken(user._id),
    });
  } else {
    res.status(401).json({ message: "Invalid email or password" });
  }
};


// Register user
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, isAdmin } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please provide name, email, and password" });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // If file uploaded
    const avatarPath = req.file ? `/uploads/${req.file.filename}` : "";

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      avatar: avatarPath,
      isAdmin: isAdmin || false,
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      isAdmin: user.isAdmin,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Logout from all devices
export const logoutAllDevices = async (req, res) => {
  const user = await User.findById(req.user.id); // req.user from JWT middleware
  if (!user) return res.status(404).json({ message: "User not found" });

  user.tokenVersion += 1; // increment tokenVersion to invalidate all existing tokens
  await user.save();

  res.json({ message: "Logged out from all devices successfully" });
};

// @desc Get profile
export const getUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    res.json({ _id: user._id, name: user.name, email: user.email });
  } else {
    res.status(404).json({ message: "User not found" });
  }
};

// @desc Update profile
export const updateUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
   
    if (req.body.password) user.password = req.body.password;
     if (req.file) user.avatar = `/uploads/avatars/${req.file.filename}`;
    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      token: generateToken(updatedUser._id),
    });
  } else {
    res.status(404).json({ message: "User not found" });
  }
};
