const fs = require('fs');
let code = fs.readFileSync('dashboard/src/App.tsx', 'utf8');

const manageModal = `
      {manageTarget && (
        <div className="modal-overlay">
          <motion.div
            className="modal-content glass-card"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{ textAlign: 'center', width: 400 }}
            id="manage-modal-content"
          >
            <div className="modal-header">
              <h3>إدارة الحساب</h3>
              <button className="close-modal-btn" onClick={() => setManageTarget(null)}><X size={20} /></button>
            </div>
            
            <div style={{ padding: "20px 0" }}>
              <div style={{ width: 80, height: 80, margin: "0 auto", background: manageTarget.data.color || "#12453D", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", color: "#fff", fontSize: 32, fontWeight: "bold" }}>
                {manageTarget.data.avatar || manageTarget.data.name.charAt(0)}
              </div>
              <h2 style={{ marginTop: 15, marginBottom: 5 }}>{manageTarget.data.name}</h2>
              <p style={{ color: "#8A9E99" }}>{manageTarget.data.email}</p>
              
              <div style={{ marginTop: 30, padding: 20, background: "#f8f9fa", borderRadius: 12 }}>
                <p style={{ marginBottom: 10, fontWeight: 600 }}>رمز الدخول (Barcode)</p>
                <img 
                  src={\`https://barcode.tec-it.com/barcode.ashx?data=\${encodeURIComponent(manageTarget.data.email + '|' + (manageTarget.data.password || '123456'))}&code=Code128&translate-esc=on\`} 
                  alt="Barcode" 
                  style={{ width: "100%", maxHeight: 80, objectFit: "contain", marginBottom: 10 }}
                />
                
                <p style={{ fontSize: "0.8rem", color: "#666" }}>
                  {manageTarget.data.password 
                    ? "هذا الرمز يتضمن كلمة المرور. يمكن للطالب استخدامه لتسجيل الدخول." 
                    : "تم وضع كلمة مرور افتراضية (123456) لهذا الرمز نظرًا لعدم توفرها."}
                </p>
              </div>
              
              <div className="modal-actions" style={{ marginTop: 20 }}>
                <button type="button" className="btn-secondary" onClick={() => setManageTarget(null)}>إغلاق</button>
                <button type="button" className="btn-primary" onClick={() => {
                  const printContents = document.getElementById('manage-modal-content').innerHTML;
                  const originalContents = document.body.innerHTML;
                  document.title = 'بطاقة تسجيل الدخول - ' + manageTarget.data.name;
                  document.body.innerHTML = '<div style="direction: rtl; text-align: center; margin-top: 50px;">' + printContents + '</div>';
                  document.querySelector('.modal-actions').style.display = 'none';
                  document.querySelector('.close-modal-btn').style.display = 'none';
                  window.print();
                  location.reload();
                }}>
                  طباعة الرمز
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
`;

code = code.replace("      {/* Add Specific Modals based on active tab */}", manageModal + "\n      {/* Add Specific Modals based on active tab */}");
fs.writeFileSync('dashboard/src/App.tsx', code);
