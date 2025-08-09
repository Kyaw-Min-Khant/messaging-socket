import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  sender: mongoose.Types.ObjectId;
  conversation: mongoose.Types.ObjectId;
  content: string;
  messageType: 'text' | 'image' | 'audio' | 'file';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  status: 'sent' | 'delivered' | 'seen';
  deliveredAt?: Date;
  seenAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>({
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  conversation: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'audio', 'file'],
    default: 'text'
  },
  fileUrl: {
    type: String,
    required: function() {
      return ['image', 'audio', 'file'].includes(this.messageType);
    }
  },
  fileName: {
    type: String
  },
  fileSize: {
    type: Number
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'seen'],
    default: 'sent'
  },
  deliveredAt: {
    type: Date
  },
  seenAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for better query performance
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ status: 1 });

export default mongoose.model<IMessage>('Message', messageSchema); 