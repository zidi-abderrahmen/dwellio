with ranked_images as (
  select
    id,
    row_number() over (
      partition by property_id, position
      order by created_at desc, id desc
    ) as row_number
  from public.property_images
)
delete from public.property_images as images
using ranked_images
where images.id = ranked_images.id
  and ranked_images.row_number > 1;

drop index if exists public.property_images_property_idx;

create unique index if not exists property_images_property_position_key
  on public.property_images (property_id, position);