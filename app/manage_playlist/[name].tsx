import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Image, KeyboardAvoidingView, Platform, Alert, ScrollView, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../firebase';
import { BackButton } from '../../components/BackButton';
import { collection, doc, getDocs, query, where, setDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView, TouchableWithoutFeedback } from 'react-native-gesture-handler';
import { pickSingleImage } from '../../utils/mediaPicker';
import { uploadR2File } from '../../utils/r2Upload';

const C = {
  bgMain: '#F4F7F6',
  primary: '#12453D',
  primarySoft: '#2E5E55',
  accent: '#E3A736',
  white: '#FFFFFF',
  textPrimary: '#10241F',
  textSecondary: '#8A9E99',
  borderLight: '#E8EDEC',
  danger: '#FF3B30',
  success: '#10B981',
  softGold: '#FFF8E8',
};

export default function ManagePlaylistScreen() {
  const router = useRouter();
  const { name } = useLocalSearchParams();
  const playlistName = typeof name === 'string' ? name : '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // States
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [localImage, setLocalImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  
  const [lectures, setLectures] = useState<any[]>([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useEffect(() => {
    fetchData();
  }, [playlistName]);

  const fetchData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // 1. Fetch metadata if exists
      const metaQuery = query(collection(db, 'playlist_metadata'), where('teacherId', '==', user.uid), where('name', '==', playlistName));
      const metaSnap = await getDocs(metaQuery);
      
      let existingOrder: string[] = [];
      if (!metaSnap.empty) {
        const meta = metaSnap.docs[0].data();
        setDescription(meta.description || '');
        setThumbnailUrl(meta.thumbnailUrl || null);
        existingOrder = meta.lectureOrder || [];
      }

      // 2. Fetch lectures
      const lecQuery = query(collection(db, 'lectures'), where('teacherId', '==', user.uid), where('playlistName', '==', playlistName));
      const lecSnap = await getDocs(lecQuery);
      let fetchedLecs: any[] = lecSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // 3. Apply existing sort order
      if (existingOrder.length > 0) {
        fetchedLecs.sort((a, b) => {
          const idxA = existingOrder.indexOf(a.id);
          const idxB = existingOrder.indexOf(b.id);
          if (idxA === -1 && idxB === -1) return 0;
          if (idxA === -1) return 1;
          if (idxB === -1) return -1;
          return idxA - idxB;
        });
      }

      // If no explicit thumbnail in metadata, fallback to looking for one in the lectures to prefill
      if (metaSnap.empty && !thumbnailUrl) {
        const fall = fetchedLecs.find((l: any) => l.playlistThumbnailUrl)?.playlistThumbnailUrl;
        if (fall) setThumbnailUrl(fall);
      }

      setLectures(fetchedLecs);
    } catch (error) {
      console.error(error);
      Alert.alert('خطأ', 'فشل في تحميل تفاصيل القائمة');
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      let result = await pickSingleImage({
        allowsEditing: true,
        aspect: [16, 9],
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLocalImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Playlist image picker error:', error);
      Alert.alert('خطأ', 'تعذر اختيار صورة الغلاف.');
    }
  };

  const handleSave = async () => {
    if (saving) {
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('خطأ', 'يجب تسجيل الدخول قبل حفظ التعديلات.');
      return;
    }

    setSaving(true);
    try {
      let finalThumbUrl = thumbnailUrl;

      // Upload local image if changed
      if (localImage) {
        finalThumbUrl = await uploadR2File({
          uri: localImage.uri,
          fileName: localImage.fileName,
          mimeType: localImage.mimeType || 'image/jpeg',
          bucketType: 'PLAYLIST_THUMBNAIL',
          folder: `requests_${user.uid}`,
          fallbackFileName: `thumb_${Date.now()}.jpg`,
          errorLabel: 'رفع غلاف القائمة',
        });
      }

      const orderArr = lectures.map(l => l.id);
      
      // Save metadata
      const documentId = `${user.uid}_${playlistName.replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_')}`;
      const metaRef = doc(db, 'playlist_metadata', documentId);
      
      await setDoc(metaRef, {
        teacherId: user.uid,
        name: playlistName,
        description,
        thumbnailUrl: finalThumbUrl,
        lectureOrder: orderArr,
        updatedAt: new Date()
      }, { merge: true });

      setThumbnailUrl(finalThumbUrl);
      setLocalImage(null);
      Alert.alert('نجاح', 'تم حفظ التعديلات بنجاح');
      router.back();

    } catch (error: any) {
      console.error(error);
      Alert.alert('خطأ', error.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const renderLectureItem = ({ item, drag, isActive, getIndex }: RenderItemParams<any>) => {
    return (
      <ScaleDecorator>
        <TouchableWithoutFeedback onLongPress={drag} disabled={isActive}>
          <View style={[styles.lectureRow, isActive && styles.activeLectureRow]}>
            <View style={styles.lectureInfo}>
              <Text style={styles.lectureTitle} numberOfLines={2}>{item.title || 'بدون عنوان'}</Text>
              <Text style={styles.lectureMeta}>{item.duration || 'غير محدد'}</Text>
            </View>
            <View style={styles.dragHandle}>
              <Ionicons name="menu" size={24} color={isActive ? C.accent : C.textSecondary} />
            </View>
            <View style={styles.indexCircle}>
              <Text style={styles.indexText}>{(getIndex() ?? 0) + 1}</Text>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </ScaleDecorator>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerBg}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardAvoidingView 
        style={{ flex: 1, paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={styles.header}>
            <BackButton iconColor={C.textPrimary} bgColor={C.bgMain} />

            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerSubtitle}>إدارة قائمة</Text>
              <Text style={styles.headerTitle} numberOfLines={1}>{playlistName}</Text>
            </View>

            <View style={{ width: 44 }} />
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <Text style={styles.sectionLabel}>غلاف القائمة (Thumbnail)</Text>
            <TouchableOpacity style={styles.thumbnailBtn} activeOpacity={0.8} onPress={handlePickImage}>
              {localImage ? (
                <Image source={{ uri: localImage.uri }} style={styles.thumbnailImg} resizeMode="cover" />
              ) : thumbnailUrl ? (
                <Image source={{ uri: thumbnailUrl }} style={styles.thumbnailImg} />
              ) : (
                <View style={styles.thumbnailPlaceholder}>
                  <Ionicons name="image-outline" size={32} color={C.textSecondary} />
                  <Text style={styles.thumbnailPlaceholderText}>اختر صورة غلاف...</Text>
                </View>
              )}
              <View style={styles.thumbnailEditBadge}>
                <Ionicons name="pencil" size={12} color={C.white} />
              </View>
            </TouchableOpacity>

            <Text style={styles.sectionLabel}>وصف القائمة</Text>
            <TextInput
              style={styles.textArea}
              placeholder="اكتب وصفاً هنا..."
              value={description}
              onChangeText={setDescription}
              multiline
              textAlign="right"
              placeholderTextColor={C.textSecondary}
            />

            <View style={styles.lecturesHeader}>
              <Text style={styles.sectionLabel}>ترتيب الدروس (اسحب لتغيير الترتيب)</Text>
              <Text style={styles.lectureCountBadge}>{lectures.length} درس</Text>
            </View>
          </View>

          {/* List */}
          <View style={styles.listWrapper}>
            <DraggableFlatList
              data={lectures}
              onDragEnd={({ data }) => setLectures(data)}
              keyExtractor={(item) => item.id}
              renderItem={renderLectureItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
            />
          </View>

          {/* Footer Save */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.saveBtn} activeOpacity={0.8} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color={C.white} />
                  <Text style={styles.saveBtnText}>حفظ التعديلات</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

        </SafeAreaView>
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bgMain,
  },
  centerBg: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bgMain,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 10,
  },
  headerSubtitle: {
    fontSize: 12, fontWeight: '700', color: C.textSecondary, marginBottom: 2,
  },
  headerTitle: {
    fontSize: 16, fontWeight: '900', color: C.textPrimary, textAlign: 'center',
  },
  formContainer: {
    padding: 20,
    backgroundColor: C.white,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 14, fontWeight: '800', color: C.primary, marginBottom: 10, textAlign: 'right',
  },
  thumbnailBtn: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: C.bgMain,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.borderLight,
    borderStyle: 'dashed',
  },
  thumbnailImg: {
    width: '100%', height: '100%',
  },
  thumbnailPlaceholder: {
    alignItems: 'center', justifyContent: 'center',
  },
  thumbnailPlaceholderText: {
    fontSize: 14, fontWeight: '600', color: C.textSecondary, marginTop: 8,
  },
  thumbnailEditBadge: {
    position: 'absolute', bottom: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  textArea: {
    backgroundColor: C.bgMain,
    borderRadius: 12,
    minHeight: 80,
    padding: 14,
    fontSize: 14,
    fontWeight: '600',
    color: C.textPrimary,
    borderWidth: 1,
    borderColor: C.borderLight,
    marginBottom: 20,
  },
  lecturesHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  lectureCountBadge: {
    fontSize: 12, fontWeight: '700', color: C.white,
    backgroundColor: C.accent, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
    overflow: 'hidden',
  },
  listWrapper: {
    flex: 1,
  },
  lectureRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: C.white,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  activeLectureRow: {
    backgroundColor: C.softGold,
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 4,
    transform: [{ scale: 1.02 }],
  },
  indexCircle: {
    width: 28, alignItems: 'center', justifyContent: 'center',
  },
  indexText: {
    fontSize: 14, fontWeight: '800', color: C.textSecondary,
  },
  dragHandle: {
    width: 40, alignItems: 'center', justifyContent: 'center',
  },
  lectureInfo: {
    flex: 1,
    paddingRight: 10,
    alignItems: 'flex-end',
  },
  lectureTitle: {
    fontSize: 14, fontWeight: '700', color: C.textPrimary, textAlign: 'right', marginBottom: 4,
  },
  lectureMeta: {
    fontSize: 12, fontWeight: '600', color: C.textSecondary,
  },
  footer: {
    padding: 20,
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
  },
  saveBtn: {
    backgroundColor: C.primary,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  saveBtnText: {
    fontSize: 16, fontWeight: '800', color: C.white,
  },
});
