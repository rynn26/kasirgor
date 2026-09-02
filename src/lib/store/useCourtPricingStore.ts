import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  fetchAllPricingRules,
  upsertPricingRule,
  upsertManyPricingRules,
  deletePricingRulesByMonth,
  ensureDefaultPricingRule,
} from '@/lib/db/courtPricing';

export interface TimeSlotPricing {
  // Pagi-Sore (Insidentil Badminton)
  dayPrice: number;
  dayStart: string; // default "07:00"
  dayEnd: string;   // default "18:00"

  // Sore-Malam (Insidentil Badminton)
  nightPrice: number;
  nightStart: string; // default "18:00"
  nightEnd: string;   // default "24:00"

  // Member Badminton
  memberDayPrice: number;
  memberNightPrice: number;

  // Pickleball Insidentil
  pickleballDayPrice: number;
  pickleballNightPrice: number;

  // Legacy fields — kept for DB compatibility
  afternoonPrice: number;
  afternoonStart: string;
  afternoonEnd: string;
}

export interface PricingRule {
  courtId: string;   // 'ALL' or specific court id
  monthKey: string;  // 'ALL' or 'YYYY-MM' (e.g. '2026-09')
  pricing: TimeSlotPricing;
}

export const DEFAULT_PRICING: TimeSlotPricing = {
  // Slot 1: Pagi-Sore (Insidentil Badminton)
  dayPrice: 60000,
  dayStart: '07:00',
  dayEnd: '18:00',

  // Slot 2: Sore-Malam (Insidentil Badminton)
  nightPrice: 85000,
  nightStart: '18:00',
  nightEnd: '24:00',

  // Member Badminton (default sama dengan insidentil)
  memberDayPrice: 60000,
  memberNightPrice: 85000,

  // Pickleball Insidentil
  pickleballDayPrice: 60000,
  pickleballNightPrice: 85000,

  // Legacy (DB compat) — mirrors nightPrice
  afternoonPrice: 85000,
  afternoonStart: '18:00',
  afternoonEnd: '24:00',
};

interface CourtPricingState {
  rules: PricingRule[];
  selectedMonthKey: string; // 'ALL' or 'YYYY-MM'
  isLoading: boolean;

  // Actions
  loadFromDb: () => Promise<void>;
  setSelectedMonthKey: (monthKey: string) => void;
  setCourtPricing: (courtId: string, monthKey: string, pricing: Partial<TimeSlotPricing>) => Promise<void>;
  applyToAllCourts: (monthKey: string, pricing: TimeSlotPricing, courtIds: string[]) => Promise<void>;
  getPricing: (courtId: string, monthKey?: string) => TimeSlotPricing;
  getPriceForSlot: (
    courtId: string,
    dateStr: string,
    timeStr: string,
    fallbackPrice?: number,
    customerType?: 'insidentil' | 'member',
    sportType?: 'badminton' | 'pickleball'
  ) => { price: number; period: 'Pagi' | 'Malam'; timeRange: string };
  calculateBookingFee: (
    courtId: string,
    dateStr: string,
    startTime: string,
    durationHours: number,
    courtCount?: number,
    fallbackPrice?: number,
    customerType?: 'insidentil' | 'member',
    sportType?: 'badminton' | 'pickleball'
  ) => { totalFee: number; ratePerHour: number; breakdown: Array<{ hour: string; price: number; period: 'Pagi' | 'Malam' }> };
  deleteMonthRule: (monthKey: string) => Promise<void>;
}

export const useCourtPricingStore = create<CourtPricingState>()(
  persist(
    (set, get) => ({
      rules: [
        {
          courtId: 'ALL',
          monthKey: 'ALL',
          pricing: { ...DEFAULT_PRICING },
        },
      ],
      selectedMonthKey: 'ALL',
      isLoading: false,

      loadFromDb: async () => {
        set({ isLoading: true });
        try {
          await ensureDefaultPricingRule();
          const dbRules = await fetchAllPricingRules();
          if (dbRules.length > 0) {
            set({ rules: dbRules });
          }
        } catch (e) {
          console.error('[courtPricing] loadFromDb error:', e);
        } finally {
          set({ isLoading: false });
        }
      },

      setSelectedMonthKey: (monthKey: string) => set({ selectedMonthKey: monthKey }),

      setCourtPricing: async (courtId: string, monthKey: string, partialPricing: Partial<TimeSlotPricing>) => {
        const state = get();
        const current = state.rules.find((r) => r.courtId === courtId && r.monthKey === monthKey);
        const base = current
          ? current.pricing
          : state.rules.find((r) => r.courtId === 'ALL' && r.monthKey === 'ALL')?.pricing || DEFAULT_PRICING;
        const merged: TimeSlotPricing = { ...base, ...partialPricing };
        const newRule: PricingRule = { courtId, monthKey, pricing: merged };

        // Optimistic update local state
        const filtered = state.rules.filter((r) => !(r.courtId === courtId && r.monthKey === monthKey));
        set({ rules: [...filtered, newRule] });

        // Sync to Supabase
        await upsertPricingRule(newRule);
      },

      applyToAllCourts: async (monthKey: string, pricing: TimeSlotPricing, courtIds: string[]) => {
        const state = get();

        // Build new rules
        let newRules = state.rules.filter((r) => r.monthKey !== monthKey);
        const batchRules: PricingRule[] = [
          { courtId: 'ALL', monthKey, pricing: { ...pricing } },
          ...courtIds.map((cid) => ({ courtId: cid, monthKey, pricing: { ...pricing } })),
        ];
        newRules = [...newRules, ...batchRules];

        // Optimistic update
        set({ rules: newRules });

        // Sync to Supabase
        await upsertManyPricingRules(batchRules);
      },

      getPricing: (courtId: string, monthKey?: string): TimeSlotPricing => {
        const rules = get().rules;
        const targetMonth = monthKey || get().selectedMonthKey;

        // 1. Exact match: specific court + specific month
        if (targetMonth && targetMonth !== 'ALL') {
          const exact = rules.find((r) => r.courtId === courtId && r.monthKey === targetMonth);
          if (exact) return exact.pricing;

          // 2. All courts + specific month
          const monthAll = rules.find((r) => r.courtId === 'ALL' && r.monthKey === targetMonth);
          if (monthAll) return monthAll.pricing;
        }

        // 3. Specific court + ALL months
        const courtDefault = rules.find((r) => r.courtId === courtId && r.monthKey === 'ALL');
        if (courtDefault) return courtDefault.pricing;

        // 4. ALL courts + ALL months
        const globalDefault = rules.find((r) => r.courtId === 'ALL' && r.monthKey === 'ALL');
        if (globalDefault) return globalDefault.pricing;

        return DEFAULT_PRICING;
      },

      getPriceForSlot: (courtId: string, dateStr: string, timeStr: string, fallbackPrice?: number, customerType: 'insidentil' | 'member' = 'insidentil', sportType: 'badminton' | 'pickleball' = 'badminton') => {
        const monthKey = dateStr ? dateStr.slice(0, 7) : 'ALL';
        const pricing = get().getPricing(courtId, monthKey);
        const hour = parseInt(timeStr.split(':')[0], 10);
        const dayEndHour = parseInt(pricing.dayEnd.split(':')[0], 10);

        const isPickleball = sportType === 'pickleball';
        const isMember = !isPickleball && customerType === 'member';

        let dayPrice: number;
        let nightPrice: number;

        if (isPickleball) {
          dayPrice = pricing.pickleballDayPrice || fallbackPrice || 60000;
          nightPrice = pricing.pickleballNightPrice || fallbackPrice || 85000;
        } else if (isMember) {
          dayPrice = pricing.memberDayPrice || fallbackPrice || 60000;
          nightPrice = pricing.memberNightPrice || fallbackPrice || 85000;
        } else {
          dayPrice = pricing.dayPrice || fallbackPrice || 60000;
          nightPrice = pricing.nightPrice || fallbackPrice || 85000;
        }

        if (hour < dayEndHour) {
          return { price: dayPrice, period: 'Pagi', timeRange: `${pricing.dayStart} - ${pricing.dayEnd}` };
        } else {
          return { price: nightPrice, period: 'Malam', timeRange: `${pricing.nightStart} - ${pricing.nightEnd}` };
        }
      },

      calculateBookingFee: (
        courtId: string,
        dateStr: string,
        startTime: string,
        durationHours: number,
        courtCount = 1,
        fallbackPrice?: number,
        customerType: 'insidentil' | 'member' = 'insidentil',
        sportType: 'badminton' | 'pickleball' = 'badminton'
      ) => {
        const startHour = parseInt(startTime.split(':')[0], 10);
        const breakdown: Array<{ hour: string; price: number; period: 'Pagi' | 'Malam' }> = [];
        let totalSingleCourtFee = 0;

        for (let i = 0; i < durationHours; i++) {
          const currentH = startHour + i;
          const timeSlotStr = `${currentH < 10 ? '0' : ''}${currentH}:00`;
          const slot = get().getPriceForSlot(courtId, dateStr, timeSlotStr, fallbackPrice, customerType, sportType);
          breakdown.push({
            hour: `${timeSlotStr} - ${currentH + 1 < 10 ? '0' : ''}${currentH + 1}:00`,
            price: slot.price,
            period: slot.period,
          });
          totalSingleCourtFee += slot.price;
        }

        const totalFee = totalSingleCourtFee * (courtCount || 1);
        const ratePerHour = durationHours > 0 ? Math.round(totalSingleCourtFee / durationHours) : (fallbackPrice || 75000);

        return {
          totalFee,
          ratePerHour,
          breakdown,
        };
      },

      deleteMonthRule: async (monthKey: string) => {
        if (monthKey === 'ALL') return;

        // Optimistic update
        set((state) => ({
          rules: state.rules.filter((r) => r.monthKey !== monthKey),
          selectedMonthKey: state.selectedMonthKey === monthKey ? 'ALL' : state.selectedMonthKey,
        }));

        // Sync to Supabase
        await deletePricingRulesByMonth(monthKey);
      },
    }),
    {
      name: 'kasir_court_pricing_rules', // localStorage fallback / cache
    }
  )
);

