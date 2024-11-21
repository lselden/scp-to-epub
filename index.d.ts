import { Browser, Page, Request, Response } from "puppeteer";
import { Url } from "url";

export interface PreProcessConfig {
    /**
     * how many pages to load at the same time
     * @default 1
     */
    concurrency?: number,
    /**
     * whether to close the tab after page scraped (implies headless = false)
     * @default true
     */
    closeTabs?: boolean,
    /**
     * at this depth links to meta pages will be automatically ignored (left as-is rather than registered for possible inclusion)
     * @default 1
     */
    skipMetaDepth?: number
}

export interface PostProcessConfig {
    /**
     * how many pages to process at the same time
     * @default 3
     */
    concurrency?: number
}

export interface CoverConfig {
    /**
     * if specified load cover image from local path (absolute or relative)
     */
    path?: string,
    /**
     * if specified load cover image from remote URL
     * (mutually exclusive with path/url options)
     */
    url?: string,
    /**
     * width of generated image when auto-creating
     * (mutually exclusive with path/url options)
     * @default 1600
     */
    width?: number,
    /**
     * height of generated image when auto-creating
     * @default 2560
     */
    height?: number,
    /**
     * absolute/relative path to templateHtml file for creating cover image
     * (mutually exclusive with path/url options)
     */
    templateHtml?: string
}

/**
 * interface for serving local files (client-side javascript) to browser pages.
 * This should likely never change
 * @private
 */
export interface StaticConfig {
    /**
     * @default __epub__
     */
    prefix?: string,
    /**
     * @default directory of project
     */
    root?: string,
    cache?: boolean
}

export interface CacheConfig {
    /**
     * whether to cache stats locally
     * @default true
     */
    stats?: boolean,
    /**
     * path to cache folder
     * @default project dir/cache
     */
    path?: string,
    /**
     * max age of cached data before refreshing from server (in milliseconds)
     * @default 30 days
     */
    maxAge?: number
}

export interface BookOptions {
    /**
     * whether to display rating
     * @default true
     */
    showRating?: boolean,
    /**
     * @default true
     */
    includeAudioAdaptations?: boolean,
    /**
     * @default false
     */
    includeReferences?: boolean,
    /**
     * URL to remote book config
     */
    url?: string,
    /**
     * absolute/relative path to book markdown config file
     */
    path?: string,
    /**
     * additional custom CSS styles to add at the top of each page.
     * Note that if you want to target a specific page then use [data-page="PAGE_NAME"]
     * as the selector, i.e. [data-page="scp-178"] for lil' peanut's page
     */
    customCSS?: string,
    /**
     * additional resources to load from remote URLs and include in book.
     * Useful if referencing background images or fonts in custom CSS.
     * 
     */
    additionalResources?: {
        /**
         * url to remote resource
         */
        url: string,
        id?: string,
        /**
         * don't include content, just reference it as a remote resource
         */
        remote?: boolean,
        /**
         * filename of file. Note that it will go into the 'css', 'images', or
         * 'fonts' directory based on content type. Otherwise will go into base folder.
         */
        filename?: string,
        /**
         * additional options to pass to the "got" request library
         */
        requestOptions?: any }[];
    /**
     * mark that remote book is a wikidot page and should be formatted by preProcessor before parsing
     * This is a hack...may not be kept
     * @default true
     */
    wikidot?: boolean,
    /**
     * whether to load book when first initializing bookmaker (if false then wait to explicitly call loadBook
     * implies passed in book isn't an instance of Book (specify by relative path or url)
     */
    shouldLoad?: boolean
}

/**
 * private settings that shouldn't need modification
 */
interface BookMakerPrivateConfig {
    /**
     * user agent to use for requests
     * @private
     */
    ua?: string,
    /**
     * @private
     */
    audioAdaptationsUrl?: string,
    /**
     * @private
     */
    hubsUrl?: string,
    /**
     * @private
     */
    authorsUrl?: string,
    /**
     * @private
     */
    artworkUrl?: string
    /**
     * @private
     */
    static?: StaticConfig,
    /**
     * @private
     */
    cache?: CacheConfig,
    /**
     * @private
     */
    hooks?: {
        request(request: Request): boolean,
        response(resource: Resource, response: Response): void
    }
}

export interface BookMakerConfig extends BookMakerPrivateConfig {
    /**
     * Limit loaded pages to this count. Recommend values between 50-100
     * @default 500
     */
    maxChapters?: number,
    /**
     * Limit crawler depth to X levels of recursion.
     * @default 1
     */
    maxDepth?: number,
    /**
     * explicitly specify pages to include in book. Can be relative ('taboo') or absolute ('http://www.scpwiki.com/taboo')
     */
    include?: string[],
    /**
     * specify pages to avoid loading.
     */
    exclude?: string[],
    /**
     * options for loading book. Usually should just use Book argument/loadBook
     * @private
     */
    bookOptions?: BookOptions,
    /**
     * if this is true then Appendix articles will be marked as "nonlinear", meaning they don't show up in the TOC
     * and open as a popup in iBooks/some others
     * @default true
     */
    hideSupplemental?: boolean,
    /**
     * if true then controlled browser will not be visible.
     * @default false
     */
    headless?: boolean,
    /**
     * enable to turn on debug mode (more logging and opens devtools on browser windows)
     * @default false
     */
    debug?: boolean,
    /**
     * width of browser window
     * @default 768
     */
    width?: number,
    /**
     * height of browser window
     * @default 1024
     */
    height?: number,
    preProcess?: PreProcessConfig,
    postProcess?: PostProcessConfig,
    cover?: CoverConfig,
    /**
     * timeout in loading pages (in milliseconds)
     * @default 10 minutes
     */
    timeout?: number,
    /**
     * base origin for links - for using with Wanderers library or international sites
     * Changing this is not fully tested
     * @default http://www.scpwiki.com
     */
    defaultOrigin?: string,
    localArchiveProxy?: string,
    browser?: Browser
}

export interface BookConfig {
    title?: string,
    lang?: string,
    publisher?: string,
    publishDate?: string,
    author?: string | string[],
    appendixDepthCutoff?: number,
    keepTempFiles?: boolean,
    /**
     * @default true
     */
	cleanTempFolder?: boolean
	/**
     * whether to display rating
     * @default true
     */
    showRating?: boolean,
    /**
     * @default true
     */
    includeAudioAdaptations?: boolean,
    /**
     * @default false
     */
    includeReferences?: boolean
}

export class Book {
    constructor(opts?: BookConfig)
}

export interface ResourceConfig {
    url?: string,
    content?: any,
    id?: string,
    filename?: string,
    mimeType?: string,
    from?: string[],
    save?: boolean,
    remote?: boolean,
    folders?: object,
    excludeFromManifest?: boolean,
    aliases?: string[],
    depth?: number
}

export class Resource {
    constructor(opts?: ResourceConfig);
    canononicalUrl: string;
    bookPath: string;
    url: string;
    content: any;
    id: string;
    filename: string;
    mimeType: string;
    from: string[];
    save: boolean;
    remote: boolean;
    folders: object;
    excludeFromManifest: boolean;
    aliases: string[];
    depth: number;
    merge(that: Resource): this;
    addBacklinks(urls: string[]): void;
    static asCanononical(url: string, defaultOrigin?: string): string;
    static asCanononical(url: URL, defaultOrigin?: string): string;
    static asCanononical(url: Resource, defaultOrigin?: string): string;
    static asCanononical(url: Url, defaultOrigin?: string): string;
}

export class ResourceCache {
    constructor ();
    get(resource: string): Resource | undefined;
    get(resource: URL): Resource | undefined;
    get(resource: Resource): Resource | undefined;
    set(resource: Resource): void;
}

export class WikiDataLookup {
    constructor(app: BookMaker, opts?: BookMakerConfig);
}

export class BookMaker {
    constructor(book: Book, opts?: BookMakerConfig);
    constructor(book: BookOptions, opts?: BookMakerConfig);
    browser: Browser;
    cache: ResourceCache;
    wikiLookup: WikiDataLookup;
}