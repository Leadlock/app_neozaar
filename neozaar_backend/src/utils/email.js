const commonConstant = require("../config/common.constant");
const sendEmail = require("../utils/sendEmailAzure");

/**
 * Send OTP email
 * @param {string} email - Recipient email
 * @param {string} otp - OTP code
 * @param {string} [purpose] - OTP purpose (default: 'Your OTP Code')
 * @returns {Promise<boolean>}
 */
const sendOTP = async (email, otp, purpose = "Your OTP Code") => {
  const html = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Hello,</h2>
          <p>Your OTP code is:</p>
          <h1 style="color: #007BFF; text-align: center;">${otp}</h1>
          <p>This OTP will expire in 5 minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
          <p>Best regards,<br/>Neozaar</p>
        </body>
      </html>
    `;
  return sendEmail(email, purpose, html, true);
};

async function sendLeadNotification(
  leadType,
  customerEmail,
  customerName,
  productName,
  ownerEmail,
  ownerName = "Partner",
) {
  const loginLink = "https://neozaar.com/auth/login";

  const mailOptions = {
    from: '"Neozaar" <no_reply@neozaar.com>',

    to: ownerEmail,

    subject: "You Have Received a New Lead - NeoZaar",

    html: `
      <!DOCTYPE html>
      <html lang="en">

      <head>

          <meta charset="UTF-8">

          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          >

          <title>
            New Lead Received - NeoZaar
          </title>

          <style>

              body {
                  font-family: Arial, sans-serif;
                  background-color: #f4f4f4;
                  margin: 0;
                  padding: 0;
              }

              .container {
                  background-color: #ffffff;
                  width: 600px;
                  margin: 50px auto;
                  padding: 30px;
                  border-radius: 10px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                  text-align: center;
              }

              .logo {
                  width: 120px;
                  margin-bottom: 20px;
              }

              h2 {
                  color: #333333;
                  margin-bottom: 10px;
              }

              p {
                  color: #555555;
                  line-height: 1.7;
                  margin-bottom: 18px;
                  text-align: left;
              }

              .button {
                  display: inline-block;
                  padding: 12px 25px;
                  background-color: #007BFF;
                  color: #ffffff !important;
                  text-decoration: none;
                  border-radius: 5px;
                  font-weight: bold;
                  margin-top: 20px;
              }

              .footer {
                  margin-top: 35px;
                  font-size: 12px;
                  color: #999999;
                  text-align: center;
              }

              .footer a {
                  color: #007BFF;
                  text-decoration: none;
              }

          </style>

      </head>

      <body>

          <div class="container">

              <img
                src="https://emailimage.blob.core.windows.net/emailimage/Logo_Neozar_For%20White%20Background.png"
                alt="NeoZaar"
                class="logo"
              >

              <h2>
                You Have Received a New Lead
              </h2>

              <p>
                  Hi
                  <strong>
                    ${ownerName}
                  </strong>,
              </p>

              <p>
                  You have received a new lead
                  through NeoZaar.
              </p>

              <p>
                  <strong>Lead Type:</strong>
                  ${leadType}
              </p>

              <p>
                  <strong>Product:</strong>
                  ${productName}
              </p>

              <p>
                  <strong>Customer:</strong>
                  ${customerName}
              </p>

              <p>
                  <strong>Email:</strong>
                  ${customerEmail}
              </p>

              <p>
                  The lead details are now
                  available in your NeoZaar
                  dashboard.
              </p>

              <p>
                  We recommend reviewing
                  the requirement and
                  connecting with the lead
                  at the earliest.
              </p>

              <a
                href="${loginLink}"
                class="button"
              >
                Login to NeoZaar
              </a>

              <p style="margin-top:25px;">

                  If you would like NeoZaar
                  to support you with
                  qualification, scoping,
                  marketplace alignment,
                  or progressing the
                  opportunity through
                  the CoSell360 program,
                  our team will be happy
                  to assist.

              </p>

              <p>
                  Warm regards,<br>

                  <strong>
                    Team NeoZaar
                  </strong><br>

                  <a href="mailto:info@neozaar.com">
                    info@neozaar.com
                  </a>
              </p>

              <div class="footer">
                  <p>NeoZaar</p>
              </div>

          </div>

      </body>

      </html>
    `,
  };

  try {
    await sendEmail(
      ownerEmail,
      "You Have Received a New Lead - NeoZaar",
      mailOptions.html,
      true,
    );

    console.log(`✅ Lead mail sent to ${ownerEmail}`);
  } catch (error) {
    console.error("Error sending lead notification:", error);

    throw error;
  }
}

module.exports = {
  sendOTP,
  sendLeadNotification,
};
