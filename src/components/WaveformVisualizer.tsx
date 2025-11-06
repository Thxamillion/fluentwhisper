/**
 * Real-time audio waveform visualizer
 * Minimal Apple-like design inspired by iOS Voice Memos
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface WaveformVisualizerProps {
  /** Audio stream to visualize */
  stream: MediaStream | null;
  /** Whether recording is active */
  isActive: boolean;
  /** Number of bars to display */
  barCount?: number;
  /** Color of the bars */
  color?: string;
  /** Height of the container in pixels */
  height?: number;
  /** Width of the container (defaults to 100%) */
  width?: string;
}

export function WaveformVisualizer({
  stream,
  isActive,
  barCount = 40,
  color = 'rgb(59, 130, 246)', // blue-500
  height = 64,
  width = '100%',
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const [bloomProgress, setBloomProgress] = useState(0);

  // Bloom animation on mount
  useEffect(() => {
    if (!isActive) {
      setBloomProgress(0);
      return;
    }

    const startTime = Date.now();
    const duration = 600; // 600ms bloom animation

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      setBloomProgress(eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isActive]);

  // Start animation loop when active
  useEffect(() => {
    if (!isActive) {
      // Clean up when not active
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }
      analyserRef.current = null;
      dataArrayRef.current = null;

      // Clear canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      return;
    }

    // Start animation loop immediately (placeholder or real audio)
    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
      }
    };
  }, [isActive]);

  // Initialize audio analysis when stream is available
  useEffect(() => {
    if (!stream || !isActive) {
      return;
    }

    // Set up Web Audio API
    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      // Configure analyser for smooth visualization
      analyser.fftSize = 256; // Small FFT for responsiveness
      analyser.smoothingTimeConstant = 0.8; // Smooth out changes

      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(new ArrayBuffer(bufferLength));

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;
    } catch (error) {
      console.error('Failed to initialize audio analyzer:', error);
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }
    };
  }, [stream, isActive]);

  // Draw waveform
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    const hasRealAudio = analyser && dataArray;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate bar dimensions
    const barWidth = canvas.width / barCount;
    const barGap = barWidth * 0.3; // 30% gap between bars
    const actualBarWidth = barWidth - barGap;

    // Get current time for placeholder animation
    const time = Date.now() / 1000;

    // Get frequency data once per frame if available
    if (hasRealAudio) {
      analyser.getByteFrequencyData(dataArray);
    }

    // Draw bars with bloom animation
    for (let i = 0; i < barCount; i++) {
      let value: number;

      if (hasRealAudio) {
        // Real audio data
        const dataIndex = Math.floor((i / barCount) * dataArray.length);
        value = dataArray[dataIndex];
      } else {
        // Placeholder: gentle wave animation
        const waveOffset = (i / barCount) * Math.PI * 2;
        const wave1 = Math.sin(time * 2 + waveOffset) * 0.3;
        const wave2 = Math.sin(time * 1.5 + waveOffset * 0.5) * 0.2;
        value = ((wave1 + wave2 + 0.5) / 2) * 255; // Normalize to 0-255
      }

      // Calculate bar height (normalize to canvas height)
      // Add minimum height for visual appeal
      const minHeight = 2;
      const maxHeight = canvas.height * 0.9;
      const barHeight = Math.max(minHeight, (value / 255) * maxHeight);

      // Bloom animation: bars appear from center outward
      const centerIndex = barCount / 2;
      const distanceFromCenter = Math.abs(i - centerIndex) / centerIndex;
      const bloomDelay = distanceFromCenter * 0.5; // Stagger based on distance
      const barBloomProgress = Math.max(0, Math.min(1, (bloomProgress - bloomDelay) / (1 - bloomDelay)));

      // Apply bloom scale and opacity
      const bloomScale = barBloomProgress;
      const bloomOpacity = barBloomProgress;

      // Center bars vertically
      const x = i * barWidth + barGap / 2;
      const scaledBarHeight = barHeight * bloomScale;
      const y = (canvas.height - scaledBarHeight) / 2;

      // Draw rounded rectangle with bloom opacity
      ctx.globalAlpha = bloomOpacity * (hasRealAudio ? 1 : 0.6); // Slightly dimmed for placeholder
      ctx.fillStyle = color;
      ctx.beginPath();
      const radius = actualBarWidth / 2; // Fully rounded ends
      ctx.roundRect(x, y, actualBarWidth, scaledBarHeight, radius);
      ctx.fill();
      ctx.globalAlpha = 1; // Reset alpha
    }

    // Continue animation
    animationFrameRef.current = requestAnimationFrame(draw);
  };

  return (
    <motion.div
      style={{ width, height }}
      initial={{ opacity: 0, y: -20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.8 }}
      transition={{
        duration: 0.4,
        ease: [0.32, 0.72, 0, 1], // Custom easing for Apple-like feel
      }}
    >
      <canvas
        ref={canvasRef}
        width={800} // High resolution for crisp rendering
        height={height * 2} // 2x for retina displays
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
    </motion.div>
  );
}
