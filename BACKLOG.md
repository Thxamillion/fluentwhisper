# FluentWhisper - Product Backlog

Feature requests and improvements to consider for future releases.

---

## UX Improvements

### Shift+Delete Shortcut for Confirmations
**Priority:** Medium
**Effort:** ~1 hour
**Status:** Proposed

Add Shift+Click shortcut to bypass confirmation dialogs for power users:
- **History page:** Shift+Click trash icon to delete session without confirmation
- **Library page:** Shift+Click trash icon to delete text without confirmation
- **Record page:** Shift+Click discard button to skip confirmation

**Implementation:**
```typescript
const handleDelete = (e: React.MouseEvent, id: string) => {
  e.stopPropagation();

  if (e.shiftKey) {
    // Bypass confirmation for power users
    deleteMutation.mutate(id);
    return;
  }

  // Show confirmation dialog
  setItemToDelete(id);
  setConfirmOpen(true);
};
```

**UX considerations:**
- Add tooltip: "Delete (hold Shift to skip confirmation)"
- Industry standard pattern (Windows/Mac use Shift+Delete for permanent delete)
- Self-documenting for power users
- No persistent settings to manage

**Why not "Don't ask again" checkbox:**
- Destructive operations should default to safe
- Users might forget they disabled confirmations
- Shift+Delete requires intentional action each time

---

## Future Features

### Word Prompts During Recording
**Priority:** TBD
**Effort:** TBD
**Status:** Proposed

Add a toggleable feature that displays unpracticed vocabulary words during recording sessions to prompt users to practice them:

- **Toggle setting:** User can enable/disable word prompts in settings
- **Display behavior:** During active recording, show words that the user hasn't practiced yet
- **Purpose:** Trigger users to think about and speak specific vocabulary they haven't used recently
- **Smart selection:** Prioritize words that haven't appeared in recent sessions

**Implementation considerations:**
- Track which words have been used in transcribed sessions
- Define "unpracticed" criteria (never used? not used in X days?)
- Design non-intrusive UI for word prompts (overlay, sidebar, or bottom banner?)
- Consider prompt frequency/timing to avoid disruption
- Allow customization of word sources (user's library, common words, etc.)

**Questions to resolve:**
- How often should prompts appear?
- Should prompts be random or based on spaced repetition algorithm?
- Integration with existing Library/Vocabulary features?

---

### AI Language Mentor
**Priority:** TBD
**Effort:** TBD
**Status:** Proposed

Add an LLM-powered mentor that analyzes user transcripts and vocabulary to provide personalized learning recommendations:

- **Transcript analysis:** Review user's recorded sessions to understand their current vocabulary usage
- **Smart recommendations:** Suggest useful words/phrases to learn based on their current level and patterns
- **Personalized feedback:** Identify vocabulary gaps and suggest words that would expand their abilities
- **Context-aware:** Consider what words they already know and use to suggest natural progressions

**Implementation considerations:**
- LLM integration (OpenAI API, local LLM, or other provider?)
- Privacy: Keep transcripts local vs cloud processing
- Frequency of analysis (after each session, daily summary, weekly review?)
- Cost management for API-based solutions
- UI for displaying mentor suggestions (dedicated tab, notifications, inline suggestions?)
- Store mentor recommendations in database for tracking acceptance/practice

**Potential features:**
- "Words to learn this week" based on usage patterns
- Identify overused words and suggest synonyms for variety
- Detect grammar patterns and suggest improvements
- Spaced repetition integration with word prompts feature
- Progress tracking: which recommended words have been learned/used

**Questions to resolve:**
- Free tier vs paid feature (if using cloud LLM)?
- How much transcript history to analyze?
- User control over mentor aggressiveness/frequency?
- Integration with existing Library and Word Prompts features?

---

### Human Audio Review/Feedback Marketplace
**Priority:** TBD
**Effort:** Large (multi-phase)
**Status:** Brainstorming

A peer-to-peer marketplace where users can submit recordings for human feedback and native speakers can review them for payment/credits:

**Core concept:**
- Users submit their practice recordings for human review (alternative to AI feedback)
- Native speakers or qualified reviewers provide feedback on pronunciation, grammar, fluency
- Two-sided marketplace: learners pay/spend credits, reviewers earn money/credits

**Initial implementation ideas:**
- **Start with Spanish:** Easier to source contractors in Spanish-speaking countries with lower rates
- **Contractor model first:** Pay qualified Spanish speakers to review submissions
- **User reviewer program later:** Allow users to become reviewers and earn credits or money
- **Credit system:** Users earn credits by reviewing others, spend credits to get reviewed

**Raw thoughts to explore:**
- Could users review each other's work? (community model vs contractor model)
- Credits vs real money - what's the right incentive structure?
- Quality control: How to ensure reviewers are qualified?
- Pricing: What's fair compensation for reviewers? What do learners pay?
- Review format: Written feedback? Voice feedback? Scored rubric?
- Turnaround time: How fast should reviews come back?
- Privacy: Some users might not want their voice shared
- Moderation: Need to prevent abuse, ensure constructive feedback

**Potential phases:**
1. **Phase 1:** Spanish only, paid contractors, simple text feedback
2. **Phase 2:** Expand to more languages, improve feedback UI
3. **Phase 3:** User reviewer program with credits/payment
4. **Phase 4:** Advanced features (voice feedback, detailed scoring, reviewer ratings)

**Technical considerations:**
- Audio storage/transmission (privacy, cost)
- Payment processing (Stripe? PayPal?)
- Credit ledger system
- Reviewer matching algorithm
- Review queue management
- Rating/reputation system for reviewers
- Moderation tools

**Business model questions:**
- Take percentage of transactions?
- Subscription for unlimited reviews?
- Pay-per-review pricing?
- How to bootstrap the supply side (reviewers)?

---

_More items will be added here as they come up..._

