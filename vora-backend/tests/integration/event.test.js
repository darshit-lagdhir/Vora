import request from 'supertest';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import app from '../../src/app.js';
import env from '../../src/config/env.js';
import { mockDb } from '../../src/config/db.js';

describe('Event Integration Tests', () => {
  let organizerToken;
  let attendeeToken;
  let organizerId;
  let attendeeId;

  beforeEach(() => {
    // Generate new UUIDs
    organizerId = crypto.randomUUID();
    attendeeId = crypto.randomUUID();

    // Populate mock profiles
    mockDb.profiles.push(
      {
        id: organizerId,
        email_address: 'organizer@vora.com',
        first_name: 'Jane',
        last_name: 'Organizer',
        platform_role: 'organizer',
        avatar_url: null,
        notify_event_start: true,
        notify_weekly_digest: true,
        notify_marketing: false,
        refresh_tokens: [],
      },
      {
        id: attendeeId,
        email_address: 'attendee@vora.com',
        first_name: 'John',
        last_name: 'Attendee',
        platform_role: 'attendee',
        avatar_url: null,
        notify_event_start: true,
        notify_weekly_digest: true,
        notify_marketing: false,
        refresh_tokens: [],
      }
    );

    // Sign authentication access tokens
    organizerToken = jwt.sign({ sub: organizerId, role: 'organizer' }, env.JWT_SECRET, {
      expiresIn: '15m',
    });

    attendeeToken = jwt.sign({ sub: attendeeId, role: 'attendee' }, env.JWT_SECRET, {
      expiresIn: '15m',
    });
  });

  describe('POST /api/v1/events', () => {
    it('should block unauthenticated user with 401 response', async () => {
      const res = await request(app)
        .post('/api/v1/events')
        .send({
          title: 'Unauthorized Event',
          start_timestamp: new Date(Date.now() + 3600000).toISOString(),
          end_timestamp: new Date(Date.now() + 7200000).toISOString(),
          maximum_capacity: 50,
        });

      expect(res.statusCode).toBe(401);
    });

    it('should block attendee and return 403 (RBAC guard)', async () => {
      const res = await request(app)
        .post('/api/v1/events')
        .set('Cookie', [`accessToken=${attendeeToken}`])
        .send({
          title: 'Attendee Event Creation',
          start_timestamp: new Date(Date.now() + 3600000).toISOString(),
          end_timestamp: new Date(Date.now() + 7200000).toISOString(),
          maximum_capacity: 50,
        });

      expect(res.statusCode).toBe(403);
    });

    it('should allow organizer to build event and populate default properties', async () => {
      const payload = {
        title: 'Vora Core Infrastructure Deep-dive',
        description: 'Hardening and persistent locking presentation.',
        start_timestamp: new Date(Date.now() + 3600000).toISOString(),
        end_timestamp: new Date(Date.now() + 7200000).toISOString(),
        maximum_capacity: 200,
        banner_image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
      };

      const res = await request(app)
        .post('/api/v1/events')
        .set('Cookie', [`accessToken=${organizerToken}`])
        .send(payload);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.title).toBe(payload.title);
      expect(res.body.data.organizer_id).toBe(organizerId);
      expect(res.body.data.status).toBe('draft'); // Default state is draft

      // Check record created inside the mock database
      const dbEvent = mockDb.events.find((e) => e.id === res.body.data.id);
      expect(dbEvent).toBeDefined();
      expect(dbEvent.title).toBe(payload.title);
      expect(dbEvent.maximum_capacity).toBe(payload.maximum_capacity);
    });
  });
});
