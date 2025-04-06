import {
	App,
	Plugin,
	PluginManifest
} from 'obsidian';
import { CodeTutorPluginSettings, DEFAULT_SETTINGS } from './settings/Settings';
import { SettingTab } from './settings/SettingsTab';
import { deepmerge } from 'deepmerge-ts';
import { getChallengeQuery } from './utils';
import { ParsedQuery } from './types';


export default class CodeTutorPlugin extends Plugin {
	public app: App;
	public settings: CodeTutorPluginSettings;
	public kataData: ParsedQuery;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		this.app = app;
	}

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new SettingTab(this.app, this));

		this.app.workspace.on("layout-ready", async () => {
			console.log('Loading kata data...');

			this.kataData = await getChallengeQuery({
				sortBy: "newest",
				language: "javascript",
				status: "approved",
				progress: "kata-incomplete",
				difficulty: [7, 6],
				tags: []
			});

			this.app.workspace.off("layout-ready", () => {});
			console.log(`Parsed Query:\n${JSON.stringify(this.kataData, null, 4)}`);
		});
	}

	onunload() {
		console.log('Unloading Code Tutor Plugin.');
	}

	async loadSettings() {
		let mergedSettings = DEFAULT_SETTINGS;
		const settingsData = await this.loadData();
		
		if (settingsData) {
			mergedSettings = deepmerge(DEFAULT_SETTINGS, settingsData);
		}
		
		this.settings = mergedSettings;
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
