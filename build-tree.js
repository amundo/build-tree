// tree-builder.js
// Usage: deno run --allow-write --allow-read tree-builder.js structure.txt [output-dir]
import { ensureDir } from "jsr:@std/fs"

/**
 * Replace leading tree characters with spaces
 * @param {string} line - The line to process
 * @returns {string} - The processed line
 */
const normalizeTree = (plaintextTree) => {
  let lines = plaintextTree.split("\n")

  const letterRegExp = new RegExp(/\p{Letter}/gu)

  const replaceTreeCharactersWithSpaces = (line) => {
    const firstLetterIndex = line.split``.findIndex((c) =>
      c == "." || letterRegExp.test(c)
    )
    const prefix = line.slice(0, firstLetterIndex)
    const content = line.slice(firstLetterIndex)
    return " ".repeat(prefix.length) + content 
  }
  lines = lines.map(replaceTreeCharactersWithSpaces)
  return lines.join`\n`
}

/**
 * Parse an indentation-based tree structure
 * @param {string} input - Text representation of tree with indentation
 * @returns {Object} - Parsed tree structure
 */
function parseIndentedTree(input) {
  const normalizedInput = normalizeTree(input)
  const lines = normalizedInput.split("\n").map((line) => line.trimEnd())
  const root = {}
  const stack = [{ level: -1, node: root }]

  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) continue

    // Calculate indentation level (count leading spaces)
    const leadingSpaces = line.match(/^\s*/)[0].length
    const level = leadingSpaces / 4 // assuming 4 spaces per level

    // Get the name by removing leading spaces
    const name = line.trim()

    // Adjust stack based on current level
    while (stack.length > level + 1) {
      stack.pop()
    }

    // Get the parent node
    const parent = stack[stack.length - 1].node

    if (name.endsWith("/")) {
      // This is a directory - create a new object and update stack
      const dirName = name.slice(0, -1)
      parent[dirName] = {}
      stack.push({ level, node: parent[dirName] })
    } else {
      // This is a file - just add it to the parent
      parent[name] = "file"
    }
  }

  return root
}

/**
 * Build the file structure on disk
 * @param {string} basePath - Base directory path
 * @param {Object} structure - Parsed tree structure
 */
async function buildTree(basePath, structure) {
  for (const [name, content] of Object.entries(structure)) {
    const fullPath = `${basePath}/${name}`

    if (typeof content === "object") {
      // This is a directory
      console.log(`Creating directory: ${fullPath}`)
      await ensureDir(fullPath)

      // Recursively build subdirectories and files
      await buildTree(fullPath, content)
    } else if (content === "file") {
      // This is a file
      console.log(`Creating empty file: ${fullPath}`)
      await Deno.writeTextFile(fullPath, "")
    }
  }
}

// Main function
async function main(structureFile, outputDir = "output") {
  try {
    const structureContent = await Deno.readTextFile(structureFile)

    // Parse the tree structure
    const parsedTree = parseIndentedTree(structureContent)
    console.log("Parsed tree structure:")
    console.log(JSON.stringify(parsedTree, null, 2))

    // Build the tree
    console.log(`\nBuilding file structure in ${outputDir}:`)
    await ensureDir(outputDir)
    await buildTree(outputDir, parsedTree)

    console.log("\nFile structure created successfully!")
  } catch (error) {
    console.error(`Error: ${error.message}`)
    Deno.exit(1)
  }
}

if (import.meta.main) {
  // Get command line arguments
  const args = Deno.args

  if (args.length < 1) {
    console.error(
      "Usage: deno run --allow-write --allow-read tree-builder.js structure.txt [output-dir]",
    )
    Deno.exit(1)
  }

  // Read the structure file
  const structureFile = args[0]
  const outputDir = args[1] || "output"

  await main(structureFile, outputDir)
}

export { buildTree, normalizeTree, parseIndentedTree }
