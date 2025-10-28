use thiserror::Error;

#[derive(Error, Debug)]
pub enum TranscriptionError {
    #[error("Failed to read audio file: {message}")]
    AudioReadError { message: String },

    #[error("Failed to convert audio format: {message}")]
    AudioConversionError { message: String },

    #[error("Transcription failed: {message}")]
    TranscriptionFailed { message: String },

    #[error("Model not found or failed to load: {message}")]
    ModelError { message: String },

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}
