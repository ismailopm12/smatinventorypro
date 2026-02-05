import { format } from 'date-fns';

/**
 * Generate a batch number with format: BATCH-YYYY-MM-DD-XXX
 * Where XXX is a random 3-digit number
 */
export function generateBatchNumber(): string {
  const date = new Date();
  const dateStr = format(date, 'yyyy-MM-dd');
  const random = Math.floor(Math.random() * 900 + 100); // 100-999
  return `BATCH-${dateStr}-${random}`;
}

/**
 * Generate a sequential batch number for the day
 * Format: BATCH-YYYY-MM-DD-XXX
 */
export async function generateSequentialBatchNumber(
  supabase: any,
  itemId?: string
): Promise<string> {
  const date = new Date();
  const dateStr = format(date, 'yyyy-MM-dd');
  const prefix = `BATCH-${dateStr}`;
  
  try {
    // Get today's batches to find the next sequence
    let query = supabase
      .from('batches')
      .select('batch_number')
      .like('batch_number', `${prefix}%`)
      .order('batch_number', { ascending: false })
      .limit(1);
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching batch numbers:', error);
      return generateBatchNumber();
    }
    
    let nextNum = 1;
    if (data && data.length > 0) {
      const lastBatch = data[0].batch_number;
      const lastNumStr = lastBatch.split('-').pop();
      const lastNum = parseInt(lastNumStr, 10);
      if (!isNaN(lastNum)) {
        nextNum = lastNum + 1;
      }
    }
    
    return `${prefix}-${String(nextNum).padStart(3, '0')}`;
  } catch (err) {
    console.error('Error generating sequential batch number:', err);
    return generateBatchNumber();
  }
}
