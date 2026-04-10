const fs = require('fs');
let code = fs.readFileSync('app/subject/[id].tsx', 'utf8');

const oldTabsStyle = `  tabsContainer: { marginBottom: 20, alignItems: 'center', direction: 'rtl' },
  tabsWrapper: { flexDirection: 'row-reverse', backgroundColor: C.glass, borderRadius: 24, padding: 6, borderWidth: 1, borderColor: C.glassBorder },
  tabBtn: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 20 },
  tabBtnActive: { backgroundColor: C.surface, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 }, android: { elevation: 3 } }) },
  tabText: { fontSize: 14, fontWeight: '800', color: C.white },
  tabTextActive: { color: C.textBlack },`;

const newTabsStyle = `  tabsContainer: { marginBottom: 20, alignItems: 'stretch', direction: 'rtl' },
  tabsWrapper: { flexDirection: 'row-reverse', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 24, padding: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  tabBtn: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 20 },
  tabBtnActive: { backgroundColor: C.surface, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 }, android: { elevation: 3 } }) },
  tabText: { fontSize: 16, fontWeight: '900', color: '#E0E0E0' },
  tabTextActive: { color: C.textBlack, fontSize: 16 },`;

code = code.replace(oldTabsStyle, newTabsStyle);
fs.writeFileSync('app/subject/[id].tsx', code);
console.log('Fixed tabs UI');
