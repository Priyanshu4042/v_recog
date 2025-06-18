# Voice User Identification with Picovoice Eagle

A modern Next.js application for browser-based voice user identification using Picovoice Eagle SDK. This project provides a complete solution for enrolling speakers and recognizing them in real-time through voice samples.

## 🚀 Features

- **Speaker Enrollment**: Record voice samples and create unique speaker profiles
- **Real-time Recognition**: Identify speakers in real-time with confidence scores
- **Browser Storage**: Store speaker profiles locally using IndexedDB
- **Modern UI**: Clean, responsive interface built with Tailwind CSS
- **Audio Visualization**: Real-time audio level indicators and progress bars
- **Error Handling**: Comprehensive error handling and user feedback
- **Microphone Management**: Proper microphone permission handling
- **Multi-speaker Support**: Enroll and recognize multiple speakers

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **Modern Browser** with microphone access support
- **HTTPS Connection** (required for microphone access)
- **Picovoice Account** (free tier available)

## 🛠️ Installation

1. **Clone and setup**:
   ```bash
   cd voice-identification
   npm install
   ```

2. **Set up Picovoice Eagle**:
   - Sign up at [Picovoice Console](https://console.picovoice.ai/)
   - Copy your AccessKey
   - Download the Eagle model file

3. **Configure the application**:
   - Replace `YOUR_PICOVOICE_ACCESS_KEY_HERE` in `src/utils/eagle.ts`
   - Place the Eagle model file as `public/models/eagle_params.pv`

4. **Run the development server**:
   ```bash
   npm run dev
   ```

## 🏗️ Project Structure

```
voice-identification/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main application page
│   │   └── layout.tsx            # Root layout
│   ├── components/
│   │   ├── SpeakerEnrollment.tsx # Speaker enrollment component
│   │   └── SpeakerRecognition.tsx# Speaker recognition component
│   ├── hooks/
│   │   └── useAudioRecorder.ts   # Audio recording hook
│   ├── utils/
│   │   ├── eagle.ts              # Eagle SDK integration
│   │   └── storage.ts            # IndexedDB storage utilities
│   └── types/
│       └── index.ts              # TypeScript type definitions
├── public/
│   └── models/
│       └── eagle_params.pv       # Eagle model file (to be added)
└── package.json
```

## 🎯 Usage

### Speaker Enrollment

1. Navigate to the Enrollment tab
2. Enter a unique speaker name
3. Click "Start Enrollment"
4. Speak clearly for 10-15 seconds
5. Wait for the progress bar to reach 100%
6. The speaker profile will be saved automatically

### Speaker Recognition

1. Navigate to the Recognition tab
2. Ensure you have enrolled speakers
3. Click "Start Recognition"
4. Speak normally - the system will identify the speaker
5. View the identified speaker and confidence level

## 🔧 Configuration

### Eagle SDK Configuration

The main configuration is in `src/utils/eagle.ts`:

```typescript
// Replace with your actual Picovoice AccessKey
const PICOVOICE_ACCESS_KEY = 'YOUR_PICOVOICE_ACCESS_KEY_HERE';
```

### Browser Requirements

- Microphone Access: Modern browsers with getUserMedia support
- Audio Context: Web Audio API support
- IndexedDB: For local storage of speaker profiles
- HTTPS: Required for microphone access (except localhost)

## 🐛 Troubleshooting

### Common Issues

1. **Microphone Permission Denied**:
   - Ensure HTTPS connection
   - Check browser permissions

2. **Eagle SDK Errors**:
   - Verify AccessKey is correct
   - Ensure model file is in the right location

3. **Audio Not Recording**:
   - Check microphone permissions
   - Verify audio device is working

## 🚀 Deployment

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## 📚 Resources

- [Picovoice Eagle Documentation](https://picovoice.ai/docs/eagle/)
- [Eagle Web SDK](https://github.com/Picovoice/eagle)
- [Picovoice Console](https://console.picovoice.ai/)

## ⚠️ Important Notes

- **Mock Implementation**: The current implementation uses mock Eagle SDK calls
- **Production Use**: Replace mock implementations with actual Eagle SDK calls
- **Privacy**: Speaker profiles are stored locally in the browser
- **Security**: Ensure proper HTTPS setup for production use

## 🔄 Next Steps

1. Replace mock implementation with actual Eagle SDK calls
2. Add authentication for production use
3. Implement cloud storage for speaker profiles
4. Add unit tests for all components
5. Optimize performance for mobile devices

---

**Need help?** Check the [Picovoice documentation](https://picovoice.ai/docs/) or open an issue in this repository.
