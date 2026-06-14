export interface QuickReply {
  label: string;
  text: string;
}

export const QUICK_REPLIES: QuickReply[] = [
  {
    label: 'Greeting',
    text: 'Hello! Welcome to GroomLink support. How can I help you today?',
  },
  {
    label: 'Request info',
    text: 'Could you please provide more details about your issue?',
  },
  {
    label: 'Hold on',
    text: 'Please give me a moment while I look into this for you.',
  },
  {
    label: 'Resolved',
    text: 'Your issue has been resolved. Is there anything else I can help with?',
  },
  {
    label: 'Escalate',
    text: "I'm escalating this to a specialist who can assist you further. You'll hear back shortly.",
  },
  {
    label: 'Business hours',
    text: "Our business hours are Mon-Sat, 8AM-8PM. We'll respond as soon as possible during these hours.",
  },
];
