// Module name.
export const moduleName = "ayisha-mob-tools";

// Settings. 
// Variables which are used in the module.
export const matSettings = {
	"playerAccess": {
		name: "SETTINGS.MAT.playerAccess",
		hint: "SETTINGS.MAT.playerAccessHint",
		config: true,
		scope: "world",
		default: false,
		type: Boolean
	},
	"hiddenMobList": {
		name: "hiddenMobList",
		scope: "client",
		config: false,
		default: {},
		type: Object
	},
	"hiddenMobName": {
		name: "hiddenMobName",
		scope: "client",
		config: false,
		default: "",
		type: String
	},
	"defaultGroupName": {
		name: "SETTINGS.MAT.defaultGroupName",
		hint: "SETTINGS.MAT.defaultGroupNameHint",
		scope: "client",
		config: true,
		default: "Group",
		type: String
	},
	"GroupNo": {
		name: "SETTINGS.MAT.GroupNo",
		hint: "SETTINGS.MAT.GroupNoHint",
		scope: "client",
		config: true,
		default: 0,
		type: Number
	},
	/* "defaultMobPrefix": {
		name: "SETTINGS.MAT.defaultMobPrefix",
		hint: "SETTINGS.MAT.defaultMobPrefixHint",
		scope: "client",
		config: true,
		default: "Group of",
		type: String
	},
	"defaultMobSuffix": {
		name: "SETTINGS.MAT.defaultMobSuffix",
		hint: "SETTINGS.MAT.defaultMobSuffixHint",
		scope: "client",
		config: true,
		default: "s",
		type: String
	}, */
	"hiddenChangedMob": {
		name: "hiddenChangedMob",
		scope: "client",
		config: false,
		default: false,
		type: Boolean
	}
}

export function initSettings() {

	for (let [settingKey, value] of Object.entries(matSettings)) {
		game.settings.register(moduleName, settingKey, value);
	}

}




