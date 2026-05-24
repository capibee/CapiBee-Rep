-- Remove strictly coupled foreign keys for businesses since businessId can refer to clients or businesses.
ALTER TABLE agent_earnings DROP CONSTRAINT IF EXISTS agent_earnings_business_id_fkey;
ALTER TABLE agent_earnings DROP CONSTRAINT IF EXISTS agent_earnings_invoice_id_fkey;
ALTER TABLE agent_earnings DROP CONSTRAINT IF EXISTS agent_earnings_user_id_fkey;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow select on agent_earnings" ON public.agent_earnings;
    DROP POLICY IF EXISTS "Allow insert on agent_earnings" ON public.agent_earnings;
    DROP POLICY IF EXISTS "Allow update on agent_earnings" ON public.agent_earnings;
    DROP POLICY IF EXISTS "Allow delete on agent_earnings" ON public.agent_earnings;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error dropping policies: %', SQLERRM;
END $$;

CREATE POLICY "Allow select on agent_earnings" ON public.agent_earnings FOR SELECT TO public USING (true);
CREATE POLICY "Allow insert on agent_earnings" ON public.agent_earnings FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow update on agent_earnings" ON public.agent_earnings FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete on agent_earnings" ON public.agent_earnings FOR DELETE TO public USING (true);
