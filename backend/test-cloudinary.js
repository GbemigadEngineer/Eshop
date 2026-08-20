// test-cloudinary.js (project root)
require("dotenv").config();
console.log("Cloud name:", JSON.stringify(process.env.CLOUDINARY_CLOUD_NAME));
console.log("API key:", JSON.stringify(process.env.CLOUDINARY_API_KEY));
console.log("API secret length:", process.env.CLOUDINARY_API_SECRET?.length);
console.log(
  "API secret first/last char:",
  process.env.CLOUDINARY_API_SECRET?.[0],
  process.env.CLOUDINARY_API_SECRET?.[
    process.env.CLOUDINARY_API_SECRET.length - 1
  ]
);
const cloudinary = require("./config/cloudinary");

console.log("Testing with cloud name:", process.env.CLOUDINARY_CLOUD_NAME);

cloudinary.uploader.upload(
  "https://res.cloudinary.com/demo/image/upload/sample.jpg",
  { folder: "eshop/test" },
  (error, result) => {
    if (error) {
      console.error("❌ Cloudinary error:", JSON.stringify(error, null, 2));
    } else {
      console.log("✅ Upload successful:", result.secure_url);
    }
  }
);
