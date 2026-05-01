const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldStr = `              <div style={{ textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "20px" }}>
                {manageTarget.data.email && manageTarget.data.password ? (
                  <>
                    <h4 style={{ marginBottom: "16px" }}>رمز الاستجابة السريعة (QR Code)</h4>
                    <img 
                      src={\`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=\${encodeURIComponent(manageTarget.data.email + '|' + manageTarget.data.password)}\`} 
                      alt="QR Code" 
                      style={{ background: "#fff", padding: "10px", borderRadius: "8px", width: "200px", height: "200px" }} 
                    />
                    <p style={{ fontSize: "0.85rem", color: "#8A9E99", marginTop: "16px", lineHeight: "1.5" }}>
                      يمكن للمستخدم مسح هذا الرمز باستخدام الكاميرا في التطبيق لتسجيل الدخول مباشرة ودون الحاجة لإدخال البريد وكلمة المرور.
                    </p>
                    <button 
                      className="btn-primary"
                      style={{ marginTop: "16px" }}
                      onClick={() => window.print()}
                    >
                      طباعة الرمز
                    </button>
                  </>
                ) : (
                  <div style={{ color: "#E3A736" }}>لا يمكن توليد رمز استجابة سريعة، تنقص بعض بيانات الدخول.</div>
                )}
              </div>`;

const newStr = `              <div style={{ textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "20px" }}>
                {manageTarget.data.email && manageTarget.data.password ? (
                  <>
                    {!showQR ? (
                      <button 
                        className="btn-primary" 
                        onClick={() => setShowQR(true)}
                      >
                        عرض رمز الاستجابة السريعة (QR Code)
                      </button>
                    ) : (
                      <>
                        <h4 style={{ marginBottom: "16px" }}>رمز الاستجابة السريعة (QR Code)</h4>
                        <img 
                          src={\`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=\${encodeURIComponent(manageTarget.data.email + '|' + manageTarget.data.password)}\`} 
                          alt="QR Code" 
                          style={{ background: "#fff", padding: "10px", borderRadius: "8px", width: "200px", height: "200px" }} 
                        />
                        <p style={{ fontSize: "0.85rem", color: "#8A9E99", marginTop: "16px", lineHeight: "1.5" }}>
                          يمكن للمستخدم مسح هذا الرمز باستخدام الكاميرا في التطبيق لتسجيل الدخول مباشرة ودون الحاجة لإدخال البريد وكلمة المرور.
                        </p>
                        <button 
                          className="btn-secondary"
                          style={{ marginTop: "16px" }}
                          onClick={() => window.print()}
                        >
                          طباعة الرمز
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <div style={{ color: "#E3A736" }}>لا يمكن توليد رمز استجابة سريعة، تنقص بعض بيانات الدخول.</div>
                )}
              </div>`;

if(content.includes(oldStr)) {
  content = content.replace(oldStr, newStr);
  fs.writeFileSync('src/App.tsx', content);
  console.log("Success exact map");
} else {
  console.log("Not found exact, trying to regex it");
  content = content.replace(/<div style={{ textAlign: "center", borderTop: "1px solid rgba\(255,255,255,0\.1\)", paddingTop: "20px" }}>[\s\S]*?لا يمكن توليد رمز استجابة سريعة، تنقص بعض بيانات الدخول\.<\/div>\s*<\/div>\s*}/g, newStr + '\n                }');
  fs.writeFileSync('src/App.tsx', content);
  console.log("Used Regex Regex regex");
}
