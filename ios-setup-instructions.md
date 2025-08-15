# iOS Setup Instructions for React Native/Expo

## Error Diagnosis
You're encountering an error during the prebuild process because the iOS SDK (`iphoneos`) cannot be found. This is because you have only the Command Line Tools installed, but not the full Xcode application which is required for iOS development.

## Solution

### 1. Install Xcode
- Open the App Store on your Mac
- Search for "Xcode" 
- Download and install Xcode (note: this is a large download, typically 10+ GB)

### 2. Set up Xcode
After installing Xcode:
1. Open Xcode at least once to accept the license agreements
2. Set Xcode as your development environment:
   ```bash
   sudo xcode-select --switch /Applications/Xcode.app
   ```
3. Accept the Xcode license:
   ```bash
   sudo xcodebuild -license accept
   ```

### 3. Install iOS simulators if needed
If you need specific iOS simulator versions:
1. Open Xcode
2. Go to Preferences/Settings > Platforms
3. Download the iOS simulators you need

### 4. Run the prebuild command again
Once Xcode is set up, run the prebuild command again:
```bash
npx expo prebuild --clean
```

### 5. Troubleshooting
If you still encounter issues:
1. Make sure Xcode is fully installed and you've accepted all licenses
2. Try installing the iOS pod dependencies manually:
   ```bash
   cd ios
   pod install
   ```

## Alternative Solution for Minimal Setup
If you're not planning to use iOS simulators or build for iOS, you can add `--platform android` to only build for Android:
```bash
npx expo prebuild --clean --platform android
```

This will skip the iOS build process entirely.
