-- Kontrol Masası — çok kullanıcılı (multi-tenant) geçiş migrasyonu
-- Her kullanıcı kendi verisini görür (user_id = auth.uid())

-- 1) Mevcut tablolara user_id ekle
alter table if exists araclar add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table if exists calisma_kayitlari add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table if exists giderler add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table if exists gelirler add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table if exists envanter add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table if exists hatirlaticilar add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- 2) Yeni tablolar
create table if not exists kartlar (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  ad text not null,
  tur text default 'kredi_karti', -- kredi_karti | banka_hesabi | nakit
  bakiye numeric default 0,
  son_odeme_gunu integer, -- ayın kaçında (1-31), sadece kredi kartı için
  created_at timestamptz default now()
);

create table if not exists butceler (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  kategori text not null,
  aylik_limit numeric not null,
  created_at timestamptz default now()
);

create table if not exists borclar (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  tur text not null check (tur in ('borc', 'alacak')), -- borc = ben ödeyeceğim, alacak = bana ödenecek
  kisi text not null,
  tutar numeric not null,
  aciklama text,
  vade_tarihi date,
  odendi boolean default false,
  created_at timestamptz default now()
);

-- 3) RLS aç ve politika ekle (her tablo için aynı desen: sadece kendi verin)
do $$
declare
  t text;
begin
  foreach t in array array['araclar','calisma_kayitlari','giderler','gelirler','envanter','hatirlaticilar','kartlar','butceler','borclar']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "own_select_%1$s" on %1$I;', t);
    execute format('create policy "own_select_%1$s" on %1$I for select using (auth.uid() = user_id);', t);
    execute format('drop policy if exists "own_insert_%1$s" on %1$I;', t);
    execute format('create policy "own_insert_%1$s" on %1$I for insert with check (auth.uid() = user_id);', t);
    execute format('drop policy if exists "own_update_%1$s" on %1$I;', t);
    execute format('create policy "own_update_%1$s" on %1$I for update using (auth.uid() = user_id);', t);
    execute format('drop policy if exists "own_delete_%1$s" on %1$I;', t);
    execute format('create policy "own_delete_%1$s" on %1$I for delete using (auth.uid() = user_id);', t);
  end loop;
end $$;
