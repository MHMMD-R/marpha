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

const oldJSX = `<TouchableOpacity activeOpacity={0.8} style={[styles.tabBtn, activeTab === 'videos' && styles.tabBtnActive]} onPress={() => setActiveTab('videos')}>
                  <Ionicons name='videocam' size={18} color={activeTab === 'videos' ? C.textBlack : C.white} />
                  <Text style={[styles.tabText, activeTab === 'videos' && styles.tabTextActive]}>المحاضرات</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.8} style={[styles.tabBtn, activeTab === 'quizzes' && styles.tabBtnActive]} onPress={() => setActiveTab('quizzes')}>
                  <Ionicons name='document-text' size={18} color={activeTab === 'quizzes' ? C.textBlack : C.white} />
                  <Text style={[styles.tabText, activeTab === 'quizzes' && styles.tabTextActive]}>الاختبارات</Text>
                </TouchableOpacity>`;

const newJSX = `<TouchableOpacity activeOpacity={0.8} style={[styles.tabBtn, activeTab === 'videos' && styles.tabBtnActive]} onPress={() => setActiveTab('videos')}>
                  <Ionicons name='videocam' size={20} color={activeTab === 'videos' ? C.textBlack : '#E0E0E0'} />
                  <Text style={[styles.tabText, activeTab === 'videos' && styles.tabTextActive]}>المحاضرات</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.8} style={[styles.tabBtn, activeTab === 'quizzes' && styles.tabBtnActive]} onPress={() => setActiveTab('quizzes')}>
                  <Ionicons name='document-text' size={20} color={activeTab === 'quizzes' ? C.textBlack : '#E0E0E0'} />
                  <Text style={[styles.tabText, activeTab === 'quizzes' && styles.tabTextActive]}>الاختبارات</Text>
                </TouchableOpacity>`;

code = code.replace(oldJSX, newJSX);
fs.writeFileSync('app/subject/[id].tsx', code);
