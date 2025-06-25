
import { 
  CLOUDINARY_CLOUD_NAME, 
  CLOUDINARY_API_KEY as FALLBACK_CLOUDINARY_API_KEY, 
  CLOUDINARY_API_SECRET as FALLBACK_CLOUDINARY_API_SECRET,
  CLOUDINARY_FOLDER_PLAYER,
  CLOUDINARY_FOLDER_NPC_MALE,
  CLOUDINARY_FOLDER_NPC_WOMEN
} from '../constants';

// Helper function to convert ArrayBuffer to hex string
async function bufferToHex(buffer: ArrayBuffer): Promise<string> {
  const byteArray = new Uint8Array(buffer);
  const hexCodes = [...byteArray].map(value => {
    const hexCode = value.toString(16);
    return hexCode.padStart(2, '0');
  });
  return hexCodes.join('');
}

// Helper function to generate SHA-1 signature
async function generateSha1Signature(paramsToSign: Record<string, string | number>, apiSecret: string): Promise<string> {
  const sortedKeys = Object.keys(paramsToSign).sort();
  let stringToSign = sortedKeys
    .map(key => `${key}=${paramsToSign[key]}`)
    .join('&');
  stringToSign += apiSecret;

  const encoder = new TextEncoder();
  const data = encoder.encode(stringToSign);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  return bufferToHex(hashBuffer);
}

/**
 * Uploads a base64 encoded image string to Cloudinary using a signed upload.
 * @param base64ImageString The raw base64 string of the image data.
 * @param type Determines which folder to use ('player', 'npc_male', 'npc_female').
 * @param publicId Optional public_id for the uploaded image in Cloudinary.
 * @returns A Promise that resolves to the secure_url of the uploaded image.
 * @throws An error if Cloudinary configuration is missing or upload fails.
 */
export async function uploadImageToCloudinary(
  base64ImageString: string,
  type: 'player' | 'npc_male' | 'npc_female', 
  publicId?: string
): Promise<string> {

  // Get Cloudinary credentials
  // Priority: Environment Variable > Constants
  const effectiveCloudinaryApiKey = process.env.CLOUDINARY_API_KEY || FALLBACK_CLOUDINARY_API_KEY;
  const effectiveCloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET || FALLBACK_CLOUDINARY_API_SECRET;
  const effectiveCloudinaryCloudName = CLOUDINARY_CLOUD_NAME; // Cloud name is always from constants.ts

  // Check if essential config is missing
  if (!effectiveCloudinaryCloudName || !effectiveCloudinaryApiKey || !effectiveCloudinaryApiSecret) {
    const missingParts: string[] = [];
    if (!effectiveCloudinaryCloudName) missingParts.push("Cloud Name (từ constants.ts)");
    if (!effectiveCloudinaryApiKey) missingParts.push("API Key (từ process.env.CLOUDINARY_API_KEY hoặc constants.ts)");
    if (!effectiveCloudinaryApiSecret) missingParts.push("API Secret (từ process.env.CLOUDINARY_API_SECRET hoặc constants.ts)");
    
    const errorMessage = `Cloudinary configuration (${missingParts.join(', ')}) is missing. Cannot upload image.`;
    console.error(errorMessage);
    throw new Error(`Cloudinary configuration (${missingParts.join(', ')}) chưa được cấu hình.`);
  }
  
  // Warning for placeholder values if constants are being used as fallback AND they are placeholders
  const usingApiKeyFromConstants = !process.env.CLOUDINARY_API_KEY;
  const usingApiSecretFromConstants = !process.env.CLOUDINARY_API_SECRET;

  if (
      (usingApiKeyFromConstants && String(FALLBACK_CLOUDINARY_API_KEY) === 'YOUR_CLOUDINARY_API_KEY') || // Compare with FALLBACK
      (usingApiSecretFromConstants && String(FALLBACK_CLOUDINARY_API_SECRET) === 'YOUR_CLOUDINARY_API_SECRET') // Compare with FALLBACK
  ) {
      console.warn("Cloudinary API Key/Secret đang sử dụng giá trị placeholder từ constants.ts. Vui lòng cập nhật chúng trong constants.ts hoặc đặt biến môi trường (CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) để Cloudinary hoạt động chính xác.");
  }

  let folderName: string;
  if (type === 'player') {
    folderName = CLOUDINARY_FOLDER_PLAYER;
  } else if (type === 'npc_male') {
    folderName = CLOUDINARY_FOLDER_NPC_MALE;
  } else { // npc_female (maps to npc_women folder)
    folderName = CLOUDINARY_FOLDER_NPC_WOMEN;
  }
  
  const timestamp = Math.round(Date.now() / 1000);

  const paramsToSign: Record<string, string | number> = {
    timestamp: timestamp,
    folder: folderName,
  };

  let sanitizedPublicId: string | undefined = undefined;
  if (publicId) {
    sanitizedPublicId = publicId.replace(/[\/\?&#%<>]/g, '_');
    paramsToSign.public_id = sanitizedPublicId;
  }
  
  // Use effectiveCloudinaryApiSecret for signature
  const signature = await generateSha1Signature(paramsToSign, effectiveCloudinaryApiSecret);

  const url = `https://api.cloudinary.com/v1_1/${effectiveCloudinaryCloudName}/image/upload`;
  
  const dataUri = `data:image/png;base64,${base64ImageString}`;

  const formData = new FormData();
  formData.append('file', dataUri); 
  // Use effectiveCloudinaryApiKey for the form data
  formData.append('api_key', effectiveCloudinaryApiKey);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);
  formData.append('folder', folderName);

  if (sanitizedPublicId) {
    formData.append('public_id', sanitizedPublicId);
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();

    if (data.secure_url) {
      return data.secure_url;
    } else {
      console.error('Cloudinary upload failed:', data.error?.message || 'Unknown error', data);
      throw new Error(data.error?.message || 'Cloudinary upload thất bại');
    }
  } catch (error) {
    console.error('Lỗi khi tải ảnh lên Cloudinary:', error);
    throw error;
  }
}
