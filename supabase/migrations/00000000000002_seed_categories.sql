-- Default donation categories
insert into donation_categories (name) values
  ('Cooked Meals'),
  ('Fruits'),
  ('Vegetables'),
  ('Bakery'),
  ('Packaged Food'),
  ('Dairy'),
  ('Beverages')
on conflict (name) do nothing;
