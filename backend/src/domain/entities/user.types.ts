export type UserRole = "USER" | "ADMIN";

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
};

export type PublicUser = {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
};
