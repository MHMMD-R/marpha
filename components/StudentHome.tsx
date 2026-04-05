import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useEffect } from 'react';
import {
  Animated,
  Dimensions,
  I18nManager,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

// Colors
const MAROON_DARK = '#08221f';
const WHITE = '#FFFFFF';
const TEXT_GRAY = '#666666';
const TEXT_BLACK = '#222222';
const YELLOW = '#FDD835';

interface AnimatedCardProps {
  item: {
    id: number;
    lecturerName: string;
    subject: string;
    image: any;
  };
  index: number;
}

function AnimatedCard({ item, index }: AnimatedCardProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay: index * 100,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        delay: index * 100,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, scaleAnim, fadeAnim]);

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.card}
      >
        <Image
          source={item.image}
          style={styles.cardImage}
          resizeMode="cover"
        />
        <View style={styles.cardTextContainer}>
          <Text style={styles.lecturerName} numberOfLines={1}>{item.lecturerName}</Text>
          <Text style={styles.subjectName} numberOfLines={1}>{item.subject}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const BackgroundDecorations = () => (
  <View style={StyleSheet.absoluteFill}>
    {/* Abstract faint white circular patterns */}
    <View style={[styles.decorationCircle, { top: '10%', left: '5%', width: 120, height: 120 }]} />
    <View style={[styles.decorationCircle, { top: '35%', right: '-15%', width: 200, height: 200 }]} />
    <View style={[styles.decorationCircle, { top: '65%', left: '15%', width: 90, height: 90 }]} />
    <View style={[styles.decorationCircle, { bottom: '-5%', right: '25%', width: 150, height: 150 }]} />
    <View style={[styles.decorationCircle, { top: '5%', right: '20%', width: 60, height: 60 }]} />
  </View>
);

interface StudentHomeProps {
  onSwitchPage: () => void;
}

export default function StudentHome({ onSwitchPage }: StudentHomeProps) {
  useEffect(() => {
    if (!I18nManager.isRTL) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(true);
    }
  }, []);

  const lecturers = [
    {
      id: 1,
      lecturerName: 'أ. أحمد الخالدي',
      subject: 'الكيمياء | السادس الاعدادي',
      image: require('@/assets/images/lectures_card.png'),
    },
    {
      id: 2,
      lecturerName: 'أ. محمود حسين',
      subject: 'الفيزياء | السادس الاعدادي',
      image: require('@/assets/images/subjects_card.png'),
    },
    {
      id: 3,
      lecturerName: 'أ. فاطمة علي',
      subject: 'الرياضيات | السادس الاعدادي',
      image: require('@/assets/images/quizzes_card.png'),
    },
    {
      id: 4,
      lecturerName: 'أ. زينب خليل',
      subject: 'الاحياء | السادس الاعدادي',
      image: require('@/assets/images/notifications_card.png'),
    },
    {
      id: 5,
      lecturerName: 'أ. مصطفى عبد',
      subject: 'اللغة الانكليزية | السادس الاعدادي',
      image: require('@/assets/images/lectures_card.png'),
    },
    {
      id: 6,
      lecturerName: 'أ. سارة حسن',
      subject: 'اللغة العربية | السادس الاعدادي',
      image: require('@/assets/images/subjects_card.png'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <BackgroundDecorations />
      
      {/* Header outside ScrollView for stickiness */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconBtn}>
          <Ionicons name="notifications" size={24} color={MAROON_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>محطة الطالب</Text>
        <TouchableOpacity style={styles.headerIconBtn}>
          <Ionicons name="person" size={24} color={MAROON_DARK} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.gridContainer}>
          {lecturers.map((item, index) => (
            <AnimatedCard key={item.id} item={item} index={index} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MAROON_DARK, // Deep green background
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    marginTop: 5,
  },
  decorationCircle: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 999,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
    direction: 'rtl',
  },
  headerIconBtn: {
    width: 48,
    height: 48,
    backgroundColor: YELLOW,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: WHITE,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Grid
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    direction: 'rtl',
  },
  cardWrapper: {
    width: '48%',
    marginBottom: 16,
  },
  card: {
    backgroundColor: WHITE,
    borderRadius: 22,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    aspectRatio: 0.78, // Taller card design fitting image and text
  },
  cardImage: {
    width: '100%',
    flex: 1,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  cardTextContainer: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  lecturerName: {
    fontSize: 13,
    color: TEXT_GRAY,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  subjectName: {
    fontSize: 15,
    color: TEXT_BLACK,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
