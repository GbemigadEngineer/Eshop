// ─── POST /api/auth/create-admin (admin only) ───────────────────────────────
const createAdmin = async (req, res, next) => {
  try {
    const { name, email, password, passwordConfirm } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      const error = new Error("User already exists with this email");
      error.statusCode = 400;
      throw error;
    }

    const admin = await User.create({
      name,
      email,
      password,
      passwordConfirm,
      role: "admin",
    });

    res.status(201).json({
      success: true,
      data: {
        id: admin._id,
        eshopId: admin.eshopId,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { registerUser, loginUser, getMe, createAdmin };