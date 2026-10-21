import { createRoleService } from './roleService.js';
import { userRoleRepository } from '../repositories/userRoleRepository.js';
import { tokenService } from './tokenServiceInstance.js';

export const roleService = createRoleService({ repository: userRoleRepository, tokenService });
