const fs = require('fs');

const appFile = 'src/App.tsx';
let content = fs.readFileSync(appFile, 'utf8');

const handlers = `
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!newSubjectName.trim()) return;
    try {
      const { collection, addDoc } = await import("firebase/firestore");
      await addDoc(collection(db, "subjects"), { name: newSubjectName.trim(), createdAt: new Date().toISOString() });
      setNewSubjectName("");
      alert("تمت الإضافة بنجاح");
    } catch(err: any) { alert(err.message); }
  };

  const handleDeleteSubject = async (id: string) => {
    if(!confirm("تأكيد الحذف؟")) return;
    try {
      const { doc, deleteDoc } = await import("firebase/firestore");
      await deleteDoc(doc(db, "subjects", id));
      alert("تم الحذف بنجاح");
    } catch(err: any) { alert(err.message); }
  };

  const handleUpdateSubject = async (id: string, newName: string) => {
    if(!newName.trim()) return;
    try {
      const { doc, updateDoc } = await import("firebase/firestore");
      await updateDoc(doc(db, "subjects", id), { name: newName.trim() });
      alert("تم التعديل بنجاح");
    } catch(err: any) { alert(err.message); }
  };
`;
content = content.replace("  useEffect(() => {", handlers + "\n  useEffect(() => {");
fs.writeFileSync(appFile, content);
