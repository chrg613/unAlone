import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Platform } from 'react-native';

const ChatScreen = ({ route }: any) => {
  const { placeId, placeName } = route.params;
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    // Connect to your Go WebSocket server using your Mac's Local IP
    // Change your WebSocket line to this:
    const userId = Platform.OS === 'ios' ? 'ios_user' : 'android_user'; 
    const socket = new WebSocket(`ws://192.168.1.8:8080/ws?room=${placeId}&user=${userId}`);
    socket.onmessage = (e) => {
      setMessages((prev) => [...prev, { id: Date.now(), text: e.data, sender: 'other' }]);
    };

    setWs(socket);
    return () => socket.close();
  }, []);

  const sendMessage = () => {
    if (ws && inputText) {
      ws.send(inputText);
      setMessages((prev) => [...prev, { id: Date.now(), text: inputText, sender: 'me' }]);
      setInputText('');
    }
  };

  return (
    <View style={styles.chatContainer}>
      <Text style={styles.chatHeader}>Chatting @ {placeName}</Text>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={item.sender === 'me' ? styles.myMsg : styles.theirMsg}>
            <Text style={styles.msgText}>{item.text}</Text>
          </View>
        )}
      />
      <View style={styles.inputRow}>
        <TextInput 
          style={styles.input} 
          value={inputText} 
          onChangeText={setInputText} 
          placeholder="Say something safe..." 
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
          <Text style={{color: 'white'}}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
};
const styles = StyleSheet.create({
  chatContainer: { flex: 1, backgroundColor: '#f5f5f5', paddingTop: 50 },
  chatHeader: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  myMsg: { alignSelf: 'flex-end', backgroundColor: '#6200ee', padding: 10, borderRadius: 10, margin: 5, maxWidth: '80%' },
  theirMsg: { alignSelf: 'flex-start', backgroundColor: '#e0e0e0', padding: 10, borderRadius: 10, margin: 5, maxWidth: '80%' },
  msgText: { color: 'white' },
  inputRow: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderColor: '#ccc', backgroundColor: 'white' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 15, height: 40 },
  sendBtn: { marginLeft: 10, backgroundColor: '#6200ee', justifyContent: 'center', paddingHorizontal: 20, borderRadius: 20 }
});
export default ChatScreen;