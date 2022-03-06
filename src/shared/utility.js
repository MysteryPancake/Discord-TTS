"use strict";

/*
  Name: updateStatus(Client client)
  Description: Updates the number of active voice connections displayed as the bot status
  Returns: None
*/
module.exports.updateStatus = (client) => {
	const voices = client.voice.adapters.size;
	client.user.setActivity(`${voices} voice${voices === 1 ? "" : "s"}`, { type: "PLAYING" });
};