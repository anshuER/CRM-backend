export type JwtPayload = {
  sub: string;
  email: string;
  sessionId: string;
};

export type CurrentAuthUser = {
  userId: string;
  email: string;
  sessionId: string;
};
