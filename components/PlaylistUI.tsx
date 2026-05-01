import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ImageBackground,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as VideoThumbnails from 'expo-video-thumbnails';

// ─── Design System (from app/subject/[id].tsx) ───
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
  heroCard: '#0A1C18',
  heroDecor: '#152C26',
};

// ═══════════════════════════════════════════════
// PLAYLIST CARD (Collapsed YouTube-style)
// ═══════════════════════════════════════════════
export const PLAYLIST_THEMES = [
  { bg: '#12453D', soft: '#1A5C52' },
  { bg: '#1E3A5F', soft: '#274B77' },
  { bg: '#4A1942', soft: '#5E2256' },
  { bg: '#0C2D48', soft: '#144163' },
  { bg: '#3D1A0A', soft: '#5C2E16' },
];

// ─── Dynamic Video Thumbnail ───
export function DynamicThumbnail({ videoUrl, fallbackBg, children, style, imageStyle, resizeMode, source }: any) {
  const [thumb, setThumb] = useState<string | null>(null);
  
  useEffect(() => {
    let active = true;
    if (source || !videoUrl) return; // Skip if source explicitly provided
    VideoThumbnails.getThumbnailAsync(videoUrl, { time: 5000 })
      .then(res => { if (active) setThumb(res.uri) })
      .catch(err => console.log('Thumbnail error:', err));
    return () => { active = false };
  }, [videoUrl, source]);

  const activeSource = source || (thumb ? { uri: thumb } : undefined);

  return (
    <ImageBackground 
      source={activeSource} 
      style={[{ backgroundColor: fallbackBg }, style]}
      imageStyle={imageStyle}
      resizeMode={resizeMode || "cover"}
    >
      <View style={{...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: imageStyle?.borderRadius || 0}} />
      {children}
    </ImageBackground>
  );
}

export function PlaylistCard({ name, lectures, index, teacherName, onPress, overrideThumbnail }: {
  name: string; lectures: any[]; index: number; teacherName: string; onPress: () => void; overrideThumbnail?: string;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const theme = PLAYLIST_THEMES[index % PLAYLIST_THEMES.length];
  const thumbnailUrl = overrideThumbnail || lectures.find((l: any) => l.playlistThumbnailUrl)?.playlistThumbnailUrl;

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 500, delay: 150 + index * 100, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }).start();
  }, [index, anim]);

  return (
    <Animated.View style={{ marginBottom: 24, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }, { scale: pressScale }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={() => Animated.spring(pressScale, { toValue: 0.965, friction: 8, tension: 150, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(pressScale, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }).start()}
        onPress={onPress}
      >
        {/* ─── Stacked Cards Effect ─── */}
        <View style={plStyles.stackedWrapper}>
          {/* Back card (3rd layer) */}
          <View style={[plStyles.stackCard3, { backgroundColor: theme.soft }]} />
          {/* Middle card (2nd layer) */}
          <View style={[plStyles.stackCard2, { backgroundColor: theme.bg }]} />
          
          {/* Main thumbnail card */}
          <View style={plStyles.mainThumbnailCard}>
            <DynamicThumbnail
              videoUrl={!thumbnailUrl ? lectures[0]?.videoUrl : null}
              fallbackBg={theme.bg}
              source={thumbnailUrl ? { uri: thumbnailUrl } : undefined}
              style={plStyles.thumbnailBg}
              imageStyle={plStyles.thumbnailImage}
              resizeMode="cover"
            >
              <ImageBackground
                source={thumbnailUrl ? { uri: thumbnailUrl } : undefined}
                style={[StyleSheet.absoluteFillObject]}
                imageStyle={plStyles.thumbnailImage}
              >
                {/* Dark overlay for readability */}
                <View style={plStyles.thumbnailOverlay} />
                
                {/* Playlist title centered on thumbnail */}
                <View style={[plStyles.thumbnailContent, { height: '100%', justifyContent: 'center' }]}>
                  <Text style={plStyles.thumbnailTitle} numberOfLines={2}>{name}</Text>
                </View>

                {/* Video count badge — bottom right overlay */}
                <View style={plStyles.videoCountOverlay}>
                  <Ionicons name="list" size={14} color={C.white} />
                  <Text style={plStyles.videoCountText}>{lectures.length} فيديو</Text>
                </View>
              </ImageBackground>
            </DynamicThumbnail>
          </View>
        </View>

        {/* ─── Info Below Thumbnail ─── */}
        <View style={plStyles.infoRow}>
          <View style={plStyles.infoTextCol}>
            <Text style={plStyles.playlistTitle} numberOfLines={2}>{name}</Text>
            <View style={plStyles.infoMeta}>
              <Text style={plStyles.infoTeacher}>{teacherName}</Text>
              <Text style={plStyles.infoDot}>·</Text>
              <Text style={plStyles.infoLabel}>قائمة تشغيل</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════
// PLAYLIST MODAL (Expanded YouTube-style)
// ═══════════════════════════════════════════════
export function PlaylistModal({ visible, onClose, name, lectures, teacherName, themeIndex, overrideThumbnail, isTeacherMode, onAddPress, onSettingsPress, renderLectureRight }: {
  visible: boolean; onClose: () => void; name: string; lectures: any[]; teacherName: string; themeIndex: number; overrideThumbnail?: string;
  isTeacherMode?: boolean; onAddPress?: () => void; onSettingsPress?: () => void; renderLectureRight?: (lecture: any) => React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = PLAYLIST_THEMES[themeIndex % PLAYLIST_THEMES.length];
  const completedCount = lectures.filter((l: any) => l.status === 'مكتمل' || l.watched || l.progress === 100).length;
  const thumbnailUrl = overrideThumbnail || lectures.find((l: any) => l.playlistThumbnailUrl)?.playlistThumbnailUrl;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={plModalStyles.container}>
        <StatusBar barStyle="light-content" />
        
        {/* Sticky Top Header for pure navigation */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingTop: insets.top }}>
          <View style={plModalStyles.headerTopRow}>
            <TouchableOpacity onPress={onClose} style={plModalStyles.headerBtn}>
               <Ionicons name="chevron-forward" size={26} color={C.white} />
            </TouchableOpacity>
            {/* Ellipsis button removed as requested */}
            <View style={{ width: 44 }} />
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
          {/* Top Hero Section */}
          <View style={[plModalStyles.heroSection, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
            {/* Soft background glow */}
            <View style={[plModalStyles.heroGlow, { backgroundColor: theme.soft }]} />
            
            <View style={{ width: '100%' }}>
              <View style={{ paddingTop: 40, alignItems: 'center' }}>
                
                {/* Center Large Thumbnail */}
                <View style={[plModalStyles.heroThumbnailContainer, { shadowColor: theme.bg }]}>
                  <DynamicThumbnail
                    videoUrl={!thumbnailUrl ? lectures[0]?.videoUrl : null}
                    fallbackBg={theme.bg}
                    style={plModalStyles.heroThumbnail}
                    imageStyle={{ borderRadius: 20 }}
                  >
                    <ImageBackground 
                      source={thumbnailUrl ? { uri: thumbnailUrl } : undefined} 
                      style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', alignItems: 'center'}]}
                      imageStyle={{ borderRadius: 20 }}
                    >
                      {!thumbnailUrl && <Ionicons name="play" size={40} color="rgba(255,255,255,0.7)" />}
                    </ImageBackground>
                  </DynamicThumbnail>
                </View>

                {/* Playlist Info */}
                <Text style={plModalStyles.heroTitle} numberOfLines={2}>{name}</Text>
                
                <View style={plModalStyles.heroMetaRow}>
                  <Text style={plModalStyles.heroTeacher}>{teacherName}</Text>
                </View>
                
                <Text style={plModalStyles.heroStats}>
                  دورة · {lectures.length} فيديو · {completedCount} مكتمل
                </Text>

                {/* Main Action Buttons */}
                <View style={plModalStyles.actionButtonsRow}>
                  {isTeacherMode ? (
                    <>
                      <TouchableOpacity
                        style={plModalStyles.primaryPlayBtn}
                        activeOpacity={0.85}
                        onPress={() => {
                          if (onAddPress) onAddPress();
                        }}
                      >
                        <Ionicons name="add" size={24} color={theme.bg} />
                        <Text style={[plModalStyles.primaryPlayBtnText, { color: theme.bg }]}>إضافة محاضرة</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={plModalStyles.secondaryBtn}
                        activeOpacity={0.85}
                        onPress={() => {
                          if (onSettingsPress) onSettingsPress();
                        }}
                      >
                        <Ionicons name="settings-outline" size={24} color={C.white} />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={plModalStyles.primaryPlayBtn}
                        activeOpacity={0.85}
                        onPress={() => {
                          onClose();
                          if (lectures[0]) {
                            router.push({ pathname: '/video/[id]', params: { id: lectures[0].id } } as any);
                          }
                        }}
                      >
                        <Ionicons name="play" size={22} color={theme.bg} />
                        <Text style={[plModalStyles.primaryPlayBtnText, { color: theme.bg }]}>تشغيل الكل</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={plModalStyles.secondaryBtn}
                        activeOpacity={0.85}
                        onPress={() => {
                          onClose();
                          const randomLec = lectures[Math.floor(Math.random() * lectures.length)];
                          if (randomLec) {
                            router.push({ pathname: '/video/[id]', params: { id: randomLec.id } } as any);
                          }
                        }}
                      >
                        <Ionicons name="shuffle" size={24} color={C.white} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>

              </View>
            </View>
          </View>

          {/* Lecture List */}
          <View style={plModalStyles.listContainer}>
            {lectures.map((lecture: any, idx: number) => {
              const isCompleted = lecture.status === 'مكتمل' || lecture.watched || lecture.progress === 100;
              const lectureThumb = lecture.thumbnailUrl || lecture.videoThumbnailUrl; 
              
              return (
                <View key={lecture.id} style={plModalStyles.lectureRow}>
                  <TouchableOpacity
                    style={plModalStyles.lecturePressArea}
                    activeOpacity={0.7}
                    onPress={() => {
                      onClose();
                      router.push({ pathname: '/video/[id]', params: { id: lecture.id } } as any);
                    }}
                  >
                  <View style={plModalStyles.lectureIndex}>
                     <Text style={plModalStyles.lectureIndexText}>{idx + 1}</Text>
                  </View>

                  <View style={[plModalStyles.lectureThumbnailSmall, { backgroundColor: PLAYLIST_THEMES[idx % PLAYLIST_THEMES.length].bg }]}>
                     <DynamicThumbnail
                       videoUrl={lecture.videoUrl}
                       fallbackBg={PLAYLIST_THEMES[idx % PLAYLIST_THEMES.length].bg}
                       style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
                       imageStyle={{ borderRadius: 8 }}
                     >
                       <ImageBackground 
                         source={lectureThumb ? { uri: lectureThumb } : (thumbnailUrl ? { uri: thumbnailUrl } : undefined)} 
                         style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
                         imageStyle={{ borderRadius: 8 }}
                       >
                         <View style={{...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 8}} />
                         <Ionicons name="play" size={22} color="rgba(255,255,255,0.9)" />
                       </ImageBackground>
                     </DynamicThumbnail>
                     {isCompleted && (
                       <View style={plModalStyles.completedOverlayBadge}>
                         <Ionicons name="checkmark" size={12} color={C.white} />
                       </View>
                     )}
                  </View>

                  <View style={plModalStyles.lectureInfoCol}>
                    <Text style={plModalStyles.lectureTitle} numberOfLines={2}>{lecture.title || 'محاضرة بدون عنوان'}</Text>
                    <Text style={plModalStyles.lectureMeta}>{teacherName} · {lecture.duration && lecture.duration !== 'غير محدد' ? lecture.duration : 'فيديو'}</Text>
                  </View>
                  </TouchableOpacity>
                  
                  {renderLectureRight ? renderLectureRight(lecture) : (
                    <Ionicons name="ellipsis-vertical" size={16} color={C.textSecondary} style={{ alignSelf: 'center', paddingLeft: 10 }} />
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════════
// PLAYLIST CARD STYLES
// ═══════════════════════════════════════════════
export const plStyles = StyleSheet.create({
  stackedWrapper: { position: 'relative', paddingTop: 8, marginBottom: 4 },
  stackCard3: { position: 'absolute', top: 0, left: 8, right: 8, height: 12, borderTopLeftRadius: 16, borderTopRightRadius: 16, opacity: 0.4 },
  stackCard2: { position: 'absolute', top: 4, left: 4, right: 4, height: 12, borderTopLeftRadius: 16, borderTopRightRadius: 16, opacity: 0.7 },
  mainThumbnailCard: { borderRadius: 16, overflow: 'hidden', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20 }, android: { elevation: 6 } }) },
  thumbnailBg: { width: '100%', aspectRatio: 16 / 9, justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' },
  thumbnailImage: { borderRadius: 16 },
  thumbnailOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  thumbnailContent: { zIndex: 3, alignItems: 'center', paddingHorizontal: 20 },
  thumbnailTitle: { fontSize: 22, fontWeight: '900', color: C.white, textAlign: 'center', lineHeight: 30, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  videoCountOverlay: { position: 'absolute', bottom: 10, right: 10, flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, zIndex: 5 },
  videoCountText: { fontSize: 13, fontWeight: '700', color: C.white },
  infoRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', paddingTop: 12, paddingHorizontal: 4, gap: 12 },
  infoTextCol: { flex: 1, alignItems: 'flex-end' },
  playlistTitle: { fontSize: 16, fontWeight: '800', color: C.textPrimary, textAlign: 'right', lineHeight: 22, marginBottom: 4 },
  infoMeta: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  infoTeacher: { fontSize: 13, fontWeight: '600', color: C.textSecondary },
  infoDot: { fontSize: 13, color: C.textSecondary, paddingHorizontal: 2 },
  infoLabel: { fontSize: 13, fontWeight: '600', color: C.textSecondary },
  ungroupedHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 14, marginTop: 8 },
  ungroupedIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: C.softGold, justifyContent: 'center', alignItems: 'center' },
  ungroupedTitle: { fontSize: 16, fontWeight: '800', color: C.textPrimary },
});

// ═══════════════════════════════════════════════
// PLAYLIST MODAL STYLES
// ═══════════════════════════════════════════════
const plModalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bgMain },
  headerTopRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 22 },
  headerBtnTrans: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  heroSection: { paddingBottom: 30, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, overflow: 'hidden', position: 'relative', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20 }, android: { elevation: 12 } }) },
  heroGlow: { position: 'absolute', top: -80, right: -60, width: 300, height: 300, borderRadius: 150, opacity: 0.5 },
  heroThumbnailContainer: { width: 200, height: 200, borderRadius: 20, marginBottom: 24, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.35, shadowRadius: 25 }, android: { elevation: 15 } }) },
  heroThumbnail: { width: '100%', height: '100%', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  heroTitle: { fontSize: 26, fontWeight: '900', color: C.white, textAlign: 'center', paddingHorizontal: 24, marginBottom: 8, lineHeight: 34 },
  heroMetaRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 4 },
  heroTeacher: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  heroStats: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: 24 },
  actionButtonsRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 16, paddingHorizontal: 24, width: '100%' },
  primaryPlayBtn: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', backgroundColor: C.white, borderRadius: 100, paddingVertical: 14, gap: 8 },
  primaryPlayBtnText: { fontSize: 18, fontWeight: '900' },
  secondaryBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  listContainer: { paddingTop: 16, paddingHorizontal: 16 },
  lectureRow: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 12, gap: 14 },
  lecturePressArea: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 14 },
  lectureIndex: { width: 24, alignItems: 'center', justifyContent: 'center' },
  lectureIndexText: { fontSize: 15, fontWeight: '700', color: C.textSecondary },
  lectureThumbnailSmall: { width: 140, height: 75, borderRadius: 8, justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' },
  completedOverlayBadge: { position: 'absolute', bottom: 6, right: 6, backgroundColor: C.success, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: C.white },
  lectureInfoCol: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },
  lectureTitle: { fontSize: 15, fontWeight: '800', color: C.textPrimary, textAlign: 'right', marginBottom: 6, lineHeight: 20 },
  lectureMeta: { fontSize: 13, fontWeight: '600', color: C.textSecondary, textAlign: 'right' },
});
