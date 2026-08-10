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
      idType: {
        type: String,
        enum: ["nin", "bvn"],
        // no default — stays undefined until the user (or checkout flow) sets it
      },
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
// ─── Validate passwordConfirm matches password ────────────────────────────
userSchema.pre("validate", function () {
  if (this.isModified("password") && this._passwordConfirm !== undefined) {
    if (this.password !== this._passwordConfirm) {
      throw new Error("Passwords do not match");
    }
  }
});

// ─── Generate a unique eshopId before first save ──────────────────────────
userSchema.pre("save", async function () {
  if (!this.isNew) return;

  let unique = false;
  while (!unique) {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const candidateId = `eshop${randomDigits}`;
    const existing = await mongoose.models.User.findOne({
      eshopId: candidateId,
    });
    if (!existing) {
      this.eshopId = candidateId;
      unique = true;
    }
  }
});

// ─── Hash password before saving ──────────────────────────────────────────
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// ─── Virtual field: passwordConfirm (not persisted to DB) ─────────────────
userSchema
  .virtual("passwordConfirm")
  .get(function () {
    return this._passwordConfirm;
  })
  .set(function (value) {
    this._passwordConfirm = value;
  });

// ─── Compare entered password with hashed password in DB ─────────────────
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
