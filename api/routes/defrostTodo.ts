import express, { type Request, type Response } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getDefrostTodoList, confirmDefrost } from '../services/defrostService.js';

const router = express.Router();

router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const todoList = await getDefrostTodoList();
  res.json({ success: true, data: todoList });
}));

router.post('/batch-confirm', asyncHandler(async (req: Request, res: Response) => {
  const { ids, operatorName, remark } = req.body;
  
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      error: '请选择要确认除霜的设备',
    });
  }
  
  if (!operatorName) {
    return res.status(400).json({
      success: false,
      error: '操作人姓名不能为空',
    });
  }
  
  const results = await Promise.all(
    ids.map((id: number) => confirmDefrost(id, operatorName, remark))
  );
  
  res.json({ success: true, data: results });
}));

export default router;
