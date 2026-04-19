import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Image, Modal } from 'react-native';
import { CustomAlert as Alert } from '@/components/CustomAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateEmail, updatePassword } from 'firebase/auth';
import { auth, db, storage } from '../firebase';
import { Ionicons } from '@expo/vector-icons';

const IRAQI_GOVERNORATES = [
  'بغداد', 'البصرة', 'نينوى', 'أربيل', 'السليمانية', 'دهوك',
  'كركوك', 'صلاح الدين', 'الأنبار', 'بابل', 'ديالى', 'كربلاء',
  'واسط', 'ميسان', 'ذي قار', 'القادسية', 'المثنى', 'النجف'
];

const C = {
  bgMain: '#F4F7F6',
  topOverlay: '#0B2923',
  primary: '#12453D',
  primarySoft: '#2E5E55',
  accent: '#E3A736',
  white: '#FFFFFF',
  textPrimary: '#10241F',
  textSecondary: '#8A9E99',
  textSubtle: '#97AEA9',
  borderLight: '#E8EDEC',
  softGreen: '#EEF5F3',
};

const formatDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
};

export default function SetupScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [dob, setDob] = useState('');
  const [dobDate, setDobDate] = useState(new Date(2005, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [governorate, setGovernorate] = useState('بغداد');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [existingImage, setExistingImage] = useState<string | null>(null);
  const [originalUsername, setOriginalUsername] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) {
        router.replace('/login');
        return;
      }
      try {
        const studentDoc = await getDoc(doc(db, 'students', user.uid));
        if (studentDoc.exists()) {
          const data = studentDoc.data();
          if (data.name && !data.name.includes('طالب')) {
            setName(data.name);
          }
          if (data.username) {
            setUsername(data.username);
            setOriginalUsername(data.username);
          } else if (data.email) {
            const uname = data.email.replace('@marpha.app', '');
            setUsername(uname);
            setOriginalUsername(uname);
          }
          if (data.image) setExistingImage(data.image);
          if (data.dob) {
            setDob(data.dob);
            const parsed = new Date(data.dob);
            if (!isNaN(parsed.getTime())) setDobDate(parsed);
          }
          if (data.governorate) setGovernorate(data.governorate);
        }
      } catch (err) {
        console.error('Error fetching student data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadProfileImage = async (uri: string, uid: string) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const storageRef = ref(storage, `profiles/${uid}.jpg`);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDobDate(selectedDate);
      setDob(formatDate(selectedDate));
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال اسمك اللطيف');
      return;
    }
    if (!username.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم المستخدم');
      return;
    }
    if (newPassword && newPassword.length < 6) {
      Alert.alert('تنبيه', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (!dob.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال تاريخ ميلادك');
      return;
    }

    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('غير مصرح لك');

      const trimmedUsername = username.trim().toLowerCase();
      const newEmail = `${trimmedUsername.replace(/\s+/g, '_')}@marpha.app`;

      // Update Firebase Auth email if username changed
      if (trimmedUsername !== originalUsername) {
        await updateEmail(user, newEmail);
      }

      // Update Firebase Auth password if provided
      if (newPassword) {
        await updatePassword(user, newPassword);
      }

      let finalImageUrl = existingImage;
      if (imageUri) {
        finalImageUrl = await uploadProfileImage(imageUri, user.uid);
      } else if (!finalImageUrl && name) {
        finalImageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=12453D&color=fff`;
      }

      await updateDoc(doc(db, 'students', user.uid), {
        name: name.trim(),
        username: trimmedUsername,
        email: newEmail,
        ...(newPassword ? { password: newPassword } : {}),
        dob: dob.trim(),
        governorate: governorate,
        image: finalImageUrl,
        isSetupComplete: true,
      });

      router.replace('/(tabs)');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        Alert.alert('خطأ', 'اسم المستخدم مستخدم بالفعل، يرجى اختيار اسم آخر');
      } else if (err.code === 'auth/requires-recent-login') {
        Alert.alert('تنبيه', 'يرجى تسجيل الخروج وإعادة الدخول لتغيير بيانات تسجيل الدخول');
      } else {
        Alert.alert('خطأ أثناء الحفظ', err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <View style={styles.header}>
            <Text style={styles.headerTitle}>أهلاً بك في معرفة 🎉</Text>
            <Text style={styles.headerSubtitle}>لنقم بإعداد حسابك بخطوات بسيطة لنوفر لك أفضل تجربة تعليمية.</Text>
          </View>

          <View style={styles.card}>
            {/* Image Picker */}
            <View style={styles.imageSection}>
              <TouchableOpacity style={styles.imageContainer} onPress={pickImage} activeOpacity={0.8}>
                {imageUri || existingImage ? (
                  <Image source={{ uri: imageUri || existingImage! }} style={styles.profileImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="camera" size={32} color={C.textSecondary} />
                  </View>
                )}
                <View style={styles.editIconBadge}>
                  <Ionicons name="pencil" size={14} color={C.white} />
                </View>
              </TouchableOpacity>
              <Text style={styles.imageLabel}>اختر صورة ملفك الشخصي</Text>
            </View>

            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>الاسم الكامل</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="محمد أحمد علي"
                  placeholderTextColor={C.textSubtle}
                  value={name}
                  onChangeText={setName}
                  textAlign="right"
                />
                <View style={styles.inputIcon}>
                  <Ionicons name="person-outline" size={18} color={C.textSecondary} />
                </View>
              </View>
            </View>

            {/* Username Input */}
            <View style={[styles.inputGroup, { marginBottom: 16 }]}>
              <Text style={styles.inputLabel}>اسم المستخدم</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="مثال: ahmed 123"
                  placeholderTextColor={C.textSubtle}
                  value={username}
                  onChangeText={setUsername}
                  textAlign="right"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <View style={styles.inputIcon}>
                  <Ionicons name="at-outline" size={18} color={C.textSecondary} />
                </View>
              </View>
              <Text style={{ fontSize: 11, color: C.textSecondary, textAlign: 'right', marginTop: 6 }}>
                * يستخدم هذا الاسم لتسجيل الدخول بأمان، نعرض اسمك الكامل للزملاء والمعلمين. والمساحات مدعومة.
              </Text>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>كلمة المرور الجديدة (اختياري)</Text>
              <View style={styles.inputWrapper}>
                <TouchableOpacity
                  style={{ width: 44, height: 52, justifyContent: 'center', alignItems: 'center' }}
                  onPress={() => setPasswordVisible(!passwordVisible)}
                >
                  <Ionicons
                    name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={C.textSecondary}
                  />
                </TouchableOpacity>
                <TextInput
                  style={styles.input}
                  placeholder="اتركه فارغاً للاحتفاظ بكلمة المرور الحالية"
                  placeholderTextColor={C.textSubtle}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!passwordVisible}
                  textAlign="right"
                  autoCapitalize="none"
                />
                <View style={styles.inputIcon}>
                  <Ionicons name="lock-closed-outline" size={18} color={C.textSecondary} />
                </View>
              </View>
            </View>

            {/* DOB Date Picker */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>تاريخ الميلاد</Text>
              <TouchableOpacity
                style={styles.inputWrapper}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.input, { justifyContent: 'center' }]}>
                  <Text style={{ fontSize: 15, color: dob ? C.textPrimary : C.textSubtle, textAlign: 'right' }}>
                    {dob || 'اختر تاريخ الميلاد'}
                  </Text>
                </View>
                <View style={styles.inputIcon}>
                  <Ionicons name="calendar-outline" size={18} color={C.textSecondary} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Android DatePicker (inline) */}
            {showDatePicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={dobDate}
                mode="date"
                display="default"
                maximumDate={new Date()}
                minimumDate={new Date(1990, 0, 1)}
                onChange={onDateChange}
              />
            )}

            {/* iOS DatePicker (modal) */}
            {Platform.OS === 'ios' && (
              <Modal visible={showDatePicker} transparent animationType="slide">
                <TouchableOpacity 
                  style={styles.datePickerOverlay} 
                  activeOpacity={1} 
                  onPress={() => setShowDatePicker(false)}
                >
                  <TouchableOpacity 
                    activeOpacity={1} 
                    style={styles.datePickerContainer}
                  >
                    <View style={styles.datePickerHeader}>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: C.primary }}>تم</Text>
                      </TouchableOpacity>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: C.textPrimary }}>تاريخ الميلاد</Text>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: C.textSecondary }}>إلغاء</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={dobDate}
                      mode="date"
                      display="spinner"
                      themeVariant="light"
                      textColor={C.textPrimary}
                      maximumDate={new Date()}
                      minimumDate={new Date(1990, 0, 1)}
                      onChange={onDateChange}
                      style={{ height: 200 }}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              </Modal>
            )}

            {/* Governorate Picker */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>المحافظة</Text>
              <View style={[styles.inputWrapper, { paddingHorizontal: 0 }]}>
                <Picker
                  selectedValue={governorate}
                  onValueChange={(itemValue) => setGovernorate(itemValue)}
                  style={styles.picker}
                  dropdownIconColor={C.textSecondary}
                >
                  {IRAQI_GOVERNORATES.map((gov, index) => (
                    <Picker.Item key={index} label={gov} value={gov} />
                  ))}
                </Picker>
                <View style={[styles.inputIcon, { borderLeftWidth: 0, borderRightWidth: 1 }]}>
                  <Ionicons name="location-outline" size={18} color={C.textSecondary} />
                </View>
              </View>
            </View>

          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={C.white} size="small" />
            ) : (
              <Text style={styles.saveBtnText}>إكمال التسجيل</Text>
            )}
          </TouchableOpacity>

          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bgMain,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 40,
    paddingBottom: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: C.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: C.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 4,
    marginBottom: 24,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: C.softGreen,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: C.borderLight,
    marginBottom: 12,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 47,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 47,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: C.accent,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: C.white,
  },
  imageLabel: {
    fontSize: 13,
    color: C.textSecondary,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 8,
    textAlign: 'right',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bgMain,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  input: {
    flex: 1,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 15,
    color: C.textPrimary,
  },
  inputIcon: {
    width: 48,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: C.borderLight,
  },
  picker: {
    flex: 1,
    height: 52,
    color: C.textPrimary,
    ...(Platform.OS === 'android' && { direction: 'rtl' })
  },
  saveBtn: {
    backgroundColor: C.primary,
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  saveBtnText: {
    color: C.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  datePickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  datePickerContainer: {
    backgroundColor: C.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
});
