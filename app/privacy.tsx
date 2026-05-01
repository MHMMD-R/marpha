import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  softGreen: "#EEF5F3",
};

type Lang = "ar" | "en";

const content = {
  ar: {
    headerTitle: "سياسة الخصوصية",
    lastUpdated: "آخر تحديث: 30 أبريل 2026",
    intro:
      "نرحب بك في تطبيق المعرفة اكاديمي (\"التطبيق\"). نحن نقدر ثقتك ونلتزم بحماية خصوصيتك وبياناتك الشخصية. توضح هذه السياسة كيفية جمع واستخدام وحماية ومشاركة معلوماتك عند استخدامك للتطبيق.",
    footer:
      "باستخدامك لتطبيق المعرفة اكاديمي، فإنك توافق على سياسة الخصوصية هذه وتقر بأنك قد قرأتها وفهمت محتواها.",
    sections: [
      {
        icon: "information-circle",
        iconColor: "#3B82F6",
        iconBg: "#EFF6FF",
        title: "1. المعلومات التي نجمعها",
        paragraphs: [],
        subSections: [
          {
            subTitle: "أ. المعلومات التي تقدمها لنا:",
            items: [
              "الاسم الكامل واسم المستخدم",
              "عنوان البريد الإلكتروني",
              "رقم الهاتف (إن وُجد)",
              "كلمة المرور (مشفرة)",
              "المرحلة الدراسية والصف",
              "الصورة الشخصية (اختياري)",
            ],
          },
          {
            subTitle: "ب. المعلومات التي نجمعها تلقائياً:",
            items: [
              "معرّف الجهاز الفريد (Device ID)",
              "نوع الجهاز ونظام التشغيل",
              "رمز الإشعارات (Push Token)",
              "بيانات الاستخدام (المحاضرات المشاهدة، الاختبارات المكتملة)",
              "عنوان IP (لأغراض أمنية فقط)",
            ],
          },
        ],
      },
      {
        icon: "construct",
        iconColor: "#22C55E",
        iconBg: "#F0FDF4",
        title: "2. كيف نستخدم معلوماتك",
        paragraphs: [],
        items: [
          "إنشاء وإدارة حسابك الشخصي",
          "تقديم المحتوى التعليمي (محاضرات، اختبارات، مواد دراسية)",
          "إرسال الإشعارات المتعلقة بالدروس والتحديثات",
          "تتبع تقدمك الدراسي وعرض الإحصائيات",
          "ضمان أمان الحساب من خلال ربط الجهاز",
          "حماية المحتوى التعليمي من النسخ غير المصرح به",
          "تحسين أداء التطبيق وتجربة المستخدم",
          "التواصل معك بشأن تحديثات الخدمة",
        ],
      },
      {
        icon: "share-social",
        iconColor: "#EF4444",
        iconBg: "#FEF2F2",
        title: "3. مشاركة المعلومات",
        paragraphs: [
          "نحن لا نبيع أو نؤجر أو نتاجر ببياناتك الشخصية مع أي طرف ثالث. قد نشارك معلوماتك فقط في الحالات التالية:",
        ],
        items: [
          "مع المدرسين المرتبطين بمقرراتك الدراسية (الاسم والتقدم الدراسي فقط)",
          "مع مقدمي الخدمات التقنية الضرورية (Firebase من Google) لتشغيل التطبيق",
          "عند الاستجابة لطلبات قانونية ملزمة من السلطات المختصة",
          "لحماية حقوق المنصة أو سلامة المستخدمين الآخرين",
        ],
      },
      {
        icon: "lock-closed",
        iconColor: "#F59E0B",
        iconBg: "#FFF7ED",
        title: "4. أمان البيانات",
        paragraphs: ["نتخذ تدابير أمنية صارمة لحماية بياناتك، تشمل:"],
        items: [
          "تشفير كلمات المرور باستخدام خوارزميات متقدمة",
          "استخدام اتصال HTTPS مشفر لجميع عمليات نقل البيانات",
          "سياسة الجهاز الواحد لمنع الوصول غير المصرح به",
          "مراقبة محاولات تسجيل الشاشة وحظرها لحماية المحتوى",
          "تخزين البيانات على خوادم Firebase المؤمنة من Google",
          "مراجعات أمنية دورية لضمان سلامة النظام",
        ],
      },
      {
        icon: "time",
        iconColor: "#8B5CF6",
        iconBg: "#F5F3FF",
        title: "5. الاحتفاظ بالبيانات",
        paragraphs: [
          "نحتفظ ببياناتك الشخصية طالما أن حسابك نشط أو حسب الحاجة لتقديم خدماتنا. عند حذف حسابك:",
        ],
        items: [
          "يتم حذف بياناتك الشخصية خلال 30 يوماً",
          "قد نحتفظ ببعض البيانات المجهولة الهوية لأغراض إحصائية",
          "يتم حذف رمز الإشعارات فوراً عند تعطيل الإشعارات أو حذف الحساب",
        ],
      },
      {
        icon: "person",
        iconColor: "#10B981",
        iconBg: "#ECFDF5",
        title: "6. حقوقك",
        paragraphs: ["لديك الحقوق التالية فيما يتعلق ببياناتك الشخصية:"],
        items: [
          "الوصول: يحق لك طلب نسخة من بياناتك الشخصية المخزنة لدينا",
          "التصحيح: يمكنك تحديث معلوماتك الشخصية في أي وقت من خلال ملفك الشخصي",
          "الحذف: يمكنك حذف حسابك بالكامل من إعدادات الملف الشخصي",
          "الانسحاب: يمكنك إيقاف الإشعارات في أي وقت",
          "النقل: يحق لك طلب نقل بياناتك بصيغة قابلة للقراءة",
        ],
      },
      {
        icon: "people",
        iconColor: "#F43F5E",
        iconBg: "#FFF1F2",
        title: "7. خصوصية الأطفال",
        paragraphs: [
          "تطبيقنا مصمم للطلاب من جميع الأعمار. نحن نلتزم بحماية خصوصية القاصرين ونتخذ الإجراءات التالية:",
        ],
        items: [
          "لا نجمع بيانات شخصية من الأطفال دون سن 13 عاماً بدون موافقة ولي الأمر",
          "لا نعرض إعلانات موجهة للأطفال",
          "لا نسمح بالتواصل المباشر بين الطلاب دون إشراف",
          "يمكن لولي الأمر طلب حذف بيانات الطفل في أي وقت",
        ],
      },
      {
        icon: "notifications",
        iconColor: "#CA8A04",
        iconBg: "#FEF9C3",
        title: "8. الإشعارات",
        paragraphs: [
          "نستخدم خدمة الإشعارات (Push Notifications) لإرسال تنبيهات تعليمية مثل:",
        ],
        items: [
          "إشعارات بالمحاضرات الجديدة",
          "تذكيرات بالاختبارات القادمة",
          "رسائل من المدرسين",
          "تحديثات مهمة للتطبيق",
        ],
        afterItems: [
          "يمكنك إيقاف تشغيل الإشعارات في أي وقت من إعدادات ملفك الشخصي أو من إعدادات جهازك.",
        ],
      },
      {
        icon: "globe",
        iconColor: "#0284C7",
        iconBg: "#F0F9FF",
        title: "9. خدمات الطرف الثالث",
        paragraphs: ["نستخدم الخدمات التالية لتشغيل التطبيق:"],
        items: [
          "Google Firebase: للمصادقة وتخزين البيانات والإشعارات",
          "Expo: لإدارة التحديثات وإرسال الإشعارات",
        ],
        afterItems: [
          "تخضع هذه الخدمات لسياسات الخصوصية الخاصة بها. ننصحك بمراجعتها للاطلاع على كيفية تعاملها مع بياناتك.",
        ],
      },
      {
        icon: "refresh",
        iconColor: "#EC4899",
        iconBg: "#FDF2F8",
        title: "10. التغييرات على هذه السياسة",
        paragraphs: [
          "قد نقوم بتحديث سياسة الخصوصية هذه من وقت لآخر. سنقوم بإخطارك بأي تغييرات جوهرية من خلال:",
        ],
        items: [
          "إشعار داخل التطبيق",
          "تحديث تاريخ \"آخر تحديث\" في أعلى هذه الصفحة",
        ],
        afterItems: [
          "استمرارك في استخدام التطبيق بعد نشر التغييرات يعني موافقتك على السياسة المحدثة.",
        ],
      },
      {
        icon: "mail",
        iconColor: "#475569",
        iconBg: "#F1F5F9",
        title: "11. تواصل معنا",
        paragraphs: [
          "إذا كان لديك أي أسئلة أو استفسارات حول سياسة الخصوصية هذه أو ممارساتنا المتعلقة بالبيانات، يمكنك التواصل معنا عبر:",
        ],
        contact: { app: "المعرفة اكاديمي", email: "support@marpha.app" },
      },
    ],
  },
  en: {
    headerTitle: "Privacy Policy",
    lastUpdated: "Last updated: April 30, 2026",
    intro:
      'Welcome to Marpha Academy ("the App"). We value your trust and are committed to protecting your privacy and personal data. This policy explains how we collect, use, protect, and share your information when you use the App.',
    footer:
      "By using the Marpha Academy app, you agree to this Privacy Policy and acknowledge that you have read and understood its contents.",
    sections: [
      {
        icon: "information-circle",
        iconColor: "#3B82F6",
        iconBg: "#EFF6FF",
        title: "1. Information We Collect",
        paragraphs: [],
        subSections: [
          {
            subTitle: "a. Information you provide to us:",
            items: [
              "Full name and username",
              "Email address",
              "Phone number (if provided)",
              "Password (encrypted)",
              "Academic stage and grade",
              "Profile picture (optional)",
            ],
          },
          {
            subTitle: "b. Information we collect automatically:",
            items: [
              "Unique Device ID",
              "Device type and operating system",
              "Push notification token",
              "Usage data (lectures watched, quizzes completed)",
              "IP address (for security purposes only)",
            ],
          },
        ],
      },
      {
        icon: "construct",
        iconColor: "#22C55E",
        iconBg: "#F0FDF4",
        title: "2. How We Use Your Information",
        paragraphs: [],
        items: [
          "Create and manage your personal account",
          "Deliver educational content (lectures, quizzes, study materials)",
          "Send notifications about lessons and updates",
          "Track your academic progress and display statistics",
          "Ensure account security through device binding",
          "Protect educational content from unauthorized copying",
          "Improve app performance and user experience",
          "Communicate with you about service updates",
        ],
      },
      {
        icon: "share-social",
        iconColor: "#EF4444",
        iconBg: "#FEF2F2",
        title: "3. Information Sharing",
        paragraphs: [
          "We do not sell, rent, or trade your personal data with any third party. We may share your information only in the following cases:",
        ],
        items: [
          "With teachers associated with your courses (name and academic progress only)",
          "With necessary technical service providers (Google Firebase) to operate the app",
          "When responding to binding legal requests from competent authorities",
          "To protect the platform's rights or the safety of other users",
        ],
      },
      {
        icon: "lock-closed",
        iconColor: "#F59E0B",
        iconBg: "#FFF7ED",
        title: "4. Data Security",
        paragraphs: [
          "We take strict security measures to protect your data, including:",
        ],
        items: [
          "Password encryption using advanced algorithms",
          "HTTPS encrypted connection for all data transfers",
          "Single-device policy to prevent unauthorized access",
          "Monitoring and blocking screen recording attempts to protect content",
          "Data stored on Google's secured Firebase servers",
          "Regular security reviews to ensure system integrity",
        ],
      },
      {
        icon: "time",
        iconColor: "#8B5CF6",
        iconBg: "#F5F3FF",
        title: "5. Data Retention",
        paragraphs: [
          "We retain your personal data as long as your account is active or as needed to provide our services. When you delete your account:",
        ],
        items: [
          "Your personal data is deleted within 30 days",
          "We may retain some anonymized data for statistical purposes",
          "Push notification token is deleted immediately when notifications are disabled or account is deleted",
        ],
      },
      {
        icon: "person",
        iconColor: "#10B981",
        iconBg: "#ECFDF5",
        title: "6. Your Rights",
        paragraphs: [
          "You have the following rights regarding your personal data:",
        ],
        items: [
          "Access: You may request a copy of your personal data stored with us",
          "Correction: You can update your personal information at any time through your profile",
          "Deletion: You can delete your account entirely from profile settings",
          "Opt-out: You can disable notifications at any time",
          "Portability: You may request your data in a readable format",
        ],
      },
      {
        icon: "people",
        iconColor: "#F43F5E",
        iconBg: "#FFF1F2",
        title: "7. Children's Privacy",
        paragraphs: [
          "Our app is designed for students of all ages. We are committed to protecting children's privacy and take the following measures:",
        ],
        items: [
          "We do not collect personal data from children under 13 without parental consent",
          "We do not display targeted advertisements to children",
          "We do not allow direct communication between students without supervision",
          "Parents can request deletion of their child's data at any time",
        ],
      },
      {
        icon: "notifications",
        iconColor: "#CA8A04",
        iconBg: "#FEF9C3",
        title: "8. Notifications",
        paragraphs: [
          "We use Push Notifications to send educational alerts such as:",
        ],
        items: [
          "New lecture notifications",
          "Upcoming quiz reminders",
          "Messages from teachers",
          "Important app updates",
        ],
        afterItems: [
          "You can disable notifications at any time from your profile settings or your device settings.",
        ],
      },
      {
        icon: "globe",
        iconColor: "#0284C7",
        iconBg: "#F0F9FF",
        title: "9. Third-Party Services",
        paragraphs: [
          "We use the following services to operate the app:",
        ],
        items: [
          "Google Firebase: for authentication, data storage, and notifications",
          "Expo: for update management and push notifications",
        ],
        afterItems: [
          "These services are subject to their own privacy policies. We recommend reviewing them to learn how they handle your data.",
        ],
      },
      {
        icon: "refresh",
        iconColor: "#EC4899",
        iconBg: "#FDF2F8",
        title: "10. Changes to This Policy",
        paragraphs: [
          "We may update this Privacy Policy from time to time. We will notify you of any material changes through:",
        ],
        items: [
          "In-app notification",
          'Updating the "Last updated" date at the top of this page',
        ],
        afterItems: [
          "Your continued use of the app after changes are posted means you accept the updated policy.",
        ],
      },
      {
        icon: "mail",
        iconColor: "#475569",
        iconBg: "#F1F5F9",
        title: "11. Contact Us",
        paragraphs: [
          "If you have any questions or concerns about this Privacy Policy or our data practices, you can contact us through:",
        ],
        contact: { app: "Marpha Academy", email: "support@marpha.app" },
      },
    ],
  },
};

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [lang, setLang] = useState<Lang>("ar");

  const isRTL = lang === "ar";
  const t = content[lang];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={22} color={C.white} />
        </TouchableOpacity>
        <View style={[styles.headerCenter, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Ionicons name="shield-checkmark" size={24} color={C.accent} />
          <Text style={styles.headerTitle}>{t.headerTitle}</Text>
        </View>
        {/* Language Toggle */}
        <TouchableOpacity
          style={styles.langBtn}
          onPress={() => setLang(lang === "ar" ? "en" : "ar")}
          activeOpacity={0.7}
        >
          <Ionicons name="language" size={16} color={C.white} />
          <Text style={styles.langBtnText}>{lang === "ar" ? "EN" : "ع"}</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.lastUpdated, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Ionicons name="time-outline" size={14} color={C.textSecondary} />
          <Text style={styles.lastUpdatedText}>{t.lastUpdated}</Text>
        </View>

        <Text style={[styles.intro, { textAlign: isRTL ? "right" : "left" }]}>
          {t.intro}
        </Text>

        {t.sections.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <View style={[styles.sectionHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={[styles.sectionIcon, { backgroundColor: section.iconBg }]}>
                <Ionicons name={section.icon as any} size={20} color={section.iconColor} />
              </View>
              <Text style={[styles.sectionTitle, { textAlign: isRTL ? "right" : "left" }]}>
                {section.title}
              </Text>
            </View>

            {section.paragraphs?.map((p, pIdx) => (
              <Text key={pIdx} style={[styles.paragraph, { textAlign: isRTL ? "right" : "left" }]}>
                {p}
              </Text>
            ))}

            {(section as any).subSections?.map((sub: any, sIdx: number) => (
              <View key={sIdx}>
                <Text style={[styles.subTitle, { textAlign: isRTL ? "right" : "left" }]}>
                  {sub.subTitle}
                </Text>
                <View style={styles.bulletList}>
                  {sub.items.map((item: string, iIdx: number) => (
                    <Text
                      key={iIdx}
                      style={[styles.bulletItem, { textAlign: isRTL ? "right" : "left" }]}
                    >
                      • {item}
                    </Text>
                  ))}
                </View>
              </View>
            ))}

            {(section as any).items && (
              <View style={styles.bulletList}>
                {(section as any).items.map((item: string, iIdx: number) => (
                  <Text
                    key={iIdx}
                    style={[styles.bulletItem, { textAlign: isRTL ? "right" : "left" }]}
                  >
                    • {item}
                  </Text>
                ))}
              </View>
            )}

            {(section as any).afterItems?.map((p: string, aIdx: number) => (
              <Text key={aIdx} style={[styles.paragraph, { textAlign: isRTL ? "right" : "left", marginTop: 8 }]}>
                {p}
              </Text>
            ))}

            {(section as any).contact && (
              <View style={styles.contactBox}>
                <View style={[styles.contactRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <Text style={styles.contactLabel}>
                    {isRTL ? "التطبيق:" : "App:"}
                  </Text>
                  <Text style={styles.contactValue}>{(section as any).contact.app}</Text>
                </View>
                <View style={[styles.contactRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <Text style={styles.contactLabel}>
                    {isRTL ? "البريد الإلكتروني:" : "Email:"}
                  </Text>
                  <Text style={styles.contactValue}>{(section as any).contact.email}</Text>
                </View>
              </View>
            )}
          </View>
        ))}

        {/* Footer agreement */}
        <View style={[styles.footerBox, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Ionicons name="checkmark-circle" size={20} color={C.primary} />
          <Text style={[styles.footerText, { textAlign: isRTL ? "right" : "left" }]}>
            {t.footer}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bgMain,
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: C.topOverlay,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: C.white,
  },
  langBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  langBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: C.white,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  lastUpdated: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  lastUpdatedText: {
    fontSize: 12,
    fontWeight: "600",
    color: C.textSecondary,
  },
  intro: {
    fontSize: 14,
    fontWeight: "600",
    color: C.textPrimary,
    textAlign: "right",
    lineHeight: 24,
    marginBottom: 24,
    backgroundColor: C.softGreen,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  section: {
    marginBottom: 24,
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: C.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  sectionHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: C.textPrimary,
    flex: 1,
    textAlign: "right",
  },
  subTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.primarySoft,
    textAlign: "right",
    marginBottom: 8,
    marginTop: 8,
  },
  paragraph: {
    fontSize: 13,
    fontWeight: "500",
    color: C.textSecondary,
    textAlign: "right",
    lineHeight: 22,
    marginBottom: 10,
  },
  bulletList: {
    marginBottom: 8,
  },
  bulletItem: {
    fontSize: 13,
    fontWeight: "500",
    color: C.textSecondary,
    textAlign: "right",
    lineHeight: 24,
    paddingRight: 4,
  },
  contactBox: {
    backgroundColor: C.softGreen,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    gap: 8,
  },
  contactRow: {
    flexDirection: "row-reverse",
    gap: 8,
  },
  contactLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: C.textPrimary,
  },
  contactValue: {
    fontSize: 13,
    fontWeight: "500",
    color: C.primarySoft,
  },
  footerBox: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: C.softGreen,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  footerText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textPrimary,
    flex: 1,
    textAlign: "right",
    lineHeight: 22,
  },
});
