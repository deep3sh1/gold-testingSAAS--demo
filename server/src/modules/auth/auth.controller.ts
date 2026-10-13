import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { UserService } from '../users/user.service.js';
import { config } from '../../config/index.js';

export class AuthController {
  constructor(
    private authService: AuthService = new AuthService(),
    private userService: UserService = new UserService()
  ) {}

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;
      const { token, user, userDto } = await this.authService.login(email, password);

      // Set secure HTTP-only cookie
      res.cookie(config.cookieName, token, {
        httpOnly: true,
        secure: config.env === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(200).json({
        success: true,
        data: {
          token,
          user: userDto,
          session: user,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      const userDto = await this.userService.getById(req.user.userId, req.user.organizationId);

      res.status(200).json({
        success: true,
        data: {
          user: userDto,
          session: req.user,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.clearCookie(config.cookieName);
      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}
