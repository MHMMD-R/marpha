const fs = require('fs');
const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// Target 1: Add Video Modal Form
const formTarget = `              <div className="form-group">
                <label>المادة الدراسية</label>
                <input 
                  type="text" 
                  value={newVideoSubject} 
                  onChange={(e) => setNewVideoSubject(e.target.value)} 
                  placeholder="مثال: الرياضيات"
                  required
                  disabled={isAddingVideo}
                />
              </div>`;

const formReplacement = `              <div className="form-group">
                <label>المعلم (الناشر)</label>
                <select 
                  value={newVideoTeacherId}
                  onChange={(e) => {
                    setNewVideoTeacherId(e.target.value);
                    const selectedT = teachers.find(t => t.uid === e.target.value || t.id === e.target.value);
                    if (selectedT && selectedT.subject) {
                      setNewVideoSubject(selectedT.subject);
                    }
                  }}
                  required
                  disabled={isAddingVideo}
                  style={{ textAlign: "right" }}
                >
                  <option value="" disabled>اختر المعلم...</option>
                  {teachers.map(t => (
                    <option key={t.uid || t.id} value={t.uid || t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>المادة الدراسية</label>
                <input 
                  type="text" 
                  value={newVideoSubject} 
                  onChange={(e) => setNewVideoSubject(e.target.value)} 
                  placeholder="مثال: الرياضيات"
                  required
                  disabled={isAddingVideo}
                />
              </div>
              <div className="form-group">
                <label>قائمة التشغيل (Playlist)</label>
                <select 
                  value={isCreatingNewPlaylist ? "new_playlist_custom" : newVideoPlaylistName}
                  onChange={(e) => {
                    if (e.target.value === "new_playlist_custom") {
                      setIsCreatingNewPlaylist(true);
                      setNewVideoPlaylistName("");
                    } else {
                      setIsCreatingNewPlaylist(false);
                      setNewVideoPlaylistName(e.target.value);
                    }
                  }}
                  disabled={isAddingVideo || !newVideoTeacherId}
                  style={{ textAlign: "right", marginBottom: isCreatingNewPlaylist ? '10px' : '0' }}
                >
                  <option value="">بدون قائمة تشغيل (عام)</option>
                  {newVideoTeacherId && Array.from(new Set(
                    videos
                      .filter(v => (v.teacherId === newVideoTeacherId) && v.playlistName)
                      .map(v => v.playlistName)
                  )).map((pName: string) => (
                    <option key={pName} value={pName}>{pName}</option>
                  ))}
                  <option value="new_playlist_custom" style={{ color: "#E3A736", fontWeight: "bold" }}>+ إنشاء قائمة جديدة</option>
                </select>
                {isCreatingNewPlaylist && (
                  <input
                    type="text"
                    value={newPlaylistInput}
                    onChange={(e) => setNewPlaylistInput(e.target.value)}
                    placeholder="اسم القائمة الجديدة"
                    required={isCreatingNewPlaylist}
                    disabled={isAddingVideo}
                    style={{ marginTop: '10px' }}
                  />
                )}
              </div>`;

content = content.replace(formTarget, formReplacement);
content = content.replace(formTarget.replace(/\n/g, '\r\n'), formReplacement);

// Target 2: Videos view
const headerTarget = `              <div className="panel-header">
                <h3>قائمة المحاضرات</h3>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button className="btn-primary" style={{ padding: "6px 12px", fontSize: "0.85rem" }} onClick={() => setIsAddVideoOpen(true)}>+ رفع فيديو جديد</button>
                  <span className="panel-header-action" onClick={() => setActiveTab("dashboard")}><ChevronLeft size={14} style={{ verticalAlign: "middle" }} /> رجوع</span>
                </div>
              </div>`;

const headerReplacement = `              <div className="panel-header">
                <h3>قائمة المحاضرات</h3>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <div style={{ background: "#E8EDEC", padding: "4px", borderRadius: "8px", display: "flex", gap: "4px" }}>
                    <button onClick={() => setVideosViewMode("all")} style={{ padding: "4px 12px", border: "none", borderRadius: "6px", background: videosViewMode === "all" ? "#fff" : "transparent", color: videosViewMode === "all" ? "#12453D" : "#8A9E99", fontSize: "0.85rem", cursor: "pointer", fontWeight: videosViewMode === "all" ? "bold" : "normal" }}>الكل</button>
                    <button onClick={() => setVideosViewMode("playlists")} style={{ padding: "4px 12px", border: "none", borderRadius: "6px", background: videosViewMode === "playlists" ? "#fff" : "transparent", color: videosViewMode === "playlists" ? "#12453D" : "#8A9E99", fontSize: "0.85rem", cursor: "pointer", fontWeight: videosViewMode === "playlists" ? "bold" : "normal" }}>قوائم التشغيل</button>
                  </div>
                  <button className="btn-primary" style={{ padding: "6px 12px", fontSize: "0.85rem" }} onClick={() => setIsAddVideoOpen(true)}>+ رفع فيديو جديد</button>
                  <span className="panel-header-action" onClick={() => setActiveTab("dashboard")}><ChevronLeft size={14} style={{ verticalAlign: "middle" }} /> رجوع</span>
                </div>
              </div>`;

content = content.replace(headerTarget, headerReplacement);
content = content.replace(headerTarget.replace(/\n/g, '\r\n'), headerReplacement);


const bodyTarget = `              <div className="panel-body">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>عنوان المحاضرة</th>
                      <th>المادة</th>
                      <th>الرابط / الملف</th>
                      <th>تاريخ الإضافة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {videos.filter((v: any) => v.status === "accepted" || v.status === "active" || !v.status).length > 0 ? videos.filter((v: any) => v.status === "accepted" || v.status === "active" || !v.status).map((v, i) => (
                      <tr key={v.id || i}>
                        <td>
                          <div className="table-user">
                            <div className="table-user-avatar" style={{ background: "#E3A736" }}>
                               <Video size={16} color="#fff" />
                            </div>
                            <div className="table-user-info">
                              <h4>{v.title}</h4>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{v.subject || v.duration || 'عام'}</td>
                        <td>
                          {v.videoUrl || v.link ? (
                            <a href={v.videoUrl || v.link} target="_blank" rel="noopener noreferrer" style={{ color: "#3B82F6", textDecoration: "none", fontSize: "0.85rem" }}>عرض الفيديو</a>
                          ) : (
                            <span style={{ fontSize: "0.85rem", color: "#8A9E99" }}>لا يوجد رابط</span>
                          )}
                        </td>
                        <td>{v.createdAt ? new Date(v.createdAt).toLocaleDateString('ar-EG') : '—'}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", padding: "40px", color: "#8A9E99" }}>لا يوجد محاضرات مقبولة أو مسجلة مسبقاً.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>`;

const bodyReplacement = `              <div className="panel-body">
                {videosViewMode === "all" ? (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>عنوان المحاضرة</th>
                        <th>المادة</th>
                        <th>الرابط / الملف</th>
                        <th>تاريخ الإضافة</th>
                        <th>إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {videos.filter((v: any) => v.status === "accepted" || v.status === "active" || !v.status).length > 0 ? videos.filter((v: any) => v.status === "accepted" || v.status === "active" || !v.status).map((v, i) => (
                        <tr key={v.id || i}>
                          <td>
                            <div className="table-user">
                              <div className="table-user-avatar" style={{ background: "#E3A736" }}>
                                 <Video size={16} color="#fff" />
                              </div>
                              <div className="table-user-info">
                                <h4>{v.title}</h4>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontWeight: 600 }}>{v.subject || v.duration || 'عام'}</td>
                          <td>
                            {v.videoUrl || v.link ? (
                              <a href={v.videoUrl || v.link} target="_blank" rel="noopener noreferrer" style={{ color: "#3B82F6", textDecoration: "none", fontSize: "0.85rem" }}>عرض الفيديو</a>
                            ) : (
                              <span style={{ fontSize: "0.85rem", color: "#8A9E99" }}>لا يوجد رابط</span>
                            )}
                          </td>
                          <td>{v.createdAt ? new Date(v.createdAt).toLocaleDateString('ar-EG') : '—'}</td>
                          <td>
                            <button onClick={() => handleDeleteVideo(v.id)} style={{ background: "rgba(255, 59, 48, 0.1)", color: "#FF3B30", border: "none", padding: "6px", borderRadius: "6px", cursor: "pointer" }} title="حذف الفيديو">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} style={{ textAlign: "center", padding: "40px", color: "#8A9E99" }}>لا يوجد محاضرات مقبولة أو مسجلة مسبقاً.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {(() => {
                      const validVids = videos.filter((v: any) => v.status === "accepted" || v.status === "active" || !v.status);
                      const groupMap: Record<string, any[]> = {};
                      validVids.forEach(v => {
                        const key = \`\${v.teacherId || 'unknown'}|\${v.playlistName || 'بدون قائمة'}\`;
                        if (!groupMap[key]) groupMap[key] = [];
                        groupMap[key].push(v);
                      });
                      const groups = Object.entries(groupMap);
                      if (groups.length === 0) return <div style={{ textAlign: "center", padding: "40px", color: "#8A9E99" }}>لا يوجد قوائم تشغيل أو محاضرات.</div>;
                      
                      return groups.map(([key, list]) => {
                        const parts = key.split('|');
                        const tId = parts[0];
                        const pName = parts.slice(1).join('|');
                        const teacherName = teachers.find(t => t.uid === tId || t.id === tId)?.name || "مدرس غير معروف";
                        return (
                          <div key={key} style={{ background: "#F9FAFA", borderRadius: "12px", border: "1px solid #E8EDEC", overflow: "hidden" }}>
                            <div style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E8EDEC", background: "#fff" }}>
                              <div>
                                <h4 style={{ margin: "0 0 4px 0", color: "#12453D" }}>{pName} <span style={{ fontSize: "0.85rem", color: "#8A9E99", fontWeight: "normal" }}>({list.length} فيديو)</span></h4>
                                <div style={{ fontSize: "0.85rem", color: "#E3A736" }}>{teacherName}</div>
                              </div>
                              <button onClick={() => handleDeletePlaylist(tId, pName)} style={{ background: "rgba(255, 59, 48, 0.1)", color: "#FF3B30", border: "1px solid rgba(255, 59, 48, 0.3)", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "4px", fontWeight: "bold" }}>
                                <Trash2 size={14} /> مسح القائمة
                              </button>
                            </div>
                            <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "16px" }}>
                              {list.map(v => (
                                <div key={v.id} style={{ display: "flex", flexDirection: "column", background: "#fff", padding: "12px", borderRadius: "8px", border: "1px solid #E8EDEC" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                                    <h5 style={{ margin: 0, fontSize: "0.95rem", color: "#12453D" }}>{v.title}</h5>
                                    <button onClick={() => handleDeleteVideo(v.id)} style={{ background: "transparent", border: "none", color: "#FF3B30", cursor: "pointer", padding: "4px" }} title="حذف الفيديو"><Trash2 size={14} /></button>
                                  </div>
                                  <div style={{ fontSize: "0.8rem", color: "#8A9E99", marginBottom: "8px" }}>{v.subject || 'عام'}</div>
                                  {v.videoUrl || v.link ? (
                                    <a href={v.videoUrl || v.link} target="_blank" rel="noopener noreferrer" style={{ color: "#3B82F6", textDecoration: "none", fontSize: "0.85rem", marginTop: "auto" }}>عرض الفيديو</a>
                                  ) : (
                                    <span style={{ fontSize: "0.85rem", color: "#8A9E99", marginTop: "auto" }}>لا يوجد رابط</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>`;

content = content.replace(bodyTarget, bodyReplacement);
content = content.replace(bodyTarget.replace(/\n/g, '\r\n'), bodyReplacement);

fs.writeFileSync(path, content, 'utf8');
console.log('Modifications done UI');
