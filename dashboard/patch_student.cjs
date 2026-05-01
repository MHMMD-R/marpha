const fs = require('fs');
const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

// ═══════════════════════════════════════════════════════════════
// STEP 1: Find the student modal content start
// The student content starts after the teacher tabs/stats/videos sections
// We need to find where `{manageTarget.type === 'student' && (` starts 
// for the device binding section, and everything before the action buttons.
// ═══════════════════════════════════════════════════════════════

// Find: `{manageTarget.type === 'student' && (` for device binding (line ~2445)
let studentDeviceIdx = -1;
for (let i = 2440; i < 2500; i++) {
  if (lines[i] && lines[i].includes("manageTarget.type === 'student' && (") && lines[i+1] && lines[i+1].includes('rgba(18, 69, 61')) {
    studentDeviceIdx = i;
    break;
  }
}
console.log('Student device section at:', studentDeviceIdx + 1);

// Find the closing of the device section: `)}` after the device binding
let studentDeviceEnd = -1;
for (let i = studentDeviceIdx; i < studentDeviceIdx + 60; i++) {
  if (lines[i] && lines[i].trim() === ')}' && lines[i-1] && lines[i-1].trim() === '</div>') {
    // Check if the next line is empty or starts action buttons
    if (lines[i+1] && (lines[i+1].trim() === '' || lines[i+1].trim() === '')) {
      studentDeviceEnd = i;
      break;
    }
  }
}
console.log('Student device end at:', studentDeviceEnd + 1);

// Find where the settings/student conditional action buttons start
let actionBtnIdx = -1;
for (let i = studentDeviceEnd; i < studentDeviceEnd + 10; i++) {
  if (lines[i] && lines[i].includes("manageTargetTab === 'settings'") && lines[i].includes('manageTarget.type === \'student\'')) {
    actionBtnIdx = i;
    break;
  }
}
console.log('Action buttons at:', actionBtnIdx + 1);

// ═══════════════════════════════════════════════════════════════
// STEP 2: Build the new student content
// We'll add tabs + stats + subscription management + keep device binding
// ═══════════════════════════════════════════════════════════════

const studentTabs = `
                  {manageTarget.type === 'student' && (
                    <div style={{ display: "flex", gap: "5px", marginBottom: "20px", borderBottom: "2px solid #E8EDEC", paddingBottom: "10px", overflowX: "auto" }}>
                      <button onClick={() => setManageTargetTab('stats')} style={{ padding: "8px 14px", border: "none", borderRadius: "8px", background: manageTargetTab === 'stats' ? "#12453D" : "#F4F7F6", color: manageTargetTab === 'stats' ? "#fff" : "#8A9E99", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem", whiteSpace: "nowrap", transition: "all 0.2s" }}>📊 الإحصائيات</button>
                      <button onClick={() => setManageTargetTab('videos')} style={{ padding: "8px 14px", border: "none", borderRadius: "8px", background: manageTargetTab === 'videos' ? "#12453D" : "#F4F7F6", color: manageTargetTab === 'videos' ? "#fff" : "#8A9E99", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem", whiteSpace: "nowrap", transition: "all 0.2s" }}>📋 الاشتراك</button>
                      <button onClick={() => setManageTargetTab('settings')} style={{ padding: "8px 14px", border: "none", borderRadius: "8px", background: manageTargetTab === 'settings' ? "#12453D" : "#F4F7F6", color: manageTargetTab === 'settings' ? "#fff" : "#8A9E99", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem", whiteSpace: "nowrap", transition: "all 0.2s" }}>⚙️ الإعدادات</button>
                    </div>
                  )}

                  {manageTarget.type === 'student' && manageTargetTab === 'stats' && (() => {
                     const sub = manageTarget.data.subscription || { type: 'none' };
                     const ft = manageTarget.data.freeTrial || {};
                     const isSubActive = sub.endDate ? new Date() < new Date(sub.endDate) : sub.type === 'full';
                     const isFreeTrialActive = ft.isActive && ft.endDate && new Date() < new Date(ft.endDate);
                     const subStatus = isSubActive ? '✅ مشترك فعال' : isFreeTrialActive ? '🎁 تجربة مجانية' : '❌ غير مشترك';
                     const subColor = isSubActive ? '#34C759' : isFreeTrialActive ? '#E3A736' : '#FF3B30';
                     
                     let remainingDays = 0;
                     if (sub.endDate) {
                       remainingDays = Math.max(0, Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / (1000*60*60*24)));
                     } else if (isFreeTrialActive && ft.endDate) {
                       remainingDays = Math.max(0, Math.ceil((new Date(ft.endDate).getTime() - Date.now()) / (1000*60*60*24)));
                     }

                     const createdAt = manageTarget.data.createdAt ? new Date(manageTarget.data.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : 'غير متوفر';
                     
                     return (
                       <div style={{ marginBottom: "20px" }}>
                          {/* Subscription Status Banner */}
                          <div style={{ background: subColor + '15', padding: "16px", borderRadius: "14px", marginBottom: "14px", border: "1px solid " + subColor + "30", textAlign: "center" }}>
                            <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: subColor, marginBottom: "4px" }}>{subStatus}</div>
                            {remainingDays > 0 && <div style={{ fontSize: "0.8rem", color: "#8A9E99" }}>متبقي {remainingDays} يوم</div>}
                          </div>

                          {/* Stats Grid */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
                            <div style={{ background: "linear-gradient(135deg, #F0FFF4, #E8F5E9)", padding: "14px 10px", borderRadius: "12px", textAlign: "center", border: "1px solid #C8E6C9" }}>
                              <div style={{ fontSize: "1.3rem", fontWeight: "bold", color: "#12453D" }}>{manageTarget.data.userId || '---'}</div>
                              <div style={{ fontSize: "0.75rem", color: "#8A9E99" }}>رقم الطالب</div>
                            </div>
                            <div style={{ background: "linear-gradient(135deg, #E3F2FD, #BBDEFB)", padding: "14px 10px", borderRadius: "12px", textAlign: "center", border: "1px solid #90CAF9" }}>
                              <div style={{ fontSize: "1.3rem", fontWeight: "bold", color: "#1565C0" }}>{manageTarget.data.progress || 0}%</div>
                              <div style={{ fontSize: "0.75rem", color: "#8A9E99" }}>التقدم</div>
                            </div>
                          </div>

                          {/* Detail Rows */}
                          <div style={{ background: "#F9FAFA", padding: "14px", borderRadius: "12px", border: "1px solid #E8EDEC" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                              <span style={{ color: "#8A9E99", fontSize: "0.85rem" }}>تاريخ الإنشاء</span>
                              <strong style={{ fontSize: "0.85rem" }}>{createdAt}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                              <span style={{ color: "#8A9E99", fontSize: "0.85rem" }}>نوع الاشتراك</span>
                              <strong style={{ fontSize: "0.85rem" }}>{sub.type === 'full' ? 'كامل' : sub.type === 'none' ? 'بدون اشتراك' : sub.type}</strong>
                            </div>
                            {sub.startDate && (
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                                <span style={{ color: "#8A9E99", fontSize: "0.85rem" }}>بداية الاشتراك</span>
                                <strong style={{ fontSize: "0.85rem" }}>{new Date(sub.startDate).toLocaleDateString('ar-EG')}</strong>
                              </div>
                            )}
                            {sub.endDate && (
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                                <span style={{ color: "#8A9E99", fontSize: "0.85rem" }}>نهاية الاشتراك</span>
                                <strong style={{ fontSize: "0.85rem", color: remainingDays <= 3 ? '#FF3B30' : 'inherit' }}>{new Date(sub.endDate).toLocaleDateString('ar-EG')}</strong>
                              </div>
                            )}
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                              <span style={{ color: "#8A9E99", fontSize: "0.85rem" }}>الجهاز</span>
                              <strong style={{ fontSize: "0.85rem" }}>{manageTarget.data.boundDeviceId ? (manageTarget.data.boundDeviceOS || 'مربوط') : 'غير مربوط'}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "#8A9E99", fontSize: "0.85rem" }}>تغييرات الجهاز</span>
                              <strong style={{ fontSize: "0.85rem", color: (manageTarget.data.deviceChangeCount || 0) >= 3 ? "#FF3B30" : "inherit" }}>{manageTarget.data.deviceChangeCount || 0}</strong>
                            </div>
                          </div>
                       </div>
                     );
                  })()}

                  {manageTarget.type === 'student' && manageTargetTab === 'videos' && (() => {
                     const sub = manageTarget.data.subscription || { type: 'none' };
                     const studentId = manageTarget.data.id || manageTarget.data.uid;
                     return (
                       <div style={{ marginBottom: "20px" }}>
                          {/* Quick Subscribe */}
                          <div style={{ background: "#F9FAFA", padding: "16px", borderRadius: "14px", marginBottom: "14px", border: "1px solid #E8EDEC" }}>
                            <h4 style={{ margin: "0 0 12px 0", fontSize: "0.9rem", color: "#12453D" }}>⚡ إدارة الاشتراك</h4>
                            
                            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                              <button 
                                onClick={async () => {
                                  const days = prompt('عدد أيام الاشتراك:');
                                  if (!days) return;
                                  const endDate = new Date(); endDate.setDate(endDate.getDate() + parseInt(days));
                                  const subData = { type: 'full', startDate: new Date().toISOString(), endDate: endDate.toISOString(), allowedTeachers: teachers.map((t: any) => t.id || t.uid), allowedSubjects: [] };
                                  try {
                                    const { doc: d, updateDoc: u } = await import('firebase/firestore');
                                    await u(d(db, 'students', studentId), { subscription: subData });
                                    setManageTarget({ ...manageTarget, data: { ...manageTarget.data, subscription: subData } });
                                    alert('تم تفعيل الاشتراك بنجاح ✅');
                                  } catch(e: any) { alert('خطأ: ' + e.message); }
                                }}
                                style={{ flex: 1, padding: "10px", background: "#12453D", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem" }}
                              >✅ تفعيل اشتراك</button>
                              <button
                                onClick={async () => {
                                  if (!confirm('هل أنت متأكد من إلغاء اشتراك هذا الطالب؟')) return;
                                  const subData = { type: 'none', allowedTeachers: [], allowedSubjects: [] };
                                  try {
                                    const { doc: d, updateDoc: u } = await import('firebase/firestore');
                                    await u(d(db, 'students', studentId), { subscription: subData });
                                    setManageTarget({ ...manageTarget, data: { ...manageTarget.data, subscription: subData } });
                                    alert('تم إلغاء الاشتراك ✅');
                                  } catch(e: any) { alert('خطأ: ' + e.message); }
                                }}
                                style={{ flex: 1, padding: "10px", background: "rgba(255,59,48,0.1)", color: "#FF3B30", border: "1px solid rgba(255,59,48,0.3)", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem" }}
                              >❌ إلغاء اشتراك</button>
                            </div>

                            {/* Extend existing subscription */}
                            {sub.endDate && (
                              <button
                                onClick={async () => {
                                  const days = prompt('عدد أيام التمديد:');
                                  if (!days) return;
                                  const currentEnd = new Date(sub.endDate) > new Date() ? new Date(sub.endDate) : new Date();
                                  currentEnd.setDate(currentEnd.getDate() + parseInt(days));
                                  const subData = { ...sub, endDate: currentEnd.toISOString() };
                                  try {
                                    const { doc: d, updateDoc: u } = await import('firebase/firestore');
                                    await u(d(db, 'students', studentId), { subscription: subData });
                                    setManageTarget({ ...manageTarget, data: { ...manageTarget.data, subscription: subData } });
                                    alert('تم تمديد الاشتراك بنجاح ✅');
                                  } catch(e: any) { alert('خطأ: ' + e.message); }
                                }}
                                style={{ width: "100%", padding: "10px", background: "#F4F7F6", color: "#12453D", border: "1px solid #E8EDEC", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem" }}
                              >📅 تمديد الاشتراك الحالي</button>
                            )}
                          </div>

                          {/* Select teachers */}
                          <div style={{ background: "#F9FAFA", padding: "16px", borderRadius: "14px", border: "1px solid #E8EDEC" }}>
                            <h4 style={{ margin: "0 0 12px 0", fontSize: "0.9rem", color: "#12453D" }}>🎓 المعلمين المسموح بهم</h4>
                            <div style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                              {teachers.map((t: any) => {
                                const tid = t.id || t.uid;
                                const allowed = sub.allowedTeachers || [];
                                const isAllowed = allowed.includes(tid);
                                return (
                                  <label key={tid} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", background: isAllowed ? "rgba(18,69,61,0.08)" : "#fff", borderRadius: "8px", cursor: "pointer", border: isAllowed ? "1px solid rgba(18,69,61,0.2)" : "1px solid #E8EDEC" }}>
                                    <input type="checkbox" checked={isAllowed} onChange={async () => {
                                      const newAllowed = isAllowed ? allowed.filter((id: string) => id !== tid) : [...allowed, tid];
                                      const subData = { ...sub, allowedTeachers: newAllowed };
                                      try {
                                        const { doc: d, updateDoc: u } = await import('firebase/firestore');
                                        await u(d(db, 'students', studentId), { subscription: subData });
                                        setManageTarget({ ...manageTarget, data: { ...manageTarget.data, subscription: subData } });
                                      } catch(e: any) { alert('خطأ: ' + e.message); }
                                    }} />
                                    <span style={{ fontSize: "0.85rem", fontWeight: isAllowed ? "bold" : "normal", color: "#12453D" }}>{t.name} - {t.subject}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                       </div>
                     );
                  })()}`;

// ═══════════════════════════════════════════════════════════════
// STEP 3: Replace the student section
// Insert the tabs + stats + subscription BEFORE the student device section
// And wrap device section + action buttons in settings tab
// ═══════════════════════════════════════════════════════════════

// We need to:
// 1. Insert student tabs BEFORE the student device section (studentDeviceIdx)
// 2. Wrap the device section with settings tab condition
// 3. The action buttons and QR code already have the settings condition from patch3

// Find the previous line to insert (should be the empty line before student device)
let insertBeforeIdx = studentDeviceIdx;

// Build new content
const newLines = [];

// Copy everything before the student device section
for (let i = 0; i < insertBeforeIdx; i++) {
  newLines.push(lines[i]);
}

// Insert the student tabs + stats + subscription
studentTabs.split('\n').forEach(l => newLines.push(l));

// Now wrap the existing student device section in a settings condition
newLines.push('                  {manageTarget.type === \'student\' && manageTargetTab === \'settings\' && (');
newLines.push('                    <>');

// Copy the device section content (the inner content, not the outer condition)
// The device section is: {manageTarget.type === 'student' && ( ... )}
// We need the content INSIDE the condition, so from studentDeviceIdx+1 to studentDeviceEnd-1
// Actually, the whole block including the condition. Let's just include the inner div
for (let i = studentDeviceIdx + 1; i < studentDeviceEnd; i++) {
  newLines.push(lines[i]);
}

// Close the new wrapper
newLines.push('                    </>');
newLines.push('                  )}');

// Skip past the original student device section closing
let continueIdx = studentDeviceEnd + 1;

// Skip empty lines
while (continueIdx < lines.length && lines[continueIdx].trim() === '') {
  continueIdx++;
}

// Now we need to handle the action buttons section
// The action buttons already have condition: ((teacher && settings) || student)
// We need to change it to: ((teacher && settings) || (student && settings))
// Same for QR section

// Find the action buttons line
for (let i = continueIdx; i < lines.length; i++) {
  if (lines[i] && lines[i].includes("manageTargetTab === 'settings'") && lines[i].includes("|| manageTarget.type === 'student'")) {
    // Replace the condition
    lines[i] = lines[i].replace(
      "|| manageTarget.type === 'student'",
      "|| (manageTarget.type === 'student' && manageTargetTab === 'settings')"
    );
    console.log('Updated action buttons condition at line:', i + 1);
  }
}

// Copy the rest of the file
for (let i = continueIdx; i < lines.length; i++) {
  newLines.push(lines[i]);
}

content = newLines.join('\n');
fs.writeFileSync(path, content, 'utf8');
console.log('Student profile patch done! Total lines:', newLines.length);
