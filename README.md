---
title: build-tree.js - create an empty directory tree from a plaintext description
author: Patrick Hall
tags: []
url: 
---


This is a simple script to create an empty directory tree from a plaintext description. It is intended to be used as a starting point for creating a directory structure for a new project.

You can think of it as the inverse of the (UNIX `tree`)[https://en.wikipedia.org/wiki/Tree_(command)] command, which lists the contents of a directory in a format like one of the ones below.

## Input format

The input is a plaintext file with one line per directory or file. 

The format is:

```
/
├── src/
│   ├── core/
│   │   ├── Base.js
│   │   ├── Helper.js
│   │   └── index.js
│   ├── data/
│   │   ├── Store.js
│   │   ├── Memory.js
│   │   ├── FileStore.js
│   │   └── index.js
│   ├── api/
│   │   ├── routes/
│   │   │   ├── items.js
│   │   │   ├── data.js
│   │   │   └── actions.js
│   │   ├── Server.js
│   │   └── index.js
│   └── index.js
├── README.md
└── LICENSE
```

Spaces may be used for indentation as well:

```
/
  src/
    core/
      Base.js
      Helper.js
      index.js
    data/
      Store.js
      Memory.js
      FileStore.js
      index.j
    api/
      routes/
        items.js
        data.js
        actions.js
      Server.js
      index.js
    index.js
  README.md
  LICENSE
```

Anything which does _not_ end in a slash is considered a text file, and anything that does is considered a directory.

## Usage


To use this script, you will need to have `deno` installed. You can then run the script with the following command:

```
deno run --allow-read --allow-write build-tree.js <tree-file> <output-dir>
```

## Caveat

I didn’t put much effort into this. YMMV.


## TODO

I don’t like the intial slash line, but I don’t feel like fixing it as it serves my current purposes. Maybe I’ll fix it later.

## License

[WTFPL](./LICENSE)