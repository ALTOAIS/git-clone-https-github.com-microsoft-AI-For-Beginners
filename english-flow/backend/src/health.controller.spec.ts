import { AiService } from './modules/ai/ai.service';
import { PrismaService } from './prisma/prisma.service';
import { HealthController } from './health.controller';

const prismaStub = {
  $queryRaw: jest.fn().mockResolvedValue([{ result: 1 }]),
} as unknown as PrismaService;

function controllerWithAi(configured: boolean): HealthController {
  const ai = { isRealAi: configured } as unknown as AiService;
  return new HealthController(prismaStub, ai);
}

describe('HealthController', () => {
  it('status ok и запрос к БД выполнен', async () => {
    const res = await controllerWithAi(false).check();
    expect(res.status).toBe('ok');
    expect(res.service).toBe('english-flow-api');
    expect(typeof res.time).toBe('string');
  });

  it('ai.mode = llm, когда реальный ИИ настроен', async () => {
    const res = await controllerWithAi(true).check();
    expect(res.ai).toEqual({ configured: true, mode: 'llm' });
  });

  it('ai.mode = fallback, когда реальный ИИ не настроен', async () => {
    const res = await controllerWithAi(false).check();
    expect(res.ai).toEqual({ configured: false, mode: 'fallback' });
  });

  it('не раскрывает секретов и деталей провайдера', async () => {
    const res = await controllerWithAi(true).check();
    const serialized = JSON.stringify(res).toLowerCase();
    for (const secret of [
      'api_key',
      'apikey',
      'base_url',
      'baseurl',
      'provider',
      'model',
      'sk-',
    ]) {
      expect(serialized).not.toContain(secret);
    }
  });
});
