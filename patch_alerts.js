const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // If the file uses Alert.alert but doesn't have our CustomAlert hook yet
      if (content.includes('Alert.alert') && !content.includes('@/components/CustomAlert')) {
        let modified = false;
        
        // Match import { ..., Alert, ... } from 'react-native'
        const rnImportMatch = content.match(/import\s+{([^}]+)}\s+from\s+['"]react-native['"]/);
        
        if (rnImportMatch) {
          let inner = rnImportMatch[1];
          if (inner.includes('Alert')) {
            // Remove 'Alert' and clean up commas
            let newInner = inner.replace(/\bAlert\b/g, '').replace(/,\s*,/g, ',').replace(/^,\s*/, '').replace(/,\s*$/, '').trim();
            let newImport = newInner ? `import { ${newInner} } from 'react-native';` : '';
            
            content = content.replace(rnImportMatch[0], newImport);
            
            // Add CustomAlert import right after
            const customImport = `\nimport { CustomAlert as Alert } from '@/components/CustomAlert';`;
            
            if (newImport) {
              content = content.replace(newImport, newImport + customImport);
            } else {
              // If we removed the react-native import entirely, just place our new one where it was
              content = content.replace(rnImportMatch[0], customImport.trim());
            }
            modified = true;
          }
        }
        
        if (!modified) {
             const customImport = `import { CustomAlert as Alert } from '@/components/CustomAlert';\n`;
             content = customImport + content;
             modified = true;
        }
        
        if (modified) {
          fs.writeFileSync(fullPath, content, 'utf8');
          console.log('Updated: ' + fullPath);
        }
      }
    }
  }
}

processDir(path.join(process.cwd(), 'app'));
