const nodemailer = require("nodemailer");

  const otpMail = async (email, otp, subject) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  });

  const htmlTemplate = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      @keyframes fadeIn {
        0% { opacity: 0; transform: translateY(-10px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      body {
        font-family: Arial, sans-serif;
        background: #f3f4f6;
        margin: 0;
        padding: 0;
        text-align: center;
      }
      .container {
        background: #fff ;
        max-width: 400px;
        margin: 40px auto;
        padding: 30px;
        border-radius: 12px;
        box-shadow: 0 5px 20px rgba(244, 244, 244, 1);
        animation: fadeIn 0.8s ease-in-out;
      }
      .logo {
  width: 200px;        
  max-width: 100%;     
  height: auto;
  display: block;      
  margin: 0 auto 20px;
}
      h2 {
        color: #333;
      }
      .otp {
        font-size: 32px;
        font-weight: bold;
        color: #064E3B;
        letter-spacing: 6px;
        margin: 20px 0;
        animation: fadeIn 1.5s ease-in-out infinite alternate;
      }
      p {
        color: #666;
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <img src="https://res.cloudinary.com/dkz8fh4jt/image/upload/v1765215349/bgremoveLogo_sz8ee9.png" 
           alt="Logo" class="logo" />
      <h2> OTP </h2>
      <div class="otp">${otp}</div>
      <p>This OTP will expire in 10 minutes.<br/>Do not share it with anyone.</p>
    </div>
  </body>
  </html>
  `;

  await transporter.sendMail({
    from: `"BENFATTO" <${process.env.EMAIL}>`,
    to: email,
    subject: subject,
    html: htmlTemplate,
  });
};


 const RegisterMail = async (email, firstname) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  });
  transporter.verify((err) => {
  if (err) {
    console.error("❌ Email server error:", err.message);
  } else {
    console.log("✅ Email server ready");
  }
});

  const htmlTemplate = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body {
        font-family: Arial, sans-serif;
        background: #f3f4f6;
        margin: 0;
        padding: 0;
        text-align: center;
      }
      .container {
        background: #fff ;
        max-width: 400px;
        margin: 40px auto;
        padding: 30px;
        border-radius: 12px;
        box-shadow: 0 5px 20px rgba(244, 244, 244, 1);
        animation: fadeIn 0.8s ease-in-out;
      }
      .logo {
        width: 180px;
        margin-bottom: 20px;
      }
      h2 {
        color: #111827;
        margin-bottom: 10px;
      }
      p {
        color: #4b5563;
        font-size: 14px;
        line-height: 1.6;
      }
      .success {
        font-size: 18px;
        font-weight: 600;
        color: #065f46;
        margin: 20px 0;
      }
      .footer {
        font-size: 12px;
        color: #9ca3af;
        margin-top: 30px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <img 
        src="https://res.cloudinary.com/dkz8fh4jt/image/upload/v1765215349/bgremoveLogo_sz8ee9.png" 
        alt="BENFATTO Logo" 
        class="logo"
      />
      <h2>Welcome to GROVIYA 🎉</h2>
      <p class="success">Registration Successful</p>
      <p>
        Hi ${firstname},<br /><br />
        Your account has been created successfully.<br />
        You can now log in and start using all features.
      </p>
      <p>
        If you didn’t create this account, please contact our support team immediately.
      </p>
      <div class="footer">
        © ${new Date().getFullYear()} BENFATTO. All rights reserved.
      </div>
    </div>
  </body>
  </html>
  `;

  await transporter.sendMail({
    from: `"BENFATTO" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Registration Successful 🎉",
    html: htmlTemplate,
  });
};




module.exports ={otpMail,RegisterMail}