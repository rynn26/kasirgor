'use client';

import React from 'react';
import { ProductCategory } from '@/types/pos';
import { useProductStore } from '@/lib/store/useProductStore';

const CATEGORIES: ProductCategory[] = [
  'Semua',
  'Makanan & Snack',
  'Minuman Dingin',
  'Perlengkapan Olahraga',
];

export const CategoryFilter: React.FC = () => {
  const { selectedCategory, setSelectedCategory } = useProductStore();

  const getDisplayName = (cat: ProductCategory) => {
    return cat;
  };

  return (
    <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 scrollbar-none">
      {CATEGORIES.map((cat) => {
        const isSelected = selectedCategory === cat;

        return (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-5 py-2 rounded-full font-bold text-xs whitespace-nowrap transition-all duration-150 cursor-pointer ${
              isSelected
                ? 'bg-[#b92b10] text-white shadow-md shadow-[#b92b10]/25'
                : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 shadow-2xs'
            }`}
          >
            {getDisplayName(cat)}
          </button>
        );
      })}
    </div>
  );
};
