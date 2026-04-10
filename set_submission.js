const fs = require('fs');
let code = fs.readFileSync('app/quiz/[id].tsx', 'utf8');

code = code.replace(
  "import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';",
  "import { addDoc, collection, doc, getDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';"
);

code = code.replace(
  "const [answers, setAnswers] = useState<{ [qIdx: number]: string }>({});",
  "const [answers, setAnswers] = useState<{ [qIdx: number]: string }>({});\n  const [submission, setSubmission] = useState<any>(null);"
);

// We need an exact match for the oldLoad func
const rxLoad = /async function load\(\) \{\s*if \(\!id\) return;[\s\S]*?setLoading\(false\);\s*\}\s*?\}/;

const newLoad = `async function load() {
      if (!id) return;
      try {
        const docRef = doc(db, 'quizzes', id as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setQuiz({ id: docSnap.id, ...docSnap.data() });
          
          if (auth.currentUser) {
            const subQ = query(
              collection(db, 'quiz_submissions'),
              where('quizId', '==', id),
              where('studentId', '==', auth.currentUser.uid)
            );
            const subSnap = await getDocs(subQ);
            if (!subSnap.empty) {
              setSubmission({ id: subSnap.docs[0].id, ...subSnap.docs[0].data() });
            }
          }
        } else {
          Alert.alert('خطأ', 'الاختبار غير موجود');
          router.back();
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }`;

code = code.replace(rxLoad, newLoad);

const oldReturn = `  return (
    <SafeAreaView style={styles.container}>`;

const newReturn = `  if (submission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}> 
            <Ionicons name="arrow-forward" size={24} color={C.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{quiz?.title || 'الاختبار'}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={80} color={C.success} />
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: C.textBlack, marginTop: 20 }}>تم التسليم مسبقاً</Text>
          {submission.graded ? (
            <Text style={{ fontSize: 20, color: C.gold, marginTop: 10, fontWeight: 'bold' }}>
              الدرجة: {submission.score}
            </Text>
          ) : (
            <Text style={{ fontSize: 16, color: C.textGray, marginTop: 10 }}>
              بانتظار تصحيح المعلم...
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>`;

code = code.replace(oldReturn, newReturn);
fs.writeFileSync('app/quiz/[id].tsx', code);
console.log('done');
