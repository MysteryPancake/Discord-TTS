"use strict";

const { SlashCommandBuilder } = require("@discordjs/builders");
const { createWriteStream } = require("fs");
const { randomBytes } = require("crypto");
const { pipeline } = require("stream");
const { promisify } = require("util");
const { unlink } = require("fs");
const fetch = require("node-fetch");

const { requestSpeech, getVoiceList } = require("../shared/fakeYou.js");

/*
  Name: requestSpeechFile(String voice, String message): String
  Description: Requests speech, polls and downloads the result
  Returns: File path on success, error message on failure
*/
function requestSpeechFile(voice, message) {
	return new Promise(async(resolve, reject) => {

		// Launch speech request and poll until completion
		const url = await requestSpeech(voice, message).catch(reject);
		if (!url) return;

		const response = await fetch(url).catch(error => {
			reject(`HTTP error! ${error.name}`);
			console.error(error);
		});
		if (!response.ok) return;

		// Generate random temporary filename to avoid overwriting other recordings
		const filePath = `./${randomBytes(48).toString("hex")}.wav`;

		const streamPipeline = promisify(pipeline);
		await streamPipeline(response.body, createWriteStream(filePath)).then(() => {
			resolve(filePath);
		}).catch(error => {
			if (!error) return;
			reject("Failed to write file!");
			console.error(error);
		});
	});
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName("tts")
		.setDescription("Generates speech using FakeYou, sent as an attachment.")
		.addStringOption(option =>
			option.setName("voice")
				.setDescription("Voice model to speak with. Use /voices to list all options.")
				.setRequired(true))
		.addStringOption(option =>
			option.setName("message")
				.setDescription("Message to speak.")
				.setRequired(true)),
	async execute(interaction) {

		const voice = interaction.options.getString("voice").toLowerCase();
		const message = interaction.options.getString("message");
		if (!voice || !message) {
			interaction.reply("Both `voice` and `message` are required!").catch(console.error);
			return;
		}

		const voiceList = await getVoiceList();
		if (!voiceList) {
			interaction.reply(`Failed to get voice list!\n\nMessage was \"${message}\"`).catch(console.error);
			return;
		}

		const voiceInfo = voiceList[voice];
		if (!voiceInfo) {
			interaction.reply(`No voice named \`${voice}\`!\nUse \`/voices\` to list available voices.\n\nMessage was \"${message}\"`).catch(console.error);
			return;
		}

		await interaction.reply(`Requesting speech from \`${voiceInfo.name}\`, please wait...`).catch(console.error);
		requestSpeechFile(voiceInfo.id, message).then(async(filePath) => {

			// Send temporary file as message attachment
			await interaction.editReply({
				content: `\`${voiceInfo.name}\` says \"${message}\"`,
				files: [{
					attachment: filePath,
					name: `${message.replace(/\W/g, "_")}.wav`
				}]
			}).catch(console.error);

			// Delete temporary file after sending
			unlink(filePath, error => {
				if (!error) return;
				console.error(error);
			});

		}).catch(error => {
			interaction.editReply(`${error}\n\nMessage was \"${message}\"`).catch(console.error);
			console.error(error);
		});
	}
};