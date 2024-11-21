const fs = require('fs');
const path = require('path');
const config = require('./config');
const {debug} = require('./utils');

const isPkg = !!(process).pkg;
const isElectron = process.versions && (process.versions).electron;

function getExec(filename) {
	if (isPkg || isElectron) {
		return path.basename(process.execPath);
	}
	return `${path.basename(process.execPath || 'node')} ${filename ? path.relative('.', filename) : ''}`;
}


function getEnv(filename = __filename, dirname = __dirname) {
    const isBundled = dirname && !/lib/.test(dirname);

	const directories = {
		virtual: '.',
		app: '.',
		working: process.cwd()
	};

	// if not running in REPL then use main filename (outside of node_modules)
	if (isBundled) {
		directories.app = dirname;
		directories.virtual = directories.app;
	}

	const isInExecDir = path.relative(
		path.dirname(process.execPath),
		directories.working
	) === '';

	// package binaries use executable path
	if (isPkg || isElectron) {
		directories.virtual = isBundled ? dirname : path.join(dirname, '../../');
		directories.app = path.dirname(process.execPath || '.');
	// but if running as node DON'T use executable path
	} else if (isInExecDir) {
		directories.working = directories.app;
	} else if (directories.app.endsWith('dist')) {
		// edge case where files are compiled using standard typescript logic
		directories.app = path.dirname(directories.app);
	}

	// services end up in wrong place
	if (path.relative('C:/Windows/System32', directories.working) === '') {
		directories.working = directories.app;
	}

	return {
        executable: getExec(filename),
        directories
    };
}

async function configPathEnv() {
    pathEnv = getEnv();
    const staticRoot = config.get('static.root', 'static');
    const assetRoot = config.get('output.localResources', 'assets');
    
    searchDirs = [];
    const leafDirs = [];
    if (path.isAbsolute(assetRoot)) {
        searchDirs.push(assetRoot);
    } else {
        leafDirs.push(assetRoot);
    }
    if (path.isAbsolute(staticRoot)) {
        searchDirs.push(staticRoot);
    } else {
        leafDirs.push(staticRoot);
    }
    leafDirs.push('.');
    
    for (let parent of [pathEnv.directories.working, pathEnv.directories.app, pathEnv.directories.virtual]) {
        for (let leaf of leafDirs) {
            const testPath = path.join(parent, leaf);
            // skip duplicates
            if (searchDirs.includes(testPath)) continue;
            if (await exists(testPath)) {
                searchDirs.push(testPath);
                debug(`checking for static content in ${testPath}`);
            } else {
                debug(`possible asset dir doesn't exist ${testPath}`);
            }
        }
    }
    return searchDirs;
}

async function exists(filepath) {
    return fs.promises.access(filepath, fs.constants.R_OK).then(() => true, () => false);
}
const assetPaths = {};
let pathEnv = undefined;
let searchDirs;
let isFirst = true;
async function getAssetPath(file) {
    if (assetPaths[file]) return assetPaths[file];
    if (!pathEnv) {
        debug('loading local filepath environment');
        await configPathEnv();
    }

    let localPath = '';
    for (let dir of searchDirs) {
        localPath = path.join(dir, file);
        if (await exists(localPath)) {
            assetPaths[file] = localPath;
            return localPath;
        }
    }
    debug(`Not found: ${file}`);
    return undefined;
}

module.exports = {
    exists,
    getAssetPath
}