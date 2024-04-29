// Calculate "To-Hit" or weaponAttackBonus. 
// Is there an easier way to get this from Foundry?
export function calculateWeaponAttackBonus(weaponData) {
	let weaponAbility = weaponData.abilityMod;
	if (weaponAbility === "" || typeof weaponAbility === "undefined" || weaponAbility == null) {
		if (!weaponData.type === "spell") {
			weaponAbility = "str";
		} else {
			weaponAbility = weaponData.actor.system.attributes.spellcasting;
		}
	}
	const actorAbilityMod = parseInt(weaponData.actor.system.abilities[weaponAbility].mod);
	const attackBonus = parseInt(weaponData.system.attackBonus) || 0;
	let profBonus;
	if (weaponData.type != "spell") {
		profBonus = parseInt(((weaponData.system.proficient) ? weaponData.actor.system.attributes.prof : 0));
	} else {
		profBonus = parseInt(weaponData.actor.system.attributes.prof);
	}
	let finalAttackBonus = actorAbilityMod + attackBonus + profBonus;

	return finalAttackBonus;
}

export async function getTargetData(monsters) {

	// Get targets from canvas.
	let targetTokens = canvas.tokens.placeables.filter(t => t.isTargeted);

	// Currently not used.
	/* for (let i = 0; i < targetTokens.length; i++) {
		if (targetTokens[i].actor === null && game.modules.get("multilevel-tokens").active) {
			let mltFlags = targetTokens[i].flags["multilevel-tokens"];
			if (targetTokens.filter(t => t.id === mltFlags.stoken).length > 0) {
				targetTokens.splice(i, 1);
				i--;
			}
		}
	} */

	let weaponsOnTarget = {};
	for (let [monsterID, monsterData] of Object.entries(duplicate(monsters))) {
		Object.assign(weaponsOnTarget, monsterData.weapons);
		for (let i = 0; i < monsterData.amount - 1; i++) {
			for (let weaponID of Object.keys(monsterData.weapons)) {
				if (weaponsOnTarget[weaponID]) {
					weaponsOnTarget[weaponID + String(i)] = monsterData.weapons[weaponID];
				}
			}
		}
	}

	let weaponsOnTargetArray = [];
	for (let [weaponID, weaponData] of Object.entries(weaponsOnTarget)) {
		if (weaponData.useButtonValue !== `checked`) {
			delete weaponsOnTarget[weaponID];
		} else {
			for (let j = 0; j < weaponData.numAttack; j++) {
				let singleWeaponData = duplicate(weaponData);
				singleWeaponData.numAttack = 1;
				weaponsOnTargetArray.push(singleWeaponData);
			}
		}
	}

	let targets = [];
	let targetCount = 0;
	let arrayStart = 0;
	let targetAC = 10;
	let arrayLength = Math.floor(weaponsOnTargetArray.length / targetTokens.length);
	let armorClassMod = game.settings.get(moduleName, "savedArmorClassMod");
	if (arrayLength === 0) arrayLength = 1;
	for (let targetToken of targetTokens) {
		if (targetToken.actor === null && game.modules.get("multilevel-tokens").active) {
			let mltFlags = targetToken.flags["multilevel-tokens"];
			if (mltFlags?.sscene) {
				targetAC = game.scenes.get(mltFlags.sscene).tokens.get(mltFlags.stoken).actor.system.attributes.ac.value;
			} else {
				targetAC = canvas.tokens.get(mltFlags.stoken).actor.system.attributes.ac.value;
			}
		} else {
			targetAC = targetToken?.actor.system.attributes.ac.value;
		}
		let targetImg = targetToken?.document.texture.src ?? "icons/svg/mystery-man.svg";
		if (VideoHelper.hasVideoExtension(targetImg)) {
			targetImg = await game.video.createThumbnail(targetImg, { width: 100, height: 100 });
		}
		targets.push({
			targetId: targetToken?.id,
			targetImg: targetImg,
			targetImgName: targetToken?.name ?? "Unknown target",
			isGM: game.user.isGM,
			weapons: weaponsOnTargetArray.slice(arrayStart, arrayLength * (1 + targetCount)),
			noWeaponMsg: '',
			targetIndex: targetCount,
			targetAC: targetAC + armorClassMod,
			targetACtext: ((game.user.isGM) ? ` ${game.i18n.localize("MAT.dialogTargetArmorClassMessage")}` : ``)
		})

		let targetTotalNumAttacks = targets[targets.length - 1].weapons.length;
		let targetTotalAverageDamage = 0;
		for (let weapon of targets[targets.length - 1].weapons) {
			targetTotalAverageDamage += weapon.averageDamage;
		}
		targets[targets.length - 1]["targetTotalNumAttacks"] = targetTotalNumAttacks;
		targets[targets.length - 1]["targetTotalAverageDamage"] = targetTotalAverageDamage;

		if (targetCount === targetTokens.length - 1) {
			for (let i = 0; i < (weaponsOnTargetArray.length - arrayLength * (1 + targetCount)); i++) {
				targets[i].weapons.push(weaponsOnTargetArray[weaponsOnTargetArray.length - 1 - i]);
				targets[i].targetTotalNumAttacks += 1;
				targets[i].targetTotalAverageDamage += weaponsOnTargetArray[weaponsOnTargetArray.length - 1 - i].averageDamage;
			}
		}
		arrayStart = arrayLength * (1 + targetCount);
		targetCount++;
	}

	for (let target of targets) {
		if (target.weapons.length === 0) {
			target.noWeaponMsg = "None";
		}
	}
	return targets;
}

// Get damage labels.
function getDamageFormulaAndType(weaponData, versatile) {
	//let cantripScalingFactor = getScalingFactor(weaponData);
	let cantripScalingFactor = "0";
	let diceFormulas = [];
	let damageTypes = [];
	let damageTypeLabels = []
	let lengthIndex = 0;
	for (let diceFormulaParts of weaponData.system.damage.parts) {
		damageTypeLabels.push(diceFormulaParts[1]);
		damageTypes.push(diceFormulaParts[1].capitalize());
		if (weaponData.type == "spell") {
			if (weaponData.system.scaling.mode == "cantrip") {
				let rollFormula = new Roll(((versatile && lengthIndex === 0) ? weaponData.system.damage.versatile : diceFormulaParts[0]), { mod: weaponData.actor.system.abilities[weaponData.abilityMod].mod });
				rollFormula.alter(0, cantripScalingFactor, { multiplyNumeric: false })
				diceFormulas.push(rollFormula.formula);
			} else {
				diceFormulas.push(((versatile && lengthIndex === 0) ? weaponData.system.damage.versatile : diceFormulaParts[0]).replace("@mod", weaponData.actor.system.abilities[weaponData.abilityMod].mod));
			}
		} else {
			diceFormulas.push(((versatile && lengthIndex === 0) ? weaponData.system.damage.versatile : diceFormulaParts[0]).replace("@mod", weaponData.actor.system.abilities[weaponData.abilityMod].mod));
		}
		lengthIndex++;
	}

    return [damageTypes, damageTypeLabels];
}

// old: prepareMonsters
// Prepare objects with data for the selected actors.
export async function prepareActors(actorList, keepCheckboxes = false, oldMonsters = {}, weapons = {}, availableAttacks = {}) {

	// old: monsters. new: 
	let monsters = {};
    
	// Loop through the actorList.
	for (let actor of actorList) {

		// Check that tokens are selected.
		if (monsters[actor.id]) {
			
			// Check if the actor.id already exists, then increase amount by 1.
			if (monsters[actor.id].id === actor.id) {
				monsters[actor.id].amount += 1;
			}
		} else {
			// Add a new unique actor.id.
			monsters[actor.id] = { id: actor.id, amount: 1, optionVisible: false, img: actor.img, name: actor.name };
		}
	}	
    
	//Continue from here!!!
	for (let actor of actorList) {
		if (monsters[actor.id]) {
            
			if (!monsters[actor.id].optionVisible) {
                
				let monsterData = {
					id: monsters[actor.id].id,
					amount: monsters[actor.id].amount,
					actorId: monsters[actor.id].id,
					actorAmount: `${monsters[actor.id].amount}x`,
					actorImg: monsters[actor.id].img,
					actorNameImg: monsters[actor.id].name.replace(" ", "-"),
					actorName: monsters[actor.id].name,
					weapons: {}
				};
                
				monsters[actor.id] = { ...monsterData }; // Copy monsterData into monsters.
				monsters[actor.id].optionVisible = true;

                

				// Currently not used. Multiattack.
				/* if (game.settings.get(moduleName, "showMultiattackDescription")) {
					if (actor.items.contents.filter(i => i.name.startsWith("Multiattack")).length > 0) {
						monsters[actor.id]["multiattackDesc"] = $(actor.items.filter(i => i.name.startsWith("Multiattack"))[0].system.description.value)[0].textContent;
					} else if (actor.items.contents.filter(i => i.name.startsWith("Extra Attack")).length > 0) {
						monsters[actor.id]["multiattackDesc"] = $(actor.items.filter(i => i.name.startsWith("Extra Attack"))[0].system.description.value)[0].textContent;
					}
				} */
			}
		}

        // Get weapons for the actors.
		let actorWeapons = {};
		let items = actor.items.contents;
		for (let item of items) {
            // The original if statement from MAT. It includes items my module does not include yet.
            /* if (item.type == "weapon" || (item.type == "spell" && (item.system.level === 0 || item.system.preparation.mode === "atwill") && item.system.damage.parts.length > 0 && item.system.save.ability === "")) { 
                
            }*/
			
            if (item.type == "weapon") {

                // Currently not used. Check if the weapon already exists in the weapons object and increase the amount.
				 /* if (weapons[item.id]?.id === item.id) {
					availableAttacks[item.id] += 1;
					
				} else {
					weapons[item.id] = item;
					availableAttacks[item.id] = 1;
					actorWeapons[item.id] = item;
					
				}  */

				weapons[item.id] = item;
				availableAttacks[item.id] = 1;
				actorWeapons[item.id] = item;
					
			}
		}

		let numAttacksTotal, preChecked;
		let numCheckedWeapons = 0;
		let highestDamageFormula = 0, maxDamage, maxDamageWeapon;
		let averageDamageRoll;
		let averageDamage = {};
		let options = {};

        // Get damage values.
		// Currently not used. Multiattack.
		/* let autoDetect = game.settings.get(moduleName, "autoDetectMultiattacks"); */
		for (let [weaponID, weaponData] of Object.entries(actorWeapons)) {

            // Currently not used. Multiattack.
			/* if (autoDetect === 2) {
				[numAttacksTotal, preChecked] = getMultiattackFromActor(weaponData.name, weaponData.actor, weapons, options);
				if (preChecked) numCheckedWeapons++;
			} */

            console.log(1);
            console.log(weaponID);
            console.log(2);
            console.log(weaponData);
			let damageData = getDamageFormulaAndType(weaponData, false);
            console.log(3);
            console.log(damageData);

            // Currently not used. Calculate damage.
			/* damageData = (typeof damageData[0][0] === "undefined") ? "0" : damageData[0][0];
			maxDamage = new Roll(damageData).alter(((numAttacksTotal > 1) ? numAttacksTotal : 1), 0, { multiplyNumeric: true });
			maxDamage = maxDamage.evaluate({ maximize: true, async: true });
			maxDamage = maxDamage.total;
			damageData = getDamageFormulaAndType(weaponData, false);
			averageDamageRoll = new Roll(damageData[0].join(" + "));
			let averageDamageValue = 0;
			for (let dTerm of averageDamageRoll.terms.filter(t => t.number > 0 && t.faces > 0)) {
				averageDamageValue += ((dTerm.faces + 1) / 2) * dTerm.number;
			}
			for (let nTerm of averageDamageRoll.terms.filter(t => t.number > 0 && !t.faces)) {
				averageDamageValue += nTerm.number;
			}
			averageDamage[weaponID] = Math.ceil(averageDamageValue);
			if (highestDamageFormula < maxDamage) {
				highestDamageFormula = maxDamage;
				maxDamageWeapon = weaponData;
			} */
		}

		if (numCheckedWeapons === 0) {
			options["checkMaxDamageWeapon"] = true;
			options["maxDamageWeapon"] = maxDamageWeapon;
		}
		for (let [weaponID, weaponData] of Object.entries(actorWeapons)) {
			let checkVersatile = weaponData.system.damage.versatile != "";
			for (let j = 0; j < 1 + ((checkVersatile) ? 1 : 0); j++) {
				let isVersatile = (j < 1) ? false : weaponData.system.damage.versatile != "";
				/* let damageData = getDamageFormulaAndType(weaponData, isVersatile);
				let weaponDamageText = ``;
				for (let i = 0; i < damageData[0].length; i++) {
					((i > 0) ? weaponDamageText += `<br>${damageData[0][i]} ${damageData[1][i].capitalize()}` : weaponDamageText += `${damageData[0][i]} ${damageData[1][i].capitalize()}`);
				}
				numAttacksTotal = 1, preChecked = false; */
				//autoDetect = game.settings.get(moduleName, "autoDetectMultiattacks");
				//if (autoDetect > 0) [numAttacksTotal, preChecked] = getMultiattackFromActor(weaponData.name, weaponData.actor, weapons, options);
				//if (autoDetect === 1 || isVersatile) preChecked = false;
				/* let weaponRangeText = ``;
				if (weaponData.system.range.long > 0) {
					weaponRangeText = `${weaponData.system.range.value}/${weaponData.system.range.long} ${weaponData.system.range.units}.`;
				} else if (weaponData.system.range.value > 0) {
					weaponRangeText = `${weaponData.system.range.value} ${weaponData.system.range.units}.`;
				} else if (weaponData.system.range.units === "touch") {
					weaponRangeText = "Touch";
				} else if (weaponData.system.range.units === "self") {
					weaponRangeText = "Self";
				} else {
					weaponRangeText = '-';
				} */

				let labelData = {
					numAttacksName: `numAttacks${(weaponData.id + ((isVersatile) ? ` (${game.i18n.localize("Versatile")})` : ``)).replace(" ", "-")}`,
					numAttack: numAttacksTotal,
					weaponActorName: weaponData.actor.name,
					weaponId: weaponData.id,
					weaponImg: weaponData.img,
					weaponNameImg: weaponData.name.replace(" ", "-"),
					weaponName: `${weaponData.name}${((isVersatile) ? ` (${game.i18n.localize("Versatile")})` : ``)}`,
					//weaponAttackBonus: calculateWeaponAttackBonus(weaponData),
					weaponAttackBonus: "+3",
					//weaponRange: weaponRangeText,
					weaponRange: "5 ft",
					//weaponDamageText: weaponDamageText,
					weaponDamageText: "1d8 + 2 Piercing",
					//useButtonName: `use${(weaponData.id + ((isVersatile) ? ` (${game.i18n.localize("Versatile")})` : ``)).replace(" ", "-")}`,
					//useButtonValue: (keepCheckboxes) ? oldMonsters[actor.id]["weapons"][weaponID].useButtonValue : (preChecked) ? `checked` : ``,
					//averageDamage: averageDamage[weaponID]
				};
				if (j === 0) {
					monsters[actor.id]["weapons"][weaponID] = { ...labelData };
				} else if (j === 1) {
					monsters[actor.id]["weapons"][weaponID + ` (${game.i18n.localize("Versatile")})`] = { ...labelData };
				}
			}
		}
	}

    
	return [monsters, weapons, availableAttacks];
}