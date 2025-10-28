use hound::{WavSpec, WavWriter as HoundWriter};
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};

/// Thread-safe WAV file writer for real-time audio recording
pub struct WavWriter {
    writer: HoundWriter<std::io::BufWriter<std::fs::File>>,
    samples_written: AtomicU64,
    sample_rate: u32,
    channels: u16,
}

impl WavWriter {
    /// Create a new WAV file writer
    pub fn new(path: PathBuf, sample_rate: u32, channels: u16) -> Result<Self, String> {
        let spec = WavSpec {
            channels,
            sample_rate,
            bits_per_sample: 16,
            sample_format: hound::SampleFormat::Int,
        };

        let writer = HoundWriter::create(path, spec)
            .map_err(|e| format!("Failed to create WAV file: {}", e))?;

        Ok(Self {
            writer,
            samples_written: AtomicU64::new(0),
            sample_rate,
            channels,
        })
    }

    /// Write f32 audio samples to the WAV file
    pub fn write_samples(&mut self, samples: &[f32]) -> Result<(), String> {
        for &sample in samples {
            // Convert f32 [-1.0, 1.0] to i16 [-32768, 32767]
            let sample_i16 = (sample.clamp(-1.0, 1.0) * 32767.0) as i16;
            self.writer
                .write_sample(sample_i16)
                .map_err(|e| format!("Failed to write sample: {}", e))?;
        }

        self.samples_written
            .fetch_add(samples.len() as u64, Ordering::Relaxed);

        Ok(())
    }

    /// Get the total number of samples written
    pub fn samples_written(&self) -> u64 {
        self.samples_written.load(Ordering::Relaxed)
    }

    /// Get the duration in seconds
    pub fn duration_seconds(&self) -> f32 {
        let total_samples = self.samples_written();
        let frames = total_samples / self.channels as u64;
        frames as f32 / self.sample_rate as f32
    }

}
