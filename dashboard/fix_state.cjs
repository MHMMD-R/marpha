const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const str = `const [isEditingUser, setIsEditingUser] = useState(false);`;
const replaceWith = `const [newSubjectName, setNewSubjectName] = useState("");
  const [editingSubject, setEditingSubject] = useState<{id: string, name: string} | null>(null);
  const [isEditingUser, setIsEditingUser] = useState(false);`;

content = content.replace(str, replaceWith);
fs.writeFileSync('src/App.tsx', content);
