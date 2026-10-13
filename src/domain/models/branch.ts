export interface Branch {
  id: string;
  name: string;
  address: string;
  phone?: string;
  manager_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateBranchDTO {
  name: string;
  address: string;
  phone?: string;
  manager_name?: string;
}

export type UpdateBranchDTO = Partial<CreateBranchDTO>;
