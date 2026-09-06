import jwt from "jsonwebtoken";
import { config } from "../config";

export interface JwtPayload {
  sub: string; // user id
  iat?: number;
  exp?: number;
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.JWT_SECRET) as JwtPayload;
}