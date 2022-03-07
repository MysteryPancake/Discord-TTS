"use strict";

const { SlashCommandBuilder } = require("@discordjs/builders");

const { leaveVoice } = require("../shared/voiceManager.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("leave")
		.setDescription("Leaves your voice channel."),
	async execute(interaction) {
		if (!interaction.guild) {
			interaction.reply("This command only works on servers!").catch(console.error);
		} else {
			leaveVoice(interaction);
		}
	}
};