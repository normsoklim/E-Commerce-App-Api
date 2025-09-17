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
    const { name, email, password, isAdmin } = req.body; // <- use isAdmin

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: "User already exists" });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      isAdmin: isAdmin || false, // default to false if not provided
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        token: generateToken(user._id), // pass user ID to token
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
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
