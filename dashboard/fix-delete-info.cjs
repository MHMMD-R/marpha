const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

if (!content.includes('getDocs')) {
  content = content.replace('updateDoc } from "firebase/firestore";', 'updateDoc, query, where, getDocs } from "firebase/firestore";');
}

const oldDelete = `  const handleDeleteTargetUser = async () => {
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
    } catch (err: any) {
      alert("خطأ في الحذف: " + err.message);
    } finally {
      setIsSavingUser(false);
    }
  };`;

const newDelete = `  const handleDeleteTargetUser = async () => {
    if (!manageTarget) return;
    if (!window.confirm("هل أنت متأكد من رغبتك في حذف هذا المستخدم نهائياً وجميع البيانات المرتبطة به؟ لا يمكن التراجع.")) return;
    
    setIsSavingUser(true);
    try {
      const uid = manageTarget.data.id || manageTarget.data.uid;
      const type = manageTarget.type;

      if (type === 'student') {
        const subSnap = await getDocs(query(collection(db, 'quiz_submissions'), where('studentId', '==', uid)));
        for (const docSnap of subSnap.docs) {
          await deleteDoc(doc(db, 'quiz_submissions', docSnap.id));
        }
      } else if (type === 'teacher') {
        const quizzesSnap = await getDocs(query(collection(db, 'quizzes'), where('teacherId', '==', uid)));
        for (const docSnap of quizzesSnap.docs) {
          await deleteDoc(doc(db, 'quizzes', docSnap.id));
        }
        
        const lecturesSnap = await getDocs(query(collection(db, 'lectures'), where('teacherId', '==', uid)));
        for (const docSnap of lecturesSnap.docs) {
          await deleteDoc(doc(db, 'lectures', docSnap.id));
        }
      }

      const collectionName = type === 'student' ? 'students' : 'teachers';
      const userRef = doc(db, collectionName, uid);
      await deleteDoc(userRef);
      
      setManageTarget(null);
      setIsEditingUser(false);
      setShowQR(false);
    } catch (err: any) {
      alert("خطأ في الحذف: " + err.message);
    } finally {
      setIsSavingUser(false);
    }
  };`;

content = content.replace(oldDelete, newDelete);
fs.writeFileSync('src/App.tsx', content);

console.log("Updated delete logic");
