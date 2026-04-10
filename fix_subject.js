const fs = require('fs');
let code = fs.readFileSync('app/subject/[id].tsx', 'utf8');

// 1. add auth import
code = code.replace(
  "import { db } from '../../firebase';",
  "import { db, auth } from '../../firebase';"
);

// 2. modify loadTeacher to check quiz submissions
const oldQueries = `        const quizzesRef = collection(db, 'quizzes');
        const qQuizzes = query(quizzesRef, where('teacherId', '==', id));
        const quizzesSnap = await getDocs(qQuizzes);
        const fetchedQuizzes = quizzesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        setLectures(fetchedLectures);
        setQuizzes(fetchedQuizzes);`;

const newQueries = `        const quizzesRef = collection(db, 'quizzes');
        const qQuizzes = query(quizzesRef, where('teacherId', '==', id));
        const quizzesSnap = await getDocs(qQuizzes);
        
        let fetchedQuizzes = quizzesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        if (auth.currentUser) {
          const subsRef = collection(db, 'quiz_submissions');
          const subsQ = query(subsRef, where('studentId', '==', auth.currentUser.uid));
          const subsSnap = await getDocs(subsQ);
          const studentSubs = subsSnap.docs.map(d => d.data());
          
          fetchedQuizzes = fetchedQuizzes.map(q => {
            const sub = studentSubs.find(s => s.quizId === q.id);
            if (sub) {
              return { ...q, score: sub.graded ? sub.score : 'بانتظار التصحيح' };
            }
            return { ...q, score: 'لم يتم الحل' };
          });
        }

        setLectures(fetchedLectures);
        setQuizzes(fetchedQuizzes);`;

code = code.replace(oldQueries, newQueries);

// 3. Ensure scoreBadge uses the new score
// <Text style={styles.scoreText}>{item.score || '-'}</Text> -> {item.score || 'لم يتم الحل'}
code = code.replace(
  "<Text style={styles.scoreText}>{item.score || '-'}</Text>",
  "<Text style={styles.scoreText}>{item.score || 'لم يتم الحل'}</Text>"
);

fs.writeFileSync('app/subject/[id].tsx', code);
console.log("Subject updated");
