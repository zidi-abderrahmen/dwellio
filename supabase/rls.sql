alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.property_images enable row level security;
alter table public.favorites enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

-- profiles: any logged-in user can read (owner name/phone), edit only own
create policy profiles_select on public.profiles for select to authenticated using (true);
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- properties
create policy properties_select on public.properties for select to authenticated
  using (status = 'active' or owner_id = auth.uid());
create policy properties_select_public on public.properties for select to anon
  using (status = 'active');
create policy properties_insert on public.properties for insert to authenticated
  with check (owner_id = auth.uid());
create policy properties_update on public.properties for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy properties_delete on public.properties for delete to authenticated
  using (owner_id = auth.uid());

-- property_images
create policy images_select on public.property_images for select to authenticated using (true);
create policy images_select_public on public.property_images for select to anon
  using (exists (
    select 1 from public.properties p
    where p.id = property_id and p.status = 'active'
  ));
create policy images_insert on public.property_images for insert to authenticated
  with check (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()));
create policy images_delete on public.property_images for delete to authenticated
  using (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()));

-- favorites: private to the user
create policy favorites_all on public.favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- chats: only the two participants
create policy chats_select on public.chats for select to authenticated
  using (auth.uid() in (buyer_id, owner_id));
create policy chats_insert on public.chats for insert to authenticated
  with check (buyer_id = auth.uid()
    and owner_id = (select p.owner_id from public.properties p where p.id = property_id));

-- messages: only participants of the chat
create policy messages_select on public.messages for select to authenticated
  using (exists (select 1 from public.chats c where c.id = chat_id and auth.uid() in (c.buyer_id, c.owner_id)));
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = auth.uid()
    and exists (select 1 from public.chats c where c.id = chat_id and auth.uid() in (c.buyer_id, c.owner_id)));
create policy messages_update on public.messages for update to authenticated
  using (sender_id <> auth.uid()
    and exists (select 1 from public.chats c where c.id = chat_id and auth.uid() in (c.buyer_id, c.owner_id)));

-- notifications: private to the recipient (rows are created by triggers)
create policy notifications_select on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());