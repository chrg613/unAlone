import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

const ProfileScreen = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('http://192.168.1.8:8080/profile?user_id=chirag_01')
      .then(res => res.json())
      .then(json => setData(json))
      .catch(e => console.log("Profile error", e));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Your unAlone Identity</Text>
      <View style={styles.card}>
        <Text style={styles.scoreTitle}>Trust Score</Text>
        <Text style={styles.scoreValue}>{data?.trust_score || 50}</Text>
        <Text style={styles.status}>{data?.status || 'Neutral'}</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 20 },
  header: { fontSize: 28, fontWeight: 'bold', marginVertical: 20, color: '#6200ee' },
  card: { backgroundColor: 'white', padding: 30, borderRadius: 20, shadowOpacity: 0.1, elevation: 5, alignItems: 'center' },
  scoreTitle: { color: '#666', fontSize: 16 },
  scoreValue: { fontSize: 60, fontWeight: 'bold', color: '#6200ee' },
  status: { fontSize: 18, marginTop: 10, fontWeight: '600' }
});

export default ProfileScreen;