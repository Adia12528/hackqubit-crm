const Minio = require('minio');

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT) || 9000,
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
});

const BUCKETS = {
  RECORDINGS: process.env.MINIO_BUCKET_RECORDINGS || 'call-recordings',
  ATTACHMENTS: process.env.MINIO_BUCKET_ATTACHMENTS || 'attachments',
};

// Initialize buckets on startup
async function initBuckets() {
  for (const bucket of Object.values(BUCKETS)) {
    const exists = await minioClient.bucketExists(bucket);
    if (!exists) {
      await minioClient.makeBucket(bucket, 'us-east-1');
      console.log(`✅ MinIO bucket created: ${bucket}`);
    } else {
      console.log(`✅ MinIO bucket exists: ${bucket}`);
    }
  }
}

// Generate a presigned URL for secure file access (expires in 1 hour)
async function getPresignedUrl(bucket, objectName, expiry = 3600) {
  return await minioClient.presignedGetObject(bucket, objectName, expiry);
}

// Upload buffer/stream to MinIO
async function uploadFile(bucket, objectName, stream, size, contentType) {
  await minioClient.putObject(bucket, objectName, stream, size, {
    'Content-Type': contentType,
  });
  return objectName;
}

module.exports = { minioClient, BUCKETS, initBuckets, getPresignedUrl, uploadFile };
