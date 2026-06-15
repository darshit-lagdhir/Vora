import { MongoMemoryServer } from 'mongodb-memory-server';
import { mockDb } from '../../src/config/db.js';

let mongoServer;

beforeAll(async () => {
  // Spin up isolated, in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  // Override process.env.DATABASE_URL
  process.env.DATABASE_URL = uri;
});

beforeEach(async () => {
  // Clean mockDb in-memory database store completely before each test
  mockDb.users = [];
  mockDb.profiles = [];
  mockDb.events = [];
  mockDb.sessions = [];
  mockDb.registrations = [];
  mockDb.resources = [];
  mockDb.questions = [];
  mockDb.broadcasts = [];
});

afterAll(async () => {
  // Terminate in-memory MongoDB server and clean up resources
  if (mongoServer) {
    await mongoServer.stop();
  }
});
