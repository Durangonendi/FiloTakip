-- Kontrol Masası — SIFIRDAN kurulum (yeni Supabase projesi için TEK script)
-- Bunu supabase_migration.sql yerine kullan, ikisine birden gerek yok.

create table if not exists araclar (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  ad text not null,
  tur text,
  plaka text,
  sayac_tipi text default 'saat', -- saat | km
  guncel_sayac numeric default 0,
  bakim_araligi numeric,
  son_bakim_sayac numeric default 0,
  aktif boolean default true,
  created_at timestamptz default now()
);

create table if not exists calisma_kayitlari (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  arac_id uuid references araclar(id) on delete cascade,
  tarih date not null,
  calisma_miktari numeric default 0,
  sayac_degeri numeric,
  mazot_litre numeric default 0,
  mazot_tl numeric default 0,
  diger_gider numeric default 0,
  kazanc numeric default 0,
  aciklama text,
  created_at timestamptz default now()
);

create table if not exists kartlar (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  ad text not null,
  tur text default 'kredi_karti', -- kredi_karti | banka_hesabi | nakit
  bakiye numeric default 0,
  son_odeme_gunu integer, -- ayın kaçında (1-31)
  created_at timestamptz default now()
);

create table if not exists giderler (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  tarih date not null,
  kategori text not null,
  aciklama text,
  tutar numeric not null,
  arac_id uuid references araclar(id) on delete set null,
  kart_id uuid references kartlar(id) on delete set null,
  odeme_yontemi text default 'Nakit',
  created_at timestamptz default now()
);

create table if not exists gelirler (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  tarih date not null,
  aciklama text,
  tutar numeric not null,
  arac_id uuid references araclar(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists envanter (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  urun_adi text not null,
  birim text default 'adet',
  miktar numeric default 0,
  min_uyari_seviyesi numeric,
  created_at timestamptz default now()
);

create table if not exists hatirlaticilar (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  tur text not null,
  aciklama text,
  hedef_tarih date,
  tekrar text default 'tek_seferlik', -- tek_seferlik | aylik | yillik
  arac_id uuid references araclar(id) on delete cascade,
  hedef_sayac numeric,
  aktif boolean default true,
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
  tur text not null check (tur in ('borc', 'alacak')),
  kisi text not null,
  tutar numeric not null,
  aciklama text,
  vade_tarihi date,
  odendi boolean default false,
  created_at timestamptz default now()
);

-- RLS: her kullanıcı sadece kendi verisini görür/değiştirir
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
