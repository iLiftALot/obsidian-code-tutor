import { baseURL, defaultWaitForSelectorOptions, kataLinkExtRegex, kataNameRegex, kataSearchURL } from "./constants";
import {
    DifficultyOptions,
    LanguageOptions,
    ParsedQuery,
    ProgressOptions,
    QueryOptions,
    QueryResult,
    ResultData,
    SortOptions,
    StatusOptions,
    TagOptions
} from "./types";
import { Editor } from 'codemirror';
import { Cluster } from 'puppeteer-cluster';
import { requestUrl, htmlToMarkdown, RequestUrlResponse } from "obsidian";

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

// Builds and returns a formatted URL meant to query for a list of 30 tailored kata challenges
function getKataChallengesURL(queryOptions: QueryOptions): string {
    const tags = getTagIds(queryOptions.tags);
    const rank = getDifficultyIds(queryOptions.difficulty);
    const status = getStatusId(queryOptions.status);
    const sortBy = getSortById(queryOptions.sortBy);
    const language = getLanguageId(queryOptions.language);
    const progress = getProgressId(queryOptions.progress);

    return `${kataSearchURL}/${language}?q=${rank}${progress}${tags}${status}${sortBy}&sample=true`;
}

// Gather the description, starting code, and test code for the provided kata challenge
async function parseChallengeResult(
    kataURL: string,
    waitForSelectorOptions = defaultWaitForSelectorOptions
) {
    const launch = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_PAGE,
        maxConcurrency: 1, // 1 page at a time, which will be the page containing a list of kata challenges
        
    });

    launch.task(async ({ page, data: link, worker: { id } }) => {
        await page.goto(link);

        // Wait for problem description
        await page.waitForSelector('.markdown[id="description"]', waitForSelectorOptions);
        const description = await page.$eval('.markdown[id="description"]', descEl => descEl.innerHTML);

        // Wait for the Solution CodeMirror instance
        await page.waitForSelector('#code_container #code .CodeMirror', waitForSelectorOptions);
        const solutionCode = await page.evaluate(() => {
            const cmEl = document.querySelector('#code_container #code .CodeMirror');
            const codeMirror: Editor | undefined = (cmEl as any)?.CodeMirror;

            if (!codeMirror) return '';

            return codeMirror.getValue();
        });

        // Wait for the Tests CodeMirror instance
        await page.waitForSelector('#fixture_container #fixture .CodeMirror', {
            visible: true,
            hidden: false,
            timeout: 30000,
            signal: undefined
        });
        const testCode = await page.evaluate(() => {
            const cmEl: Element | null = document.querySelector(
                '#fixture_container #fixture .CodeMirror'
            );
            const codeMirror: Editor | undefined = (cmEl as any)?.CodeMirror;

            if (!codeMirror) return '';

            return codeMirror.getValue();
        });

        return {
            description: htmlToMarkdown(description),
            solutionCode: solutionCode,
            testCode: testCode
        };
    });

    // Queue a task
    const { description, startingCode, testCode } = await launch.execute(kataURL);
    //'https://www.codewars.com/kata/567bf4f7ee34510f69000032/train/typescript'
    //);

    // Shutdown the cluster
    await launch.idle();
    await launch.close();

    return { description, startingCode, testCode };
}

// Builds a compiled object and consolidates the data of all gathered kata challenges
async function buildChallengeResult(
    queryOptions: QueryOptions,
    result: QueryResult
): Promise<ParsedQuery> {
    const finalData: ParsedQuery = {};

    const queriedContent: string = result.result;
    const selectedLanguage: LanguageOptions = queryOptions.language;

    const challengeNames: RegExpMatchArray | null = queriedContent.match(kataNameRegex);
    const challengeLinks: RegExpMatchArray | null = queriedContent.match(kataLinkExtRegex);

    if (!challengeLinks || !challengeNames) {
        finalData['error'] = {
            url: "",
            description: "No challenges found with the given query options.",
            startingCode: "",
            testCode: ""
        };

        return finalData;
    }

    for (const [index, name] of challengeNames.entries()) {
        const resultData: ResultData = {
            url: "",
            description: "",
            startingCode: "",
            testCode: ""
        };
        resultData['url'] = `${baseURL}${challengeLinks[index]}/train/${selectedLanguage}`;

        const { description, startingCode, testCode } = await parseChallengeResult(resultData.url);
        
        resultData['description'] = description;
        resultData['startingCode'] = startingCode;
        resultData['testCode'] = testCode;

        finalData[name] = resultData; 
    }

    return finalData;
}

async function queryChallenges(queryOptions: QueryOptions): Promise<QueryResult> {
    const kataChallengesURL: string = getKataChallengesURL(queryOptions);
    const response: RequestUrlResponse = await requestUrl(kataChallengesURL);

    return {
        status: response.status,
        result: htmlToMarkdown(response.text)
    }
}

export async function getChallengeQuery(queryOptions: QueryOptions): Promise<ParsedQuery> {
    const queryResult: QueryResult = await queryChallenges(queryOptions);

    return (await buildChallengeResult(queryOptions, queryResult));
}
