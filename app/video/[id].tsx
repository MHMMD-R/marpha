import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { collection, doc, getDoc, getDocs, limit, query } from 'firebase/firestore';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    GestureResponderEvent,
    Image,
    LayoutChangeEvent,
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
const QR_VISIBLE_MS = 4500;
const QR_FIRST_APPEAR_MIN_MS = 10000;
const QR_FIRST_APPEAR_MAX_MS = 18000;
const QR_REPEAT_MIN_MS = 50000;
const QR_REPEAT_MAX_MS = 75000;

const C = {
  background: '#F7FAF9',
  topBar: '#001D17',
  primary: '#001D17',
  primaryContainer: '#0D332B',
  secondary: '#835400',
  secondaryContainer: '#FCAF39',
  surface: '#FFFFFF',
  surfaceContainerHigh: '#E6E9E8',
  surfaceContainerLow: '#F1F4F3',
  onBackground: '#181C1C',
  onSurfaceVariant: '#414846',
  outline: '#C1C8C4',
  white: '#FFFFFF',
};

type LectureDoc = {
  title?: string;
  duration?: string;
  description?: string;
  videoUrl?: string;
  link?: string;
  createdAt?: {
    toDate?: () => Date;
  };
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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [timelineWidth, setTimelineWidth] = useState(0);
  const [encodedUsername, setEncodedUsername] = useState('anonymous-user');
  const [qrVisible, setQrVisible] = useState(false);
  const [qrPosition, setQrPosition] = useState({ top: QR_MARGIN, left: QR_MARGIN });
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
        if (lectureId) {
          const currentLectureRef = doc(db, 'lectures', lectureId);
          const currentLectureSnap = await getDoc(currentLectureRef);
          if (mounted && currentLectureSnap.exists()) {
            setLecture(currentLectureSnap.data() as LectureDoc);
          }
        }

        const lessonsQuery = query(collection(db, 'lectures'), where('status', 'in', ['accepted', 'active']), limit(12));
        const lessonsSnap = await getDocs(lessonsQuery);

        if (!mounted) {
          return;
        }

        const related = lessonsSnap.docs
          .filter(lessonDoc => lessonDoc.id !== lectureId)
          .slice(0, 3)
          .map((lessonDoc, index) => {
            const lesson = lessonDoc.data() as LectureDoc;
            return {
              id: lessonDoc.id,
              title: lesson.title?.trim() || `الدرس ${index + 1}`,
              duration: lesson.duration?.trim() || 'غير محدد',
              thumbnail: THUMBNAILS[index % THUMBNAILS.length],
              locked: index === 0,
            };
          });

        if (related.length > 0) {
          setUpcomingLessons(related);
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
    let showTimer: ReturnType<typeof setTimeout> | null = null;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    let firstCycle = true;
    let stopped = false;

    const setRandomQrPosition = () => {
      const maxLeft = Math.max(QR_MARGIN, SCREEN_W - QR_SIZE - QR_MARGIN);
      const maxTop = Math.max(QR_MARGIN, VIDEO_HEIGHT - QR_SIZE - QR_MARGIN);
      setQrPosition({
        left: randomBetween(QR_MARGIN, maxLeft),
        top: randomBetween(QR_MARGIN, maxTop),
      });
    };

    const scheduleNext = () => {
      const delay = firstCycle
        ? randomBetween(QR_FIRST_APPEAR_MIN_MS, QR_FIRST_APPEAR_MAX_MS)
        : randomBetween(QR_REPEAT_MIN_MS, QR_REPEAT_MAX_MS);
      firstCycle = false;

      showTimer = setTimeout(() => {
        if (stopped) {
          return;
        }

        setRandomQrPosition();
        setQrVisible(true);

        hideTimer = setTimeout(() => {
          if (!stopped) {
            setQrVisible(false);
          }
        }, QR_VISIBLE_MS);

        scheduleNext();
      }, delay);
    };

    scheduleNext();

    return () => {
      stopped = true;
      if (showTimer) {
        clearTimeout(showTimer);
      }
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
    };
  }, []);

  const lectureTitle = lecture?.title?.trim() || 'مقدمة في التصميم التعليمي الرقمي';
  const lectureDescription =
    lecture?.description?.trim() ||
    'في هذا الدرس، سنستعرض الأساسيات الجوهرية لتصميم المحتوى التعليمي الرقمي الفعال وكيفية تحسين تجربة المتعلم باستخدام الأدوات الحديثة.';

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
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={C.topBar} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.topAppBar}>
          <View style={styles.topAppBarCenter}>
            <Text style={styles.topAppBarTitle}>تفاصيل الدرس</Text>
          </View>
          <TouchableOpacity style={styles.topAppBarButton} activeOpacity={0.85} onPress={() => router.back()}>
            <Ionicons name="arrow-forward" size={22} color={C.white} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

            {qrVisible ? (
              <View style={[styles.qrWatermarkWrap, qrPosition]} pointerEvents="none">
                <QRCode value={encodedUsername} size={QR_SIZE} color="#101010" backgroundColor="#FFFFFF" />
              </View>
            ) : null}

            {controlsVisible ? (
              <View style={styles.playerOverlay} pointerEvents="box-none">
                <View style={styles.playerTopShade} pointerEvents="none" />
                <View style={styles.playerBottomShade} pointerEvents="none" />

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

                <View style={styles.playerCenterControls} pointerEvents="box-none">
                  <TouchableOpacity style={styles.seekButton} activeOpacity={0.85} onPress={() => handleSeekBy(10)}>
                    <Ionicons name="play-forward" size={22} color={C.white} />
                    <Text style={styles.seekText}>10</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.centerPlayButton} activeOpacity={0.9} onPress={handleTogglePlay}>
                    <Ionicons name={isPlaying ? 'pause' : 'play'} size={36} color={C.primaryContainer} />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.seekButton} activeOpacity={0.85} onPress={() => handleSeekBy(-10)}>
                    <Ionicons name="play-back" size={22} color={C.white} />
                    <Text style={styles.seekText}>10</Text>
                  </TouchableOpacity>
                </View>

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
                          { left: Math.max(0, playbackProgress * timelineWidth - 6) },
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

          <View style={styles.lessonInfoSection}>
            <Text style={styles.lessonTitle}>{lectureTitle}</Text>
            <Text style={styles.lessonDescription}>{lectureDescription}</Text>

            <View style={styles.progressCard}>
              <View style={styles.progressHeaderRow}>
                <Text style={styles.progressLabel}>تقدمك في الدورة</Text>
                <Text style={styles.progressValue}>{progressPercent}% مكتمل</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
              </View>
            </View>
          </View>

          <View style={styles.upcomingSection}>
            <View style={styles.upcomingHeaderRow}>
              <Text style={styles.upcomingTitle}>الدروس القادمة</Text>
              <View style={styles.remainingPill}>
                <Text style={styles.remainingPillText}>{upcomingLessons.length} درس متبقي</Text>
              </View>
            </View>

            <View style={styles.upcomingList}>
              {upcomingLessons.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.lessonItem, index === 1 && styles.lessonItemHighlighted]}
                  activeOpacity={0.9}
                  onPress={() => handleOpenLesson(item)}
                >
                  <View style={styles.lessonThumbWrap}>
                    <Image source={{ uri: item.thumbnail }} style={styles.lessonThumb} resizeMode="cover" />
                    {item.locked ? (
                      <View style={styles.lockOverlay}>
                        <Ionicons name="lock-closed" size={17} color={C.white} />
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.lessonItemTextWrap}>
                    <Text style={styles.lessonItemTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View style={styles.lessonDurationRow}>
                      <Ionicons name="time-outline" size={12} color={C.onSurfaceVariant} />
                      <Text style={styles.lessonItemDuration}>{item.duration}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.completeButton, isWatched && styles.completeButtonDone]}
            activeOpacity={0.9}
            onPress={() => setIsWatched(prev => !prev)}
          >
            <Ionicons name={isWatched ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={C.white} />
            <Text style={styles.completeButtonText}>{isWatched ? 'تم إكمال الدرس' : 'تحديد كمكتمل'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.background,
  },
  safeArea: {
    flex: 1,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: C.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topAppBar: {
    height: 62,
    backgroundColor: C.topBar,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  topAppBarCenter: {
    flex: 1,
    alignItems: 'center',
  },
  topAppBarTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.white,
  },
  topAppBarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  videoSection: {
    height: VIDEO_HEIGHT,
    width: '100%',
    backgroundColor: C.primary,
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
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  playerBottomShade: {
    ...StyleSheet.absoluteFillObject,
    top: VIDEO_HEIGHT * 0.55,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  playerTopControls: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
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
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  playerCenterControls: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  centerPlayButton: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: C.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  seekButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  seekText: {
    color: C.white,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  playerBottomControls: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  timelineTouchArea: {
    flex: 1,
    marginHorizontal: 8,
  },
  videoProgressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.36)',
    overflow: 'visible',
    position: 'relative',
  },
  videoProgressFill: {
    height: '100%',
    backgroundColor: C.secondaryContainer,
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute',
    top: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.secondaryContainer,
  },
  videoTimeText: {
    color: C.white,
    fontSize: 11,
    fontWeight: '700',
    minWidth: 34,
  },
  lessonInfoSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  lessonTitle: {
    fontSize: 27,
    fontWeight: '800',
    color: C.primary,
    lineHeight: 38,
    textAlign: 'right',
    marginBottom: 8,
  },
  lessonDescription: {
    fontSize: 14,
    color: C.onSurfaceVariant,
    lineHeight: 24,
    textAlign: 'right',
  },
  progressCard: {
    marginTop: 18,
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(193,200,196,0.35)',
    padding: 16,
  },
  progressHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 13,
    color: C.primary,
    fontWeight: '800',
  },
  progressValue: {
    fontSize: 13,
    color: C.secondary,
    fontWeight: '800',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: C.surfaceContainerHigh,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: C.secondary,
  },
  upcomingSection: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  upcomingHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  upcomingTitle: {
    fontSize: 20,
    color: C.primary,
    fontWeight: '800',
  },
  remainingPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: C.surfaceContainerHigh,
  },
  remainingPillText: {
    color: C.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '700',
  },
  upcomingList: {
    gap: 10,
  },
  lessonItem: {
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 14,
    padding: 10,
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  lessonItemHighlighted: {
    borderRightWidth: 4,
    borderRightColor: C.secondaryContainer,
  },
  lessonThumbWrap: {
    width: 96,
    height: 66,
    borderRadius: 10,
    overflow: 'hidden',
    marginLeft: 10,
    position: 'relative',
  },
  lessonThumb: {
    width: '100%',
    height: '100%',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonItemTextWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  lessonItemTitle: {
    fontSize: 14,
    color: C.primary,
    fontWeight: '800',
    textAlign: 'right',
    marginBottom: 4,
  },
  lessonDurationRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
  },
  lessonItemDuration: {
    fontSize: 11,
    color: C.onSurfaceVariant,
    fontWeight: '600',
  },
  completeButton: {
    marginTop: 14,
    marginHorizontal: 20,
    height: 56,
    borderRadius: 16,
    backgroundColor: C.primary,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  completeButtonDone: {
    backgroundColor: '#10B981',
  },
  completeButtonText: {
    color: C.white,
    fontSize: 16,
    fontWeight: '800',
  },
  qrWatermarkWrap: {
    position: 'absolute',
    zIndex: 50,
    padding: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
});
