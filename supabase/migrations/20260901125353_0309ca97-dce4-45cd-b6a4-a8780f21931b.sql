CREATE TABLE public.financials_cache (
  symbol TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.financials_cache TO anon;
GRANT SELECT ON public.financials_cache TO authenticated;
GRANT ALL ON public.financials_cache TO service_role;

ALTER TABLE public.financials_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cached financials are publicly readable"
ON public.financials_cache
FOR SELECT
TO anon, authenticated
USING (true);