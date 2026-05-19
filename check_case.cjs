const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function findFiles(dir, ext) {
  let files = [];
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      files = files.concat(findFiles(fullPath, ext));
    } else if (fullPath.endsWith(ext) || fullPath.endsWith('.ts')) {
      files.push(fullPath);
    }
  });
  return files;
}

const files = findFiles('src', '.tsx');
let hasError = false;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  const importRegex = /from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (importPath.startsWith('@/')) {
      const relativePath = importPath.substring(2);
      const fullPath = path.join('src', relativePath);
      
      // Try resolving with .tsx, .ts, .js, .jsx, .css
      const exts = ['', '.tsx', '.ts', '.css'];
      let found = false;
      let actualPath = '';
      
      for (const ext of exts) {
        if (fs.existsSync(fullPath + ext)) {
          found = true;
          actualPath = fullPath + ext;
          break;
        }
      }
      
      if (found) {
        // Check actual casing on disk using a case-sensitive check (find)
        const dir = path.dirname(actualPath);
        const base = path.basename(actualPath);
        const dirFiles = fs.readdirSync(dir);
        if (!dirFiles.includes(base)) {
            console.log(`CASE MISMATCH in ${file}: Imported '${importPath}', but actual file is in [${dirFiles.join(', ')}]`);
            hasError = true;
        }
      }
    }
  }
});

if (!hasError) console.log("All imports have correct casing!");
