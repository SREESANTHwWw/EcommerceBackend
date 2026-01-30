import crypto from "crypto";

export const sendToken = (user, statusCode, res) => {
    const token = user.getJwtToken();

    const options = {
        expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
    };

    res.status(statusCode)
        .cookie("token", token, options)
        .json({
            success: true,
            user: {
                id: user._id,
                email: user.email
            },
            token,
        });
};


export const resetSession = (user) => {
  const resetToken = crypto.randomBytes(32).toString("hex");

  // Store hashed token in DB
  user.resetSessionToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set expiry (10 min)
  user.resetSessionExpiry = Date.now() + 10 * 60 * 1000;

  return resetToken; // Send this to the user
};







