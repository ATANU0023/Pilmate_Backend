export interface UserPayload {
  userId: string;
  supabaseId: string;
  email: string;
  fullName: string;
  memberships: Array<{
    storeId: string;
    storeName: string;
    role: string | null;
    memberId: string;
  }>;
}
