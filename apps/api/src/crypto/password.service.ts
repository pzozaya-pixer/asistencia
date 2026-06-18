import { Injectable } from '@nestjs/common';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

@Injectable()
export class PasswordService {
  hash(password: string) {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = scryptSync(password, salt, 64).toString('hex');

    return `scrypt$${salt}$${derivedKey}`;
  }

  verify(password: string, storedHash: string) {
    const [algorithm, salt, derivedKey] = storedHash.split('$');

    if (algorithm !== 'scrypt' || !salt || !derivedKey) {
      return false;
    }

    const candidate = scryptSync(password, salt, 64);
    const existing = Buffer.from(derivedKey, 'hex');

    return (
      candidate.length === existing.length &&
      timingSafeEqual(candidate, existing)
    );
  }
}
