const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload image buffer to Cloudinary
 * @param {Buffer} buffer - image buffer
 * @param {string} folder - cloudinary folder name
 * @returns {Promise<string>} secure_url
 */
const uploadImage = (buffer, folder = 'inventosmart') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image', quality: 'auto', fetch_format: 'auto' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
};

/**
 * Delete image from Cloudinary by URL
 * @param {string} imageUrl
 */
const deleteImage = async (imageUrl) => {
  try {
    const parts  = imageUrl.split('/');
    const folder = parts[parts.length - 2];
    const file   = parts[parts.length - 1].split('.')[0];
    const publicId = `${folder}/${file}`;
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('[cloudinary deleteImage]', err.message);
  }
};

module.exports = { uploadImage, deleteImage };