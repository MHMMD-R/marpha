import * as ImagePicker from 'expo-image-picker';

export async function pickSingleImage(options: Partial<ImagePicker.ImagePickerOptions> = {}) {
  return ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    legacy: false,
    quality: 0.8,
    ...options,
  });
}

export async function pickSingleVideo(options: Partial<ImagePicker.ImagePickerOptions> = {}) {
  return ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    allowsMultipleSelection: false,
    legacy: false,
    allowsEditing: false,
    quality: 1,
    ...options,
  });
}
