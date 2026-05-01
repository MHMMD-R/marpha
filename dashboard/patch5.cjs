const fs = require('fs');
const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

// Find the line index for `{!isEditingUser ? (`
const startIdx = lines.findIndex((l, i) => i > 2340 && l.includes('{!isEditingUser ? ('));
console.log('Found !isEditingUser at line:', startIdx + 1);

// Find the next line `<>` 
const fragIdx = startIdx + 1;
console.log('Fragment line:', fragIdx + 1, lines[fragIdx].trim());

// Find where the teacher image upload block starts: `{manageTarget.type === 'teacher' && (`
const teacherImgIdx = lines.findIndex((l, i) => i > fragIdx && l.includes("manageTarget.type === 'teacher' && (") && lines[i+1] && lines[i+1].includes('form-group'));
console.log('Teacher image start at line:', teacherImgIdx + 1);

// Find the end of the username/password section (the closing div for the background block)
// Look for the marginBottom: "20px" closing div followed by empty line
let passwordBlockEnd = -1;
for (let i = teacherImgIdx; i < lines.length; i++) {
  if (lines[i].includes('كلمة المرور المؤقتة')) {
    // Find closing tags after this
    for (let j = i; j < i + 10; j++) {
      if (lines[j].trim() === '</div>' && lines[j-1] && lines[j-1].includes(')}')) {
        passwordBlockEnd = j;
        break;
      }
    }
    if (passwordBlockEnd === -1) {
      // Try another pattern
      for (let j = i; j < i + 10; j++) {
        if (lines[j].trim() === '</div>' && lines[j+1] && (lines[j+1].trim() === '' || lines[j+1].trim().startsWith('{manageTarget'))) {
          passwordBlockEnd = j;
          break;
        }
      }
    }
    break;
  }
}
console.log('Password block ends at line:', passwordBlockEnd + 1);

// Now let's look for the next line after the password block
for (let i = passwordBlockEnd; i < passwordBlockEnd + 5; i++) {
  console.log('Line', i + 1, ':', JSON.stringify(lines[i]));
}

// New content to insert BETWEEN the `<>` fragment and the teacher image section
const tabsAndContent = `
                  {manageTarget.type === 'teacher' && (
                    <div style={{ display: "flex", gap: "5px", marginBottom: "20px", borderBottom: "2px solid #E8EDEC", paddingBottom: "10px", overflowX: "auto" }}>
                      <button onClick={() => setManageTargetTab('stats')} style={{ padding: "8px 14px", border: "none", borderRadius: "8px", background: manageTargetTab === 'stats' ? "#12453D" : "#F4F7F6", color: manageTargetTab === 'stats' ? "#fff" : "#8A9E99", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem", whiteSpace: "nowrap", transition: "all 0.2s" }}>📊 الإحصائيات</button>
                      <button onClick={() => setManageTargetTab('videos')} style={{ padding: "8px 14px", border: "none", borderRadius: "8px", background: manageTargetTab === 'videos' ? "#12453D" : "#F4F7F6", color: manageTargetTab === 'videos' ? "#fff" : "#8A9E99", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem", whiteSpace: "nowrap", transition: "all 0.2s" }}>🎥 المحاضرات</button>
                      <button onClick={() => { setChatInitialTeacherId(manageTarget.data.id || manageTarget.data.uid); setActiveTab("groups"); setManageTarget(null); }} style={{ padding: "8px 14px", border: "none", borderRadius: "8px", background: "#F4F7F6", color: "#8A9E99", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem", whiteSpace: "nowrap", transition: "all 0.2s" }}>💬 الدردشة</button>
                      <button onClick={() => setManageTargetTab('settings')} style={{ padding: "8px 14px", border: "none", borderRadius: "8px", background: manageTargetTab === 'settings' ? "#12453D" : "#F4F7F6", color: manageTargetTab === 'settings' ? "#fff" : "#8A9E99", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem", whiteSpace: "nowrap", transition: "all 0.2s" }}>⚙️ الإعدادات</button>
                    </div>
                  )}

                  {manageTarget.type === 'teacher' && manageTargetTab === 'stats' && (() => {
                     const teacherId = manageTarget.data.id || manageTarget.data.uid;
                     const teacherVideos = videos.filter((v: any) => v.teacherId === teacherId);
                     const teacherPlaylistsCount = new Set(teacherVideos.map((v: any) => v.playlistName).filter(Boolean)).size;
                     const subscribedStudents = students.filter((s: any) => {
                       if (!s.subscription) return false;
                       if (s.subscription.type === 'all') return true;
                       if (s.subscription.allowedTeachers && Array.isArray(s.subscription.allowedTeachers)) {
                         return s.subscription.allowedTeachers.includes(teacherId);
                       }
                       if (s.subject === manageTarget.data.subject) return true;
                       return false;
                     }).length;
                     
                     return (
                       <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                          <div style={{ background: "linear-gradient(135deg, #F0FFF4 0%, #E8F5E9 100%)", padding: "20px 15px", borderRadius: "12px", textAlign: "center", border: "1px solid #C8E6C9" }}>
                            <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#12453D" }}>{subscribedStudents}</div>
                            <div style={{ fontSize: "0.8rem", color: "#8A9E99", marginTop: "4px" }}>طالب مشترك</div>
                          </div>
                          <div style={{ background: "linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%)", padding: "20px 15px", borderRadius: "12px", textAlign: "center", border: "1px solid #FFE082" }}>
                            <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#E3A736" }}>{teacherVideos.length}</div>
                            <div style={{ fontSize: "0.8rem", color: "#8A9E99", marginTop: "4px" }}>محاضرة مرفوعة</div>
                          </div>
                          <div style={{ background: "linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)", padding: "20px 15px", borderRadius: "12px", textAlign: "center", gridColumn: "1 / -1", border: "1px solid #90CAF9" }}>
                            <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#1565C0" }}>{teacherPlaylistsCount}</div>
                            <div style={{ fontSize: "0.8rem", color: "#8A9E99", marginTop: "4px" }}>قائمة تشغيل</div>
                          </div>
                       </div>
                     );
                  })()}

                  {manageTarget.type === 'teacher' && manageTargetTab === 'videos' && (() => {
                     const teacherId = manageTarget.data.id || manageTarget.data.uid;
                     const teacherVideos = videos.filter((v: any) => v.teacherId === teacherId && (v.status === "accepted" || v.status === "active" || !v.status));
                     if (teacherVideos.length === 0) return <div style={{ textAlign: "center", padding: "30px", color: "#8A9E99", background: "#F9FAFA", borderRadius: "12px", marginBottom: "20px" }}>🎥 لا توجد محاضرات مرفوعة لهذا المعلم.</div>;
                     
                     return (
                       <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px", paddingRight: "5px" }}>
                          {teacherVideos.map((v: any) => (
                             <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F4F7F6", padding: "12px 14px", borderRadius: "10px", border: "1px solid #E8EDEC" }}>
                               <div style={{ flex: 1 }}>
                                 <h5 style={{ margin: "0 0 4px 0", color: "#12453D", fontSize: "0.9rem" }}>{v.title}</h5>
                                 <div style={{ fontSize: "0.75rem", color: "#8A9E99" }}>{v.playlistName || 'بدون قائمة'} • {v.subject || 'عام'}</div>
                               </div>
                               <button onClick={() => handleDeleteVideo(v.id)} style={{ background: "rgba(255,59,48,0.1)", border: "none", color: "#FF3B30", cursor: "pointer", padding: "6px", borderRadius: "6px" }} title="حذف الفيديو"><Trash2 size={16} /></button>
                             </div>
                          ))}
                       </div>
                     );
                  })()}

                  {((manageTarget.type === 'teacher' && manageTargetTab === 'settings') || manageTarget.type === 'student') && (
                    <>`;

// Now I need to:
// 1. Insert tabs + stats + videos AFTER the `<>` line (fragIdx)
// 2. Wrap the teacher image upload + username/password in `{((... settings) ...) && ( <> ... </> )}`
// 3. Close the wrapper after the password block

// The teacher image starts at teacherImgIdx. I need to replace from teacherImgIdx to passwordBlockEnd
// with: wrapped version

// Find the exact end of the password/username block (the </div> that closes the main container)
let mainDivEnd = -1;
for (let i = passwordBlockEnd - 5; i < passwordBlockEnd + 10; i++) {
  // Look for `</div>` line after password stuff
  if (lines[i] && lines[i].trim() === '</div>' && i > passwordBlockEnd - 3) {
    mainDivEnd = i;
    break;
  }
}

// Actually let me just find the exact structure more carefully
// After the password section, we have:
// )}
// </div>
// Then empty line, then student section

// Let me search for the closing sequence
let blockEndLine = -1;
for (let i = teacherImgIdx; i < teacherImgIdx + 40; i++) {
  const trimmed = lines[i] ? lines[i].trim() : '';
  // The block: marginBottom: "20px" }}>  ...username... ...password... </div> </div>
  // Look for the closing `</div>` of the background div, then the next line
  if (trimmed === '</div>' && lines[i-1] && lines[i-1].trim() === ')}' && lines[i-2] && lines[i-2].trim() === '</div>') {
    blockEndLine = i;
    break;
  }
}

// Alternative: find by looking for the student device section
const studentSectionIdx = lines.findIndex((l, i) => i > teacherImgIdx && l.includes("manageTarget.type === 'student' && (") && lines[i+1] && lines[i+1].includes('rgba(18, 69, 61'));
console.log('Student section starts at line:', studentSectionIdx + 1);
console.log('blockEndLine:', blockEndLine + 1);

// The block to wrap goes from teacherImgIdx to (studentSectionIdx - 1)
// But we need to be more precise. Let me find the empty line before the student section
let wrapEndIdx = studentSectionIdx - 1;
while (wrapEndIdx > 0 && lines[wrapEndIdx].trim() === '') {
  wrapEndIdx--;
}
console.log('Wrap end at line:', wrapEndIdx + 1, lines[wrapEndIdx].trim());

// Now build the new lines array
const newLines = [];

// Copy everything up to and including the `<>` line
for (let i = 0; i <= fragIdx; i++) {
  newLines.push(lines[i]);
}

// Insert the tabs + stats + videos + settings wrapper opener
tabsAndContent.split('\n').forEach(l => newLines.push(l));

// Now copy from teacherImgIdx to wrapEndIdx (the existing teacher image + username/password block)
// But we need to REPLACE the teacher block condition. Currently it's:
//   {manageTarget.type === 'teacher' && (
//     <div className="form-group">...
// We want to keep this content but it's now inside our wrapper
for (let i = teacherImgIdx; i <= wrapEndIdx; i++) {
  newLines.push(lines[i]);
}

// Close the settings wrapper: </> and )}
newLines.push('                    </>');
newLines.push('                  )}');

// Now copy the rest from studentSectionIdx onwards
for (let i = studentSectionIdx; i < lines.length; i++) {
  newLines.push(lines[i]);
}

content = newLines.join('\n');
fs.writeFileSync(path, content, 'utf8');
console.log('Patch 5 done! Total lines:', newLines.length);
