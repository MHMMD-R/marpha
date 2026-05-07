import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert as NativeAlert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '../components/BackButton';
import { PlaylistCard, PlaylistModal } from '../components/PlaylistUI';
import { auth, db } from '../firebase';
import { pickSingleImage, pickSingleVideo } from '../utils/mediaPicker';
import { uploadR2File } from '../utils/r2Upload';

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
  const [canUpload, setCanUpload] = useState(false);
  const [playlistMeta, setPlaylistMeta] = useState<Record<string, any>>({});
  const [selectedPlaylist, setSelectedPlaylist] = useState<{ name: string; lectures: any[]; themeIndex: number; overrideThumbnail?: string } | null>(null);

  // Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [lectureTitle, setLectureTitle] = useState('');
  const [lectureDescription, setLectureDescription] = useState('');
  const [playlistName, setPlaylistName] = useState('');
  const [isCreatingNewPlaylist, setIsCreatingNewPlaylist] = useState(false);
  const [newPlaylistInput, setNewPlaylistInput] = useState('');
  const [playlistThumbnailFile, setPlaylistThumbnailFile] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [selectedSubject, setSelectedSubject] = useState(IRAQI_SUBJECTS[0]);
  const [subjectAutoFilled, setSubjectAutoFilled] = useState(false);
  const [lectureFile, setLectureFile] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [computedDuration, setComputedDuration] = useState(''); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    // Fetch Teacher's Subject First
    getDoc(doc(db, 'teachers', user.uid)).then((d) => {
      if (d.exists() && d.data().subject) {
        const teacherSubject = d.data().subject;
        if (IRAQI_SUBJECTS.includes(teacherSubject)) {
          setSelectedSubject(teacherSubject);
        }
      }
    }).catch(console.error);

    const unsubTeacher = onSnapshot(
      doc(db, 'teachers', user.uid),
      (d) => {
        if (d.exists()) {
          setCanUpload(d.data().canUploadLectures === true);
        }
      },
      (error) => {
        console.error('Error fetching teacher upload permission:', error);
        setCanUpload(false);
      }
    );

    const q = query(collection(db, 'lectures'), where('teacherId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLectures = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort in memory by creation time (Newest first)
      fetchedLectures.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      setLectures(fetchedLectures);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching lectures:', error);
      setLoading(false);
    });

    const unsubscribeMeta = onSnapshot(
      query(collection(db, 'playlist_metadata'), where('teacherId', '==', user.uid)),
      (snap) => {
        const meta: Record<string, any> = {};
        snap.forEach(doc => {
          const d = doc.data();
          meta[d.name] = d;
        });
        setPlaylistMeta(meta);
      },
      (error) => {
        console.error('Error fetching playlist metadata:', error);
      }
    );

    return () => { unsubscribe(); unsubTeacher(); unsubscribeMeta(); };
  }, []);

  const handleDeleteLecture = (lectureId: string) => {
    NativeAlert.alert(
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
              setLectures(prev => prev.filter((lecture: any) => lecture.id !== lectureId));
              setSelectedPlaylist(prev => {
                if (!prev) return prev;
                const refreshedLectures = prev.lectures.filter((lecture: any) => lecture.id !== lectureId);
                return refreshedLectures.length > 0
                  ? { ...prev, lectures: refreshedLectures }
                  : null;
              });
            } catch (error: any) {
              NativeAlert.alert('خطأ', 'حدث خطأ أثناء الحذف: ' + error.message);
            }
          }
        }
      ]
    );
  };

  const handlePickVideo = async () => {
    if (isSubmitting) {
      return;
    }

    try {
      const result = await pickSingleVideo();

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
      console.error('Video picker error:', e);
      NativeAlert.alert('خطأ', 'تعذر اختيار الفيديو. حاول مرة أخرى.');
    }
  };

  const handleAddLecture = async () => {
    if (isSubmitting) {
      return;
    }

    if (!lectureTitle.trim() || !lectureFile) {
      NativeAlert.alert('تنبيه', 'الرجاء إدخال العنوان واختيار ملف الفيديو');
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      NativeAlert.alert('خطأ', 'يجب تسجيل الدخول قبل رفع المحاضرة.');
      return;
    }

    setIsSubmitting(true);
    try {
      const videoUrl = await uploadR2File({
        uri: lectureFile.uri,
        fileName: lectureFile.fileName,
        mimeType: lectureFile.mimeType || 'video/mp4',
        bucketType: 'LECTURES',
        folder: `requests_${user.uid}`,
        fallbackFileName: `video_${Date.now()}.mp4`,
        errorLabel: 'رفع الفيديو',
      });

      let playlistThumbnailUrl = '';
      let thumbnailWarning = false;
      if (playlistThumbnailFile) {
        try {
          playlistThumbnailUrl = await uploadR2File({
            uri: playlistThumbnailFile.uri,
            fileName: playlistThumbnailFile.fileName,
            mimeType: playlistThumbnailFile.mimeType || 'image/jpeg',
            bucketType: 'PLAYLIST_THUMBNAIL',
            folder: `requests_${user.uid}`,
            fallbackFileName: `thumb_${Date.now()}.jpg`,
            errorLabel: 'رفع غلاف القائمة',
          });
        } catch (thumbnailError) {
          thumbnailWarning = true;
          console.warn('Playlist thumbnail upload failed:', thumbnailError);
        }
      }

      await addDoc(collection(db, 'lectures'), {
        title: lectureTitle.trim(),
        description: lectureDescription.trim(),
        playlistName: playlistName.trim() || 'محاضرات أخرى',
        playlistThumbnailUrl: playlistThumbnailUrl,
        subject: selectedSubject,
        videoUrl,
        duration: computedDuration || 'غير محدد',
        teacherId: user.uid,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      resetLectureForm();
      NativeAlert.alert(
        'نجاح',
        thumbnailWarning
          ? 'تم إرسال طلب المحاضرة بنجاح، لكن تعذر رفع غلاف القائمة وتم إرسالها بدون غلاف.'
          : 'تم إرسال طلب المحاضرة بنجاح.'
      );
    } catch (error: any) {
      console.error('Error adding lecture:', error);
      NativeAlert.alert('خطأ', error.message || 'حدث خطأ أثناء إضافة المحاضرة.');
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

    const result: PlaylistGroup[] = Object.entries(groupMap).map(([name, lecs]) => {
      const meta = playlistMeta[name];
      let sortedLectures = [...lecs];
      
      if (meta && meta.lectureOrder && Array.isArray(meta.lectureOrder)) {
        sortedLectures.sort((a, b) => {
          const idxA = meta.lectureOrder.indexOf(a.id);
          const idxB = meta.lectureOrder.indexOf(b.id);
          if (idxA === -1 && idxB === -1) return 0;
          if (idxA === -1) return 1;
          if (idxB === -1) return -1;
          return idxA - idxB;
        });
      }

      return {
        name,
        lectures: sortedLectures,
        isExpanded: false,
      };
    });

    // Sort playlists by the newest lecture in each
    result.sort((a, b) => {
      const newestA = Math.max(...a.lectures.map(l => l.createdAt?.toMillis ? l.createdAt.toMillis() : 0));
      const newestB = Math.max(...b.lectures.map(l => l.createdAt?.toMillis ? l.createdAt.toMillis() : 0));
      return newestB - newestA;
    });

    if (ungrouped.length > 0) {
      result.push({
        name: 'محاضرات أخرى',
        lectures: ungrouped,
        isExpanded: false,
      });
    }

    return result;
  })();

  // Replaced with YouTube-style PlaylistCard — expandedPlaylists & togglePlaylist no longer needed

  // Replaced renderLectureCard and renderPlaylistGroup with YouTube-style PlaylistCard
  const existingPlaylistNames = Array.from(new Set(
    lectures
      .filter((l: any) => l.playlistName && l.playlistName !== 'محاضرات أخرى')
      .map((l: any) => l.playlistName)
  ));

  const resetLectureForm = () => {
    setIsModalVisible(false);
    setLectureTitle('');
    setLectureDescription('');
    setPlaylistName('');
    setPlaylistThumbnailFile(null);
    setLectureFile(null);
    setComputedDuration('');
    setIsCreatingNewPlaylist(false);
    setNewPlaylistInput('');
    setSubjectAutoFilled(false);
  };

  return (
    <View style={styles.wrapper}>
      {/* Background layers */}
      <View style={styles.topBgLayer} />
      <View style={styles.topBgGlow} />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <BackButton />

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerSubtitle}>إدارة المحاضرات</Text>
            <Text style={styles.headerTitle}>محاضراتي</Text>
          </View>

          <TouchableOpacity 
             style={[styles.addBtn, !canUpload && { opacity: 0.5 }]} 
             activeOpacity={0.8} 
             onPress={() => {
               if (!canUpload) {
                 NativeAlert.alert("No upload permission", "ليس لديك صلاحية لرفع المحاضرات. يرجى التواصل مع الإدارة.");
                 return;
               }
               setIsModalVisible(true);
             }}
          >
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
              {playlists.map((playlist, pIdx) => (
                <PlaylistCard
                  key={playlist.name}
                  name={playlist.name}
                  lectures={playlist.lectures}
                  index={pIdx}
                  teacherName={selectedSubject}
                  onPress={() => setSelectedPlaylist({ name: playlist.name, lectures: playlist.lectures, themeIndex: pIdx })}
                />
              ))}
              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </View>
      </SafeAreaView>

      {/* ─── Add Lecture Modal ─── */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!isSubmitting) {
            resetLectureForm();
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal handle */}
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={resetLectureForm}
                disabled={isSubmitting}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={C.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>طلب رفع محاضرة</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
              <View style={styles.formSection}>
                <View style={styles.formSectionHeader}>
                  <View style={[styles.formSectionIcon, { backgroundColor: C.softGold }]}>
                    <Ionicons name="folder-open" size={20} color={C.accent} />
                  </View>
                  <View style={styles.formSectionTitleWrap}>
                    <Text style={styles.formSectionTitle}>إنشاء قائمة تشغيل</Text>
                    <Text style={styles.formSectionSubtitle}>اختر قائمة موجودة أو جهّز قائمة جديدة للمحاضرة</Text>
                  </View>
                  <View style={styles.formSectionBadge}>
                    <Text style={styles.formSectionBadgeText}>1</Text>
                  </View>
                </View>

                {isCreatingNewPlaylist ? (
                  <View style={styles.newPlaylistContainer}>
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

                    <TouchableOpacity
                      style={styles.thumbnailPickerBtn}
                      activeOpacity={0.7}
                      onPress={async () => {
                        try {
                          const result = await pickSingleImage({
                            allowsEditing: true,
                            aspect: [16, 9],
                          });
                          if (!result.canceled && result.assets && result.assets.length > 0) {
                            setPlaylistThumbnailFile(result.assets[0]);
                          }
                        } catch (e) {
                          console.error('Playlist thumbnail picker error:', e);
                          NativeAlert.alert('خطأ', 'حدث خطأ أثناء تحديد الصورة.');
                        }
                      }}
                    >
                      {playlistThumbnailFile ? (
                        <View style={styles.thumbnailSelectedRow}>
                          <Ionicons name="image" size={16} color={C.success} />
                          <Text style={styles.thumbnailSelectedText} numberOfLines={1}>
                            {playlistThumbnailFile.fileName || 'تم تحديد الغلاف'}
                          </Text>
                          <Ionicons name="close-circle" size={16} color={C.danger} onPress={() => setPlaylistThumbnailFile(null)} />
                        </View>
                      ) : (
                        <View style={styles.thumbnailEmptyRow}>
                          <Ionicons name="image-outline" size={16} color={C.primary} />
                          <Text style={styles.thumbnailEmptyText}>إضافة غلاف للقائمة (اختياري)</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.playlistPickerRow}>
                    <View style={[styles.input, { flex: 1, paddingHorizontal: 0, paddingVertical: 0 }]}>
                      <Picker
                        selectedValue={playlistName}
                        onValueChange={(itemValue) => {
                          setPlaylistName(itemValue);
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
                        {existingPlaylistNames.map((name: string, idx: number) => (
                          <Picker.Item key={idx} label={name} value={name} color={C.textPrimary} />
                        ))}
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

              <View style={styles.formSection}>
                <View style={styles.formSectionHeader}>
                  <View style={[styles.formSectionIcon, { backgroundColor: C.softGreen }]}>
                    <Ionicons name="videocam" size={20} color={C.primary} />
                  </View>
                  <View style={styles.formSectionTitleWrap}>
                    <Text style={styles.formSectionTitle}>إنشاء فيديو</Text>
                    <Text style={styles.formSectionSubtitle}>أدخل تفاصيل المحاضرة ثم اختر ملف الفيديو</Text>
                  </View>
                  <View style={styles.formSectionBadge}>
                    <Text style={styles.formSectionBadgeText}>2</Text>
                  </View>
                </View>

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

                <View style={[styles.inputGroup, { marginBottom: 0 }]}>
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

      {/* Playlist Expanded Modal */}
      {selectedPlaylist && (() => {
        // Always compute live lectures from the current `playlists` array — avoids stale data after a delete
        const liveLectures = playlists.find(p => p.name === selectedPlaylist.name)?.lectures ?? selectedPlaylist.lectures;
        return (
          <PlaylistModal
            visible={!!selectedPlaylist}
            onClose={() => setSelectedPlaylist(null)}
            name={selectedPlaylist.name}
            lectures={liveLectures}
            teacherName={selectedSubject}
            themeIndex={selectedPlaylist.themeIndex}
            isTeacherMode={true}
            onAddPress={() => {
              if (!canUpload) {
                NativeAlert.alert("No upload permission", "ليس لديك صلاحية لرفع المحاضرات. يرجى التواصل مع الإدارة.");
                return;
              }
              setPlaylistName(selectedPlaylist.name);
              setIsModalVisible(true);
            }}
            onSettingsPress={() => {
              router.push({ pathname: '/manage_playlist/[name]', params: { name: selectedPlaylist.name } } as any);
            }}
            renderLectureRight={(lecture) => (
              <TouchableOpacity
                onPress={() => handleDeleteLecture(lecture.id)}
                style={styles.deleteBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={18} color={C.danger} />
              </TouchableOpacity>
            )}
          />
        );
      })()}
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
    flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginBottom: 20, flexWrap: 'wrap',
    justifyContent: 'flex-end'
  },
  statPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 24,
  },
  statPillText: { fontSize: 13, fontWeight: '800', color: C.white },

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
  playlistContainer: { marginBottom: 16 },
  playlistHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.white, borderRadius: 20, padding: 12,
    borderWidth: 1, borderColor: C.borderLight,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 3 },
    }),
  },
  playlistTitleArea: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  playlistIcon: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: C.softGold,
    justifyContent: 'center', alignItems: 'center',
  },
  playlistTitleWrap: { flex: 1 },
  playlistTitleText: { fontSize: 16, fontWeight: '800', color: C.textPrimary, textAlign: 'right' },
  playlistSubtitle: { fontSize: 12, color: C.textSecondary, fontWeight: '600', marginTop: 2, textAlign: 'right' },
  playlistActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  manageBtn: {
    backgroundColor: C.accent,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    ...Platform.select({
      ios: { shadowColor: C.accent, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  manageBtnText: { fontSize: 13, fontWeight: '800', color: C.white },
  expandBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: C.softGreen,
    justifyContent: 'center', alignItems: 'center',
  },
  playlistLectures: {
    marginTop: 10, paddingRight: 16,
    borderRightWidth: 3, borderRightColor: C.softGold,
  },

  // ─── Lecture Card ───
  lectureCard: {
    backgroundColor: C.white, borderRadius: 20, overflow: 'hidden', marginBottom: 12,
    flexDirection: 'row',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12 },
      android: { elevation: 3 },
    }),
  },
  cardStrip: { width: 6 },
  cardBody: { flex: 1, padding: 16 },
  lectureMainRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  lectureIconArea: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: C.softGreen,
    justifyContent: 'center', alignItems: 'center',
  },
  lectureTextContent: { flex: 1 },
  lectureTitle: {
    fontSize: 15, fontWeight: '800', color: C.textPrimary,
    textAlign: 'right', marginBottom: 6,
  },
  lecturePillRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  metaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F8FAF9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  metaPillText: { fontSize: 11, fontWeight: '700', color: C.textSecondary },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '800' },
  deleteBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#FFF0F0',
    justifyContent: 'center', alignItems: 'center',
  },

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
  formSection: {
    backgroundColor: '#FAFBFA',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.borderLight,
    padding: 16,
    marginBottom: 16,
  },
  formSectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  formSectionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formSectionTitleWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: C.textPrimary,
    textAlign: 'right',
  },
  formSectionSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: C.textSecondary,
    marginTop: 3,
    textAlign: 'right',
  },
  formSectionBadge: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formSectionBadgeText: {
    color: C.white,
    fontSize: 13,
    fontWeight: '900',
  },
  inputGroup: { marginBottom: 20 },
  inputLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
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
  newPlaylistContainer: { gap: 10 },
  newPlaylistRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  thumbnailPickerBtn: {
    backgroundColor: C.softGold, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: C.borderLight, borderStyle: 'dashed'
  },
  thumbnailEmptyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  thumbnailEmptyText: { fontSize: 13, color: C.primary, fontWeight: '600' },
  thumbnailSelectedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  thumbnailSelectedText: { fontSize: 13, color: C.success, fontWeight: '600', maxWidth: '70%' },
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
  playlistPickerRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  newPlaylistBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: C.primarySoft,
    justifyContent: 'center', alignItems: 'center',
  },
  selectedPlaylistBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.softGold, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    marginTop: 10, alignSelf: 'flex-start',
  },
  selectedPlaylistText: { fontSize: 12, fontWeight: '700', color: C.accent },
  autoFillBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
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
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
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
  submitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitBtnText: { color: C.white, fontSize: 16, fontWeight: 'bold' },
});
