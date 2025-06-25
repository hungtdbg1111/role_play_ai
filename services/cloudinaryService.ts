
import { 
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_FOLDER_PLAYER,
  CLOUDINARY_FOLDER_NPC_MALE,
  CLOUDINARY_FOLDER_NPC_WOMEN
} from '../constants';

/**
 * Uploads a base64 encoded image string to Cloudinary using a server-generated signature.
 * @param base64ImageString The raw base64 string of the image data (without data:image/png;base64, prefix).
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
  const paramsToSignForNetlify: Record<string, string | number> = {
    timestamp: timestamp,
    folder: folderName,
  };

  let sanitizedPublicId: string | undefined = undefined;
  if (publicId) {
    sanitizedPublicId = publicId.replace(/[\/\?&#%<>]/g, '_');
    paramsToSignForNetlify.public_id = sanitizedPublicId;
  }
  
  let signatureData;
  try {
    // Call the Netlify function to get the signature
    const sigResponse = await fetch('/.netlify/functions/generate-cloudinary-signature', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paramsToSign: paramsToSignForNetlify }),
    });

    if (!sigResponse.ok) {
      const errorBody = await sigResponse.text();
      console.error("Failed to get signature from Netlify function:", sigResponse.status, errorBody);
      throw new Error(`Lỗi lấy chữ ký Cloudinary từ server: ${sigResponse.statusText} - ${errorBody}`);
    }
    signatureData = await sigResponse.json();
    if (!signatureData.signature || !signatureData.apiKey || typeof signatureData.timestamp === 'undefined') {
      throw new Error("Phản hồi chữ ký không hợp lệ từ server. Thiếu signature, apiKey, hoặc timestamp.");
    }
  } catch (error) {
    console.error('Error fetching signature from Netlify function:', error);
    throw new Error(`Không thể lấy chữ ký Cloudinary: ${(error as Error).message}`);
  }

  const url = `https://api.cloudinary.com/v1_1/${effectiveCloudinaryCloudName}/image/upload`;
  
  // Ensure the base64 string is prefixed for Cloudinary direct upload
  const dataUri = base64ImageString.startsWith('data:image') ? base64ImageString : `data:image/png;base64,${base64ImageString}`;

  const formData = new FormData();
  formData.append('file', dataUri); 
  formData.append('api_key', signatureData.apiKey); // Use API key from server response
  formData.append('timestamp', String(signatureData.timestamp)); // Use timestamp from server response
  formData.append('signature', signatureData.signature); // Use signature from server response
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
