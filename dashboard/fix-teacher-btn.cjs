const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `                        <td style={{ fontWeight: 600 }}>{t.subject}</td>
                        <td>{t.createdAt ? new Date(t.createdAt).toLocaleDateString('ar-EG') : '—'}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={3} style={{ textAlign: "center", padding: "40px", color: "#8A9E99" }}>لا يوجد معلمين مسجلين.</td>`;

const replaceStr = `                        <td style={{ fontWeight: 600 }}>{t.subject}</td>
                        <td>{t.createdAt ? new Date(t.createdAt).toLocaleDateString('ar-EG') : '—'}</td>
                        <td>
                          <button className="btn-secondary" style={{ padding: "4px 8px", fontSize: "0.8rem", width: "auto" }} onClick={() => { setManageTarget({ type: 'teacher', data: t }); setShowQR(false); setIsEditingUser(false); }}>إدارة</button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", padding: "40px", color: "#8A9E99" }}>لا يوجد معلمين مسجلين.</td>`;

// Also check for the student table to ensure `setIsEditingUser(false)` is set on the student button too.
const studentStr = `onClick={() => { setManageTarget({ type: 'student', data: s }); setShowQR(false); }}`;
const studentNew = `onClick={() => { setManageTarget({ type: 'student', data: s }); setShowQR(false); setIsEditingUser(false); }}`;

content = content.replace(targetStr, replaceStr);
content = content.replace(studentStr, studentNew);

fs.writeFileSync('src/App.tsx', content);
