export interface TUser {
  id: string;
  email: string | null;
  labels: string[];
}

// Domaine: contrat pour récupérer les utilisateurs depuis une source (Appwrite, REDCap, etc.)
export interface UserRepository {
  getById(userId: string): Promise<TUser>;
}
