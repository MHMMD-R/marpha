import * as Clipboard from 'expo-clipboard';
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { deleteUser, signOut } from "firebase/auth";
import { collection, deleteDoc, doc, getCountFromServer, getDoc, getDocs, query, where } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View } from 'react-native';
import { CustomAlert as Alert } from '@/components/CustomAlert';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth, db } from "../firebase";

const { width } = Dimensions.get("window");

// ─── Design System (matching teacher_home & student index) ───
const C = {
  bgMain: "#F4F7F6",
  topOverlay: "#0B2923",
  primary: "#12453D",
  primarySoft: "#2E5E55",
  accent: "#E3A736",
  white: "#FFFFFF",
  textPrimary: "#10241F",
  textSecondary: "#8A9E99",
  borderLight: "#E8EDEC",
  danger: "#D9534F",
  heroCard: "#0A1C18",
  heroDecor: "#152C26",
  softGreen: "#EEF5F3",
  softGold: "#FFF8E8",
  logoutBg: "#1A0A0B",
  logoutText: "#FF6B6B",
};

// ─── Animated Floating Circles (header background) ───
const HeaderDecorations = () => {
  const float1 = useRef(new Animated.Value(0)).current;
  const float2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float1, { toValue: 1, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float1, { toValue: 0, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(float2, { toValue: 1, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float2, { toValue: 0, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, [float1, float2]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.decorCircle, {
        width: 350, height: 350, borderRadius: 175, top: -80, right: -120,
        backgroundColor: 'rgba(255,255,255,0.03)',
        transform: [{ translateY: float1.interpolate({ inputRange: [0, 1], outputRange: [0, 14] }) }],
      }]} />
      <Animated.View style={[styles.decorCircle, {
        width: 220, height: 220, borderRadius: 110, top: 80, left: -90,
        backgroundColor: 'rgba(255,255,255,0.04)',
        transform: [{ translateY: float2.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) }],
      }]} />
    </View>
  );
};

// ─── Breathing glow ring around avatar ───
const AvatarGlowRing = () => {
  const glow = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 0.7, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.3, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, [glow]);
  return (
    <Animated.View style={{
      position: 'absolute', width: 130, height: 130, borderRadius: 65,
      borderWidth: 2, borderColor: C.accent,
      opacity: glow,
    }} />
  );
};

// ─── Animated Entrance Wrapper ───
const FadeSlideIn = ({ children, delay = 0, offsetY = 24, style }: any) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 550, delay,
      easing: Easing.out(Easing.back(1.1)),
      useNativeDriver: true,
    }).start();
  }, [anim, delay]);
  return (
    <Animated.View style={[style, {
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [offsetY, 0] }) }],
    }]}>
      {children}
    </Animated.View>
  );
};

// ─── Stat Bento Card (animated) ───
const StatBentoCard = ({ icon, iconColor, iconBg, label, value, delay }: any) => {
  const anim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim, { toValue: 1, duration: 500, delay, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, delay, friction: 5, tension: 80, useNativeDriver: true }),
    ]).start();
  }, [anim, scaleAnim, delay]);

  return (
    <Animated.View style={[styles.bentoBigCard, {
      opacity: anim,
      transform: [
        { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
        { scale: scaleAnim },
      ],
    }]}>
      <View style={[styles.bentoIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={styles.bentoValue}>{value}</Text>
      <Text style={styles.bentoLabel}>{label}</Text>
    </Animated.View>
  );
};

// ─── Navigation Action Card (with press animation) ───
const ActionNavCard = ({ icon, title, subtitle, onPress, delay, accentColor }: any) => {
  const enterAnim = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(enterAnim, {
      toValue: 1, duration: 450, delay,
      easing: Easing.out(Easing.back(1.1)),
      useNativeDriver: true,
    }).start();
  }, [enterAnim, delay]);

  const handlePressIn = () => {
    Animated.spring(pressScale, { toValue: 0.96, friction: 8, tension: 150, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(pressScale, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={{
      opacity: enterAnim,
      transform: [
        { translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
        { scale: pressScale },
      ],
    }}>
      <TouchableOpacity
        style={styles.navActionCard}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={styles.navActionBody}>
          <Ionicons name="chevron-back" size={20} color={C.borderLight} />
          <View style={styles.navActionInfoRow}>
            <View style={styles.navActionTextCol}>
              <Text style={styles.navActionTitle}>{title}</Text>
              <Text style={styles.navActionSubtitle}>{subtitle}</Text>
            </View>
            <View style={[styles.navActionIconBox, { backgroundColor: accentColor || C.softGreen }]}>
              <Ionicons name={icon} size={24} color={C.primary} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ═══════════════════════════════════════════════
// MAIN PROFILE SCREEN
// ═══════════════════════════════════════════════
export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [userData, setUserData] = useState<any>(null);
  const [role, setRole] = useState<"student" | "teacher" | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ lectures: 0, quizzes: 0 });
  const [teacherMap, setTeacherMap] = useState<Record<string, string>>({});
  const [showTerms, setShowTerms] = useState(false);


  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          // Check if teacher first
          const teacherDocRef = doc(db, "teachers", user.uid);
          const teacherSnap = await getDoc(teacherDocRef);
          if (teacherSnap.exists()) {
            setRole("teacher");
            setUserData(teacherSnap.data());

            // Fetch teacher stats
            const lecturesRef = query(collection(db, "lectures"), where("teacherId", "==", user.uid));
            const quizzesRef = query(collection(db, "quizzes"), where("teacherId", "==", user.uid));
            const [lecturesCount, quizzesCount] = await Promise.all([
              getCountFromServer(lecturesRef),
              getCountFromServer(quizzesRef),
            ]);
            setStats({
              lectures: lecturesCount.data().count,
              quizzes: quizzesCount.data().count,
            });
            return;
          }

          // Otherwise, must be a student
          const studentDocRef = doc(db, "students", user.uid);
          const studentSnap = await getDoc(studentDocRef);
          if (studentSnap.exists()) {
            setRole("student");
            setUserData(studentSnap.data());
            
            // Fetch teachers mapping for subscription display
            const teachersSnap = await getDocs(collection(db, "teachers"));
            const tMap: Record<string, string> = {};
            teachersSnap.forEach(tDoc => {
              tMap[tDoc.id] = tDoc.data().name;
            });
            setTeacherMap(tMap);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace("/login");
    } catch (error: any) {
      Alert.alert("خطأ", error.message);
    }
  };

  const handleShowTerms = () => setShowTerms(true);

  const handleDeleteAccount = () => {
    Alert.alert(
      "حذف الحساب",
      "هل أنت متأكد من أنك تريد حذف حسابك؟ لا يمكن التراجع عن هذا الإجراء وسيتم حذف جميع بياناتك.",
      [
        { text: "إلغاء", style: "cancel" },
        { 
          text: "تأكيد الحذف", 
          style: "destructive",
          onPress: async () => {
            try {
              const user = auth.currentUser;
              if (!user) return;
              
              setLoading(true);
              const collectionName = role === "teacher" ? "teachers" : "students";
              await deleteDoc(doc(db, collectionName, user.uid));
              
              await deleteUser(user);
              
              Alert.alert("تم حذف الحساب", "تم حذف حسابك بنجاح.");
              router.replace("/login");
            } catch (error: any) {
              setLoading(false);
              let msg = error.message;
              if (error.code === 'auth/requires-recent-login') {
                msg = "يرجى تسجيل الدخول مرة أخرى لإتمام عملية حذف الحساب.";
                await signOut(auth);
                router.replace("/login");
              }
              Alert.alert("خطأ", msg);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  const userName = userData?.name || auth.currentUser?.displayName || "المستخدم";
  const displayUsername = userData?.username || userData?.email?.replace('@marpha.app', '') || "";
  const userSubject = userData?.subject || "عام";
  const userJoinYear = userData?.createdAt
    ? new Date(userData.createdAt).getFullYear()
    : new Date().getFullYear();
  
  const userIdStr = userData?.userId || "—";
  let sub = userData?.subscription || { type: 'full' };
  
  let isSubActive = true;
  if (sub.endDate) {
     isSubActive = new Date() < new Date(sub.endDate);
  }
  if (sub.type === 'none' || !isSubActive) {
     sub = { ...sub, type: 'none' };
  }
  const freeTrial = userData?.freeTrial;
  const isTrialActive = freeTrial?.isActive && new Date() < new Date(freeTrial.endDate);
  const trialDaysLeft = isTrialActive 
    ? Math.ceil((new Date(freeTrial.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) 
    : 0;

  const handleCopyId = async () => {
    if (userIdStr === "—") return;
    await Clipboard.setStringAsync(userIdStr);
    Alert.alert("تم النسخ", "تم نسخ معرف المستخدم بنجاح");
  };

  return (
    <View style={styles.wrapper}>
      {/* Dark curved top background */}
      <View style={[styles.topBgLayer, { height: role === "student" ? 580 : 420 }]}>
        <HeaderDecorations />
      </View>

      {/* Header Buttons */}
      <View style={[styles.headerRow, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={22} color={C.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الملف الشخصي</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Avatar Hero Section ─── */}
        <FadeSlideIn delay={100} style={styles.avatarSection}>
          <View style={styles.avatarOuterRing}>
            <AvatarGlowRing />
            <View style={styles.avatarInnerContainer}>
              {userData?.image ? (
                <Image source={{ uri: userData.image }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={52} color="rgba(255,255,255,0.6)" />
                </View>
              )}
            </View>
          </View>

          <Text style={styles.userName}>{userName}</Text>
          <View style={styles.roleBadge}>
            <View style={styles.roleDot} />
            <Text style={styles.roleText}>
              {role === "teacher" ? "معلم" : "طالب"}
            </Text>
          </View>

          {/* Username pill */}
          <View style={styles.emailPill}>
            <Ionicons name="person-circle-outline" size={14} color="rgba(255,255,255,0.6)" />
            <Text style={styles.emailText} numberOfLines={1}>@{displayUsername}</Text>
          </View>

          {/* User ID and Subscription Badge for Students */}
          {role === "student" && (
            <View style={{ marginTop: 14, alignItems: 'center', gap: 10 }}>
              <TouchableOpacity onPress={handleCopyId} activeOpacity={0.8} style={{ flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: C.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4 }}>
                <Text style={{ color: C.white, fontSize: 13, fontWeight: '800', marginLeft: 8 }}>المعرف: {userIdStr}</Text>
                <Ionicons name="copy-outline" size={16} color={C.accent} />
              </TouchableOpacity>
              
              <View style={{ flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%' }}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                  {sub.type === 'limited' ? (
                    <>
                      <Ionicons name="shield-half-outline" size={14} color={C.accent} />
                      <Text style={{ color: C.accent, fontSize: 13, fontWeight: '700' }}>اشتراك مخصص</Text>
                    </>
                  ) : sub.type === 'full' ? (
                    <>
                      <Ionicons name="shield-checkmark-outline" size={14} color="#2FD67C" />
                      <Text style={{ color: "#2FD67C", fontSize: 13, fontWeight: '700' }}>اشتراك شامل</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="close-circle-outline" size={14} color={C.danger} />
                      <Text style={{ color: C.danger, fontSize: 13, fontWeight: '700' }}>لا يوجد اشتراك فعال</Text>
                    </>
                  )}
                </View>

                {sub.type === 'limited' && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, direction: 'rtl', marginTop: 4 }}>
                    {(sub.allowedSubjects || []).map((subj: string, idx: number) => (
                      <View key={`subj-${idx}`} style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="book-outline" size={12} color={C.white} />
                        <Text style={{ color: C.white, fontSize: 11, fontWeight: '600' }}>{subj}</Text>
                      </View>
                    ))}
                    {(sub.allowedTeachers || []).map((tId: string, idx: number) => (
                      <View key={`teach-${idx}`} style={{ backgroundColor: 'rgba(227,167,54,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(227,167,54,0.3)', flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="person-outline" size={12} color={C.accent} />
                        <Text style={{ color: C.accent, fontSize: 11, fontWeight: '600' }}>{teacherMap[tId] || 'معلم غير معروف'}</Text>
                      </View>
                    ))}
                    {((sub.allowedSubjects || []).length === 0 && (sub.allowedTeachers || []).length === 0) && (
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '500' }}>لم يتم تحديد مواد أو معلمين</Text>
                    )}
                  </View>
                )}
              </View>

              {isTrialActive && (
                <View style={{ flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%', marginTop: 2, paddingTop: 12, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="flash-outline" size={14} color="#F59E0B" />
                    <Text style={{ color: "#F59E0B", fontSize: 13, fontWeight: '700' }}>
                      فترة تجريبية مجانية ({trialDaysLeft} أيام متبقية)
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, direction: 'rtl', marginTop: 4 }}>
                    {(freeTrial.access?.allowedSubjects || []).map((subj: string, idx: number) => (
                      <View key={`ft-subj-${idx}`} style={{ backgroundColor: 'rgba(245,158,11,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="book-outline" size={12} color="#F59E0B" />
                        <Text style={{ color: "#F59E0B", fontSize: 11, fontWeight: '600' }}>{subj}</Text>
                      </View>
                    ))}
                    {(freeTrial.access?.allowedTeachers || []).map((tId: string, idx: number) => (
                      <View key={`ft-teach-${idx}`} style={{ backgroundColor: 'rgba(245,158,11,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="person-outline" size={12} color="#F59E0B" />
                        <Text style={{ color: "#F59E0B", fontSize: 11, fontWeight: '600' }}>{teacherMap[tId] || 'معلم غير معروف'}</Text>
                      </View>
                    ))}
                    {((freeTrial.access?.allowedSubjects || []).length === 0 && (freeTrial.access?.allowedTeachers || []).length === 0) && (
                      <Text style={{ color: 'rgba(245,158,11,0.7)', fontSize: 11, fontWeight: '500' }}>صلاحية عامة</Text>
                    )}
                  </View>
                </View>
              )}
            </View>
          )}
        </FadeSlideIn>

        {/* ─── Bento Stats Grid ─── */}
        <View style={styles.bentoGrid}>
          <StatBentoCard
            icon="book-outline"
            iconColor={C.primary}
            iconBg={C.softGreen}
            label={role === "teacher" ? "المادة الدراسية" : "الفرع"}
            value={userSubject}
            delay={400}
          />
          {role === "teacher" ? (
            <>
              <StatBentoCard
                icon="videocam-outline"
                iconColor={C.accent}
                iconBg={C.softGold}
                label="إجمالي المحاضرات"
                value={stats.lectures}
                delay={520}
              />
              <StatBentoCard
                icon="document-text-outline"
                iconColor="#6B8CFF"
                iconBg="#EEF1FF"
                label="إجمالي الاختبارات"
                value={stats.quizzes}
                delay={640}
              />
            </>
          ) : (
            <StatBentoCard
              icon="calendar-outline"
              iconColor={C.accent}
              iconBg={C.softGold}
              label="تاريخ الانضمام"
              value={userJoinYear}
              delay={520}
            />
          )}
        </View>

        {/* ─── Teacher Navigation Cards ─── */}
        {role === "teacher" && (
          <FadeSlideIn delay={700} style={styles.navSection}>
            <Text style={styles.sectionTitle}>إدارة المحتوى التعليمي</Text>
            <View style={styles.navCardsContainer}>
              <ActionNavCard
                icon="videocam"
                title="المحاضرات المرفوعة"
                subtitle="إدارة وتعديل الفيديوهات التعليمية"
                accentColor={C.softGreen}
                onPress={() => router.push("/teacher_lectures")}
                delay={800}
              />
              <ActionNavCard
                icon="document-text"
                title="الاختبارات المنشأة"
                subtitle="مراجعة وتعديل أسئلة الاختبارات"
                accentColor={C.softGold}
                onPress={() => router.push("/teacher_quizzes")}
                delay={900}
              />
            </View>
          </FadeSlideIn>
        )}

        {/* ─── Action Buttons ─── */}
        <FadeSlideIn delay={role === "teacher" ? 1000 : 700} style={styles.logoutSection}>
          <TouchableOpacity
            style={[styles.logoutBtn, { borderColor: 'rgba(46,94,85,0.3)', backgroundColor: C.white, marginBottom: 12 }]}
            onPress={handleShowTerms}
            activeOpacity={0.85}
          >
            <Ionicons name="document-text-outline" size={20} color={C.primarySoft} />
            <Text style={[styles.logoutText, { color: C.primarySoft }]}>شروط الخدمة</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleSignOut}
            activeOpacity={0.85}
          >
            <Ionicons name="log-out-outline" size={20} color={C.logoutText} />
            <Text style={styles.logoutText}>تسجيل الخروج</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.logoutBtn, { marginTop: 12, borderColor: 'rgba(255,107,107,0.4)', backgroundColor: C.white }]}
            onPress={handleDeleteAccount}
            activeOpacity={0.85}
          >
            <Ionicons name="trash-outline" size={20} color={C.logoutText} />
            <Text style={styles.logoutText}>حذف الحساب</Text>
          </TouchableOpacity>
        </FadeSlideIn>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── Terms of Service Modal ─── */}
      <Modal
        visible={showTerms}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowTerms(false)}
      >
        <View style={termsStyles.overlay}>
          <Animated.View style={termsStyles.card}>
            {/* Header */}
            <View style={termsStyles.header}>
              <View style={termsStyles.headerIconWrap}>
                <Ionicons name="shield-checkmark" size={32} color={C.primary} />
              </View>
              <Text style={termsStyles.headerTitle}>شروط الخدمة وسياسة الخصوصية</Text>
              <Text style={termsStyles.headerSubtitle}>منصة معرفة التعليمية</Text>
            </View>

            {/* Body */}
            <ScrollView style={termsStyles.body} showsVerticalScrollIndicator={false}>
              <Text style={termsStyles.intro}>
                نلتزم في منصة معرفة بتقديم بيئة تعليمية آمنة ومحترمة لجميع المستخدمين.
              </Text>

              <View style={termsStyles.rule}>
                <View style={[termsStyles.ruleIcon, { backgroundColor: '#FEF2F2' }]}>
                  <Ionicons name="close-circle" size={18} color="#EF4444" />
                </View>
                <View style={termsStyles.ruleContent}>
                  <Text style={termsStyles.ruleTitle}>المحتوى المحظور</Text>
                  <Text style={termsStyles.ruleText}>يمنع منعاً باتاً نشر أي محتوى مسيء، غير لائق، أو ينتهك حقوق الآخرين.</Text>
                </View>
              </View>

              <View style={termsStyles.rule}>
                <View style={[termsStyles.ruleIcon, { backgroundColor: '#FFF7ED' }]}>
                  <Ionicons name="warning" size={18} color="#F59E0B" />
                </View>
                <View style={termsStyles.ruleContent}>
                  <Text style={termsStyles.ruleTitle}>صلاحيات الإدارة</Text>
                  <Text style={termsStyles.ruleText}>يحق للإدارة حظر أي حساب يخالف هذه الشروط أو يسيء الاستخدام دون إشعار مسبق.</Text>
                </View>
              </View>

              <View style={termsStyles.rule}>
                <View style={[termsStyles.ruleIcon, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="megaphone" size={18} color="#3B82F6" />
                </View>
                <View style={termsStyles.ruleContent}>
                  <Text style={termsStyles.ruleTitle}>الإبلاغ</Text>
                  <Text style={termsStyles.ruleText}>يرجى الإبلاغ عن أي محتوى مخالف للحفاظ على بيئة تعليمية نظيفة.</Text>
                </View>
              </View>

              <View style={termsStyles.rule}>
                <View style={[termsStyles.ruleIcon, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name="lock-closed" size={18} color="#22C55E" />
                </View>
                <View style={termsStyles.ruleContent}>
                  <Text style={termsStyles.ruleTitle}>حماية البيانات</Text>
                  <Text style={termsStyles.ruleText}>نحترم خصوصية بياناتك ولن يتم مشاركتها مع أطراف ثالثة دون إذنك.</Text>
                </View>
              </View>

              <View style={termsStyles.footerNote}>
                <Ionicons name="information-circle-outline" size={16} color={C.textSecondary} />
                <Text style={termsStyles.footerNoteText}>استخدامك للتطبيق يعني موافقتك على هذه الشروط.</Text>
              </View>
            </ScrollView>

            {/* Close Button */}
            <TouchableOpacity
              style={termsStyles.closeBtn}
              onPress={() => setShowTerms(false)}
              activeOpacity={0.85}
            >
              <Text style={termsStyles.closeBtnText}>فهمت، موافق</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

// ═══════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════
const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: C.bgMain },
  loadingContainer: {
    flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.bgMain,
  },
  decorCircle: { position: 'absolute' },

  // ─── Top Background ───
  topBgLayer: {
    position: 'absolute', top: 0, left: 0, right: 0,
    backgroundColor: C.topOverlay,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    overflow: 'hidden',
  },

  // ─── Header ───
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
    zIndex: 50,
  },
  headerIconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    color: C.white, fontSize: 20, fontWeight: '800',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  // ─── Avatar Hero ───
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 8,
  },
  avatarOuterRing: {
    width: 130, height: 130,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 18,
  },
  avatarInnerContainer: {
    width: 110, height: 110, borderRadius: 55,
    overflow: 'hidden',
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarImage: {
    width: '100%', height: '100%',
  },
  avatarPlaceholder: {
    width: '100%', height: '100%',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  userName: {
    fontSize: 28, fontWeight: '900', color: C.white,
    marginBottom: 8, textAlign: 'center',
  },
  roleBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1A3F37',
    paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 14,
  },
  roleDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#2FD67C',
  },
  roleText: {
    fontSize: 13, fontWeight: '700', color: C.white,
  },
  emailPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  emailText: {
    color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '500',
    maxWidth: width * 0.6,
  },

  // ─── Bento Stats Grid ───
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 28,
    direction: 'rtl',
  },
  bentoBigCard: {
    flex: 1,
    minWidth: (width - 52) / 3 - 4,
    backgroundColor: C.white,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.06)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 20,
      },
      android: { elevation: 4 },
    }),
  },
  bentoIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 10,
  },
  bentoValue: {
    fontSize: 20, fontWeight: '900', color: C.textPrimary,
    marginBottom: 4, textAlign: 'center',
  },
  bentoLabel: {
    fontSize: 11, fontWeight: '600', color: C.textSecondary,
    textAlign: 'center',
  },

  // ─── Navigation Section ───
  navSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18, fontWeight: '900', color: C.textPrimary,
    textAlign: 'right', marginBottom: 14,
    paddingHorizontal: 4,
  },
  navCardsContainer: {
    gap: 12,
  },
  navActionCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 18,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.06)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 20,
      },
      android: { elevation: 4 },
    }),
  },
  navActionBody: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navActionInfoRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  navActionIconBox: {
    width: 52, height: 52, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  navActionTextCol: {
    alignItems: 'flex-end',
    flex: 1,
  },
  navActionTitle: {
    fontSize: 16, fontWeight: '800', color: C.textPrimary,
    marginBottom: 4, textAlign: 'right',
  },
  navActionSubtitle: {
    fontSize: 12, fontWeight: '500', color: C.textSecondary,
    textAlign: 'right',
  },

  // ─── Logout ───
  logoutSection: {
    marginTop: 8,
  },
  logoutBtn: {
    backgroundColor: C.logoutBg,
    borderRadius: 20,
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.15)',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(255,107,107,0.15)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 20,
      },
      android: { elevation: 6 },
    }),
  },
  logoutText: {
    color: C.logoutText, fontSize: 16, fontWeight: '800',
  },
});

// ─── Terms of Service Modal Styles ───
const termsStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 28,
    width: '100%',
    maxHeight: '80%',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.2,
        shadowRadius: 32,
      },
      android: { elevation: 24 },
    }),
  },
  header: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 24,
    backgroundColor: C.softGreen,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  headerIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: C.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: C.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textSecondary,
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
  },
  intro: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textSecondary,
    textAlign: 'right',
    lineHeight: 22,
    marginBottom: 20,
  },
  rule: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 18,
    backgroundColor: '#FAFBFA',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  ruleIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ruleContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  ruleTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.textPrimary,
    marginBottom: 4,
    textAlign: 'right',
  },
  ruleText: {
    fontSize: 12,
    fontWeight: '500',
    color: C.textSecondary,
    lineHeight: 20,
    textAlign: 'right',
  },
  footerNote: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
  },
  footerNoteText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textSecondary,
    flex: 1,
    textAlign: 'right',
  },
  closeBtn: {
    backgroundColor: C.primary,
    marginHorizontal: 24,
    marginBottom: 24,
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 14,
      },
      android: { elevation: 6 },
    }),
  },
  closeBtnText: {
    color: C.white,
    fontSize: 16,
    fontWeight: '800',
  },
});
