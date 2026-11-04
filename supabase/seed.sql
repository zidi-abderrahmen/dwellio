insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true), ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy storage_read on storage.objects for select
  using (bucket_id in ('property-images', 'avatars'));
create policy storage_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('property-images', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);
create policy storage_update on storage.objects for update to authenticated
  using (bucket_id in ('property-images', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);
create policy storage_delete on storage.objects for delete to authenticated
  using (bucket_id in ('property-images', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);

alter publication supabase_realtime add table public.messages, public.notifications;

-- Seed (run AFTER creating at least one test user): 4 sample listings
insert into public.properties (owner_id, title, description, listing_type, property_type, price, surface_m2, rooms, bathrooms, city, address, latitude, longitude)
select id, t.title, t.descr, t.lt, t.pt, t.price, t.surf, t.rooms, t.baths, t.city, t.addr, t.lat, t.lng
from (select id from public.profiles order by created_at limit 1) o,
(values
  ('Bright 3-room apartment', 'Renovated, close to the beach.', 'rent', 'apartment', 1800, 95, 3, 1, 'La Marsa', 'Centre ville', 36.8782, 10.3247),
  ('Modern villa with garden', 'Quiet street, garage, 4 bedrooms.', 'sale', 'villa', 850000, 320, 6, 3, 'Hammamet', 'Zone touristique', 36.4000, 10.6167),
  ('Office in business district', 'Open space, parking.', 'rent', 'office', 3200, 120, 4, 2, 'Tunis', 'Les Berges du Lac', 36.8330, 10.2330),
  ('Building land 500 m2', 'Ready to build, all documents.', 'sale', 'land', 210000, 500, 0, 0, 'Sousse', 'Khezama', 35.8256, 10.6084)
) as t(title, descr, lt, pt, price, surf, rooms, baths, city, addr, lat, lng);