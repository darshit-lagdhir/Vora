import request from 'supertest';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import app from '../../src/app.js';
import env from '../../src/config/env.js';
import { mockDb } from '../../src/config/db.js';

describe('Concurrency Transaction Integration Tests', () => {
  it('should process 20 concurrent registration requests safely, allowing exactly 5 registrations and blocking 15 with 409', async () => {
    // 1. Setup target event with engineered maximum capacity = 5
    const eventId = crypto.randomUUID();
    const organizerId = crypto.randomUUID();

    mockDb.events.push({
      id: eventId,
      organizer_id: organizerId,
      title: 'High-Demand Systems Architecture Summit',
      description: 'Concurrent transaction scaling under heavy load.',
      start_timestamp: new Date(Date.now() + 86400000).toISOString(), // future event
      end_timestamp: new Date(Date.now() + 90000000).toISOString(),
      status: 'published',
      maximum_capacity: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 2. Generate 20 unique attendees and sign their authentication sessions
    const numRequests = 20;
    const tokens = [];

    for (let i = 0; i < numRequests; i++) {
      const attId = crypto.randomUUID();
      mockDb.profiles.push({
        id: attId,
        email_address: `att_stress_${i}@vora.com`,
        first_name: 'Concurrent',
        last_name: `Attendee ${i}`,
        platform_role: 'attendee',
        avatar_url: null,
        notify_event_start: true,
        notify_weekly_digest: true,
        notify_marketing: false,
        refresh_tokens: [],
      });

      const token = jwt.sign({ sub: attId, role: 'attendee' }, env.JWT_SECRET, {
        expiresIn: '15m',
      });
      tokens.push(token);
    }

    // 3. Dispatch exactly 20 simultaneous registration POST requests in parallel
    const requestPromises = tokens.map((token) => {
      return request(app)
        .post('/api/v1/registrations')
        .set('Cookie', [`accessToken=${token}`])
        .send({ event_id: eventId });
    });

    const responses = await Promise.all(requestPromises);

    // 4. Mathematical assertions verifying transaction isolation limits
    const successResponses = responses.filter((res) => res.statusCode === 201);
    const conflictResponses = responses.filter((res) => res.statusCode === 409);

    expect(successResponses.length).toBe(5);
    expect(conflictResponses.length).toBe(15);

    // Ensure all success responses have valid ticket hash data
    successResponses.forEach((res) => {
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data.registration).toHaveProperty('ticket_hash');
      expect(res.body.data.registration.ticket_hash).toMatch(/^VORA-/);
    });

    // Verify registration table persistence in memory
    const totalRegistrationsInDb = mockDb.registrations.filter((r) => r.event_id === eventId);
    expect(totalRegistrationsInDb.length).toBe(5);
  });
});
