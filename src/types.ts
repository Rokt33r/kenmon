import type { Algorithm } from "jsonwebtoken";

export interface User {
  id: string;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  invalidated: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface OTP {
  id: string;
  email: string;
  code: string;
  expiresAt: Date;
  used: boolean;
}

export interface AuthConfig {
  jwt: {
    secret: string;
    algorithm?: Algorithm;
  };
  session: {
    ttl: number; // seconds
    refreshInterval: number; // seconds
    cookieName?: string;
    secure?: boolean;
    sameSite?: "lax" | "strict" | "none";
  };
  otp: {
    ttl: number; // seconds
    length?: number;
  };
}

// Storage interface
export interface AuthStorage {
  // User operations
  createUser(email: string): Promise<User>;
  getUserById(id: string): Promise<User | null>;

  // Session operations
  createSession(
    userId: string,
    token: string,
    expiresAt: Date,
    ipAddress?: string,
    userAgent?: string
  ): Promise<Session>;
  getSessionById(sessionId: string): Promise<Session | null>;
  updateSession(
    sessionId: string,
    data: { token: string; expiresAt: Date }
  ): Promise<void>;
  invalidateSession(sessionId: string): Promise<void>;
  invalidateUserSessions(userId: string): Promise<void>;

  // OTP operations
  createOTP(email: string, code: string, expiresAt: Date): Promise<OTP>;
  verifyOTP(otpId: string, email: string, code: string): Promise<OTP | null>;
}

// Email provider interface
export interface EmailProvider {
  sendOTP(email: string, code: string): Promise<void>;
}

// Framework adapter interface
export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
  maxAge?: number;
  path?: string;
}

export interface FrameworkAdapter {
  setCookie(
    name: string,
    value: string,
    options?: CookieOptions
  ): Promise<void>;
  getCookie(name: string): Promise<string | undefined>;
  deleteCookie(name: string): Promise<void>;
  redirect(url: string): Promise<void>;
}
