import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { courierService } from '../services/courier';

const router = Router();

// 快递服务商列表
router.get('/couriers/list', authMiddleware, async (_req: Request, res: Response) => {
  try {
    res.json(courierService.getCouriers());
  } catch (err) { res.status(500).json({ error: '查询失败', detail: (err as any).message }); }
});

// 面单价格（模拟从快递鸟接口获取）
router.post('/couriers/price', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await courierService.getPrice(req.body.courier || 'sto', req.body.weight || 1);
    res.json(result);
  } catch (err) { res.status(500).json({ error: '查询失败', detail: (err as any).message }); }
});

export default router;
