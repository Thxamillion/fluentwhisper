use super::error::TranscriptionError;
use hound::WavReader;
use rubato::{Resampler, SincFixedIn, SincInterpolationParameters, SincInterpolationType, WindowFunction};
use serde::{Deserialize, Serialize};
use std::io::Cursor;
use std::path::Path;
use whisper_rs::{WhisperContext, WhisperContextParameters, FullParams, SamplingStrategy};

/// A segment of transcribed text with timing information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptSegment {
    pub text: String,
    pub start_time: f32,  // seconds
    pub end_time: f32,    // seconds
}

/// Transcription result with full text and timed segments
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptionWithSegments {
    pub text: String,
    pub segments: Vec<TranscriptSegment>,
}

/// Transcribe an audio file to text using Whisper
///
/// Loads the Whisper model from disk and transcribes the audio file.
/// The audio file should be in WAV format (16kHz, mono, 16-bit PCM is optimal).
/// Returns both the full text and timed segments.
pub async fn transcribe_audio_file(
    audio_path: &Path,
    model_path: &Path,
    language: Option<&str>,
) -> Result<TranscriptionWithSegments, TranscriptionError> {
    // Run the CPU-intensive transcription in a blocking task
    let audio_path = audio_path.to_path_buf();
    let model_path = model_path.to_path_buf();
    let language = language.map(|s| s.to_string());

    tokio::task::spawn_blocking(move || {
        transcribe_blocking(&audio_path, &model_path, language.as_deref())
    })
    .await
    .map_err(|e| TranscriptionError::TranscriptionFailed {
        message: format!("Task join error: {}", e),
    })?
}

/// Blocking implementation of transcription
fn transcribe_blocking(
    audio_path: &Path,
    model_path: &Path,
    language: Option<&str>,
) -> Result<TranscriptionWithSegments, TranscriptionError> {
    // Create Whisper context
    let ctx = WhisperContext::new_with_params(
        model_path.to_str().ok_or_else(|| TranscriptionError::ModelError {
            message: "Invalid model path".to_string(),
        })?,
        WhisperContextParameters::default(),
    )
    .map_err(|e| TranscriptionError::ModelError {
        message: format!("Failed to load Whisper model: {}", e),
    })?;

    // Read and prepare audio file
    let audio_data = std::fs::read(audio_path)?;

    // Convert to Whisper-compatible format if needed
    let whisper_audio = convert_to_whisper_format(&audio_data)?;

    // Read the converted audio as f32 samples
    let samples = read_audio_samples(&whisper_audio)?;

    // Create a state for this transcription
    let mut state = ctx.create_state().map_err(|e| TranscriptionError::ModelError {
        message: format!("Failed to create Whisper state: {}", e),
    })?;

    // Set up transcription parameters
    let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });

    // Set language if provided
    if let Some(lang) = language {
        params.set_language(Some(lang));
    }

    // Enable translation to English if needed
    params.set_translate(false);
    params.set_print_special(false);
    params.set_print_progress(false);
    params.set_print_realtime(false);
    params.set_print_timestamps(false);

    // Run transcription
    state
        .full(params, &samples)
        .map_err(|e| TranscriptionError::TranscriptionFailed {
            message: format!("Transcription failed: {}", e),
        })?;

    // Extract segments with timestamps
    let num_segments = state.full_n_segments();

    let mut segments = Vec::new();
    let mut full_text = String::new();

    for i in 0..num_segments {
        if let Some(segment) = state.get_segment(i) {
            // Get segment text
            let segment_text = format!("{}", segment);

            // Get timestamps - whisper_rs provides start/end time in the segment
            // Timestamps are in centiseconds (1/100th of a second)
            let start_time = segment.start_timestamp() as f32 / 100.0;
            let end_time = segment.end_timestamp() as f32 / 100.0;

            // Add to segments list
            segments.push(TranscriptSegment {
                text: segment_text.trim().to_string(),
                start_time,
                end_time,
            });

            // Build full text
            full_text.push_str(segment_text.trim());
            full_text.push(' ');
        }
    }

    Ok(TranscriptionWithSegments {
        text: full_text.trim().to_string(),
        segments,
    })
}

/// Read audio samples as f32 from WAV data
fn read_audio_samples(wav_data: &[u8]) -> Result<Vec<f32>, TranscriptionError> {
    let cursor = Cursor::new(wav_data);
    let mut reader = WavReader::new(cursor).map_err(|e| TranscriptionError::AudioReadError {
        message: format!("Failed to parse WAV file: {}", e),
    })?;

    let spec = reader.spec();

    // Read samples based on format
    let samples: Vec<f32> = match spec.sample_format {
        hound::SampleFormat::Int => {
            if spec.bits_per_sample == 16 {
                reader
                    .samples::<i16>()
                    .map(|s| s.map(|sample| sample as f32 / 32768.0))
                    .collect::<Result<Vec<_>, _>>()
                    .map_err(|e| TranscriptionError::AudioReadError {
                        message: format!("Failed to read samples: {}", e),
                    })?
            } else {
                return Err(TranscriptionError::AudioReadError {
                    message: format!("Unsupported bit depth: {}", spec.bits_per_sample),
                });
            }
        }
        hound::SampleFormat::Float => {
            reader
                .samples::<f32>()
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| TranscriptionError::AudioReadError {
                    message: format!("Failed to read samples: {}", e),
                })?
        }
    };

    Ok(samples)
}

/// Convert audio to Whisper-compatible format (16kHz, mono, 16-bit PCM WAV)
fn convert_to_whisper_format(audio_data: &[u8]) -> Result<Vec<u8>, TranscriptionError> {
    // Parse the WAV file
    let cursor = Cursor::new(audio_data);
    let mut reader = WavReader::new(cursor).map_err(|e| TranscriptionError::AudioReadError {
        message: format!("Failed to parse WAV file: {}", e),
    })?;

    let spec = reader.spec();
    let sample_rate = spec.sample_rate;
    let channels = spec.channels as usize;

    // Check if already in correct format
    if spec.sample_format == hound::SampleFormat::Int
        && spec.channels == 1
        && spec.sample_rate == 16000
        && spec.bits_per_sample == 16
    {
        // Already in correct format, return as-is
        return Ok(audio_data.to_vec());
    }

    // Step 1: Read all samples and convert to f32
    let samples_f32: Vec<f32> = match spec.sample_format {
        hound::SampleFormat::Int => match spec.bits_per_sample {
            16 => reader
                .samples::<i16>()
                .map(|s| s.map(|sample| sample as f32 / 32768.0))
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| TranscriptionError::AudioReadError {
                    message: format!("Failed to read samples: {}", e),
                })?,
            32 => reader
                .samples::<i32>()
                .map(|s| s.map(|sample| sample as f32 / 2147483648.0))
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| TranscriptionError::AudioReadError {
                    message: format!("Failed to read samples: {}", e),
                })?,
            _ => {
                return Err(TranscriptionError::AudioReadError {
                    message: format!("Unsupported bit depth: {}", spec.bits_per_sample),
                })
            }
        },
        hound::SampleFormat::Float => reader
            .samples::<f32>()
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| TranscriptionError::AudioReadError {
                message: format!("Failed to read samples: {}", e),
            })?,
    };

    // Step 2: Convert to mono if needed
    let mono_samples: Vec<f32> = if channels == 1 {
        samples_f32
    } else if channels == 2 {
        // Stereo to mono: average channels
        samples_f32
            .chunks_exact(2)
            .map(|chunk| (chunk[0] + chunk[1]) / 2.0)
            .collect()
    } else {
        // Multi-channel to mono: average all channels
        samples_f32
            .chunks_exact(channels)
            .map(|chunk| chunk.iter().sum::<f32>() / channels as f32)
            .collect()
    };

    // Step 3: Resample to 16kHz if needed
    let resampled: Vec<f32> = if sample_rate != 16000 {
        let resample_ratio = 16000.0 / sample_rate as f64;
        let chunk_size = 1024;

        let params = SincInterpolationParameters {
            sinc_len: 64,
            f_cutoff: 0.95,
            interpolation: SincInterpolationType::Linear,
            oversampling_factor: 128,
            window: WindowFunction::BlackmanHarris2,
        };

        let mut resampler = SincFixedIn::<f32>::new(
            resample_ratio,
            8.0,
            params,
            chunk_size,
            1, // mono
        )
        .map_err(|e| TranscriptionError::AudioConversionError {
            message: format!("Failed to create resampler: {}", e),
        })?;

        let mut output_samples = Vec::new();
        let mut input_pos = 0;

        while input_pos < mono_samples.len() {
            let end_pos = (input_pos + chunk_size).min(mono_samples.len());
            let mut chunk: Vec<f32> = mono_samples[input_pos..end_pos].to_vec();

            if chunk.len() < chunk_size {
                chunk.resize(chunk_size, 0.0);
            }

            let waves_in = vec![chunk];
            let waves_out = resampler.process(&waves_in, None).map_err(|e| {
                TranscriptionError::AudioConversionError {
                    message: format!("Resampling failed: {}", e),
                }
            })?;

            output_samples.extend_from_slice(&waves_out[0]);
            input_pos += chunk_size;
        }

        output_samples
    } else {
        mono_samples
    };

    // Step 4: Convert to 16-bit PCM WAV
    let mut output = Vec::new();
    {
        let wav_spec = hound::WavSpec {
            channels: 1,
            sample_rate: 16000,
            bits_per_sample: 16,
            sample_format: hound::SampleFormat::Int,
        };

        let mut writer = hound::WavWriter::new(Cursor::new(&mut output), wav_spec).map_err(
            |e| TranscriptionError::AudioConversionError {
                message: format!("Failed to create WAV writer: {}", e),
            },
        )?;

        for &sample in &resampled {
            let sample_i16 = (sample.clamp(-1.0, 1.0) * 32767.0) as i16;
            writer.write_sample(sample_i16).map_err(|e| {
                TranscriptionError::AudioConversionError {
                    message: format!("Failed to write sample: {}", e),
                }
            })?;
        }

        writer.finalize().map_err(|e| {
            TranscriptionError::AudioConversionError {
                message: format!("Failed to finalize WAV: {}", e),
            }
        })?;
    }

    Ok(output)
}
