
import React, { useState, useCallback, useEffect } from 'react';
import type { CloudinaryUploadResponse, CloudinaryErrorResponse } from '../types';
import Spinner from './Spinner';
import UploadIcon from './icons/UploadIcon';

// Attempt to read Cloudinary credentials from environment variables
const initialCloudName = typeof process !== 'undefined' && process.env && process.env.CLOUDINARY_CLOUD_NAME ? process.env.CLOUDINARY_CLOUD_NAME : '';
console.log("Attempting to read CLOUDINARY_CLOUD_NAME:", typeof process !== 'undefined' && process.env ? process.env.CLOUDINARY_CLOUD_NAME : 'process.env is undefined');

const initialUploadPreset = typeof process !== 'undefined' && process.env && process.env.CLOUDINARY_UPLOAD_PRESET ? process.env.CLOUDINARY_UPLOAD_PRESET : '';
console.log("Attempting to read CLOUDINARY_UPLOAD_PRESET:", typeof process !== 'undefined' && process.env ? process.env.CLOUDINARY_UPLOAD_PRESET : 'process.env is undefined');

const cloudinaryApiKey = typeof process !== 'undefined' && process.env && process.env.CLOUDINARY_API_KEY ? process.env.CLOUDINARY_API_KEY : null;
console.log("Attempting to read CLOUDINARY_API_KEY:", typeof process !== 'undefined' && process.env ? process.env.CLOUDINARY_API_KEY : 'process.env is undefined. API Key will be null.');


const ImageUploader: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cloudName, setCloudName] = useState<string>(initialCloudName);
  const [uploadPreset, setUploadPreset] = useState<string>(initialUploadPreset);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  useEffect(() => {
    // Revoke object URL to prevent memory leaks when component unmounts or file changes
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setUploadedImageUrl(null);
    setUploadProgress(0);
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
        setError('File size exceeds 10MB limit.');
        setFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(selectedFile.type)) {
        setError('Invalid file type. Please select a JPG, PNG, GIF, or WEBP image.');
        setFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        return;
      }
      
      setFile(selectedFile);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(URL.createObjectURL(selectedFile));
    } else {
      setFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
    }
  }, [previewUrl]);

  const handleUpload = useCallback(async () => {
    if (!file) {
      setError('Please select an image file first.');
      return;
    }
    if (!cloudName.trim()) {
      setError('Please enter your Cloudinary Cloud Name.');
      return;
    }
    if (!uploadPreset.trim()) {
      setError('Please enter your Cloudinary Upload Preset.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setUploadedImageUrl(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    // Add API key to formData if it's available from environment variables
    if (cloudinaryApiKey) {
      formData.append('api_key', cloudinaryApiKey);
      console.log('CLOUDINARY_API_KEY found, appending to formData.');
    } else {
      console.log('CLOUDINARY_API_KEY not found or null, not appending to formData.');
    }

    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        setIsLoading(false);
        if (xhr.status >= 200 && xhr.status < 300) {
          const response: CloudinaryUploadResponse = JSON.parse(xhr.responseText);
          setUploadedImageUrl(response.secure_url);
          setFile(null); // Clear file after successful upload
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
          setUploadProgress(100); // Ensure it hits 100%
        } else {
          try {
            const errorResponse: CloudinaryErrorResponse = JSON.parse(xhr.responseText);
            setError(`Upload failed: ${errorResponse.error.message} (Status: ${xhr.status})`);
          } catch (e) {
             setError(`Upload failed. Status: ${xhr.status} - ${xhr.statusText}. Please check your Cloud Name, Upload Preset, and API Key (if used).`);
          }
           setUploadProgress(0);
        }
      };

      xhr.onerror = () => {
        setIsLoading(false);
        setError('Network error during upload. Please try again.');
        setUploadProgress(0);
      };
      
      xhr.send(formData);

    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during upload.');
      setUploadProgress(0);
    }
  }, [file, cloudName, uploadPreset, previewUrl]);
  
  const handleRemovePreview = useCallback(() => {
    setFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setError(null);
    setUploadedImageUrl(null);
    setUploadProgress(0);
    // Reset file input value to allow re-selecting the same file
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }, [previewUrl]);


  return (
    <div className="bg-slate-800 shadow-2xl rounded-xl p-6 sm:p-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="cloudName" className="block text-sm font-medium text-slate-300 mb-1">
            Cloudinary Cloud Name
          </label>
          <input
            type="text"
            id="cloudName"
            value={cloudName}
            onChange={(e) => setCloudName(e.target.value)}
            placeholder="e.g., your-cloud-name"
            className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition duration-150 ease-in-out"
          />
        </div>
        <div>
          <label htmlFor="uploadPreset" className="block text-sm font-medium text-slate-300 mb-1">
            Cloudinary Upload Preset
          </label>
          <input
            type="text"
            id="uploadPreset"
            value={uploadPreset}
            onChange={(e) => setUploadPreset(e.target.value)}
            placeholder="e.g., your-unsigned-preset"
            className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition duration-150 ease-in-out"
          />
        </div>
      </div>
      { cloudinaryApiKey === null && ( initialCloudName === '' || initialUploadPreset === '') &&
         <div className="mt-1 p-3 bg-yellow-700/30 border border-yellow-600 text-yellow-300 rounded-lg text-xs">
            <p>Tip: You can set <code>CLOUDINARY_CLOUD_NAME</code>, <code>CLOUDINARY_UPLOAD_PRESET</code>, and <code>CLOUDINARY_API_KEY</code> as environment variables to pre-fill these fields or include the API key in requests.</p>
        </div>
      }


      <div>
        <label
          htmlFor="file-upload"
          className="relative cursor-pointer bg-slate-700 hover:bg-slate-600 transition-colors duration-150 ease-in-out rounded-lg border-2 border-dashed border-slate-500 hover:border-sky-500 p-8 flex flex-col items-center justify-center text-center group"
        >
          <UploadIcon className="w-12 h-12 text-slate-400 group-hover:text-sky-400 mb-3 transition-colors" />
          <span className="block text-lg font-semibold text-slate-200 group-hover:text-sky-300">
            {file ? 'Change file' : 'Choose a file or drag it here'}
          </span>
          <span className="mt-1 block text-sm text-slate-400">
            PNG, JPG, GIF, WEBP up to 10MB
          </span>
          <input
            id="file-upload"
            name="file-upload"
            type="file"
            accept="image/png, image/jpeg, image/gif, image/webp"
            onChange={handleFileChange}
            className="sr-only"
          />
        </label>
      </div>

      {previewUrl && file && (
        <div className="mt-4 p-4 border border-slate-600 rounded-lg bg-slate-700/50">
          <h3 className="text-md font-semibold text-slate-200 mb-2">Image Preview:</h3>
          <div className="relative group">
            <img
              src={previewUrl}
              alt="Selected preview"
              className="max-w-full h-auto max-h-60 object-contain rounded-md mx-auto shadow-lg"
            />
             <button 
                onClick={handleRemovePreview}
                className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                title="Remove image"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
          </div>
          <p className="text-sm text-slate-400 mt-2 text-center">{file.name} ({(file.size / 1024).toFixed(2)} KB)</p>
        </div>
      )}

      {isLoading && (
        <div className="mt-4 text-center">
          <Spinner size="md" />
          <p className="text-sm text-sky-400 mt-2">Uploading: {uploadProgress}%</p>
          <div className="w-full bg-slate-600 rounded-full h-2.5 mt-2">
            <div 
              className="bg-sky-500 h-2.5 rounded-full transition-all duration-300 ease-out" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-700/30 border border-red-600 text-red-300 rounded-lg text-sm">
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {uploadedImageUrl && !isLoading && (
        <div className="mt-6 p-4 bg-green-700/30 border border-green-600 rounded-lg">
          <h3 className="text-lg font-semibold text-green-300 mb-3">Upload Successful!</h3>
          <img
            src={uploadedImageUrl}
            alt="Uploaded to Cloudinary"
            className="max-w-full h-auto max-h-80 object-contain rounded-md mx-auto shadow-xl mb-3"
          />
          <p className="text-sm text-green-200 break-all">
            URL: <a href={uploadedImageUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-green-100">{uploadedImageUrl}</a>
          </p>
          <button
            onClick={() => navigator.clipboard.writeText(uploadedImageUrl)}
            className="mt-3 w-full px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75"
          >
            Copy URL
          </button>
        </div>
      )}

      {!isLoading && (
        <button
          onClick={handleUpload}
          disabled={!file || !cloudName || !uploadPreset || isLoading}
          className="w-full flex items-center justify-center px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-opacity-75"
        >
          <UploadIcon className="w-5 h-5 mr-2" />
          {isLoading ? 'Uploading...' : 'Upload to Cloudinary'}
        </button>
      )}
    </div>
  );
};

export default ImageUploader;
