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
