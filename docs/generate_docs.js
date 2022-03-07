"use strict";

const { writeFileSync } = require("fs");
const fetch = require("node-fetch");

const { getVoiceList } = require("../src/shared/fakeYou.js");

/*
  Name: formatModel(Array model): String
  Description: Formats a voice model to be displayed to users
  Returns: Formatted string
*/
function formatModel(model) {
	return `\n- \`${model[0]}\`: ${model[1].name}`;
}

/*
  Name: formatCategory(Object category, Integer currentDepth): String
  Description: Traverses the subcategories of each category, formatting all voice models
  Returns: Formatted string
*/
function formatCategory(category, currentDepth) {

	let result = `\n\n${"#".repeat(currentDepth)} ${category.name}`;
	if (category.models) {
		category.models.forEach(model => {
			result += formatModel(model);
		});
	}

	if (category.subcategories) {
		category.subcategories.forEach(child => {
			result += formatCategory(child, currentDepth + 1);
		});
	}
	return result;
}

(async() => {

	// Request voice category list from FakeYou API
	const response = await fetch("https://api.fakeyou.com/category/list/tts").catch(console.error);
	if (!response.ok) return;

	const data = await response.json().catch(console.error);
	if (!data) return;

	if (!data.success) {
		console.error("API was not successful!");
		return;
	}

	// Build hierarchy of categories
	const categories = new Map();
	const parentCategories = [];

	data.categories.forEach(category => {
		categories.set(category.category_token, category);
		if (!category.maybe_super_category_token) {
			parentCategories.push(category);
		}
	});

	// Retrieve voice list
	let voiceList = await getVoiceList();
	if (!voiceList) return;
	voiceList = Object.entries(voiceList);

	// Store voice models within their appropriate categories
	const uncategorized = [];
	voiceList.forEach(model => {
		const voiceInfo = model[1];
		if (voiceInfo.categories) {

			// For a model to be categorized, at least one category ID must be valid
			let validCategory = false;
			voiceInfo.categories.forEach(categoryID => {

				// If the category ID exists, it is valid
				const categoryInfo = categories.get(categoryID);
				if (categoryInfo) {

					validCategory = true;
					categoryInfo.models = categoryInfo.models ?? new Set();
					categoryInfo.models.add(model);

					// Add subcategories to the children of the parent category
					if (categoryInfo.maybe_super_category_token) {
						const parentInfo = categories.get(categoryInfo.maybe_super_category_token);
						if (parentInfo) {
							parentInfo.subcategories = parentInfo.subcategories ?? new Set();
							parentInfo.subcategories.add(categoryInfo);
						}
					}
				}
			});

			if (!validCategory) {
				uncategorized.push(model);
			}
		} else {
			uncategorized.push(model);
		}
	});

	// Build result string
	let result = `<img src="../images/icon.png?raw=true" width="75" align="left">\n\n# Discord Text to Speech Voice List`;

	// Traverse topmost categories
	parentCategories.forEach(child => {
		result += formatCategory(child, 2);
	});

	// List uncategorized voice models
	result += "\n\n## Uncategorized";
	uncategorized.forEach(model => {
		result += formatModel(model);
	});

	// Write to voices.md
	writeFileSync("voices.md", result);

	console.log(`Processed ${categories.size} categories!`);
	console.log(`${uncategorized.length}/${voiceList.length} voice models were uncategorized!`);

})();