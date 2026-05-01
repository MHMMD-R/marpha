import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ScreenOrientation from 'expo-screen-orientation';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { collection, doc, getDoc, getDocs, limit, query, setDoc, where } from 'firebase/firestore';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { ActivityIndicator,
    BackHandler,
    Dimensions,
    GestureResponderEvent,
    I18nManager,
    Image,
    LayoutChangeEvent,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View } from 'react-native';
import { CustomAlert as Alert } from '@/components/CustomAlert';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '../../components/BackButton';
import { auth, db } from '../../firebase';

const { width: SCREEN_W } = Dimensions.get('window');
const VIDEO_HEIGHT = SCREEN_W * (9 / 16);
const DEFAULT_VIDEO_SOURCE =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
const QR_SIZE = 40;
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
  watched?: boolean;
  isCurrent?: boolean;
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
  usePreventScreenCapture('video-playback');
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
  const [allPlaylistLessons, setAllPlaylistLessons] = useState<LessonItem[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [introDuration, setIntroDuration] = useState(0);
  const [lectureDuration, setLectureDuration] = useState(0);
  const [outroDuration, setOutroDuration] = useState(0);
  const [timelineWidth, setTimelineWidth] = useState(0);
  const [pendingSeek, setPendingSeek] = useState<number | null>(null);
  const [encodedUsername, setEncodedUsername] = useState('anonymous-user');
  const [mainQr, setMainQr] = useState({ visible: false, position: { top: QR_MARGIN, left: QR_MARGIN } });
  const [ghostQr, setGhostQr] = useState({ visible: false, position: { top: QR_MARGIN, left: QR_MARGIN } });
  const [isTeacher, setIsTeacher] = useState(false);
  const videoViewRef = useRef<VideoView>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaylistExpanded, setIsPlaylistExpanded] = useState(false);
  const [videoContainerSize, setVideoContainerSize] = useState({ width: SCREEN_W, height: VIDEO_HEIGHT });
  const videoContainerSizeRef = useRef(videoContainerSize);

  // Playback Phase Machine
  const [playbackPhase, setPlaybackPhase] = useState<'introStart' | 'lecture' | 'introEnd'>('introStart');
  const phaseRef = useRef(playbackPhase);
  useEffect(() => { phaseRef.current = playbackPhase; }, [playbackPhase]);
  
  const lectureRef = useRef(lecture);
  useEffect(() => { lectureRef.current = lecture; }, [lecture]);

  useEffect(() => {
    videoContainerSizeRef.current = videoContainerSize;
  }, [videoContainerSize]);

  // Start with local Intro video
  const introAsset = require('../../assets/videos/intro.mp4');
  const player = useVideoPlayer(introAsset, videoPlayer => {
    videoPlayer.loop = false;
    // We let the logic handle auto-play based on state, but default to pause on init to be safe until mounted
    videoPlayer.pause();
  });

  useEffect(() => {
    // Only auto-play once the screen is ready and loading is finished
    if (!loading) {
      try {
        player.play();
        setIsPlaying(true);
      } catch (e) {}
    }
  }, [loading, player]);

  useEffect(() => {
    const assignEncodedUser = () => {
      const user = auth.currentUser;
      const name = user?.displayName?.trim() || user?.email?.trim() || 'anonymous-user';
      const uid = user?.uid || 'no-id';
      setEncodedUsername(`${name} | ${uid}`);
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
            // Load per-user watched state
            const user = auth.currentUser;
            if (user) {
              // Check if teacher
              const tSnap = await getDoc(doc(db, 'teachers', user.uid));
              if (mounted && tSnap.exists()) {
                setIsTeacher(true);
              }

              const progressDoc = await getDoc(doc(db, 'lecture_progress', `${user.uid}_${lectureId}`));
              if (progressDoc.exists() && progressDoc.data().watched) {
                setIsWatched(true);
              }
            }
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
            where('playlistName', '==', currentLectureData.playlistName),
            limit(30)
          );
          const pSnap = await getDocs(playlistQuery);
          if (!mounted) return;

          let docs = pSnap.docs.map(d => ({ id: d.id, ...d.data() }))
            .filter((d: any) => d.status === 'accepted' || d.status === 'active');
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

          // Fetch watched status for all playlist items
          const plUser = auth.currentUser;
          const watchedMap: Record<string, boolean> = {};
          if (plUser) {
            const watchPromises = docs.map(async (d: any) => {
              try {
                const pDoc = await getDoc(doc(db, 'lecture_progress', `${plUser.uid}_${d.id}`));
                if (pDoc.exists() && pDoc.data().watched) {
                  watchedMap[d.id] = true;
                }
              } catch {}
            });
            await Promise.all(watchPromises);
          }
          if (!mounted) return;

          const fullPlaylist: LessonItem[] = docs.map((lesson: any, idx: number) => ({
            id: lesson.id,
            title: lesson.title?.trim() || `الدرس ${idx + 1}`,
            duration: lesson.duration?.trim() || 'غير محدد',
            thumbnail: THUMBNAILS[idx % THUMBNAILS.length],
            locked: false,
            watched: watchedMap[lesson.id] || false,
            isCurrent: lesson.id === lectureId,
          }));

          setAllPlaylistLessons(fullPlaylist);
        }

        if (relatedDocs.length === 0 && currentLectureData?.subject) {
          const subjectQuery = query(
            collection(db, 'lectures'),
            where('subject', '==', currentLectureData.subject),
            limit(15)
          );
          const sSnap = await getDocs(subjectQuery);
          if (!mounted) return;
          let docs = sSnap.docs.map(d => ({ id: d.id, ...d.data() }))
            .filter((d: any) => (d.status === 'accepted' || d.status === 'active') && d.id !== lectureId);
          docs.sort((a: any, b: any) => {
            const tA = (a.createdAt?.seconds || a.createdAt || 0);
            const tB = (b.createdAt?.seconds || b.createdAt || 0);
            return tB - tA; 
          });
          relatedDocs = docs;
        }

        if (relatedDocs.length === 0) {
          const basicQuery = query(collection(db, 'lectures'), limit(15));
          const bSnap = await getDocs(basicQuery);
          if (!mounted) return;
          relatedDocs = bSnap.docs.map(d => ({ id: d.id, ...d.data() }))
            .filter((d: any) => (d.status === 'accepted' || d.status === 'active') && d.id !== lectureId);
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
      
      // Initialize duration for starting phase
      if (phaseRef.current === 'introStart') setIntroDuration(total);
      else if (phaseRef.current === 'lecture') setLectureDuration(total);
      else if (phaseRef.current === 'introEnd') setOutroDuration(total);

      player.timeUpdateEventInterval = 0.25;
    } catch (error) {
      console.warn('Failed to initialize video time tracking:', error);
    }

    const timeUpdateSub = player.addListener('timeUpdate', ({ currentTime: nextTime }) => {
      if (!active) {
        return;
      }
      const ct = Number.isFinite(nextTime) ? nextTime : 0;
      setCurrentTime(ct);

      // Safety: If duration was missed in sourceLoad, capture it during playback
      if (player.duration > 0) {
        if (phaseRef.current === 'introStart' && introDuration === 0) setIntroDuration(player.duration);
        else if (phaseRef.current === 'lecture' && lectureDuration === 0) setLectureDuration(player.duration);
        else if (phaseRef.current === 'introEnd' && outroDuration === 0) setOutroDuration(player.duration);
      }
    });

    const sourceLoadSub = player.addListener('sourceLoad', ({ duration: nextDuration }) => {
      if (!active) {
        return;
      }
      const safeDuration = Number.isFinite(nextDuration) ? nextDuration : 0;
      setDuration(safeDuration);
      
      if (phaseRef.current === 'introStart') setIntroDuration(safeDuration);
      else if (phaseRef.current === 'lecture') setLectureDuration(safeDuration);
      else if (phaseRef.current === 'introEnd') setOutroDuration(safeDuration);

      if (pendingSeek !== null) {
        player.currentTime = pendingSeek;
        setPendingSeek(null);
      }
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

    const endSub = player.addListener('playToEnd', () => {
      if (!active) return;
      const currentPhase = phaseRef.current;
      const currentLecture = lectureRef.current;
      
      try {
        if (currentPhase === 'introStart') {
          const rawSource = currentLecture?.videoUrl || currentLecture?.link;
          if (rawSource) {
            setPlaybackPhase('lecture');
            player.replace(resolveVideoSource(rawSource));
            player.play();
          } else {
            setPlaybackPhase('introEnd');
            player.replace(require('../../assets/videos/intro.mp4'));
            player.play();
          }
        } else if (currentPhase === 'lecture') {
          setPlaybackPhase('introEnd');
          player.replace(require('../../assets/videos/intro.mp4'));
          player.play();
        } else if (currentPhase === 'introEnd') {
          setIsPlaying(false);
        }
      } catch (err) {
        console.error('Error swapping video source:', err);
      }
    });

    return () => {
      active = false;
      timeUpdateSub.remove();
      sourceLoadSub.remove();
      playingSub.remove();
      statusSub.remove();
      endSub.remove();
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
      const size = videoContainerSizeRef.current;
      const maxLeft = Math.max(QR_MARGIN, size.width - QR_SIZE - QR_MARGIN);
      const maxTop = Math.max(QR_MARGIN, size.height - QR_SIZE - QR_MARGIN);
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

  const virtualTotalDuration = lectureDuration;
  const virtualCurrentTime = useMemo(() => {
    if (playbackPhase === 'introStart') return 0;
    if (playbackPhase === 'lecture') return currentTime;
    if (playbackPhase === 'introEnd') return lectureDuration;
    return 0;
  }, [playbackPhase, currentTime, lectureDuration]);

  // Playlist progress (recomputed live when isWatched toggles)
  const watchedInPlaylist = allPlaylistLessons.filter(l =>
    l.isCurrent ? isWatched : l.watched
  ).length;
  const playlistProgressPercent = allPlaylistLessons.length > 0
    ? Math.round((watchedInPlaylist / allPlaylistLessons.length) * 100)
    : 0;

  const progressPercent = allPlaylistLessons.length > 0 ? playlistProgressPercent : (isWatched ? 100 : 0);
  const playbackProgress = virtualTotalDuration > 0 ? Math.min(Math.max(virtualCurrentTime / virtualTotalDuration, 0), 1) : 0;


  const activeList = allPlaylistLessons.length > 0 ? allPlaylistLessons : upcomingLessons;
  const currentIndex = activeList.findIndex((l: any) => l.isCurrent);
  const nextItem = activeList[currentIndex + 1] || activeList[0];
  const hasPlaylist = activeList.length > 0 && !activeList[0]?.id.startsWith('fallback-');

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

  const handleToggleFullscreen = useCallback(async () => {
    setControlsVisible(true);

    try {
      if (isFullscreen) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        setIsFullscreen(false);
        StatusBar.setHidden(false);
      } else {
        // YouTube style: Lock to landscape and hide status bar.
        // Use LANDSCAPE_RIGHT (not LANDSCAPE) because iOS only actively rotates
        // the device for a specific orientation; the generic LANDSCAPE lock
        // allows either side but won't force a rotation from portrait.
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
        setIsFullscreen(true);
        StatusBar.setHidden(true);
      }
    } catch (error) {
      console.error('Failed to change fullscreen:', error);
      setIsFullscreen(!isFullscreen);
    }
  }, [isFullscreen]);

  useEffect(() => {
    const onBackPress = () => {
      if (isFullscreen) {
        handleToggleFullscreen();
        return true; 
      }
      return false; 
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => {
      backHandler.remove();
    };
  }, [handleToggleFullscreen, isFullscreen]);

  useEffect(() => {
    return () => {
      StatusBar.setHidden(false);
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);

  const handleVirtualSeek = (targetVirtualTime: number) => {
    if (lectureDuration <= 0) return;
    const safeTarget = Math.min(Math.max(targetVirtualTime, 0), lectureDuration - 0.1);

    // Only allow seeking within the lecture segment
    const rawSource = lecture?.videoUrl || lecture?.link;
    if (playbackPhase !== 'lecture') {
      setPendingSeek(safeTarget);
      setPlaybackPhase('lecture');
      player.replace(resolveVideoSource(rawSource));
      player.play();
    } else {
      player.currentTime = safeTarget;
    }
    setControlsVisible(true);
  };

  const handleSeekBy = (offsetSeconds: number) => {
    handleVirtualSeek(virtualCurrentTime + offsetSeconds);
  };

  const handleTimelineLayout = (event: LayoutChangeEvent) => {
    setTimelineWidth(event.nativeEvent.layout.width);
  };

  const handleTimelinePress = (event: GestureResponderEvent) => {
    if (!timelineWidth || virtualTotalDuration <= 0) {
      return;
    }

    let ratio = event.nativeEvent.locationX / timelineWidth;
    if (I18nManager.isRTL) ratio = 1 - ratio;
    ratio = Math.min(Math.max(ratio, 0), 1);
    const target = ratio * virtualTotalDuration;
    handleVirtualSeek(target);
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

  const handleToggleWatched = async () => {
    const newVal = !isWatched;
    setIsWatched(newVal);
    const user = auth.currentUser;
    if (lectureId && user) {
      try {
        await setDoc(doc(db, 'lecture_progress', `${user.uid}_${lectureId}`), {
          studentId: user.uid,
          lectureId: lectureId,
          watched: newVal,
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.error('Failed to update watched status:', e);
      }
    }
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
      <StatusBar barStyle="light-content" backgroundColor={C.topOverlay} hidden={isFullscreen} />

      <SafeAreaView style={styles.safeArea} edges={isFullscreen ? ['left', 'right'] : ['top', 'bottom']}>
        {/* ─── Top Header ─── */}
        {!isFullscreen && (
        <View style={styles.topAppBar}>
          <BackButton />

          <View style={styles.topAppBarCenter}>
            <Text style={styles.topAppBarSubtitle}>تفاصيل الدرس</Text>
            <Text style={styles.topAppBarTitle} numberOfLines={1}>{lectureTitle}</Text>
          </View>

          <View style={{ width: 42 }} />
        </View>
        )}

        {/* ─── Video Player ─── */}
        <View 
          style={isFullscreen ? styles.videoSectionFullscreen : styles.videoSection}
          onLayout={(e) => setVideoContainerSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        >
            <VideoView
              ref={videoViewRef}
              style={StyleSheet.absoluteFillObject}
              player={player}
              nativeControls={false}
              fullscreenOptions={{ enable: true, orientation: 'landscape', autoExitOnRotate: true }}
              allowsPictureInPicture
              contentFit="contain"
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
                </View>

                {/* Center controls */}
                <View style={styles.playerCenterControls} pointerEvents="box-none">
                  <TouchableOpacity style={styles.seekButton} activeOpacity={0.85} onPress={() => handleSeekBy(-10)}>
                    <Ionicons name="play-forward" size={22} color={C.white} />
                    <Text style={styles.seekText}>10</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.centerPlayButton} activeOpacity={0.9} onPress={handleTogglePlay}>
                    <Ionicons name={isPlaying ? 'pause' : 'play'} size={34} color={C.topOverlay} />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.seekButton} activeOpacity={0.85} onPress={() => handleSeekBy(10)}>
                    <Ionicons name="play-back" size={22} color={C.white} />
                    <Text style={styles.seekText}>10</Text>
                  </TouchableOpacity>
                </View>

                {/* Bottom controls */}
                <View style={styles.playerBottomControls} pointerEvents="box-none">
                  <Text style={styles.videoTimeText}>{formatTime(virtualCurrentTime)}</Text>

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

                  <Text style={styles.videoTimeText}>{formatTime(virtualTotalDuration)}</Text>

                  <TouchableOpacity
                    style={styles.playerIconButton}
                    activeOpacity={0.85}
                    onPress={handleToggleFullscreen}
                  >
                    <Ionicons name={isFullscreen ? "contract" : "expand"} size={18} color={C.white} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>

          {!isFullscreen && (
          <View style={{ flex: 1, backgroundColor: C.bgMain }}>
            {isPlaylistExpanded ? (
              <View style={styles.expandedPlaylistOverlay}>
                <View style={styles.expandedPlaylistHeader}>
                  <View style={styles.expandedPlaylistHeaderTitles}>
                    <Text style={styles.expandedPlaylistTitle} numberOfLines={1}>
                      {playlistContext || 'فيديوهات ذات صلة'} • {currentIndex + 1}/{activeList.length}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.closePlaylistIcon} onPress={() => setIsPlaylistExpanded(false)}>
                    <Ionicons name="close" size={28} color={C.white} />
                  </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={styles.expandedPlaylistScroll}>
                  {activeList.map((item, index) => {
                    const itemWatched = item.isCurrent ? isWatched : item.watched;
                    const isCurrent = item.isCurrent || false;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.plItemExpanded, isCurrent && styles.plItemCurrentExpanded]}
                        activeOpacity={isCurrent ? 1 : 0.7}
                        onPress={() => {
                           if(!isCurrent) {
                             handleOpenLesson(item);
                             setIsPlaylistExpanded(false);
                           }
                        }}
                      >
                        <View style={styles.plItemIndexExpanded}>
                          {isCurrent ? (
                            <Ionicons name="play" size={12} color={C.white} />
                          ) : (itemWatched && !isTeacher) ? (
                            <Ionicons name="checkmark-circle" size={16} color={C.success} />
                          ) : (
                            <Text style={styles.plItemNumberExpanded}>{index + 1}</Text>
                          )}
                        </View>
                        <View style={styles.plThumbWrapExpanded}>
                          <Image source={{ uri: item.thumbnail }} style={styles.plThumbExpanded} resizeMode="cover" />
                        </View>
                        <View style={styles.plItemTextWrapExpanded}>
                          <Text
                            style={[
                              styles.plItemTitleExpanded,
                              isCurrent && styles.plItemTitleActiveExpanded,
                            ]}
                            numberOfLines={2}
                          >
                            {item.title}
                          </Text>
                          <Text style={styles.plItemDurationExpanded}>{item.duration}</Text>
                        </View>
                        <Ionicons name="ellipsis-vertical" size={16} color={C.textSecondary} />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : (
              <>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                  {/* ─── Lesson Info Section ─── */}
                  <View style={styles.lessonInfoSection}>
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

                    <View style={styles.actionButtonsRow}>
                      <TouchableOpacity style={styles.actionButton} activeOpacity={0.7} onPress={handleTogglePlay}>
                        <View style={[styles.actionIconCircle, { backgroundColor: C.softGreen }]}>
                          <Ionicons name={isPlaying ? "pause" : "play"} size={18} color={C.primary} />
                        </View>
                        <Text style={styles.actionButtonLabel}>{isPlaying ? 'إيقاف' : 'تشغيل'}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.actionButton} activeOpacity={0.7} onPress={() => handleSeekBy(-10)}>
                        <View style={[styles.actionIconCircle, { backgroundColor: '#F0EDFF' }]}>
                          <Ionicons name="play-forward" size={18} color="#6C5CE7" />
                        </View>
                        <Text style={styles.actionButtonLabel}>رجوع 10ث</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.actionButton} activeOpacity={0.7} onPress={() => handleSeekBy(10)}>
                        <View style={[styles.actionIconCircle, { backgroundColor: '#FFF0F0' }]}>
                          <Ionicons name="play-back" size={18} color="#E74C3C" />
                        </View>
                        <Text style={styles.actionButtonLabel}>تقديم 10ث</Text>
                      </TouchableOpacity>

                      {!isTeacher && (
                        <TouchableOpacity style={styles.actionButton} activeOpacity={0.7} onPress={handleToggleWatched}>
                          <View style={[styles.actionIconCircle, { backgroundColor: isWatched ? C.successSoft : C.softGold }]}>
                            <Ionicons name={isWatched ? "checkmark-done" : "checkmark"} size={18} color={isWatched ? C.success : C.accent} />
                          </View>
                          <Text style={styles.actionButtonLabel}>{isWatched ? 'مكتمل' : 'إنهاء'}</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {!isTeacher && (
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
                    )}
                  </View>

                </ScrollView>

                {hasPlaylist && (
                  <TouchableOpacity 
                    style={styles.floatingPlaylistCollapsed} 
                    activeOpacity={0.9} 
                    onPress={() => setIsPlaylistExpanded(true)}
                  >
                    <View style={styles.floatingPlaylistIcon}>
                      <Ionicons name="list" size={24} color={C.white} />
                    </View>
                    <View style={styles.floatingPlaylistTextCol}>
                      <Text style={styles.floatingPlaylistNext} numberOfLines={1}>
                        التالي: {nextItem?.title || 'غير محدد'}
                      </Text>
                      <Text style={styles.floatingPlaylistMeta}>
                        {playlistContext || 'فيديوهات ذات صلة'} • {currentIndex + 1}/{activeList.length}
                      </Text>
                    </View>
                    <Ionicons name="chevron-up" size={24} color={C.white} />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
          )}
        </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bgMain,
    direction: 'rtl',
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
  videoSectionFullscreen: {
    flex: 1,
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
    bottom: '50%',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  playerBottomShade: {
    ...StyleSheet.absoluteFillObject,
    top: '50%',
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  playerTopControls: {
    flexDirection: 'row',
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
    flexDirection: 'row',
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
    flexDirection: 'row',
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
    textAlign: 'center',
  },

  // ─── Lesson Info Section ───
  lessonInfoSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  subjectBadgeContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  subjectBadge: {
    flexDirection: 'row',
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
    flexDirection: 'row',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  progressLabelRow: {
    flexDirection: 'row',
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
    flexDirection: 'row',
    marginTop: 10,
  },
  progressFooterText: {
    fontSize: 12,
    color: C.textSecondary,
    fontWeight: '600',
  },

  // ─── YouTube-Style Playlist Panel ───
  plPanel: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 14,
      },
      android: { elevation: 5 },
    }),
  },
  plHeader: {
    backgroundColor: C.topOverlay,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
  },
  plHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  plTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  plHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.white,
    flex: 1,
    textAlign: 'right',
  },
  plCountBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginStart: 10,
  },
  plCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
  plStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  plStatsText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
  },
  plProgressTrack: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  plProgressFill: {
    height: '100%',
    backgroundColor: C.accent,
    borderRadius: 1.5,
  },
  plItemsWrap: {
    paddingVertical: 4,
  },
  plItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.borderLight,
    position: 'relative',
  },
  plItemCurrent: {
    backgroundColor: '#EBF5F2',
  },
  plCurrentBar: {
    position: 'absolute',
    right: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 1.5,
    backgroundColor: C.accent,
  },
  plItemIndex: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plItemNumber: {
    fontSize: 12,
    color: C.textSecondary,
    fontWeight: '600',
  },
  plThumbWrap: {
    width: 72,
    height: 42,
    borderRadius: 6,
    overflow: 'hidden',
    marginHorizontal: 8,
    position: 'relative',
    backgroundColor: '#E8EDEC',
  },
  plThumb: {
    width: '100%',
    height: '100%',
  },
  plNowPlaying: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plItemTextWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingEnd: 8,
  },
  plItemTitle: {
    fontSize: 13,
    color: C.textPrimary,
    fontWeight: '700',
    textAlign: 'right',
    lineHeight: 19,
  },
  plItemTitleActive: {
    color: C.primary,
    fontWeight: '800',
  },
  plItemTitleWatched: {
    color: C.textSecondary,
  },
  plItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  plItemDuration: {
    fontSize: 11,
    color: C.textSecondary,
    fontWeight: '500',
  },


  // ─── QR Watermark ───
  qrWatermarkWrap: {
    position: 'absolute',
    zIndex: 50,
    padding: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },

  // ─── Floating Playlist (Collapsed) ───
  floatingPlaylistCollapsed: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingRight: 20,
    elevation: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
    }),
  },
  floatingPlaylistIcon: {
    marginLeft: 16,
  },
  floatingPlaylistTextCol: {
    flex: 1,
    alignItems: 'flex-start',
  },
  floatingPlaylistNext: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'left',
  },
  floatingPlaylistMeta: {
    color: '#A0A0A0',
    fontSize: 12,
    textAlign: 'left',
  },

  // ─── Expanded Playlist Overlay ───
  expandedPlaylistOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F0F13',
    zIndex: 100,
  },
  expandedPlaylistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  expandedPlaylistHeaderTitles: {
    flex: 1,
    alignItems: 'flex-start',
    marginRight: 16,
  },
  expandedPlaylistTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
    textAlign: 'left',
  },
  closePlaylistIcon: {
    padding: 4,
  },
  expandedPlaylistScroll: {
    paddingBottom: 40,
  },
  plItemExpanded: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  plItemCurrentExpanded: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  plItemIndexExpanded: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plItemNumberExpanded: {
    color: '#A0A0A0',
    fontSize: 12,
  },
  plThumbWrapExpanded: {
    width: 120,
    height: 68,
    borderRadius: 8,
    overflow: 'hidden',
    marginHorizontal: 12,
    backgroundColor: '#1E1E1E',
  },
  plThumbExpanded: {
    width: '100%',
    height: '100%',
  },
  plItemTextWrapExpanded: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  plItemTitleExpanded: {
    color: C.white,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'left',
  },
  plItemTitleActiveExpanded: {
    color: C.white,
    fontWeight: '900',
  },
  plItemDurationExpanded: {
    color: '#A0A0A0',
    fontSize: 12,
  },
});
