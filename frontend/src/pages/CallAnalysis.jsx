/**
 * Call Analysis Page
 * Upload audio files for AI transcription and sentiment analysis
 */

import { useState, useEffect, useRef } from 'react';
import { callsAPI } from '../services/api';
import { motion } from 'framer-motion';
import { Upload, Phone, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';

const CallAnalysis = () => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [confirmingCallId, setConfirmingCallId] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    fetchCalls();
  }, []);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      const response = await callsAPI.getAll();
      if (response.success) {
        setCalls(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch calls:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file type
      if (!file.type.startsWith('audio/')) {
        setUploadStatus({ type: 'error', message: 'Please select an audio file' });
        return;
      }
      setSelectedFile(file);
      setUploadStatus(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus({ type: 'error', message: 'Please select a file first' });
      return;
    }

    try {
      setUploading(true);
      setUploadStatus({ type: 'info', message: 'Uploading and analyzing...' });

      const formData = new FormData();
      formData.append('audio', selectedFile);

      const response = await callsAPI.upload(formData);

      if (response.success) {
        setUploadStatus({ type: 'success', message: 'Call analyzed successfully!' });
        setSelectedFile(null);
        fetchCalls();
      }
    } catch (error) {
      setUploadStatus({ type: 'error', message: error.message || 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirmingCallId !== id) {
      setConfirmingCallId(id);
      return;
    }
    setConfirmingCallId(null);
    try {
      await callsAPI.delete(id);
      setCalls(prev => prev.filter(c => c._id !== id));
    } catch (error) {
      console.error('Failed to delete call:', error);
      setUploadStatus({ type: 'error', message: 'Delete failed: ' + (error.message || 'Unknown error') });
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Automatically upload and analyze
        await uploadRecording(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      setUploadStatus({ type: 'info', message: 'Recording started...' });
    } catch (error) {
      console.error('Failed to start recording:', error);
      setUploadStatus({ type: 'error', message: 'Microphone access denied' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const uploadRecording = async (blob) => {
    try {
      setUploading(true);
      setUploadStatus({ type: 'info', message: 'Analyzing recording...' });

      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');

      const response = await callsAPI.upload(formData);

      if (response.success) {
        setUploadStatus({ type: 'success', message: 'Call analyzed successfully!' });
        setAudioBlob(null);
        setRecordingTime(0);
        fetchCalls();
      }
    } catch (error) {
      setUploadStatus({ type: 'error', message: error.message || 'Analysis failed' });
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return 'text-green-400 bg-green-400/20 border-green-400/30';
      case 'negative':
        return 'text-red-400 bg-red-400/20 border-red-400/30';
      default:
        return 'text-yellow-400 bg-yellow-400/20 border-yellow-400/30';
    }
  };

  return (
    <div className="min-h-screen bg-food7-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-heading font-bold text-food7-white mb-2">
            AI Call Analysis
          </h1>
          <p className="text-food7-white/60">
            Upload customer call recordings for AI-powered transcription and sentiment analysis
          </p>
        </motion.div>

        {/* Recording & Upload Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 mb-8"
        >
          <div className="flex items-center gap-2 mb-6">
            <Upload className="w-6 h-6 text-food7-gold" />
            <h2 className="text-2xl font-heading font-semibold text-food7-white">
              Record or Upload Call
            </h2>
          </div>

          <div className="space-y-6">
            {/* Live Recording Controls */}
            <div className="border-2 border-dashed border-food7-gold/30 rounded-lg p-8 text-center">
              <Phone className="w-12 h-12 text-food7-gold mx-auto mb-4" />
              
              {!isRecording ? (
                <>
                  <p className="text-food7-white font-medium mb-4">
                    Record a live call conversation
                  </p>
                  <Button
                    onClick={startRecording}
                    disabled={uploading}
                    className="mx-auto"
                  >
                    Start Recording
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <p className="text-food7-white font-medium text-xl">
                      Recording: {formatTime(recordingTime)}
                    </p>
                  </div>
                  <Button
                    onClick={stopRecording}
                    variant="secondary"
                    className="mx-auto"
                  >
                    Stop & Analyze
                  </Button>
                </>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 border-t border-white/20"></div>
              <span className="text-food7-white/60 text-sm">OR</span>
              <div className="flex-1 border-t border-white/20"></div>
            </div>

            {/* File Upload */}
            <div className="border-2 border-dashed border-food7-red/30 rounded-lg p-8 text-center hover:border-food7-red/50 transition-colors">
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                className="hidden"
                id="audio-upload"
                disabled={isRecording}
              />
              <label htmlFor="audio-upload" className={isRecording ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}>
                <Upload className="w-12 h-12 text-food7-red mx-auto mb-4" />
                <p className="text-food7-white font-medium mb-2">
                  {selectedFile ? selectedFile.name : 'Upload audio file'}
                </p>
                <p className="text-food7-white/60 text-sm">
                  Supported formats: MP3, WAV, M4A, OGG
                </p>
              </label>
            </div>

            {uploadStatus && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg border ${
                  uploadStatus.type === 'success'
                    ? 'bg-green-500/20 border-green-500 text-green-200'
                    : uploadStatus.type === 'error'
                    ? 'bg-red-500/20 border-red-500 text-red-200'
                    : 'bg-blue-500/20 border-blue-500 text-blue-200'
                }`}
              >
                {uploadStatus.message}
              </motion.div>
            )}

            {selectedFile && !isRecording && (
              <Button
                onClick={handleUpload}
                disabled={uploading}
                loading={uploading}
                className="w-full"
              >
                {uploading ? 'Analyzing...' : 'Upload & Analyze'}
              </Button>
            )}
          </div>
        </motion.div>

        {/* Calls List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-2xl font-heading font-semibold text-food7-white mb-4">
            Recent Calls
          </h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : calls.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Phone className="w-16 h-16 text-food7-white/20 mx-auto mb-4" />
              <p className="text-food7-white/60">No calls uploaded yet</p>
              <p className="text-food7-white/40 text-sm mt-2">
                Upload your first call recording to get started
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {calls.map((call, index) => (
                <motion.div
                  key={call._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-card-hover p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Phone className="w-5 h-5 text-food7-gold" />
                        <span className="text-food7-white/60 text-sm">
                          {new Date(call.createdAt).toLocaleString()}
                        </span>
                        {call.isComplaint && (
                          <span className="px-2 py-1 bg-red-500/20 border border-red-500 text-red-400 text-xs rounded">
                            COMPLAINT
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-food7-white/60 text-sm">Sentiment:</span>
                        <span className={`px-3 py-1 rounded-lg border text-sm font-medium ${getSentimentColor(call.sentiment)}`}>
                          {call.sentiment || 'Unknown'}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {confirmingCallId === call._id ? (
                        <>
                          <button
                            onClick={() => handleDelete(call._id)}
                            style={{
                              padding: '6px 12px', borderRadius: 8,
                              border: '1px solid rgba(239,68,68,0.5)',
                              background: 'rgba(239,68,68,0.2)',
                              color: '#F87171', cursor: 'pointer',
                              fontSize: '0.78rem', fontWeight: 700,
                            }}
                          >
                            Confirm Delete
                          </button>
                          <button
                            onClick={() => setConfirmingCallId(null)}
                            style={{
                              padding: '6px 10px', borderRadius: 8,
                              border: '1px solid rgba(255,255,255,0.1)',
                              background: 'rgba(255,255,255,0.04)',
                              color: '#7A7570', cursor: 'pointer',
                              fontSize: '0.78rem',
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleDelete(call._id)}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {call.transcript && (
                    <div className="mb-4">
                      <p className="text-food7-white/60 text-sm mb-2">Transcript:</p>
                      <p className="text-food7-white bg-white/5 p-4 rounded-lg">
                        {call.transcript}
                      </p>
                    </div>
                  )}

                  {call.isComplaint && call.suggestedAction && (
                    <div className="bg-food7-gold/10 border border-food7-gold/30 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-food7-gold mt-0.5" />
                        <div>
                          <p className="text-food7-gold font-medium text-sm mb-1">
                            Suggested Action:
                          </p>
                          <p className="text-food7-white/80 text-sm">
                            {call.suggestedAction}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default CallAnalysis;
