import mongoose from 'mongoose';

const hazardSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['pothole', 'construction', 'roadblock', 'accident', 'other'],
      lowercase: true,
      trim: true
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },
    imageUrl: {
      type: String,
      trim: true,
      default: ''
    },
    landmark: {
      type: String,
      trim: true,
      maxlength: 150,
      default: ''
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        validate: {
          validator: function (coords) {
            return (
              Array.isArray(coords) &&
              coords.length === 2 &&
              coords[0] >= -180 && coords[0] <= 180 &&
              coords[1] >= -90 && coords[1] <= 90
            );
          },
          message: 'Coordinates must be valid [longitude, latitude]'
        }
      }
    },
    status: {
      type: String,
      enum: ['active', 'resolved', 'expired'],
      default: 'active'
    },
    roadName: {
      type: String,
      default: ''
    },
    edgeId: {
      type: String,
      default: ''
    },
    confirmations: {
      type: Number,
      default: 1
    },
    resolutionReports: {
      type: Number,
      default: 0
    },
    reportedByRole: {
      type: String,
      enum: ['citizen', 'authority'],
      default: 'citizen'
    },
    resolvedByRole: {
      type: String,
      enum: ['authority', 'system'],
      default: null
    },
    resolvedReason: {
      type: String,
      default: null
    },
    expiresAt: {
      type: Date,
      required: true
    },
    resolvedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// 2dsphere index for spatial queries
hazardSchema.index({ location: '2dsphere' });
hazardSchema.index({ status: 1, expiresAt: 1 });

export const Hazard = mongoose.models.Hazard || mongoose.model('Hazard', hazardSchema);
