const { whatsappManager, ConnectionState } = require("./client");
const { registerClientEvents } = require("./events");
const { isValidIndividualChatId, getIndividualChats } = require("./contacts");
const { sendWhatsAppMessage, getSenderStatus } = require("./sender");

module.exports = {
  whatsappManager,
  ConnectionState,
  registerClientEvents,
  isValidIndividualChatId,
  getIndividualChats,
  sendWhatsAppMessage,
  getSenderStatus
};
