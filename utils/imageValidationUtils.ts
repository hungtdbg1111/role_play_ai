
export const isValidImageUrl = (url: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!url || typeof url !== 'string') {
      resolve(false);
      return;
    }

    // data:image URIs are considered valid if they start with the prefix
    // but http/https need further checking.
    if (url.startsWith('data:image')) {
        // A more robust check could involve trying to render it, but for now, prefix is okay.
        // Check for common image mime types within data URI
        if (url.startsWith('data:image/png;') || url.startsWith('data:image/jpeg;') || url.startsWith('data:image/gif;') || url.startsWith('data:image/webp;')) {
            resolve(true);
        } else {
            resolve(false); // Unknown or unsupported image data URI format
        }
        return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        resolve(false);
        return;
    }
    
    // For http/https URLs, attempt to load in a hidden image
    const img = new Image();
    let settled = false;

    const settle = (result: boolean) => {
        if (!settled) {
            settled = true;
            resolve(result);
        }
    };

    img.onload = () => settle(true);
    img.onerror = () => settle(false);
    img.src = url;

    // Timeout to prevent hanging if the image never loads or errors (e.g. CORS on error event)
    setTimeout(() => {
        // If neither onload nor onerror has fired, assume it's not a directly loadable image
        settle(false); 
    }, 3000); // 3 second timeout
  });
};
