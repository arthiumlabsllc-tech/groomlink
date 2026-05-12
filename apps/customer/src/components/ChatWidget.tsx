import { useCustomerChat } from '../hooks/useCustomerChat';

// ============================================================
// GroomLink Chat Widget (Customer - authenticated users)
// ============================================================
// Floating chat bubble for logged-in customers to contact support.
// - Automatically uses authenticated API endpoints
// - Shows subject prompt for new conversations
// - Persists active ticket in localStorage

export default function ChatWidget() {
  const {
    open,
    setOpen,
    messages,
    draft,
    setDraft,
    loading,
    error,
    unread,
    hasSession,
    startConversation,
    sendMessage,
    endChat,
  } = useCustomerChat();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || loading) return;

    if (!hasSession) {
      // First message - create ticket with subject
      await startConversation(draft.trim().slice(0, 60), draft.trim());
    } else {
      // Send message
      await sendMessage();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#006B3F] hover:bg-[#005232] text-white shadow-2xl flex items-center justify-center transition-all hover:scale-105 md:bottom-8 md:right-8"
        aria-label={open ? 'Close support chat' : 'Open support chat'}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        )}
        {unread > 0 && !open && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center border-2 border-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-4 z-50 w-[calc(100%-2rem)] max-w-sm md:right-8 md:bottom-28 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200" style={{ height: '520px', maxHeight: '80vh' }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-[#006B3F] to-[#004d2d] text-white px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">GroomLink Support</p>
              <p className="text-xs opacity-80">We typically reply in a few minutes</p>
            </div>
            {hasSession && (
              <button
                onClick={endChat}
                className="text-xs underline opacity-80 hover:opacity-100"
              >
                End chat
              </button>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto bg-gray-50 px-3 py-3 space-y-2">
            {!hasSession ? (
              <div className="text-center text-sm text-gray-500 mt-6">
                <p className="mb-2">👋 Hi there! How can we help you today?</p>
                <p className="text-xs text-gray-400">
                  Send us a message and we'll get back to you shortly.
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-sm text-gray-500 mt-6">Loading…</div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.isFromUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                      m.isFromUser
                        ? 'bg-[#006B3F] text-white rounded-br-sm'
                        : 'bg-white text-gray-900 rounded-bl-sm shadow-sm border border-gray-100'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border-t border-red-200 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Composer */}
          <form onSubmit={handleSubmit} className="border-t border-gray-200 p-3 flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={hasSession ? 'Type a message…' : 'Describe your issue…'}
              rows={1}
              maxLength={1500}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#006B3F]/30"
            />
            <button
              type="submit"
              disabled={loading || !draft.trim()}
              className="bg-[#006B3F] text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-[#005232] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Send"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
