import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/stores/app.store';
import { useChatStore } from '@/stores/chat.store';
import { db } from '@/data/db';
import { openSeal, isSealed } from '@/security/crypto';
import { EMOJI_DECK } from '@/content/recipes';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { ChatMessage, MediaExpiry } from '@/types';
import { isExpired } from '@/services/mediaExpiry';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import {
  VideoRecorder,
  VideoRecorderCamera,
  VideoRecorderQuality,
} from '@capacitor-community/video-recorder';
import { VoiceRecorder } from '@independo/capacitor-voice-recorder';
import { FilePicker } from '@capawesome/capacitor-file-picker';

export const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const playerName = useAppStore((s) => s.playerName) || 'You';
  const partnerName = useAppStore((s) => s.partnerName) || 'Partner';
  const deviceId = useAppStore((s) => s.deviceId);
  const roomCode = useAppStore((s) => s.roomCode);
  const showOnlineStatus = useAppStore((s) => s.preferences.showOnlineStatus);

  const messages = useChatStore((s) => s.messages);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const addReaction = useChatStore((s) => s.addReaction);
  const deleteMessage = useChatStore((s) => s.deleteMessage);
  const markRead = useChatStore((s) => s.markRead);
  const markViewed = useChatStore((s) => s.markViewed);
  const expireMessage = useChatStore((s) => s.expireMessage);

  // Input states
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);

  // Decrypted message cache
  const [decryptedCache, setDecryptedCache] = useState<Record<string, string>>({});

  // Dedicated In-Chat Camera & Video Recording States
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<'photo' | 'video'>('photo');
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoTimer, setVideoTimer] = useState(0);
  const [selectedExpiry, setSelectedExpiry] = useState<MediaExpiry>('keep');
  
  // Voice Recording
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioTimer, setAudioTimer] = useState(0);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Media Viewer modal
  const [viewingMediaUrl, setViewingMediaUrl] = useState<string | null>(null);
  const [viewingMediaMime, setViewingMediaMime] = useState<string>('image/jpeg');

  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Mark read on entry
  useEffect(() => {
    markRead();
  }, [markRead]);

  useEffect(() => {
    const checkExpiry = () => {
      messages.forEach((message) => {
        if (message.deleted) return;
        if (isExpired(message.expiresAt, Date.now(), message.viewed)) {
          void expireMessage(message.id);
        }
      });
    };
    checkExpiry();
    const interval = window.setInterval(checkExpiry, 1_000);
    return () => window.clearInterval(interval);
  }, [messages, expireMessage]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Decrypt sealed messages asynchronously
  useEffect(() => {
    messages.forEach(async (msg) => {
      if (msg.sealedContent && isSealed(msg.sealedContent) && !decryptedCache[msg.id]) {
        try {
          const plain = await openSeal(msg.sealedContent);
          setDecryptedCache((prev) => ({ ...prev, [msg.id]: plain }));
        } catch {
          setDecryptedCache((prev) => ({ ...prev, [msg.id]: '[Encrypted content]' }));
        }
      }
    });
  }, [messages]);

  // Stop camera stream when camera closes
  const stopCameraStream = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }
  };

  // Launch In-Chat Camera
  const startCamera = async (mode: 'photo' | 'video') => {
    setCameraMode(mode);
    setCapturedBlob(null);
    setCapturedPreviewUrl(null);
    setIsRecordingVideo(false);
    setVideoTimer(0);

    if (Capacitor.isNativePlatform() && mode === 'photo') {
      try {
        const photo = await Camera.getPhoto({
          quality: 92,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
          saveToGallery: false,
          allowEditing: false,
        });
        if (!photo.dataUrl) return;
        const response = await fetch(photo.dataUrl);
        const blob = await response.blob();
        setCapturedBlob(blob);
        setCapturedPreviewUrl(URL.createObjectURL(blob));
        setIsCameraOpen(true);
      } catch (error) {
        console.error('Native camera error', error);
        showToast('Camera permission denied or camera hardware unavailable', 'warning');
      }
      return;
    }

    if (Capacitor.isNativePlatform() && mode === 'video') {
      try {
        await VideoRecorder.initialize({
          camera: cameraFacing === 'user' ? VideoRecorderCamera.FRONT : VideoRecorderCamera.BACK,
          quality: VideoRecorderQuality.MAX_720P,
          autoShow: true,
          previewFrames: [
            {
              id: 'afterdark-video-preview',
              stackPosition: 'back',
              width: 'fill',
              height: 'fill',
              borderRadius: 16,
              mirrorFrontCam: cameraFacing === 'user',
            },
          ],
        });
        setIsCameraOpen(true);
      } catch (error) {
        console.error('Native video recorder error', error);
        showToast('Video recording hardware or permissions unavailable', 'warning');
      }
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: cameraFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: mode === 'video',
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setMediaStream(stream);
      setIsCameraOpen(true);

      if (videoElementRef.current) {
        videoElementRef.current.srcObject = stream;
        videoElementRef.current.play();
      }
    } catch (err) {
      console.error('Camera error', err);
      showToast('Camera permission denied or camera hardware unavailable', 'warning');
    }
  };

  // Toggle Camera Front / Rear
  const toggleCameraFacing = async () => {
    const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(nextFacing);
    stopCameraStream();

    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: nextFacing },
        audio: cameraMode === 'video',
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setMediaStream(stream);
      if (videoElementRef.current) {
        videoElementRef.current.srcObject = stream;
        videoElementRef.current.play();
      }
    } catch (err) {
      showToast('Could not switch camera', 'error');
    }
  };

  // Capture Photo
  const takePhoto = () => {
    if (!videoElementRef.current) return;
    const video = videoElementRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedBlob(blob);
        setCapturedPreviewUrl(URL.createObjectURL(blob));
        stopCameraStream();
      }
    }, 'image/jpeg', 0.92);
  };

  // Video Recording Controls
  const startVideoRecording = () => {
    if (Capacitor.isNativePlatform()) {
      void (async () => {
        try {
          await VideoRecorder.startRecording();
          setIsRecordingVideo(true);
          const interval = setInterval(() => {
            setVideoTimer((prev) => {
              if (prev >= 60) {
                stopVideoRecording();
                clearInterval(interval);
                return 60;
              }
              return prev + 1;
            });
          }, 1000);
        } catch (error) {
          console.error('Native video start error', error);
          showToast('Could not start video recording', 'error');
        }
      })();
      return;
    }
    if (!mediaStream) return;
    recordedChunksRef.current = [];
    try {
      const recorder = new MediaRecorder(mediaStream, { mimeType: 'video/webm' });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const videoBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        setCapturedBlob(videoBlob);
        setCapturedPreviewUrl(URL.createObjectURL(videoBlob));
        stopCameraStream();
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecordingVideo(true);

      const interval = setInterval(() => {
        setVideoTimer((prev) => {
          if (prev >= 60) {
            // max 60s
            stopVideoRecording();
            clearInterval(interval);
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (e) {
      showToast('Video recording format not supported on this device', 'error');
    }
  };

  const stopVideoRecording = () => {
    if (Capacitor.isNativePlatform()) {
      void (async () => {
        try {
          const result = await VideoRecorder.stopRecording();
          const response = await fetch(result.videoUrl);
          const videoBlob = await response.blob();
          setCapturedBlob(videoBlob);
          setCapturedPreviewUrl(URL.createObjectURL(videoBlob));
          await VideoRecorder.destroy();
          setIsRecordingVideo(false);
        } catch (error) {
          console.error('Native video stop error', error);
          showToast('Could not process the recorded video', 'error');
        }
      })();
      return;
    }
    if (mediaRecorderRef.current && isRecordingVideo) {
      mediaRecorderRef.current.stop();
      setIsRecordingVideo(false);
    }
  };

  // Send Captured Media (Photo or Video)
  const sendCapturedMedia = async () => {
    if (!capturedBlob) return;
    const isVideo = capturedBlob.type.includes('video');

    await sendMessage({
      senderId: deviceId || 'me',
      senderName: playerName,
      content: isVideo ? '🎥 Video message' : '📷 Photo message',
      type: isVideo ? 'video' : 'image',
      mediaExpiry: selectedExpiry,
      blob: capturedBlob,
      mime: capturedBlob.type,
      previewLabel: isVideo ? 'Video recording' : 'Captured photo',
      roomCode,
    });

    setIsCameraOpen(false);
    setCapturedBlob(null);
    setCapturedPreviewUrl(null);
    showToast('Sent to partner', 'success');
  };

  // Voice Note Recording
  const startAudioRecording = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const permission = await VoiceRecorder.requestAudioRecordingPermission();
        if (!permission.value) {
          showToast('Microphone access denied', 'warning');
          return;
        }
        await VoiceRecorder.startRecording();
        setIsRecordingAudio(true);
        setAudioTimer(0);
        const timerInterval = window.setInterval(() => setAudioTimer((timer) => timer + 1), 1000);
        (window as Window & { afterdarkAudioInterval?: number }).afterdarkAudioInterval = timerInterval;
      } catch (error) {
        console.error('Native audio start error', error);
        showToast('Could not start voice recording', 'error');
      }
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendMessage({
          senderId: deviceId || 'me',
          senderName: playerName,
          content: '🎙️ Voice message',
          type: 'voice',
          blob: audioBlob,
          mime: 'audio/webm',
          roomCode,
        });
        stream.getTracks().forEach((t) => t.stop());
        showToast('Voice note sent', 'success');
      };
      recorder.start();
      audioRecorderRef.current = recorder;
      setIsRecordingAudio(true);
      setAudioTimer(0);

      const timerInterval = setInterval(() => {
        setAudioTimer((t) => t + 1);
      }, 1000);

      (recorder as any)._timer = timerInterval;
    } catch {
      showToast('Microphone access denied', 'warning');
    }
  };

  const stopAudioRecording = () => {
    if (Capacitor.isNativePlatform()) {
      void (async () => {
        try {
          const interval = (window as Window & { afterdarkAudioInterval?: number }).afterdarkAudioInterval;
          if (interval) window.clearInterval(interval);
          const result = await VoiceRecorder.stopRecording();
          const base64 = result.value.recordDataBase64;
          const mime = result.value.mimeType || 'audio/m4a';
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
          const audioBlob = new Blob([bytes], { type: mime });
          await sendMessage({
            senderId: deviceId || 'me',
            senderName: playerName,
            content: '🎙️ Voice message',
            type: 'voice',
            blob: audioBlob,
            mime,
            roomCode,
          });
          setIsRecordingAudio(false);
          showToast('Voice note sent', 'success');
        } catch (error) {
          console.error('Native audio stop error', error);
          showToast('Could not save voice recording', 'error');
        }
      })();
      return;
    }
    if (audioRecorderRef.current && isRecordingAudio) {
      clearInterval((audioRecorderRef.current as any)._timer);
      audioRecorderRef.current.stop();
      setIsRecordingAudio(false);
    }
  };

  // Gallery file select
  const handleGallerySelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await sendMessage({
      senderId: deviceId || 'me',
      senderName: playerName,
      content: file.type.includes('video') ? '🎥 Video' : '🖼️ Photo',
      type: file.type.includes('video') ? 'video' : 'image',
      mediaExpiry: selectedExpiry,
      blob: file,
      mime: file.type,
      roomCode,
    });
    showToast('Attachment sent', 'success');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openNativeGallery = async () => {
    if (!Capacitor.isNativePlatform()) {
      fileInputRef.current?.click();
      return;
    }
    try {
      const result = await FilePicker.pickMedia({ readData: true, limit: 1 });
      const file = result.files[0];
      if (!file?.data) {
        showToast('No media was selected', 'info');
        return;
      }
      const binary = atob(file.data);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      const mime = file.mimeType || 'application/octet-stream';
      const blob = new Blob([bytes], { type: mime });
      setCapturedBlob(blob);
      setCapturedPreviewUrl(URL.createObjectURL(blob));
      setCameraMode(mime.includes('video') ? 'video' : 'photo');
      setIsCameraOpen(true);
    } catch (error) {
      console.error('Native gallery error', error);
      showToast('Gallery access denied or unavailable', 'warning');
    }
  };

  // Text message send
  const handleSendText = async () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');

    await sendMessage({
      senderId: deviceId || 'me',
      senderName: playerName,
      content: text,
      type: 'text',
      replyToId: replyingTo?.id,
      roomCode,
    });

    setReplyingTo(null);
    setShowEmojiPicker(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-md mx-auto bg-ad-bg text-ad-text relative overflow-hidden">
      {/* Hidden gallery file picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleGallerySelect}
        className="hidden"
      />

      {/* Header Bar */}
      <div className="flex items-center justify-between p-3.5 bg-ad-bg-secondary/90 backdrop-blur-md border-b border-ad-burgundy/40 z-10">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-9 h-9 rounded-full border border-ad-gold/50 bg-ad-burgundy flex items-center justify-center font-bold text-xs text-ad-gold shadow-md">
              {partnerName.charAt(0).toUpperCase()}
            </div>
            {showOnlineStatus && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-ad-bg" />
            )}
          </div>

          <div>
            <div className="font-display text-sm font-bold text-white flex items-center gap-1.5">
              <span>{partnerName}</span>
              <span className="text-[10px] text-ad-gold">🔒</span>
            </div>
            <div className="text-[10px] text-ad-text-secondary/70">
              End-to-End Encrypted Room
            </div>
          </div>
        </div>

        {/* Quick Game Invite Button */}
        <Button
          size="sm"
          variant="secondary"
          onClick={() => navigate('/games')}
          className="text-xs py-1 px-2.5"
        >
          🎮 Invite
        </Button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.senderId === (deviceId || 'me');
          const isSystem = msg.type === 'system';
          const displayedContent = msg.sealedContent
            ? decryptedCache[msg.id] || 'Decrypting...'
            : msg.content;

          if (isSystem) {
            return (
              <div key={msg.id} className="text-center my-2">
                <span className="inline-block px-3 py-1.5 rounded-full bg-ad-bg-secondary/70 border border-ad-burgundy/30 text-[10px] text-ad-text-secondary max-w-xs leading-relaxed">
                  {displayedContent}
                </span>
              </div>
            );
          }

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              <div
                onClick={() => setActiveReactionMsgId(activeReactionMsgId === msg.id ? null : msg.id)}
                className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed shadow-lg cursor-pointer transition-all ${
                  isMe
                    ? 'bg-gradient-to-br from-ad-red to-ad-burgundy text-white rounded-br-none border border-ad-red/40'
                    : 'bg-ad-bg-secondary text-ad-text rounded-bl-none border border-ad-burgundy/50'
                }`}
              >
                {/* Media message card */}
                {msg.mediaId && (
                  <div
                    className="mb-2 rounded-xl overflow-hidden bg-black/40 border border-white/10 p-2 text-center cursor-pointer"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const record = await db.media.get(msg.mediaId!);
                      if (record?.blob) {
                        setViewingMediaUrl(URL.createObjectURL(record.blob));
                        setViewingMediaMime(record.mime);
                        await markViewed(msg.id);
                      }
                    }}
                  >
                    <div className="text-2xl mb-1 select-none">
                      {msg.type === 'video' ? '🎥' : '📷'}
                    </div>
                    <span className="text-[10px] text-ad-gold font-mono uppercase underline">
                      Tap to view {msg.type}
                    </span>
                    {msg.mediaExpiry && msg.mediaExpiry !== 'keep' && (
                      <span className="block text-[9px] text-ad-text-secondary mt-0.5">
                        ⏱ Expiry: {msg.mediaExpiry}
                      </span>
                    )}
                  </div>
                )}

                {/* Voice message */}
                {msg.type === 'voice' && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🎙️</span>
                    <span className="text-xs font-mono">Voice message</span>
                  </div>
                )}

                {/* Text Content */}
                <p className="whitespace-pre-wrap break-words">{displayedContent}</p>

                {/* Metadata: Timestamp & Status */}
                <div className="flex items-center justify-end gap-1 text-[9px] text-ad-text-secondary/70 mt-1">
                  <span>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {isMe && (
                    <span className="text-ad-gold font-bold">
                      {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>

              {/* Emoji Reactions Tray */}
              {Object.keys(msg.reactions || {}).length > 0 && (
                <div className="flex gap-1 -mt-1.5 px-2">
                  {Object.entries(msg.reactions).map(([emoji, _playerId]) => (
                    <span
                      key={emoji}
                      className="px-1.5 py-0.2 rounded-full bg-ad-bg-secondary border border-ad-burgundy text-[11px] shadow-sm"
                    >
                      {emoji}
                    </span>
                  ))}
                </div>
              )}

              {/* Quick Reaction Popup */}
              {activeReactionMsgId === msg.id && (
                <div className="flex items-center gap-1 p-1 bg-ad-bg-secondary/95 border border-ad-gold/40 rounded-full shadow-2xl my-1 z-20">
                  {['❤️', '🔥', '😈', '💋', '🫦', '🌹'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        addReaction(msg.id, emoji, deviceId || 'me');
                        setActiveReactionMsgId(null);
                      }}
                      className="text-base p-1 hover:scale-125 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingTo(msg);
                      setActiveReactionMsgId(null);
                    }}
                    className="text-[10px] text-ad-gold px-1.5"
                  >
                    Reply
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Banner */}
      {replyingTo && (
        <div className="p-2 bg-ad-bg-secondary/90 border-t border-ad-burgundy/40 flex items-center justify-between text-xs text-ad-text-secondary px-4">
          <div className="truncate">
            Replying to <span className="text-ad-gold font-bold">{replyingTo.senderName}</span>
          </div>
          <button onClick={() => setReplyingTo(null)} className="text-ad-text font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Emoji Picker Drawer */}
      {showEmojiPicker && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 160, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-ad-bg-secondary border-t border-ad-burgundy/40 p-3 overflow-y-auto"
        >
          <div className="grid grid-cols-9 gap-2 text-xl text-center">
            {EMOJI_DECK.map((emoji: string) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setInputText((prev) => prev + emoji)}
                className="hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Message Composer Bar */}
      <div className="p-3 bg-ad-bg-secondary/95 backdrop-blur-md border-t border-ad-burgundy/40 space-y-2">
        <div className="flex items-center gap-1.5">
          {/* Attachment Plus Button */}
          <button
            type="button"
            onClick={() => setShowAttachMenu(true)}
            className="w-9 h-9 rounded-xl bg-ad-bg border border-ad-burgundy/40 text-ad-gold text-lg flex items-center justify-center hover:border-ad-gold/50 active:scale-95 transition-all"
            title="Attachments"
          >
            +
          </button>

          {/* Direct Camera Button (MANDATORY REQUIREMENT) */}
          <button
            type="button"
            onClick={() => startCamera('photo')}
            className="w-9 h-9 rounded-xl bg-ad-red/20 border border-ad-red/40 text-ad-text text-base flex items-center justify-center hover:bg-ad-red/30 active:scale-95 transition-all"
            title="Open Camera"
          >
            📷
          </button>

          {/* Emoji Drawer Toggle */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className="w-9 h-9 rounded-xl bg-ad-bg border border-ad-burgundy/40 text-ad-text text-base flex items-center justify-center hover:border-ad-gold/50 active:scale-95 transition-all"
            title="Emoji Keyboard"
          >
            🫦
          </button>

          {/* Text Input */}
          <input
            type="text"
            placeholder="Type a private message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
            className="flex-1 bg-ad-bg/80 border border-ad-burgundy/40 rounded-xl px-3 py-2 text-xs text-ad-text placeholder:text-ad-text-secondary/40 focus:outline-none focus:border-ad-gold/70"
          />

          {/* Voice Note Button (Hold or Click) */}
          {inputText.trim() === '' ? (
            <button
              type="button"
              onClick={isRecordingAudio ? stopAudioRecording : startAudioRecording}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center text-sm active:scale-95 transition-all ${
                isRecordingAudio
                  ? 'bg-red-600 text-white animate-pulse border-red-500'
                  : 'bg-ad-bg border-ad-burgundy/40 text-ad-text'
              }`}
              title="Voice Note"
            >
              🎙️
            </button>
          ) : (
            /* Send Button */
            <button
              type="button"
              onClick={handleSendText}
              className="w-9 h-9 rounded-xl bg-ad-gold text-ad-bg font-bold flex items-center justify-center shadow-md shadow-ad-gold/30 hover:bg-yellow-400 active:scale-95 transition-all"
            >
              ➔
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* DEDICATED IN-CHAT CAMERA & VIDEO RECORDING MODAL */}
      {/* ========================================================= */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-4">
          {/* Camera Header */}
          <div className="flex items-center justify-between z-10 pt-2">
            <button
              onClick={() => {
                stopCameraStream();
                setIsCameraOpen(false);
              }}
              className="text-white text-lg p-2"
            >
              ✕ Close
            </button>

            {/* Mode Switcher */}
            <div className="flex bg-black/60 rounded-full p-1 border border-white/20">
              <button
                onClick={() => startCamera('photo')}
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  cameraMode === 'photo' ? 'bg-ad-red text-white' : 'text-gray-400'
                }`}
              >
                PHOTO
              </button>
              <button
                onClick={() => startCamera('video')}
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  cameraMode === 'video' ? 'bg-ad-red text-white' : 'text-gray-400'
                }`}
              >
                VIDEO
              </button>
            </div>

            {/* Front / Rear Toggle */}
            <button
              onClick={toggleCameraFacing}
              className="text-white text-xl p-2 bg-white/10 rounded-full"
              title="Switch Camera"
            >
              🔄
            </button>
          </div>

          {/* Live Viewfinder / Preview Review */}
          <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden rounded-2xl bg-black border border-ad-burgundy/40">
            {capturedPreviewUrl ? (
              cameraMode === 'video' ? (
                <video
                  src={capturedPreviewUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={capturedPreviewUrl}
                  alt="Captured review"
                  className="w-full h-full object-contain"
                />
              )
            ) : (
              <video
                ref={videoElementRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}

            {/* Video Recording Timer Badge */}
            {isRecordingVideo && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-red-600 text-white rounded-full text-xs font-mono font-bold animate-pulse">
                REC 00:{videoTimer < 10 ? `0${videoTimer}` : videoTimer}
              </div>
            )}
          </div>

          {/* Camera Footer Controls */}
          <div className="z-10 pb-6 space-y-4">
            {/* If Captured: Show Review Actions & Expiry Selector */}
            {capturedPreviewUrl ? (
              <div className="space-y-3">
                {/* Disappearing Media Expiry Selector */}
                <div className="flex items-center justify-center gap-1.5 text-[11px] bg-ad-bg-secondary/90 p-2 rounded-xl border border-ad-burgundy/40">
                  <span className="text-ad-gold font-medium">Timer:</span>
                  {(['view-once', '5s', '10s', '30s', 'keep'] as MediaExpiry[]).map((exp) => (
                    <button
                      key={exp}
                      onClick={() => setSelectedExpiry(exp)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono ${
                        selectedExpiry === exp ? 'bg-ad-red text-white font-bold' : 'text-ad-text-secondary'
                      }`}
                    >
                      {exp}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    className="flex-1 text-red-300 border border-white/20"
                    onClick={() => startCamera(cameraMode)}
                  >
                    ↺ Retake
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1 shadow-xl shadow-ad-red/50"
                    onClick={sendCapturedMedia}
                  >
                    Send to Partner ➔
                  </Button>
                </div>
              </div>
            ) : (
              /* Shutter Trigger Buttons */
              <div className="flex items-center justify-center">
                {cameraMode === 'photo' ? (
                  <button
                    onClick={takePhoto}
                    className="w-18 h-18 rounded-full border-4 border-white bg-ad-red/90 flex items-center justify-center shadow-2xl active:scale-90 transition-transform p-1"
                  >
                    <div className="w-14 h-14 rounded-full bg-white" />
                  </button>
                ) : (
                  <button
                    onClick={isRecordingVideo ? stopVideoRecording : startVideoRecording}
                    className={`w-18 h-18 rounded-full border-4 border-white flex items-center justify-center shadow-2xl active:scale-90 transition-transform p-1 ${
                      isRecordingVideo ? 'bg-red-600 animate-pulse' : 'bg-ad-red/90'
                    }`}
                  >
                    <div
                      className={`transition-all ${
                        isRecordingVideo ? 'w-6 h-6 rounded-md bg-white' : 'w-14 h-14 rounded-full bg-red-500'
                      }`}
                    />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attachment Action Sheet Modal */}
      <Modal
        isOpen={showAttachMenu}
        onClose={() => setShowAttachMenu(false)}
        title="Share in Room"
      >
        <div className="grid grid-cols-3 gap-3 text-center py-2">
          <button
            onClick={() => {
              setShowAttachMenu(false);
              startCamera('photo');
            }}
            className="p-3 rounded-xl bg-ad-bg-secondary border border-ad-burgundy/40 space-y-1 hover:border-ad-gold"
          >
            <div className="text-2xl">📷</div>
            <div className="text-[11px] text-ad-text">Camera</div>
          </button>

          <button
            onClick={() => {
              setShowAttachMenu(false);
              void openNativeGallery();
            }}
            className="p-3 rounded-xl bg-ad-bg-secondary border border-ad-burgundy/40 space-y-1 hover:border-ad-gold"
          >
            <div className="text-2xl">🖼️</div>
            <div className="text-[11px] text-ad-text">Gallery</div>
          </button>

          <button
            onClick={() => {
              setShowAttachMenu(false);
              startCamera('video');
            }}
            className="p-3 rounded-xl bg-ad-bg-secondary border border-ad-burgundy/40 space-y-1 hover:border-ad-gold"
          >
            <div className="text-2xl">🎥</div>
            <div className="text-[11px] text-ad-text">Video</div>
          </button>

          <button
            onClick={() => {
              setShowAttachMenu(false);
              startAudioRecording();
            }}
            className="p-3 rounded-xl bg-ad-bg-secondary border border-ad-burgundy/40 space-y-1 hover:border-ad-gold"
          >
            <div className="text-2xl">🎙️</div>
            <div className="text-[11px] text-ad-text">Voice Note</div>
          </button>

          <button
            onClick={() => {
              setShowAttachMenu(false);
              navigate('/games');
            }}
            className="p-3 rounded-xl bg-ad-bg-secondary border border-ad-burgundy/40 space-y-1 hover:border-ad-gold"
          >
            <div className="text-2xl">🎮</div>
            <div className="text-[11px] text-ad-text">Game Invite</div>
          </button>

          <button
            onClick={() => {
              setShowAttachMenu(false);
              navigate('/trophies');
            }}
            className="p-3 rounded-xl bg-ad-bg-secondary border border-ad-burgundy/40 space-y-1 hover:border-ad-gold"
          >
            <div className="text-2xl">🏆</div>
            <div className="text-[11px] text-ad-text">Trophies</div>
          </button>
        </div>
      </Modal>

      {/* Media Viewer Modal */}
      {viewingMediaUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4"
          onClick={() => setViewingMediaUrl(null)}
        >
          <div className="flex justify-end pt-2">
            <button
              onClick={() => setViewingMediaUrl(null)}
              className="text-white text-xl p-2"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center">
            {viewingMediaMime.includes('video') ? (
              <video src={viewingMediaUrl} controls autoPlay className="max-h-[80vh] max-w-full" />
            ) : (
              <img src={viewingMediaUrl} alt="Vault view" className="max-h-[80vh] max-w-full object-contain" />
            )}
          </div>

          <div className="text-center text-[11px] text-ad-text-secondary pb-4">
            Private in-app copy · Never saved to external gallery without consent
          </div>
        </div>
      )}
    </div>
  );
};
