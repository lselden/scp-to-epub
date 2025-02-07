---
### Everything between the "---" lines is YAML settings stuff. Comment lines (like this one) start with #

title: 'Name of this EBook'
author: SCP Foundation by default, but can specify different person instead
publisher: SCP Foundation

### Specify the cover of the book
### Don't forget to give credit to the artist!!!
cover:
  ### Option 1: local image
  #path: 'path/to/local/file.jpg'

  ### Option 2: Set the book cover to a URL.
  url: 'https://scp-wiki.wdfiles.com/local--files/a-sunny-day-at-the-clockwork-gallery/SCP-Logo.png'

  ### Option 3: Use theme and custom CSS
  #theme: "/theme:minimal"
  #themeImage: "default"
  #overrideCSS: |
  #  body { background: white; }
  #  #title, #author { color: black; white-space: break-spaces !important; }
  #  .cover-image { color: rgba(127, 127, 127, 0.3); }

  ### Option 4 - don't include anything, just use default cover generation


### PREFACE CONTENT
### This is markdown content -- make sure your lines have a 2 space indentation in front.
preface: |
  Cover image by [SunnyClockwork](https://scp-wiki.wikidot.com/a-sunny-day-at-the-clockwork-gallery)

  This is where you can put in some initial text.

  You can use _markdown_ **formatting** or <span style="color: red">HTML</span>

  Just be sure to indent each line with 2 spaces (because yaml)

### Scraping settings
### Any links specified below will get included. If there's < than maxChapters then links inside those articles will get added (up to a total of maxChapters)
### If you get past 100 you may get really big files, just sayin
maxChapters: 50

### Output settings
### customCSS - add in custom CSS for this book. See assets/css for already defined CSS
customCss: |
  .redacted {
    text-decoration: none
  }

### ADVANCED - you can also customize any settings set in config.yaml on a book-by-book basis.
### example - set maximum width/height of images
#output:
#  images:
#    width: 300
#    height: 300

### END of metadata. ####
### Everything after the "---" is markdown and specifies the TABLE OF CONTENTS
### You MUST have at least one HEADER line (starts with a ## or is HTML <h2>header</h2>)
### Each h2 header line breaks up the different section/part of the book
### Any article link in the body will be included in the book output.
---

## Part 1

Look! It doesn't matter how you put in the links, the tool will try to add them!

<a href="http://scpwiki.com/scp-096">SCP-096</a>

* [Rate My Director](/rate-my-director) by Rounderhouse - **Some kind of comment about the article**

## Part 2


* [Site 95](https://scp-wiki.wikidot.com/secure-facility-dossier-site-95) - An example of a page that might have multiple links within it