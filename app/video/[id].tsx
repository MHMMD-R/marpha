import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    GestureResponderEvent,
    Image,
    LayoutChangeEvent,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebase';

const { width: SCREEN_W } = Dimensions.get('window');
const VIDEO_HEIGHT = SCREEN_W * (9 / 16);
const DEFAULT_VIDEO_SOURCE =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
const QR_SIZE = 64;
const QR_MARGIN = 10;

const C = {
  bgMain: '#F4F7F6',
  topOverlay: '#0B2923',
  topOverlaySoft: '#123B34',
  primary: '#12453D',
  primarySoft: '#2E5E55',
  accent: '#E3A736',
  accentDark: '#C48E1C',
  white: '#FFFFFF',
  textPrimary: '#10241F',
  textSecondary: '#8A9E99',
  borderLight: '#E8EDEC',
  softGreen: '#EEF5F3',
  softGold: '#FFF8E8',
  success: '#10B981',
  successSoft: '#ECFDF5',
  surface: '#FFFFFF',
  playerBg: '#060E0C',
};

type LectureDoc = {
  title?: string;
  duration?: string;
  description?: string;
  videoUrl?: string;
  link?: string;
  subject?: string;
  playlistName?: string;
  createdAt?: {
    toDate?: () => Date;
  } | {
    seconds: number;
    nanoseconds: number;
  } | number;
};

type LessonItem = {
  id: string;
  title: string;
  duration: string;
  thumbnail: string;
  locked?: boolean;
};

const THUMBNAILS = [
  'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=80',
];

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function resolveVideoSource(link?: string): string {
  const cleaned = link?.trim();
  if (!cleaned) {
    return DEFAULT_VIDEO_SOURCE;
  }

  const isHttp = /^https?:\/\//i.test(cleaned);
  return isHttp ? cleaned : DEFAULT_VIDEO_SOURCE;
}

function buildFallbackLessons(): LessonItem[] {
  return [
    {
      id: 'fallback-1',
      title: 'تحليل احتياجات المتعلمين',
      duration: '15:20 دقيقة',
      thumbnail: THUMBNAILS[0],
      locked: true,
    },
    {
      id: 'fallback-2',
      title: 'أدوات التأليف الرقمي',
      duration: '22:10 دقيقة',
      thumbnail: THUMBNAILS[1],
    },
    {
      id: 'fallback-3',
      title: 'استراتيجيات التقييم',
      duration: '18:45 دقيقة',
      thumbnail: THUMBNAILS[2],
    },
  ];
}

function formatTime(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function VideoPlayerScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const lectureId = Array.isArray(id) ? id[0] : id;

  const [loading, setLoading] = useState(true);
  const [lecture, setLecture] = useState<LectureDoc | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isWatched, setIsWatched] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [upcomingLessons, setUpcomingLessons] = useState<LessonItem[]>(buildFallbackLessons());
  const [playlistContext, setPlaylistContext] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [timelineWidth, setTimelineWidth] = useState(0);
  const [encodedUsername, setEncodedUsername] = useState('anonymous-user');
  const [mainQr, setMainQr] = useState({ visible: false, position: { top: QR_MARGIN, left: QR_MARGIN } });
  const [ghostQr, setGhostQr] = useState({ visible: false, position: { top: QR_MARGIN, left: QR_MARGIN } });
  const videoViewRef = useRef<VideoView>(null);

  const source = useMemo(() => {
    const rawSource = lecture?.videoUrl || lecture?.link;
    return resolveVideoSource(rawSource);
  }, [lecture?.videoUrl, lecture?.link]);

  const player = useVideoPlayer(source, videoPlayer => {
    videoPlayer.loop = false;
    videoPlayer.pause();
  });

  useEffect(() => {
    const assignEncodedUser = () => {
      const user = auth.currentUser;
      const fullUsername = user?.displayName?.trim() || user?.email?.trim() || 'anonymous-user';
      setEncodedUsername(fullUsername);
    };

    assignEncodedUser();
    const unsubscribe = auth.onAuthStateChanged(assignEncodedUser);

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        let currentLectureData: LectureDoc | null = null;
        if (lectureId) {
          const currentLectureRef = doc(db, 'lectures', lectureId);
          const currentLectureSnap = await getDoc(currentLectureRef);
          if (mounted && currentLectureSnap.exists()) {
            currentLectureData = currentLectureSnap.data() as LectureDoc;
            setLecture(currentLectureData);
          }
        }

        if (!mounted) {
          return;
        }

        let relatedDocs: any[] = [];

        if (currentLectureData?.playlistName && currentLectureData.playlistName !== 'محاضرات أخرى') {
          setPlaylistContext(currentLectureData.playlistName);
          const playlistQuery = query(
            collection(db, 'lectures'),
            where('status', 'in', ['accepted', 'active']),
            where('playlistName', '==', currentLectureData.playlistName),
            limit(20)
          );
          const pSnap = await getDocs(playlistQuery);
          if (!mounted) return;

          let docs = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          docs.sort((a: any, b: any) => {
            const tA = (a.createdAt?.seconds || a.createdAt || 0);
            const tB = (b.createdAt?.seconds || b.createdAt || 0);
            return tA - tB;
          });

          const currentIndex = docs.findIndex(d => d.id === lectureId);
          if (currentIndex !== -1) {
            relatedDocs = docs.slice(currentIndex + 1);
          }

          if (relatedDocs.length === 0) {
            relatedDocs = docs.filter(d => d.id !== lectureId);
          }
        }

        if (relatedDocs.length === 0 && currentLectureData?.subject) {
          const subjectQuery = query(
            collection(db, 'lectures'),
            where('status', 'in', ['accepted', 'active']),
            where('subject', '==', currentLectureData.subject),
            limit(6)
          );
          const sSnap = await getDocs(subjectQuery);
          if (!mounted) return;
          let docs = sSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => d.id !== lectureId);
          docs.sort((a: any, b: any) => {
            const tA = (a.createdAt?.seconds || a.createdAt || 0);
            const tB = (b.createdAt?.seconds || b.createdAt || 0);
            return tB - tA; 
          });
          relatedDocs = docs;
        }

        if (relatedDocs.length === 0) {
          const basicQuery = query(collection(db, 'lectures'), where('status', 'in', ['accepted', 'active']), limit(6));
          const bSnap = await getDocs(basicQuery);
          if (!mounted) return;
          relatedDocs = bSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => d.id !== lectureId);
        }

        const formattedRelated = relatedDocs.slice(0, 10).map((lesson, index) => ({
          id: lesson.id,
          title: lesson.title?.trim() || `الدرس ${index + 1}`,
          duration: lesson.duration?.trim() || 'غير محدد',
          thumbnail: THUMBNAILS[index % THUMBNAILS.length],
          locked: false, 
        }));

        if (formattedRelated.length > 0) {
          setUpcomingLessons(formattedRelated);
        }
      } catch (error) {
        console.error('Error loading video page data:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [lectureId]);

  useEffect(() => {
    let active = true;

    try {
      const total = Number.isFinite(player.duration) ? player.duration : 0;
      setDuration(total);
      player.timeUpdateEventInterval = 0.25;
    } catch (error) {
      console.warn('Failed to initialize video time tracking:', error);
    }

    const timeUpdateSub = player.addListener('timeUpdate', ({ currentTime: nextTime }) => {
      if (!active) {
        return;
      }
      setCurrentTime(Number.isFinite(nextTime) ? nextTime : 0);
    });

    const sourceLoadSub = player.addListener('sourceLoad', ({ duration: nextDuration }) => {
      if (!active) {
        return;
      }
      setDuration(Number.isFinite(nextDuration) ? nextDuration : 0);
    });

    const playingSub = player.addListener('playingChange', ({ isPlaying: nextPlaying }) => {
      if (active) {
        setIsPlaying(nextPlaying);
      }
    });

    const statusSub = player.addListener('statusChange', ({ status, error }) => {
      if (!active) {
        return;
      }

      if (status === 'idle' || status === 'loading') {
        setCurrentTime(0);
      }

      if (status === 'error' && error?.message) {
        console.error('Video player status error:', error.message);
      }
    });

    return () => {
      active = false;
      timeUpdateSub.remove();
      sourceLoadSub.remove();
      playingSub.remove();
      statusSub.remove();
    };
  }, [player]);

  useEffect(() => {
    if (!isPlaying || !controlsVisible) {
      return;
    }

    const timeout = setTimeout(() => {
      setControlsVisible(false);
    }, 2800);

    return () => {
      clearTimeout(timeout);
    };
  }, [isPlaying, controlsVisible]);

  useEffect(() => {
    let mainShowTimer: ReturnType<typeof setTimeout> | null = null;
    let mainHideTimer: ReturnType<typeof setTimeout> | null = null;
    let ghostShowTimer: ReturnType<typeof setTimeout> | null = null;
    let ghostHideTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const getRandomPosition = () => {
      const maxLeft = Math.max(QR_MARGIN, SCREEN_W - QR_SIZE - QR_MARGIN);
      const maxTop = Math.max(QR_MARGIN, VIDEO_HEIGHT - QR_SIZE - QR_MARGIN);
      return {
        left: randomBetween(QR_MARGIN, maxLeft),
        top: randomBetween(QR_MARGIN, maxTop),
      };
    };

    // Main QR: Once in the first min (15-45s), then every 90s
    const scheduleMainNext = (delay: number) => {
      mainShowTimer = setTimeout(() => {
        if (stopped) return;
        setMainQr({ visible: true, position: getRandomPosition() });

        mainHideTimer = setTimeout(() => {
          if (!stopped) setMainQr(prev => ({ ...prev, visible: false }));
          if (!stopped) scheduleMainNext(90000);
        }, 5000);
      }, delay);
    };

    // Ghost QR: Randomly appearing
    const scheduleGhostNext = () => {
      const delay = randomBetween(20000, 60000); // 20-60s
      
      ghostShowTimer = setTimeout(() => {
        if (stopped) return;
        setGhostQr({ visible: true, position: getRandomPosition() });

        ghostHideTimer = setTimeout(() => {
          if (!stopped) setGhostQr(prev => ({ ...prev, visible: false }));
          if (!stopped) scheduleGhostNext();
        }, 3500); // short flash
      }, delay);
    };

    scheduleMainNext(randomBetween(15000, 45000));
    scheduleGhostNext();

    return () => {
      stopped = true;
      if (mainShowTimer) clearTimeout(mainShowTimer);
      if (mainHideTimer) clearTimeout(mainHideTimer);
      if (ghostShowTimer) clearTimeout(ghostShowTimer);
      if (ghostHideTimer) clearTimeout(ghostHideTimer);
    };
  }, []);

  const lectureTitle = lecture?.title?.trim() || 'مقدمة في التصميم التعليمي الرقمي';
  const lectureDescription =
    lecture?.description?.trim() ||
    'في هذا الدرس، سنستعرض الأساسيات الجوهرية لتصميم المحتوى التعليمي الرقمي الفعال وكيفية تحسين تجربة المتعلم باستخدام الأدوات الحديثة.';
  const lectureSubject = lecture?.subject || '';

  const progressPercent = isWatched ? 100 : 65;
  const playbackProgress = duration > 0 ? Math.min(Math.max(currentTime / duration, 0), 1) : 0;

  const handleTogglePlay = () => {
    setControlsVisible(true);

    try {
      if (player.playing) {
        player.pause();
        setIsPlaying(false);
        return;
      }

      player.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('Failed to toggle playback:', error);
    }
  };

  const handleOpenFullscreen = async () => {
    setControlsVisible(true);

    try {
      await videoViewRef.current?.enterFullscreen();
    } catch (error) {
      console.error('Failed to enter fullscreen:', error);
      Alert.alert('خطأ', 'تعذر فتح وضع ملء الشاشة.');
    }
  };

  const handleSeekBy = (offsetSeconds: number) => {
    const max = duration > 0 ? duration : Math.max(currentTime + offsetSeconds, 0);
    const target = Math.min(Math.max(currentTime + offsetSeconds, 0), max);
    try {
      player.currentTime = target;
      setCurrentTime(target);
    } catch (error) {
      console.error('Failed to seek video:', error);
    }
    setControlsVisible(true);
  };

  const handleTimelineLayout = (event: LayoutChangeEvent) => {
    setTimelineWidth(event.nativeEvent.layout.width);
  };

  const handleTimelinePress = (event: GestureResponderEvent) => {
    if (!timelineWidth || duration <= 0) {
      return;
    }

    const ratio = Math.min(Math.max(event.nativeEvent.locationX / timelineWidth, 0), 1);
    const target = ratio * duration;

    try {
      player.currentTime = target;
      setCurrentTime(target);
    } catch (error) {
      console.error('Failed to seek from timeline:', error);
    }
    setControlsVisible(true);
  };

  const handleOpenLesson = (item: LessonItem) => {
    if (item.locked) {
      Alert.alert('تنبيه', 'هذا الدرس مقفل حالياً حتى تكمل الدرس الحالي.');
      return;
    }

    if (item.id.startsWith('fallback-')) {
      return;
    }

    router.push({ pathname: '/video/[id]', params: { id: item.id } } as any);
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>جاري تحميل الدرس...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={C.topOverlay} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* ─── Top Header ─── */}
        <View style={styles.topAppBar}>
          <TouchableOpacity style={styles.topAppBarButton} activeOpacity={0.85} onPress={() => router.back()}>
            <Ionicons name="arrow-forward" size={22} color={C.white} />
          </TouchableOpacity>

          <View style={styles.topAppBarCenter}>
            <Text style={styles.topAppBarSubtitle}>تفاصيل الدرس</Text>
            <Text style={styles.topAppBarTitle} numberOfLines={1}>{lectureTitle}</Text>
          </View>

          <TouchableOpacity style={styles.topAppBarButton} activeOpacity={0.85} onPress={handleOpenFullscreen}>
            <Ionicons name="expand-outline" size={20} color={C.white} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* ─── Video Player ─── */}
          <View style={styles.videoSection}>
            <VideoView
              ref={videoViewRef}
              style={StyleSheet.absoluteFillObject}
              player={player}
              nativeControls={false}
              fullscreenOptions={{ enable: true, orientation: 'landscape', autoExitOnRotate: true }}
              allowsPictureInPicture
              contentFit="cover"
              surfaceType="textureView"
              onFullscreenExit={() => setControlsVisible(true)}
            />

            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              activeOpacity={1}
              onPress={() => setControlsVisible(prev => !prev)}
            />

            {mainQr.visible ? (
              <View style={[styles.qrWatermarkWrap, mainQr.position, { opacity: 0.6 }]} pointerEvents="none">
                <QRCode value={encodedUsername} size={QR_SIZE} color="#101010" backgroundColor="#FFFFFF" />
              </View>
            ) : null}

            {ghostQr.visible ? (
              <View style={[styles.qrWatermarkWrap, ghostQr.position, { opacity: 0.2 }]} pointerEvents="none">
                <QRCode value={encodedUsername} size={QR_SIZE} color="#101010" backgroundColor="#FFFFFF" />
              </View>
            ) : null}

            {controlsVisible ? (
              <View style={styles.playerOverlay} pointerEvents="box-none">
                <View style={styles.playerTopShade} pointerEvents="none" />
                <View style={styles.playerBottomShade} pointerEvents="none" />

                {/* Top controls */}
                <View style={styles.playerTopControls} pointerEvents="box-none">
                  <Text style={styles.playerTitleInline} numberOfLines={1}>
                    {lectureTitle}
                  </Text>
                  <TouchableOpacity
                    style={styles.playerIconButton}
                    activeOpacity={0.85}
                    onPress={handleOpenFullscreen}
                  >
                    <Ionicons name="expand-outline" size={18} color={C.white} />
                  </TouchableOpacity>
                </View>

                {/* Center controls */}
                <View style={styles.playerCenterControls} pointerEvents="box-none">
                  <TouchableOpacity style={styles.seekButton} activeOpacity={0.85} onPress={() => handleSeekBy(10)}>
                    <Ionicons name="play-forward" size={22} color={C.white} />
                    <Text style={styles.seekText}>10</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.centerPlayButton} activeOpacity={0.9} onPress={handleTogglePlay}>
                    <Ionicons name={isPlaying ? 'pause' : 'play'} size={34} color={C.topOverlay} />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.seekButton} activeOpacity={0.85} onPress={() => handleSeekBy(-10)}>
                    <Ionicons name="play-back" size={22} color={C.white} />
                    <Text style={styles.seekText}>10</Text>
                  </TouchableOpacity>
                </View>

                {/* Bottom controls */}
                <View style={styles.playerBottomControls} pointerEvents="box-none">
                  <Text style={styles.videoTimeText}>{formatTime(currentTime)}</Text>

                  <TouchableOpacity
                    style={styles.timelineTouchArea}
                    activeOpacity={1}
                    onLayout={handleTimelineLayout}
                    onPress={handleTimelinePress}
                  >
                    <View style={styles.videoProgressTrack}>
                      <View style={[styles.videoProgressFill, { width: `${playbackProgress * 100}%` }]} />
                      <View
                        style={[
                          styles.progressThumb,
                          { left: Math.max(0, playbackProgress * timelineWidth - 7) },
                        ]}
                      />
                    </View>
                  </TouchableOpacity>

                  <Text style={styles.videoTimeText}>{formatTime(duration)}</Text>

                  <TouchableOpacity
                    style={styles.playerIconButton}
                    activeOpacity={0.85}
                    onPress={handleOpenFullscreen}
                  >
                    <Ionicons name="scan-outline" size={17} color={C.white} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>

          {/* ─── Lesson Info Section ─── */}
          <View style={styles.lessonInfoSection}>
            {/* Subject badge */}
            {lectureSubject ? (
              <View style={styles.subjectBadgeContainer}>
                <View style={styles.subjectBadge}>
                  <Ionicons name="book" size={12} color={C.accent} />
                  <Text style={styles.subjectBadgeText}>{lectureSubject}</Text>
                </View>
              </View>
            ) : null}

            <Text style={styles.lessonTitle}>{lectureTitle}</Text>
            <Text style={styles.lessonDescription}>{lectureDescription}</Text>

            {/* Quick action buttons */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity style={styles.actionButton} activeOpacity={0.7} onPress={handleOpenFullscreen}>
                <View style={[styles.actionIconCircle, { backgroundColor: C.softGold }]}>
                  <Ionicons name="expand-outline" size={18} color={C.accent} />
                </View>
                <Text style={styles.actionButtonLabel}>ملء الشاشة</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} activeOpacity={0.7} onPress={handleTogglePlay}>
                <View style={[styles.actionIconCircle, { backgroundColor: C.softGreen }]}>
                  <Ionicons name={isPlaying ? "pause" : "play"} size={18} color={C.primary} />
                </View>
                <Text style={styles.actionButtonLabel}>{isPlaying ? 'إيقاف' : 'تشغيل'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} activeOpacity={0.7} onPress={() => handleSeekBy(-10)}>
                <View style={[styles.actionIconCircle, { backgroundColor: '#F0EDFF' }]}>
                  <Ionicons name="play-back" size={18} color="#6C5CE7" />
                </View>
                <Text style={styles.actionButtonLabel}>رجوع 10ث</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} activeOpacity={0.7} onPress={() => handleSeekBy(10)}>
                <View style={[styles.actionIconCircle, { backgroundColor: '#FFF0F0' }]}>
                  <Ionicons name="play-forward" size={18} color="#E74C3C" />
                </View>
                <Text style={styles.actionButtonLabel}>تقديم 10ث</Text>
              </TouchableOpacity>
            </View>

            {/* Progress card */}
            <View style={styles.progressCard}>
              <View style={styles.progressHeaderRow}>
                <View style={styles.progressLabelRow}>
                  <Ionicons name="analytics" size={16} color={C.primary} />
                  <Text style={styles.progressLabel}>تقدمك في الدورة</Text>
                </View>
                <View style={styles.progressPercentBadge}>
                  <Text style={styles.progressPercentText}>{progressPercent}%</Text>
                </View>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
              </View>
              <View style={styles.progressFooterRow}>
                <Text style={styles.progressFooterText}>
                  {isWatched ? 'تم إكمال الدرس بنجاح!' : `${100 - progressPercent}% متبقي`}
                </Text>
              </View>
            </View>
          </View>

          {/* ─── Upcoming Lessons ─── */}
          <View style={styles.upcomingSection}>
            <View style={styles.upcomingHeaderRow}>
              <View style={styles.upcomingTitleRow}>
                <Ionicons name={playlistContext ? "folder-open" : "list"} size={18} color={C.primary} />
                <Text style={styles.upcomingTitle}>
                  {playlistContext ? `قائمة التشغيل: ${playlistContext}` : 'الدروس القادمة'}
                </Text>
              </View>
              <View style={styles.remainingPill}>
                <Text style={styles.remainingPillText}>{upcomingLessons.length} درس</Text>
              </View>
            </View>

            <View style={styles.upcomingList}>
              {upcomingLessons.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.lessonItem, index === 0 && styles.lessonItemHighlighted]}
                  activeOpacity={0.8}
                  onPress={() => handleOpenLesson(item)}
                >
                  <View style={styles.lessonThumbWrap}>
                    <Image source={{ uri: item.thumbnail }} style={styles.lessonThumb} resizeMode="cover" />
                    {item.locked ? (
                      <View style={styles.lockOverlay}>
                        <View style={styles.lockIconCircle}>
                          <Ionicons name="lock-closed" size={14} color={C.white} />
                        </View>
                      </View>
                    ) : (
                      <View style={styles.playOverlay}>
                        <Ionicons name="play" size={16} color={C.white} />
                      </View>
                    )}
                  </View>

                  <View style={styles.lessonItemTextWrap}>
                    <Text style={styles.lessonItemTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View style={styles.lessonDurationRow}>
                      <Ionicons name="time-outline" size={12} color={C.textSecondary} />
                      <Text style={styles.lessonItemDuration}>{item.duration}</Text>
                    </View>
                  </View>

                  <View style={styles.lessonArrow}>
                    <Ionicons name="chevron-back" size={16} color={C.textSecondary} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ─── Complete Button ─── */}
          <TouchableOpacity
            style={[styles.completeButton, isWatched && styles.completeButtonDone]}
            activeOpacity={0.85}
            onPress={() => setIsWatched(prev => !prev)}
          >
            <Ionicons name={isWatched ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={C.white} />
            <Text style={styles.completeButtonText}>{isWatched ? 'تم إكمال الدرس ✓' : 'تحديد كمكتمل'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bgMain,
  },
  safeArea: {
    flex: 1,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: C.bgMain,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: C.textSecondary,
  },

  // ─── Top App Bar ───
  topAppBar: {
    backgroundColor: C.topOverlay,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  topAppBarCenter: {
    flex: 1,
    alignItems: 'center',
  },
  topAppBarSubtitle: {
    fontSize: 11,
    color: '#97AEA9',
    marginBottom: 2,
  },
  topAppBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.white,
  },
  topAppBarButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  scrollContent: {
    paddingBottom: 40,
  },

  // ─── Video Section ───
  videoSection: {
    height: VIDEO_HEIGHT,
    width: '100%',
    backgroundColor: C.playerBg,
    position: 'relative',
    overflow: 'hidden',
  },
  playerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  playerTopShade: {
    ...StyleSheet.absoluteFillObject,
    top: 0,
    bottom: VIDEO_HEIGHT * 0.5,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  playerBottomShade: {
    ...StyleSheet.absoluteFillObject,
    top: VIDEO_HEIGHT * 0.55,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  playerTopControls: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  playerTitleInline: {
    flex: 1,
    color: C.white,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
    marginLeft: 8,
  },
  playerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  playerCenterControls: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  centerPlayButton: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: C.accent,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: { elevation: 10 },
    }),
  },
  seekButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  seekText: {
    color: C.white,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  playerBottomControls: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  timelineTouchArea: {
    flex: 1,
    marginHorizontal: 8,
    paddingVertical: 8,
  },
  videoProgressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'visible',
    position: 'relative',
  },
  videoProgressFill: {
    height: '100%',
    backgroundColor: C.accent,
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute',
    top: -5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: C.accent,
    borderWidth: 2,
    borderColor: C.white,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
    }),
  },
  videoTimeText: {
    color: C.white,
    fontSize: 11,
    fontWeight: '700',
    minWidth: 34,
  },

  // ─── Lesson Info Section ───
  lessonInfoSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  subjectBadgeContainer: {
    flexDirection: 'row-reverse',
    marginBottom: 10,
  },
  subjectBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.softGold,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  subjectBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.accent,
  },
  lessonTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: C.textPrimary,
    lineHeight: 36,
    textAlign: 'right',
    marginBottom: 10,
  },
  lessonDescription: {
    fontSize: 14,
    color: C.textSecondary,
    lineHeight: 24,
    textAlign: 'right',
    marginBottom: 20,
  },

  // ─── Action Buttons ───
  actionButtonsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  actionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textSecondary,
    textAlign: 'center',
  },

  // ─── Progress Card ───
  progressCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: C.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  progressHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  progressLabelRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  progressLabel: {
    fontSize: 14,
    color: C.textPrimary,
    fontWeight: '800',
  },
  progressPercentBadge: {
    backgroundColor: C.softGold,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  progressPercentText: {
    fontSize: 14,
    color: C.accent,
    fontWeight: '900',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: C.softGreen,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: C.accent,
  },
  progressFooterRow: {
    flexDirection: 'row-reverse',
    marginTop: 10,
  },
  progressFooterText: {
    fontSize: 12,
    color: C.textSecondary,
    fontWeight: '600',
  },

  // ─── Upcoming Section ───
  upcomingSection: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 12,
  },
  upcomingHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  upcomingTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  upcomingTitle: {
    fontSize: 18,
    color: C.textPrimary,
    fontWeight: '800',
  },
  remainingPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: C.softGreen,
  },
  remainingPillText: {
    color: C.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  upcomingList: {
    gap: 10,
  },
  lessonItem: {
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 1 },
    }),
  },
  lessonItemHighlighted: {
    borderColor: C.accent,
    borderWidth: 1.5,
    backgroundColor: C.softGold,
  },
  lessonThumbWrap: {
    width: 96,
    height: 66,
    borderRadius: 12,
    overflow: 'hidden',
    marginLeft: 12,
    position: 'relative',
  },
  lessonThumb: {
    width: '100%',
    height: '100%',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lessonItemTextWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  lessonItemTitle: {
    fontSize: 14,
    color: C.textPrimary,
    fontWeight: '800',
    textAlign: 'right',
    marginBottom: 5,
  },
  lessonDurationRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
  },
  lessonItemDuration: {
    fontSize: 11,
    color: C.textSecondary,
    fontWeight: '600',
  },
  lessonArrow: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: C.softGreen,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },

  // ─── Complete Button ───
  completeButton: {
    marginTop: 14,
    marginHorizontal: 20,
    height: 56,
    borderRadius: 18,
    backgroundColor: C.primary,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  completeButtonDone: {
    backgroundColor: C.success,
    ...Platform.select({
      ios: { shadowColor: C.success },
    }),
  },
  completeButtonText: {
    color: C.white,
    fontSize: 16,
    fontWeight: '800',
  },

  // ─── QR Watermark ───
  qrWatermarkWrap: {
    position: 'absolute',
    zIndex: 50,
    padding: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
});
