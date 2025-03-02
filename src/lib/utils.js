const {debuglog} = require('util');
const urlLib = require('url');
const path = require('path');

function uuid() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
		const r = (Math.random()*16)|0;
		return (c === 'x' ? r : (r&0x3)|0x8).toString(16);
	});
}

/**
 * don't worry about double escaping! escape away!
 * @param {*} unsafe 
 * @returns {string}
 */
function maybeEscape(unsafe) {
    if (unsafe == undefined) {
        return unsafe;
    }
    if (typeof unsafe !== 'string') {
		unsafe = `${unsafe}`;
	}
	return unsafe
        .replace(/[<"']/g, function(x) {
            switch (x) {
            case '<': return '&lt;';
            case '"': return '&quot;';
            default: return '&#039;';
            }
        })
        .replace(/&(?!(?:apos|quot|[gl]t|amp);|#)/g, '&amp;');
    

}

function escape(unsafe) {
	if (typeof unsafe !== 'string') {
		return unsafe;
	}
	if (!unsafe) {
		return unsafe;
	}
	return unsafe.replace(/[&<"']/g, function(x) {
		switch (x) {
		case '&': return '&amp;';
		case '<': return '&lt;';
		case '"': return '&quot;';
		default: return '&#039;';
		}
	});
}

const unsafeChars = /[^A-Za-z0-9\u0660-\u0669\u06F0-\u06F9\u0966-\u096F\u09E6-\u09EF\u0A66-\u0A6F\u0AE6-\u0AEF\u0B66-\u0B6F\u0BE7-\u0BEF\u0C66-\u0C6F\u0CE6-\u0CEF\u0D66-\u0D6F\u0E50-\u0E59\u0ED0-\u0ED9\u0F20-\u0F29\xC0-\xD6\xD8-\xF6\xF8-\u0131\u0134-\u013E\u0141-\u0148\u014A-\u017E\u0180-\u01C3\u01CD-\u01F0\u01F4\u01F5\u01FA-\u0217\u0250-\u02A8\u02BB-\u02C1\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03CE\u03D0-\u03D6\u03DA\u03DC\u03DE\u03E0\u03E2-\u03F3\u0401-\u040C\u040E-\u044F\u0451-\u045C\u045E-\u0481\u0490-\u04C4\u04C7\u04C8\u04CB\u04CC\u04D0-\u04EB\u04EE-\u04F5\u04F8\u04F9\u0531-\u0556\u0559\u0561-\u0586\u05D0-\u05EA\u05F0-\u05F2\u0621-\u063A\u0641-\u064A\u0671-\u06B7\u06BA-\u06BE\u06C0-\u06CE\u06D0-\u06D3\u06D5\u06E5\u06E6\u0905-\u0939\u093D\u0958-\u0961\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8B\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AE0\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B36-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB5\u0BB7-\u0BB9\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CDE\u0CE0\u0CE1\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D28\u0D2A-\u0D39\u0D60\u0D61\u0E01-\u0E2E\u0E30\u0E32\u0E33\u0E40-\u0E45\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD\u0EAE\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0F40-\u0F47\u0F49-\u0F69\u10A0-\u10C5\u10D0-\u10F6\u1100\u1102\u1103\u1105-\u1107\u1109\u110B\u110C\u110E-\u1112\u113C\u113E\u1140\u114C\u114E\u1150\u1154\u1155\u1159\u115F-\u1161\u1163\u1165\u1167\u1169\u116D\u116E\u1172\u1173\u1175\u119E\u11A8\u11AB\u11AE\u11AF\u11B7\u11B8\u11BA\u11BC-\u11C2\u11EB\u11F0\u11F9\u1E00-\u1E9B\u1EA0-\u1EF9\u1F00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2126\u212A\u212B\u212E\u2180-\u2182\u3041-\u3094\u30A1-\u30FA\u3105-\u312C\uAC00-\uD7A3-_]/g;

function safeFilename(str, extension = '') {
	if (extension) {
		if (!extension.startsWith('.')) {
			extension = `.${extension}`;
		}
		// remove ext from end before fixing
		str = str.replace(new RegExp(`\\${extension}$`), '');
	}

	str = str
		.replace(/['"]/g, '')
		.replace(unsafeChars, '_');
	if (!/^[_a-z]/i.test(str)) {
		str = `_${str}`;
	}

	// add extension back
	if (extension) {
		str = `${str}${extension}`;
	}
	return str;
}

function filenameForUrl(url, extension = '') {
	const pathname = urlLib.parse(url).pathname;
	const name = safeFilename(pathname.replace(/^\//, ''));
	if (!extension) {
		return name;
	}
	extension = extension.startsWith('.') ? extension : `.${extension}`;
	return `${path.basename(name, extension)}${extension}`;
}

function normalizePath(pathname) {
	const isExtendedLengthPath = /^\\\\\?\\/.test(pathname);
	const hasNonAscii = /[^\u0000-\u0080]+/.test(pathname);

	if (isExtendedLengthPath || hasNonAscii) {
		return pathname;
	}

	return pathname.replace(/\\/g, '/');
}

function normalizeUrl(url, defaultOrigin) {
    return new URL(normalizeRelativePath(url), defaultOrigin).toString()
}

function normalizeRelativePath(url) {
    if (typeof url !== 'string') {
        url = `${url ?? ''}`;
    }
    if (url.startsWith('/') || url.startsWith('http:') || url.startsWith('https:')) {
        return url;
    }
    return `/${url.replace(/\\/g, '/')}`;
}

/**
 * 
 * @param {string} u 
 * @param {string | URL} [defaultOrigin]
 * @param {string | URL} [localArchiveMirror] 
 * @returns 
 */
function maybeMirrorUrl(u, defaultOrigin = undefined, localArchiveMirror) {
    const url = new URL(u, defaultOrigin ? defaultOrigin : undefined)
    if (!localArchiveMirror) return url.toString();
    return `${localArchiveMirror}/${url.toString().replace(/^https?:\/\//, '')}`;
}

const debug = debuglog('scp'); 

module.exports = {
	uuid,
	escape,
    maybeEscape,
	safeFilename,
	filenameForUrl,
	normalizePath,
    maybeMirrorUrl,
    normalizeRelativePath,
    normalizeUrl,
    debug
};
