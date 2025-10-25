-- Create exchange_connections table for managing exchange API connections
CREATE TABLE IF NOT EXISTS exchange_connections (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  exchange_id INTEGER REFERENCES exchanges(id) ON DELETE CASCADE,
  api_type VARCHAR(50) NOT NULL, -- 'spot', 'perpetual_futures', 'delivery_futures', 'margin'
  connection_method VARCHAR(20) CHECK (connection_method IN ('rest', 'websocket', 'library')),
  library_package VARCHAR(100), -- Package name if using library method
  api_key TEXT NOT NULL,
  api_secret TEXT NOT NULL,
  api_passphrase TEXT, -- For exchanges that require it
  margin_type VARCHAR(20) DEFAULT 'cross' CHECK (margin_type IN ('cross', 'isolated')),
  position_mode VARCHAR(20) DEFAULT 'hedge' CHECK (position_mode IN ('hedge', 'one_way')),
  is_testnet BOOLEAN DEFAULT false,
  is_enabled BOOLEAN DEFAULT false,
  is_live_trade BOOLEAN DEFAULT false,
  last_test_at TIMESTAMP,
  last_test_status VARCHAR(20), -- 'success', 'failed'
  last_test_balance DECIMAL(20, 8),
  last_test_error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);

CREATE INDEX idx_exchange_connections_user ON exchange_connections(user_id);
CREATE INDEX idx_exchange_connections_exchange ON exchange_connections(exchange_id);
CREATE INDEX idx_exchange_connections_enabled ON exchange_connections(is_enabled);

-- Add trigger for updated_at
CREATE TRIGGER update_exchange_connections_updated_at BEFORE UPDATE ON exchange_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
