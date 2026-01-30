const ChatMessage = require("../../Model/ChatMessage");
const express = require("express");
const router = express.Router();



router.post("/chat/message/:id", async (req, res) => {
  try {
     const {receiverId} = req.params
    const { senderId, message } = req.body;

  
    const chatMessage = new ChatMessage({
      senderId,
      receiverId,
      message,
    });
    await chatMessage.save();
    res.status(200).json({ message: "Message sent successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Internal server error" });
  }
});


module.exports = router;

