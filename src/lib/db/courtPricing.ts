import { supabase } from '@/lib/supabase/client';
import { TimeSlotPricing, PricingRule, DEFAULT_PRICING } from '@/lib/store/useCourtPricingStore';

export interface DbCourtPricingRule {
  id: string;
  court_id: string;
  month_key: string;
  day_price: number;
  day_start: string;
  day_end: string;
  afternoon_price: number;
  afternoon_start: string;
  afternoon_end: string;
  night_price: number;
  night_start: string;
  night_end: string;
  member_day_price: number;
  member_night_price: number;
  pickleball_day_price: number;
  pickleball_night_price: number;
  created_at: string;
  updated_at: string;
}

function mapDbToRule(row: DbCourtPricingRule): PricingRule {
  return {
    courtId: row.court_id,
    monthKey: row.month_key,
    pricing: {
      dayPrice: Number(row.day_price),
      dayStart: row.day_start || '08:00',
      dayEnd: row.day_end || '17:00',
      afternoonPrice: Number(row.afternoon_price),
      afternoonStart: row.afternoon_start || '17:00',
      afternoonEnd: row.afternoon_end || '23:00',
      nightPrice: Number(row.night_price),
      nightStart: row.night_start || '17:00',   // fallback ke 17:00 jika null
      nightEnd: row.night_end || '23:00',
      memberDayPrice: Number(row.member_day_price ?? row.day_price),
      memberNightPrice: Number(row.member_night_price ?? row.night_price),
      pickleballDayPrice: Number(row.pickleball_day_price ?? row.day_price),
      pickleballNightPrice: Number(row.pickleball_night_price ?? row.night_price),
    },
  };
}

function mapRuleToDb(rule: PricingRule): Omit<DbCourtPricingRule, 'id' | 'created_at' | 'updated_at'> {
  const p = rule.pricing;
  return {
    court_id: rule.courtId,
    month_key: rule.monthKey,
    day_price: p.dayPrice,
    day_start: p.dayStart,
    day_end: p.dayEnd,
    afternoon_price: p.afternoonPrice,
    afternoon_start: p.afternoonStart,
    afternoon_end: p.afternoonEnd,
    night_price: p.nightPrice,
    night_start: p.nightStart,
    night_end: p.nightEnd,
    member_day_price: p.memberDayPrice,
    member_night_price: p.memberNightPrice,
    pickleball_day_price: p.pickleballDayPrice,
    pickleball_night_price: p.pickleballNightPrice,
  };
}

/** Ambil semua rule harga dari Supabase */
export async function fetchAllPricingRules(): Promise<PricingRule[]> {
  const { data, error } = await supabase
    .from('court_pricing_rules')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[courtPricing] fetchAllPricingRules error:', error.message);
    return [];
  }

  return (data as DbCourtPricingRule[]).map(mapDbToRule);
}

/** Simpan / update satu rule (berdasarkan court_id + month_key) */
export async function upsertPricingRule(rule: PricingRule): Promise<PricingRule | null> {
  const payload = mapRuleToDb(rule);

  const { data, error } = await supabase
    .from('court_pricing_rules')
    .upsert(payload, { onConflict: 'court_id,month_key' })
    .select()
    .single();

  if (error) {
    console.error('[courtPricing] upsertPricingRule error:', error.message);
    return null;
  }

  return mapDbToRule(data as DbCourtPricingRule);
}

/** Simpan banyak rules sekaligus (batch upsert) */
export async function upsertManyPricingRules(rules: PricingRule[]): Promise<boolean> {
  const payloads = rules.map(mapRuleToDb);

  const { error } = await supabase
    .from('court_pricing_rules')
    .upsert(payloads, { onConflict: 'court_id,month_key' });

  if (error) {
    console.error('[courtPricing] upsertManyPricingRules error:', error.message);
    return false;
  }

  return true;
}

/** Hapus semua rule untuk bulan tertentu */
export async function deletePricingRulesByMonth(monthKey: string): Promise<boolean> {
  if (monthKey === 'ALL') return false;

  const { error } = await supabase
    .from('court_pricing_rules')
    .delete()
    .eq('month_key', monthKey);

  if (error) {
    console.error('[courtPricing] deletePricingRulesByMonth error:', error.message);
    return false;
  }

  return true;
}

/** Pastikan rule default global (ALL / ALL) ada di database */
export async function ensureDefaultPricingRule(): Promise<void> {
  const { data } = await supabase
    .from('court_pricing_rules')
    .select('id')
    .eq('court_id', 'ALL')
    .eq('month_key', 'ALL')
    .maybeSingle();

  if (!data) {
    await upsertPricingRule({
      courtId: 'ALL',
      monthKey: 'ALL',
      pricing: { ...DEFAULT_PRICING },
    });
  }
}

/** Perbaiki semua rows yang punya night_start / night_end null di Supabase */
export async function repairNullTimeFields(): Promise<void> {
  try {
    // Ambil semua rows yang punya night_start null
    const { data: nullRows } = await supabase
      .from('court_pricing_rules')
      .select('id, night_start, night_end, day_start, day_end, afternoon_start, afternoon_end')
      .or('night_start.is.null,night_end.is.null');

    if (!nullRows || nullRows.length === 0) return;

    // Patch tiap row yang null
    for (const row of nullRows) {
      await supabase
        .from('court_pricing_rules')
        .update({
          night_start: row.night_start || '17:00',
          night_end: row.night_end || '23:00',
          day_start: row.day_start || '08:00',
          day_end: row.day_end || '17:00',
          afternoon_start: row.afternoon_start || '17:00',
          afternoon_end: row.afternoon_end || '23:00',
        })
        .eq('id', row.id);
    }
    console.log(`[courtPricing] Repaired ${nullRows.length} rows with null time fields`);
  } catch (e) {
    console.error('[courtPricing] repairNullTimeFields error:', e);
  }
}
