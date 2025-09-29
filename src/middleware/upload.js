import multer from "multer";
import path from "path";
import fs from "fs";

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const uploadPath = path.join(process.cwd(), "uploads");

    // Ensure uploads folder exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename(req, file, cb) {
    cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

const upload = multer({ storage });

export default upload;
