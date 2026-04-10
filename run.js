const fs = require('fs');
let code = fs.readFileSync('app/subject/[id].tsx', 'utf8');

const oldCode = `        const quizzesRef = collection(db, 'quizzes');
        const qQuizzes = query(quizzesRef, where('teacherId', '==', id));
        const quizzesSnap = await getDocs(qQuizzes);
        const fetchedQuizzes = quizzesSnap.docs.map(d => ({ id: d.id, ...d.data() }));`;

const newCode = `        const quizzesRef = collection(db, 'quizzes');
        const qQuizzes = query(quizzesRef, where('teacherId', '==', id));
        const quizzesSnap = await getDocs(qQuizzes);
        let fetchedQuizzes = quizzesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        if (auth.currentUser) {
          const subSnap = await getDocs(query(collection(db, 'quiz_submissions'), where('studentId', '==', auth.currentUser.uid)));
          const userSubs = subSnap.docs.map(d => d.data());
          
          fetchedQuizzes = fetchedQuizzes.map(q => {
            const sub = userSubs.find(s => s.quizId === q.id);
            if (sub) {
              q.score = sub.graded ? sub.score : 'بانتظار التصحيح';
            } else {
               q.score = 'لم يتم الحل';
            }
            return q;
          });
        }`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('app/subject/[id].tsx', code);
console.log('success');
