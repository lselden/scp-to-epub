const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const dotProp = require('dot-prop');

const debuglog = require('util').debuglog('config');
const GLOBAL_CONFIG = Symbol.for('_config.singleton');

function isObject (val) {
	return val && (typeof val === 'object');
}

function isPlainObject (val) {
	return ({}).toString.call(val) === '[object Object]';
}

function isCloneable (val) {
	return Array.isArray(val) || isPlainObject(val);
}

function cloneArray(arr) {
	return arr
		.map(value => {
			if (Array.isArray(value)) {
				return cloneArray(value);
			}
			if (isPlainObject(value)) {
				return extend(true, {}, value);
			}
			return value;
		});
}

function extend(...args) {
	let deep = false;
	if (typeof args[0] === 'boolean') {
		deep = args.shift();
	}
	const [result, ...extenders] = args;
	if (
		!result ||
		(typeof result !== 'object' && typeof result !== 'function')
	) {
		throw new TypeError('extendee must be an object');
	}

	// if desired result is an array then find the last array in list
	// and clone it
	// workaround to not merge arrays, just clone them
	if (Array.isArray(result)) {
		// simple case of single item
		if (extenders.length === 1) {
			return cloneArray(extenders[0]);
		}
		const len = extenders.length;
		for (let i = len - 1; i >= 0; i--) {
			if (Array.isArray(extenders[i])) {
				return cloneArray(extenders[i]);
			}
		}
		// if no args are array then just return first inital value
		return cloneArray(result);
	}

	for (let extender of extenders) {
		if (!isPlainObject(extender)) {
			continue;
		}
		for (let [key, value] of Object.entries(extender)) {
			if (deep && isCloneable(value)) {
				if (Array.isArray(value)) {
					// clone array
					result[key] = cloneArray(value);
				} else {
					const base = isPlainObject(result[key]) ? result[key] : {};
					result[key] = extend(true, base, value);
				}
			// treat null values as {} and don't overwrite existing objects
			} else if (value === null && isPlainObject(result[key])) {
				continue;
			} else {
				result[key] = value;
			}
		}
	}
	return result;
}

function compact (obj, isDeep = true) {
	if (!isCloneable(obj)) {
		return obj;
	}
	if (Array.isArray(obj)) {
		return obj
			.filter(obj => obj)
			.map(obj => isDeep ? compact(obj, isDeep) : obj);
	}
	return Object.entries(obj)
		.reduce((out, [key, value]) => {
			// ignore undefined
			if (value === undefined) {
				return out;
			}
			if (isDeep && isCloneable(value)) {
				out[key] = compact(value, isDeep);
			} else {
				out[key] = value;
			}
			return out;
		}, {});
}

function extendDeep(...args) {
	// @ts-ignore
	args = args.filter(isCloneable);
	return extend(true, ...args);
}

class Config {
	constructor () {
		const cfg = {};

		const configDir = process.env.NODE_CONFIG_DIR || '.';
		for (let cfgfile of ['default.yaml', 'config.yaml', 'local.yaml']) {
			try {
				const filepath = path.join(configDir, cfgfile);
				const exists = fs.existsSync(filepath);
				if (!exists) {
					continue;
				}
				const data = yaml.safeLoad(fs.readFileSync(filepath, { encoding: 'utf8' }));
				extendDeep(cfg, data);
			} catch (err) {
				console.debug(`unable to read config file ${cfgfile}`, err);
			}
		}
		this.assign(cfg);
	}
	has (key) {
		return dotProp.has(this, key);
	}
	get (subKey, defaultValue) {
		return this.toObject(subKey, defaultValue);
	}
	set (key, value) {
		dotProp.set(this, key, value);
		return this;
	}
	assign (key, ...rest) {
		// TODO QUESTION do we need to worry about symbols?
		if (typeof key === 'string') {
			// avoid error if key doesn't yet exist
			if (!dotProp.has(this, key)) {
				this.set(key, {});
			}
			extendDeep(dotProp.get(this, key), ...rest);
		} else {
			extendDeep(this, key, ...rest);
		}
		return this;
	}
	toObject (subKey, defaultValue) {
		// allow 0 as index, otherwise must be truthy
		const isKey = (subKey || subKey === 0);
		const obj = isKey ?
			dotProp.get(this, subKey, defaultValue) :
			this;
		if (!isObject(obj) || obj === defaultValue) {
			return obj;
		}
		// deep clone to avoid secondary effects
		return extend(true, Array.isArray(obj) ? [] : {}, obj);
	}
	toJSON (subKey) {
		// uses extend to do a deep copy
		return this.toObject(subKey);
	}
	get util () {
		return {
			/**
			 *
			 * @param {any} val
			 * @returns {val is {}}
			 */
			isObject (val) {
				return val && (typeof val === 'object');
			},
			/**
			 *
			 * @param {any} val
			 * @returns {val is {}}
			 */
			isPlainObject (val) {
				return ({}).toString.call(val) === '[object Object]';
			},
			/**
			 *
			 * @param  {...any} args
			 * @returns {any}
			 */
			extendDeep(...args) {
				return extendDeep(...args);
			},
			/**
			 *
			 * @param {any} obj
			 * @param {boolean} [isDeep]
			 * @returns {any}
			 */
			compact(obj, isDeep = true) {
				return compact(obj, isDeep);
			},
			defaults: (key, defaults) => {
				if (typeof key === 'string') {
					const existing = this.toObject(key);
					return this.assign(key, defaults, existing);
				}
				defaults = key;
				const existing = this.toObject();
				return this.assign(defaults, existing);
			},
			alias: (aliasKey, fullKey) => {
				if (aliasKey.includes('.')) {
					throw new TypeError('Alias works only for single depth of config');
				}
				Object.defineProperty(this, aliasKey, {
					get() { return this.get(fullKey); },
					set(val) { this.set(fullKey, val); },
					enumerable: false
				});
			}
		};
	}
}

if (!global[GLOBAL_CONFIG]) {
	global[GLOBAL_CONFIG] = new Config();
	debuglog(global[GLOBAL_CONFIG].toObject());
}

const config = global[GLOBAL_CONFIG];

module.exports = config;
