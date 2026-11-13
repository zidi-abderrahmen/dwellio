drop policy if exists properties_select_public on public.properties;
create policy properties_select_public on public.properties for select to anon
  using (status = 'active');

drop policy if exists images_select_public on public.property_images;
create policy images_select_public on public.property_images for select to anon
  using (exists (
    select 1 from public.properties p
    where p.id = property_id and p.status = 'active'
  ));