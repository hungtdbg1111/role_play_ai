
import { 
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_FOLDER_PLAYER,
  CLOUDINARY_FOLDER_NPC_MALE,
  CLOUDINARY_FOLDER_NPC_WOMEN,
  // CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are no longer directly used here for signing.
  // They are expected to be environment variables in the Netlify function.
} from '../constants';

// Netlify function endpoint
const SIGNATURE_FUNCTION_ENDPOINT = '/.netlify/functions/generate-cloudinary-signature';

export async function uploadImageToCloudinary(
  base64ImageString: string,
  type: 'player' | 'npc_male' | 'npc_female', 
  publicId?: string
): Promise<string> {

  const effectiveCloudinaryCloudName = CLOUDINARY_CLOUD_NAME;
  if (!effectiveCloudinaryCloudName) {
    const errorMessage = "Cloudinary Cloud Name (từ constants.ts) is missing. Cannot upload image.";
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
  
  let folderName: string;
  if (type === 'player') {
    folderName = CLOUDINARY_FOLDER_PLAYER;
  } else if (type === 'npc_male') {
    folderName = CLOUDINARY_FOLDER_NPC_MALE;
  } else { // npc_female
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
  
  let signature: string;
  let apiKeyToUse: string;
  let timestampToUse: number;

  try {
    const sigResponse = await fetch(SIGNATURE_FUNCTION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paramsToSign }),
    });

    if (!sigResponse.ok) {
      const errorBody = await sigResponse.json();
      throw new Error(`Failed to get signature from server: ${sigResponse.status} ${sigResponse.statusText}. Details: ${errorBody?.message || 'Unknown server error'}`);
    }
    const sigData = await sigResponse.json();
    signature = sigData.signature;
    apiKeyToUse = sigData.apiKey;
    timestampToUse = sigData.timestamp; // Use timestamp from server response to ensure consistency
    
    if (!signature || !apiKeyToUse || typeof timestampToUse !== 'number') {
        throw new Error("Invalid signature data received from server.");
    }

  } catch (error) {
    console.error("Error fetching Cloudinary signature:", error);
    const userMessage = error instanceof Error ? error.message : "Lỗi kết nối đến dịch vụ ký Cloudinary.";
    throw new Error(`Không thể lấy chữ ký Cloudinary: ${userMessage}`);
  }
  
  const formData = new FormData();
  formData.append('file', `data:image/png;base64,${base64ImageString}`);
  formData.append('api_key', apiKeyToUse);
  formData.append('timestamp', timestampToUse.toString());
  formData.append('signature', signature);
  formData.append('folder', folderName);
  if (sanitizedPublicId) {
    formData.append('public_id', sanitizedPublicId);
  }
  
  const cloudinaryUploadUrl = `https://api.cloudinary.com/v1_1/${effectiveCloudinaryCloudName}/image/upload`;
  try {
    const uploadResponse = await fetch(cloudinaryUploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorBody = await uploadResponse.text(); 
      throw new Error(`Cloudinary upload failed: ${uploadResponse.status} ${uploadResponse.statusText}. Details: ${errorBody}`);
    }

    const uploadResult = await uploadResponse.json();
    if (!uploadResult.secure_url) {
      throw new Error("Cloudinary upload succeeded but did not return a secure_url.");
    }
    return uploadResult.secure_url;
  } catch (error) {
    console.error("Error during Cloudinary upload POST request:", error);
    throw new Error(`Tải ảnh lên Cloudinary thất bại: ${error instanceof Error ? error.message : String(error)}`);
  }
}
