DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow select on invoices" ON public.invoices;
    DROP POLICY IF EXISTS "Allow insert on invoices" ON public.invoices;
    DROP POLICY IF EXISTS "Allow update on invoices" ON public.invoices;
    DROP POLICY IF EXISTS "Allow delete on invoices" ON public.invoices;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error dropping policies: %', SQLERRM;
END $$;

CREATE POLICY "Allow select on invoices" ON public.invoices FOR SELECT TO public USING (true);
CREATE POLICY "Allow insert on invoices" ON public.invoices FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow update on invoices" ON public.invoices FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete on invoices" ON public.invoices FOR DELETE TO public USING (true);
