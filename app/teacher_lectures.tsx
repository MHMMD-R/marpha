import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { FileSystemUploadType, uploadAsync } from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebase';

const C = {
  bgMain: '#F4F7F6',
  topOverlay: '#0B2923',
  topOverlaySoft: '#123B34',
  primary: '#12453D',
  primarySoft: '#2E5E55',
  accent: '#E3A736',
  white: '#FFFFFF',
  textPrimary: '#10241F',
  textSecondary: '#8A9E99',
  borderLight: '#E8EDEC',
  softGreen: '#EEF5F3',
  softGold: '#FFF8E8',
  success: '#10B981',
  successSoft: '#ECFDF5',
  danger: '#FF3B30',
};

// Iraqi 6th Preparatory (السادس الإعدادي) — Scientific & Literary branches
const IRAQI_SUBJECTS = [
  "الرياضيات",
  "الفيزياء",
  "الكيمياء",
  "الأحياء",
  "اللغة العربية",
  "اللغة الإنجليزية",
  "اللغة الفرنسية",
  "التربية الإسلامية",
  "التاريخ",
  "الجغرافية",
  "الاقتصاد",
  "الأدب والنصوص",
  "القواعد",
  "الفلسفة وعلم النفس",
  "الحاسوب",
];

type PlaylistGroup = {
  name: string;
  lectures: any[];
  isExpanded: boolean;
};

export default function TeacherLecturesScreen() {
  const router = useRouter();
  const [lectures, setLectures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlaylists, setExpandedPlaylists] = useState<Record<string, boolean>>({});

  // Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [lectureTitle, setLectureTitle] = useState('');
  const [lectureDescription, setLectureDescription] = useState('');
  const [playlistName, setPlaylistName] = useState('');
  const [isCreatingNewPlaylist, setIsCreatingNewPlaylist] = useState(false);
  const [newPlaylistInput, setNewPlaylistInput] = useState('');
  const [selectedSubject, setSelectedSubject] = useState(IRAQI_SUBJECTS[0]);
  const [subjectAutoFilled, setSubjectAutoFilled] = useState(false);
  const [lectureFile, setLectureFile] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [computedDuration, setComputedDuration] = useState(''); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Fetch Teacher's Subject First
    getDoc(doc(db, 'teachers', user.uid)).then((d) => {
      if (d.exists() && d.data().subject) {
        const teacherSubject = d.data().subject;
        if (IRAQI_SUBJECTS.includes(teacherSubject)) {
          setSelectedSubject(teacherSubject);
        }
      }
    }).catch(console.error);

    const q = query(collection(db, 'lectures'), where('teacherId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLectures = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort in memory by creation time
      fetchedLectures.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      setLectures(fetchedLectures);
      setLoading(false);

      // Auto-expand the first playlist
      if (Object.keys(expandedPlaylists).length === 0) {
        const first = fetchedLectures.find((l: any) => l.playlistName && l.playlistName !== 'محاضرات أخرى');
        if (first) {
          setExpandedPlaylists({ [(first as any).playlistName]: true });
        }
      }
    }, (error) => {
      console.error('Error fetching lectures:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDeleteLecture = (lectureId: string) => {
    Alert.alert(
      'حذف المحاضرة',
      'هل أنت متأكد أنك تريد حذف هذه المحاضرة بشكل نهائي؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        { 
          text: 'حذف', 
          style: 'destructive',
          onPress: async () => {
            try {
              const { deleteDoc, doc } = await import('firebase/firestore');
              await deleteDoc(doc(db, 'lectures', lectureId));
            } catch (error: any) {
              Alert.alert('خطأ', 'حدث خطأ أثناء الحذف: ' + error.message);
            }
          }
        }
      ]
    );
  };

  const handlePickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setLectureFile(asset);
        
        if (asset.duration) {
          // duration is in milliseconds
          const totalSeconds = Math.floor(asset.duration / 1000);
          const minutes = Math.floor(totalSeconds / 60);
          const seconds = totalSeconds % 60;
          setComputedDuration(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
        } else {
          setComputedDuration('غير محدد');
        }
      }
    } catch (e: any) {
      Alert.alert('خطأ', 'حدث خطأ أثناء تحميل إحصائيات الفيديو.');
    }
  };

  const handleAddLecture = async () => {
    if (!lectureTitle.trim() || !lectureFile) {
      Alert.alert('تنبيه', 'الرجاء إدخال العنوان واختيار ملف الفيديو');
      return;
    }
    const user = auth.currentUser;
    if (!user) return;

    setIsSubmitting(true);
    try {
      // Use the production Cloudflare worker URL to upload files independently of the dashboard
      const DUMMY_API_BASE = 'https://marpha-uploader.marpha.workers.dev';
      
      const fileName = lectureFile.fileName || lectureFile.uri.split('/').pop() || `video_${Date.now()}.mp4`;
      const uploadUrl = `${DUMMY_API_BASE}/api/r2/upload?bucketType=LECTURES&folder=requests_${user.uid}&fileName=${encodeURIComponent(fileName)}`;

      // Prepare file body using FileSystem to avoid memory crash
      let payload;
      if (Platform.OS === 'web') {
        const responseFile = await fetch(lectureFile.uri);
        const blob = await responseFile.blob();
        const response = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": lectureFile.mimeType || "video/mp4" },
          body: blob,
        });
        if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
        payload = await response.json();
      } else {
        const uploadTask = await uploadAsync(uploadUrl, lectureFile.uri, {
          httpMethod: 'PUT',
          uploadType: FileSystemUploadType?.BINARY_CONTENT ?? 1,
          headers: { "Content-Type": lectureFile.mimeType || "video/mp4" }
        });
        if (uploadTask.status !== 200) {
          throw new Error(`Upload failed with status ${uploadTask.status}`);
        }
        payload = JSON.parse(uploadTask.body);
      }

      if (!payload.publicUrl) {
        throw new Error("Upload succeeded but no public URL was returned");
      }

      await addDoc(collection(db, 'lectures'), {
        title: lectureTitle.trim(),
        description: lectureDescription.trim(),
        playlistName: playlistName.trim() || 'محاضرات أخرى',
        subject: selectedSubject,
        videoUrl: payload.publicUrl,
        duration: computedDuration || 'غير محدد',
        teacherId: user.uid,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      Alert.alert('نجاح', 'تم إرسال طلب المحاضرة بنجاح.');
      setLectureTitle('');
      setLectureDescription('');
      setPlaylistName('');
      setComputedDuration('');
      setLectureFile(null);
      setIsModalVisible(false);
    } catch (error: any) {
      console.error('Error adding lecture:', error);
      Alert.alert('خطأ', error.message || 'حدث خطأ أثناء إضافة المحاضرة.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group lectures by playlist
  const playlists: PlaylistGroup[] = (() => {
    const groupMap: Record<string, any[]> = {};
    const ungrouped: any[] = [];

    lectures.forEach(l => {
      if (l.playlistName && l.playlistName !== 'محاضرات أخرى') {
        if (!groupMap[l.playlistName]) groupMap[l.playlistName] = [];
        groupMap[l.playlistName].push(l);
      } else {
        ungrouped.push(l);
      }
    });

    const result: PlaylistGroup[] = Object.entries(groupMap).map(([name, lecs]) => ({
      name,
      lectures: lecs,
      isExpanded: !!expandedPlaylists[name],
    }));

    if (ungrouped.length > 0) {
      result.push({
        name: 'محاضرات أخرى',
        lectures: ungrouped,
        isExpanded: !!expandedPlaylists['محاضرات أخرى'],
      });
    }

    return result;
  })();

  const togglePlaylist = (name: string) => {
    setExpandedPlaylists(prev => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const getStatusInfo = (status: string) => {
    if (status === 'accepted' || status === 'active') return { label: 'مقبول', color: C.success, bg: C.successSoft };
    if (status === 'declined') return { label: 'مرفوض', color: C.danger, bg: '#FFF0F0' };
    return { label: 'قيد المراجعة', color: '#F59E0B', bg: '#FFFBEB' };
  };

  const renderLectureCard = (item: any) => (
    <View key={item.id} style={styles.lectureCard}>
      {/* Status strip */}
      <View style={[styles.cardStrip, { backgroundColor: getStatusInfo(item.status).color }]} />

      <View style={styles.cardBody}>
        <View style={styles.lectureHeaderRow}>
          <View style={styles.lectureIconCircle}>
            <Ionicons name="play" size={20} color={C.primary} />
          </View>

          <View style={styles.lectureInfo}>
            <Text style={styles.lectureTitle} numberOfLines={2}>{item.title}</Text>

            {/* Playlist badge */}
            {item.playlistName && item.playlistName !== 'محاضرات أخرى' && (
              <View style={styles.playlistBadge}>
                <Ionicons name="folder" size={11} color={C.accent} />
                <Text style={styles.playlistBadgeText}>{item.playlistName}</Text>
              </View>
            )}

            {/* Meta pills */}
            <View style={styles.lectureMetaRow}>
              <View style={styles.metaPill}>
                <Ionicons name="time-outline" size={11} color={C.textSecondary} />
                <Text style={styles.metaPillText}>{item.duration}</Text>
              </View>

              <View style={[styles.statusBadge, { backgroundColor: getStatusInfo(item.status).bg }]}>
                <View style={[styles.statusDot, { backgroundColor: getStatusInfo(item.status).color }]} />
                <Text style={[styles.statusText, { color: getStatusInfo(item.status).color }]}>
                  {getStatusInfo(item.status).label}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => handleDeleteLecture(item.id)}
            style={styles.deleteBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={16} color={C.danger} />
          </TouchableOpacity>
        </View>

        {/* Date & link footer */}
        <View style={styles.lectureFooter}>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={12} color={C.textSecondary} />
            <Text style={styles.dateText}>
              {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : 'تاريخ غير متوفر'}
            </Text>
          </View>

          {(item.link || item.videoUrl) && (
            <View style={styles.videoBadge}>
              <Ionicons name="videocam" size={12} color={C.primary} />
              <Text style={styles.videoBadgeText}>فيديو مرفق</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  const renderPlaylistGroup = (playlist: PlaylistGroup) => (
    <View key={playlist.name} style={styles.playlistContainer}>
      {/* Playlist header */}
      <TouchableOpacity style={styles.playlistHeader} onPress={() => togglePlaylist(playlist.name)} activeOpacity={0.7}>
        <View style={styles.playlistHeaderLeft}>
          <Ionicons
            name={playlist.isExpanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={C.textSecondary}
          />
        </View>

        <View style={styles.playlistHeaderContent}>
          <View style={styles.playlistTitleRow}>
            <View style={styles.playlistIcon}>
              <Ionicons name="folder" size={18} color={C.accent} />
            </View>
            <View style={styles.playlistTitleWrap}>
              <Text style={styles.playlistTitleText} numberOfLines={1}>{playlist.name}</Text>
              <Text style={styles.playlistSubtitle}>{playlist.lectures.length} محاضرة</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Expanded lectures */}
      {playlist.isExpanded && (
        <View style={styles.playlistLectures}>
          {playlist.lectures.map(item => renderLectureCard(item))}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.wrapper}>
      {/* Background layers */}
      <View style={styles.topBgLayer} />
      <View style={styles.topBgGlow} />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} activeOpacity={0.8} onPress={() => router.back()}>
            <Ionicons name="arrow-forward" size={22} color={C.white} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerSubtitle}>إدارة المحاضرات</Text>
            <Text style={styles.headerTitle}>محاضراتي</Text>
          </View>

          <TouchableOpacity style={styles.addBtn} activeOpacity={0.8} onPress={() => setIsModalVisible(true)}>
            <Ionicons name="add" size={22} color={C.white} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Ionicons name="videocam" size={14} color={C.accent} />
            <Text style={styles.statPillText}>{lectures.length} محاضرة</Text>
          </View>
          <View style={styles.statPill}>
            <Ionicons name="folder" size={14} color="#2FD67C" />
            <Text style={styles.statPillText}>{playlists.length} قائمة تشغيل</Text>
          </View>
          <View style={styles.statPill}>
            <Ionicons name="checkmark-circle" size={14} color={C.success} />
            <Text style={styles.statPillText}>{lectures.filter((l: any) => l.status === 'accepted' || l.status === 'active').length} مقبول</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={C.primary} />
              <Text style={styles.loadingText}>جاري تحميل المحاضرات...</Text>
            </View>
          ) : lectures.length === 0 ? (
            <View style={styles.centerBox}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="videocam-outline" size={48} color={C.textSecondary} />
              </View>
              <Text style={styles.emptyTitle}>لا توجد محاضرات</Text>
              <Text style={styles.emptyText}>انقر على + لطلب محاضرة جديدة</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            >
              {playlists.map(playlist => renderPlaylistGroup(playlist))}
              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </View>
      </SafeAreaView>

      {/* ─── Add Lecture Modal ─── */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal handle */}
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => { setIsModalVisible(false); setLectureTitle(''); setLectureDescription(''); setPlaylistName(''); setLectureFile(null); setComputedDuration(''); setIsCreatingNewPlaylist(false); setNewPlaylistInput(''); setSubjectAutoFilled(false); }}
                disabled={isSubmitting}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={C.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>طلب رفع محاضرة</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
              {/* Title */}
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <Ionicons name="text" size={14} color={C.primary} />
                  <Text style={styles.inputLabel}>عنوان المحاضرة</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="مثال: مقدمة في المعادلات"
                  value={lectureTitle}
                  onChangeText={setLectureTitle}
                  textAlign="right"
                  editable={!isSubmitting}
                  placeholderTextColor={C.textSecondary}
                />
              </View>

              {/* Description */}
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <Ionicons name="document-text" size={14} color={C.primary} />
                  <Text style={styles.inputLabel}>تفاصيل المحاضرة</Text>
                </View>
                <TextInput
                  style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                  placeholder="أضف وصفاً للدرس أو المحاضرة..."
                  value={lectureDescription}
                  onChangeText={setLectureDescription}
                  textAlign="right"
                  editable={!isSubmitting}
                  placeholderTextColor={C.textSecondary}
                  multiline
                />
              </View>

              {/* Playlist */}
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <Ionicons name="folder" size={14} color={C.accent} />
                  <Text style={styles.inputLabel}>قائمة التشغيل (Playlist)</Text>
                </View>

                {isCreatingNewPlaylist ? (
                  // New playlist text input
                  <View style={styles.newPlaylistRow}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="اسم القائمة الجديدة"
                      value={newPlaylistInput}
                      onChangeText={setNewPlaylistInput}
                      textAlign="right"
                      editable={!isSubmitting}
                      placeholderTextColor={C.textSecondary}
                      autoFocus
                    />
                    <TouchableOpacity
                      style={styles.newPlaylistConfirm}
                      onPress={() => {
                        if (newPlaylistInput.trim()) {
                          setPlaylistName(newPlaylistInput.trim());
                          setIsCreatingNewPlaylist(false);
                          setNewPlaylistInput('');
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="checkmark" size={18} color={C.white} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.newPlaylistCancel}
                      onPress={() => {
                        setIsCreatingNewPlaylist(false);
                        setNewPlaylistInput('');
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close" size={18} color={C.danger} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  // Dropdown of existing playlists + new button
                  <View style={styles.playlistPickerRow}>
                    <View style={[styles.input, { flex: 1, paddingHorizontal: 0, paddingVertical: 0 }]}>
                      <Picker
                        selectedValue={playlistName}
                        onValueChange={(itemValue) => {
                          setPlaylistName(itemValue);
                          // Auto-fill subject from playlist's existing lectures
                          if (itemValue && itemValue !== 'محاضرات أخرى') {
                            const playlistLectures = lectures.filter((l: any) => l.playlistName === itemValue);
                            if (playlistLectures.length > 0 && playlistLectures[0].subject) {
                              setSelectedSubject(playlistLectures[0].subject);
                              setSubjectAutoFilled(true);
                            }
                          } else {
                            setSubjectAutoFilled(false);
                          }
                        }}
                        enabled={!isSubmitting}
                        style={Platform.OS === 'web' ? { width: '100%', border: 'none', backgroundColor: 'transparent', textAlign: 'right', padding: 14 } as any : { color: C.textPrimary }}
                        dropdownIconColor={C.accent}
                      >
                        <Picker.Item label="اختر قائمة تشغيل..." value="" color={C.textPrimary} />
                        {(() => {
                          const existingNames = Array.from(new Set(
                            lectures
                              .filter((l: any) => l.playlistName && l.playlistName !== 'محاضرات أخرى')
                              .map((l: any) => l.playlistName)
                          ));
                          return existingNames.map((name: string, idx: number) => (
                            <Picker.Item key={idx} label={name} value={name} color={C.textPrimary} />
                          ));
                        })()}
                      </Picker>
                    </View>
                    <TouchableOpacity
                      style={styles.newPlaylistBtn}
                      onPress={() => setIsCreatingNewPlaylist(true)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add" size={20} color={C.white} />
                    </TouchableOpacity>
                  </View>
                )}

                {playlistName ? (
                  <View style={styles.selectedPlaylistBadge}>
                    <Ionicons name="folder" size={12} color={C.accent} />
                    <Text style={styles.selectedPlaylistText}>{playlistName}</Text>
                    <TouchableOpacity onPress={() => { setPlaylistName(''); setSubjectAutoFilled(false); }}>
                      <Ionicons name="close-circle" size={16} color={C.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.inputHint}>اختر قائمة موجودة أو أنشئ واحدة جديدة بالضغط على +</Text>
                )}
              </View>

              {/* Subject */}
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <Ionicons name="book" size={14} color={C.primary} />
                  <Text style={styles.inputLabel}>المادة</Text>
                  {subjectAutoFilled && (
                    <View style={styles.autoFillBadge}>
                      <Ionicons name="flash" size={10} color={C.accent} />
                      <Text style={styles.autoFillText}>مأخوذة من القائمة</Text>
                    </View>
                  )}
                </View>
                <View style={[styles.input, { paddingHorizontal: 0, paddingVertical: 0 }]}>
                  <Picker
                    selectedValue={selectedSubject}
                    onValueChange={(itemValue) => {
                      setSelectedSubject(itemValue);
                      setSubjectAutoFilled(false);
                    }}
                    enabled={!isSubmitting}
                    style={Platform.OS === 'web' ? { width: '100%', border: 'none', backgroundColor: 'transparent', textAlign: 'right', padding: 14 } as any : { color: C.textPrimary }}
                    dropdownIconColor={C.primary}
                  >
                    {!IRAQI_SUBJECTS.includes(selectedSubject) && selectedSubject ? (
                      <Picker.Item label={selectedSubject} value={selectedSubject} color={C.textPrimary} />
                    ) : null}
                    {IRAQI_SUBJECTS.map((subject, idx) => (
                      <Picker.Item key={idx} label={subject} value={subject} color={C.textPrimary} />
                    ))}
                  </Picker>
                </View>
                <Text style={styles.inputHint}>يمكنك تغيير المادة حتى لو تم تعبئتها تلقائياً من القائمة</Text>
              </View>

              {/* Video file */}
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <Ionicons name="videocam" size={14} color={C.primary} />
                  <Text style={styles.inputLabel}>ملف الفيديو</Text>
                </View>
                <TouchableOpacity
                  style={styles.videoPicker}
                  onPress={handlePickVideo}
                  disabled={isSubmitting}
                  activeOpacity={0.7}
                >
                  {lectureFile ? (
                    <View style={styles.videoPickerSelected}>
                      <View style={styles.videoPickerIconSelected}>
                        <Ionicons name="checkmark-circle" size={24} color={C.success} />
                      </View>
                      <View style={styles.videoPickerInfo}>
                        <Text style={styles.videoPickerTitle} numberOfLines={1}>
                          {lectureFile.fileName || `فيديو مدته ${computedDuration}`}
                        </Text>
                        <Text style={styles.videoPickerHint}>اضغط لتغيير الفيديو</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.videoPickerEmpty}>
                      <View style={styles.videoPickerIconEmpty}>
                        <Ionicons name="cloud-upload-outline" size={28} color={C.primary} />
                      </View>
                      <Text style={styles.videoPickerTitle}>اختر فيديو من جهازك</Text>
                      <Text style={styles.videoPickerHint}>MP4, MOV, etc.</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Submit */}
              <TouchableOpacity
                style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
                onPress={handleAddLecture}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <View style={styles.submitRow}>
                    <ActivityIndicator color={C.white} size="small" />
                    <Text style={styles.submitBtnText}>جاري رفع الفيديو...</Text>
                  </View>
                ) : (
                  <View style={styles.submitRow}>
                    <Ionicons name="paper-plane" size={18} color={C.white} />
                    <Text style={styles.submitBtnText}>إرسال الطلب</Text>
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: C.bgMain },
  topBgLayer: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 300,
    backgroundColor: C.topOverlay,
    borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
  },
  topBgGlow: {
    position: 'absolute', top: -40, right: -20,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: C.topOverlaySoft, opacity: 0.55,
  },

  // ─── Header ───
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 14, paddingBottom: 12,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitleContainer: { alignItems: 'center', flex: 1 },
  headerSubtitle: { fontSize: 12, color: '#97AEA9', marginBottom: 3 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: C.white },
  addBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: C.accent,
    justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: C.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },

  // ─── Stats ───
  statsRow: {
    flexDirection: 'row-reverse', paddingHorizontal: 24, gap: 8, marginBottom: 16, flexWrap: 'wrap',
  },
  statPill: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  statPillText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },

  // ─── Content ───
  content: {
    flex: 1, backgroundColor: C.bgMain,
    borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, gap: 10 },
  loadingText: { fontSize: 14, color: C.textSecondary },
  emptyIconCircle: {
    width: 96, height: 96, borderRadius: 32,
    backgroundColor: C.softGreen,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: C.textPrimary },
  emptyText: { fontSize: 14, color: C.textSecondary },
  listContainer: { padding: 20, paddingBottom: 40 },

  // ─── Playlist Section ───
  playlistContainer: { marginBottom: 14 },
  playlistHeader: {
    flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: C.white, borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: C.borderLight,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 1 },
    }),
  },
  playlistHeaderLeft: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: C.softGreen,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  playlistHeaderContent: { flex: 1 },
  playlistTitleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  playlistIcon: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: C.softGold,
    justifyContent: 'center', alignItems: 'center',
  },
  playlistTitleWrap: { flex: 1, alignItems: 'flex-end' },
  playlistTitleText: { fontSize: 15, fontWeight: '800', color: C.textPrimary },
  playlistSubtitle: { fontSize: 11, color: C.textSecondary, fontWeight: '600', marginTop: 2 },
  playlistLectures: {
    marginTop: 8, marginRight: 12,
    borderRightWidth: 2, borderRightColor: C.borderLight, paddingRight: 12,
  },

  // ─── Lecture Card ───
  lectureCard: {
    flexDirection: 'row-reverse',
    backgroundColor: C.white, borderRadius: 18, overflow: 'hidden', marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  cardStrip: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  lectureHeaderRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 12 },
  lectureIconCircle: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: C.softGreen,
    justifyContent: 'center', alignItems: 'center',
  },
  lectureInfo: { flex: 1, alignItems: 'flex-end' },
  lectureTitle: {
    fontSize: 15, fontWeight: '800', color: C.textPrimary,
    textAlign: 'right', marginBottom: 4, lineHeight: 21,
  },
  playlistBadge: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
    backgroundColor: C.softGold,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    marginBottom: 6,
  },
  playlistBadgeText: { fontSize: 10, fontWeight: '700', color: C.accent },
  lectureMetaRow: { flexDirection: 'row-reverse', gap: 6, flexWrap: 'wrap' },
  metaPill: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 3,
    backgroundColor: C.softGreen,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  metaPillText: { fontSize: 10, fontWeight: '600', color: C.textSecondary },
  statusBadge: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },
  deleteBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#FFF0F0',
    justifyContent: 'center', alignItems: 'center',
  },
  lectureFooter: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: C.borderLight, paddingTop: 10, marginTop: 10,
  },
  dateRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 11, color: C.textSecondary },
  videoBadge: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
    backgroundColor: C.softGreen,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  videoBadgeText: { fontSize: 10, fontWeight: '700', color: C.primary },

  // ─── Modal ───
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: C.white,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 24, paddingBottom: 40, maxHeight: '90%',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: C.borderLight,
    alignSelf: 'center', marginTop: 12, marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 24, paddingTop: 8,
  },
  modalCloseBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.softGreen,
    justifyContent: 'center', alignItems: 'center',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: C.textPrimary },

  // ─── Form ───
  inputGroup: { marginBottom: 20 },
  inputLabelRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 10 },
  inputLabel: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  input: {
    backgroundColor: C.softGreen, borderRadius: 14,
    borderWidth: 1, borderColor: C.borderLight,
    paddingHorizontal: 18, paddingVertical: 14, fontSize: 15, color: C.textPrimary,
  },
  inputHint: {
    fontSize: 11, color: C.textSecondary, textAlign: 'right', marginTop: 6,
  },

  // ─── Playlist Form Elements ───
  newPlaylistRow: { flexDirection: 'row-reverse', gap: 8, alignItems: 'center' },
  newPlaylistConfirm: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: C.success,
    justifyContent: 'center', alignItems: 'center',
  },
  newPlaylistCancel: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#FFF0F0',
    justifyContent: 'center', alignItems: 'center',
  },
  playlistPickerRow: { flexDirection: 'row-reverse', gap: 8, alignItems: 'center' },
  newPlaylistBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: C.primarySoft,
    justifyContent: 'center', alignItems: 'center',
  },
  selectedPlaylistBadge: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    backgroundColor: C.softGold, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    marginTop: 10, alignSelf: 'flex-start',
  },
  selectedPlaylistText: { fontSize: 12, fontWeight: '700', color: C.accent },
  autoFillBadge: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
    backgroundColor: C.softGold, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  autoFillText: { fontSize: 10, fontWeight: '700', color: C.accent },

  videoPicker: {
    borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: C.borderLight,
    overflow: 'hidden', backgroundColor: '#FAFBFA',
  },
  videoPickerEmpty: { alignItems: 'center', padding: 24, gap: 6 },
  videoPickerIconEmpty: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: C.softGreen,
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  videoPickerSelected: {
    flexDirection: 'row-reverse', alignItems: 'center', padding: 16, gap: 12,
  },
  videoPickerIconSelected: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: C.successSoft,
    justifyContent: 'center', alignItems: 'center',
  },
  videoPickerInfo: { flex: 1, alignItems: 'flex-end' },
  videoPickerTitle: { fontSize: 14, fontWeight: '700', color: C.textPrimary, marginBottom: 2 },
  videoPickerHint: { fontSize: 11, color: C.textSecondary },

  submitBtn: {
    backgroundColor: C.accent, borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
    ...Platform.select({
      ios: { shadowColor: C.accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  submitRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  submitBtnText: { color: C.white, fontSize: 16, fontWeight: 'bold' },
});
