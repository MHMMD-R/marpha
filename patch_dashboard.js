const fs = require('fs');
let code = fs.readFileSync('dashboard/src/App.tsx', 'utf8');

code = code.replace(
`                  </thead>
                  <tbody>
                    {students.length > 0 ? students.map((s, i) => (
                      <tr key={s.id || i}>
                        <td>`,
`                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.length > 0 ? students.map((s, i) => (
                      <tr key={s.id || i}>
                        <td>`
);

code = code.replace(
`                        <td>
                          <span className={\`status-badge \${s.status}\`}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", display: "inline-block" }}></span>
                            {s.status === "active" ? "نشط" : s.status === "pending" ? "معلق" : "غير نشط"}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", padding: "40px", color: "#8A9E99" }}>لا يوجد طلاب مسجلين.</td>
                      </tr>
                    )}
                  </tbody>
                </table>`,
`                        <td>
                          <span className={\`status-badge \${s.status}\`}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", display: "inline-block" }}></span>
                            {s.status === "active" ? "نشط" : s.status === "pending" ? "معلق" : "غير نشط"}
                          </span>
                        </td>
                        <td>
                          <button className="btn-secondary" style={{ padding: "4px 8px", fontSize: "0.8rem", width: "auto" }} onClick={() => setManageTarget({ type: 'student', data: s })}>إدارة</button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "#8A9E99" }}>لا يوجد طلاب مسجلين.</td>
                      </tr>
                    )}
                  </tbody>
                </table>`
);

code = code.replace(
`                  </thead>
                  <tbody>
                    {teachers.length > 0 ? teachers.map((t, i) => (
                      <tr key={t.id || i}>
                        <td>`,
`                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.length > 0 ? teachers.map((t, i) => (
                      <tr key={t.id || i}>
                        <td>`
);

code = code.replace(
`                        <td style={{ fontWeight: 600 }}>{t.subject}</td>        
                        <td>{t.createdAt ? new Date(t.createdAt).toLocaleDateString('ar-EG') : '—'}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={3} style={{ textAlign: "center", padding: "40px", color: "#8A9E99" }}>لا يوجد معلمين مسجلين.</td>
                      </tr>
                    )}
                  </tbody>
                </table>`,
`                        <td style={{ fontWeight: 600 }}>{t.subject}</td>        
                        <td>{t.createdAt ? new Date(t.createdAt).toLocaleDateString('ar-EG') : '—'}</td>
                        <td>
                          <button className="btn-secondary" style={{ padding: "4px 8px", fontSize: "0.8rem", width: "auto" }} onClick={() => setManageTarget({ type: 'teacher', data: t })}>إدارة</button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", padding: "40px", color: "#8A9E99" }}>لا يوجد معلمين مسجلين.</td>
                      </tr>
                    )}
                  </tbody>
                </table>`
);

fs.writeFileSync('dashboard/src/App.tsx', code);
