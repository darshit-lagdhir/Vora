import request from 'supertest';
import crypto from 'crypto';
import app from '../../src/app.js';
import { eventHub } from '../../src/utils/eventHub.js';

describe('SSE Connection Stream Lifecycle Integration Tests', () => {
  let server;
  let eventId;

  beforeAll((done) => {
    eventId = crypto.randomUUID();
    server = app.listen(0, done);
  });

  afterAll((done) => {
    if (typeof server.closeAllConnections === 'function') {
      server.closeAllConnections();
    }
    server.close(done);
  });

  it('should handshake successfully and stream mutation updates with correct formatting and clean up on close', (done) => {
    const port = server.address().port;
    const receivedChunks = [];

    // Initiate long-lived GET request to the event stream
    const req = request(`http://localhost:${port}`)
      .get(`/api/v1/events/${eventId}/stream`)
      .set('Accept', 'text/event-stream')
      .buffer(false);

    req.on('error', (err) => {
      // Suppress the expected abort error when req.abort() is called
    });

    req.catch((err) => {
      // Catch and suppress unhandled promise rejections from req.abort()
    });

    req.on('response', (res) => {
      // 1. Verify initial handshake response headers
      expect(res.headers['content-type']).toContain('text/event-stream');
      expect(res.headers['cache-control']).toContain('no-cache');
      expect(res.headers['connection']).toContain('keep-alive');

      res.on('data', (chunk) => {
        const rawString = chunk.toString();
        receivedChunks.push(rawString);

        const accumulated = receivedChunks.join('');
        // Check if the accumulated stream contains the mutation event
        if (accumulated.includes('ATTENDEE_COUNT_MUTATED')) {
          // 2. Assert SSE protocol specification format
          expect(accumulated).toContain('id: msg-');
          expect(accumulated).toContain('event: message');
          expect(accumulated).toContain('data: ');

          const dataLine = accumulated
            .split('\n')
            .find((line) => line.startsWith('data: ') && line.includes('ATTENDEE_COUNT_MUTATED'));
          expect(dataLine).toBeDefined();

          const jsonData = JSON.parse(dataLine.substring(6));
          expect(jsonData.eventType).toBe('ATTENDEE_COUNT_MUTATED');
          expect(jsonData.payload.confirmedCount).toBe(99);

          // 3. Force disconnect to verify cleanup hook logic
          res.destroy();
          done();
        }
      });

      // 4. Emit mutation update asynchronously to trigger broadcast
      setTimeout(() => {
        eventHub.emit('event_mutate', {
          eventId,
          eventType: 'ATTENDEE_COUNT_MUTATED',
          payload: { confirmedCount: 99 },
        });
      }, 200);
    });
  });
});
