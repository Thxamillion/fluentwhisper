use super::wav_writer::WavWriter;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Device, SampleFormat, Stream};
use serde::Serialize;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

/// Simple result type using String for errors
pub type Result<T> = std::result::Result<T, String>;

/// Audio recording metadata - returned to frontend
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordingResult {
    pub file_path: String,
    pub sample_rate: u32,
    pub channels: u16,
    pub duration_seconds: f32,
}

/// Device information for frontend
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceInfo {
    pub name: String,
    pub is_default: bool,
}

/// Simplified recorder state
pub struct RecorderState {
    stream: Option<Stream>,
    writer: Option<Arc<Mutex<WavWriter>>>,
    is_recording: Arc<AtomicBool>,
    file_path: Option<PathBuf>,
    sample_rate: u32,
    channels: u16,
}

impl RecorderState {
    pub fn new() -> Self {
        Self {
            stream: None,
            writer: None,
            is_recording: Arc::new(AtomicBool::new(false)),
            file_path: None,
            sample_rate: 0,
            channels: 0,
        }
    }

    /// List available recording devices
    pub fn enumerate_devices(&self) -> Result<Vec<DeviceInfo>> {
        let host = cpal::default_host();
        let default_device = host
            .default_input_device()
            .and_then(|d| d.name().ok());

        let devices = host
            .input_devices()
            .map_err(|e| format!("Failed to get input devices: {}", e))?
            .filter_map(|device| {
                device.name().ok().map(|name| {
                    let is_default = default_device.as_ref() == Some(&name);
                    DeviceInfo { name, is_default }
                })
            })
            .collect();

        Ok(devices)
    }

    /// Start recording audio
    pub fn start_recording(
        &mut self,
        device_name: Option<String>,
        output_path: PathBuf,
    ) -> Result<()> {
        // Ensure we're not already recording
        if self.is_recording.load(Ordering::Relaxed) {
            return Err("Recording already in progress".to_string());
        }

        // Find the device
        let host = cpal::default_host();
        let device = if let Some(name) = device_name {
            find_device(&host, &name)?
        } else {
            host.default_input_device()
                .ok_or("No default input device available")?
        };

        // Get optimal config for voice recording
        let config = get_optimal_config(&device)?;
        let sample_format = config.sample_format();
        let sample_rate = config.sample_rate().0;
        let channels = config.channels();

        // Create WAV writer
        let writer = WavWriter::new(output_path.clone(), sample_rate, channels)
            .map_err(|e| format!("Failed to create WAV file: {}", e))?;
        let writer = Arc::new(Mutex::new(writer));

        // Store recording metadata
        self.file_path = Some(output_path);
        self.sample_rate = sample_rate;
        self.channels = channels;
        self.is_recording.store(true, Ordering::Relaxed);

        // Create stream config
        let stream_config = cpal::StreamConfig {
            channels,
            sample_rate: cpal::SampleRate(sample_rate),
            buffer_size: cpal::BufferSize::Default,
        };

        // Clone for move into closure
        let writer_clone = writer.clone();
        let is_recording = self.is_recording.clone();

        // Create the audio stream based on sample format
        let stream = match sample_format {
            SampleFormat::F32 => device.build_input_stream(
                &stream_config,
                move |data: &[f32], _: &cpal::InputCallbackInfo| {
                    if is_recording.load(Ordering::Relaxed) {
                        if let Ok(mut w) = writer_clone.lock() {
                            let _ = w.write_samples(data);
                        }
                    }
                },
                |err| eprintln!("Stream error: {}", err),
                None,
            ),
            SampleFormat::I16 => device.build_input_stream(
                &stream_config,
                move |data: &[i16], _: &cpal::InputCallbackInfo| {
                    if is_recording.load(Ordering::Relaxed) {
                        // Convert i16 to f32
                        let samples: Vec<f32> =
                            data.iter().map(|&s| s as f32 / 32768.0).collect();
                        if let Ok(mut w) = writer_clone.lock() {
                            let _ = w.write_samples(&samples);
                        }
                    }
                },
                |err| eprintln!("Stream error: {}", err),
                None,
            ),
            SampleFormat::U16 => device.build_input_stream(
                &stream_config,
                move |data: &[u16], _: &cpal::InputCallbackInfo| {
                    if is_recording.load(Ordering::Relaxed) {
                        // Convert u16 to f32
                        let samples: Vec<f32> = data
                            .iter()
                            .map(|&s| (s as f32 - 32768.0) / 32768.0)
                            .collect();
                        if let Ok(mut w) = writer_clone.lock() {
                            let _ = w.write_samples(&samples);
                        }
                    }
                },
                |err| eprintln!("Stream error: {}", err),
                None,
            ),
            _ => {
                return Err(format!(
                    "Unsupported sample format: {:?}",
                    sample_format
                ))
            }
        }
        .map_err(|e| format!("Failed to build input stream: {}", e))?;

        // Start the stream
        stream
            .play()
            .map_err(|e| format!("Failed to start stream: {}", e))?;

        self.stream = Some(stream);
        self.writer = Some(writer);

        Ok(())
    }

    /// Stop recording and return metadata
    pub fn stop_recording(&mut self) -> Result<RecordingResult> {
        // Ensure we're actually recording
        if !self.is_recording.load(Ordering::Relaxed) {
            return Err("No recording in progress".to_string());
        }

        // Stop recording flag first
        self.is_recording.store(false, Ordering::Relaxed);

        // Stop and drop the stream
        if let Some(stream) = self.stream.take() {
            drop(stream);
        }

        // Get metadata and finalize the WAV file
        let (duration, file_path) = if let Some(writer_arc) = self.writer.take() {
            let duration = {
                let w = writer_arc.lock().unwrap();
                w.duration_seconds()
            };

            let file_path = self
                .file_path
                .take()
                .ok_or("No file path recorded")?
                .to_string_lossy()
                .to_string();

            // WAV file will be finalized automatically when writer is dropped
            drop(writer_arc);

            (duration, file_path)
        } else {
            return Err("No writer available".to_string());
        };

        Ok(RecordingResult {
            file_path,
            sample_rate: self.sample_rate,
            channels: self.channels,
            duration_seconds: duration,
        })
    }

    /// Check if currently recording
    pub fn is_recording(&self) -> bool {
        self.is_recording.load(Ordering::Relaxed)
    }
}

/// Find a device by name
fn find_device(host: &cpal::Host, name: &str) -> Result<Device> {
    host.input_devices()
        .map_err(|e| format!("Failed to enumerate devices: {}", e))?
        .find(|d| d.name().ok().as_deref() == Some(name))
        .ok_or_else(|| format!("Device '{}' not found", name))
}

/// Get optimal config for voice recording (prefer 16kHz mono, fallback to 48kHz)
fn get_optimal_config(device: &Device) -> Result<cpal::SupportedStreamConfig> {
    let supported_configs = device
        .supported_input_configs()
        .map_err(|e| format!("Failed to get supported configs: {}", e))?;

    // Try to find 16kHz mono config (ideal for voice/Whisper)
    for config in supported_configs {
        if config.channels() == 1 {
            let sample_rate = config.min_sample_rate().0;
            if sample_rate == 16000 {
                return Ok(config.with_sample_rate(cpal::SampleRate(16000)));
            }
        }
    }

    // Fallback to default config
    device
        .default_input_config()
        .map_err(|e| format!("Failed to get default config: {}", e))
}
