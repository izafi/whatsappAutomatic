const { whatsappManager, sendWhatsAppMessage, getIndividualChats, ConnectionState } = require("../whatsapp");
const { schedulerEngine, startScheduler, stopScheduler, restartScheduler } = require("../scheduler");
const { configService } = require("../config");

module.exports = {
  whatsappService: {
    manager: whatsappManager,
    sendMessage: sendWhatsAppMessage,
    getChats: getIndividualChats,
    states: ConnectionState
  },
  schedulerService: {
    engine: schedulerEngine,
    start: startScheduler,
    stop: stopScheduler,
    restart: restartScheduler
  },
  configService
};
