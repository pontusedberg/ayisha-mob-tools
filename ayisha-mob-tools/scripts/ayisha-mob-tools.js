import { moduleName, initSettings } from "./settings.js";
import { calculateWeaponAttackBonus, getTargetData, prepareActors } from "./dnd_utility.js";

function initMobAttackTool() { 
	Hooks.on("getSceneControlButtons", (controls) => {
		const playerAccess = game.settings.get(moduleName, "playerAccess");
		const bar = controls.find(c => c.name === "token");
		bar.tools.push({
			name: game.i18n.localize("MAT.name"),
			title: game.i18n.localize("MAT.mobAttack"),
			icon: "fa-solid fa-skull",
			//visible: (playerAccess ? true : game.user.isGM),
			onClick: async () => mobAttackTool(),
			button: true
		});
	});
}

Hooks.once("init", () => {
	console.log("Ayisha's Mob Attack Tool Loaded!");
	initSettings();
	initMobAttackTool();
})

async function mobAttackTool() {
	// Check selected tokens
	let mobList = game.settings.get(moduleName, "hiddenMobList");
	let mobLength = 0;
	for (let i = 0; i < Object.keys(mobList).length; i++) {
		if (mobList[Object.keys(mobList)[i]].userId === game.user.id) {
			mobLength++;
			
		}
	}
	
	if (canvas.tokens.controlled.length === 0 && mobLength === 0) {
		ui.notifications.warn(game.i18n.localize("MAT.selectTokenWarning"));
		return;
	}

	// Set hiddenChangeMob to false, which is the default. Set it to false everytime the tool is opened.
	await game.settings.set(moduleName, "hiddenChangedMob", false);

	// create dialog
	const mobDialog = new MobAttackDialog();
	mobDialog.render(true);
	//game.mobAttackTool.dialogs.set(mobDialog.appId, mobDialog);
	//await game.settings.set(moduleName, "currentDialogId", mobDialog.appId);
}


class MobAttackDialog extends FormApplication {

	// Constructor for MobAttackDialog.
	// Initialize variables.
	constructor(dialogData = {}, options = {}) {
		super(dialogData, options);
		this.data = dialogData;
		//this.options.classes = ["mat-monster-icon", "mat-weapon-icon"];
		this.actorList = [];
		this.mobListIndex = 0;
		//this.armorClassMod = (game.user.getFlag(moduleName, "persistACmod") ?? game.settings.get(moduleName, "persistACmod")) ? game.settings.get(moduleName, "savedArmorClassMod") : 0;

		//this.collapsibleName = game.i18n.localize("Show options");
		//this.collapsibleCSS = "mat-collapsible-content-closed";
		//this.collapsiblePlusMinus = "plus";

		//this.rollTypeSelection = { advantage: "", normal: "selected", disadvantage: "" };

		this.numTotalAttacks = 0;
		this.totalAverageDamage = 0;
		this.localUpdate = false;
		this.targetUpdate = false;

		this.currentlySelectingTokens = false;
		this.targets = [];

		let mobList = game.settings.get(moduleName, "hiddenMobList");
		if (canvas.tokens.controlled.length === 0 && Object.keys(mobList).length === 0) {
			this.close();
		}


	}

	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			title: "Ayisha's Mob Attack Tool",
			id: "ayisha-mob-attack-tool-dialog",
			template: "modules/ayisha-mob-tools/templates/mat-dialog-new.html",
			width: "505",
			height: "auto",
			closeOnSubmit: false,
			//tabs: [{ navSelector: ".tabs", contentSelector: "form", initial: "weapons" }],
			//dragDrop: [{ dragSelector: ".target-attack-box", dropSelector: ".mat-attacks-on-target-box" }]
		})
	}

	// Fetch data from the Foundry canvas.
 	async getData() {

		// - Get selected tokens.
		//		- actorList: Actors from the selected tokens.
		//		- mobName: User-made name for the group.
		// - Get targeted tokens.
		//			- Get target's AC.


		// Used for creating the name of the mob group.
		let mobList = game.settings.get(moduleName, "hiddenMobList");

		// Check for multilevel tokens. Not used currently.
		/* this.targetTokens = canvas.tokens.placeables.filter(t => t.isTargeted);
		for (let i = 0; i < this.targetTokens.length; i++) {
			if (this.targetTokens[i].actor === null && game.modules.get("multilevel-tokens").active) {
				let mltFlags = this.targetTokens[i].data.flags["multilevel-tokens"];
				if (this.targetTokens.filter(t => t.id === mltFlags.stoken).length > 0) {
					this.targetTokens.splice(i, 1);
					i--;
				}
			}
		} */

		// Get data from the targeted tokens.
		this.targetTokens = canvas.tokens.placeables.filter(t => t.isTargeted);
		this.targetToken = canvas.tokens.placeables.find(t => t.isTargeted);
		
		// Get the number of targeted tokens.
		this.numTargets = 0;
		if (this.targetToken) {
		
			this.numTargets = this.targetTokens.length;
		}

		// Get target's AC.
		if (this.targetToken) {

			this.targetAC = this.targetToken.actor.system.attributes.ac.value;

			// Check for multilevel tokens. Not currently used.
			/* if (this.targetToken.actor === null && game.modules.get("multilevel-tokens").active) {
				let mltFlags = this.targetToken.data.flags["multilevel-tokens"];
				if (mltFlags?.sscene) {
					this.targetAC = game.scenes.get(mltFlags.sscene).data.tokens.get(mltFlags.stoken).actor.system.attributes.ac.value;
				} else {
					this.targetAC = canvas.tokens.get(mltFlags.stoken).actor.system.attributes.ac.value;
				}
			} else {
				this.targetAC = this.targetToken.actor.system.attributes.ac.value;
			} */
		}

		// Get the number of selected tokens.
		this.numSelected = canvas.tokens.controlled.length;

		// Check if more than one tokens are selected, then give them "s" as suffix.
		this.pluralTokensOrNot = ((this.numSelected === 1) ? `` : `s`);

		// old: actorList. new: tokenList. Object with data for the selected tokens.
		let actorList = [];


		let mobName = game.settings.get(moduleName, 'hiddenMobName'); // Not sure what it does. Used with defaultMobPrefix and Suffix to create the name of the mob group.		
		
		
		// hiddenChangeMob is usually false. It is set to true when loadMob function is used.
		if (game.settings.get(moduleName, "hiddenChangedMob")) {
			
		// Currently not used. Used when loading new mobs?
			/* mobName = Object.keys(mobList)[this.mobListIndex];
			let mobData = mobList[mobName];
			for (let monster of mobData.monsters) {
				for (let i = 0; i < monster.amount; i++) {
					actorList.push(game.actors.get(monster.id));
				}
			}
			// Select mob tokens
			if (!this.localUpdate) {
				this.currentlySelectingTokens = true;
				canvas.tokens.releaseAll();
				for (let tokenId of mobList[Object.keys(mobList)[this.mobListIndex]].selectedTokenIds) {
					if (canvas.tokens.placeables.filter(t => t.id === tokenId).length > 0) {
						canvas.tokens.get(tokenId).control({ releaseOthers: false })
					}
				}
				this.numSelected = canvas.tokens.controlled.length;
				this.currentlySelectingTokens = false;
			} */

		} else {

			
			// Currently not used. Set correct index for saved mobs
			/* for (let i = 0; i < Object.keys(mobList).length; i++) {
				if (mobList[Object.keys(mobList)[i]].userId === game.user.id) {
					this.mobListIndex = i;
					break;
				}
			} */

			// Generate default group name
			// This is not a good idea. Needs to be changed.
			// If something tokens are selected and there are no actors in the mobList.
			let groupNo = game.settings.get(moduleName, "GroupNo");
			if ((this.numSelected > 0 || Object.keys(mobList).length === 0)) {
				groupNo = groupNo + 1;
				await game.settings.set(moduleName, 'GroupNo', groupNo);
				// Currently not used. Generate a default group name with prefix and suffix
				/* mobName = `${game.settings.get(moduleName, "defaultMobPrefix")} ${canvas.tokens.controlled[0]?.name}${game.settings.get(moduleName, "defaultMobSuffix")}`; */
				mobName = `Group ${groupNo}`; 
			} else {
				// Currently not used. If nothing is selected but there are actors already in the mobList.
				/* mobName = `${Object.keys(mobList)[this.mobListIndex]}`; */
			}
			// Save group name to setting variables.
			await game.settings.set(moduleName, 'hiddenMobName', mobName);


			// Generate actorList from data from selected tokens on canvas. 
			// If something tokens are selected and there are no actors in the mobList.
			if (this.numSelected > 0 || Object.keys(mobList).length === 0) {
				for (let token of canvas.tokens.controlled) {
					// Push all token.actors to actorList.
					actorList.push(token.actor);
				}
			} else {
			// Currently not used. Push actors from a saved mobList to actorList.
				/* for (let monster of mobList[Object.keys(mobList)[this.mobListIndex]].monsters) {
					for (let i = 0; i < monster.amount; i++) {
						actorList.push(game.actors.get(monster.id));
					}
				}
				// Select mob tokens
				this.currentlySelectingTokens = true;
				canvas.tokens.releaseAll(); // Foundry class TokenLayer method. Not sure what it does.
				for (let tokenId of mobList[Object.keys(mobList)[this.mobListIndex]].selectedTokenIds) {
					if (canvas.tokens.placeables.filter(t => t.id === tokenId).length > 0) {
						canvas.tokens.get(tokenId).control({ releaseOthers: false })
					}
				}
				this.numSelected = canvas.tokens.controlled.length;
				this.currentlySelectingTokens = false; */
			}
		}
		
		
		let monsters = {};
		let weapons = {};
		let availableAttacks = {};
		
		// Create new objects/lists for actors, weapons and availableattacks.
		[monsters, weapons, availableAttacks] = await prepareActors(actorList);

		// determine if newly determined monsters (+ weapons) should be used, or the already stored (and posssibly modified) data
		// If localUpdate is false
		if (!this.localUpdate) {
			this.actorList = actorList;
			this.weapons = { ...weapons };
			this.monsters = monsters;
			this.availableAttacks = availableAttacks;
		}

		
		// calculate total number of attacks and average damage
		// Code does not work
		/* this.numTotalAttacks = 0;
		this.totalAverageDamage = 0;
		for (let [monsterKey, monsterData] of Object.entries(this.monsters)) {
			for (let [weaponKey, weaponData] of Object.entries(monsterData.weapons)) {
				if (weaponData.useButtonValue === `checked`) {
					this.numTotalAttacks += weaponData.numAttack * this.monsters[monsterKey].amount;
					this.totalAverageDamage += weaponData.numAttack * weaponData.averageDamage * this.monsters[monsterKey].amount;
				}
			}
		} */

		// Continue from here!!
		// create (and/or update) target data
		//let targets = await getTargetData(this.monsters);

		/* if (!this.targetUpdate) {
			this.targets = targets;
		} else {
			this.targetUpdate = false;
			for (let i = 0; i < this.targets.length; i++) {
				let targetTotalNumAttacks = this.targets[i].weapons.length;
				let targetTotalAverageDamage = 0;
				for (let weapon of this.targets[i].weapons) {
					targetTotalAverageDamage += weapon.averageDamage;
				}
				this.targets[i].targetTotalNumAttacks = targetTotalNumAttacks;
				this.targets[i].targetTotalAverageDamage = targetTotalAverageDamage;
			}
		} */

		/* if (this.localUpdate) this.localUpdate = false;

		let noTargetACtext = ((!this.targetToken) ? ` ${game.i18n.localize("MAT.noTargetAllAttacksHitText")}` : ``); */
		
		/* let data = {
			mobName: mobName,
			numSelected: this.numSelected,
			numTargets: this.numTargets,
			multipleTargets: this.numTargets > 1,
			pluralTokensOrNot: ((this.numSelected === 1) ? `` : `s`),
			targets: this.targets,
			noTargetACtext: noTargetACtext,
			armorClassMod: (game.user.getFlag(moduleName, "persistACmod") ?? game.settings.get(moduleName, "persistACmod")) ? game.settings.get(moduleName, "savedArmorClassMod") : this.armorClassMod,
			monsters: this.monsters,
			selectRollType: game.settings.get(moduleName, "askRollType"),
			hiddenCollapsibleName: this.collapsibleName,
			hiddenCollapsibleCSS: this.collapsibleCSS,
			collapsiblePlusMinus: this.collapsiblePlusMinus,
			numTotalAttacks: this.numTotalAttacks,
			totalAverageDamage: this.totalAverageDamage,
			rollTypeSelection: this.rollTypeSelection
		};
		data.isGM = game.user.isGM; */

		let data = {
			mobName: mobName,
			monsters: this.monsters,
		};

		let weaponArray = [];
		for (let [weaponID, weaponData] of Object.entries(weapons)) {
			weaponArray.push(weaponData);
		}
		let monsterArray = [];
		for (let [monsterID, monsterData] of Object.entries(monsters)) {
			monsterArray.push(monsterData);
		}
		this.monsterArray = monsterArray;
		this.weaponArray = weaponArray;

		this.data = data;

		/* let data = {
			mobName: mobName,
			monsters: this.monsters,
		};

 		let monsterArray = [];
		for (let [monsterID, monsterData] of Object.entries(monsters)) {
			monsterArray.push(monsterData);
		} 
 		this.monsterArray = monsterArray;

		 let weaponArray = [];
		 for (let [weaponID, weaponData] of Object.entries(weapons)) {
			 weaponArray.push(weaponData);
		 }
		 this.weaponArray = weaponArray;

		this.data = data; */

		return data
	} 

	activateListeners(html) {
		super.activateListeners(html);
	
			// render the mob attacker's sheet if its image is clicked
			html.on('click', '.actor_sheet', (event) => {
				const monster = this.monsterArray.find((m) => m.id === event.currentTarget.dataset?.itemId);
				game.actors.get(monster?.id)?.sheet.render(true);
			})

		// render the item's sheet if its image is clicked
		html.on('click', '.weapon_sheet', (event) => {
			const weapon = this.weaponArray.find((w) => w.id === event.currentTarget.dataset?.itemId);
			weapon?.sheet.render(true);
		})
	}

}

