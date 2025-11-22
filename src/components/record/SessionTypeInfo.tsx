/**
 * Session Type Information Component
 * Displays title, WPM counting info, and tips for different session types
 */

export type SessionType = 'free_speak' | 'tutor' | 'conversation';

interface SessionTypeConfig {
  title: string;
  countsWPM: boolean;
  tips: string[];
}

export const SESSION_TYPE_CONFIG: Record<SessionType, SessionTypeConfig> = {
  free_speak: {
    title: 'Free Speak',
    countsWPM: true,
    tips: [
      'Practice speaking naturally without reading',
      'Try to speak for at least 2-3 minutes',
      'Use practice prompts for inspiration',
    ],
  },
  tutor: {
    title: 'Tutor Session',
    countsWPM: false,
    tips: [
      'Record your tutor session',
      'Auto-detects language switching',
      'Review difficult words after the session',
    ],
  },
  conversation: {
    title: 'Conversation',
    countsWPM: false,
    tips: [
      'Record casual conversations',
      'Chat with ChatGPT voice assistant',
      'Auto-detects language switching',
    ],
  },
};

interface SessionTypeInfoProps {
  type: SessionType;
}

export function SessionTypeInfo({ type }: SessionTypeInfoProps) {
  const config = SESSION_TYPE_CONFIG[type];

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          {config.title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {config.countsWPM
            ? 'This session type counts toward your WPM statistics'
            : 'This session type does not count toward WPM statistics'}
        </p>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Tips:
        </p>
        <ul className="space-y-1.5">
          {config.tips.map((tip, index) => (
            <li
              key={index}
              className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2"
            >
              <span className="text-gray-400 dark:text-gray-500 mt-0.5">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
