import { Request, Response, NextFunction } from 'express';
import { Database } from '../database';
import { User, Role } from '../types';
declare global {
    namespace Express {
        interface Request {
            user?: User;
            db?: Database;
        }
    }
}
export declare function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function requireRole(roles: Role | Role[]): (req: Request, res: Response, next: NextFunction) => void;
export declare function requirePermission(permission: string): (req: Request, res: Response, next: NextFunction) => void;
export declare function requireSelfOrAdmin(targetUserIdParam?: string): (req: Request, res: Response, next: NextFunction) => void;
export declare function requireDepartmentAccess(departmentIdParam?: string): (req: Request, res: Response, next: NextFunction) => void;
