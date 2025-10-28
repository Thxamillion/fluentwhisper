mod error;
mod whisper;

pub use error::TranscriptionError;
pub use whisper::transcribe_audio_file;
