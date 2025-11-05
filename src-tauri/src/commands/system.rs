/**
 * System information commands
 * Get CPU and RAM specs for intelligent Whisper model recommendations
 */

use serde::{Deserialize, Serialize};
use sysinfo::System;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemSpecs {
    /// Total RAM in GB
    pub total_memory_gb: f64,
    /// Number of CPU cores (physical + logical)
    pub cpu_cores: usize,
    /// CPU brand/model name
    pub cpu_brand: String,
    /// Recommended Whisper model based on system specs
    pub recommended_model: String,
}

/// Get system specifications and model recommendation
#[tauri::command]
pub fn get_system_specs() -> SystemSpecs {
    let mut sys = System::new_all();
    sys.refresh_all();

    // Get total RAM in GB
    let total_memory_bytes = sys.total_memory();
    let total_memory_gb = total_memory_bytes as f64 / 1_073_741_824.0; // Convert bytes to GB

    // Get CPU info
    let cpu_cores = sys.cpus().len();
    let cpu_brand = sys.cpus()
        .first()
        .map(|cpu| cpu.brand().to_string())
        .unwrap_or_else(|| "Unknown".to_string());

    // Recommend model based on specs
    let recommended_model = recommend_model(total_memory_gb, cpu_cores);

    SystemSpecs {
        total_memory_gb,
        cpu_cores,
        cpu_brand,
        recommended_model,
    }
}

/// Recommend a Whisper model based on system specifications
///
/// Logic based on real-world Whisper performance benchmarks:
/// - Large models are TOO slow for interactive use (not recommended even on powerful systems)
/// - Small is the sweet spot for high-end systems (85-90% accuracy of large, 3x faster)
/// - Base is ideal for mid-range systems (good accuracy, fast enough for smooth UX)
/// - Tiny for lower-end systems (speed over accuracy)
///
/// RAM Requirements (runtime):
/// - Tiny: ~1 GB
/// - Base: ~1-2 GB
/// - Small: ~2-3 GB
/// - Medium: ~4-5 GB
/// - Large: ~8-10 GB
///
/// Processing Speed (typical hardware):
/// - Tiny: ~10x real-time (1min audio = 6sec)
/// - Base: ~5x real-time (1min audio = 12sec)
/// - Small: ~3x real-time (1min audio = 20sec)
/// - Medium: ~2x real-time (1min audio = 30sec)
/// - Large: ~1x real-time (1min audio = 60sec)
fn recommend_model(ram_gb: f64, cpu_cores: usize) -> String {
    if ram_gb >= 16.0 && cpu_cores >= 8 {
        // High-end systems: recommend small (not large - it's too slow for real-time use)
        // Small provides excellent accuracy with much better speed
        "small".to_string()
    } else if ram_gb >= 8.0 && cpu_cores >= 4 {
        // Mid-range systems: recommend base
        // Good balance of accuracy and speed for smooth UX
        "base".to_string()
    } else {
        // Lower-end systems: recommend tiny
        // Prioritize speed and smooth performance
        "tiny".to_string()
    }
}
