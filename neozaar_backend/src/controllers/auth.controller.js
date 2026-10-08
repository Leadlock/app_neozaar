const pool = require("../config/database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { generateToken } = require("../utils/jwt");
const { sendOTP } = require("../utils/email");
const { generateOtp, storeOtp, verifyOtp: otpVerify } = require("../utils/otp");
const commonConstant = require("../config/common.constant");
const CrmApiService = require("../services/crmApi/crmApi.service");

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email],
    );

    if (userResult.rows.length === 0) {
      return res.status(commonConstant.STATUS_CODES.NOT_FOUND).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: "User not found",
      });
    }

    const user = userResult.rows[0];

    // 🔒 CHECK EMAIL VERIFICATION STATUS
    if (!user.is_email_verified || user.is_email_verified === false) {
      return res.status(commonConstant.STATUS_CODES.FORBIDDEN).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]:
          "Please verify your email before logging in",
        [commonConstant.VARIABLE.DATA]: {
          verification_required: true,
          email: user.email,
          next_step:
            "Check your email for verification link or request a new one",
        },
      });
    }

    // Validate password
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: "Invalid password",
      });
    }

    // Generate token for verified user
    const token = generateToken(user);

    // Store token in session
    // req.session.token = token;
    let CRMData = {
      email: email,
      password: password,
    };

    // CrmApiService.login(CRMData)
    //   .then((res) =>
    //     console.log("CRM Sync Success while creating product:", res),
    //   )
    //   .catch((err) =>
    //     console.error("CRM Sync Failed while creating product:", err),
    //   );

    // try {
    //   const crmResponse = await CrmApiService.login(CRMData);

    //   console.log("✅ CRM Login Success:", crmResponse);
    // } catch (err) {
    //   console.error("❌ CRM Login Failed:", err.response?.data || err.message);
    // }

    res.status(commonConstant.STATUS_CODES.SUCCESS).json({
      [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
      [commonConstant.VARIABLE.MESSAGE]: "Login successful",
      [commonConstant.VARIABLE.DATA]: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role_type: user.role_type,
          role_id: user.role_id,
          email_verified: user.is_email_verified,
          mobile_verified: user.is_mobile_verified,
        },
      },
    });
  } catch (error) {
    console.error("Error in login:", error);
    res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
      [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
      [commonConstant.VARIABLE.MESSAGE]: commonConstant.MESSAGES.ERROR,
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (user.rows.length === 0) {
      return res.status(commonConstant.STATUS_CODES.NOT_FOUND).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: "User not found",
      });
    }

    const otp = generateOtp();
    storeOtp(email, otp);

    const sent = await sendOTP(email, otp, "Password Reset OTP");
    if (!sent) {
      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: "Failed to send OTP",
      });
    }

    res.status(commonConstant.STATUS_CODES.SUCCESS).json({
      [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
      [commonConstant.VARIABLE.MESSAGE]: "User found, OTP sent.",
    });
  } catch (error) {
    res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
      [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
      [commonConstant.VARIABLE.MESSAGE]: error.message,
    });
  }
};

const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const otp = generateOtp();

    storeOtp(email, otp);

    // Send OTP using the common mail configuration
    const sent = await sendOTP(email, otp);

    if (!sent) {
      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: "Failed to send OTP",
      });
    }

    res.status(commonConstant.STATUS_CODES.SUCCESS).json({
      [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
      [commonConstant.VARIABLE.MESSAGE]: "OTP sent to email",
    });
  } catch (error) {
    res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
      [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
      [commonConstant.VARIABLE.MESSAGE]: error.message,
    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!otpVerify(email, otp)) {
      return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: "Invalid or expired OTP",
      });
    }

    const token = jwt.sign(
      { id: email, type: "password_reset" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    res.status(commonConstant.STATUS_CODES.SUCCESS).json({
      [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
      [commonConstant.VARIABLE.MESSAGE]: "OTP verified successfully",
      [commonConstant.VARIABLE.DATA]: { token },
    });
  } catch (error) {
    res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
      [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
      [commonConstant.VARIABLE.MESSAGE]: error.message,
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.query;
    const { password, confirm_password } = req.body;

    if (!token || !password || !confirm_password) {
      return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: "All fields are required",
      });
    }

    if (password !== confirm_password) {
      return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: "Passwords do not match",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== "password_reset") {
      return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: "Invalid reset token",
      });
    }

    const userResult = await pool.query(
      "SELECT password FROM users WHERE email = $1",
      [decoded.id],
    );
    if (userResult.rows.length === 0) {
      return res.status(commonConstant.STATUS_CODES.NOT_FOUND).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: "User not found",
      });
    }

    const currentHashedPassword = userResult.rows[0].password;
    const isSamePassword = await bcrypt.compare(
      password,
      currentHashedPassword,
    );

    if (isSamePassword) {
      return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]:
          "Your new password should not be the same as your current password",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query("UPDATE users SET password = $1 WHERE email = $2", [
      hashedPassword,
      decoded.id,
    ]);

    res.status(commonConstant.STATUS_CODES.SUCCESS).json({
      [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
      [commonConstant.VARIABLE.MESSAGE]: "Password reset successful",
    });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: "Invalid token",
      });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: "Reset token expired",
      });
    }
    res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
      [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
      [commonConstant.VARIABLE.MESSAGE]: error.message,
    });
  }
};

const userLoginData = async (req, res) => {
  try {
    const userId = req.user.id;

    const userResult = await pool.query(
      `SELECT u.id, u.name, u.email, u.mobile, u.role_type, cd.company_name
       FROM users u
       LEFT JOIN company_detail cd ON cd.action_id = u.id AND cd.action_type = u.role_type
       WHERE u.id = $1`,
      [userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(commonConstant.STATUS_CODES.NOT_FOUND).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: "User not found",
      });
    }

    res.status(commonConstant.STATUS_CODES.SUCCESS).json({
      [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
      [commonConstant.VARIABLE.MESSAGE]: "User data fetched successfully",
      [commonConstant.VARIABLE.DATA]: userResult.rows[0],
    });
  } catch (error) {
    console.error("Error in userLoginData:", error);
    res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
      [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
      [commonConstant.VARIABLE.MESSAGE]: commonConstant.MESSAGES.ERROR,
    });
  }
};

module.exports = {
  login,
  forgotPassword,
  sendOtp,
  verifyOtp,
  resetPassword,
  userLoginData,
};
