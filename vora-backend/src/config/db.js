import pg from 'pg';
import crypto from 'crypto';
import env from './env.js';

const { Pool } = pg;

console.log('[Database] Initializing PostgreSQL connection pool...');

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: {
    // Required for secure Supabase cloud database connections
    rejectUnauthorized: false,
  },
  max: 50,                  // Maximum number of clients in the pool (optimized for high throughput)
  min: 5,                   // Maintain a baseline of 5 warm connections
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection fails
});

export let isOffline = process.env.NODE_ENV === 'test';

export let queryMockOverride = null;
export function setQueryMockOverride(fn) {
  queryMockOverride = fn;
}

// Mock database store for offline resilience
export const mockDb = {
  users: [
    {
      id: 'mock-organizer-id-1111-2222-3333',
      email: 'organizer@vora.com',
      // bcrypt hash for 'password123'
      encrypted_password: '$2a$10$X86gTeeN7H7/xJbV/G9F.eFw6zL8J24UqXv915T7qI77u6lGq.O2K'
    }
  ],
  profiles: [
    {
      id: 'mock-organizer-id-1111-2222-3333',
      email_address: 'organizer@vora.com',
      first_name: 'Vora',
      last_name: 'Admin',
      platform_role: 'organizer',
      avatar_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Vora',
      notify_event_start: true,
      notify_weekly_digest: true,
      notify_marketing: false,
      refresh_tokens: []
    }
  ],
  events: [
    {
      id: 'mock-event-id-1111-2222-3333',
      organizer_id: 'mock-organizer-id-1111-2222-3333',
      title: 'Vora Inaugural Summit 2026',
      description: 'The premier virtual gathering of developers, creators, and organizers to shape the future of immersive online events.',
      start_timestamp: new Date(Date.now() + 3600000).toISOString(),
      end_timestamp: new Date(Date.now() + 7200000).toISOString(),
      status: 'active',
      maximum_capacity: 1000,
      tags: ['Summit', 'Vora', 'Developer'],
      banner_image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80',
      trigger_registration_confirmation: true,
      trigger_t_minus_24h: true,
      trigger_t_minus_1h: true,
      trigger_t_plus_24h: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'mock-event-id-2222-3333-4444',
      organizer_id: 'mock-organizer-id-1111-2222-3333',
      title: 'React 19 & Next.js Masterclass',
      description: 'An advanced deep-dive into Server Actions, React Compiler, and edge rendering architectures.',
      start_timestamp: new Date(Date.now() + 86400000 * 2).toISOString(),
      end_timestamp: new Date(Date.now() + 86400000 * 2 + 10800000).toISOString(),
      status: 'published',
      maximum_capacity: 500,
      tags: ['React', 'Next.js', 'Frontend'],
      banner_image_url: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&auto=format&fit=crop&q=80',
      trigger_registration_confirmation: true,
      trigger_t_minus_24h: true,
      trigger_t_minus_1h: true,
      trigger_t_plus_24h: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  sessions: [],
  registrations: [
    {
      id: 'mock-reg-id-1111',
      event_id: 'mock-event-id-1111-2222-3333',
      attendee_id: 'mock-organizer-id-1111-2222-3333',
      registration_status: 'confirmed',
      has_checked_in: false,
      ticket_hash: 'VORA-SUMMIT-ORGANIZER',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  resources: [],
  questions: [],
  broadcasts: [
    {
      id: 'mock-broadcast-id-1',
      event_id: 'mock-event-id-1111-2222-3333',
      subject: 'Welcome to Vora Inaugural Summit 2026!',
      content: 'We are excited to host you. Get ready for immersive webinars, live Q&A, and networking sessions.',
      audience_cohort: 'All Registered Attendees',
      status: 'delivered',
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 24).toISOString()
    }
  ]
};

// Mock Query processor mapping SQL substrings to JS arrays
async function mockQuery(text, params = []) {
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  
  if (normalizedText.startsWith('SELECT NOW()')) {
    return { rows: [{ now: new Date() }] };
  }

  // 1. Authentication and User Profiles
  if (normalizedText.includes('auth.users') && normalizedText.includes('SELECT') && normalizedText.includes('email =')) {
    const email = params[0]?.trim().toLowerCase();
    const user = mockDb.users.find(u => u.email === email);
    return { rows: user ? [user] : [] };
  }

  if (normalizedText.includes('profiles') && normalizedText.includes('id = $1') && normalizedText.includes('SELECT')) {
    const id = params[0];
    const profile = mockDb.profiles.find(p => p.id === id);
    return { rows: profile ? [profile] : [] };
  }

  if (normalizedText.includes('INSERT INTO auth.users')) {
    const [id, email, password] = params;
    const newUser = { id, email, encrypted_password: password };
    mockDb.users.push(newUser);
    return { rows: [newUser] };
  }

  if (normalizedText.includes('INSERT INTO public.profiles')) {
    const [id, email, first_name, last_name, role, avatar_url] = params;
    const newProfile = { 
      id, 
      email_address: email, 
      first_name, 
      last_name, 
      platform_role: role, 
      avatar_url,
      notify_event_start: true,
      notify_weekly_digest: true,
      notify_marketing: false,
      refresh_tokens: []
    };
    mockDb.profiles.push(newProfile);
    return { rows: [newProfile] };
  }

  if (normalizedText.includes('UPDATE profiles') && normalizedText.includes('refresh_tokens =')) {
    const [refresh_tokens, id] = params;
    const profile = mockDb.profiles.find(p => p.id === id);
    if (profile) {
      profile.refresh_tokens = refresh_tokens;
      return { rows: [profile] };
    }
    return { rows: [] };
  }

  if (normalizedText.includes('UPDATE profiles') && normalizedText.includes('array_remove(refresh_tokens')) {
    const [tokenHash, id] = params;
    const profile = mockDb.profiles.find(p => p.id === id);
    if (profile) {
      profile.refresh_tokens = (profile.refresh_tokens || []).filter(t => t !== tokenHash);
      return { rows: [profile] };
    }
    return { rows: [] };
  }

  if (normalizedText.includes('UPDATE profiles') && normalizedText.includes('first_name =')) {
    const [first_name, last_name, avatar_url, id] = params;
    const profile = mockDb.profiles.find(p => p.id === id);
    if (profile) {
      profile.first_name = first_name;
      profile.last_name = last_name;
      profile.avatar_url = avatar_url;
      return { rows: [profile] };
    }
    return { rows: [] };
  }

  if (normalizedText.includes('UPDATE auth.users') && normalizedText.includes('encrypted_password =')) {
    const [encrypted_password, id] = params;
    const user = mockDb.users.find(u => u.id === id);
    if (user) {
      user.encrypted_password = encrypted_password;
      return { rows: [user] };
    }
    return { rows: [] };
  }

  if (normalizedText.includes('UPDATE profiles') && normalizedText.includes('platform_role =')) {
    const [role, id] = params;
    const profile = mockDb.profiles.find(p => p.id === id);
    if (profile) {
      profile.platform_role = role;
      return { rows: [profile] };
    }
    return { rows: [] };
  }

  if (normalizedText.includes('UPDATE profiles') && (normalizedText.includes('notify_event_start =') || normalizedText.includes('notify_weekly_digest =') || normalizedText.includes('notify_marketing ='))) {
    const [notify_event_start, notify_weekly_digest, notify_marketing, id] = params;
    const profile = mockDb.profiles.find(p => p.id === id);
    if (profile) {
      profile.notify_event_start = notify_event_start;
      profile.notify_weekly_digest = notify_weekly_digest;
      profile.notify_marketing = notify_marketing;
      return { rows: [profile] };
    }
    return { rows: [] };
  }

  if (normalizedText.includes('DELETE FROM events') && normalizedText.includes('organizer_id =')) {
    const organizer_id = params[0];
    mockDb.events = mockDb.events.filter(e => e.organizer_id !== organizer_id);
    return { rows: [] };
  }

  if (normalizedText.includes('DELETE FROM profiles') && normalizedText.includes('id =')) {
    const id = params[0];
    mockDb.profiles = mockDb.profiles.filter(p => p.id !== id);
    return { rows: [] };
  }

  if (normalizedText.includes('DELETE FROM auth.users') && normalizedText.includes('id =')) {
    const id = params[0];
    mockDb.users = mockDb.users.filter(u => u.id !== id);
    return { rows: [] };
  }

  if (normalizedText.includes('profiles') && normalizedText.includes('ORDER BY first_name ASC')) {
    return { rows: [...mockDb.profiles].sort((a, b) => a.first_name.localeCompare(b.first_name)) };
  }

  // 2. Events endpoints
  if (normalizedText.includes('FROM events') && normalizedText.includes('SELECT')) {
    let filtered = [...mockDb.events];
    
    if (normalizedText.includes('organizer_id = $1')) {
      filtered = filtered.filter(e => e.organizer_id === params[0]);
    } else if (normalizedText.includes("status IN ('published', 'active', 'completed')")) {
      filtered = filtered.filter(e => ['published', 'active', 'completed'].includes(e.status));
    } else if (normalizedText.includes("status IN ('active', 'published')")) {
      filtered = filtered.filter(e => ['active', 'published'].includes(e.status));
    }

    if (normalizedText.includes('COUNT(*)')) {
      return { rows: [{ count: String(filtered.length), total_count: filtered.length }] };
    }

    if (normalizedText.includes('WHERE id = $1')) {
      const event = mockDb.events.find(e => e.id === params[0]);
      return { rows: event ? [event] : [] };
    }

    // Map confirm counts and organizer info
    const mapped = filtered.map(e => {
      const org = mockDb.profiles.find(p => p.id === e.organizer_id) || {};
      const confirmed_count = mockDb.registrations.filter(r => r.event_id === e.id && r.registration_status === 'confirmed').length;
      return {
        ...e,
        organizer_first_name: org.first_name || 'Vora',
        organizer_last_name: org.last_name || 'Admin',
        organizer_avatar_url: org.avatar_url || '',
        confirmed_attendees: confirmed_count,
        registrants: confirmed_count,
        is_sold_out: confirmed_count >= e.maximum_capacity
      };
    });

    return { rows: mapped };
  }

  if (normalizedText.includes('INSERT INTO events')) {
    const [title, description, start_timestamp, end_timestamp, maximum_capacity, banner_image_url, organizer_id] = params;
    const newEvent = {
      id: crypto.randomUUID(),
      title,
      description,
      start_timestamp,
      end_timestamp,
      maximum_capacity,
      banner_image_url,
      organizer_id,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockDb.events.push(newEvent);
    return { rows: [newEvent] };
  }

  if (normalizedText.includes('UPDATE events')) {
    const id = params[params.length - 1];
    const eventIdx = mockDb.events.findIndex(e => e.id === id);
    if (eventIdx !== -1) {
      const event = mockDb.events[eventIdx];
      event.updated_at = new Date().toISOString();
      if (normalizedText.includes('status =')) {
        event.status = params[0] || event.status;
      }
      return { rows: [event] };
    }
    return { rows: [] };
  }

  if (normalizedText.includes('DELETE FROM events')) {
    const id = params[0];
    mockDb.events = mockDb.events.filter(e => e.id !== id);
    return { rows: [] };
  }

  // 3. Registrations endpoints
  if (normalizedText.includes('FROM registrations') && normalizedText.includes('SELECT')) {
    let filtered = [...mockDb.registrations];
    
    if (normalizedText.includes('r.id = $1') || normalizedText.includes('where r.id = $1')) {
      filtered = filtered.filter(r => r.id === params[0]);
    } else if (normalizedText.includes('event_id = $1') && normalizedText.includes('attendee_id = $2')) {
      filtered = filtered.filter(r => r.event_id === params[0] && r.attendee_id === params[1]);
      if (normalizedText.includes("registration_status = 'confirmed'")) {
        filtered = filtered.filter(r => r.registration_status === 'confirmed');
      }
    } else if (normalizedText.includes('event_id = $1')) {
      filtered = filtered.filter(r => r.event_id === params[0]);
      if (normalizedText.includes("registration_status = 'confirmed'")) {
        filtered = filtered.filter(r => r.registration_status === 'confirmed');
      }
    }
    
    if (normalizedText.includes('COUNT(*)')) {
      const countVal = filtered.length;
      return { rows: [{ count: String(countVal), confirmed_count: countVal }] };
    }

    const mapped = filtered.map(r => {
      const attendee = mockDb.profiles.find(p => p.id === r.attendee_id) || {};
      const event = mockDb.events.find(e => e.id === r.event_id) || {};
      return {
        ...r,
        first_name: attendee.first_name || 'John',
        last_name: attendee.last_name || 'Doe',
        email_address: attendee.email_address || 'john@example.com',
        avatar_url: attendee.avatar_url || '',
        event_title: event.title || 'Event'
      };
    });

    return { rows: mapped };
  }


  if (normalizedText.includes('INSERT INTO registrations')) {
    const [event_id, attendee_id, ticket_hash] = params;
    const newReg = {
      id: crypto.randomUUID(),
      event_id,
      attendee_id,
      registration_status: 'confirmed',
      has_checked_in: false,
      ticket_hash,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockDb.registrations.push(newReg);
    return { rows: [newReg] };
  }

  // 4. Resources endpoints
  if (normalizedText.includes('FROM resources') && normalizedText.includes('SELECT')) {
    let filtered = [...mockDb.resources];
    if (normalizedText.includes('event_id = $1')) {
      filtered = filtered.filter(r => r.event_id === params[0]);
    }
    return { rows: filtered };
  }

  if (normalizedText.includes('INSERT INTO resources')) {
    const [event_id, uploader_id, asset_name, file_url, mime_type, file_size_bytes, visibility_clearance] = params;
    const newRes = {
      id: crypto.randomUUID(),
      event_id,
      uploader_id,
      asset_name,
      file_url,
      mime_type,
      file_size_bytes,
      visibility_clearance,
      download_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockDb.resources.push(newRes);
    return { rows: [newRes] };
  }

  // 5. Questions endpoints
  if (normalizedText.includes('FROM questions') && normalizedText.includes('SELECT')) {
    let filtered = [...mockDb.questions];
    if (normalizedText.includes('event_id = $1')) {
      filtered = filtered.filter(q => q.event_id === params[0]);
    }
    // Sort by upvotes DESC, created_at DESC
    filtered.sort((a, b) => {
      if (b.upvotes !== a.upvotes) {
        return b.upvotes - a.upvotes;
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });
    return { rows: filtered };
  }

  if (normalizedText.includes('INSERT INTO questions')) {
    const [event_id, attendee_name, question_text] = params;
    const newQuestion = {
      id: crypto.randomUUID(),
      event_id,
      attendee_name,
      question_text,
      upvotes: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockDb.questions.push(newQuestion);
    return { rows: [newQuestion] };
  }

  if (normalizedText.includes('UPDATE questions') && normalizedText.includes('upvotes = upvotes + 1')) {
    const questionId = params[0];
    const qIdx = mockDb.questions.findIndex(q => q.id === questionId);
    if (qIdx !== -1) {
      mockDb.questions[qIdx].upvotes += 1;
      mockDb.questions[qIdx].updated_at = new Date().toISOString();
      return { rows: [mockDb.questions[qIdx]] };
    }
    return { rows: [] };
  }

  if (normalizedText.includes('FROM broadcasts') && normalizedText.includes('SELECT')) {
    const eventId = params[0];
    const filtered = mockDb.broadcasts.filter(b => b.event_id === eventId);
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return { rows: filtered };
  }

  if (normalizedText.includes('INSERT INTO broadcasts')) {
    const [eventId, subject, content, audience_cohort] = params;
    const newB = {
      id: crypto.randomUUID(),
      event_id: eventId,
      subject,
      content,
      audience_cohort,
      status: 'sending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockDb.broadcasts.push(newB);

    // Simulate SMTP delivery toggle in background
    setTimeout(() => {
      const found = mockDb.broadcasts.find(b => b.id === newB.id);
      if (found) {
        found.status = 'delivered';
        found.updated_at = new Date().toISOString();
      }
    }, 12000);

    return { rows: [newB] };
  }

  if (normalizedText.includes('UPDATE broadcasts') && normalizedText.includes("status = 'delivered'")) {
    const id = params[0];
    const found = mockDb.broadcasts.find(b => b.id === id);
    if (found) {
      found.status = 'delivered';
      found.updated_at = new Date().toISOString();
      return { rows: [found] };
    }
    return { rows: [] };
  }

  if (normalizedText.includes('UPDATE events') && (normalizedText.includes('trigger_registration_confirmation =') || normalizedText.includes('trigger_t_minus_24h ='))) {
    const [trgReg, trg24h, trg1h, trgPost, id] = params;
    const idx = mockDb.events.findIndex(e => e.id === id);
    if (idx !== -1) {
      mockDb.events[idx].trigger_registration_confirmation = trgReg;
      mockDb.events[idx].trigger_t_minus_24h = trg24h;
      mockDb.events[idx].trigger_t_minus_1h = trg1h;
      mockDb.events[idx].trigger_t_plus_24h = trgPost;
      mockDb.events[idx].updated_at = new Date().toISOString();
      return { rows: [mockDb.events[idx]] };
    }
    return { rows: [] };
  }

  // 6. Analytics intercepts
  if (normalizedText.includes('FROM registrations r') && normalizedText.includes('JOIN profiles p') && normalizedText.includes('SELECT')) {
    // Return a rich set of 14 mock registrations for analytics
    const now = Date.now();
    const mockRegs = [
      { id: 'mock-reg-id-1001', created_at: new Date(now - 1 * 24*3600*1000).toISOString(), registration_status: 'confirmed', has_checked_in: true, first_name: 'Alice', last_name: 'Johnson', email_address: 'alice@example.com', event_title: 'React 19 & Next.js Masterclass', event_id: 'mock-event-id-2222-3333-4444', maximum_capacity: 500 },
      { id: 'mock-reg-id-1002', created_at: new Date(now - 2 * 24*3600*1000).toISOString(), registration_status: 'confirmed', has_checked_in: true, first_name: 'Marcus', last_name: 'Aurelius', email_address: 'marcus@philosophy.org', event_title: 'Vora Inaugural Summit 2026', event_id: 'mock-event-id-1111-2222-3333', maximum_capacity: 1000 },
      { id: 'mock-reg-id-1003', created_at: new Date(now - 3 * 24*3600*1000).toISOString(), registration_status: 'confirmed', has_checked_in: false, first_name: 'Evelyn', last_name: 'Carter', email_address: 'evelyn@design.co', event_title: 'React 19 & Next.js Masterclass', event_id: 'mock-event-id-2222-3333-4444', maximum_capacity: 500 },
      { id: 'mock-reg-id-1004', created_at: new Date(now - 5 * 24*3600*1000).toISOString(), registration_status: 'confirmed', has_checked_in: true, first_name: 'Nikola', last_name: 'Tesla', email_address: 'tesla@alternating.net', event_title: 'Vora Inaugural Summit 2026', event_id: 'mock-event-id-1111-2222-3333', maximum_capacity: 1000 },
      { id: 'mock-reg-id-1005', created_at: new Date(now - 8 * 24*3600*1000).toISOString(), registration_status: 'cancelled', has_checked_in: false, first_name: 'Sarah', last_name: 'Jenkins', email_address: 'sarah@web.dev', event_title: 'React 19 & Next.js Masterclass', event_id: 'mock-event-id-2222-3333-4444', maximum_capacity: 500 },
      { id: 'mock-reg-id-1006', created_at: new Date(now - 12 * 24*3600*1000).toISOString(), registration_status: 'confirmed', has_checked_in: true, first_name: 'Leonardo', last_name: 'da Vinci', email_address: 'leo@renaissance.it', event_title: 'Vora Inaugural Summit 2026', event_id: 'mock-event-id-1111-2222-3333', maximum_capacity: 1000 },
      { id: 'mock-reg-id-1007', created_at: new Date(now - 15 * 24*3600*1000).toISOString(), registration_status: 'confirmed', has_checked_in: true, first_name: 'Ada', last_name: 'Lovelace', email_address: 'ada@computing.uk', event_title: 'React 19 & Next.js Masterclass', event_id: 'mock-event-id-2222-3333-4444', maximum_capacity: 500 },
      { id: 'mock-reg-id-1008', created_at: new Date(now - 20 * 24*3600*1000).toISOString(), registration_status: 'confirmed', has_checked_in: false, first_name: 'Albert', last_name: 'Einstein', email_address: 'albert@relativity.edu', event_title: 'React 19 & Next.js Masterclass', event_id: 'mock-event-id-2222-3333-4444', maximum_capacity: 500 },
      { id: 'mock-reg-id-1009', created_at: new Date(now - 25 * 24*3600*1000).toISOString(), registration_status: 'confirmed', has_checked_in: true, first_name: 'Grace', last_name: 'Hopper', email_address: 'grace@compiler.org', event_title: 'Vora Inaugural Summit 2026', event_id: 'mock-event-id-1111-2222-3333', maximum_capacity: 1000 },
      { id: 'mock-reg-id-1010', created_at: new Date(now - 28 * 24*3600*1000).toISOString(), registration_status: 'confirmed', has_checked_in: true, first_name: 'Marie', last_name: 'Curie', email_address: 'marie@radium.fr', event_title: 'React 19 & Next.js Masterclass', event_id: 'mock-event-id-2222-3333-4444', maximum_capacity: 500 },
      { id: 'mock-reg-id-1011', created_at: new Date(now - 35 * 24*3600*1000).toISOString(), registration_status: 'cancelled', has_checked_in: false, first_name: 'Charles', last_name: 'Darwin', email_address: 'darwin@origin.org', event_title: 'Vora Inaugural Summit 2026', event_id: 'mock-event-id-1111-2222-3333', maximum_capacity: 1000 },
      { id: 'mock-reg-id-1012', created_at: new Date(now - 45 * 24*3600*1000).toISOString(), registration_status: 'confirmed', has_checked_in: false, first_name: 'Galileo', last_name: 'Galilei', email_address: 'galileo@stars.it', event_title: 'React 19 & Next.js Masterclass', event_id: 'mock-event-id-2222-3333-4444', maximum_capacity: 500 },
      { id: 'mock-reg-id-1013', created_at: new Date(now - 60 * 24*3600*1000).toISOString(), registration_status: 'confirmed', has_checked_in: true, first_name: 'Isaac', last_name: 'Newton', email_address: 'newton@gravity.org', event_title: 'React 19 & Next.js Masterclass', event_id: 'mock-event-id-2222-3333-4444', maximum_capacity: 500 },
      { id: 'mock-reg-id-1014', created_at: new Date(now - 80 * 24*3600*1000).toISOString(), registration_status: 'confirmed', has_checked_in: true, first_name: 'Alan', last_name: 'Turing', email_address: 'turing@enigma.gov', event_title: 'Vora Inaugural Summit 2026', event_id: 'mock-event-id-1111-2222-3333', maximum_capacity: 1000 }
    ];

    let filtered = [...mockRegs];

    // Filter by EventId if passed
    if (normalizedText.includes('e.id = $2') || normalizedText.includes('e.id = $1')) {
      const evId = params[1] || params[0];
      if (evId && evId.length > 10) {
        filtered = filtered.filter(r => r.event_id === evId);
      }
    }

    // Filter by timeframe boundary
    let dateBoundStr = null;
    if (normalizedText.includes('created_at >= $3')) {
      dateBoundStr = params[2];
    } else if (normalizedText.includes('created_at >= $2')) {
      dateBoundStr = params[1];
    }
    if (dateBoundStr) {
      const bound = new Date(dateBoundStr);
      filtered = filtered.filter(r => new Date(r.created_at) >= bound);
    }

    return { rows: filtered };
  }

  if (normalizedText.includes('FROM resource_downloads rd') && normalizedText.includes('SELECT')) {
    return { rows: [{ download_count: 38 }] };
  }

  return { rows: [] };
}

let activeTxClient = null;
const txQueue = [];

async function acquireTxLock(client) {
  if (!activeTxClient || activeTxClient === client) {
    activeTxClient = client;
    return;
  }
  return new Promise(resolve => {
    txQueue.push({ client, resolve });
  });
}

function releaseTxLock(client) {
  if (activeTxClient === client) {
    activeTxClient = null;
    if (txQueue.length > 0) {
      const next = txQueue.shift();
      activeTxClient = next.client;
      next.resolve();
    }
  }
}

async function handleQueryPlanExplain(target, text, params, duration) {
  if (duration > 200) {
    let queryPlan = 'N/A';
    try {
      const trimmed = text?.trim().toLowerCase();
      const isExplainable = trimmed && (
        trimmed.startsWith('select') ||
        trimmed.startsWith('insert') ||
        trimmed.startsWith('update') ||
        trimmed.startsWith('delete')
      ) && !trimmed.startsWith('explain');

      if (isExplainable) {
        const explainRes = await target.query(`EXPLAIN ${text}`, params);
        queryPlan = explainRes.rows.map(r => r['QUERY PLAN'] || Object.values(r)[0]).join('\n');
      }
    } catch (err) {
      queryPlan = `Failed to generate query plan: ${err.message}`;
    }

    try {
      const loggerModule = await import('../services/loggerService.js');
      loggerModule.logger.warn({
        module: 'db.js',
        query: text,
        params,
        durationMs: duration,
        queryPlan
      }, `Slow database query detected: took ${duration}ms`);
    } catch (err) {
      console.warn('[Telemetry Warning] Failed to log slow query warning:', err.message);
    }
  }
}

// Proxy pool queries & connect methods to handle query execution when offline
const poolProxy = new Proxy(pool, {
  get(target, prop) {
    if (prop === 'query') {
      return function(text, params, callback) {
        if (queryMockOverride) {
          if (typeof callback !== 'function') {
            return queryMockOverride(text, params);
          }
          queryMockOverride(text, params)
            .then(res => callback(null, res))
            .catch(err => callback(err));
          return;
        }
        if (isOffline) {
          if (typeof callback !== 'function') {
            return mockQuery(text, params);
          }
          mockQuery(text, params)
            .then(res => callback(null, res))
            .catch(err => callback(err));
          return;
        }

        const start = Date.now();
        if (typeof callback === 'function') {
          return target.query(text, params, (err, res) => {
            const elapsed = Date.now() - start;
            if (!err) {
              handleQueryPlanExplain(target, text, params, elapsed).catch(() => {});
            }
            callback(err, res);
          });
        }

        const promise = target.query(text, params);
        if (promise && typeof promise.then === 'function') {
          return promise.then((res) => {
            const elapsed = Date.now() - start;
            handleQueryPlanExplain(target, text, params, elapsed).catch(() => {});
            return res;
          });
        }
        return promise;
      };
    }

    if (prop === 'connect') {
      return async function() {
        if (isOffline) {
          const clientMock = {
            query: async (text, params) => {
              const normalizedText = text.replace(/\s+/g, ' ').trim();
              if (normalizedText.startsWith('BEGIN')) {
                await acquireTxLock(clientMock);
              }
              try {
                return await mockQuery(text, params);
              } finally {
                if (normalizedText.startsWith('COMMIT') || normalizedText.startsWith('ROLLBACK')) {
                  releaseTxLock(clientMock);
                }
              }
            },
            release: () => {
              releaseTxLock(clientMock);
            }
          };
          return clientMock;
        }

        const clientReal = await target.connect();
        const clientProxy = new Proxy(clientReal, {
          get(cTarget, cProp) {
            if (cProp === 'query') {
              return function(text, params, callback) {
                const start = Date.now();
                if (typeof callback === 'function') {
                  return cTarget.query(text, params, (err, res) => {
                    const elapsed = Date.now() - start;
                    if (!err) {
                      handleQueryPlanExplain(cTarget, text, params, elapsed).catch(() => {});
                    }
                    callback(err, res);
                  });
                }
                const promise = cTarget.query(text, params);
                if (promise && typeof promise.then === 'function') {
                  return promise.then((res) => {
                    const elapsed = Date.now() - start;
                    handleQueryPlanExplain(cTarget, text, params, elapsed).catch(() => {});
                    return res;
                  });
                }
                return promise;
              };
            }
            return cTarget[cProp];
          }
        });
        return clientProxy;
      };
    }

    return target[prop];
  }
});

// Test the database connection on startup
if (process.env.NODE_ENV !== 'test') {
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('[Database] FATAL ERROR: PostgreSQL startup health-check ping failed! Terminating process.');
      console.error(err);
      process.exit(1);
    } else {
      console.log('[Database] PostgreSQL connection pool verified successfully.');
      console.log(`[Database] Server time is: ${res.rows[0].now}`);

      // Verify and create questions table if missing
      pool.query(`
        CREATE TABLE IF NOT EXISTS questions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
          attendee_name VARCHAR(255) NOT NULL,
          question_text TEXT NOT NULL,
          upvotes INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `, (tableErr) => {
        if (tableErr) {
          console.error('[Database] Failed to auto-create questions table:', tableErr.message);
        } else {
          console.log('[Database] Verified questions table availability.');
        }
      });

      // Verify and add refresh_tokens column if missing
      pool.query(`
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS refresh_tokens TEXT[] DEFAULT '{}'::TEXT[];
      `, (alterErr) => {
        if (alterErr) {
          console.error('[Database] Failed to verify/add refresh_tokens column to profiles table:', alterErr.message);
        } else {
          console.log('[Database] Verified refresh_tokens column availability in profiles table.');
        }
      });

      // Deploy compound indexes if missing
      pool.query(`
        CREATE INDEX IF NOT EXISTS idx_events_status_start ON events(status, start_timestamp);
      `, (idxErr1) => {
        if (idxErr1) {
          console.error('[Database] Failed to create index idx_events_status_start:', idxErr1.message);
        } else {
          console.log('[Database] Verified index idx_events_status_start availability.');
        }
      });

      pool.query(`
        CREATE INDEX IF NOT EXISTS idx_registrations_event_created ON registrations(event_id, created_at);
      `, (idxErr2) => {
        if (idxErr2) {
          console.error('[Database] Failed to create index idx_registrations_event_created:', idxErr2.message);
        } else {
          console.log('[Database] Verified index idx_registrations_event_created availability.');
        }
      });
    }
  });
}

export default poolProxy;
