import { Ionicons } from '@expo/vector-icons';
import { Camera, CameraView } from 'expo-camera';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebase';

const COLORS = {
  bgMain: '#F4F7F6',
  topOverlay: '#0B2923',
  primary: '#12453D',
  accent: '#E3A736',
  white: '#FFFFFF',
  textSecondary: '#8A9E99',
  borderLight: '#E8EDEC',
};

export default function LoginScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const startScanning = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
    if (status === 'granted') {
      setIsScanning(true);
    } else {
      Alert.alert('الصلاحيات', 'لا توجد صلاحية للوصول إلى الكاميرا');
    }
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    setIsScanning(false);
    try {
      const parts = data.split('|');
      if (parts.length >= 2) {
        const decodedEmail = parts[0];
        const decodedPassword = parts[1];
        setEmail(decodedEmail);
        setPassword(decodedPassword);
        setIsLoading(true);
        const userCredential = await signInWithEmailAndPassword(auth, decodedEmail, decodedPassword);
        const user = userCredential.user;
        const teacherDoc = await getDoc(doc(db, 'teachers', user.uid));
        if (teacherDoc.exists()) {
          router.replace('/teacher_home');
        } else {
          router.replace('/(tabs)');
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
    if (!email || !password) {
      Alert.alert('خطأ', 'يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    if (!isLogin && !name) {
      Alert.alert('خطأ', 'يرجى إدخال الاسم الكامل');
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        // Login
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const teacherDoc = await getDoc(doc(db, 'teachers', user.uid));
        
        if (teacherDoc.exists()) {
          router.replace('/teacher_home');
        } else {
          router.replace('/(tabs)');
        }
      } else {
        // Register (Students Only)
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName: name });
        
        // Save to firestore to read in dashboard
        await setDoc(doc(db, 'students', user.uid), {
          uid: user.uid,
          name: name,
          email: email,
          password: password, // For barcode sign-in functionality
          subject: "عام",
          progress: 0,
          status: "active",
          createdAt: new Date().toISOString()
        });

        router.replace('/(tabs)');
      }
    } catch (error: any) {
      Alert.alert('خطأ في المصادقة', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.topBgLayer} />

      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
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
                <View style={{ backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, marginTop: 40, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="scan-outline" size={20} color={COLORS.accent} />
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>وجّه الكاميرا نحو رمز الدخول للمسح</Text>
                </View>
              </View>
            </View>

            {/* Close / Back Button */}
            <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
              <View style={{ padding: 20, alignItems: 'flex-start' }}>
                <TouchableOpacity 
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }} 
                  onPress={() => setIsScanning(false)}
                >
                  <Ionicons name="close" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
            </SafeAreaView>

          </View>
        ) : null}

        <View style={styles.content}>
          <View style={styles.headerContainer}>
            <Text style={styles.title}>معرفى</Text>
            <Text style={styles.subtitle}>{isLogin ? 'تسجيل الدخول إلى حسابك' : 'إنشاء حساب جديد'}</Text>
          </View>

        <View style={styles.formCard}>
          {!isLogin && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>الاسم الكامل</Text>
              <TextInput 
                style={styles.input} 
                placeholder="أحمد محمد"
                value={name}
                onChangeText={setName}
                textAlign="right"
              />
            </View>
          )}
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>البريد الإلكتروني</Text>
            <TextInput 
              style={styles.input} 
              placeholder="example@mail.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              textAlign="right"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>كلمة المرور</Text>
            <TextInput 
              style={styles.input} 
              placeholder="******"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textAlign="right"
            />
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleAuth} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitBtnText}>{isLogin ? 'دخول' : 'تسجيل'}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>
              {isLogin ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}
            </Text>
            <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
              <Text style={styles.switchText}>{isLogin ? 'إنشاء حساب' : 'تسجيل الدخول'}</Text>
            </TouchableOpacity>
          </View>

          {isLogin && (
            <TouchableOpacity 
              style={{ marginTop: 24, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8 }} 
              onPress={startScanning}
            >
              <Ionicons name="qr-code-outline" size={24} color={COLORS.primary} />
              <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 16 }}>استخدام رمز الدخول (Barcode)</Text>
            </TouchableOpacity>
          )}
        </View>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  corner: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderColor: COLORS.accent,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bgMain,
  },
  topBgLayer: {
    position: 'absolute', 
    top: 0, left: 0, right: 0, 
    height: 380,
    backgroundColor: COLORS.topOverlay,
    borderBottomLeftRadius: 50, 
    borderBottomRightRadius: 50,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: -50,
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#97AEA9',
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 8,
    textAlign: 'right',
  },
  input: {
    backgroundColor: '#F9FAF9',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111A18',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
    direction: 'rtl',
  },
  switchLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  switchText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '800',
  },
});
