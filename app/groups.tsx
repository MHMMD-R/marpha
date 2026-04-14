import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../firebase';

const C = { bgMain: '#F4F7F6', primary: '#12453D', white: '#FFFFFF', textSecondary: '#8A9E99', borderLight: '#E8EDEC', accent: '#E3A736' };

export default function GroupsListScreen() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'teachers'), snap => {
      setTeachers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-forward" size={24} color={C.white} /></TouchableOpacity>
        <Text style={styles.headerTitle}>مجموعات النقاش</Text>
        <View style={{ width: 24 }} />
      </View>
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View> : (
        <FlatList
          contentContainerStyle={styles.list}
          data={teachers}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => router.push({ pathname: `/group/${item.id}`, params: { name: `مجموعة ${item.name}` }})}>
              <View style={styles.iconBox}><Ionicons name="people" size={24} color={C.accent} /></View>
              <View style={styles.info}>
                <Text style={styles.title}>مجموعة {item.name}</Text>
                <Text style={styles.sub}>{item.subject || 'عام'}</Text>
              </View>
              <Ionicons name="chevron-back" size={20} color={C.textSecondary} />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bgMain },
  header: { height: 60, backgroundColor: C.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15 },
  headerTitle: { color: C.white, fontSize: 18, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 15 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, padding: 15, borderRadius: 12, marginBottom: 10 },
  iconBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFF8E8', justifyContent: 'center', alignItems: 'center', marginLeft: 15 },
  info: { flex: 1, alignItems: 'flex-end' },
  title: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  sub: { fontSize: 13, color: C.textSecondary, marginTop: 4 }
});
