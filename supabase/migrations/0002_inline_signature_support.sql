alter table firmas
  alter column archivo_id drop not null;

alter table firmas
  add column if not exists data_url text;
