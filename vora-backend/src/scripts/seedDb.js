import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

// Random data generators
const firstNames = ['John', 'Sarah', 'Alex', 'David', 'Emily', 'Jessica', 'James', 'Robert', 'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Joseph', 'Thomas', 'Charles', 'Christopher', 'Matthew'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Wilson', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Hernandez', 'Moore', 'Martin', 'Jackson', 'Thompson', 'White'];
const techKeywords = ['Quantum', 'Serverless', 'React', 'Kubernetes', 'Cybersecurity', 'Database', 'Microservices', 'API Design', 'DevOps', 'Machine Learning'];
const eventNouns = ['Summit', 'Masterclass', 'Panel', 'Conference', 'Workshop', 'Forum', 'Symposium', 'Keynote', 'Briefing', 'Bootcamp'];

const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

const seedDatabase = async () => {
  console.log('================================================================================');
  console.log('[Seed DB] Starting relational mock data generation...');
  console.log('================================================================================');

  const client = await pool.connect();
  const passwordHash = bcrypt.hashSync('password123', 10);

  try {
    await client.query('BEGIN');

    // --- PHASE 1: ERADICATION (Reverse order) ---
    console.log('[Seed DB] Wiping existing data (cascade cleanup)...');
    await client.query('DELETE FROM resources;');
    await client.query('DELETE FROM registrations;');
    await client.query('DELETE FROM sessions;');
    await client.query('DELETE FROM events;');
    await client.query('DELETE FROM public.profiles;');
    // Purge corresponding auth users to avoid unique constraints collision
    await client.query("DELETE FROM auth.users WHERE email LIKE '%@vora.com' OR email LIKE '%@example.com';");

    // --- PHASE 2: PROFILES (3 Organizers, 50 Attendees) ---
    console.log('[Seed DB] Generating user identities...');
    const organizerIds = [];
    const attendeeIds = [];

    // Seed 3 Organizers
    const organizersData = [
      { email: 'organizer1@vora.com', firstName: 'Michael', lastName: 'Scott' },
      { email: 'organizer2@vora.com', firstName: 'Evelyn', lastName: 'Wright' },
      { email: 'organizer3@vora.com', firstName: 'Daniel', lastName: 'Carter' },
    ];

    for (const org of organizersData) {
      const id = crypto.randomUUID();
      // Insert into auth.users schema first to bypass foreign key constraint
      await client.query(`
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, aud, role, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), 'authenticated', 'authenticated', NOW(), NOW())
      `, [id, org.email, passwordHash]);

      // Insert into public.profiles schema
      await client.query(`
        INSERT INTO public.profiles (id, email_address, first_name, last_name, platform_role, avatar_url)
        VALUES ($1, $2, $3, $4, 'organizer', $5)
      `, [id, org.email, org.firstName, org.lastName, `https://api.dicebear.com/7.x/bottts/svg?seed=${org.firstName}`]);

      organizerIds.push(id);
    }

    // Seed 50 Attendees
    for (let i = 1; i <= 50; i++) {
      const id = crypto.randomUUID();
      const firstName = getRandomElement(firstNames);
      const lastName = getRandomElement(lastNames);
      const email = `attendee${i}@example.com`;

      await client.query(`
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, aud, role, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), 'authenticated', 'authenticated', NOW(), NOW())
      `, [id, email, passwordHash]);

      await client.query(`
        INSERT INTO public.profiles (id, email_address, first_name, last_name, platform_role, avatar_url)
        VALUES ($1, $2, $3, $4, 'attendee', $5)
      `, [id, email, firstName, lastName, `https://api.dicebear.com/7.x/adventurer/svg?seed=${firstName}${i}`]);

      attendeeIds.push(id);
    }
    console.log(`[Seed DB] Seeded ${organizerIds.length} Organizers and ${attendeeIds.length} Attendees.`);

    // --- PHASE 3: EVENTS (10 Virtual Events) ---
    console.log('[Seed DB] Synthesizing virtual webinars and conferences...');
    const eventIds = [];
    const now = new Date();

    const eventConfigurations = [
      // 4 Past Events (Completed)
      { daysOffset: -15, durationHours: 4, status: 'completed', maxCapacity: 100 },
      { daysOffset: -10, durationHours: 6, status: 'completed', maxCapacity: 120 },
      { daysOffset: -5,  durationHours: 3, status: 'completed', maxCapacity: 80 },
      { daysOffset: -2,  durationHours: 5, status: 'completed', maxCapacity: 150 },
      // 2 Present Events (Active)
      { daysOffset: 0,   durationHours: 8, status: 'active',    maxCapacity: 200 },
      { daysOffset: 0,   durationHours: 4, status: 'active',    maxCapacity: 100 },
      // 3 Future Events (Published)
      { daysOffset: 10,  durationHours: 5, status: 'published', maxCapacity: 150 },
      { daysOffset: 20,  durationHours: 6, status: 'published', maxCapacity: 250 },
      { daysOffset: 30,  durationHours: 3, status: 'published', maxCapacity: 100 },
      // 1 Future Draft Event
      { daysOffset: 45,  durationHours: 4, status: 'draft',     maxCapacity: 50 },
    ];

    for (let i = 0; i < eventConfigurations.length; i++) {
      const config = eventConfigurations[i];
      const eventId = crypto.randomUUID();
      const organizerId = getRandomElement(organizerIds);
      
      const title = `Vora ${getRandomElement(techKeywords)} ${getRandomElement(eventNouns)} 2026`;
      const description = `This is a comprehensive virtual briefing covering the latest standards, development guides, and architecture scaling mechanisms of ${title}. Join industry leaders for direct breakout sessions and Q&A slots.`;
      
      // Calculate start and end times
      const startTime = new Date(now.getTime() + config.daysOffset * 24 * 60 * 60 * 1000);
      startTime.setHours(9, 0, 0, 0); // Start at 9:00 AM
      const endTime = new Date(startTime.getTime() + config.durationHours * 60 * 60 * 1000);

      const numTags = Math.floor(Math.random() * 2) + 1;
      const eventTags = [];
      while (eventTags.length < numTags) {
        const t = getRandomElement(techKeywords);
        if (!eventTags.includes(t)) eventTags.push(t);
      }

      await client.query(`
        INSERT INTO events (id, organizer_id, title, description, start_timestamp, end_timestamp, status, maximum_capacity, banner_image_url, tags)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        eventId,
        organizerId,
        title,
        description,
        startTime.toISOString(),
        endTime.toISOString(),
        config.status,
        config.maxCapacity,
        `https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=60`,
        eventTags
      ]);

      eventIds.push({ id: eventId, startTime, endTime, status: config.status, maxCapacity: config.maxCapacity });
    }
    console.log(`[Seed DB] Seeded ${eventIds.length} virtual event records.`);

    // --- PHASE 4: SESSIONS (3-5 Breakout Sessions per Event) ---
    console.log('[Seed DB] Designing multi-track breakout sessions...');
    const tracks = ['Frontend Development Track', 'Backend Systems Track', 'Security Arena', 'General Q&A Track'];

    for (const event of eventIds) {
      // Exclude draft events from having detailed session seed entries for realism
      if (event.status === 'draft') continue;

      const sessionCount = Math.floor(Math.random() * 3) + 3; // 3 to 5 sessions
      const eventDurationMs = event.endTime.getTime() - event.startTime.getTime();
      const sessionDurationMs = Math.floor(eventDurationMs / sessionCount);

      for (let s = 0; s < sessionCount; s++) {
        const sessionId = crypto.randomUUID();
        const speakerId = getRandomElement(attendeeIds.concat(organizerIds)); // Anyone can be a speaker
        
        const sessionTitle = `${getRandomElement(techKeywords)} In-depth Session #${s + 1}`;
        const sessionDescription = `Detailed lecture session targeting development paradigms, code optimizations, and structural workflows of ${sessionTitle}.`;
        
        const sessionStart = new Date(event.startTime.getTime() + s * sessionDurationMs);
        const sessionEnd = new Date(sessionStart.getTime() + sessionDurationMs - 10 * 60 * 1000); // 10 minute buffer

        await client.query(`
          INSERT INTO sessions (id, event_id, speaker_id, session_title, session_description, session_start_time, session_end_time, track_name, session_capacity_limit)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          sessionId,
          event.id,
          speakerId,
          sessionTitle,
          sessionDescription,
          sessionStart.toISOString(),
          sessionEnd.toISOString(),
          getRandomElement(tracks),
          Math.floor(event.maxCapacity / 2) // breakout room limit
        ]);
      }
    }
    console.log('[Seed DB] Seeded breakout tracks and speaker assignments.');

    // --- PHASE 5: REGISTRATIONS (~150 ticket allocations) ---
    console.log('[Seed DB] Registering attendees and booking tickets...');
    const registeredPairs = new Set();
    let totalRegistrations = 0;

    // Filter events that attendees can register for (exclude draft)
    const activeAndFutureEvents = eventIds.filter(e => e.status !== 'draft');

    for (const event of activeAndFutureEvents) {
      // Determine how many registrations we will seed (random, up to maxCapacity or 30 attendees)
      const targetRegCount = Math.min(event.maxCapacity - 5, Math.floor(Math.random() * 20) + 15);
      let eventRegCount = 0;

      // Shuffle attendee IDs to random distribution
      const shuffledAttendees = [...attendeeIds].sort(() => 0.5 - Math.random());

      for (const attendeeId of shuffledAttendees) {
        if (eventRegCount >= targetRegCount) break;

        const pairKey = `${event.id}-${attendeeId}`;
        if (registeredPairs.has(pairKey)) continue;

        const regId = crypto.randomUUID();
        const regStatus = Math.random() > 0.05 ? 'confirmed' : 'cancelled';
        const hasCheckedIn = event.status === 'completed' && regStatus === 'confirmed' && Math.random() > 0.3;

        const ticketHash = regStatus === 'confirmed'
          ? 'VORA-' + crypto.createHash('sha256').update(crypto.randomUUID()).digest('hex').substring(0, 16).toUpperCase() + '-' + crypto.randomBytes(4).toString('hex').toUpperCase()
          : null;

        await client.query(`
          INSERT INTO registrations (id, event_id, attendee_id, registration_status, has_checked_in, ticket_hash)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [regId, event.id, attendeeId, regStatus, hasCheckedIn, ticketHash]);

        registeredPairs.add(pairKey);
        eventRegCount++;
        totalRegistrations++;
      }
    }
    console.log(`[Seed DB] Registered ${totalRegistrations} tickets in total.`);

    // --- PHASE 6: RESOURCES (Post-Event Digital Assets) ---
    console.log('[Seed DB] Distributing digital resources for completed events...');
    const fileMimeTypes = [
      { name: 'Architecture Slides.pdf', mime: 'application/pdf', ext: 'pdf' },
      { name: 'API Specifications.json', mime: 'application/json', ext: 'json' },
      { name: 'Reference Materials.zip', mime: 'application/zip', ext: 'zip' }
    ];

    const completedEvents = eventIds.filter(e => e.status === 'completed');

    for (const event of completedEvents) {
      // Find uploader (active organizer of the event)
      // Query events table directly for organizer id
      const eventDetails = await client.query('SELECT organizer_id FROM events WHERE id = $1', [event.id]);
      const uploaderId = eventDetails.rows[0].organizer_id;

      // Seed 2 resources per completed event
      for (let r = 0; r < 2; r++) {
        const resourceId = crypto.randomUUID();
        const fileType = fileMimeTypes[r % fileMimeTypes.length];
        
        const assetName = `${event.status === 'completed' ? 'Completed' : 'Draft'} ${fileType.name}`;
        const fileUrl = `https://supabase-storage-mock.vora.com/events/${event.id}/${resourceId}.${fileType.ext}`;
        const visibility = r === 0 ? 'public_accessible' : 'attendees_only';

        await client.query(`
          INSERT INTO resources (id, event_id, uploader_id, asset_name, file_url, mime_type, file_size_bytes, visibility_clearance)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          resourceId,
          event.id,
          uploaderId,
          assetName,
          fileUrl,
          fileType.mime,
          Math.floor(Math.random() * 5000000) + 1000000, // 1MB - 6MB
          visibility
        ]);
      }
    }
    console.log('[Seed DB] Populated slide decks, zip archives, and visibility clearance nodes.');

    await client.query('COMMIT');
    console.log('================================================================================');
    console.log('[Seed DB] SUCCESS: Mock database seeding completed.');
    console.log('================================================================================');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('================================================================================');
    console.error('[Seed DB] FATAL ERROR occurred during transaction seeding. Rolling back.');
    console.error(error.message);
    console.error('================================================================================');
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
};

seedDatabase();
