import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Database } from '../database';
import { User, Role } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// 擴展 Request 介面
declare global {
  namespace Express {
    interface Request {
      user?: User;
      db?: Database;
    }
  }
}

// JWT 認證中間件
export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: '缺少認證 Token' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // 從資料庫獲取最新用戶資訊（不信任 Token 中的角色）
    const db = (req.app as any).getDatabase() as Database;
    const userRow = await db.get(
      'SELECT * FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!userRow) {
      res.status(401).json({ error: '用戶不存在' });
      return;
    }

    const user: User = {
      id: userRow.id,
      name: userRow.name,
      role: userRow.role as Role,
      department: userRow.department,
      avatar: userRow.avatar,
      username: userRow.username,
      password: userRow.password,
      permissions: userRow.permissions ? JSON.parse(userRow.permissions) : undefined
    };

    req.user = user;
    req.db = db;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Token 無效或已過期' });
    } else {
      console.error('認證中間件錯誤:', error);
      res.status(500).json({ error: '伺服器內部錯誤' });
    }
  }
}

// 角色權限檢查中間件
export function requireRole(roles: Role | Role[]) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: '未認證' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: '權限不足' });
      return;
    }

    next();
  };
}

// 權限檢查中間件
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: '未認證' });
      return;
    }

    // BOSS, MANAGER, SUPERVISOR 預設擁有大部分權限
    if (req.user.role === 'BOSS' || req.user.role === 'MANAGER' || req.user.role === 'SUPERVISOR') {
      // SYSTEM_RESET 只有 BOSS 預設擁有
      if (permission === 'SYSTEM_RESET' && req.user.role !== 'BOSS') {
        if (!req.user.permissions?.includes(permission as any)) {
          res.status(403).json({ error: '需要特定權限' });
          return;
        }
      }
      next();
      return;
    }

    // 員工檢查是否有特定權限
    if (!req.user.permissions?.includes(permission as any)) {
      res.status(403).json({ error: '需要特定權限' });
      return;
    }

    next();
  };
}

// 自己或管理員權限檢查
export function requireSelfOrAdmin(targetUserIdParam: string = 'id') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: '未認證' });
      return;
    }

    const targetUserId = req.params[targetUserIdParam];
    
    // 可以管理自己
    if (req.user.id === targetUserId) {
      next();
      return;
    }

    // BOSS 和 MANAGER 可以管理所有人
    if (req.user.role === 'BOSS' || req.user.role === 'MANAGER') {
      next();
      return;
    }

    // SUPERVISOR 可以管理 EMPLOYEE 和同部門的 SUPERVISOR
    if (req.user.role === 'SUPERVISOR') {
      // 獲取目標用戶資訊
      req.db?.get('SELECT role, department FROM users WHERE id = ?', [targetUserId])
        .then(targetUser => {
          if (!targetUser) {
            res.status(404).json({ error: '目標用戶不存在' });
            return;
          }
          
          if (targetUser.role === 'EMPLOYEE' || 
              (targetUser.role === 'SUPERVISOR' && targetUser.department === req.user.department)) {
            next();
          } else {
            res.status(403).json({ error: '權限不足' });
          }
        })
        .catch(() => {
          res.status(500).json({ error: '伺服器錯誤' });
        });
      return;
    }

    res.status(403).json({ error: '權限不足' });
  };
}

// 部門權限檢查
export function requireDepartmentAccess(departmentIdParam: string = 'departmentId') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: '未認證' });
      return;
    }

    const targetDepartmentId = req.params[departmentIdParam] || req.body.departmentId;
    
    // BOSS 和 MANAGER 可以訪問所有部門
    if (req.user.role === 'BOSS' || req.user.role === 'MANAGER') {
      next();
      return;
    }

    // SUPERVISOR 只能訪問自己的部門
    if (req.user.role === 'SUPERVISOR') {
      if (req.user.department === targetDepartmentId) {
        next();
      } else {
        res.status(403).json({ error: '只能管理自己的部門' });
      }
      return;
    }

    // EMPLOYEE 只能訪問自己的部門（只讀）
    if (req.user.role === 'EMPLOYEE') {
      if (req.user.department === targetDepartmentId && req.method === 'GET') {
        next();
      } else {
        res.status(403).json({ error: '權限不足' });
      }
      return;
    }

    res.status(403).json({ error: '權限不足' });
  };
}
