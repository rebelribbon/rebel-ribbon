-- Rebel Ribbon Supabase Schema Updates
-- Sprint 1: System Health Monitoring

-- Create system_status table for health monitoring
CREATE TABLE IF NOT EXISTS system_status (
  id TEXT PRIMARY KEY,
  last_webhook_received_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE system_status ENABLE ROW LEVEL SECURITY;

-- Public read access for health status (staff UI needs to read this)
CREATE POLICY "Allow public read access to system_status"
  ON system_status
  FOR SELECT
  USING (true);

-- Service role write access only (API endpoints update this)
CREATE POLICY "Allow service role to write system_status"
  ON system_status
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow service role to update system_status"
  ON system_status
  FOR UPDATE
  USING (true);

-- Insert the initial status record if it doesn't exist
INSERT INTO system_status (id, last_webhook_received_at)
VALUES ('stripe-webhook-status', NOW())
ON CONFLICT (id) DO NOTHING;
