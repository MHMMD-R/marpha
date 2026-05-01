const fs = require('fs');

// Patch GroupsPanel.tsx
const gpPath = 'src/GroupsPanel.tsx';
let gpContent = fs.readFileSync(gpPath, 'utf8');

const gpTarget = `export function GroupsPanel() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);`;

const gpReplacement = `export function GroupsPanel({ initialTeacherId }: { initialTeacherId?: string }) {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);

  useEffect(() => {
    if (initialTeacherId && teachers.length > 0) {
      const t = teachers.find((x: any) => x.id === initialTeacherId || x.uid === initialTeacherId);
      if (t && (!selectedTeacher || selectedTeacher.id !== t.id)) {
        setSelectedTeacher(t);
      }
    }
  }, [initialTeacherId, teachers]);`;

gpContent = gpContent.replace(gpTarget, gpReplacement);
gpContent = gpContent.replace(gpTarget.replace(/\n/g, '\r\n'), gpReplacement);
fs.writeFileSync(gpPath, gpContent, 'utf8');


// Patch App.tsx
const appPath = 'src/App.tsx';
let appContent = fs.readFileSync(appPath, 'utf8');

const appStateTarget = `  const [videosViewMode, setVideosViewMode] = useState<"all" | "playlists">("all");`;
const appStateReplacement = `  const [videosViewMode, setVideosViewMode] = useState<"all" | "playlists">("all");
  const [chatInitialTeacherId, setChatInitialTeacherId] = useState<string | undefined>();`;
appContent = appContent.replace(appStateTarget, appStateReplacement);
appContent = appContent.replace(appStateTarget.replace(/\n/g, '\r\n'), appStateReplacement);

const appTabTarget = `          ) : activeTab === "groups" ? (
            <GroupsPanel />`;
const appTabReplacement = `          ) : activeTab === "groups" ? (
            <GroupsPanel initialTeacherId={chatInitialTeacherId} />`;
appContent = appContent.replace(appTabTarget, appTabReplacement);
appContent = appContent.replace(appTabTarget.replace(/\n/g, '\r\n'), appTabReplacement);

// Update the "الدردشة" button in App.tsx to set chatInitialTeacherId
const chatBtnTarget = `onClick={() => { setActiveTab("groups"); setManageTarget(null); }}`;
const chatBtnReplacement = `onClick={() => { setChatInitialTeacherId(manageTarget.data.id || manageTarget.data.uid); setActiveTab("groups"); setManageTarget(null); }}`;
appContent = appContent.replace(chatBtnTarget, chatBtnReplacement);
appContent = appContent.replace(chatBtnTarget.replace(/\n/g, '\r\n'), chatBtnReplacement);

fs.writeFileSync(appPath, appContent, 'utf8');
console.log("Patch 4 done");
