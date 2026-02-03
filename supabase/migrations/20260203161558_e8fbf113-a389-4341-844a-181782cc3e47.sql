-- Move device_id from journey_legs to journeys table
ALTER TABLE public.journeys ADD COLUMN device_id integer;

-- Remove device_id from journey_legs
ALTER TABLE public.journey_legs DROP COLUMN device_id;