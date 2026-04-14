const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldNav = `const NAV_ITEMS_SYSTEM = [
  { icon: Bell, label: "الإشعارات"},
  { icon: Settings, label: "الإعدادات" },
];`;
const newNav = `const NAV_ITEMS_SYSTEM = [
  { icon: Bell, label: "الإشعارات", id: "notifications" },
  { icon: Settings, label: "الإعدادات", id: "settings" },
];`;

content = content.replace(oldNav, newNav);
fs.writeFileSync('src/App.tsx', content);
