import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  participants: mongoose.Types.ObjectId[];
  lastMessage?: mongoose.Types.ObjectId;
  unreadCount: { [userId: string]: number };
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>({
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: {}
  }
}, {
  timestamps: true
});

// Ensure participants array has exactly 2 users for 1-to-1 conversations
conversationSchema.pre('save', function(next) {
  if (this.participants.length !== 2) {
    return next(new Error('Conversation must have exactly 2 participants'));
  }
  
  // Ensure participants are unique
  const uniqueParticipants = [...new Set(this.participants)];
  if (uniqueParticipants.length !== 2) {
    return next(new Error('Conversation participants must be unique'));
  }
  
  next();
});

// Index for better query performance
conversationSchema.index({ participants: 1 });
conversationSchema.index({ 'participants.0': 1, 'participants.1': 1 });
conversationSchema.index({ lastMessage: 1 });

// Static method to find or create conversation between two users
conversationSchema.statics.findOrCreateConversation = async function(userId1: string, userId2: string) {
  // Sort user IDs to ensure consistent conversation lookup
  const sortedParticipants = [userId1, userId2].sort();
  
  let conversation = await this.findOne({
    participants: { $all: sortedParticipants, $size: 2 }
  });
  
  if (!conversation) {
    conversation = new this({
      participants: sortedParticipants,
      unreadCount: {}
    });
    await conversation.save();
  }
  
  return conversation;
};

export default mongoose.model<IConversation>('Conversation', conversationSchema); 