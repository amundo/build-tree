#!/usr/bin/env -S deno run --allow-read --allow-write
import { join } from "jsr:@std/path";

const inputFile = Deno.args[0];
if (!inputFile) {
  console.error("Usage: deno run --allow-read --allow-write build-tree.js <structure.txt>");
  Deno.exit(1);
}

try {
  const text = await Deno.readTextFile(inputFile);
  const lines = text.split("\n").map(line => line.trimEnd()).filter(Boolean);
  
  // Create a mapping of depth -> path component
  const pathMap = new Map();
  let rootDir = null;

  for (const rawLine of lines) {
    const cleanLine = rawLine.split("//")[0].trimEnd();
    if (!cleanLine || cleanLine.includes(".DS_Store")) continue;
    
    let depth, name;
    
    if (!cleanLine.includes("──")) {
      // Root directory
      depth = 0;
      name = cleanLine.endsWith("/") ? cleanLine.slice(0, -1) : cleanLine;
      rootDir = name;
    } else {
      // Count the depth by the position of '├' or '└' in the line
      const match = cleanLine.match(/^(.*?)([├└]──\s*)(.*?)$/);
      if (!match) continue;
      
      const indentation = match[1];
      depth = (indentation.match(/│/g) || []).length + 1;
      name = match[3].trim();
      if (name.endsWith("/")) name = name.slice(0, -1);
    }
    
    if (!name) continue;
    
    // Update the path map for this depth
    pathMap.set(depth, name);
    
    // Clear any deeper paths that might exist from previous iterations
    for (let i = depth + 1; pathMap.has(i); i++) {
      pathMap.delete(i);
    }
    
    // Build the full path
    const pathComponents = [rootDir];
    for (let i = 1; i <= depth; i++) {
      if (pathMap.has(i)) {
        pathComponents.push(pathMap.get(i));
      }
    }
    
    const fullPath = join(...pathComponents);
    
    // Determine if it's a directory
    const isDir = rawLine.trim().endsWith("/") || 
                  (cleanLine.includes("//") && name.includes("//")) ||
                  (!name.includes("."));
    
    try {
      if (isDir) {
        await Deno.mkdir(fullPath, { recursive: true });
        console.log(`Created directory: ${fullPath}`);
      } else {
        // For files, ensure the parent directory exists
        const dirPath = join(...pathComponents.slice(0, -1));
        await Deno.mkdir(dirPath, { recursive: true });
        await Deno.writeTextFile(fullPath, "");
        console.log(`Created file: ${fullPath}`);
      }
    } catch (error) {
      console.error(`Error creating ${isDir ? 'directory' : 'file'} ${fullPath}: ${error.message}`);
    }
  }
  
  console.log("Directory structure created successfully!");
} catch (error) {
  console.error(`Error processing file: ${error.message}`);
  Deno.exit(1);
}