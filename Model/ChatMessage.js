

const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
//   chatId: {
//     type: mongoose.Schema.Types.ObjectId,   
//     ref: 'Chat',
//     required: true,
//   },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,     
  } ,
  message: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});      

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
  