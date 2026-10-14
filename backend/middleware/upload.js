const multer = require("multer");

const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const fileFilter = (req, file, cb) => {
  if (ALLOWED.includes(file.mimetype)) return cb(null, true);
  const err = new Error("Only .jpeg, .jpg, .png, and .webp images are allowed");
  err.statusCode = 400;
  cb(err, false);
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
});

module.exports = upload;