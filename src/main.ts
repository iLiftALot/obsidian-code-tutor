import {
	App,
	Plugin,
	PluginManifest,
	requestUrl,
	RequestUrlParam,
	RequestUrlResponse,
	RequestUrlResponsePromise
} from 'obsidian';
import { CodeTutorPluginSettings, DEFAULT_SETTINGS } from './settings/Settings';
import { SettingTab } from './settings/SettingsTab';
import { deepmerge } from 'deepmerge-ts';
import { getKataChallenges } from './utils';


export default class CodeTutorPlugin extends Plugin {
	public app: App;
	public settings: CodeTutorPluginSettings;
	public kataData: Promise<{
		response: RequestUrlResponse;
		md: string;
	}>;

	public requestUrl: (request: RequestUrlParam | string) => RequestUrlResponsePromise = requestUrl;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		this.app = app;

	}

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new SettingTab(this.app, this));

		this.kataData = getKataChallenges({
			sortBy: "newest",
			language: "javascript",
			status: "approved",
			progress: "kata-incomplete",
			difficulty: [7, 6],
			tags: []
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
