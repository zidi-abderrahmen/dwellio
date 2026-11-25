class ChatParticipant {
  const ChatParticipant({required this.fullName, this.avatarUrl});

  final String? fullName;
  final String? avatarUrl;

  factory ChatParticipant.fromJson(Map<String, dynamic>? json) {
    return ChatParticipant(
      fullName: json?['full_name'] as String?,
      avatarUrl: json?['avatar_url'] as String?,
    );
  }
}

class ChatConversation {
  const ChatConversation({
    required this.id,
    required this.propertyId,
    required this.buyerId,
    required this.ownerId,
    required this.propertyTitle,
    required this.buyer,
    required this.owner,
    this.lastMessageAt,
  });

  final String id;
  final String propertyId;
  final String buyerId;
  final String ownerId;
  final String propertyTitle;
  final ChatParticipant buyer;
  final ChatParticipant owner;
  final DateTime? lastMessageAt;

  factory ChatConversation.fromJson(Map<String, dynamic> json) {
    final property = _relationToMap(json['properties']);
    return ChatConversation(
      id: json['id'] as String,
      propertyId: json['property_id'] as String,
      buyerId: json['buyer_id'] as String,
      ownerId: json['owner_id'] as String,
      propertyTitle: property?['title'] as String? ?? 'Property',
      buyer: ChatParticipant.fromJson(_relationToMap(json['buyer'])),
      owner: ChatParticipant.fromJson(_relationToMap(json['owner'])),
      lastMessageAt: json['last_message_at'] == null
          ? null
          : DateTime.parse(json['last_message_at'] as String),
    );
  }
}

class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.chatId,
    required this.senderId,
    required this.content,
    required this.isRead,
    required this.createdAt,
  });

  final String id;
  final String chatId;
  final String senderId;
  final String content;
  final bool isRead;
  final DateTime createdAt;

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id'] as String,
      chatId: json['chat_id'] as String,
      senderId: json['sender_id'] as String,
      content: json['content'] as String,
      isRead: json['is_read'] as bool,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}

Map<String, dynamic>? _relationToMap(dynamic value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return Map<String, dynamic>.from(value);
  if (value is List && value.isNotEmpty && value.first is Map) {
    return Map<String, dynamic>.from(value.first as Map);
  }
  return null;
}
