"use strict";

const { SlashCommandBuilder } = require("@discordjs/builders");

const { joinVoice } = require("../shared/voiceManager.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("join")
		.setDescription("Joins your voice channel."),
	async execute(interaction) {
		if (!interaction.guild) {
			interaction.reply("This command only works on servers!").catch(console.error);
		} else if (interaction.member && interaction.member.voice.channel) {
			joinVoice(interaction);
		} else {
			interaction.reply("Join a voice channel first!").catch(console.error);
		}
	}
};