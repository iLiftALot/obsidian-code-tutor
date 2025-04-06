import { WaitForSelectorOptions } from "puppeteer";
import { QueryOptions } from "./types";

export const defaultQueryOptions: QueryOptions = {
    sortBy: "newest",
    language: "my-languages",
    status: "approved",
    progress: "kata-incomplete",
    difficulty: [],
    tags: []
}

// Base CodeWars URL
export const baseURL = "https://www.codewars.com";

// URL Extensions
export const kataExt = "kata";
export const searchExt = "search";
export const apiExt = "api/v1";
export const userDataExt = "users";

// Full URLs with Proper Extensions
export const kataSearchURL = `${baseURL}/${kataExt}/${searchExt}`;
export const userDataURL = `${baseURL}/${apiExt}/${userDataExt}`;

// Names of all katas
export const kataNameRegex: RegExp = /(?<=^\d\skyu\n\n^\[)(.*)(?=\])/gm;
export const kataLinkExtRegex: RegExp = /(?<=^\d\skyu\n\n^\[.*\]\()(.*)(?=\))/gm;

// Page highlight links (e.g., buttons) for performing various actions
export const forfeitExt = 'solutions?show-solutions=1'; // <BASE_URL>/kata/<KATA_ID>/solutions?show-solutions=1
// await page.goto(`${baseURL}/${kataExt}/${kataId}/${forfeitExt}`);

export const forfeitBtnExt = '#:~:text=for%20this%20kata.-,UNLOCK,-SOLUTIONS%20(FORFEIT%20ELIGIBILITY';
// await page.goto(`${baseURL}/${kataExt}/${kataId}/${forfeitExt}${forfeitBtnExt}`);

export const forfeitBtnCls = 'a.btn.js-unlock-solutions';
// await page.click(`a.btn.js-unlock-solutions`);

// Configuration for the Cluster queue to handle multiple puppeteer instances
export const defaultWaitForSelectorOptions: WaitForSelectorOptions = {
    visible: true,      // Wait for the selected element to be present & visible in DOM
    hidden: false,      // Do not wait for the selected element to be present & hidden in DOM
    timeout: 30000,     // Wait for 30 seconds before timing out
    signal: undefined   // No signal to abort the wait
}
