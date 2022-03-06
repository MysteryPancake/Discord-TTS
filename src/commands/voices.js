"use strict";

const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageActionRow, MessageButton, MessageEmbed } = require("discord.js");

const { getVoiceList } = require("../shared/fakeyou.js");
const maxPerPage = 25;

function generateEmbed(voiceList, user, page, pageCount) {

	const embed = new MessageEmbed()
		.setColor("#209CEE")
		.setTitle("Voice List")
		.setURL("https://github.com/MysteryPancake/Discord-TTS/blob/master/docs/voices.md")
		.setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
		.setDescription("Voices are much easier to navigate on the website linked above.")
		.setFooter({ text: `Page ${page + 1} / ${pageCount} (${voiceList.length} voices)` });

	const offset = page * maxPerPage;
	for (let i = offset; i < offset + maxPerPage; i++) {
		const model = voiceList[i];
		if (!model) break;
		embed.addField(`\`${model[0]}\``, model[1].name, true);
	}

	return embed;
}

function generateButtons(page, pageCount) {
	return new MessageActionRow().addComponents([
		new MessageButton()
			.setCustomId("prev")
			.setLabel("Previous")
			.setStyle("PRIMARY")
			.setDisabled(page <= 0),
		new MessageButton()
			.setCustomId("next")
			.setLabel("Next")
			.setStyle("PRIMARY")
			.setDisabled(page >= pageCount - 1)
	]);
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName("voices")
		.setDescription("Lists all available voices."),
	async execute(interaction) {

		let voiceList = await getVoiceList();
		if (!voiceList) {
			interaction.reply(`Could not get voice list!`).catch(console.error);
			return;
		}
		voiceList = Object.entries(voiceList);

		let page = 0;
		const pageCount = Math.ceil(voiceList.length / maxPerPage);
		
		const message = await interaction.reply({
			embeds: [
				generateEmbed(voiceList, interaction.client.user, page, pageCount)
			],
			components: [
				generateButtons(page, pageCount)
			],
			fetchReply: true,
			ephemeral: true
		}).catch(console.error);
		if (!message) return;

		message.createMessageComponentCollector().on("collect", interact => {
			// Adjust displayed page
			page += interact.customId === "prev" ? -1 : 1;
			// Clamp to range of pages
			page = Math.min(Math.max(page, 0), pageCount - 1);
			// Update embed and buttons
			interact.update({
				embeds: [
					generateEmbed(voiceList, interaction.client.user, page, pageCount)
				],
				components: [
					generateButtons(page, pageCount)
				]
			});
		});
	}
};