const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Add missing lucide-react icons
if (!content.includes('Trash2')) {
  content = content.replace('Users,', 'Users,\n    Trash2,\n    Edit2,\n    Save,');
}

// Add deleteDoc and updateDoc to firestore imports
if (!content.includes('deleteDoc')) {
  content = content.replace('setDoc } from "firebase/firestore";', 'setDoc, deleteDoc, updateDoc } from "firebase/firestore";');
}

// Add states for edit mode
const stateAdd = `
  const [manageTarget, setManageTarget] = useState<{ type: 'student' | 'teacher', data: any } | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: "", subject: "" });
  const [isSavingUser, setIsSavingUser] = useState(false);

  const handleEditUserToggle = () => {
    if (manageTarget) {
      setEditFormData({
        name: manageTarget.data.name || "",
        subject: manageTarget.data.subject || ""
      });
      setIsEditingUser(true);
    }
  };

  const handleUpdateTargetUser = async (e) => {
    e.preventDefault();
    if (!manageTarget) return;
    setIsSavingUser(true);
    try {
      const collectionName = manageTarget.type === 'student' ? 'students' : 'teachers';
      const userRef = doc(db, collectionName, manageTarget.data.id || manageTarget.data.uid);
      await updateDoc(userRef, {
        name: editFormData.name,
        ...(manageTarget.type === 'teacher' ? { subject: editFormData.subject } : {})
      });
      
      setManageTarget({
        ...manageTarget,
        data: { ...manageTarget.data, name: editFormData.name, subject: editFormData.subject }
      });
      setIsEditingUser(false);
    } catch (err) {
      alert("خطأ في التحديث: " + err.message);
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleDeleteTargetUser = async () => {
    if (!manageTarget) return;
    if (!window.confirm("هل أنت متأكد من رغبتك في حذف هذا المستخدم نهائياً؟ لا يمكن التراجع عن هذا الإجراء.")) return;
    
    setIsSavingUser(true);
    try {
      const collectionName = manageTarget.type === 'student' ? 'students' : 'teachers';
      const userRef = doc(db, collectionName, manageTarget.data.id || manageTarget.data.uid);
      await deleteDoc(userRef);
      
      setManageTarget(null);
      setIsEditingUser(false);
      setShowQR(false);
    } catch (err) {
      alert("خطأ في الحذف: " + err.message);
    } finally {
      setIsSavingUser(false);
    }
  };
`;

// Replace existing manageTarget state declaration
content = content.replace(
  /const \[manageTarget, setManageTarget\] = useState.*?null\);\s*const \[showQR, setShowQR\] = useState\(false\);/,
  stateAdd.trim()
);

// Replace the modal render block
const targetModalRegex = /\{\/\* Target Manage \/ QR Code Modal \*\/\}.*?(?=\{\/\* Custom Add Add Video Modal|\}\s*<\/div>\s*\);\s*\})/s;

const newModal = `{/* Target Manage / QR Code Modal */}
      {manageTarget && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <motion.div
            className="modal-content glass-card"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            style={{ maxWidth: "450px" }}
          >
            <div className="modal-header">
              <h3 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {manageTarget.type === 'student' ? <GraduationCap size={20} color="#12453D"/> : <BookOpen size={20} color="#12453D"/>}
                إدارة {manageTarget.type === 'student' ? 'الطالب' : 'المعلم'}
              </h3>
              <button
                className="close-modal-btn"
                onClick={() => { setManageTarget(null); setShowQR(false); setIsEditingUser(false); }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: "0 24px 24px" }}>
              <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
                <div style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "12px",
                  background: manageTarget.data.color || "#12453D",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  overflow: "hidden"
                }}>
                  {manageTarget.data.image ? (
                     <img src={manageTarget.data.image} alt="User" style={{ width: "100%", height: "100%", objectFit: "cover"}} />
                  ) : (
                    manageTarget.data.avatar || manageTarget.data.name?.charAt(0) || "U"
                  )}
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <h3 style={{ margin: "0 0 5px 0" }}>{manageTarget.data.name}</h3>
                  <span style={{ fontSize: "0.85rem", color: "#8A9E99" }}>
                    {manageTarget.type === 'student' ? 'طالب - ' + (manageTarget.data.subject || 'عام') : 'معلم - ' + manageTarget.data.subject}
                  </span>
                </div>
              </div>

              {!isEditingUser ? (
                <>
                  <div style={{ background: "rgba(255,255,255,0.05)", padding: "16px", borderRadius: "12px", marginBottom: "20px" }}>
                    <div style={{ marginBottom: "10px", display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#8A9E99", fontSize: "0.9rem" }}>البريد الإلكتروني</span>
                      <strong>{manageTarget.data.email || 'غير متوفر'}</strong>
                    </div>
                    {manageTarget.data.password && (
                      <div style={{ marginBottom: "0", display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#8A9E99", fontSize: "0.9rem" }}>كلمة المرور المؤقتة</span>
                        <strong style={{ fontFamily: "monospace" }}>{manageTarget.data.password}</strong>
                      </div>
                    )}
                  </div>
                  
                  <div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
                    <button 
                      className="btn-secondary" 
                      style={{ flex: 1, display: "flex", justifyContent: "center", gap: "8px", alignItems: "center" }}
                      onClick={handleEditUserToggle}
                    >
                      <Edit2 size={16} />
                      تعديل البيانات
                    </button>
                    <button 
                      style={{ flex: 1, display: "flex", justifyContent: "center", gap: "8px", alignItems: "center", background: "rgba(255, 59, 48, 0.1)", color: "#FF3B30", border: "1px solid rgba(255, 59, 48, 0.3)", borderRadius: "8px", cursor: "pointer", padding: "10px", fontWeight: "600" }}
                      onClick={handleDeleteTargetUser}
                      disabled={isSavingUser}
                    >
                      <Trash2 size={16} />
                      {isSavingUser ? "..." : "حذف الحساب"}
                    </button>
                  </div>

                  <div style={{ textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "20px" }}>
                    {manageTarget.data.email && manageTarget.data.password ? (      
                      <>
                        {!showQR ? (
                          <button 
                            className="btn-primary" 
                            style={{ width: "100%" }}
                            onClick={() => setShowQR(true)}
                          >
                            عرض رمز الاستجابة السريعة (QR Code) الدخول
                          </button>
                        ) : (
                          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                            <h4 style={{ marginBottom: "16px" }}>رمز الدخول (QR Code)</h4>
                            <div style={{ display: "inline-block", background: "#fff", padding: "12px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                              <img
                                src={\`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=\${encodeURIComponent(manageTarget.data.email + '|' + manageTarget.data.password)}\`}
                                alt="QR Code"
                                style={{ width: "180px", height: "180px", display: "block" }}
                              />
                            </div>
                            <p style={{ fontSize: "0.85rem", color: "#8A9E99", marginTop: "16px", lineHeight: "1.5" }}>
                              للتسجيل مباشرة دون الحاجة لكتابة البريد الإلكتروني وكلمة المرور.
                            </p>
                            <button
                              className="btn-secondary"
                              style={{ marginTop: "12px", width: "100%" }}
                              onClick={() => window.print()}
                            >
                              طباعة الرمز
                            </button>
                          </motion.div>
                        )}
                      </>
                    ) : (
                      <div style={{ color: "#E3A736", background: "rgba(227, 167, 54, 0.1)", padding: "12px", borderRadius: "8px", fontSize: "0.9rem" }}>
                        لا يمكن توليد رمز استجابة سريعة، تنقص بيانات الدخول أو كلمة المرور المؤقتة.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <form onSubmit={handleUpdateTargetUser} className="modal-form">
                  <div className="form-group">
                    <label>الاسم الكامل</label>
                    <input 
                      type="text" 
                      value={editFormData.name} 
                      onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                      required
                    />
                  </div>
                  {manageTarget.type === 'teacher' && (
                    <div className="form-group">
                      <label>المادة (التخصص)</label>
                      <input 
                        type="text" 
                        value={editFormData.subject} 
                        onChange={e => setEditFormData({ ...editFormData, subject: e.target.value })}
                        required
                      />
                    </div>
                  )}
                  <p style={{ fontSize: "0.8rem", color: "#8A9E99", marginBottom: "20px" }}>
                    ملاحظة: لتغيير البريد الإلكتروني أو كلمة المرور بشكل كامل يجب استخدام لوحة تحكم Firebase Auth للحفاظ على أمان المنصة.
                  </p>
                  <div className="modal-actions" style={{ marginTop: "10px" }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setIsEditingUser(false)}
                      disabled={isSavingUser}
                    >
                      إلغاء التعديل
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}
                      disabled={isSavingUser}
                    >
                      <Save size={16} />
                      {isSavingUser ? "جاري الحفظ..." : "حفظ التغييرات"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}`;

content = content.replace(targetModalRegex, newModal + '\n\n');

fs.writeFileSync('src/App.tsx', content);
