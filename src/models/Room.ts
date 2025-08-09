import mongoose, { Schema, Document } from 'mongoose';

export interface IRoom extends Document {
  name: string;
  description?: string;
  isPrivate: boolean;
  createdBy: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  admins: mongoose.Types.ObjectId[];
  lastMessage?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new Schema<IRoom>({
  name: {
    type: String,
    required: [true, 'Room name is required'],
    trim: true,
    minlength: [3, 'Room name must be at least 3 characters long'],
    maxlength: [50, 'Room name cannot exceed 50 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  admins: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  lastMessage: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  }
}, {
  timestamps: true
});

// Index for better query performance
roomSchema.index({ name: 1 });
roomSchema.index({ members: 1 });
roomSchema.index({ isPrivate: 1 });

export default mongoose.model<IRoom>('Room', roomSchema); 