import { Ionicons } from '@expo/vector-icons';
import { Camera, CameraView } from 'expo-camera';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View } from 'react-native';
import { CustomAlert as Alert } from '@/components/CustomAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebase';

// Matches the app-wide palette from home & lectures screens
const C = {
  bgMain: '#F4F7F6',
  topOverlay: '#0B2923',
  topOverlaySoft: '#123B34',
  primary: '#12453D',
  primarySoft: '#2E5E55',
  accent: '#E3A736',
  accentSoft: '#FFF8E8',
  white: '#FFFFFF',
  textPrimary: '#10241F',
  textSecondary: '#8A9E99',
  textSubtle: '#97AEA9',
  borderLight: '#E8EDEC',
  softGreen: '#EEF5F3',
  surface: '#FFFFFF',
  danger: '#FF3B30',
};

export default function LoginScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [acceptedTos, setAcceptedTos] = useState(false);

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, friction: 8, tension: 45, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
    ]).start();
  }, []);

  const startScanning = async () => {
    if (!acceptedTos) {
      Alert.alert('تنبيه', 'يجب الموافقة على شروط الاستخدام وسياسة الخصوصية أولاً');
      return;
    }

    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
    if (status === 'granted') {
      setIsScanning(true);
    } else {
      Alert.alert('الصلاحيات', 'لا توجد صلاحية للوصول إلى الكاميرا');
    }
  };

  const toEmail = (u: string) => `${u.trim().toLowerCase().replace(/\s+/g, '_')}@marpha.app`;

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    setIsScanning(false);
    try {
      const parts = data.split('|');
      if (parts.length >= 2) {
        const decodedUsername = parts[0];
        const decodedPassword = parts[1];
        setUsername(decodedUsername);
        setPassword(decodedPassword);
        setIsLoading(true);
        const fakeEmail = toEmail(decodedUsername);
        const userCredential = await signInWithEmailAndPassword(auth, fakeEmail, decodedPassword);
        const user = userCredential.user;
        const teacherDoc = await getDoc(doc(db, 'teachers', user.uid));
        if (teacherDoc.exists()) {
          router.replace('/teacher_home');
        } else {
          const studentDoc = await getDoc(doc(db, 'students', user.uid));
          if (studentDoc.exists() && studentDoc.data().isSetupComplete === false) {
            router.replace('/setup');
          } else {
            router.replace('/(tabs)');
          }
        }
      } else {
        Alert.alert('خطأ', 'تنسيق الباركود غير صالح');
      }
    } catch (err: any) {
      Alert.alert('فشل تسجيل الدخول', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async () => {
    if (!acceptedTos) {
      Alert.alert('تنبيه', 'يجب الموافقة على شروط الاستخدام وسياسة الخصوصية');
      return;
    }

    if (!username || !password) {
      Alert.alert('خطأ', 'يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }
    if (!isLogin && !name) {
      Alert.alert('خطأ', 'يرجى إدخال الاسم الكامل');
      return;
    }

    setIsLoading(true);
    try {
      const fakeEmail = toEmail(username);

      if (isLogin) {
        // Login
        const userCredential = await signInWithEmailAndPassword(auth, fakeEmail, password);
        const user = userCredential.user;
        const teacherDoc = await getDoc(doc(db, 'teachers', user.uid));
        
        if (teacherDoc.exists()) {
          router.replace('/teacher_home');
        } else {
          const studentDoc = await getDoc(doc(db, 'students', user.uid));
          if (studentDoc.exists() && studentDoc.data().isSetupComplete === false) {
            router.replace('/setup');
          } else {
            router.replace('/(tabs)');
          }
        }
      } else {
        // Register (Students Only)
        const userCredential = await createUserWithEmailAndPassword(auth, fakeEmail, password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName: name });
        
        const newUserId = Math.floor(100000 + Math.random() * 900000).toString();
        
        const { getDoc } = await import('firebase/firestore');
        const freeTrialSnap = await getDoc(doc(db, "settings", "freeTrial"));
        let freeTrialObj = { isActive: false, startDate: "", endDate: "", access: { allowedTeachers: [], allowedSubjects: [] } };
        if (freeTrialSnap.exists()) {
          const ftData = freeTrialSnap.data();
          const lengthDays = ftData.defaultLengthDays || 7;
          const now = new Date();
          const endDate = new Date();
          endDate.setDate(now.getDate() + lengthDays);
          freeTrialObj = {
             isActive: true,
             startDate: now.toISOString(),
             endDate: endDate.toISOString(),
             access: ftData.defaultAccess || { allowedTeachers: [], allowedSubjects: [] }
          };
        }

        await setDoc(doc(db, "students", user.uid), {
          uid: user.uid,
          name: name,
          username: username.trim().toLowerCase(),
          email: fakeEmail,
          password: password, // For barcode sign-in functionality
          subject: "عام",
          progress: 0,
          status: "active",
          isSetupComplete: false,
          userId: newUserId,
          subscription: {
             type: 'none',
             allowedTeachers: [],
             allowedSubjects: []
          },
          freeTrial: freeTrialObj,
          createdAt: new Date().toISOString()
        });

        router.replace('/setup');
      }
    } catch (error: any) {
      Alert.alert('خطأ في المصادقة', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.topOverlay} />

      {/* Dark green top background — same curve as home screen */}
      <View style={styles.topBgLayer}>
        {/* Decorative circles like home screen */}
        <View style={styles.decoCircle1} />
        <View style={styles.decoCircle2} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>

          {/* ─── Scanner Overlay ─── */}
          {isScanning ? (
            <View style={[StyleSheet.absoluteFillObject, { zIndex: 99, backgroundColor: '#000' }]}>
              <CameraView 
                style={StyleSheet.absoluteFillObject}
                facing="back"
                onBarcodeScanned={handleBarcodeScanned}
              />
              
              {/* Dark Overlay with Transparent Square Cutout */}
              <View style={StyleSheet.absoluteFillObject}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />
                <View style={{ flexDirection: 'row', height: 260 }}>
                  <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />
                  <View style={{ width: 260, backgroundColor: 'transparent' }}>
                    {/* Decorative Corners */}
                    <View style={[styles.corner, { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 16 }]} />
                    <View style={[styles.corner, { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 16 }]} />
                    <View style={[styles.corner, { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 16 }]} />
                    <View style={[styles.corner, { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 16 }]} />
                  </View>
                  <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />
                </View>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center' }}>
                  <View style={styles.scannerHint}>
                    <Ionicons name="scan-outline" size={20} color={C.accent} />
                    <Text style={styles.scannerHintText}>وجّه الكاميرا نحو رمز الدخول للمسح</Text>
                  </View>
                </View>
              </View>

              {/* Close / Back Button */}
              <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
                <View style={{ padding: 20, alignItems: 'flex-start' }}>
                  <TouchableOpacity 
                    style={styles.scannerCloseBtn} 
                    onPress={() => setIsScanning(false)}
                  >
                    <Ionicons name="close" size={24} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </View>
          ) : null}

          {/* ─── Main Content ─── */}
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Brand Area — sits on the dark green background */}
            <Animated.View style={[styles.brandArea, { opacity: fadeIn, transform: [{ scale: logoScale }] }]}>
              <View style={styles.logoWrap}>
                <View style={styles.logoCircle}>
                  <Ionicons name="school" size={30} color={C.white} />
                </View>
              </View>
              <Text style={styles.brandName}>معرفة</Text>
              <View style={styles.brandDivider}>
                <View style={styles.brandDividerLine} />
                <View style={styles.brandDividerDot} />
                <View style={styles.brandDividerLine} />
              </View>
              <Text style={styles.brandTagline}>منصة التعلم الذكية</Text>
            </Animated.View>

            {/* Form Area — sits on the light background */}
            <Animated.View style={[styles.formArea, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>

              {/* Mode Toggle */}
              <View style={styles.modeToggle}>
                <TouchableOpacity
                  style={[styles.modeBtn, isLogin && styles.modeBtnActive]}
                  onPress={() => setIsLogin(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="log-in-outline" size={16} color={isLogin ? C.white : C.textSecondary} />
                  <Text style={[styles.modeBtnText, isLogin && styles.modeBtnTextActive]}>تسجيل الدخول</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeBtn, !isLogin && styles.modeBtnActive]}
                  onPress={() => setIsLogin(false)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="person-add-outline" size={16} color={!isLogin ? C.white : C.textSecondary} />
                  <Text style={[styles.modeBtnText, !isLogin && styles.modeBtnTextActive]}>حساب جديد</Text>
                </TouchableOpacity>
              </View>

              {/* Form Card */}
              <View style={styles.formCard}>

                {/* Name Input (Register only) */}
                {!isLogin && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>الاسم الكامل</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        placeholder="أحمد محمد"
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
                )}

                {/* Username Input */}
                <View style={[styles.inputGroup, { marginBottom: 12 }]}>
                  <Text style={styles.inputLabel}>اسم المستخدم</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="ahmed 123"
                      placeholderTextColor={C.textSubtle}
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                      autoCorrect={false}
                      textAlign="left"
                    />
                    <View style={styles.inputIcon}>
                      <Ionicons name="person-circle-outline" size={18} color={C.textSecondary} />
                    </View>
                  </View>
                  <Text style={{ fontSize: 11, color: C.textSecondary, textAlign: 'right', marginTop: 4 }}>
                    * يستخدم هذا الاسم لتسجيل الدخول، بينما نعرض اسمك الكامل للآخرين. يمكن استخدام المسافات فيه.
                  </Text>
                </View>

                {/* Password Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>كلمة المرور</Text>
                  <View style={styles.inputWrapper}>
                    <TouchableOpacity
                      style={styles.passwordToggle}
                      onPress={() => setPasswordVisible(!passwordVisible)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color={C.textSecondary}
                      />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      placeholderTextColor={C.textSubtle}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!passwordVisible}
                      textAlign="left"
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="password"
                    />
                    <View style={styles.inputIcon}>
                      <Ionicons name="lock-closed-outline" size={18} color={C.textSecondary} />
                    </View>
                  </View>
                </View>

                {/* TOS Checkbox */}
                <TouchableOpacity 
                  style={styles.tosContainer} 
                  activeOpacity={0.8}
                  onPress={() => setAcceptedTos(!acceptedTos)}
                >
                  <Ionicons 
                    name={acceptedTos ? "checkbox" : "square-outline"} 
                    size={22} 
                    color={acceptedTos ? C.primary : C.borderLight} 
                  />
                  <Text style={styles.tosText}>
                    أوافق على <Text style={styles.tosLink}>شروط الاستخدام</Text> و <Text style={styles.tosLink}>سياسة الخصوصية</Text>
                  </Text>
                </TouchableOpacity>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.submitBtn, isLoading && { opacity: 0.7 }]}
                  onPress={handleAuth}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator color={C.white} size="small" />
                  ) : (
                    <View style={styles.submitInner}>
                      <Text style={styles.submitBtnText}>{isLogin ? 'دخول' : 'إنشاء حساب'}</Text>
                      <Ionicons name={isLogin ? "arrow-back" : "checkmark-circle"} size={20} color={C.white} />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Divider */}
                {isLogin && (
                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>أو</Text>
                    <View style={styles.dividerLine} />
                  </View>
                )}

                {/* Barcode Scanner Button */}
                {isLogin && (
                  <TouchableOpacity style={styles.barcodeBtn} onPress={startScanning} activeOpacity={0.8}>
                    <View style={styles.barcodeIconWrap}>
                      <Ionicons name="qr-code-outline" size={22} color={C.accent} />
                    </View>
                    <View style={styles.barcodeBtnContent}>
                      <Text style={styles.barcodeBtnTitle}>الدخول بالباركود</Text>
                      <Text style={styles.barcodeBtnSubtitle}>امسح رمز الدخول الخاص بك</Text>
                    </View>
                    <Ionicons name="chevron-back" size={18} color={C.textSubtle} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Switch Mode Text */}
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>
                  {isLogin ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}
                </Text>
                <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
                  <Text style={styles.switchAction}>
                    {isLogin ? 'إنشاء حساب' : 'تسجيل الدخول'}
                  </Text>
                </TouchableOpacity>
              </View>

            </Animated.View>
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

  // ─── Dark green top layer (matches home screen) ───
  topBgLayer: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 380,
    backgroundColor: C.topOverlay,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    overflow: 'hidden',
  },
  decoCircle1: {
    position: 'absolute',
    width: 300, height: 300, borderRadius: 150,
    top: -60, right: -80,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  decoCircle2: {
    position: 'absolute',
    width: 200, height: 200, borderRadius: 100,
    top: 140, left: -60,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },

  // ─── Scroll & Layout ───
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 20,
  },

  // ─── Brand (on dark green area) ───
  brandArea: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoWrap: {
    marginBottom: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16 },
      android: { elevation: 10 },
    }),
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: C.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  brandName: {
    fontSize: 38,
    fontWeight: '900',
    color: C.white,
    letterSpacing: 1,
    marginBottom: 8,
  },
  brandDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  brandDividerLine: {
    width: 24,
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 1,
  },
  brandDividerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.accent,
  },
  brandTagline: {
    fontSize: 14,
    fontWeight: '600',
    color: '#97AEA9',
  },

  // ─── Mode Toggle (on light area) ───
  modeToggle: {
    flexDirection: 'row-reverse',
    backgroundColor: C.softGreen,
    borderRadius: 16,
    padding: 4,
    marginBottom: 18,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modeBtnActive: {
    backgroundColor: C.primary,
    ...Platform.select({
      ios: { shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textSecondary,
  },
  modeBtnTextActive: {
    color: C.white,
  },

  // ─── Form Card (White card on light bg) ───
  formArea: {},
  formCard: {
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: C.borderLight,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 20 },
      android: { elevation: 6 },
    }),
  },

  // ─── Inputs ───
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.primary,
    marginBottom: 8,
    textAlign: 'right',
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bgMain,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borderLight,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 15,
    color: C.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  inputIcon: {
    width: 48,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: C.borderLight,
  },
  passwordToggle: {
    width: 44,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── Submit Button (primary green) ───
  submitBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 6,
    ...Platform.select({
      ios: { shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  submitInner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: C.white,
  },

  // ─── TOS ───
  tosContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  tosText: {
    fontSize: 13,
    color: C.textSecondary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  tosLink: {
    color: C.primary,
    textDecorationLine: 'underline',
  },

  // ─── Divider ───
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.borderLight,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.textSubtle,
  },

  // ─── Barcode Button ───
  barcodeBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: C.bgMain,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.borderLight,
    gap: 12,
  },
  barcodeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barcodeBtnContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  barcodeBtnTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.textPrimary,
    marginBottom: 2,
  },
  barcodeBtnSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: C.textSecondary,
  },

  // ─── Switch Mode ───
  switchRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 6,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textSecondary,
  },
  switchAction: {
    fontSize: 13,
    fontWeight: '800',
    color: C.accent,
  },

  // ─── Scanner ───
  corner: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderColor: C.accent,
  },
  scannerHint: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scannerHintText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scannerCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
