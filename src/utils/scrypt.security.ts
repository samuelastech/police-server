import { scrypt as _scrypt } from 'crypto';
import { promisify } from 'util';

export const scrypt = promisify(_scrypt);
