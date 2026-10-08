const express = require("express");
const router = express.Router();

const UserController = require("../controllers/user.controller");
const verifyToken = require("../middlewares/auth");
const checkEmailVerified = require("../middlewares/checkEmailVerified");
const { validate, userValidationRules } = require("../middlewares/validator");
const {
  uploadFields,
  handleMulterError,
} = require("../middlewares/fileUpload");
const userController = require("../controllers/user.controller");

// ======================= PUBLIC ROUTES =======================

// Register new user with file upload + validation
router.post(
  "/register",
  uploadFields,
  handleMulterError,
  validate(userValidationRules.create),
  // validate,
  UserController.register,
);

// Get ISV USERS

router.get("/isv-users", verifyToken, UserController.getISVusers);
router.get("/partner-users", UserController.getPartnerUsers);

// Sellers (ISV_SELLER role) — paginated list for admin
router.get("/sellers", verifyToken, async (req, res) => {
  try {
    const pool = require('../config/database');
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const { rows } = await pool.query(
      `SELECT id, name, email, mobile, role_type, is_active, created_at FROM users WHERE role_type IN ('ISV_SELLER','AGENT') ORDER BY role_type, name LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const { rows: countRows } = await pool.query(`SELECT COUNT(*) FROM users WHERE role_type IN ('ISV_SELLER','AGENT')`);
    const total = parseInt(countRows[0].count);
    res.json({
      data: rows,
      pagination: { total, page: +page, limit: +limit, total_pages: Math.ceil(total / limit), has_prev: page > 1, has_next: page * limit < total }
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/members", UserController.getMembers);

router.post("/approval", verifyToken, userController.setApprovalStatus);

// Consulting Advisors (AGENT role) — list + approve
router.get("/consulting-advisors", verifyToken, userController.getConsultingAdvisors);
router.post("/consulting-advisors/approve", verifyToken, userController.approveConsultingAdvisor);
router.post(
  "/update-isv-inactive",
  verifyToken,
  userController.setIsvUserInactive,
);
router.post("/delete-isv", verifyToken, userController.deleteISVUser);
// Email verification
router.get("/verify-email", UserController.verifyEmailAndComplete);
router.get("/isv/verify-email", UserController.isvverifyEmailAndComplete);

router.get("/by-role-type", verifyToken, UserController.userbyroletype);
router.get("/get-roles", verifyToken, UserController.getRoleTypes);

router.post("/create/user", verifyToken, UserController.createuser);
router.post("/update/user-role/:id", verifyToken, UserController.updateUserByrole);
router.get("/user-details/:id", verifyToken, UserController.getUserById);
router.post("/delete-user/:id",verifyToken,UserController.deleteUser);
// Resend verification
router.post("/resend-verification", UserController.resendVerificationEmail);

// ======================= PROTECTED ROUTES =======================

// Get user by ID (requires auth + email verification)
router.get("/:id", verifyToken, checkEmailVerified, UserController.getUserById);

router.get("/isv-user/:id", verifyToken, UserController.getIsvDetailByUserId);
router.get(
  "/isv-user/:id/products",
  verifyToken,
  UserController.getIsvDetailWithProductByUserId,
);
router.post(
  "/isv-user/:id/update",
  verifyToken,
  UserController.updateIsvDetailByUserId,
);
// Get all users (requires auth + email verification)
router.get("/", verifyToken, checkEmailVerified, UserController.getAllUsers);
// Update user info (with upload + validation)
router.post(
  "/update/:id",
  verifyToken,
  checkEmailVerified,
  uploadFields,
  handleMulterError,
  validate(userValidationRules.update),
  UserController.updateUser,
);

router.post(
  "/update/isv-by-admin/:id",
  verifyToken,
  uploadFields,
  handleMulterError,
  validate(userValidationRules.update),
  UserController.updateISVUser,
);

// Delete user (requires auth + email verification)
router.get(
  "/:id/delete",
  verifyToken,
  checkEmailVerified,
  UserController.deleteUser,
);

module.exports = router;
