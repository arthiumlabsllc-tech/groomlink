import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../theme/ThemeContext';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error';
}

interface ToastItemProps {
  toast: ToastMessage;
  onExpire: (id: string) => void;
}

function ToastItem({ toast, onExpire }: ToastItemProps) {
  const { theme } = useAppTheme();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(3500),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => onExpire(toast.id));
  }, []);

  const colorMap: Record<string, string> = {
    success: theme.success,
    info: theme.info,
    warning: theme.warning,
    error: theme.danger,
  };
  const color = colorMap[toast.type || 'info'] || theme.info;

  const iconMap: Record<string, string> = {
    success: 'check-circle',
    info: 'information',
    warning: 'alert',
    error: 'close-circle',
  };
  const icon = iconMap[toast.type || 'info'] || 'information';

  return (
    <Animated.View style={[styles.toast, { opacity, backgroundColor: theme.surface, borderColor: color }]}>
      <MaterialCommunityIcons name={icon as any} size={20} color={color} />
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{toast.title}</Text>
        <Text style={[styles.message, { color: theme.textSecondary }]} numberOfLines={2}>{toast.message}</Text>
      </View>
    </Animated.View>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onExpire: (id: string) => void;
}

export default function ToastContainer({ toasts, onExpire }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <View style={styles.container} pointerEvents="none">
      {toasts.slice(0, 3).map((t) => (
        <ToastItem key={t.id} toast={t} onExpire={onExpire} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  textContainer: {
    flex: 1,
    marginLeft: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 1,
  },
  message: {
    fontSize: 12,
    lineHeight: 16,
  },
});
