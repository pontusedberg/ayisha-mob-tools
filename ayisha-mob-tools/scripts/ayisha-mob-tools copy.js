import { initSettings } from "./settings.js";

const moduleName = "ayisha-mob-tools";
let var_a = false;
let var_b = false;
let notice;

function handlePreset(event) {
  const targetElement = event.currentTarget;
  const presetType = targetElement.dataset?.preset;

  const formElement = $(targetElement).parents('form');

  const nameInput = formElement?.find('[name="output"]');
  const nameInput_round = formElement?.find('[name="output_round"]');

  let var_a_error;	
  let var_b_error;	
  if (!presetType || !nameInput) {
    return;
  }
  nameInput.val(" ");
  nameInput_round.val(" ");
  switch (presetType) {
    case 'random-num':
	  var_a = Math.random();
	  notice = `Value: ${var_a}`;
	  ui.notifications.info(notice);
      break;
  }
  switch (presetType) {
    case 'show-random-num':
	  
	  
	  if (var_a == false) {
		var_a_error = "No number generated!";
		nameInput.val(var_a_error);
	  } else {
		nameInput.val(var_a);
		var_b = true;
	  }


	  if (var_b == false) {
		var_b_error = "No number generated!";
		nameInput_round.val(var_b_error);
	  } else {
		var_b = var_a.toFixed(2);
		nameInput_round.val(var_b);
	  }
	  
	  
      break;
  }
  
}


async function mobDialog() {
  const htmlContent = await renderTemplate('modules/ayisha-mob-tools/templates/mat-template.html');

/*
  new Promise((resolve, reject) => {
    const dialog = new Dialog({
      title: "Ayisha's Mob Attack Tool",
      content: htmlContent,
      buttons: {
        submit: {
          label: "Close",
          callback: (html) => {
          },
        },
      },
      render: (html) => {
        html.on('click', 'button[data-preset]', handlePreset);
      },
    });
    dialog.render(true);
  });
  */
 
}


function initMobAttackTool() {
	Hooks.on("getSceneControlButtons", (controls) => {
		const playerAccess = game.settings.get(moduleName, "playerAccess");
		const bar = controls.find(c => c.name === "token");
		bar.tools.push({
			name: game.i18n.localize("MAT.name"),
			title: game.i18n.localize("MAT.mobAttack"),
			icon: "fa-solid fa-skull",
			visible: (playerAccess ? true : game.user.isGM),
			onClick: async () => mobAttackTool(),
			button: true
		});
	});
}



async function mobAttackTool() {
	ui.notifications.info(`Opening: ${moduleName}`);


  const newMobDialog = await mobDialog();
  
}

/*
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

	// First time opening the dialog, so no changes yet
	await game.settings.set(moduleName, "hiddenChangedMob", false);

	// create dialog
	const mobDialog = new MobAttackDialog();
	mobDialog.render(true);
	game.mobAttackTool.dialogs.set(mobDialog.appId, mobDialog);
	await game.settings.set(moduleName, "currentDialogId", mobDialog.appId);
}
*/



Hooks.once("init", () => {
	console.log("Ayisha's Mob Tool.");

	initSettings();
	initMobAttackTool();

	/*const dialogs = new Map();
	const storedHooks = {};
	game.mobAttackTool = {
		applications: {
			MobAttackDialog
		},
		dialogs,
		storedHooks
	}*/

});
