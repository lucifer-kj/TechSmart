-- Create customer ban history table
CREATE TABLE IF NOT EXISTS customer_ban_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  banned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ban_reason TEXT NOT NULL,
  banned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unbanned_at TIMESTAMP WITH TIME ZONE,
  unbanned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  unban_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_customer_ban_history_customer_id ON customer_ban_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_ban_history_banned_at ON customer_ban_history(banned_at);
CREATE INDEX IF NOT EXISTS idx_customer_ban_history_banned_by ON customer_ban_history(banned_by);

-- Create job status changes table for audit trail
CREATE TABLE IF NOT EXISTS job_status_changes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  change_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for job status changes
CREATE INDEX IF NOT EXISTS idx_job_status_changes_job_id ON job_status_changes(job_id);
CREATE INDEX IF NOT EXISTS idx_job_status_changes_changed_at ON job_status_changes(changed_at);
CREATE INDEX IF NOT EXISTS idx_job_status_changes_changed_by ON job_status_changes(changed_by);

-- Enable RLS on new tables
ALTER TABLE customer_ban_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_status_changes ENABLE ROW LEVEL SECURITY;

-- RLS policies for customer_ban_history
CREATE POLICY "Admins can view all ban history" ON customer_ban_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert ban history" ON customer_ban_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update ban history" ON customer_ban_history
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- RLS policies for job_status_changes
CREATE POLICY "Admins can view all job status changes" ON job_status_changes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert job status changes" ON job_status_changes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_customer_ban_history_updated_at 
  BEFORE UPDATE ON customer_ban_history 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_status_changes_updated_at 
  BEFORE UPDATE ON job_status_changes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
