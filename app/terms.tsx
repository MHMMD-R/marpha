import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { CustomAlert as Alert } from '@/components/CustomAlert';

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
  borderLight: '#E8EDEC',
  softGreen: '#EEF5F3',
  danger: '#D32F2F',
  dangerSoft: '#FFF0F0',
};


const TERMS_DATA = {
  ar: [
    {
      icon: 'shield-checkmark',
      title: 'حماية المحتوى التعليمي',
      color: C.primary,
      bgColor: C.softGreen,
      items: [
        'جميع المواد التعليمية والمحاضرات والاختبارات المتوفرة في التطبيق هي محتوى محمي بموجب حقوق الملكية الفكرية.',
        'يُمنع منعاً باتاً تصوير أو التقاط صور للشاشة (Screenshot) لأي محتوى تعليمي داخل التطبيق.',
        'يُمنع تسجيل الشاشة (Screen Recording) أو استخدام أي أداة أو تطبيق لتسجيل المحاضرات أو المحتوى المعروض.',
        'أي محاولة لالتقاط أو تسجيل المحتوى قد تؤدي إلى تعليق الحساب بشكل دائم دون إنذار مسبق.',
      ],
    },
    {
      icon: 'eye-off',
      title: 'تقنيات حماية الشاشة',
      color: '#1E3A5F',
      bgColor: '#EBF2FF',
      items: [
        'يستخدم التطبيق تقنيات متقدمة لحماية المحتوى تشمل منع التقاط صور الشاشة ومنع تسجيل الفيديو أثناء عرض المحتوى التعليمي.',
        'تعمل هذه التقنيات تلقائياً في الخلفية لضمان حماية حقوق المحتوى ومنع النسخ غير المصرح به.',
        'في حال محاولة التقاط الشاشة أثناء عرض المحتوى، سيظهر المحتوى بشكل أسود أو فارغ تلقائياً.',
        'هذه الحماية ضرورية للحفاظ على جودة الخدمة التعليمية وحقوق المعلمين ومقدمي المحتوى.',
      ],
    },
    {
      icon: 'phone-portrait',
      title: 'ربط الجهاز وأمان الحساب',
      color: '#4A1942',
      bgColor: '#F8EBF7',
      items: [
        'لضمان أمان حسابك ومنع الاستخدام غير المصرح به، يتم ربط حسابك بجهاز واحد فقط.',
        'يستخدم التطبيق معرّف الجهاز الفريد (Device Identifier) لتحديد الجهاز المرتبط بحسابك.',
        'معرّف الجهاز هو رمز تعريفي فريد يُنشأ تلقائياً ويُستخدم فقط لغرض التحقق من هوية الجهاز وضمان استخدام حساب واحد لكل جهاز.',
        'لا يتم مشاركة معرّف الجهاز مع أي طرف ثالث ويُستخدم حصرياً لأغراض الأمان داخل التطبيق.',
        'يمكنك نقل حسابك إلى جهاز جديد مرة واحدة كل 30 يوماً من خلال تسجيل الدخول من الجهاز الجديد.',
      ],
    },
    {
      icon: 'ban',
      title: 'الاستخدام المحظور',
      color: C.danger,
      bgColor: C.dangerSoft,
      items: [
        'يُمنع مشاركة بيانات الدخول (اسم المستخدم وكلمة المرور) مع أي شخص آخر.',
        'يُمنع استخدام نفس الحساب على أكثر من جهاز في نفس الوقت.',
        'يُمنع محاولة التحايل على أنظمة الحماية أو استخدام برامج وأدوات لتجاوزها.',
        'يُمنع إعادة توزيع أو بيع أو نشر أي محتوى تعليمي من التطبيق بأي شكل.',
        'مخالفة أي من هذه الشروط قد تؤدي إلى تعليق الحساب بشكل فوري ونهائي.',
      ],
    },
    {
      icon: 'document-text',
      title: 'البيانات والخصوصية',
      color: '#0C6B58',
      bgColor: '#E8F5F1',
      items: [
        'نحتفظ بالبيانات التالية: الاسم، معرّف الجهاز، معلومات الحساب، وسجل النشاط التعليمي.',
        'تُستخدم هذه البيانات فقط لتقديم الخدمة التعليمية وتحسين تجربة المستخدم.',
        'لا نشارك بياناتك الشخصية مع أي أطراف خارجية ولا نبيعها.',
        'بالموافقة على هذه الشروط، فإنك توافق على معالجة بياناتك وفقاً لسياسة الخصوصية الخاصة بنا.',
      ],
    },
  ],
  en: [
    {
      icon: 'shield-checkmark',
      title: 'Educational Content Protection',
      color: C.primary,
      bgColor: C.softGreen,
      items: [
        'All educational materials, lectures, and quizzes available in the app are protected by intellectual property rights.',
        'It is strictly prohibited to take photos or screenshots of any educational content within the app.',
        'Screen recording or the use of any tool or app to record lectures or displayed content is prohibited.',
        'Any attempt to capture or record content may lead to permanent account suspension without prior notice.',
      ],
    },
    {
      icon: 'eye-off',
      title: 'Screen Protection Technologies',
      color: '#1E3A5F',
      bgColor: '#EBF2FF',
      items: [
        'The app uses advanced content protection technologies, including preventing screenshots and video recording while educational content is displayed.',
        'These technologies work automatically in the background to ensure content protection and prevent unauthorized copying.',
        'If a screenshot is attempted during content playback, the screen will automatically appear black or blank.',
        'This protection is essential to maintain the quality of the educational service and the rights of teachers and content providers.',
      ],
    },
    {
      icon: 'phone-portrait',
      title: 'Device Binding & Account Security',
      color: '#4A1942',
      bgColor: '#F8EBF7',
      items: [
        'To ensure account security and prevent unauthorized use, your account is bound to a single device.',
        'The app uses a unique Device Identifier to identify the device bound to your account.',
        'The Device Identifier is an automatically generated unique code used solely to verify the device identity and ensure one account per device.',
        'The Device Identifier is not shared with any third parties and is used exclusively for security purposes within the app.',
        'You can transfer your account to a new device once every 30 days by logging in from the new device.',
      ],
    },
    {
      icon: 'ban',
      title: 'Prohibited Use',
      color: C.danger,
      bgColor: C.dangerSoft,
      items: [
        'Sharing login credentials (username and password) with anyone else is prohibited.',
        'Using the same account on multiple devices simultaneously is prohibited.',
        'Attempting to circumvent protection systems or using software and tools to bypass them is prohibited.',
        'Redistributing, selling, or publishing any educational content from the app in any form is prohibited.',
        'Violation of any of these terms may result in immediate and permanent account suspension.',
      ],
    },
    {
      icon: 'document-text',
      title: 'Data and Privacy',
      color: '#0C6B58',
      bgColor: '#E8F5F1',
      items: [
        'We retain the following data: Name, Device Identifier, Account Information, and Educational Activity Log.',
        'This data is used solely to provide the educational service and improve the user experience.',
        'We do not share your personal data with any third parties and do not sell it.',
        'By agreeing to these terms, you consent to the processing of your data in accordance with our Privacy Policy.',
      ],
    },
  ]
};


function AnimatedSection({ section, index, isRtl }: { section: any; index: number; isRtl: boolean }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 500,
      delay: 150 + index * 120,
      easing: Easing.out(Easing.back(1.05)),
      useNativeDriver: true,
    }).start();
  }, [anim, index]);

  return (
    <Animated.View
      style={[
        styles.section,
        {
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [25, 0] }) },
          ],
        },
      ]}
    >
      {/* Section Header */}
      <View style={[styles.sectionHeader, { backgroundColor: section.bgColor, flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        <View style={[styles.sectionIconWrap, { backgroundColor: section.color }]}>
          <Ionicons name={section.icon} size={20} color={C.white} />
        </View>
        <Text style={[styles.sectionTitle, { color: section.color, textAlign: isRtl ? 'right' : 'left' }]}>{section.title}</Text>
      </View>

      {/* Section Items */}
      <View style={styles.sectionBody}>
        {section.items.map((item, idx) => (
          <View key={idx} style={[styles.itemRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <View style={[styles.itemBullet, { backgroundColor: section.color }]}>
              <Text style={styles.itemBulletText}>{idx + 1}</Text>
            </View>
            <Text style={[styles.itemText, { textAlign: isRtl ? 'right' : 'left' }]}>{item}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

export default function TermsScreen() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const isRtl = lang === 'ar';
  const [saving, setSaving] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(headerAnim, {
      toValue: 1,
      friction: 8,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleAccept = async () => {
    if (!accepted) {
      Alert.alert(isRtl ? 'تنبيه' : 'Alert', isRtl ? 'يجب الموافقة على الشروط والأحكام للمتابعة' : 'You must agree to the terms and conditions to continue');
      return;
    }

    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('غير مصرح لك');

      await updateDoc(doc(db, 'students', user.uid), {
        termsAccepted: true,
        termsAcceptedAt: new Date().toISOString(),
      });

      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert(isRtl ? 'خطأ' : 'Error', err.message || (isRtl ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred'));
    } finally {
      setSaving(false);
    }
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isAtEnd = layoutMeasurement.height + contentOffset.y >= contentSize.height - 60;
    if (isAtEnd && !scrolledToEnd) {
      setScrolledToEnd(true);
    }
  };

  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return unsubscribe;
  }, []);

  return (
    <View style={styles.root}>
      {/* Top Background */}
      <View style={styles.topBgLayer}>
        <View style={styles.decoCircle1} />
        <View style={styles.decoCircle2} />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerAnim,
              transform: [
                { translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-15, 0] }) },
              ],
            },
          ]}
        >
          <View style={[styles.headerContent, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            {/* Back Button for all users */}
            <TouchableOpacity
              onPress={async () => {
                if (user) {
                  router.replace('/setup');
                } else {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace('/login');
                  }
                }
              }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.1)',
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)',
              }}
            >
              <Ionicons name={isRtl ? 'chevron-forward' : 'chevron-back'} size={24} color={C.white} />
            </TouchableOpacity>
            
            <View style={styles.headerIconWrap}>
              <Ionicons name="document-lock" size={28} color={C.accent} />
            </View>
            <View style={[styles.headerTextWrap, { alignItems: isRtl ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.headerSubtitle, { textAlign: isRtl ? 'right' : 'left' }]}>{isRtl ? 'يرجى قراءة والموافقة على' : 'Please read and agree to'}</Text>
              <Text style={[styles.headerTitle, { textAlign: isRtl ? 'right' : 'left' }]}>{isRtl ? 'الشروط والأحكام' : 'Terms & Conditions'}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Scrollable Content */}
        <View style={styles.content}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={200}
          >
            {/* Intro Card */}
            <View style={[styles.introCard, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <Ionicons name="information-circle" size={22} color={C.accent} />
              <Text style={[styles.introText, { textAlign: isRtl ? 'right' : 'left' }]}>
                {isRtl
                  ? 'باستخدامك لتطبيق المعرفة اكاديمي، فإنك توافق على الالتزام بالشروط والأحكام التالية. يرجى قراءتها بعناية قبل المتابعة.'
                  : 'By using the Al-Maarefa Academy app, you agree to be bound by the following terms and conditions. Please read them carefully before continuing.'}
              </Text>
            </View>

            {/* Terms Sections */}
            {TERMS_DATA[lang].map((section, index) => (
              <AnimatedSection key={index} section={section} index={index} isRtl={isRtl} />
            ))}

            {/* Last Update */}
            <View style={[styles.lastUpdate, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              <Ionicons name="time-outline" size={14} color={C.textSecondary} />
              <Text style={styles.lastUpdateText}>
                {isRtl ? 'آخر تحديث:' : 'Last update:'} {new Date().toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </Text>
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>

        {/* Bottom Action Bar (Only for logged in users) */}
        {user && (
          <View style={styles.bottomBar}>
            {/* Checkbox */}
            <TouchableOpacity
              style={[styles.checkboxRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}
              activeOpacity={0.8}
              onPress={() => setAccepted(!accepted)}
            >
              <View style={[styles.checkbox, accepted && styles.checkboxActive]}>
                {accepted && <Ionicons name="checkmark" size={16} color={C.white} />}
              </View>
              <Text style={[styles.checkboxText, { textAlign: isRtl ? 'right' : 'left' }]}>
                {isRtl ? 'لقد قرأت وأوافق على جميع الشروط والأحكام' : 'I have read and agree to all terms and conditions'}
              </Text>
            </TouchableOpacity>

            {/* Accept Button */}
            <TouchableOpacity
              style={[
                styles.acceptBtn,
                !accepted && styles.acceptBtnDisabled,
                saving && { opacity: 0.7 },
              ]}
              onPress={handleAccept}
              disabled={!accepted || saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color={C.white} size="small" />
              ) : (
                <View style={[styles.acceptBtnInner, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
                  <Text style={styles.acceptBtnText}>{isRtl ? 'موافق والمتابعة' : 'Accept and Continue'}</Text>
                  <Ionicons name={isRtl ? 'arrow-back' : 'arrow-forward'} size={20} color={C.white} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bgMain,
  },

  // ─── Top Background ───
  topBgLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: C.topOverlay,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
  },
  decoCircle1: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    top: -70,
    right: -80,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  decoCircle2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    top: 80,
    left: -60,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  // ─── Header ───
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerContent: {
    
    alignItems: 'center',
    gap: 14,
  },
  headerIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(227,167,54,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(227,167,54,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: C.white,
  },

  // ─── Content ───
  content: {
    flex: 1,
    backgroundColor: C.bgMain,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  scrollContent: {
    padding: 20,
    paddingTop: 24,
    paddingBottom: 30,
  },

  // ─── Intro Card ───
  introCard: {
    
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: C.accentSoft,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(227,167,54,0.15)',
  },
  introText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 21,
    color: C.textPrimary,
    fontWeight: '600',
    
  },

  // ─── Section ───
  section: {
    backgroundColor: C.white,
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
    }),
  },
  sectionHeader: {
    
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  sectionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
    
  },
  sectionBody: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    gap: 10,
  },

  // ─── Items ───
  itemRow: {
    
    alignItems: 'flex-start',
    gap: 10,
  },
  itemBullet: {
    width: 22,
    height: 22,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  itemBulletText: {
    fontSize: 11,
    fontWeight: '800',
    color: C.white,
  },
  itemText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 21,
    color: C.textPrimary,
    fontWeight: '500',
    
  },

  // ─── Last Update ───
  lastUpdate: {
    
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  lastUpdateText: {
    fontSize: 12,
    color: C.textSecondary,
    fontWeight: '600',
  },

  // ─── Bottom Bar ───
  bottomBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 8 : 16,
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  checkboxRow: {
    
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: C.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.bgMain,
  },
  checkboxActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  checkboxText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: C.textPrimary,
    
    lineHeight: 20,
  },
  acceptBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 16,
    ...Platform.select({
      ios: {
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  acceptBtnDisabled: {
    backgroundColor: C.textSecondary,
    opacity: 0.5,
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },
  acceptBtnInner: {
    
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  acceptBtnText: {
    color: C.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
