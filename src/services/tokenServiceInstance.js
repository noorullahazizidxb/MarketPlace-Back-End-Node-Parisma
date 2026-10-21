import { createTokenService } from './tokenService.js';
import { refreshTokenRepository } from '../repositories/refreshTokenRepository.js';

export const tokenService = createTokenService({ repository: refreshTokenRepository });
