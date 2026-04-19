import React, { useState, useEffect } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Global reference for the alert service
let alertService: any = null;

export const CustomAlert = {
  alert: (title: string, message?: string, buttons?: any[]) => {
    if (alertService) {
      alertService.show(title, message, buttons);
    } else {
      // Fallback if provider isn't mounted yet
      import('react-native').then(RN => {
        RN.Alert.alert(title, message, buttons);
      });
    }
  },
};

const C = {
  bgMain: "#F4F7F6",
  primary: "#12453D",
  accent: "#E3A736",
  white: "#FFFFFF",
  textPrimary: "#10241F",
  textSecondary: "#8A9E99",
  borderLight: "#E8EDEC",
  danger: "#D9534F",
  softGreen: "#EEF5F3",
};

export const GlobalAlertProvider = () => {
  const [visible, setVisible] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.95));
  
  const [config, setConfig] = useState({
    title: '',
    message: '',
    buttons: [] as any[],
  });

  useEffect(() => {
    alertService = {
      show: (title: string, message: string = '', buttons: any[] = []) => {
        if (!buttons || buttons.length === 0) {
          buttons = [{ text: 'حسناً', style: 'default' }];
        }
        setConfig({ title, message, buttons });
        setVisible(true);

        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 8,
            tension: 100,
            useNativeDriver: true,
          }),
        ]).start();
      },
      hide: () => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 0.95,
            friction: 8,
            tension: 100,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setVisible(false);
        });
      },
    };

    return () => {
      alertService = null;
    };
  }, [fadeAnim, scaleAnim]);

  const handlePress = (button: any) => {
    alertService.hide();
    if (button.onPress) {
      setTimeout(() => {
        button.onPress();
      }, 150); // slight delay to allow hide animation
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
        
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          {/* Header Icon logic based on title/buttons or style */}
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              {config.title.includes('خطأ') || config.buttons.some(b => b.style === 'destructive') ? (
                 <Ionicons name="warning" size={32} color={C.danger} />
              ) : config.title.includes('نجاح') || config.title.includes('تم') ? (
                 <Ionicons name="checkmark-circle" size={32} color="#22C55E" />
              ) : (
                 <Ionicons name="information-circle" size={32} color={C.primary} />
              )}
            </View>
            <Text style={styles.title}>{config.title}</Text>
          </View>

          {config.message ? (
            <View style={styles.body}>
              <Text style={styles.message}>{config.message}</Text>
            </View>
          ) : null}

          <View style={[
            styles.footer, 
            config.buttons.length > 2 ? styles.footerCol : styles.footerRow
          ]}>
            {config.buttons.map((btn, index) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';
              
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    config.buttons.length > 2 ? styles.buttonCol : styles.buttonRow,
                    isDestructive ? styles.buttonDestructive : 
                    isCancel ? styles.buttonCancel : styles.buttonPrimary
                  ]}
                  onPress={() => handlePress(btn)}
                  activeOpacity={0.85}
                >
                  <Text style={[
                    styles.buttonText,
                    isDestructive ? styles.buttonTextWhite : 
                    isCancel ? styles.buttonTextDark : styles.buttonTextWhite
                  ]}>
                    {btn.text || 'حسناً'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 28,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.15,
        shadowRadius: 32,
      },
      android: { elevation: 24 },
    }),
  },
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 16,
    paddingHorizontal: 24,
    backgroundColor: C.softGreen,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: C.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
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
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: C.textPrimary,
    textAlign: 'center',
  },
  body: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: 'center',
  },
  message: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 8,
    gap: 12,
  },
  footerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  footerCol: {
    flexDirection: 'column',
  },
  button: {
    borderRadius: 16,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonRow: {
    flex: 1,
    marginHorizontal: 4,
  },
  buttonCol: {
    width: '100%',
  },
  buttonPrimary: {
    backgroundColor: C.primary,
  },
  buttonDestructive: {
    backgroundColor: C.danger,
  },
  buttonCancel: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  buttonTextWhite: {
    color: C.white,
  },
  buttonTextDark: {
    color: C.textPrimary,
  },
});
