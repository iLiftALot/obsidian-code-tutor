import {
    baseURL,
    blockedTypes,
    defaultPuppeteerOptions,
    defaultWaitForSelectorOptions,
    kataLinkExtRegex,
    kataNameRegex,
    kataSearchURL
} from "./constants";
import {
    DifficultyOptions,
    LanguageOptions,
    ParsedQuery,
    ProgressOptions,
    QueryOptions,
    QueryResult,
    SortOptions,
    StatusOptions,
    TagOptions
} from "./types";
import { Editor } from 'codemirror';
import { Cluster } from 'puppeteer-cluster';
import { requestUrl, htmlToMarkdown, RequestUrlResponse } from "obsidian";
import { HTTPRequest, ResourceType } from "puppeteer";

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
async function parseChallenges(
    challengeLinks: string[],
    challengeNames: string[],
    selectedLanguage: LanguageOptions
): Promise<ParsedQuery> {
    // Create a cluster with higher concurrency 
    const cluster: Cluster<any, any> = await Cluster.launch(defaultPuppeteerOptions);
    const results: ParsedQuery = {};

    cluster.task(async ({ page, data }) => {
        const { url, name } = data;

        try {
            // Configure page for better performance - block more resources
            await page.setRequestInterception(true);
            page.on('request', (req: HTTPRequest) => {
                const resourceType: ResourceType = req.resourceType();

                if (blockedTypes.includes(resourceType)) {
                    req.abort();
                } else if (resourceType === 'stylesheet') {
                    // Allow only CodeMirror stylesheets, block the rest
                    const url = req.url().toLowerCase();
                    
                    if (url.includes('codemirror') || url.includes('editor')) {
                        req.continue();
                    } else {
                        req.abort();
                    }
                } else {
                    req.continue();
                }
            });

            // Set JavaScript timeout to prevent long-running scripts
            page.setDefaultTimeout(15000);

            await page.goto(url, {
                timeout: 60000,
                waitUntil: 'networkidle0'
            });

            // Extract data with Promise.all for parallel extraction
            const [description, startingCode, testCode] = await Promise.all([
                extractDescription(),
                extractStartingCode(),
                extractTestCode()
            ]);

            return {
                name,
                url,
                description,
                startingCode,
                testCode
            };
        } catch (error) {
            console.error(`Error processing ${url}: ${error.message}`);
            
            return {
                name,
                url,
                description: '',
                startingCode: '',
                testCode: ''
            };
        }

        // Extracts the description of the kata challenge
        async function extractDescription(): Promise<string> {
            try {
                await page.waitForSelector('.markdown[id="description"]', defaultWaitForSelectorOptions);
                const content = await page.$eval('.markdown[id="description"]', el => el.innerHTML);
                
                return htmlToMarkdown(content);
            } catch {
                return '';
            }
        }

        // Extracts the default starting code for the challenge
        async function extractStartingCode(): Promise<string> {
            try {
                await page.waitForSelector('#code_container #code .CodeMirror', defaultWaitForSelectorOptions);
                return await page.evaluate(() => {
                    const cmEl = document.querySelector('#code_container #code .CodeMirror');
                    const codeMirror: Editor = (cmEl as any).CodeMirror;

                    if (!codeMirror) return '';

                    return codeMirror.getValue() || '';
                });
            } catch {
                return '';
            }
        }

        // Extracts the code used to test the provided code for the challenge
        async function extractTestCode(): Promise<string> {
            try {
                await page.waitForSelector('#fixture_container #fixture .CodeMirror', defaultWaitForSelectorOptions);
                
                return await page.evaluate(() => {
                    const cmEl: Element | null = document.querySelector('#fixture_container #fixture .CodeMirror');
                    const codeMirror: Editor = (cmEl as any).CodeMirror;
                    
                    if (!codeMirror) return '';
                    
                    return codeMirror.getValue() || '';
                });
            } catch {
                return '';
            }
        }
    });

    // Queue all challenge URLs with batch processing
    const batchSize = 5; // Process in smaller batches
    const totalChallenges = challengeLinks.length;

    for (let i = 0; i < totalChallenges; i += batchSize) {
        const batch = [];
        const end = Math.min(i + batchSize, totalChallenges);

        // Prepare batch of promises
        for (let j = i; j < end; j++) {
            const link = challengeLinks[j];
            const name = challengeNames[j] || `Challenge ${j + 1}`;
            const url = `${baseURL}${link}/train/${selectedLanguage}`;

            batch.push(cluster.execute({ url, name }));
        }

        // Execute batch in parallel and process results
        const batchResults = await Promise.all(batch);

        for (let k = 0; k < batchResults.length; k++) {
            const result = batchResults[k];
            
            if (result) {
                results[result.name] = {
                    url: result.url,
                    description: result.description,
                    startingCode: result.startingCode,
                    testCode: result.testCode
                };
            }
        }

        // Free memory between batches
        if (global.gc) global.gc();
    }

    // Shutdown the cluster efficiently
    await cluster.idle();
    await cluster.close();

    // Filter out empty results and return the parsed query
    return Object.entries(results)
        .filter(([_, result]) => {
            return result.startingCode !== '' &&
                   result.testCode !== '' &&
                   result.description !== ''
        })
        .reduce((acc: ParsedQuery, [name, result]) => {
            acc[name] = result;
            
            return acc;
        }, {});
}

// Matches challenge details from the query in order to build the final result
async function buildChallengeResult(
    queryOptions: QueryOptions,
    response: QueryResult
): Promise<ParsedQuery> {
    const queriedContent: string = response.result;
    const selectedLanguage: LanguageOptions = queryOptions.language;

    // Matches all challenge names and their respective links 
    const challengeNames = queriedContent.match(kataNameRegex);
    const challengeLinks = queriedContent.match(kataLinkExtRegex);

    if (!challengeLinks || !challengeNames) {
        return {
            'error': {
                url: "",
                description: "No challenges found with the given query options.",
                startingCode: "",
                testCode: ""
            }
        };
    }

    // Obtain all challenges along with their 
    return (await parseChallenges(challengeLinks, challengeNames, selectedLanguage));
}

// Queries the CodeWars API for a list of challenges based on the provided options
async function queryChallenges(queryOptions: QueryOptions): Promise<QueryResult> {
    const kataChallengesURL: string = getKataChallengesURL(queryOptions);
    const response: RequestUrlResponse = await requestUrl({
        url: kataChallengesURL,
        method: 'GET',
        headers: {
            'Accept': 'text/html',
            'User-Agent': 'Mozilla/5.0 (compatible; Bot)'
        }
    });

    return {
        status: response.status,
        html: response.text,
        result: htmlToMarkdown(response.text)
    };
}

export async function getChallengeQuery(queryOptions: QueryOptions): Promise<ParsedQuery> {
    const queryResult: QueryResult = await queryChallenges(queryOptions);
    
    return (await buildChallengeResult(queryOptions, queryResult));
}
