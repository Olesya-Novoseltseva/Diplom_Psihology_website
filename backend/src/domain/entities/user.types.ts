export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
};

export type PublicUser = {
  id: string;
  email: string;
  createdAt: Date;
};
