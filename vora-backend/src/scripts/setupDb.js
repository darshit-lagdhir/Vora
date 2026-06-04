import pool from '../config/db.js';

const setupDatabase = async () => {
  console.log('================================================================================');
  console.log('[Setup DB] Starting database schema generation and RLS setup...');
  console.log('================================================================================');

  const client = await pool.connect();

  try {
    // Run everything in a single transaction block for safety
    await client.query('BEGIN');

    // 1. Clean Slate: Drop tables in reverse relational order
    console.log('[Setup DB] Dropping existing tables (relational teardown)...');
    await client.query('DROP TABLE IF EXISTS resource_downloads CASCADE;');
    await client.query('DROP TABLE IF EXISTS resources CASCADE;');
    await client.query('DROP TABLE IF EXISTS registrations CASCADE;');
    await client.query('DROP TABLE IF EXISTS sessions CASCADE;');
    await client.query('DROP TABLE IF EXISTS events CASCADE;');
    await client.query('DROP TABLE IF EXISTS profiles CASCADE;');

    // 2. Create profiles table (linked to auth.users)
    console.log('[Setup DB] Creating table: profiles...');
    await client.query(`
      CREATE TABLE profiles (
        id UUID PRIMARY KEY,
        email_address VARCHAR(255) NOT NULL UNIQUE,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        platform_role VARCHAR(20) NOT NULL DEFAULT 'attendee' CHECK (platform_role IN ('attendee', 'organizer')),
        avatar_url VARCHAR(512),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_profiles_auth_users FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
      );
    `);

    // 3. Create events table
    console.log('[Setup DB] Creating table: events...');
    await client.query(`
      CREATE TABLE events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        start_timestamp TIMESTAMPTZ NOT NULL,
        end_timestamp TIMESTAMPTZ NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'active', 'cancelled', 'completed')),
        maximum_capacity INTEGER NOT NULL CHECK (maximum_capacity > 0),
        tags VARCHAR(100)[] DEFAULT '{}'::VARCHAR(100)[],
        banner_image_url VARCHAR(512),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT check_event_timestamps CHECK (end_timestamp > start_timestamp)
      );
    `);

    // 4. Create sessions table
    console.log('[Setup DB] Creating table: sessions...');
    await client.query(`
      CREATE TABLE sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        speaker_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
        session_title VARCHAR(255) NOT NULL,
        session_description TEXT,
        session_start_time TIMESTAMPTZ NOT NULL,
        session_end_time TIMESTAMPTZ NOT NULL,
        track_name VARCHAR(100),
        session_capacity_limit INTEGER CHECK (session_capacity_limit > 0),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT check_session_timestamps CHECK (session_end_time > session_start_time)
      );
    `);

    // 5. Create registrations table
    console.log('[Setup DB] Creating table: registrations...');
    await client.query(`
      CREATE TABLE registrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        attendee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        registration_status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (registration_status IN ('confirmed', 'waitlisted', 'cancelled')),
        has_checked_in BOOLEAN NOT NULL DEFAULT FALSE,
        ticket_hash VARCHAR(100) UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT unique_registration UNIQUE (event_id, attendee_id)
      );
    `);

    // 6. Create resources table
    console.log('[Setup DB] Creating table: resources...');
    await client.query(`
      CREATE TABLE resources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        uploader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        asset_name VARCHAR(255) NOT NULL,
        file_url VARCHAR(512) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes >= 0),
        visibility_clearance VARCHAR(20) NOT NULL DEFAULT 'public_accessible' CHECK (visibility_clearance IN ('public_accessible', 'attendees_only')),
        download_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 6b. Create resource_downloads telemetry table
    console.log('[Setup DB] Creating table: resource_downloads...');
    await client.query(`
      CREATE TABLE resource_downloads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
        attendee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        downloaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 7. Audit Timestamps: Create update trigger function & bind triggers
    console.log('[Setup DB] Registering auto-timestamp triggers...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    const tables = ['profiles', 'events', 'sessions', 'registrations', 'resources'];
    for (const table of tables) {
      await client.query(`
        CREATE TRIGGER update_${table}_modtime
        BEFORE UPDATE ON ${table}
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
      `);
    }

    // 8. Performance Optimization: Deploy B-Tree indexes on foreign keys and search keys
    console.log('[Setup DB] Deploying indexing strategy (foreign keys & lookups)...');
    await client.query('CREATE INDEX idx_profiles_email ON profiles(email_address);');
    await client.query('CREATE INDEX idx_events_organizer ON events(organizer_id);');
    await client.query('CREATE INDEX idx_events_start ON events(start_timestamp);');
    await client.query('CREATE INDEX idx_sessions_event ON sessions(event_id);');
    await client.query('CREATE INDEX idx_sessions_speaker ON sessions(speaker_id);');
    await client.query('CREATE INDEX idx_registrations_event ON registrations(event_id);');
    await client.query('CREATE INDEX idx_registrations_attendee ON registrations(attendee_id);');
    await client.query('CREATE INDEX idx_resources_event ON resources(event_id);');
    await client.query('CREATE INDEX idx_resources_uploader ON resources(uploader_id);');
    await client.query('CREATE INDEX idx_events_tags ON events(tags);');
    await client.query('CREATE INDEX idx_resource_downloads_resource ON resource_downloads(resource_id);');
    await client.query('CREATE INDEX idx_resource_downloads_attendee ON resource_downloads(attendee_id);');

    // 9. Row-Level Security: Enable RLS on all tables
    console.log('[Setup DB] Enabling Row-Level Security on all entities...');
    for (const table of tables) {
      await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
    }
    await client.query('ALTER TABLE resource_downloads ENABLE ROW LEVEL SECURITY;');

    // 10. RLS Policies Configuration
    console.log('[Setup DB] Injecting RLS access control policies...');

    // Profiles Policies
    await client.query(`
      CREATE POLICY select_profiles ON profiles FOR SELECT 
      TO authenticated 
      USING (true);
    `);
    await client.query(`
      CREATE POLICY insert_profiles ON profiles FOR INSERT 
      TO authenticated 
      WITH CHECK (auth.uid() = id);
    `);
    await client.query(`
      CREATE POLICY update_profiles ON profiles FOR UPDATE 
      TO authenticated 
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
    `);

    // Events Policies
    await client.query(`
      CREATE POLICY select_events ON events FOR SELECT 
      TO authenticated 
      USING (auth.uid() = organizer_id OR status IN ('published', 'active', 'completed'));
    `);
    await client.query(`
      CREATE POLICY insert_events ON events FOR INSERT 
      TO authenticated 
      WITH CHECK (
        auth.uid() = organizer_id 
        AND EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND platform_role = 'organizer'
        )
      );
    `);
    await client.query(`
      CREATE POLICY update_events ON events FOR UPDATE 
      TO authenticated 
      USING (auth.uid() = organizer_id)
      WITH CHECK (auth.uid() = organizer_id);
    `);
    await client.query(`
      CREATE POLICY delete_events ON events FOR DELETE 
      TO authenticated 
      USING (auth.uid() = organizer_id);
    `);

    // Sessions Policies
    await client.query(`
      CREATE POLICY select_sessions ON sessions FOR SELECT 
      TO authenticated 
      USING (
        EXISTS (
          SELECT 1 FROM events 
          WHERE id = sessions.event_id 
          AND (organizer_id = auth.uid() OR status IN ('published', 'active', 'completed'))
        )
      );
    `);
    await client.query(`
      CREATE POLICY insert_sessions ON sessions FOR INSERT 
      TO authenticated 
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM events 
          WHERE id = sessions.event_id AND organizer_id = auth.uid()
        )
      );
    `);
    await client.query(`
      CREATE POLICY update_sessions ON sessions FOR UPDATE 
      TO authenticated 
      USING (
        EXISTS (
          SELECT 1 FROM events 
          WHERE id = sessions.event_id AND organizer_id = auth.uid()
        )
      );
    `);
    await client.query(`
      CREATE POLICY delete_sessions ON sessions FOR DELETE 
      TO authenticated 
      USING (
        EXISTS (
          SELECT 1 FROM events 
          WHERE id = sessions.event_id AND organizer_id = auth.uid()
        )
      );
    `);

    // Registrations Policies
    await client.query(`
      CREATE POLICY select_registrations ON registrations FOR SELECT 
      TO authenticated 
      USING (
        attendee_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM events 
          WHERE id = registrations.event_id AND organizer_id = auth.uid()
        )
      );
    `);
    await client.query(`
      CREATE POLICY insert_registrations ON registrations FOR INSERT 
      TO authenticated 
      WITH CHECK (attendee_id = auth.uid());
    `);
    await client.query(`
      CREATE POLICY update_registrations ON registrations FOR UPDATE 
      TO authenticated 
      USING (
        attendee_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM events 
          WHERE id = registrations.event_id AND organizer_id = auth.uid()
        )
      );
    `);

    // Resources Policies
    await client.query(`
      CREATE POLICY select_resources ON resources FOR SELECT 
      TO authenticated 
      USING (
        visibility_clearance = 'public_accessible' 
        OR uploader_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM events 
          WHERE id = resources.event_id AND organizer_id = auth.uid()
        ) 
        OR EXISTS (
          SELECT 1 FROM registrations 
          WHERE event_id = resources.event_id 
          AND attendee_id = auth.uid() 
          AND registration_status = 'confirmed'
        )
      );
    `);
    await client.query(`
      CREATE POLICY insert_resources ON resources FOR INSERT 
      TO authenticated 
      WITH CHECK (
        uploader_id = auth.uid() 
        AND EXISTS (
          SELECT 1 FROM events 
          WHERE id = resources.event_id AND organizer_id = auth.uid()
        )
      );
    `);
    await client.query(`
      CREATE POLICY update_resources ON resources FOR UPDATE 
      TO authenticated 
      USING (
        uploader_id = auth.uid() 
        AND EXISTS (
          SELECT 1 FROM events 
          WHERE id = resources.event_id AND organizer_id = auth.uid()
        )
      );
    `);
    await client.query(`
      CREATE POLICY delete_resources ON resources FOR DELETE 
      TO authenticated 
      USING (
        uploader_id = auth.uid() 
        AND EXISTS (
          SELECT 1 FROM events 
          WHERE id = resources.event_id AND organizer_id = auth.uid()
        )
      );
    `);

    // Resource Downloads RLS Policies
    console.log('[Setup DB] Injecting resource_downloads RLS policies...');
    await client.query(`
      CREATE POLICY select_resource_downloads ON resource_downloads FOR SELECT 
      TO authenticated 
      USING (
        attendee_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM resources r
          WHERE r.id = resource_id AND r.uploader_id = auth.uid()
        )
      );
    `);

    await client.query(`
      CREATE POLICY insert_resource_downloads ON resource_downloads FOR INSERT 
      TO authenticated 
      WITH CHECK (
        auth.uid() = attendee_id
      );
    `);

    // Commit Transaction
    await client.query('COMMIT');
    console.log('================================================================================');
    console.log('[Setup DB] SUCCESS: Relational schema, indices, triggers, and RLS enabled.');
    console.log('================================================================================');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('================================================================================');
    console.error('[Setup DB] FATAL ERROR occurred during transaction setup. Rolling back changes.');
    console.error(error.message);
    console.error('================================================================================');
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
};

setupDatabase();
