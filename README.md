# scp-to-epub
## THE BOOKS
If you just want to download some eBooks head to the [releases](https://github.com/lselden/scp-to-epub/releases) page.

## DESCRIPTION
This is a web scraper that generates ebooks from pages on the [SCP Foundation Wiki](http://www.scp-wiki.net/). It uses a headless browser ([puppeteer](https://github.com/GoogleChrome/puppeteer/)) to load pages, formats the pages to be e-reader friendly, then compiles them into an EPUB-format ebook.

## INSTRUCTIONS

* Install [node.js](https://nodejs.org/en/) **tested on node v12 only*
* Download/fork this repository.
* `npm install`
* `node index.js --help` for instructions.


### Create a book from a single page: 
```sh
# A page that links to other pages
node index.js --page "http://www.scp-wiki.net/old-man-in-the-sea-hub" --title "Old Man And The Sea Canon Hub" --output "old-man-in-the-sea.epub"

# Or just one article (related links go into Appendix)
node index.js --page scp-049 --max-depth 2 --appendix-depth-cutoff 1 --max-chapters 20 --output ./output/scp-o49.epub
```

### Create a book from a template file
Book templates are written in Markdown format with YAML front-matter.

```sh
node index.js --book "books/antimemetics-division.md" --output "~/Documents/scp-antimemetics.epub"
```

*TIP: Parsing is done with the [MarkdownIt](https://github.com/markdown-it/markdown-it) library, with the [markdown-it-attrs](https://github.com/arve0/markdown-it-attrs) extension*

### Preview how a page will look when formatted
```sh
node index.js --view "http://www.scp-wiki.net/random:random-scp"
```
Use this option to load a (non-headless) browser to the specified page. Once the
page is loaded it will format it for mobile viewing. Clicking on any links will
have those pages get formatted as well. (new tabs will be unformatted). This is
useful for debugging `overrides` scripts or customizing CSS (refreshing the page)
will reload overrides / styles).



## FEATURES
* **Hidden Content:** Includes hidden content that's missed using simple text scraping, like a browser's "reader" mode. This tool captures text hidden in collapsible blocks, tab views, iframe content, and *some* interactive content (like list-items/fragments).
* **Cross-link friendly:** Automatically includes related content. Will pull linked pages into the Appendix.
* **Night Mode:** Cleans up text/background colors. In iOS iBooks app it has some additional intelligence about keeping colors while keeping text legible.
* **TTS friendly** - uses semantic HTML markup, to improve text-to-speech parsing.
* **Audio included** - inline audio files are playable (in supported e-readers). Any available [Audio Adaptations](http://www.scp-wiki.net/audio-adaptations) are referenced for each chapter.
* **Friendly footnotes** - "fancy"-style popup footnotes for iBooks and some other e-readers
* **Book Templates** - Create new ebook based on a template, either local (see `books` folder) or [remote](http://scp-sandbox-3.wikidot.com/tmonty).

## CAVEATS
* Books may not be in the best order, or have wrong chapters. I made this tool to read books, not write them. If you have an idea for improving a book template, or want to add more then add an issue or pull request.
* EPUB only. Use Calibre or an online conversion tool to convert to MOBI, PDF, etc.
* I've tested with a couple of different eReaders, but not all of them. Created epub files pass [epubcheck](https://github.com/w3c/epubcheck), though they may have some warnings. I doubt Apple or Amazon would accept them for publishing as-is.
* Some pages might not parse correctly. Add a javascript file to the `overrides` folder with the same name as the article to apply any manual cleanup to get a page to load.
* This is a side project. It isn't polished.

## CONTRIBUTING

If you see any formatting or other errors in the ebooks then please open a Github [Issue](https://github.com/lselden/scp-to-epub/issues/new). Same for if you have an idea for a new collection of articles that should be included as an ebook.


## CREDITS
* EPUB generation inspired by [epub-gen](https://github.com/cyrilis/epub-gen)
* Statistics pulled from [ScpperDB](https://www.scpper.com)
* [tinycolor](https://github.com/bgrins/TinyColor) and [nearest-color](http://danieltao.com/nearest-color) for color calculations
* Base CSS stylesheet inspired by [Blitz](https://github.com/FriendsOfEpub/Blitz)

## LICENSE
scp-to-epub code is Creative Commons Attribution 3.0 License. Unless otherwise stated, all content within ebooks is licensed under [Creative Commons Attribution-ShareAlike 3.0 License](http://creativecommons.org/licenses/by-sa/3.0/)

## SIMILAR PROJECTS
* [SCP Foundation: Ebook edition](http://www.scp-wiki.net/ebooks)
* [SCP Series Field Manual](http://www.scp-wiki.net/forum/t-12612670/new-scp-001-to-scp-1999-documentation-ebooks#post-4379359)