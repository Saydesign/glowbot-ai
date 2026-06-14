CREATE TABLE orders (
  id uuid default gen_random_uuid() primary key,
  order_number text,
  customer_name text,
  phone text,
  address text,
  items jsonb,
  total integer,
  status text default 'pending',
  created_at timestamp default now()
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- RLS policies for authenticated users (anon key is treated as authenticated)
CREATE POLICY "select_orders" ON orders FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "insert_orders" ON orders FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "update_orders" ON orders FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "delete_orders" ON orders FOR DELETE
  TO authenticated USING (true);

-- Create index for faster queries
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_status ON orders(status);
