import jwt from "jsonwebtoken";

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, isAdmin: user.isAdmin, tokenVersion: user.tokenVersion },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
};

export default generateToken;
