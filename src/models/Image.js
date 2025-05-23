
import mongoose from 'mongoose';

// IMPORTANT: Storing raw image data (especially large files) directly in MongoDB
// is generally NOT recommended for production applications due to performance,
// cost, and BSON document size limitations (16MB).
// Dedicated file storage solutions (like Google Cloud Storage, AWS S3, Firebase Storage)
// are preferred, storing only a link/reference in MongoDB.
// This model is implemented as per specific user request for a prototype.

const ImageSchema = new mongoose.Schema({
  salesReportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalesReport',
    required: true,
    index: true, // Index for faster lookups if you query images by salesReportId
  },
  filename: {
    type: String,
    required: true,
  },
  mimetype: {
    type: String,
    required: true,
  },
  data: {
    type: Buffer, // Stores the binary image data
    required: true,
  },
}, { timestamps: true });

export default mongoose.models.Image || mongoose.model('Image', ImageSchema);
