import { kataSearchURL } from "./constants";
import {
    DifficultyOptions,
    LanguageOptions,
    ProgressOptions,
    QueryOptions,
    SortOptions,
    StatusOptions,
    TagOptions
} from "./types";
import { requestUrl, htmlToMarkdown } from "obsidian";

function getTagIds(tagArray: TagOptions[]) {
    // &tags=ASCII%20Art%2CAlgebra%2CAlgorithms
    const encodedIds = [];

    for (const tag of tagArray) {
        encodedIds.push(encodeURI(tag));
    }

    return `&tags=${encodedIds.join("%2C")}`;
}

function getDifficultyIds(difficultyArray: DifficultyOptions[]) {
    // &r%5B%5D=-8&r%5B%5D=-7
    const encodedIds = [];

    for (const option of difficultyArray) {
        encodedIds.push(`&r%5B%5D=-${option}`);
    }

    return encodedIds.join("");
}

function getProgressId(progress: ProgressOptions) {
    switch (progress) {
        case "kata-untrained":
            return "&xids=played";
        case "kata-incomplete":
            return "&xids=completed";
        case "kata-completed":
            return "&xids=not_completed";
        default: // "all"
            return "";
    }
}

function getStatusId(status: StatusOptions) {
    switch (status) {
        case "approved-and-beta":
            return "";
        case "approved":
            return "&beta=false";
        case "beta":
            return "&beta=true";
        default:
            return "&beta=false";
    }
}

function getSortById(sortBy: SortOptions) {
    switch (sortBy) {
        case "oldest":
            return "&order_by=published_at%20asc";
        case "newest":
            return "&order_by=sort_date%20desc";
        case "popularity":
            return "&order_by=popularity%20desc";
        case "positive-feedback":
            return "&order_by=satisfaction_percent%20desc%2Ctotal_completed%20desc";
        case "most-completed":
            return "&order_by=total_completed%20desc";
        case "least-completed":
            return "&order_by=total_completed%20asc";
        case "hardest":
            return "&order_by=rank_id%20desc";
        case "easiest":
            return "&order_by=rank_id%20asc";
        case "name":
            return "&order_by=name%20asc";
        case "low-satisfaction":
            return "&order_by=satisfaction_percent%20asc";
        default:
            return sortBy;
    }
}

function getLanguageId(language: LanguageOptions) {
    switch (language) {
        case "all":
            return "";
        case "c++":
            return "cpp";
        case "c#":
            return "csharp";
        case "f#":
            return "fsharp";
        case "λ calculus":
            return "lambdacalc";
        case "objective-c":
            return "objc";
        case "risc-v":
            return "riscv";
        default:
            return language;
    }
}

function getKataChallengesURL(queryOptions: QueryOptions): string {
    const tags = getTagIds(queryOptions.tags);
    const rank = getDifficultyIds(queryOptions.difficulty);
    const status = getStatusId(queryOptions.status);
    const sortBy = getSortById(queryOptions.sortBy);
    const language = getLanguageId(queryOptions.language);
    const progress = getProgressId(queryOptions.progress);

    return `${kataSearchURL}/${language}?q=${rank}${progress}${tags}${status}${sortBy}&sample=true`;
}

export async function getKataChallenges(queryOptions: QueryOptions) {
    //const turndownService = new TurndownService();
    const kataChallengesURL: string = getKataChallengesURL(queryOptions);
    console.log(`kataChallengesURL: ${kataChallengesURL}`);
    //const response = turndownService.turndown(
    //    (await axios.get(kataChallengesURL)).data
    //);
    const response = await requestUrl(kataChallengesURL);

    return {
        obj: JSON.parse(JSON.stringify(response.json, null, 4)),
        str: JSON.stringify(response.json, null, 4),
        md: htmlToMarkdown(response.text)
    };
}
