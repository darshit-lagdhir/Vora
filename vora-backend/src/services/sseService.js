import crypto from 'crypto';
import { eventHub } from '../utils/eventHub.js';

// In-memory registries
const clients = new Map(); // eventId -> Set of express Response objects
const presence = new Map(); // eventId -> Array of active user profiles
const activePolls = new Map(); // eventId -> active poll state
const activeOverrides = new Map(); // eventId -> active override message

// Bounded in-memory message history sliding window: eventId -> Array of message deltas
const messageCache = new Map();
const MAX_CACHE_SIZE = 50;

/**
 * Appends a message to the sliding window cache and returns its generated ID.
 */
const addToCache = (eventId, eventType, payload) => {
  if (!messageCache.has(eventId)) {
    messageCache.set(eventId, []);
  }
  const queue = messageCache.get(eventId);

  const messageId = `msg-${Date.now()}-${crypto.randomUUID().split('-')[0]}`;
  const messageEntry = {
    id: messageId,
    eventType,
    payload
  };

  queue.push(messageEntry);
  if (queue.length > MAX_CACHE_SIZE) {
    queue.shift(); // Evict oldest delta
  }

  return messageId;
};

/**
 * Broadcast an event down the SSE connection stream pool for a target eventId.
 */
export const broadcast = (eventId, eventType, payload) => {
  const eventClients = clients.get(eventId);
  
  // Save message delta to cache and get cryptographically unique message ID
  const messageId = addToCache(eventId, eventType, payload);

  if (!eventClients || eventClients.size === 0) return;

  const dataString = JSON.stringify({ eventType, payload });

  for (const clientRes of eventClients) {
    try {
      clientRes.write(`id: ${messageId}\n`);
      clientRes.write(`event: message\n`);
      clientRes.write(`data: ${dataString}\n\n`);
      if (typeof clientRes.flush === 'function') {
        clientRes.flush();
      }
    } catch (err) {
      console.warn(`[SSE Service] Failed to transmit data payload to client socket:`, err.message);
    }
  }
};

/**
 * Centralized asynchronous Event Hub subscription loop.
 * Isolates REST/database write transactions from open streaming sockets.
 */
eventHub.on('event_mutate', ({ eventId, eventType, payload }) => {
  // Execute asynchronously to keep main thread completely unblocked
  setImmediate(() => {
    broadcast(eventId, eventType, payload);
  });
});

/**
 * Register a new EventSource client subscription.
 * Handles headers, initial state handshake, retry timing, and Last-Event-ID gap replaying.
 */
export const registerClient = (eventId, user, res, lastEventId = null) => {
  // Set SSE non-buffering standards headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Command native client EventSource to retry unexpected drops in 3 seconds (3000ms)
  res.write(`retry: 3000\n\n`);
  if (typeof res.flush === 'function') {
    res.flush();
  }

  // Catch up client on any missed updates from the sliding window cache
  if (lastEventId) {
    const queue = messageCache.get(eventId) || [];
    const index = queue.findIndex(msg => msg.id === lastEventId);
    if (index !== -1) {
      const missedMessages = queue.slice(index + 1);
      for (const msg of missedMessages) {
        res.write(`id: ${msg.id}\n`);
        res.write(`event: message\n`);
        res.write(`data: ${JSON.stringify({ eventType: msg.eventType, payload: msg.payload })}\n\n`);
      }
      if (typeof res.flush === 'function') {
        res.flush();
      }
    }
  }

  // Hydrate presence context for authenticated accounts
  let userProfile = null;
  if (user && user.id) {
    userProfile = {
      id: user.id,
      firstName: user.firstName || 'Attendee',
      lastName: user.lastName || '',
      email: user.email || ''
    };

    if (!presence.has(eventId)) {
      presence.set(eventId, []);
    }

    const currentPresence = presence.get(eventId);
    if (!currentPresence.some(u => u.id === user.id)) {
      currentPresence.push(userProfile);
      // Publish presence state update asynchronously
      eventHub.emit('event_mutate', { eventId, eventType: 'PRESENCE_UPDATE', payload: currentPresence });
    }
  }

  // Register client response stream
  if (!clients.has(eventId)) {
    clients.set(eventId, new Set());
  }
  clients.get(eventId).add(res);

  // Handshake initial system states
  const initialState = {
    activePoll: activePolls.get(eventId) || null,
    presenceList: presence.get(eventId) || [],
    globalOverride: activeOverrides.get(eventId) || null
  };
  res.write(`id: init\n`);
  res.write(`event: message\n`);
  res.write(`data: ${JSON.stringify({ eventType: 'INIT_STATE', payload: initialState })}\n\n`);
  if (typeof res.flush === 'function') {
    res.flush();
  }

  // Unregister callback closure
  return () => {
    const eventClients = clients.get(eventId);
    if (eventClients) {
      eventClients.delete(res);
      if (eventClients.size === 0) {
        clients.delete(eventId);
      }
    }

    if (userProfile) {
      const currentPresence = presence.get(eventId);
      if (currentPresence) {
        const remainingPresence = currentPresence.filter(u => u.id !== userProfile.id);
        presence.set(eventId, remainingPresence);
        // Publish presence removal update asynchronously
        eventHub.emit('event_mutate', { eventId, eventType: 'PRESENCE_UPDATE', payload: remainingPresence });
      }
    }
  };
};

/**
 * Protocol Heartbeat Sentinel: runs every 15,000ms.
 * Keeps TCP sockets open across intermediate proxy layers by writing SSE comments.
 */
setInterval(() => {
  for (const eventClients of clients.values()) {
    for (const clientRes of eventClients) {
      try {
        clientRes.write(`: heartbeat ping\n\n`);
        if (typeof clientRes.flush === 'function') {
          clientRes.flush();
        }
      } catch (err) {
        // Suppress errors for disconnected socket writes in-progress of cleanup
      }
    }
  }
}, 15000).unref();

/**
 * Launches a live poll for attendees.
 */
export const launchPoll = (eventId, question, options) => {
  const poll = {
    question,
    options,
    votes: new Array(options.length).fill(0),
    percentages: new Array(options.length).fill(0),
    totalVotes: 0
  };

  activePolls.set(eventId, poll);
  eventHub.emit('event_mutate', { eventId, eventType: 'POLL_LAUNCHED', payload: poll });
  return poll;
};

/**
 * Registers a vote in the current active poll.
 */
export const votePoll = (eventId, optionIndex) => {
  const poll = activePolls.get(eventId);
  if (!poll) return null;

  if (optionIndex < 0 || optionIndex >= poll.options.length) return poll;

  poll.votes[optionIndex] += 1;
  poll.totalVotes += 1;

  // Recalculate percentages
  poll.percentages = poll.votes.map(v => 
    poll.totalVotes > 0 ? parseFloat(((v / poll.totalVotes) * 100).toFixed(1)) : 0
  );

  activePolls.set(eventId, poll);
  eventHub.emit('event_mutate', { eventId, eventType: 'POLL_UPDATED', payload: poll });
  return poll;
};

/**
 * Terminates the active poll.
 */
export const terminatePoll = (eventId) => {
  activePolls.delete(eventId);
  eventHub.emit('event_mutate', { eventId, eventType: 'POLL_TERMINATED', payload: null });
};

/**
 * Sets a global override warning ribbon.
 */
export const setOverride = (eventId, message) => {
  activeOverrides.set(eventId, message);
  eventHub.emit('event_mutate', { eventId, eventType: 'GLOBAL_OVERRIDE', payload: { message } });
};

/**
 * Clears the global override warning ribbon.
 */
export const clearOverride = (eventId) => {
  activeOverrides.delete(eventId);
  eventHub.emit('event_mutate', { eventId, eventType: 'REVOKE_OVERRIDE', payload: null });
};
