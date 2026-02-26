// Tipo de usuario extendido con campos personalizados de Better Auth
export type AppUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
  rol: string;
  activo: boolean;
};

export type AppSession = {
  user: AppUser;
  session: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
  };
};
