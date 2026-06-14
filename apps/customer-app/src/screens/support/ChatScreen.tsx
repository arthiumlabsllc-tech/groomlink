import React, { useState } from 'react';
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
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useChat } from '../../hooks/useChat';
import { ChatMessage } from '../../api/chat';

const COLORS = {
  primary: '#006B3F',
  primaryLight: '#E8F5E9',
  accent: '#FCD116',
  background: '#F5F5F5',
  white: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  border: '#E0E0E0',
  success: '#4CAF50',
  error: '#F44336',
};

export default function ChatScreen() {
  const navigation = useNavigation();
  const {
    messages,
    draft,
    setDraft,
    loading,
    error,
    hasSession,
    activeTicket,
    startConversation,
    sendMessage,
    endChat,
  } = useChat();

  const [subjectDraft, setSubjectDraft] = useState('');

  const handleSend = () => {
    if (!draft.trim()) return;

    if (!hasSession) {
      // First message - create new ticket
      const subject = subjectDraft.trim() || draft.trim().slice(0, 60);
      startConversation(subject, draft.trim());
      setSubjectDraft('');
    } else {
      // Send message in existing conversation
      sendMessage();
    }
  };

  const handleEndChat = () => {
    Alert.alert(
      'End Conversation',
      'Are you sure you want to end this conversation? You can start a new one anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Chat',
          style: 'destructive',
          onPress: endChat,
        },
      ]
    );
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.isFromUser;
    const time = new Date(item.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userMessage : styles.agentMessage,
        ]}
      >
        {!isUser && item.sender && (
          <View style={styles.agentInfo}>
            <View style={styles.agentAvatar}>
              <Text style={styles.agentAvatarText}>
                {(item.sender.firstName?.[0] || item.sender.lastName?.[0] || 'S').toUpperCase()}
              </Text>
            </View>
            <Text style={styles.agentName}>
              {item.sender.firstName} {item.sender.lastName}
            </Text>
          </View>
        )}
        <View
          style={[
            styles.messageContent,
            isUser ? styles.userBubble : styles.agentBubble,
          ]}
        >
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>
            {item.content}
          </Text>
          <Text
            style={[
              styles.messageTime,
              isUser ? styles.userMessageTime : styles.agentMessageTime,
            ]}
          >
            {time}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={80} color={COLORS.primary} />
      <Text style={styles.emptyTitle}>Start a Conversation</Text>
      <Text style={styles.emptySubtitle}>
        Our support team is here to help you with bookings, payments, or any questions.
      </Text>
      <View style={styles.featureList}>
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
          <Text style={styles.featureText}>Real-time support</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
          <Text style={styles.featureText}>Quick responses</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
          <Text style={styles.featureText}>24/7 availability</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {hasSession ? 'Live Chat' : 'Contact Support'}
          </Text>
          {hasSession && activeTicket && (
            <Text style={styles.headerSubtitle}>
              {activeTicket.status === 'IN_PROGRESS' ? '● Online' : '○ Support Team'}
            </Text>
          )}
        </View>
        {hasSession && (
          <TouchableOpacity onPress={handleEndChat} style={styles.endButton}>
            <Ionicons name="close-circle-outline" size={24} color={COLORS.white} />
          </TouchableOpacity>
        )}
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning" size={18} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Messages List */}
      <KeyboardAvoidingView
        style={styles.messagesContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {messages.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={<View style={{ height: 16 }} />}
          />
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          {!hasSession && (
            <TextInput
              style={styles.subjectInput}
              placeholder="What is this about? (optional)"
              placeholderTextColor={COLORS.textSecondary}
              value={subjectDraft}
              onChangeText={setSubjectDraft}
            />
          )}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.messageInput}
              placeholder={hasSession ? 'Type a message...' : 'Describe your issue...'}
              placeholderTextColor={COLORS.textSecondary}
              value={draft}
              onChangeText={setDraft}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!draft.trim() || loading) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!draft.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Ionicons name="send" size={20} color={COLORS.white} />
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.characterCount}>{draft.length}/500</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.accent,
    marginTop: 2,
  },
  endButton: {
    padding: 8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: COLORS.error,
    fontSize: 14,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  featureList: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  featureText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  messageBubble: {
    marginBottom: 16,
    maxWidth: '85%',
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  agentMessage: {
    alignSelf: 'flex-start',
  },
  agentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  agentAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  agentAvatarText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  agentName: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  messageContent: {
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  agentBubble: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: COLORS.white,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  userMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  agentMessageTime: {
    color: COLORS.textSecondary,
  },
  inputContainer: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 12,
  },
  subjectInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 8,
    color: COLORS.textPrimary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  messageInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 120,
    color: COLORS.textPrimary,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  characterCount: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
});
