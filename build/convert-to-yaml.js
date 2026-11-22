#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function jsonToYaml(obj, indent = 0, isFirstKey = false) {
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj === 'boolean') return String(obj);
  if (typeof obj === 'number') return String(obj);
  if (typeof obj === 'string') {
    // Quote strings that need quoting
    if (/^[0-9]/.test(obj) || /[:{}\[\],&*#?|'"\\\n\r]/.test(obj) || /^\s|\s$/.test(obj)) {
      return JSON.stringify(obj);
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    const indentStr = ' '.repeat(indent);
    return '\n' + obj.map((item) => {
      const itemYaml = jsonToYaml(item, indent + 2);
      if (itemYaml.startsWith('\n')) {
        return `${indentStr}- ${itemYaml.slice(1)}`;
      } else {
        return `${indentStr}- ${itemYaml}`;
      }
    }).join('\n');
  }
  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';
    const indentStr = ' '.repeat(indent);
    const nextIndent = ' '.repeat(indent + 2);
    return '\n' + keys.map(key => {
      const value = obj[key];
      const yaml = jsonToYaml(value, indent + 2);
      if (yaml.startsWith('\n')) {
        return `${indentStr}${key}:${yaml}`;
      } else {
        return `${indentStr}${key}: ${yaml}`;
      }
    }).join('\n');
  }
  return String(obj);
}

function convertFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const frontMatterMatch = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);
  
  if (!frontMatterMatch) {
    return false; // No front matter
  }

  const frontMatterText = frontMatterMatch[1];
  const activityLineMatch = /^activity:.*/m.exec(frontMatterText);
  
  if (!activityLineMatch) {
    return false; // No activity field
  }

  const activityLine = activityLineMatch[0];
  const jsonMatch = /^activity:\s*(\{.*)$/m.exec(activityLine);
  
  if (!jsonMatch) {
    return false; // Can't parse activity line (might already be YAML)
  }

  try {
    const jsonStr = jsonMatch[1].trim();
    const data = JSON.parse(jsonStr);
    
    // Convert to YAML format - the content should be indented 2 spaces under activity:
    const yamlContent = jsonToYaml(data, 2).slice(1); // Remove leading newline
    const yamlLine = `activity:${yamlContent}`;
    
    // Replace the activity line in frontmatter
    const newFrontMatter = frontMatterText.replace(activityLineMatch[0], yamlLine);
    const newContent = content.replace(frontMatterMatch[0], `---\n${newFrontMatter}\n---`);
    
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✓ Converted: ${path.relative(ROOT, filePath)}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to convert ${path.relative(ROOT, filePath)}: ${error.message}`);
    return false;
  }
}

function findMarkdownFiles(dir) {
  const files = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }
  walk(dir);
  return files;
}

async function main() {
  console.log('Converting blog post frontmatter to YAML format...\n');
  
  const postsDir = path.join(ROOT, '_posts');
  const draftsDir = path.join(ROOT, '_drafts');
  
  const files = [
    ...findMarkdownFiles(postsDir),
    ...(fs.existsSync(draftsDir) ? findMarkdownFiles(draftsDir) : [])
  ];
  
  let converted = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const file of files) {
    try {
      if (convertFile(file)) {
        converted++;
      } else {
        skipped++;
      }
    } catch (error) {
      failed++;
      console.error(`✗ Error processing ${path.relative(ROOT, file)}: ${error.message}`);
    }
  }
  
  console.log(`\nSummary:`);
  console.log(`  Converted: ${converted}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Failed: ${failed}`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});



function convertFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const frontMatterMatch = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);
  
  if (!frontMatterMatch) {
    return false; // No front matter
  }

  const frontMatterText = frontMatterMatch[1];
  const activityLineMatch = /^activity:.*/m.exec(frontMatterText);
  
  if (!activityLineMatch) {
    return false; // No activity field
  }

  const activityLine = activityLineMatch[0];
  const jsonMatch = /^activity:\s*(.+)$/m.exec(activityLine);
  
  if (!jsonMatch) {
    return false; // Can't parse activity line
  }

  try {
    const jsonStr = jsonMatch[1].trim();
    const data = JSON.parse(jsonStr);
    
    // Convert to YAML format
    const yamlContent = jsonToYaml(data, 0).slice(1); // Remove leading newline
    const yamlLine = `activity:${yamlContent}`;
    
    // Replace the activity line in frontmatter
    const newFrontMatter = frontMatterText.replace(activityLineMatch[0], yamlLine);
    const newContent = content.replace(frontMatterMatch[0], `---\n${newFrontMatter}\n---`);
    
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✓ Converted: ${path.relative(ROOT, filePath)}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to convert ${path.relative(ROOT, filePath)}: ${error.message}`);
    return false;
  }
}

function findMarkdownFiles(dir) {
  const files = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }
  walk(dir);
  return files;
}

async function main() {
  console.log('Converting blog post frontmatter to YAML format...\n');
  
  const postsDir = path.join(ROOT, '_posts');
  const draftsDir = path.join(ROOT, '_drafts');
  
  const files = [
    ...findMarkdownFiles(postsDir),
    ...(fs.existsSync(draftsDir) ? findMarkdownFiles(draftsDir) : [])
  ];
  
  let converted = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const file of files) {
    try {
      if (convertFile(file)) {
        converted++;
      } else {
        skipped++;
      }
    } catch (error) {
      failed++;
      console.error(`✗ Error processing ${path.relative(ROOT, file)}: ${error.message}`);
    }
  }
  
  console.log(`\nSummary:`);
  console.log(`  Converted: ${converted}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Failed: ${failed}`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
