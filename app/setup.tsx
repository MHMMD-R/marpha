import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Image, Modal, Keyboard } from 'react-native';
import { CustomAlert as Alert } from '@/components/CustomAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Ionicons } from '@expo/vector-icons';

const IRAQI_GOVERNORATES = [
  'بغداد', 'البصرة', 'نينوى', 'أربيل', 'السليمانية', 'دهوك',
  'كركوك', 'صلاح الدين', 'الأنبار', 'بابل', 'ديالى', 'كربلاء',
  'واسط', 'ميسان', 'ذي قار', 'القادسية', 'المثنى', 'النجف'
];

const ARABIC_MONTHS = [
  'كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران',
  'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'
];

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const YEARS = Array.from({ length: 100 }, (_, i) => String(new Date().getFullYear() - 10 - i)); 

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

export default function SetupScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [activePicker, setActivePicker] = useState<'day' | 'month' | 'year' | null>(null);
  
  const [governorate, setGovernorate] = useState('بغداد');
  const [showGovPicker, setShowGovPicker] = useState(false);
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
          if (data.dob) {
            const parts = data.dob.split('/');
            if (parts.length === 3) {
              setDobYear(parts[0]);
              const mIndex = parseInt(parts[1], 10) - 1;
              if (mIndex >= 0 && mIndex < 12) setDobMonth(ARABIC_MONTHS[mIndex]);
              setDobDay(parts[2]);
            }
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
  }, [router]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال اسمك الكامل');
      return;
    }
    if (!dobDay || !dobMonth || !dobYear) {
      Alert.alert('تنبيه', 'يرجى استكمال تاريخ ميلادك');
      return;
    }

    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('غير مصرح لك');

      const monthIndex = String(ARABIC_MONTHS.indexOf(dobMonth) + 1).padStart(2, '0');
      const dobFormatted = `${dobYear}/${monthIndex}/${dobDay}`;

      await updateDoc(doc(db, 'students', user.uid), {
        name: name.trim(),
        dob: dobFormatted,
        governorate: governorate,
        isSetupComplete: true,
      });

      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('خطأ أثناء الحفظ', err.message);
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
      <KeyboardAvoidingView 
        style={{ flex: 1, paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <View style={styles.header}>
            <Image 
              source={require('../assets/images/logo-new.jpg')} 
              style={{ width: 100, height: 100, borderRadius: 20, marginBottom: 16 }} 
              resizeMode="contain" 
            />
            <Text style={styles.headerTitle}>أهلاً بك في معرفة اكاديمي 🎉</Text>
            <Text style={styles.headerSubtitle}>لنقم بإعداد حسابك بخطوات بسيطة لنوفر لك أفضل تجربة تعليمية.</Text>
          </View>

          <View style={styles.card}>
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

            {/* Governorate Custom Picker */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>المحافظة</Text>
              <TouchableOpacity
                style={styles.inputWrapper}
                onPress={() => setShowGovPicker(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.input, { justifyContent: 'center' }]}>
                  <Text style={{ fontSize: 15, color: C.textPrimary, textAlign: 'right' }}>
                    {governorate || 'اختر المحافظة'}
                  </Text>
                </View>
                <View style={[styles.inputIcon, { borderLeftWidth: 0, borderRightWidth: 1 }]}>
                  <Ionicons name="location-outline" size={18} color={C.textSecondary} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Custom Governorate Modal */}
            <Modal visible={showGovPicker} transparent animationType="fade">
              <TouchableOpacity 
                style={styles.modalOverlay} 
                activeOpacity={1} 
                onPress={() => setShowGovPicker(false)}
              >
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={() => setShowGovPicker(false)}>
                      <Ionicons name="close" size={24} color={C.textSecondary} />
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>اختر المحافظة</Text>
                    <View style={{ width: 24 }} />
                  </View>
                  <ScrollView style={{ maxHeight: 300 }}>
                    {IRAQI_GOVERNORATES.map((gov, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.govItem,
                          governorate === gov && styles.govItemSelected
                        ]}
                        onPress={() => {
                          setGovernorate(gov);
                          setShowGovPicker(false);
                        }}
                      >
                        <View style={{ width: 24, alignItems: 'center' }}>
                          {governorate === gov && (
                            <Ionicons name="checkmark-circle" size={20} color={C.primary} />
                          )}
                        </View>
                        <Text style={[
                          styles.govItemText,
                          governorate === gov && styles.govItemTextSelected
                        ]}>{gov}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </Modal>

            {/* DOB Custom Picker Boxes */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>تاريخ الميلاد</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.inputWrapper, { flex: 1, paddingHorizontal: 0 }]}
                  onPress={() => setActivePicker('year')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.input, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 0 }]}>
                    <Text style={{ fontSize: 15, color: dobYear ? C.textPrimary : C.textSubtle }}>
                      {dobYear || 'السنة'}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.inputWrapper, { flex: 1.5, paddingHorizontal: 0 }]}
                  onPress={() => setActivePicker('month')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.input, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 0 }]}>
                    <Text style={{ fontSize: 15, color: dobMonth ? C.textPrimary : C.textSubtle }}>
                      {dobMonth || 'الشهر'}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.inputWrapper, { flex: 1, paddingHorizontal: 0 }]}
                  onPress={() => setActivePicker('day')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.input, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 0 }]}>
                    <Text style={{ fontSize: 15, color: dobDay ? C.textPrimary : C.textSubtle }}>
                      {dobDay || 'اليوم'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Custom DOB Modal */}
            <Modal visible={activePicker !== null} transparent animationType="fade">
              <TouchableOpacity 
                style={styles.modalOverlay} 
                activeOpacity={1} 
                onPress={() => setActivePicker(null)}
              >
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={() => setActivePicker(null)}>
                      <Ionicons name="close" size={24} color={C.textSecondary} />
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>
                      {activePicker === 'day' ? 'اختر اليوم' : activePicker === 'month' ? 'اختر الشهر' : 'اختر السنة'}
                    </Text>
                    <View style={{ width: 24 }} />
                  </View>
                  <ScrollView style={{ maxHeight: 300 }}>
                    {(activePicker === 'day' ? DAYS : activePicker === 'month' ? ARABIC_MONTHS : YEARS).map((item, index) => {
                      const isSelected = activePicker === 'day' ? dobDay === item : activePicker === 'month' ? dobMonth === item : dobYear === item;
                      return (
                        <TouchableOpacity
                          key={index}
                          style={[styles.govItem, isSelected && styles.govItemSelected, { justifyContent: 'center' }]}
                          onPress={() => {
                            if (activePicker === 'day') setDobDay(item);
                            else if (activePicker === 'month') setDobMonth(item);
                            else if (activePicker === 'year') setDobYear(item);
                            setActivePicker(null);
                          }}
                        >
                          <Text style={[styles.govItemText, isSelected && styles.govItemTextSelected, { marginLeft: 0 }]}>{item}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </Modal>

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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: C.white,
    borderRadius: 20,
    width: '100%',
    overflow: 'hidden',
    paddingVertical: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.textPrimary,
  },
  govItem: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  govItemSelected: {
    backgroundColor: C.softGreen,
  },
  govItemText: {
    fontSize: 16,
    color: C.textPrimary,
    marginLeft: 12,
  },
  govItemTextSelected: {
    color: C.primary,
    fontWeight: '700',
  },
});
