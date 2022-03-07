"use strict";

const { createAudioPlayer, joinVoiceChannel, getVoiceConnection, VoiceConnectionStatus, entersState, createAudioResource, StreamType } = require("@discordjs/voice");

const { updateStatus } = require("./updateStatus.js");
const { requestSpeech } = require("./fakeYou.js");

const audioPlayers = new Map();

/*
  Name: joinVoice(Object interaction)
  Description: Joins the sender's voice channel, creating an audio player if needed
  Returns: None
*/
module.exports.joinVoice = (interaction) => {

	const channel = interaction.member.voice.channel;
	const connection = joinVoiceChannel({
		channelId: channel.id,
		guildId: channel.guildId,
		adapterCreator: channel.guild.voiceAdapterCreator
	});

	entersState(connection, VoiceConnectionStatus.Ready, 5000).then(() => {

		interaction.reply("Joined voice! Use `/sayvc` to make me speak!").catch(console.error);
		updateStatus(interaction.client);

		if (!audioPlayers.has(interaction.guildId)) {
			const player = createAudioPlayer();
			audioPlayers.set(interaction.guildId, player);
			connection.subscribe(player);
		}

	}).catch(error => {
		connection.destroy();
		interaction.reply("Failed to join voice channel!").catch(console.error);
		console.error(error);
	});
}

/*
  Name: leaveVoice(Object interaction)
  Description: Leaves the voice channel and destroys the connection
  Returns: None
*/
module.exports.leaveVoice = (interaction) => {

	const connection = getVoiceConnection(interaction.guildId);
	if (!connection) {
		interaction.reply("I'm not connected to a voice channel! Use `/join` to join.").catch(console.error);
		return;
	}

	connection.destroy();
	audioPlayers.delete(interaction.guildId);
	updateStatus(interaction.client);
	interaction.reply("Left voice! See you later!").catch(console.error);
}

/*
  Name: playVoice(Object interaction, Object voiceInfo, String message)
  Description: Requests and plays speech over voice chat, assuming raw format
  Returns: None
*/
module.exports.playVoice = async(interaction, voiceInfo, message) => {

	const connection = getVoiceConnection(interaction.guildId);
	if (!connection) {
		interaction.reply("I'm not connected to a voice channel! Use `/join` to join.").catch(console.error);
		return;
	}

	const player = audioPlayers.get(interaction.guildId);
	if (!player) {
		interaction.reply("No audio player available!").catch(console.error);
		return;
	}

	await interaction.reply(`Requesting speech from \`${voiceInfo.name}\`, please wait...`).catch(console.error);

	// Launch speech request and poll until completion
	requestSpeech(voiceInfo.id, message).then(url => {

		interaction.editReply(`Playing speech from \`${voiceInfo.name}\`!`).catch(console.error);
		const resource = createAudioResource(url, {
			inputType: StreamType.Raw
		});
		player.play(resource);

		resource.playStream.on("error", error => {
			interaction.editReply(`Failed to play speech! Here's the link instead:\n${url}`).catch(console.error);
			console.error(error);
		});

	}).catch(error => {
		interaction.editReply(error).catch(console.error);
		console.error(error);
	});
}