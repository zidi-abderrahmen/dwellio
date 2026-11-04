create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  description text,
  listing_type text not null check (listing_type in ('sale','rent')),
  property_type text not null check (property_type in ('apartment','house','villa','land','office','shop')),
  price numeric(12,2) not null check (price >= 0),
  surface_m2 integer check (surface_m2 > 0),
  rooms integer check (rooms >= 0),
  bathrooms integer check (bathrooms >= 0),
  city text not null,
  address text,
  latitude double precision,
  longitude double precision,
  status text not null default 'active' check (status in ('active','sold','rented','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index properties_city_idx on public.properties (city);
create index properties_price_idx on public.properties (price);
create index properties_filter_idx on public.properties (listing_type, property_type, status);

create table public.property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  image_url text not null,
  storage_path text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index property_images_property_idx on public.property_images (property_id, position);

create table public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, property_id)
);

create table public.chats (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (property_id, buyer_id),
  check (buyer_id <> owner_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index messages_chat_idx on public.messages (chat_id, created_at);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('new_message','favorite_added','system')),
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- Triggers and functions
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger properties_updated before update on public.properties
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_new_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_recipient uuid; v_title text; v_sender text;
begin
  select case when c.buyer_id = new.sender_id then c.owner_id else c.buyer_id end, p.title
    into v_recipient, v_title
    from public.chats c join public.properties p on p.id = c.property_id
    where c.id = new.chat_id;
  select coalesce(nullif(full_name, ''), 'Someone') into v_sender
    from public.profiles where id = new.sender_id;
  insert into public.notifications (user_id, type, title, body, data)
  values (v_recipient, 'new_message', 'New message from ' || v_sender, left(new.content, 100),
          jsonb_build_object('chat_id', new.chat_id, 'property_title', v_title));
  update public.chats set last_message_at = now() where id = new.chat_id;
  return new;
end; $$;
create trigger on_message_created after insert on public.messages
  for each row execute function public.handle_new_message();

create or replace function public.handle_new_favorite()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text;
begin
  select owner_id, title into v_owner, v_title from public.properties where id = new.property_id;
  if v_owner is not null and v_owner <> new.user_id then
    insert into public.notifications (user_id, type, title, body, data)
    values (v_owner, 'favorite_added', 'Someone saved your property', v_title,
            jsonb_build_object('property_id', new.property_id));
  end if;
  return new;
end; $$;
create trigger on_favorite_created after insert on public.favorites
  for each row execute function public.handle_new_favorite();