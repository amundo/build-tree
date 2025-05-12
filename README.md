---
title: build-tree.js - Create Directory Structures from Text
author: Patrick Hall
---
# Build Tree

A flexible command-line tool for creating directory structures from text-based tree representations.

## Overview

Build Tree allows you to quickly create directory structures from a text file containing a tree representation. It supports multiple formats including standard tree characters (`├──`, `│`) and simple indentation with spaces or tabs.

## Installation

Clone this repository and make the script executable:

```bash
git clone https://github.com/yourusername/build-tree.git
cd build-tree
chmod +x build-tree.js
```

## Requirements

- [Deno](https://deno.land/) runtime

## Usage

```bash
deno run -A build-tree.js [options] <structure-file>
```

### Basic Example

Create a file named `structure.txt`:

```
project/
├── src/
│   ├── models/
│   │   └── User.js
│   ├── utils/
│   │   └── helpers.js
│   └── index.js
├── test/
└── README.md
```

Then run:

```bash
deno run -A build-tree.js structure.txt
```

This will create the directory structure in your current directory.

### Indentation-Only Format

Build Tree also supports simple indentation format:

```
project/
    src/
        models/
            User.js
        utils/
            helpers.js
        index.js
    test/
    README.md
```

The script automatically detects the format and indentation size.

## Supported Formats

1. **Tree Format**
   - Uses tree characters (`├──`, `│`, `└──`)
   - Traditional directory tree representation

2. **Indentation Format**
   - Uses spaces or tabs for indentation
   - Simplifies tree representation without special characters

## Options

```
Options:
  -f, --force         Overwrite existing files/directories
  -q, --quiet         Less verbose output
  -o, --output        Output directory (default: current directory)
  -d, --debug         Show debug information
  -i, --indent-size   Indentation size (default: auto)
  --dump              Dump the intermediate data structure as JSON and exit
  -h, --help          Show this help message
```

### Examples

**Create structure in specific output directory:**
```bash
deno run -A build-tree.js -o my-project structure.txt
```

**Overwrite existing files and directories:**
```bash
deno run -A build-tree.js --force structure.txt
```

**Specify custom indentation size:**
```bash
deno run -A build-tree.js --indent-size=2 structure.txt
```

**Dump intermediate data structure:**
```bash
deno run -A build-tree.js --dump structure.txt > structure.json
```

## Adding File Content

You can specify content for files using comments:

```
project/
├── src/
│   └── index.js  // content: console.log('Hello, world!');
└── README.md     // content: # My Project
```

### Advanced Features

#### Data Structure Dump

Use the `--dump` flag to output the parsed intermediate data structure as JSON without creating any files or directories. This is useful for debugging or using the parsed structure in other tools:

```bash
deno run -A build-tree.js --dump structure.txt > structure.json
```

The output will be a JSON representation of the directory tree, which looks like:

```json
{
  "type": "directory",
  "name": "project",
  "children": [
    {
      "type": "directory",
      "name": "src",
      "children": [
        {
          "type": "file",
          "name": "index.js",
          "content": "console.log('Hello world');"
        }
      ]
    }
  ]
}
```

This feature allows you to:
- Validate the parsing logic
- Use the structure in other tools or scripts
- Debug complex directory structures

## Safety Features

Build Tree includes several safety features:

- Never attempts to write to system root directory
- Detects and prevents path traversal attacks
- Warns about potentially dangerous operations

## License

MIT License