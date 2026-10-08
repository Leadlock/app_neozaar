const pool = require("../config/database");
const { validationResult } = require("express-validator");
const emailService = require("../config/mail");
/**
 * Public: Submit Contact Form
 */
// const submitContactForm = async (req, res) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return res.status(422).json({ status: 'fail', errors: errors.array() });
//   }

//   const {
//     full_name,
//     business_email,
//     phone_number,
//     company_name,
//     country,
//     help_type,
//     message,
//     heard_about,
//     consent_given
//   } = req.body;

//   try {
//     const query = `
//       INSERT INTO contact_submissions (
//         full_name, business_email, phone_number, company_name, country,
//         help_type, message, heard_about, consent_given
//       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
//       RETURNING *
//     `;

//     const values = [
//       full_name, business_email, phone_number || null, company_name || null, country || null,
//       help_type, message, heard_about || null, consent_given
//     ];

//     const result = await pool.query(query, values);

//     res.status(201).json({
//       status: 'success',
//       message: 'Your enquiry has been submitted.',
//       data: result.rows[0],
//     });
//   } catch (error) {
//     console.error('Error submitting contact form:', error);
//     res.status(500).json({ status: 'error', message: 'Server error' });
//   }
// };

const submitContactForm = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: "fail",
      errors: errors.array(),
    });
  }

  const {
    full_name,
    business_email,
    phone_number,
    company_name,
    country,
    help_type,
    message,
    heard_about,
    consent_given,
  } = req.body;

  const adminEmail = "info@neozaar.com";
  // const adminEmail = "shreyas.chalke@whizzact.com";

  try {
    const query = `
      INSERT INTO contact_submissions (
        full_name, business_email, phone_number, company_name, country,
        help_type, message, heard_about, consent_given
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `;

    const values = [
      full_name,
      business_email,
      phone_number || null,
      company_name || null,
      country || null,
      help_type,
      message,
      heard_about || null,
      consent_given,
    ];

    const result = await pool.query(query, values);

    // Send notification email to admin
    try {
      await emailService.sendContactFormNotificationEmail({
        adminEmail,
        full_name,
        business_email,
        phone_number,
        company_name,
        country,
        help_type,
        message,
        heard_about,
        consent_given,
      });
    } catch (err) {
      console.error("Contact form email failed:", err);
    }

    res.status(201).json({
      status: "success",
      message: "Your enquiry has been submitted.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error submitting contact form:", error);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
};

/**
 * Admin: Get all submissions
 */
const getAllSubmissions = async (req, res) => {
  if (req.user.role_id !== 4) {
    return res.status(403).json({ message: "Super Admin access only" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM contact_submissions ORDER BY submitted_at DESC",
    );
    res.json({ status: "success", data: result.rows });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Server error" });
  }
};

/**
 * Admin: Get a single submission by ID
 */
const getSubmissionById = async (req, res) => {
  if (req.user.role_id !== 4) {
    return res.status(403).json({ message: "Super Admin access only" });
  }

  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM contact_submissions WHERE id = $1",
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Submission not found" });
    }

    res.json({ status: "success", data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Admin: Update submission
 */
const updateSubmission = async (req, res) => {
  if (req.user.role_id !== 4) {
    return res.status(403).json({ message: "Super Admin access only" });
  }

  const { id } = req.params;
  const {
    full_name,
    business_email,
    phone_number,
    company_name,
    country,
    help_type,
    message,
    heard_about,
    consent_given,
  } = req.body;

  try {
    const query = `
      UPDATE contact_submissions SET
        full_name = $1,
        business_email = $2,
        phone_number = $3,
        company_name = $4,
        country = $5,
        help_type = $6,
        message = $7,
        heard_about = $8,
        consent_given = $9
      WHERE id = $10
      RETURNING *
    `;

    const values = [
      full_name,
      business_email,
      phone_number || null,
      company_name || null,
      country || null,
      help_type,
      message,
      heard_about || null,
      consent_given,
      id,
    ];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Submission not found" });
    }

    res.json({
      status: "success",
      message: "Submission updated",
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Admin: Delete submission
 */
const deleteSubmission = async (req, res) => {
  if (req.user.role_id !== 4) {
    return res.status(403).json({ message: "Super admin access only" });
  }

  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM contact_submissions WHERE id = $1 RETURNING *",
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Submission not found" });
    }

    res.json({ status: "success", message: "Submission deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  submitContactForm,
  getAllSubmissions,
  getSubmissionById,
  updateSubmission,
  deleteSubmission,
};
