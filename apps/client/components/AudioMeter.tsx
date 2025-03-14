'use client';
import { useEffect, useRef } from 'react';

interface AudioMeterProps {
  stream: MediaStream | null;
}

export default function AudioMeter({ stream }: AudioMeterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!stream || !canvasRef.current || stream.getAudioTracks().length === 0) {
      return;
    }
    
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);
    analyser.fftSize = 256;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    
    function draw() {
      if (!canvasCtx) return;
      requestAnimationFrame(draw);
      
      analyser.getByteFrequencyData(dataArray);
      let average = dataArray.reduce((a, b) => a + b) / bufferLength;
      
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      canvasCtx.fillStyle = average > 30 ? '#4ade80' : '#6b7280';
      
      const height = (average / 255) * canvas.height;
      canvasCtx.fillRect(0, canvas.height - height, canvas.width, height);
    }
    
    draw();
    
    return () => {
      microphone.disconnect();
      audioContext.close();
    };
  }, [stream]);

  return (
    <div className="relative mt-2 mx-auto">
      <div className="text-xs text-gray-400 mb-1 text-center">Mic Level</div>
      <canvas ref={canvasRef} width={30} height={60} className="bg-gray-900 rounded" />
    </div>
  );
} 