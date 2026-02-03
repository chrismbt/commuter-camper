-- Create journeys table
CREATE TABLE public.journeys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create journey_legs table
CREATE TABLE public.journey_legs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journey_id UUID NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  train_uid TEXT NOT NULL,
  run_date TEXT NOT NULL,
  from_station TEXT NOT NULL,
  to_station TEXT NOT NULL,
  departure_time TEXT NOT NULL,
  arrival_time TEXT NOT NULL,
  operator TEXT,
  device_id INTEGER,
  leg_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_legs ENABLE ROW LEVEL SECURITY;

-- RLS policies for journeys
CREATE POLICY "Users can view their own journeys"
ON public.journeys FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own journeys"
ON public.journeys FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own journeys"
ON public.journeys FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for journey_legs
CREATE POLICY "Users can view legs of their journeys"
ON public.journey_legs FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.journeys
  WHERE journeys.id = journey_legs.journey_id
  AND journeys.user_id = auth.uid()
));

CREATE POLICY "Users can create legs for their journeys"
ON public.journey_legs FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.journeys
  WHERE journeys.id = journey_legs.journey_id
  AND journeys.user_id = auth.uid()
));

CREATE POLICY "Users can delete legs of their journeys"
ON public.journey_legs FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.journeys
  WHERE journeys.id = journey_legs.journey_id
  AND journeys.user_id = auth.uid()
));

-- Create indexes for performance
CREATE INDEX idx_journeys_user_id ON public.journeys(user_id);
CREATE INDEX idx_journey_legs_journey_id ON public.journey_legs(journey_id);