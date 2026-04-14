const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const insertionPoint = `          ) : activeTab === "notifications" ? (`;

const newContent = `          ) : activeTab === "settings" ? (
            <motion.div className="panel-card glass-card" {...fadeUp(0.1)} style={{ padding: "40px", minHeight: "70vh" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
                <h2>الإعدادات والمواد الدراسية</h2>
                <button 
                  onClick={async () => {
                    const { signOut } = await import("firebase/auth");
                    try {
                      await signOut(auth);
                      sessionStorage.removeItem('dashboard_auth');
                      setIsAuthenticated(false);
                    } catch(e) {}
                  }}
                  style={{
                    background: "#EF4444", color: "white", padding: "10px 20px", borderRadius: "10px", 
                    border: "none", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px"
                  }}
                >
                  <LogOut size={18} />
                  تسجيل الخروج
                </button>
              </div>

              <div style={{ background: "#F9FAFB", padding: "20px", borderRadius: "16px", marginBottom: "30px", border: "1px solid #E5E7EB" }}>
                <h3>إضافة مادة جديدة</h3>
                <form onSubmit={handleAddSubject} style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
                  <input 
                    type="text" 
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    placeholder="اسم المادة (مثال: رياضيات، فيزياء)"
                    style={{ flex: 1, padding: "12px 16px", borderRadius: "8px", border: "1px solid #D1D5DB", outline: "none" }}
                    required
                  />
                  <button type="submit" style={{ padding: "12px 24px", background: "#3B82F6", color: "white", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold" }}>
                    إضافة
                  </button>
                </form>
              </div>

              <h3>المواد الحالية ({subjects?.length || 0})</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "15px", marginTop: "15px" }}>
                {subjects?.map(sub => (
                  <div key={sub.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "white", padding: "15px", borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 2px 5px rgba(0,0,0,0.02)" }}>
                    {editingSubject?.id === sub.id ? (
                      <div style={{ display: "flex", width: "100%", gap: "8px" }}>
                        <input 
                          autoFocus
                          value={editingSubject.name} 
                          onChange={(e) => setEditingSubject({...editingSubject, name: e.target.value})}
                          style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "1px solid #3B82F6" }}
                        />
                        <button onClick={() => { handleUpdateSubject(sub.id, editingSubject.name); setEditingSubject(null); }} style={{ background: "#10B981", color: "white", border: "none", padding: "8px", borderRadius: "6px", cursor: "pointer" }}>
                          <Check size={16} />
                        </button>
                        <button onClick={() => setEditingSubject(null)} style={{ background: "#9CA3AF", color: "white", border: "none", padding: "8px", borderRadius: "6px", cursor: "pointer" }}>
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span style={{ fontWeight: "600", fontSize: "1.05rem" }}>{sub.name}</span>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button onClick={() => setEditingSubject({id: sub.id, name: sub.name})} style={{ background: "#EFF6FF", color: "#3B82F6", border: "none", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center" }}>
                            <Edit3 size={16} />
                          </button>
                          <button onClick={() => handleDeleteSubject(sub.id)} style={{ background: "#FEF2F2", color: "#EF4444", border: "none", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center" }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          ) : activeTab === "notifications" ? (`

content = content.replace(insertionPoint, newContent);
content = content.replace(/XCircle,/, 'XCircle, LogOut, Edit3, Trash2, Check, X,');

fs.writeFileSync('src/App.tsx', content);
