const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a name"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address",
      ],
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    idType: {
      type: String,
      enum: ["nin", "bvn"],
      default: "nin",
    },
    idNumber: {
      type: String,
      trim: true,
    },
    eshopId: {
      type: String,
      unique: true,
    },
  },
  { timestamps: true }
);

// ─── Virtual field: passwordConfirm (not persisted to DB) ─────────────────
userSchema
  .virtual("passwordConfirm")
  .get(function () {
    return this._passwordConfirm;
  })
  .set(function (value) {
    this._passwordConfirm = value;
  });

// ─── Validate passwordConfirm matches password ────────────────────────────
userSchema.pre("validate", function (next) {
  if (this.isModified("password") && this._passwordConfirm !== undefined) {
    if (this.password !== this._passwordConfirm) {
      return next(new Error("Passwords do not match"));
    }
  }
  next();
});

// ─── Generate a unique eshopId before first save ──────────────────────────
userSchema.pre("save", async function (next) {
  if (!this.isNew) return next();

  let unique = false;
  while (!unique) {
    const randomDigits = Math.floor(100000 + Math.random() * 900000); // 6 digits
    const candidateId = `eshop${randomDigits}`;
    const existing = await mongoose.models.User.findOne({
      eshopId: candidateId,
    });
    if (!existing) {
      this.eshopId = candidateId;
      unique = true;
    }
  }
  next();
});

// ─── Hash password before saving ──────────────────────────────────────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Compare entered password with hashed password in DB ─────────────────
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
