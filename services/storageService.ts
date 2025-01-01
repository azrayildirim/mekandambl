import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

export const uploadImage = async (uri: string, folder: string): Promise<string> => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    
    const filename = uri.substring(uri.lastIndexOf('/') + 1);
    const storageRef = ref(storage, `${folder}/${Date.now()}_${filename}`);
    
    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}; 