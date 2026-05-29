## 2.0

### Features

* Use Node's built-in "Self-Contained Executable" build, which results in a larger filesize but is less likely to trigger false-positive antivirus warnings
* tweaked detection of when page has finished loading, so scraping should go faster
* Added retries in case page load doesn't succeed
* Update puppeteer library so built-in browser is more modern
* added configurable option to block network requests by regex(s)

### Bugfixes

* Output fixes by @JanWerder

### Changes
* Switch to ESM instead of commonjs
* Updated dependencies to modern versions
* Build to target node 24

##  1.6

* Switch to tsdown for building
* Use WASM version of sharp library (image processing)

## 1.5

### Features

* Exclude unlisted/private pages from being crawled

### Changes

* Bump Puppeteer to version 24


