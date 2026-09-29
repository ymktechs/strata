import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CornerUpLeft,
  Edit2,
  Hash,
  Megaphone,
  MessageSquare,
  Pin,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { LIMITS } from '../lib/validation';
import { Channel, Message, OrgMember, Organization } from '../types/workspace';
import { Avatar, PRESENCE_LABEL_MAP } from './Avatar';

interface ChatChannelViewProps {
  organization: Organization;
  channel: Channel;
  messages: Message[];
  membersMap: Record<string, OrgMember>;
  currentUserId: string;
  showOnlyPinned: boolean;
  onExitPinnedFilter: () => void;
  onSendMessage: (
    content: string,
    replyTo?: { messageId: string; authorName: string; preview: string } | null
  ) => Promise<void>;
  onEditMessage: (messageId: string, newContent: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onTogglePin: (messageId: string, isPinned: boolean) => Promise<void>;
  onUpdateTopic: (newTopic: string) => Promise<void>;
}

function formatMessageTime(ts?: { toDate?: () => Date } | null): string {
  if (!ts || typeof ts.toDate !== 'function') return 'Just now';
  try {
    const d = ts.toDate();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return 'Just now';
  }
}

export const ChatChannelView: React.FC<ChatChannelViewProps> = ({
  organization,
  channel,
  messages,
  membersMap,
  currentUserId,
  showOnlyPinned,
  onExitPinnedFilter,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onTogglePin,
  onUpdateTopic,
}) => {
  const [composerText, setComposerText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [replyTarget, setReplyTarget] = useState<{
    messageId: string;
    authorName: string;
    preview: string;
  } | null>(null);

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [topicDraft, setTopicDraft] = useState(channel.topic);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setTopicDraft(channel.topic);
    setIsEditingTopic(false);
    setReplyTarget(null);
    setEditingMessageId(null);
  }, [channel.channelId, channel.topic]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, channel.channelId]);

  // Determine DM partner if this is a 1:1 Direct Message channel
  const dmPartner = useMemo(() => {
    if (channel.kind !== 'dm') return null;
    const partnerUid =
      channel.dmParticipantA === currentUserId
        ? channel.dmParticipantB
        : channel.dmParticipantA;
    return membersMap[partnerUid] || null;
  }, [channel, currentUserId, membersMap]);

  const pinnedMessages = useMemo(
    () => messages.filter((m) => m.isPinned && m.status !== 'deleted'),
    [messages]
  );

  const displayedMessages = useMemo(() => {
    return messages.filter((m) => {
      if (showOnlyPinned && (!m.isPinned || m.status === 'deleted')) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        m.content.toLowerCase().includes(q) ||
        m.authorName.toLowerCase().includes(q) ||
        m.authorRole.toLowerCase().includes(q)
      );
    });
  }, [messages, showOnlyPinned, searchQuery]);

  const canManageChannel =
    channel.createdBy === currentUserId || organization.ownerId === currentUserId;

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = composerText.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setSendError(null);
    try {
      await onSendMessage(trimmed, replyTarget);
      setComposerText('');
      setReplyTarget(null);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!editingText.trim() || isSavingEdit) return;
    setIsSavingEdit(true);
    try {
      await onEditMessage(messageId, editingText.trim());
      setEditingMessageId(null);
      setEditingText('');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSaveTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateTopic(topicDraft.trim());
    setIsEditingTopic(false);
  };

  return (
    <div className="flex-1 flex flex-col bg-white min-w-0 overflow-hidden">
      {/* Contextual Channel / DM Header */}
      <div className="px-6 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
        <div className="min-w-0 flex-1">
          {channel.kind === 'dm' ? (
            <div className="flex items-center gap-3">
              <Avatar
                name={dmPartner?.displayName || channel.name}
                color={dmPartner?.avatarColor || 'indigo'}
                presence={dmPartner?.presence || 'online'}
                size="sm"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900 truncate">
                    {dmPartner?.displayName || channel.name}
                  </h2>
                  {dmPartner && (
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      · {dmPartner.jobTitle} · {PRESENCE_LABEL_MAP[dmPartner.presence]}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  Private 1:1 Direct Message Thread
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2">
                {channel.kind === 'announcement' ? (
                  <Megaphone className="w-4 h-4 text-indigo-600 shrink-0" />
                ) : (
                  <Hash className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <h2 className="text-sm font-bold text-slate-900 truncate">{channel.name}</h2>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs font-mono text-slate-500 tabular-nums whitespace-nowrap">
                  {channel.messageCount} {channel.messageCount === 1 ? 'message' : 'messages'}
                </span>
                {pinnedMessages.length > 0 && (
                  <>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs font-mono text-indigo-600 tabular-nums whitespace-nowrap">
                      {pinnedMessages.length} pinned
                    </span>
                  </>
                )}
              </div>

              {isEditingTopic ? (
                <form onSubmit={handleSaveTopic} className="mt-1.5 flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={LIMITS.CHANNEL_TOPIC_MAX}
                    value={topicDraft}
                    onChange={(e) => setTopicDraft(e.target.value)}
                    className="flex-1 max-w-md px-2.5 py-1 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 rounded-md cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingTopic(false)}
                    className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-slate-500 truncate">
                    {channel.topic || 'No channel topic set.'}
                  </p>
                  {canManageChannel && (
                    <button
                      type="button"
                      onClick={() => setIsEditingTopic(true)}
                      className="text-xs text-slate-400 hover:text-indigo-600 shrink-0 cursor-pointer"
                    >
                      Edit topic
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* In-Channel Search & Filter Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {showOnlyPinned && (
            <button
              type="button"
              onClick={onExitPinnedFilter}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg cursor-pointer"
            >
              <Pin className="w-3.5 h-3.5" />
              <span>Showing Pinned ({pinnedMessages.length})</span>
              <X className="w-3.5 h-3.5 ml-1" />
            </button>
          )}

          <div className="relative w-48 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-600"
            />
          </div>
        </div>
      </div>

      {/* Pinned Highlight Bar (when not in Pinned-only mode) */}
      {!showOnlyPinned && pinnedMessages.length > 0 && (
        <div className="px-6 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Pin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="font-semibold text-slate-800 shrink-0">Pinned:</span>
            <span className="text-slate-600 truncate">
              {pinnedMessages[pinnedMessages.length - 1].authorName}:{' '}
              {pinnedMessages[pinnedMessages.length - 1].content}
            </span>
          </div>
          <span className="font-mono text-slate-400 tabular-nums shrink-0">
            {pinnedMessages.length} {pinnedMessages.length === 1 ? 'pin' : 'pins'}
          </span>
        </div>
      )}

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {displayedMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-16 max-w-md mx-auto">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 mb-3">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              {showOnlyPinned
                ? 'No pinned messages in this conversation'
                : searchQuery
                ? 'No messages match your search'
                : channel.kind === 'dm'
                ? `Start your direct conversation with ${dmPartner?.displayName || channel.name}`
                : `Welcome to #${channel.name}`}
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {showOnlyPinned
                ? 'Pin important updates or decisions from any message hover menu so the organization can reference them quickly.'
                : searchQuery
                ? 'Try clearing the search box to see the full conversation history.'
                : channel.topic ||
                  'Send the first message below to start collaborating with your teammates in real time.'}
            </p>
          </div>
        ) : (
          displayedMessages.map((msg) => {
            const isOwn = msg.authorId === currentUserId;
            const liveMember = membersMap[msg.authorId];
            const displayRole = liveMember?.jobTitle || msg.authorRole;
            const displayPresence = liveMember?.presence;
            const isDeleted = msg.status === 'deleted';
            const isEditingThis = editingMessageId === msg.messageId;

            return (
              <div
                key={msg.messageId}
                className={`group flex items-start gap-3.5 p-2.5 -mx-2.5 rounded-lg transition-colors ${
                  msg.isPinned ? 'bg-indigo-50/30 hover:bg-indigo-50/50' : 'hover:bg-slate-50'
                }`}
              >
                <Avatar
                  name={msg.authorName}
                  color={liveMember?.avatarColor || msg.authorAvatarColor}
                  presence={displayPresence}
                  size="md"
                />

                <div className="min-w-0 flex-1">
                  {/* Quoted Reply Header */}
                  {msg.replyToMessageId !== 'none' && (
                    <div className="mb-1.5 pl-2.5 border-l-2 border-slate-300 text-xs text-slate-500 flex items-center gap-1.5 truncate">
                      <CornerUpLeft className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-700">{msg.replyToAuthorName}:</span>
                      <span className="truncate">{msg.replyToPreview}</span>
                    </div>
                  )}

                  {/* Author & Metadata Line (Zero-Pill Unboxed Metadata Discipline) */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs min-w-0 flex-wrap">
                      <span className="font-bold text-slate-900">{msg.authorName}</span>
                      <span className="text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-slate-500">{displayRole}</span>
                      <span className="text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="font-mono text-slate-400 tabular-nums">
                        {formatMessageTime(msg.createdAt)}
                      </span>
                      {msg.status === 'edited' && (
                        <>
                          <span className="text-slate-300" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-slate-400 italic">Edited</span>
                        </>
                      )}
                      {msg.isPinned && !isDeleted && (
                        <>
                          <span className="text-slate-300" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-indigo-600 font-medium">Pinned</span>
                        </>
                      )}
                    </div>

                    {/* Message Action Toolbar */}
                    {!isDeleted && (
                      <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 flex items-center gap-1 bg-white border border-slate-200 rounded-md px-1.5 py-0.5 shadow-2xs transition-opacity shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setReplyTarget({
                              messageId: msg.messageId,
                              authorName: msg.authorName,
                              preview: msg.content.slice(0, 120),
                            })
                          }
                          title="Reply to message"
                          className="p-1 text-slate-500 hover:text-slate-900 rounded cursor-pointer"
                        >
                          <CornerUpLeft className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onTogglePin(msg.messageId, !msg.isPinned)}
                          title={msg.isPinned ? 'Unpin message' : 'Pin message'}
                          className={`p-1 rounded cursor-pointer ${
                            msg.isPinned
                              ? 'text-indigo-600 hover:text-indigo-800'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>

                        {isOwn && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMessageId(msg.messageId);
                                setEditingText(msg.content);
                              }}
                              title="Edit message"
                              className="p-1 text-slate-500 hover:text-slate-900 rounded cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onDeleteMessage(msg.messageId)}
                              title="Delete message"
                              className="p-1 text-slate-500 hover:text-red-600 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Message Body or Inline Editor */}
                  {isEditingThis ? (
                    <div className="mt-2 space-y-2">
                      <textarea
                        rows={2}
                        maxLength={LIMITS.MESSAGE_CONTENT_MAX}
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isSavingEdit}
                          onClick={() => handleSaveEdit(msg.messageId)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          <span>Save Changes</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMessageId(null);
                            setEditingText('');
                          }}
                          className="px-3 py-1 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p
                      className={`mt-1 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        isDeleted ? 'italic text-slate-400' : 'text-slate-800'
                      }`}
                    >
                      {msg.content}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer Footer */}
      <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/60">
        {sendError && (
          <div className="mb-2.5 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center justify-between">
            <span>{sendError}</span>
            <button
              type="button"
              onClick={() => setSendError(null)}
              className="text-red-500 hover:text-red-800 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {replyTarget && (
          <div className="mb-2 px-3 py-2 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <CornerUpLeft className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="text-slate-500 shrink-0">Replying to</span>
              <span className="font-semibold text-slate-900 shrink-0">
                {replyTarget.authorName}:
              </span>
              <span className="text-slate-600 truncate">{replyTarget.preview}</span>
            </div>
            <button
              type="button"
              onClick={() => setReplyTarget(null)}
              className="text-slate-400 hover:text-slate-700 shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="bg-white border border-slate-300 rounded-xl p-2.5 focus-within:ring-2 focus-within:ring-indigo-600 focus-within:border-transparent transition-shadow">
          <textarea
            rows={2}
            maxLength={LIMITS.MESSAGE_CONTENT_MAX}
            value={composerText}
            onChange={(e) => setComposerText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              channel.kind === 'dm'
                ? `Message ${dmPartner?.displayName || channel.name}... (Press Enter to send, Shift+Enter for new line)`
                : `Message #${channel.name}... (Press Enter to send, Shift+Enter for new line)`
            }
            className="w-full px-1.5 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none resize-none"
          />

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-400 flex items-center gap-3">
              <span>Enter to send · Shift+Enter for newline</span>
              <span className="font-mono tabular-nums">
                {composerText.length}/{LIMITS.MESSAGE_CONTENT_MAX}
              </span>
            </div>

            <button
              type="submit"
              disabled={!composerText.trim() || isSending}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer"
            >
              <span>{isSending ? 'Sending...' : 'Send Message'}</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
