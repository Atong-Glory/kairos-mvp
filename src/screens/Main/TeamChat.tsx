import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { ProjectsScreenProps } from '../../navigation/types';
import AnimatedPressable from '../../components/AnimatedPressable';
import Toast from 'react-native-toast-message';
import { errorMessage } from '../../lib/validation';

type Message = {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  created_at: string;
  users?: { full_name: string | null } | null;
};

export default function TeamChat({ route, navigation }: ProjectsScreenProps<'TeamChat'>) {
  const { projectId, project } = route.params;
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchMessages();

    // Subscribe to real-time message inserts
    const channel = supabase
      .channel(`project-chat-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => (prev.some(m => m.id === newMsg.id) ? prev : [newMsg, ...prev]));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, project_id, user_id, content, created_at, users(full_name)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages((data as unknown as Message[]) || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not load messages.' });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    const content = newMessage.trim();
    setSending(true);
    setNewMessage('');
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({ project_id: projectId, user_id: user.id, content })
        .select('id, project_id, user_id, content, created_at')
        .single();

      if (error) throw error;
      // Realtime may not echo our own insert; show it immediately.
      setMessages((prev) => (prev.some(m => m.id === data.id) ? prev : [{ ...data, users: { full_name: profile?.full_name ?? null } }, ...prev]));
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(content);
      Toast.show({ type: 'error', text1: 'Send Failed', text2: errorMessage(error) });
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getSenderName = (message: Message) => {
    if (message.user_id === user?.id) return profile?.full_name || 'You';
    return message.users?.full_name || 'Crew Member';
  };

  const isCurrentUser = (messageUserId: string) => messageUserId === user?.id;

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwn = isCurrentUser(item.user_id);
    const showDateSeparator =
      index === messages.length - 1 ||
      formatDate(item.created_at) !== formatDate(messages[index + 1]?.created_at);

    return (
      <View>
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <View style={styles.dateLine} />
            <Text style={styles.dateLabel}>{formatDate(item.created_at)}</Text>
            <View style={styles.dateLine} />
          </View>
        )}
        <View style={[styles.messageRow, isOwn ? styles.messageRowRight : styles.messageRowLeft]}>
          {!isOwn && (
            <View style={styles.avatar}>
              <Icon name="person" size={16} color="#94A3B8" />
            </View>
          )}
          <View style={[styles.messageBubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
            {!isOwn && <Text style={styles.senderName}>{getSenderName(item)}</Text>}
            <Text style={[styles.messageText, isOwn ? styles.ownMessageText : styles.otherMessageText]}>
              {item.content}
            </Text>
            <Text style={[styles.timestamp, isOwn ? styles.ownTimestamp : styles.otherTimestamp]}>
              {formatTime(item.created_at)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>Team Chat</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {project?.name || 'Project'}
          </Text>
        </View>
        <AnimatedPressable
          style={styles.videoBtn}
          onPress={() => navigation.navigate('VideoCall', { projectId })}
        >
          <Icon name="videocam-outline" size={24} color="#3B82F6" />
        </AnimatedPressable>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="chatbubbles-outline" size={48} color="#334155" />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubText}>Start the conversation with your crew</Text>
            </View>
          }
        />
      )}

      {/* Input Bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor="#64748B"
            multiline
            maxLength={1000}
          />
          <AnimatedPressable
            style={[styles.sendBtn, !newMessage.trim() && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Icon name="send" size={20} color="#FFFFFF" />
            )}
          </AnimatedPressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  videoBtn: {
    padding: 8,
    backgroundColor: '#1E293B',
    borderRadius: 12,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1E293B',
  },
  dateLabel: {
    fontSize: 12,
    color: '#64748B',
    marginHorizontal: 12,
    fontWeight: '500',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  ownBubble: {
    backgroundColor: '#3B82F6',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#1E293B',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#F8FAFC',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  ownTimestamp: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  otherTimestamp: {
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    // Since FlatList is inverted, the empty state flips — apply transform to correct
    transform: [{ scaleY: -1 }],
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#F8FAFC',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendBtnDisabled: {
    backgroundColor: '#334155',
  },
});
