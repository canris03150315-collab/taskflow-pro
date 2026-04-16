import { IDatabase } from '../types/database';
import { User } from '../types';
export declare function logSystemAction(db: IDatabase, user: any, action: string, details: string, level?: string): Promise<void>;
export declare function hasPermission(user: User, permission: string): boolean;
export declare function canManageUser(currentUser: User, targetUser: User): boolean;
export declare function canManageDepartment(currentUser: User, departmentId: string): boolean;
