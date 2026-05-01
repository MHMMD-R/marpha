const fs = require('fs');
const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add state variables
const stateTarget = `  const [newVideoSubject, setNewVideoSubject] = useState("");
  const [newVideoFile, setNewVideoFile] = useState<File | null>(null);
  const [isAddingVideo, setIsAddingVideo] = useState(false);`;

const stateReplacement = `  const [newVideoSubject, setNewVideoSubject] = useState("");
  const [newVideoTeacherId, setNewVideoTeacherId] = useState("");
  const [newVideoPlaylistName, setNewVideoPlaylistName] = useState("");
  const [isCreatingNewPlaylist, setIsCreatingNewPlaylist] = useState(false);
  const [newPlaylistInput, setNewPlaylistInput] = useState("");
  const [newVideoFile, setNewVideoFile] = useState<File | null>(null);
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [videosViewMode, setVideosViewMode] = useState<"all" | "playlists">("all");`;

content = content.replace(stateTarget, stateReplacement);
content = content.replace(stateTarget.replace(/\n/g, '\r\n'), stateReplacement);

// 2. Update handleAddVideo check
content = content.replace(
  `if (!newVideoTitle || !newVideoSubject || !newVideoFile) return;`,
  `if (!newVideoTitle || !newVideoSubject || !newVideoFile || !newVideoTeacherId) return;`
);

// 3. Update handleAddVideo Firestore save
const saveTarget = `      const lectureRef = await addDoc(collection(db, "lectures"), {
        title: newVideoTitle,
        description: newVideoDescription,
        subject: newVideoSubject,
        videoUrl: publicUrl,
        createdAt: new Date().toISOString()
      });`;

const saveReplacement = `      let finalPlaylistName = newVideoPlaylistName;
      if (isCreatingNewPlaylist && newPlaylistInput.trim() !== "") {
        finalPlaylistName = newPlaylistInput.trim();
      }

      const lectureRef = await addDoc(collection(db, "lectures"), {
        title: newVideoTitle,
        description: newVideoDescription,
        subject: newVideoSubject,
        teacherId: newVideoTeacherId,
        playlistName: finalPlaylistName || "",
        videoUrl: publicUrl,
        status: "active",
        createdAt: new Date().toISOString()
      });`;

content = content.replace(saveTarget, saveReplacement);
content = content.replace(saveTarget.replace(/\n/g, '\r\n'), saveReplacement);

// 4. Update form reset
const resetTarget = `      setNewVideoSubject("");
      setNewVideoFile(null);
      setIsAddVideoOpen(false);`;

const resetReplacement = `      setNewVideoSubject("");
      setNewVideoTeacherId("");
      setNewVideoPlaylistName("");
      setIsCreatingNewPlaylist(false);
      setNewPlaylistInput("");
      setNewVideoFile(null);
      setIsAddVideoOpen(false);`;

content = content.replace(resetTarget, resetReplacement);
content = content.replace(resetTarget.replace(/\n/g, '\r\n'), resetReplacement);

// 5. Add delete functions
const deleteTarget = `    } catch(err: any) {
      alert("خطأ في الرفض: " + err.message);
    }
  };`;

const deleteReplacement = `    } catch(err: any) {
      alert("خطأ في الرفض: " + err.message);
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من رغبتك في حذف هذا الفيديو نهائياً؟")) return;
    try {
      await deleteDoc(doc(db, "lectures", id));
      alert("تم حذف الفيديو بنجاح");
    } catch(err: any) {
      alert("خطأ في الحذف: " + err.message);
    }
  };

  const handleDeletePlaylist = async (teacherId: string, playlistName: string) => {
    if (!window.confirm("هل أنت متأكد من مسح القائمة بالكامل وجميع الفيديوهات التي بداخلها؟")) return;
    try {
      const vidsToDelete = videos.filter((v: any) => v.teacherId === teacherId && v.playlistName === playlistName);
      for (const v of vidsToDelete) {
        await deleteDoc(doc(db, "lectures", v.id));
      }
      const docId = \`\${teacherId}_\${playlistName.replace(/[^a-zA-Z0-9_\\u0600-\\u06FF]/g, '_')}\`;
      await deleteDoc(doc(db, "playlist_metadata", docId));
      alert("تم مسح القائمة بنجاح");
    } catch(err: any) {
      alert("خطأ في الحذف: " + err.message);
    }
  };`;

content = content.replace(deleteTarget, deleteReplacement);
content = content.replace(deleteTarget.replace(/\n/g, '\r\n'), deleteReplacement);

fs.writeFileSync(path, content, 'utf8');
console.log('Modifications done');
