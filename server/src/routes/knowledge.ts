import { Router, Request, Response } from 'express';
import { knowledgeBaseService } from '../services/knowledgeBase';
import { llmService } from '../services/llm';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/search', authMiddleware, async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string || '';
    const results = knowledgeBaseService.search(query);
    res.json({ results, count: results.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/ask', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { question, useAI } = req.body;
    if (!question) return res.status(400).json({ error: '问题不能为空' });

    const localResults = knowledgeBaseService.search(question);
    
    if (localResults.length > 0 && !useAI) {
      res.json({
        source: 'knowledge',
        results: localResults.slice(0, 3),
        aiAnswer: null,
      });
    } else {
      const prompt = `你是杭州喵喵至家网络有限公司的智能客服助手。请基于以下知识库内容回答用户问题：\n\n【知识库参考】\n${localResults.map((r: any) => `${r.title}: ${r.content.slice(0, 200)}`).join('\n\n')}\n\n【用户问题】${question}\n\n请用简洁、专业的语言回答，优先使用知识库中的信息。如果知识库没有相关内容，请根据你的知识回答，并注明"参考外部知识"。`;

      const aiResult = await llmService.aiReply(prompt);
      
      res.json({
        source: aiResult.source === 'local' ? 'knowledge' : 'ai',
        results: localResults.length > 0 ? localResults.slice(0, 2) : [],
        aiAnswer: aiResult.reply,
        aiSource: aiResult.source,
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/categories', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const categories = knowledgeBaseService.getCategories();
    res.json({ categories });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/category/:category', authMiddleware, async (req: Request, res: Response) => {
  try {
    const items = knowledgeBaseService.getByCategory(req.params.category);
    res.json({ results: items, count: items.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/item/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const item = knowledgeBaseService.getById(req.params.id);
    if (!item) return res.status(404).json({ error: '未找到相关条目' });
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;