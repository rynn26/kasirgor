import { supabase } from '@/lib/supabase/client';
import { Product, ProductCategory } from '@/types/pos';

export interface DbProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  cost_price: number | null;
  stock: number;
  minimum_stock: number | null;
  unit: string;
  image: string | null;
  barcode: string | null;
  description: string | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

function mapDbToProduct(row: DbProduct): Product {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    category: row.category as ProductCategory,
    price: Number(row.price),
    costPrice: row.cost_price ? Number(row.cost_price) : undefined,
    stock: row.stock,
    minimumStock: row.minimum_stock ? Number(row.minimum_stock) : undefined,
    unit: row.unit,
    image: row.image || undefined,
    barcode: row.barcode || undefined,
    description: row.description || undefined,
    isAvailable: row.is_available,
  };
}

function mapProductToDb(p: Partial<Product>): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  if (p.id) obj.id = p.id;
  if (p.sku) obj.sku = p.sku;
  if (p.name) obj.name = p.name;
  if (p.category) obj.category = p.category;
  if (p.price !== undefined) obj.price = p.price;
  if (p.costPrice !== undefined) obj.cost_price = p.costPrice;
  if (p.stock !== undefined) obj.stock = p.stock;
  if (p.minimumStock !== undefined) obj.minimum_stock = p.minimumStock ?? null;
  if (p.unit) obj.unit = p.unit;
  if (p.image !== undefined) obj.image = p.image || null;
  if (p.barcode !== undefined) obj.barcode = p.barcode || null;
  if (p.description !== undefined) obj.description = p.description || null;
  if (p.isAvailable !== undefined) obj.is_available = p.isAvailable;
  return obj;
}

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name');

  if (error) throw error;
  return (data as DbProduct[]).map(mapDbToProduct);
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return mapDbToProduct(data as DbProduct);
}

export async function createProduct(
  product: Omit<Product, 'id'>
): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert(mapProductToDb(product))
    .select()
    .single();

  if (error) throw error;
  return mapDbToProduct(data as DbProduct);
}

export async function updateProduct(
  id: string,
  updatedFields: Partial<Product>
): Promise<Product> {
  const dbFields: Record<string, unknown> = {};
  const fieldMap: Record<string, string> = {
    name: 'name',
    category: 'category',
    price: 'price',
    costPrice: 'cost_price',
    stock: 'stock',
    minimumStock: 'minimum_stock',
    unit: 'unit',
    image: 'image',
    barcode: 'barcode',
    description: 'description',
    isAvailable: 'is_available',
  };

  for (const [key, dbKey] of Object.entries(fieldMap)) {
    if (key in updatedFields) {
      const val = updatedFields[key as keyof Product];
      dbFields[dbKey] = val;
    }
  }

  const { data, error } = await supabase
    .from('products')
    .update(dbFields)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapDbToProduct(data as DbProduct);
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

export async function updateStock(
  id: string,
  delta: number
): Promise<{ newStock: number }> {
  const { data: current, error: fetchError } = await supabase
    .from('products')
    .select('stock')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  const newStock = Math.max(0, Number(current.stock) + delta);
  const isAvailable = newStock > 0;

  const { error: updateError } = await supabase
    .from('products')
    .update({ stock: newStock, is_available: isAvailable })
    .eq('id', id);

  if (updateError) throw updateError;
  return { newStock };
}

export async function updateStocksBatch(
  updates: Array<{ id: string; delta: number }>
): Promise<void> {
  for (const { id, delta } of updates) {
    await updateStock(id, delta);
  }
}
