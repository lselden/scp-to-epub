const fs = require('fs').promises;
const path = require('path/posix');
const urlLib = require('url');
const pMap = require('p-map');
const config = require('../book-config');
const {safeFilename, normalizePath, debug, getUrlObj} = require('./utils');

function isEmpty(arr) {
	return !(arr && (typeof arr === 'object') && Object.keys(arr).length > 0);
}

class DiskCache {
	constructor(opts = {}) {
		this.options = {
			enable: true,
			ignore: undefined,
			path: './cache',
			cacheInMemory: false,
			concurrency: config.get('output.diskConcurrency', 3),
			// one month default cache time
			maxAge: 30 * 24 * 60 * 60 * 1000,
			...config.get('cache'),
			...opts
		};
	}
    #init = undefined;
	async initialize(force = false) {
        if (!this.options.enable) {
            console.log('Disk Cache disabled - will remote content each time');
            return;
        }
        if (this.#init && !force) {
            return this.#init;
        }

        this.#init = (async () => {
            this._cache = new Map();
            this._dirs = new Set(['.', this.options.path]);
            try {
                const baseDir = this.options.path;
                // make sure directory exists
                await fs.mkdir(baseDir, {recursive: true});
                // QUESTION should we just use dedicated glob library?
                const {files, dirs} = await this.#readDirectory(baseDir);
                dirs.forEach(dir => this._dirs.add(dir));

                files.forEach(file => {
                    this._cache.set(file.id, file);
                });

                debug(`Found ${this._cache.size} cached entries`);
            } catch (err) {
                console.warn('Unable to load stats cache', err);
            }
        })();
        return this.#init;
	}
    /**
     * 
     * @param {string} baseDir 
     * @returns {Promise<{files: Array<{id: string, path: string, modified: number, size: number}>, dirs: string[] }>}
     */
    #readDirectory = async (baseDir) => {
        const files = [];
        const dirs = [];
        baseDir = path.normalize(baseDir).replaceAll('\\', '/');

        const listing = await fs.readdir(baseDir, { withFileTypes: true, recursive: true });
        await pMap(listing, async (entry) => {
            const dir = entry.parentPath ?? entry.path;
            const fullPath = path.join(dir, entry.name).replaceAll('\\', '/');
            if (entry.isDirectory()) {
                dirs.push(fullPath);
                return;
            }
            if (!entry.isFile() || this._shouldIgnore(fullPath)) {
                return;
            }
            const stats = await fs.stat(fullPath)
                .catch(err => {
                    console.warn(`Error reading info for cached file ${fullPath}`, err);
                    return;
                });
            if (!stats) return;
            const pageId = this.asCachePath(path.relative(baseDir, fullPath));
            files.push({
                id: pageId,
                path: fullPath,
                modified: stats.mtime,
                size: stats.size
            });
        }, { concurrency: this.options.concurrency });
        return {
            files,
            dirs
        };
    }
	asCachePath(uri) {
		const UP_PATH_REGEXP = /(?:^|[\\/])\.\.(?:[\\/]|$)/g;
		uri = this._normalizeUrl(uri);

        // standardize path separators
        uri = uri.replaceAll('\\', '/');

		let dir = path.basename(path.dirname(uri)).replace(UP_PATH_REGEXP, '');
		let file = path.basename(uri);

		return path.posix.join(safeFilename(dir), safeFilename(file, path.extname(file)));
	}
	_shouldIgnore(filepath) {
		if (this.options.ignore instanceof RegExp) {
			return this.options.ignore.test(filepath);
		}
		return false;
	}
	lookup(pageId) {
		const value = this._cache.get(this.asCachePath(pageId));
		if (!value) {
			return;
		}
		const age = (new Date()).getTime() - (new Date(value.modified)).getTime();
		// don't return if stale
		if (age >= this.options.maxAge) {
			return;
		}
		return value;
	}
	async get(pageId) {
		// REVIEW
		if (this._cache.size === 0) {
			await this.initialize();
		}

		let value = this.lookup(pageId);

		if (!value) {
			return;
		}

		try {
			if (value.content) {
				return value;
			}

			const content = await fs.readFile(value.path);
			if (this.options.cacheInMemory) {
				value.content = content;
			} else {
				value = {
					content,
					...value
				};
			}
			return value;
		} catch (err) {
			console.warn(`Failed to get cache data for ${pageId}`, err);
		}
	}
	async set(pageId, content) {
		pageId = this.asCachePath(pageId);

		const fullPath = path.join(this.options.path, pageId);

		// don't get existing content from disk
		let entry = this.lookup(pageId);
		if (!entry) {
			entry = {
				id: pageId,
				path: fullPath
			};
			this._cache.set(pageId, entry);
		}
		entry.modified = new Date();
		if (!content) {
			return;
		}

		if (this.options.cacheInMemory) {
			entry.content = content;
		}

		try {
			const subDir = path.dirname(fullPath);
			if (!this._dirs.has(subDir)) {
				this._dirs.add(subDir);
				await fs.mkdir(subDir, { recursive: true });
			}
			await fs.writeFile(fullPath, content);
		} catch (err) {
			console.warn(`Failed to write cache data for ${pageId}`, err);
		}
	}
	_normalizeUrl(url) {
		let pageName = `${url}`;

		// canononical
		if (pageName.startsWith('scp-wiki')) {
			pageName = `http://${pageName}`;
		}
		// absolute
		if (pageName.startsWith('http')) {
			pageName = getUrlObj(pageName).pathname;
		}
		// relative
		if (pageName.startsWith('/')) {
			pageName = pageName.slice(1);
		}
		return pageName;
	}
}

module.exports = DiskCache;
