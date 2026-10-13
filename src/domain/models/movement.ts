export type MovementType = 'entry' | 'exit' | 'adjustment' | 'transfer';

export interface Movement {
  id: string;
  type: MovementType;
  product_id: string;
  product_name?: string;
  branch_id: string;
  target_branch_id?: string;
  quantity: number;
  reason: string;
  reference_type?: string;
  reference_id?: string;
  performed_by: string;
  performed_by_name?: string;
  created_at: string;
}

export interface CreateMovementDTO {
  type: MovementType;
  product_id: string;
  branch_id: string;
  target_branch_id?: string;
  quantity: number;
  reason: string;
  reference_type?: string;
  reference_id?: string;
}
