#!/usr/bin/env -S deno run --allow-read --allow-write
import { join } from "jsr:@std/path";
import { parse } from "jsr:@std/flags";

// Parse command line arguments
const flags = parse(Deno.args, {
  boolean: ["force", "quiet", "help", "debug", "dump"],
  string: ["output", "indent-size"],
  alias: {
    f: "force",
    q: "quiet",
    o: "output",
    h: "help",
    d: "debug",
    i: "indent-size"
  },
  default: {
    force: false,
    quiet: false,
    debug: false,
    dump: false,
    "indent-size": "auto" // "auto" or a number
  }
});

// Show help
if (flags.help) {
  console.log(`
  Directory Structure Builder
  
  Usage:
    build-tree.js [options] <structure-file>
  
  Options:
    -f, --force         Overwrite existing files/directories
    -q, --quiet         Less verbose output
    -o, --output        Output directory (default: current directory)
    -d, --debug         Show debug information
    -i, --indent-size   Indentation size (default: auto)
    --dump              Dump the intermediate data structure as JSON and exit
    -h, --help          Show this help message
  `);
  Deno.exit(0);
}

const inputFile = flags._[0];
if (!inputFile) {
  console.error("Error: No input file provided");
  console.error("Usage: build-tree.js [options] <structure-file>");
  console.error("Try 'build-tree.js --help' for more information");
  Deno.exit(1);
}

// Set output directory
const outputDir = flags.output || ".";

// Logging utility
const log = {
  info: (msg) => {
    if (!flags.quiet) console.log(msg);
  },
  error: (msg) => console.error(msg),
  debug: (msg) => {
    if (flags.debug) console.log(`[DEBUG] ${msg}`);
  }
};

// Determine if the tree is using tree characters or just indentation
function detectTreeFormat(lines) {
  // Check if any line contains tree characters
  const hasTreeChars = lines.some(line => 
    line.includes("├") || line.includes("└") || line.includes("│")
  );
  
  return hasTreeChars ? "tree" : "indent";
}

// Detect the indentation size used in an indentation-only format
function detectIndentSize(lines) {
  // Skip the first line (root)
  if (lines.length < 2) return 4; // Default
  
  // Find the first indented line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(\s+)\S/);
    if (match) {
      return match[1].length;
    }
  }
  
  return 4; // Default to 4 spaces if we can't detect
}

// Function to parse the tree and build a structured representation
function parseTreeToStructure(lines) {
  // Skip empty lines and .DS_Store entries
  const filteredLines = lines.filter(line => {
    const trimmedLine = line.trim();
    return trimmedLine && !trimmedLine.includes(".DS_Store");
  });
  
  if (filteredLines.length === 0) {
    return null;
  }
  
  // Detect format: tree or indent
  const format = detectTreeFormat(filteredLines);
  log.info(`Detected format: ${format}`);
  
  // If indentation format, detect indent size
  let indentSize = 4; // Default
  if (format === "indent") {
    if (flags["indent-size"] === "auto") {
      indentSize = detectIndentSize(filteredLines);
    } else {
      indentSize = parseInt(flags["indent-size"], 10);
    }
    log.info(`Using indent size: ${indentSize}`);
  }
  
  // Extract root name from first line
  const rootLine = filteredLines[0].trim();
  const rootName = rootLine.endsWith("/") ? rootLine.slice(0, -1) : rootLine;
  
  // Create root node
  const root = {
    type: "directory",
    name: rootName,
    children: [],
    content: null
  };
  
  // Initialize stack with the root node
  const stack = [root];
  
  // Track the depth of each node in the stack
  const depthStack = [0];
  
  // Process each line starting from the second line (index 1)
  for (let i = 1; i < filteredLines.length; i++) {
    const line = filteredLines[i];
    const trimmedLine = line.trimEnd();
    
    // Split line to extract potential comments
    const parts = trimmedLine.split("//");
    const cleanLine = parts[0].trimEnd();
    let content = null;
    
    // Extract content from comments if present
    if (parts.length > 1) {
      const commentText = parts.slice(1).join("//").trim();
      if (commentText.startsWith("content:")) {
        content = commentText.substring("content:".length).trim();
      }
    }
    
    let depth = 0;
    let name = "";
    
    if (format === "tree") {
      // Skip lines without tree markers
      if (!cleanLine.includes("──")) continue;
      
      // Determine depth by counting the number of tree characters
      const indentation = cleanLine.substring(0, cleanLine.indexOf("──"));
      depth = (indentation.match(/│/g) || []).length + 1;
      
      // Extract name from the line
      const nameMatch = cleanLine.match(/[├└]──\s*(.*)/);
      if (!nameMatch) continue;
      
      name = nameMatch[1].trim();
    } else {
      // Indentation format
      // Calculate depth based on leading spaces
      const leadingSpaces = cleanLine.match(/^(\s*)/)[1].length;
      depth = Math.floor(leadingSpaces / indentSize);
      
      // Name is the trimmed line
      name = cleanLine.trim();
    }
    
    const isDirectory = name.endsWith("/");
    
    // Remove trailing slash for directory names
    if (isDirectory) {
      name = name.slice(0, -1);
    }
    
    // Create the node
    const node = {
      type: isDirectory ? "directory" : "file",
      name,
      content,
      children: isDirectory ? [] : null
    };
    
    // Pop stack until we find the parent node
    while (depthStack.length > 0 && depthStack[depthStack.length - 1] >= depth) {
      stack.pop();
      depthStack.pop();
    }
    
    // Add the node to its parent's children
    const parent = stack[stack.length - 1];
    parent.children.push(node);
    
    // If node is a directory, push it onto the stack
    if (isDirectory) {
      stack.push(node);
      depthStack.push(depth);
    }
    
    log.debug(`Line: "${cleanLine}" -> depth=${depth}, name="${name}", type=${node.type}`);
  }
  
  return root;
}

// Function to create directories and files from the structure
async function createFilesFromStructure(structure, basePath = "") {
  if (!structure) return;
  
  const currentPath = join(basePath, structure.name);
  
  // Create current node
  try {
    if (structure.type === "directory") {
      try {
        const stat = await Deno.stat(currentPath);
        if (!flags.force && stat.isDirectory) {
          log.info(`Skipping existing directory: ${currentPath}`);
        } else {
          await Deno.mkdir(currentPath, { recursive: true });
          log.info(`Created directory: ${currentPath}`);
        }
      } catch (e) {
        // Directory doesn't exist, create it
        await Deno.mkdir(currentPath, { recursive: true });
        log.info(`Created directory: ${currentPath}`);
      }
      
      // Process children
      if (structure.children) {
        for (const child of structure.children) {
          await createFilesFromStructure(child, currentPath);
        }
      }
    } else if (structure.type === "file") {
      try {
        const stat = await Deno.stat(currentPath);
        if (!flags.force && stat.isFile) {
          log.info(`Skipping existing file: ${currentPath}`);
        } else {
          await Deno.writeTextFile(currentPath, structure.content || "");
          log.info(`Created file: ${currentPath}${structure.content ? ' with content' : ''}`);
        }
      } catch (e) {
        // File doesn't exist, create it
        await Deno.writeTextFile(currentPath, structure.content || "");
        log.info(`Created file: ${currentPath}${structure.content ? ' with content' : ''}`);
      }
    }
  } catch (error) {
    log.error(`Error creating ${structure.type}: ${currentPath}: ${error.message}`);
  }
}

// Function to print the structure (for debugging)
function printStructure(structure, indent = 0) {
  if (!structure) return;
  
  const indentation = " ".repeat(indent);
  const typeMarker = structure.type === "directory" ? "/" : "";
  log.debug(`${indentation}${structure.name}${typeMarker}`);
  
  if (structure.children) {
    for (const child of structure.children) {
      printStructure(child, indent + 2);
    }
  }
}

try {
  // Read the file
  const text = await Deno.readTextFile(inputFile);
  const lines = text.split("\n");
  
  // Parse the tree to a structured representation
  const structure = parseTreeToStructure(lines);
  
  if (flags.debug) {
    log.debug("Parsed structure:");
    printStructure(structure);
  }
  
  // If --dump flag is provided, output the JSON structure and exit
  if (flags.dump) {
    // Remove any circular references
    const cleanStructure = JSON.parse(JSON.stringify(structure));
    console.log(JSON.stringify(cleanStructure, null, 2));
    Deno.exit(0);
  }
  
  // Create the directories and files
  await createFilesFromStructure(structure, outputDir);
  
  log.info("Directory structure created successfully!");
} catch (error) {
  log.error(`Error: ${error.message}`);
  Deno.exit(1);
}