const nodemailer = require("nodemailer");
const commonConstant = require("../config/common.constant");
const sendEmail = require("../utils/sendEmailAzure");

const transporter = nodemailer.createTransport({
  host: commonConstant.MAIL_CONFIG.HOST,
  port: commonConstant.MAIL_CONFIG.PORT,
  secure: commonConstant.MAIL_CONFIG.SECURE,
  auth: {
    user: commonConstant.MAIL_CONFIG.AUTH.USER,
    pass: commonConstant.MAIL_CONFIG.AUTH.PASS,
  },
});

// Function to send verification email
async function sendVerificationEmailToCustomerRegistration(
  userEmail,
  verificationLink,
  userName = "",
) {
  const mailOptions = {
    from: '"Neozaar" <no_reply@neozaar.com>', // sender address
    to: userEmail, // receiver email address
    subject: "Please Verify Your Email Address",
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email - NeoZaar</title>

          <style>
              body {
                  font-family: Arial, sans-serif;
                  background-color: #f4f4f4;
                  margin: 0;
                  padding: 20px;
              }

              .container {
                  background-color: #ffffff;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 30px;
                  border-radius: 10px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                  text-align: center;
              }

              .logo {
                  width: 140px;
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

              .verify-icon {
                  font-size: 50px;
                  color: #28a745;
                  margin-bottom: 20px;
              }

              .features {
                  background-color: #f7f7f7;
                  padding: 20px;
                  border-radius: 5px;
                  margin: 25px 0;
                  text-align: left;
              }

              .features ul {
                  margin: 0;
                  padding-left: 20px;
              }

              .features li {
                  margin-bottom: 10px;
                  color: #555555;
                  line-height: 1.5;
              }

              .button {
                  display: inline-block;
                  padding: 14px 28px;
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

              .link-text {
                  word-break: break-all;
                  color: #007BFF;
              }
          </style>
      </head>

      <body>

          <div class="container">

              <!-- Company Logo -->
              <img 
                  src="https://emailimage.blob.core.windows.net/emailimage/Logo_Neozar_For%20White%20Background.png"
                  alt="NeoZaar"
                  class="logo"
              >

              <!-- Verify Icon -->
              <div class="verify-icon">📧</div>

              <h2>Verify Your Email</h2>

              <p>
                  Hello <strong>${userName || "User"}</strong>,
              </p>

              <p>
                  Thank you for registering with <strong>NeoZaar</strong>.
              </p>

              <p>
                  You’re just one step away from accessing a platform built to help you
                  explore curated products, trusted solutions, private-offer opportunities,
                  and the right cloud and managed services for your business goals.
              </p>

              <p>
                  Once your email is verified, you’ll be able to:
              </p>

              <div class="features">
                  <ul>
                      <li>Explore products, solutions, and services on NeoZaar</li>
                      <li>Request demos, assessments, and proof-of-concept support</li>
                      <li>Discover private-offer and procurement options</li>
                      <li>Evaluate opportunities for better FinOps, governance, and managed services</li>
                      <li>Stay updated on exclusive solutions and marketplace-led buying opportunities</li>
                  </ul>
              </div>

              <p>
                  To complete your registration, please verify your email address by clicking the button below:
              </p>

              <!-- Verify Button -->
              <a href="${verificationLink}" class="button">
                  Verify My Email
              </a>

              <p style="margin-top:25px;">
                  If the button above doesn't work, copy and paste this link into your browser:
              </p>

              <p class="link-text">
                  <a href="${verificationLink}">
                      ${verificationLink}
                  </a>
              </p>

              <!-- Footer -->
              <div class="footer">
                  <p>NeoZaar</p>
              </div>

          </div>

      </body>
      </html>
      `,
  };

  try {
    // const info = await transporter.sendMail(mailOptions);
    const sent = await sendEmail(
      userEmail,
      "Neozaar Email Verification",
      mailOptions.html,
      true,
    );
    if (!sent) {
      throw new Error("Verification email provider did not accept the message");
    }
    //  console.log('Verification email sent:', info.messageId);
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw error;
  }
}

async function sendWelcomeEmail(userEmail, userName = "") {
  const loginLink = "https://neozaar.com/auth/login";

  const mailOptions = {
    from: '"Neozaar" <no_reply@neozaar.com>',
    to: userEmail,
    subject: "Welcome to NeoZaar 🎉",

    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to NeoZaar</title>

          <style>
              body {
                  font-family: Arial, sans-serif;
                  background-color: #f4f4f4;
                  margin: 0;
                  padding: 20px;
              }

              .container {
                  background-color: #ffffff;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 30px;
                  border-radius: 10px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                  text-align: center;
              }

              .logo {
                  width: 140px;
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

              .features {
                  background-color: #f7f7f7;
                  padding: 20px;
                  border-radius: 5px;
                  margin: 25px 0;
                  text-align: left;
              }

              .features ul {
                  margin: 0;
                  padding-left: 20px;
              }

              .features li {
                  margin-bottom: 10px;
                  color: #555555;
                  line-height: 1.5;
              }

              .button {
                  display: inline-block;
                  padding: 14px 28px;
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
          </style>
      </head>

      <body>

          <div class="container">

              <!-- Company Logo -->
              <img 
                  src="https://emailimage.blob.core.windows.net/emailimage/Logo_Neozar_For%20White%20Background.png"
                  alt="NeoZaar"
                  class="logo"
              >

              <h2>Welcome to NeoZaar!</h2>

              <p>
                  Hi <strong>${userName || "User"}</strong>,
              </p>

              <p>
                  Your account has been successfully verified and activated.
              </p>

              <p>
                  You can now access NeoZaar and explore:
              </p>

              <div class="features">
                  <ul>
                      <li>Curated products, solutions, and services</li>
                      <li>Proof-of-concept and demo opportunities</li>
                      <li>Private offer and procurement options</li>
                      <li>Funding-led and marketplace opportunities</li>
                      <li>Cloud, FinOps, governance, and managed services</li>
                      <li>Guidance from Neo for your business goals</li>
                  </ul>
              </div>

              <p>
                  Click below to login and start exploring.
              </p>

              <!-- Login Button -->
              <a href="${loginLink}" class="button">
                  Login to NeoZaar
              </a>

              <p style="margin-top:25px;">
                  If you need any help, simply reply to this email.
              </p>

              <p>
                  Thank you for choosing NeoZaar.
              </p>

              <p>
                  Warm regards,<br>
                  <strong>Team NeoZaar</strong>
              </p>

              <!-- Footer -->
              <div class="footer">
                  <p>NeoZaar</p>
              </div>

          </div>

      </body>
      </html>
    `,
  };

  try {
    await sendEmail(userEmail, "Welcome to NeoZaar 🎉", mailOptions.html, true);
  } catch (error) {
    console.error("Error sending welcome email:", error);
    throw error;
  }
}

// async function approvalMail(
//   userid,
//   userEmail,
//   userName = "",
//   userPassword = "",
// ) {
//   const mailOptions = {
//     from: '"Neozaar" <no_reply@neozaar.com>', // sender address
//     to: userEmail, // receiver email address
//     subject: "your email is approved",
//     html: `
//     <!DOCTYPE html>
//     <html>
//     <head>
//         <meta charset="UTF-8">
//         <title>Email Verified</title>
//         <style>
//             body {
//                 font-family: Arial, sans-serif;
//                 background-color: #f4f4f4;
//                 margin: 0;
//                 padding: 0;
//             }
//             .container {
//                 background-color: #ffffff;
//                 width: 600px;
//                 margin: 50px auto;
//                 padding: 30px;
//                 border-radius: 10px;
//                 box-shadow: 0 2px 10px rgba(0,0,0,0.1);
//                 text-align: center;
//             }
//             .logo {
//                 width: 120px;
//                 margin-bottom: 20px;
//             }
//             h2 {
//                 color: #333333;
//                 margin-bottom: 10px;
//             }
//             p {
//                 color: #555555;
//                 line-height: 1.6;
//                 margin-bottom: 20px;
//             }
//             .verified-icon {
//                 font-size: 50px;
//                 color: #28a745;
//                 margin-bottom: 20px;
//             }
//             .credentials {
//                 background-color: #f0f0f0;
//                 padding: 15px;
//                 border-radius: 5px;
//                 margin-bottom: 25px;
//                 display: inline-block;
//                 text-align: left;
//             }
//             .credentials p {
//                 margin: 5px 0;
//                 font-size: 16px;
//             }
//             .credentials strong {
//                 display: inline-block;
//                 width: 90px;
//             }
//             a.button {
//                 display: inline-block;
//                 padding: 12px 25px;
//                 background-color: #007BFF;
//                 color: #ffffff;
//                 text-decoration: none;
//                 border-radius: 5px;
//                 font-weight: bold;
//             }
//             a.button:hover {
//                 background-color: #0056b3;
//             }
//             .footer {
//                 margin-top: 35px;
//                 font-size: 12px;
//                 color: #999999;
//             }
//         </style>
//     </head>
//     <body>
//         <div class="container">
//             <!-- Company Logo -->
//             <img src="https://emailimage.blob.core.windows.net/emailimage/Logo_Neozar_For%20White%20Background.png" alt="Neozaar" class="logo">

//             <!-- Verified Icon -->
//             <div class="verified-icon">✔️</div>

//             <h2>Email Verified Successfully!</h2>
//             <p>Dear User, your email has been verified. You can now access your account using the credentials below:</p>

//             <!-- User Credentials -->
//             <div class="credentials">
//                 <p><strong>Username:</strong> ${userEmail}</p>
//                 <p><strong>Password:</strong> ${userPassword}</p>
//             </div>

//             <a href="${commonConstant.VARIABLE.APP_LOGIN_URL}" class="button">Go to Dashboard</a>

//             <div class="footer">
//                 <p>If you did not perform this action, please contact our support immediately.</p>
//             </div>
//         </div>
//     </body>
//     </html>
//     `,
//   };

//   try {
//     // const info = await transporter.sendMail(mailOptions);
//     console.log("Sending approval email to:", userEmail);
//     await sendEmail(
//       userEmail,
//       "Email Verification Approved",
//       mailOptions.html,
//       true,
//     );
//   } catch (error) {
//     console.error("Error sending approval email:", error);
//     throw error;
//   }
// }

async function approvalMail(userId, email, userName, tempPassword) {
  const loginLink = "https://neozaar.com/auth/login";
  const mailOptions = {
    from: '"Neozaar" <no_reply@neozaar.com>',
    to: email,
    subject: "Your ISV Registration Has Been Approved 🎉",
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport"
                content="width=device-width, initial-scale=1.0">
          <title>
            ISV Registration Approved - NeoZaar
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

              .credentials {
                  background-color: #f0f0f0;
                  padding: 20px;
                  border-radius: 5px;
                  margin: 25px 0;
                  text-align: left;
              }

              .credentials p {
                  margin: 10px 0;
                  font-size: 15px;
              }

              .features {
                  background-color: #f8f8f8;
                  padding: 20px;
                  border-radius: 5px;
                  margin: 25px 0;
                  text-align: left;
              }

              .features ul {
                  margin: 0;
                  padding-left: 20px;
              }

              .features li {
                  margin-bottom: 10px;
                  color: #555555;
                  line-height: 1.5;
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
                Your ISV Registration is Approved
              </h2>

              <p>
                Hi
                <strong>
                  ${userName || "User"}
                </strong>,
              </p>

              <p>
                We’re pleased to let you know
                that your ISV registration
                has been reviewed and approved
                by the NeoZaar team.
              </p>

              <p>
                Your account is now active,
                and you can proceed with
                adding your products to
                the platform.
              </p>

              <div class="credentials">

                  <p>
                    <strong>Login ID:</strong>
                    ${email}
                  </p>

                  <p>
                    <strong>Password:</strong>
                    ${tempPassword}
                  </p>

                  <p>
                    <strong>Login URL:</strong>
                    ${loginLink}
                  </p>

              </div>

              <p>
                After your first login,
                we recommend changing your
                password using the Forgot
                Password option.
              </p>

              <div class="features">

                  <ul>

                      <li>
                        Add and manage your
                        product listings
                      </li>

                      <li>
                        Build your presence
                        on NeoZaar
                      </li>

                      <li>
                        Explore CoSell360
                        opportunities
                      </li>

                      <li>
                        Grow marketplace
                        readiness across
                        AWS and Azure
                      </li>

                  </ul>

              </div>

              <a
                href="${loginLink}"
                class="button"
              >
                Login to NeoZaar
              </a>

              <p style="margin-top:25px;">
                If you need any assistance,
                simply reply to this email.
              </p>

              <p>
                Warm regards,<br>
                <strong>
                  Team NeoZaar
                </strong>
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
      email,
      "Your ISV Registration Has Been Approved 🎉",
      mailOptions.html,
      true,
    );

    console.log(`✅ Approval mail sent to ${email}`);
  } catch (error) {
    console.error("Error sending approval email:", error);

    throw error;
  }
}

async function newProductUploadedBYIsv(
  productUrl,
  userEmail,
  userName = "",
  productName = "",
) {
  const mailOptions = {
    from: '"Neozaar" <no_reply@neozaar.com>', // sender address
    to: userEmail, // receiver email address
    subject: `New Product Uploaded by ISV(${userName}) Notification`,
    html: `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>New Product Uploaded by ISV Notification</title>
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
                line-height: 1.6;
                margin-bottom: 20px;
            }
            .verified-icon {
                font-size: 50px;
                color: #28a745;
                margin-bottom: 20px;
            }
            .credentials {
                background-color: #f0f0f0;
                padding: 15px;
                border-radius: 5px;
                margin-bottom: 25px;
                display: inline-block;
                text-align: left;
            }
            .credentials p {
                margin: 5px 0;
                font-size: 16px;
            }
            .credentials strong {
                display: inline-block;
                width: 90px;
            }
            a.button {
                display: inline-block;
                padding: 12px 25px;
                background-color: #007BFF;
                color: #ffffff;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
            }
            a.button:hover {
                background-color: #0056b3;
            }
            .footer {
                margin-top: 35px;
                font-size: 12px;
                color: #999999;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Company Logo -->
            <img src="https://emailimage.blob.core.windows.net/emailimage/Logo_Neozar_For%20White%20Background.png" alt="Neozaar" class="logo">

            <!-- Verified Icon -->
            <div class="verified-icon">✔️</div>

            <h2>New Product Uploaded by ISV Successfully!</h2>
            <p>Dear Admin, a new product has been successfully uploaded by ISV (${userName}). Please sign in to your account to review the product information.</p>

            <!-- User Credentials -->
            <div class="credentials">
                <p><strong>Product Name:</strong> <a href="${productUrl}">${productName}</a></p>
            </div>

            <div class="footer">
                <p>Neozaar</p>
            </div>
        </div>
    </body>
    </html>
    `,
  };

  try {
    // const info = await transporter.sendMail(mailOptions);
    console.log("Sending product approval email to:", userEmail);
    await sendEmail(
      userEmail,
      "your email is product approved",
      mailOptions.html,
      true,
    );
  } catch (error) {
    console.error("Error sending product approval email:", error);
    throw error;
  }
}

async function thankyouEmail(userEmail, verificationLink, userName = "") {
  const mailOptions = {
    from: '"Neozaar" <no_reply@neozaar.com>', // sender address
    to: userEmail, // receiver email address
    subject: "Thank you for registering",
    html: `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Hello${userName ? ", " + userName : ""},</h2>
          <p>Thank you for registering with us!</p>
          <p>We have received your request, and our team will be reaching out to you soon.</p>
          <p>If you did not create an account, please ignore this email.</p>
          <p>Best regards,<br/>Neozaar</p>
        </body>
      </html>
    `,
  };

  try {
    // const info = await transporter.sendMail(mailOptions);
    await azureMail(userEmail, "Thank you for registering", mailOptions.html);
    //  console.log('Verification email sent:', info.messageId);
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw error;
  }
}

async function sendIsvInactiveEmail(email, name) {
  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Hello ${name},</h2>

        <p>Your account has been marked as inactive.</p>

        <p>Please contact support for more information.</p>

        <p>Best regards,<br/>Neozaar Team</p>
      </body>
    </html>
  `;

  try {
    await sendEmail(email, "Account Deactivated", html, true);
  } catch (error) {
    console.error("Error sending inactive email:", error);
    throw error;
  }
}

async function sendIsvInactiveNotificationEmail(
  adminEmail,
  name,
  email,
  mobile,
) {
  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Hello Admin,</h2>

        <p>The following user has been marked inactive:</p>

        <ul>
          <li><strong>Name:</strong> ${name}</li>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Mobile:</strong> ${mobile}</li>
        </ul>

        <p>Regards,<br/>Neozaar System</p>
      </body>
    </html>
  `;

  try {
    await sendEmail(adminEmail, "ISV User Marked Inactive", html, true);
  } catch (error) {
    console.error("Error sending admin notification email:", error);
    throw error;
  }
}

async function sendProductApprovalEmail(
  userEmail,
  userName = "",
  productName = "",
) {
  const mailOptions = {
    from: '"Neozaar" <no_reply@neozaar.com>',
    to: userEmail,
    subject: "Your Product Has Been Approved 🎉",

    html: `
      <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Product Approved - NeoZaar</title>

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

                .success-icon {
                    font-size: 50px;
                    color: #28a745;
                    margin-bottom: 20px;
                }

                .footer {
                    margin-top: 35px;
                    font-size: 12px;
                    color: #999999;
                    text-align: center;
                }

            </style>
        </head>

        <body>

            <div class="container">

                <!-- Company Logo -->
                <img src="https://emailimage.blob.core.windows.net/emailimage/Logo_Neozar_For%20White%20Background.png"
                    alt="NeoZaar"
                    class="logo">

                <!-- Success Icon -->
                <h2>Your Product is Now Live on NeoZaar!</h2>

                <p>
                    Hi <strong>${userName}</strong>,
                </p>

                <p>
                    We’re pleased to let you know that your product <strong>${productName}</strong> has been reviewed and approved
                    by the NeoZaar team.
                </p>

                <p>
                    Your listing is now live and available for visibility on NeoZaar, helping
                    strengthen your presence as part of the CoSell360 program by NeoZaar.
                </p>

                <p>
                    As your product moves forward on the platform, our team can continue to support
                    you in building the right path toward stronger marketplace readiness, co-sell
                    alignment across AWS and Azure, technical validation preparedness, and sharper
                    go-to-market execution.
                </p>

                <p>
                    You can also explore more about the program and how NeoZaar supports ISVs at
                    cosell360.com.
                </p>

                <p>
                    If you would like to discuss the next stage of your growth journey, our team
                    will be happy to connect.
                </p>

                <p>
                    Warm regards,<br>
                    <strong>Team NeoZaar</strong><br>
                    <strong>CoSell360 Program by NeoZaar</strong>
                </p>

                <!-- Footer -->
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
      userEmail,
      "Your Product Has Been Approved 🎉",
      mailOptions.html,
      true,
    );
  } catch (error) {
    console.error("Error sending product approval email:", error);
    throw error;
  }
}

async function sendProductPublishEmail(
  userEmail,
  userName = "",
  productName = "",
) {
  const mailOptions = {
    from: '"Neozaar" <no_reply@neozaar.com>',
    to: userEmail,
    subject: "Your Product Has Been Published 🚀",

    html: `
      <!DOCTYPE html>
      <html lang="en">

      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Product Published - NeoZaar</title>

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

              .footer {
                  margin-top: 35px;
                  font-size: 12px;
                  color: #999999;
                  text-align: center;
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

              <h2>Your Product Has Been Published 🚀</h2>

              <p>
                  Hi <strong>${userName || "User"}</strong>,
              </p>

              <p>
                  Great news! Your product has now been officially published on NeoZaar.
              </p>

              <p>
                  <strong>Published Product:</strong> ${productName}
              </p>

              <p>
                  Your listing is now publicly visible and accessible on the platform.
              </p>

              <p>
                  Thank you for partnering with NeoZaar and being part of the CoSell360 ecosystem.
              </p>

              <p>
                  Warm regards,<br>
                  <strong>Team NeoZaar</strong>
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
      userEmail,
      "Your Product Has Been Published 🚀",
      mailOptions.html,
      true,
    );

    console.log(`✅ Publish email sent to ${userEmail}`);
  } catch (error) {
    console.error("Error sending publish email:", error);

    throw error;
  }
}

async function sendIsvWelcomeEmail(userEmail, userName = "") {
  const mailOptions = {
    from: '"Neozaar" <no_reply@neozaar.com>',
    to: userEmail,
    subject: "Welcome to NeoZaar 🎉",

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
            Welcome to NeoZaar
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

              .highlight-box {
                  background-color: #f0f0f0;
                  padding: 20px;
                  border-radius: 5px;
                  margin: 25px 0;
                  text-align: left;
              }

              .highlight-box ul {
                  margin: 0;
                  padding-left: 20px;
              }

              .highlight-box li {
                  margin-bottom: 10px;
                  color: #555555;
                  line-height: 1.5;
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

              .button:hover {
                  background-color: #0056b3;
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
                Welcome to NeoZaar!
              </h2>

              <p>
                  Hi
                  <strong>
                    ${userName || "User"}
                  </strong>,
              </p>

              <p>
                  Welcome to
                  <strong>NeoZaar</strong>,
                  and thank you for registering as an
                  <strong>ISV / SaaS Vendor</strong>.
              </p>

              <p>
                  We’re excited to have you join a platform built to support your growth
                  across
                  <strong>AWS and Azure marketplaces</strong>,
                  while also helping you build the commercial momentum needed to scale with confidence.
              </p>

              <p>
                  At NeoZaar, we understand that every ISV is at a different stage of its
                  journey. Some are strengthening marketplace readiness, some are preparing
                  for co-sell motion, and others are looking to accelerate demand, partner
                  traction, and enterprise opportunities.
              </p>

              <div class="highlight-box">

                  <ul>
                      <li>
                        Marketplace readiness guidance
                      </li>

                      <li>
                        Co-sell readiness across AWS and Azure
                      </li>

                      <li>
                        Technical validation preparation
                      </li>

                      <li>
                        Go-to-market execution support
                      </li>

                      <li>
                        Enterprise opportunity acceleration
                      </li>

                      <li>
                        Partner and demand generation alignment
                      </li>
                  </ul>

              </div>

              <p>
                  Through the
                  <strong>
                    CoSell360 Program by NeoZaar
                  </strong>,
                  our team can help you define the right path to become
                  <strong>
                    co-sell ready
                  </strong>
                  across AWS and Azure, align to evolving hyperscaler requirements,
                  prepare for technical validations, and strengthen your go-to-market execution.
              </p>

              <a
                href="https://cosell360.com"
                class="button"
              >
                Explore CoSell360
              </a>

                <p style="margin-top:25px;">
                    Our team will review your registration details and connect with you to
                    better understand your current stage, growth priorities, and the most
                    relevant next steps for your business.
                </p>

                <p>
                    Once your profile has been reviewed and approved, you will receive a
                    separate email containing your login credentials, including your
                    registered email address and password, so you can access your NeoZaar
                    account and begin your marketplace journey.
                </p>

              <p>
                  We look forward to being part of your growth journey.
              </p>

              <p>
                  Warm regards,<br>

                  <strong>
                    Team NeoZaar
                  </strong><br>

                  <strong>
                    CoSell360 Program by NeoZaar
                  </strong>
              </p>

              <div class="footer">
                  <p>
                      <a href="https://neozaar.com">
                        neozaar.com
                      </a>
                      |
                      <a href="https://cosell360.com">
                        cosell360.com
                      </a>
                  </p>
              </div>

          </div>

      </body>

      </html>
    `,
  };

  try {
    await sendEmail(userEmail, "Welcome to NeoZaar 🎉", mailOptions.html, true);

    console.log(`✅ ISV welcome email sent to ${userEmail}`);
  } catch (error) {
    console.error("Error sending ISV welcome email:", error);

    throw error;
  }
}

async function sendNewIsvRegistrationNotification(data) {
  //   const adminEmail = "shreyas.chalke@whizzact.com";
  const adminEmail = "info@neozaar.com";
  const adminLink = "https://neozaar.com/admin/login";
  const mailOptions = {
    from: '"Neozaar" <no_reply@neozaar.com>',
    to: adminEmail,
    subject: "New ISV Registration Submitted",
    html: `
      <!DOCTYPE html>
      <html lang="en">

      <head>

          <meta charset="UTF-8">

          <meta name="viewport"
                content="width=device-width, initial-scale=1.0">

          <title>
            New ISV Registration - NeoZaar
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

              .details-box {
                  background-color: #f0f0f0;
                  padding: 20px;
                  border-radius: 5px;
                  margin: 25px 0;
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
                New ISV Registration Submitted
              </h2>

              <p>
                Hi Team,
              </p>

              <p>
                A new ISV registration has been submitted on NeoZaar.
              </p>

              <div class="details-box">

                  <p>
                    <strong>Name:</strong>
                    ${data.name}
                  </p>

                  <p>
                    <strong>Company:</strong>
                    ${data.company_name}
                  </p>

                  <p>
                    <strong>Email:</strong>
                    ${data.email}
                  </p>

                  <p>
                    <strong>Phone:</strong>
                    ${data.mobile}
                  </p>

                  <p>
                    <strong>Website:</strong>
                    ${data.website_url}
                  </p>

              </div>

              <a
                href="${adminLink}"
                class="button"
              >
                Review Registration
              </a>

              <div class="footer">
                  <p>NeoZaar</p>
              </div>

          </div>

      </body>

      </html>
    `,
  };

  await sendEmail(
    adminEmail,
    "New ISV Registration Submitted",
    mailOptions.html,
    true,
  );
}

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

async function sendSubscriptionConfirmationEmail(
  userEmail,
  userName = "Subscriber",
) {
  const mailOptions = {
    from: '"Neozaar" <no_reply@neozaar.com>',
    to: userEmail,
    subject: "Subscription Confirmed - NeoZaar",

    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>NeoZaar Subscription Confirmation</title>

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

              .mail-icon {
                  font-size: 50px;
                  color: #28a745;
                  margin-bottom: 20px;
              }

              .footer {
                  margin-top: 35px;
                  font-size: 12px;
                  color: #999999;
                  text-align: center;
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

              <div class="mail-icon">📩</div>

              <h2>
                Subscription Confirmed
              </h2>

              <p>
                  Hi <strong>${userName}</strong>,
              </p>

              <p>
                  Thank you for subscribing to NeoZaar updates.
              </p>

              <p>
                  You’ll now receive curated insights and updates focused on enterprise
                  technology buying through cloud marketplaces, including relevant solutions,
                  marketplace trends, private offer motions, co-sell developments, and
                  opportunities across AWS and Azure ecosystems.
              </p>

              <p>
                  Our updates are designed to help enterprise buyers stay informed about
                  product procurement options, solution improvements that support better
                  FinOps outcomes, and managed services that strengthen governance,
                  control, and operational efficiency.
              </p>

              <p>
                  We’re glad to have you with us and look forward to staying connected.
              </p>

              <p>
                  Warm regards,<br>
                  <strong>Team NeoZaar</strong>
              </p>

              <div class="footer">
                  <p>NeoZaar</p>
              </div>

          </div>

      </body>
      </html>
    `,
  };

  await sendEmail(
    userEmail,
    "Subscription Confirmed - NeoZaar",
    mailOptions.html,
    true,
  );

  console.log(`✅ Subscription confirmation email sent to ${userEmail}`);
}

async function sendWelcomeMailtoUser(userEmail, userName, password, roleType) {
  const loginLink = `${process.env.FRONTEND_URL}auth/login`;

  const mailOptions = {
    from: '"Neozaar" <no_reply@neozaar.com>',
    to: userEmail,
    subject: "Your Neozaar Account Has Been Created",

    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            background: #f4f4f4;
            padding: 20px;
          }

          .container {
            max-width: 600px;
            margin: auto;
            background: #ffffff;
            padding: 30px;
            border-radius: 10px;
          }

          .logo {
            width: 140px;
            margin-bottom: 20px;
          }

          .credentials {
            background: #f7f7f7;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }

          .credentials table {
            width: 100%;
          }

          .credentials td {
            padding: 8px;
          }

          .button {
            display: inline-block;
            padding: 12px 24px;
            background: #007BFF;
            color: white !important;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 20px;
          }
        </style>
      </head>

      <body>
        <div class="container">

          <img
            src="https://emailimage.blob.core.windows.net/emailimage/Logo_Neozar_For%20White%20Background.png"
            alt="Neozaar"
            class="logo"
          />

          <h2>Welcome to Neozaar</h2>

          <p>Hi <strong>${userName}</strong>,</p>

          <p>
            Your account has been created successfully by the Super Admin.
          </p>

          <div class="credentials">
            <table>
              <tr>
                <td><strong>Email</strong></td>
                <td>${userEmail}</td>
              </tr>

              <tr>
                <td><strong>Password</strong></td>
                <td>${password}</td>
              </tr>

              <tr>
                <td><strong>Role</strong></td>
                <td>${roleType}</td>
              </tr>
            </table>
          </div>

          <p>
            Please login using the credentials above and change your password after your first login.
          </p>

          <a href="${loginLink}" class="button">
            Login to Neozaar
          </a>

          <p style="margin-top:20px;">
            Regards,<br />
            <strong>Team Neozaar</strong>
          </p>

        </div>
      </body>
      </html>
    `,
  };

  try {
    await sendEmail(
      userEmail,
      "Your Neozaar Account Has Been Created",
      mailOptions.html,
      true,
    );
  } catch (error) {
    console.error("Error sending user welcome email:", error);
    throw error;
  }
}

async function sendRoleChangeEmail(userEmail, userName, oldRole, newRole) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2>Role Updated Successfully</h2>

      <p>Hello ${userName},</p>

      <p>
        Your role in Neozaar has been updated by the administrator.
      </p>

      <table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse;">
        <tr>
          <td><strong>Previous Role</strong></td>
          <td>${oldRole}</td>
        </tr>

        <tr>
          <td><strong>New Role</strong></td>
          <td>${newRole}</td>
        </tr>
      </table>

      <br/>

      <p>
        If you have any questions regarding this change, please contact the administrator.
      </p>

      <p>
        Regards,<br/>
        Team Neozaar
      </p>
    </div>
  `;

  try {
    await sendEmail(
      userEmail,
      "Your Neozaar Role Has Been Updated",
      html,
      true,
    );
  } catch (error) {
    console.error("Error sending role change email:", error);
    throw error;
  }
}

async function sendContactFormNotificationEmail(data) {
  const {
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
  } = data;

  const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            background: #f4f4f4;
            padding: 20px;
            margin: 0;
          }

          .container {
            max-width: 600px;
            margin: auto;
            background: #ffffff;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
          }

          .logo {
            width: 140px;
            margin-bottom: 20px;
          }

          h2 {
            color: #333333;
            margin-bottom: 10px;
          }

          p {
            color: #555555;
            line-height: 1.6;
          }

          .details {
            background: #f7f7f7;
            padding: 20px;
            border-radius: 8px;
            margin: 25px 0;
          }

          .details table {
            width: 100%;
            border-collapse: collapse;
          }

          .details td {
            padding: 10px 8px;
            vertical-align: top;
            border-bottom: 1px solid #e6e6e6;
          }

          .details tr:last-child td {
            border-bottom: none;
          }

          .label {
            font-weight: bold;
            color: #333;
            width: 35%;
          }

          .value {
            color: #555;
          }

          .footer {
            margin-top: 30px;
            color: #888;
            font-size: 13px;
            text-align: center;
          }
        </style>
      </head>

      <body>

        <div class="container">

          <img
            src="https://emailimage.blob.core.windows.net/emailimage/Logo_Neozar_For%20White%20Background.png"
            alt="Neozaar"
            class="logo"
          />

          <h2>New Contact Form Submission</h2>

          <p>
            A new enquiry has been submitted through the NeoZaar Contact Us form.
            The submission details are below.
          </p>

          <div class="details">
            <table>
              <tr>
                <td class="label">Full Name</td>
                <td class="value">${full_name}</td>
              </tr>

              <tr>
                <td class="label">Business Email</td>
                <td class="value">${business_email}</td>
              </tr>

              <tr>
                <td class="label">Phone Number</td>
                <td class="value">${phone_number || "-"}</td>
              </tr>

              <tr>
                <td class="label">Company Name</td>
                <td class="value">${company_name || "-"}</td>
              </tr>

              <tr>
                <td class="label">Country</td>
                <td class="value">${country || "-"}</td>
              </tr>

              <tr>
                <td class="label">Help Type</td>
                <td class="value">${help_type}</td>
              </tr>

              <tr>
                <td class="label">How They Heard About Us</td>
                <td class="value">${heard_about || "-"}</td>
              </tr>

              <tr>
                <td class="label">Consent Given</td>
                <td class="value">${consent_given ? "Yes" : "No"}</td>
              </tr>

              <tr>
                <td class="label">Message</td>
                <td class="value">${message}</td>
              </tr>
            </table>
          </div>

          <p>
            Please review this enquiry and follow up with the customer if required.
          </p>

          <p>
            Regards,<br />
            <strong>NeoZaar Website</strong>
          </p>

          <div class="footer">
            This is an automated notification generated from the NeoZaar Contact Us form.
          </div>

        </div>

      </body>
      </html>
  `;

  await sendEmail(
    adminEmail,
    "New Contact Form Submission - NeoZaar",
    html,
    true,
  );

  console.log(`✅ Contact form notification sent to ${adminEmail}`);
}

async function sendSellerAssignmentEmail(toEmail, sellerName, itemCount) {
  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Hello ${sellerName},</h2>
        <p>Your product assignments have been updated on NeoZaar.</p>
        <p>You now have <strong>${itemCount}</strong> item(s) assigned to you.</p>
        <p>Please log in to your Seller Dashboard to view your updated assignments and referral links.</p>
        <p>Best regards,<br/>NeoZaar Team</p>
      </body>
    </html>
  `;

  try {
    await sendEmail(toEmail, "Your NeoZaar Seller Assignments Updated", html, true);
  } catch (error) {
    console.error("Error sending seller assignment email:", error);
  }
}

async function sendNewConsultingAdvisorNotification(data) {
  const adminEmail = "info@neozaar.com";
  const adminLink = "https://neozaar.com/admin/login";
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><style>
      body{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px}
      .container{background:#fff;max-width:600px;margin:0 auto;padding:30px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,.1)}
      .logo{width:120px;margin-bottom:20px}
      h2{color:#333;margin-bottom:10px}
      p{color:#555;line-height:1.7;margin-bottom:14px;text-align:left}
      .badge{display:inline-block;background:#f97316;color:#fff;font-size:12px;font-weight:700;padding:4px 12px;border-radius:999px;margin-bottom:20px}
      .details{background:#f7f7f7;padding:20px;border-radius:6px;margin:20px 0}
      .details p{margin:8px 0;font-size:14px}
      .button{display:inline-block;padding:12px 24px;background:#007BFF;color:#fff!important;text-decoration:none;border-radius:5px;font-weight:700;margin-top:16px}
      .footer{margin-top:30px;font-size:12px;color:#999;text-align:center}
    </style></head>
    <body><div class="container">
      <img src="https://emailimage.blob.core.windows.net/emailimage/Logo_Neozar_For%20White%20Background.png" alt="NeoZaar" class="logo">
      <div class="badge">New Consulting Advisor Registration</div>
      <h2>A New Consulting Advisor Has Registered</h2>
      <p>Hi Team,</p>
      <p>A new Consulting Advisor registration has been submitted on NeoZaar and is awaiting your review and approval.</p>
      <div class="details">
        <p><strong>Name:</strong> ${data.name}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Phone:</strong> ${data.mobile || '-'}</p>
        <p><strong>Company:</strong> ${data.company_name || '-'}</p>
        <p><strong>Website:</strong> ${data.website_url || '-'}</p>
        <p><strong>Designation:</strong> ${data.designation || '-'}</p>
        <p><strong>Type of advisor:</strong> ${data.advisor_type || '-'}</p>
      </div>
      <p>Please log in to the admin dashboard to review and approve this registration.</p>
      <a href="${adminLink}" class="button">Review in Dashboard</a>
      <div class="footer"><p>NeoZaar</p></div>
    </div></body></html>
  `;
  await sendEmail(adminEmail, "New Consulting Advisor Registration - NeoZaar", html, true);
}

async function sendSolutionPartnerApprovalEmail(email, name) {
  const loginLink = "https://neozaar.com/auth/login";
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><style>
      body{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px}
      .container{background:#fff;max-width:600px;margin:0 auto;padding:30px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,.1);text-align:center}
      .logo{width:120px;margin-bottom:20px}
      h2{color:#333}
      p{color:#555;line-height:1.7;text-align:left}
      .button{display:inline-block;padding:12px 24px;background:#f97316;color:#fff!important;text-decoration:none;border-radius:5px;font-weight:700;margin-top:16px}
      .footer{margin-top:30px;font-size:12px;color:#999}
    </style></head>
    <body><div class="container">
      <img src="https://emailimage.blob.core.windows.net/emailimage/Logo_Neozar_For%20White%20Background.png" alt="NeoZaar" class="logo">
      <h2>You're Approved as a Solution Partner! 🎉</h2>
      <p>Hi <strong>${name || 'User'}</strong>,</p>
      <p>We're pleased to inform you that your Solution Partner registration on NeoZaar has been reviewed and <strong>approved</strong>.</p>
      <p>You can now log in to your account, list your services, collaborate with ISVs and enterprise customers, and start growing your business on the NeoZaar platform.</p>
      <a href="${loginLink}" class="button">Login to NeoZaar</a>
      <p style="margin-top:20px">Warm regards,<br><strong>Team NeoZaar</strong></p>
      <div class="footer"><p>NeoZaar</p></div>
    </div></body></html>
  `;
  await sendEmail(email, "Your Solution Partner Registration is Approved 🎉", html, true);
}

async function sendConsultingAdvisorApprovalEmail(email, name) {
  const loginLink = "https://neozaar.com/auth/login";
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><style>
      body{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px}
      .container{background:#fff;max-width:600px;margin:0 auto;padding:30px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,.1);text-align:center}
      .logo{width:120px;margin-bottom:20px}
      h2{color:#333}
      p{color:#555;line-height:1.7;text-align:left}
      .button{display:inline-block;padding:12px 24px;background:#f97316;color:#fff!important;text-decoration:none;border-radius:5px;font-weight:700;margin-top:16px}
      .footer{margin-top:30px;font-size:12px;color:#999}
    </style></head>
    <body><div class="container">
      <img src="https://emailimage.blob.core.windows.net/emailimage/Logo_Neozar_For%20White%20Background.png" alt="NeoZaar" class="logo">
      <h2>You're Approved as a Consulting Advisor! 🎉</h2>
      <p>Hi <strong>${name || 'User'}</strong>,</p>
      <p>We're pleased to inform you that your Consulting Advisor registration on NeoZaar has been reviewed and <strong>approved</strong>.</p>
      <p>You can now log in to your account and start referring customer requirements, collaborating on solutioning, and earning through our advisor program.</p>
      <a href="${loginLink}" class="button">Login to NeoZaar</a>
      <p style="margin-top:20px">Warm regards,<br><strong>Team NeoZaar</strong></p>
      <div class="footer"><p>NeoZaar</p></div>
    </div></body></html>
  `;
  await sendEmail(email, "Your Consulting Advisor Registration is Approved 🎉", html, true);
}

module.exports = {
  thankyouEmail,
  approvalMail,
  newProductUploadedBYIsv,
  sendIsvInactiveEmail,
  sendIsvInactiveNotificationEmail,
  sendVerificationEmailToCustomerRegistration,
  sendWelcomeEmail,
  sendProductApprovalEmail,
  sendProductPublishEmail,
  sendIsvWelcomeEmail,
  sendNewIsvRegistrationNotification,
  sendNewConsultingAdvisorNotification,
  sendSolutionPartnerApprovalEmail,
  sendConsultingAdvisorApprovalEmail,
  sendLeadNotification,
  sendSubscriptionConfirmationEmail,
  sendWelcomeMailtoUser,
  sendRoleChangeEmail,
  sendContactFormNotificationEmail,
  sendSellerAssignmentEmail,
};
