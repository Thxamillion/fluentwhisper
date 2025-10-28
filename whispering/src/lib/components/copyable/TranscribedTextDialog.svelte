<script lang="ts">
	import TextPreviewDialog from '$lib/components/copyable/TextPreviewDialog.svelte';
	import { getRecordingTransitionId } from '$lib/utils/getRecordingTransitionId';

	/**
	 * A domain-specific wrapper around TextPreviewDialog for displaying transcribed text.
	 *
	 * This component ensures consistent presentation of transcribed text across the application
	 * by automatically setting the correct title, label, and transition ID pattern.
	 *
	 * @example
	 * ```svelte
	 * <TranscribedTextDialog
	 *   recordingId={recording.id}
	 *   transcribedText={recording.transcribedText}
	 *   rows={1}
	 * />
	 * ```
	 */
	let {
		/** The ID of the recording whose transcribed text is being displayed */
		recordingId,
		/** The transcribed text content to display */
		transcribedText,
		/** Number of rows for the preview textarea (default: 2) */
		rows = 2,
		/** Whether the dialog trigger is disabled */
		disabled = false,
	}: {
		recordingId: string;
		transcribedText: string;
		rows?: number;
		disabled?: boolean;
	} = $props();

	const id = getRecordingTransitionId({
		recordingId,
		propertyName: 'transcribedText',
	});
</script>

<TextPreviewDialog
	{id}
	title="Transcribed Text"
	label="transcribed text"
	text={transcribedText}
	{rows}
	{disabled}
/>
