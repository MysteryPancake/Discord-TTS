"use strict";

const { writeFileSync } = require("fs");
const fetch = require("node-fetch");

(async() => {

	// Request voice list from FakeYou API
	const response = await fetch("https://api.fakeyou.com/tts/list").catch(console.error);
	if (!response.ok) return;

	const data = await response.json().catch(console.error);
	if (!data) return;

	if (!data.success) {
		console.error("API was not successful!");
		return;
	}

	const lookup = new Map();
	data.models.forEach(model => {
		
		let commandName = model.maybe_suggested_unique_bot_command;
		if (!commandName) {
			commandName = model.title.toLowerCase()
				// Remove content after ( / [ characters
				.split(/[(\/\[]/g)[0]
				// Remove content after " - "
				.split(" - ")[0]
				// Normalize accented characters
				.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
				// Remove special characters
				.replace(/[^0-9 a-z-]/gi, "")
				// Remove duplicate spaces
				.replace(/\s+/g, " ")
				// Trim spaces on either side
				.trim()
				// Replace remaining spaces with -
				.replaceAll(" ", "-");
		}
		
		// Avoid duplicates by appending an index
		if (lookup.has(commandName)) {
			let index = 2;
			while (lookup.has(commandName + index)) {
				index++;
			}
			commandName += index;
		}

		// Store in lookup table
		lookup.set(commandName, {
			id: model.model_token,
			name: model.title.trim(),
			categories: model.category_tokens.length > 0 ? model.category_tokens : undefined
		});
	});

	// Sort lookup table
	const sorted = Object.fromEntries([...lookup].sort());
	
	// Stringify lookup table
	const voicelist = JSON.stringify(sorted, null, "\t");
	console.log(voicelist);

	// Write to voicelist.json
	writeFileSync("voicelist.json", voicelist);

	console.log(`Processed ${lookup.size}/${data.models.length} voice models!`);

})();